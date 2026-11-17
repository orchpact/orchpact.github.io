"""Check built HTML routes, assets, anchors, provenance and private-file exclusions."""
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = set(); self.links = []; self.errors = []
        self.h1 = 0; self.lang = None; self.canonical = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html': self.lang = attrs.get('lang')
        if tag == 'h1': self.h1 += 1
        if 'id' in attrs:
            if attrs['id'] in self.ids: self.errors.append('duplicate id: ' + attrs['id'])
            self.ids.add(attrs['id'])
        if tag == 'link' and attrs.get('rel') == 'canonical': self.canonical = attrs.get('href')
        for attribute in ('href', 'src'):
            if attribute in attrs and not (tag == 'link' and attrs.get('rel') == 'canonical'):
                self.links.append(attrs[attribute])
        if tag == 'a' and 'href' in attrs and urlsplit(attrs['href']).scheme in ('javascript', 'data'):
            self.errors.append('unsafe link scheme')


def validate(directory):
    directory = directory.resolve(); pages = {}; errors = []
    for file in sorted(directory.rglob('*.html')):
        parser = Page(); parser.feed(file.read_text()); relative = file.relative_to(directory).as_posix()
        url = '/' + (relative[:-10] if relative.endswith('index.html') else relative)
        pages[url] = parser
        errors.extend(relative + ': ' + error for error in parser.errors)
        if parser.lang != 'zh-CN' or parser.h1 != 1: errors.append(relative + ': expected lang and exactly one h1')
        if relative != '404.html' and parser.canonical != 'https://orchpact.github.io' + url: errors.append(relative + ': canonical mismatch')
    links = 0
    for url, page in pages.items():
        for target in page.links:
            parts = urlsplit(target)
            if parts.scheme or parts.netloc: continue
            parsed = urlsplit(urljoin(url, target)); path = unquote(parsed.path)
            file = directory / path.lstrip('/')
            if not file.resolve().is_relative_to(directory): errors.append(url + ': path traversal'); continue
            if file.is_dir(): file = file / 'index.html'
            if not file.is_file(): errors.append(url + ': missing ' + target); continue
            if parsed.fragment and path in pages and unquote(parsed.fragment) not in pages[path].ids:
                errors.append(url + ': missing anchor ' + target)
            links += 1
    for file in directory.rglob('*'):
        if file.is_symlink() or file.name.startswith('.env') or file.suffix in ('.pem', '.db', '.dump', '.pyc'):
            errors.append('private or unsupported built file: ' + str(file))
    return errors, dict(html_pages=len(pages), local_links=links)


def check():
    errors, counts = validate(ROOT / 'dist')
    manifest = json.loads((ROOT / 'source-docs.json').read_text())
    for row in manifest['documents']:
        if hashlib.sha256((ROOT / row['file']).read_bytes()).hexdigest() != row['sha256']:
            errors.append('source snapshot hash mismatch: ' + row['file'])
    index = json.loads((ROOT / 'dist/search-index.json').read_text())
    if len(index) != len(json.loads((ROOT / 'content/navigation.json').read_text())): errors.append('search index coverage mismatch')
    if '/admin/' in (ROOT / 'dist/index.html').read_text(): errors.append('website must not expose a management entrance')
    if errors: raise SystemExit('\n'.join(errors))
    print(json.dumps(dict(passed=True, **counts, source_documents=len(manifest['documents']), source_commit=manifest['commit'])))


if __name__ == '__main__':
    check()
