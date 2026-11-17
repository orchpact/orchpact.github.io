"""Build the official site entirely from this checkout; no network or sibling repo."""
from collections import OrderedDict
from html import escape, unescape
from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import posixpath
import re
import shutil
from urllib.parse import quote, urlsplit

import markdown
from markdown.extensions.toc import slugify_unicode

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
SITE = json.loads((ROOT / 'site.json').read_text())


def route(slug):
    return '/docs/' + (slug + '/' if slug else '')


def nav_html(pages, active):
    groups = OrderedDict()
    for page in pages:
        groups.setdefault(page['section'], []).append(page)
    return ''.join('<section><h2>' + escape(section) + '</h2>' + ''.join(
        '<a href="' + route(p['slug']) + '"' + (' aria-current="page"' if p['slug'] == active else '') + '>' + escape(p['title']) + '</a>' for p in entries) + '</section>' for section, entries in groups.items())


def source_link(path, provenance):
    encoded = quote(path, safe='/')
    return provenance['repository'] + '/blob/' + provenance['commit'] + '/' + encoded


def rewrite_link(target, page, source_routes, provenance):
    parts = urlsplit(unescape(target))
    if parts.scheme or parts.netloc or not parts.path or parts.path.startswith('/'):
        return unescape(target)
    if not page.get('source'):
        return unescape(target)
    normalized = posixpath.normpath(posixpath.join(posixpath.dirname(page['source']), parts.path))
    if normalized.startswith('../'):
        raise ValueError('Document link leaves source repository: ' + target)
    base = source_routes.get(normalized)
    if base is None:
        base = source_link(normalized, provenance)
    return base + ('?' + parts.query if parts.query else '') + ('#' + parts.fragment if parts.fragment else '')


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []
    def handle_data(self, data):
        self.parts.append(data)


def plain_text(body):
    parser = PlainText(); parser.feed(body)
    return ' '.join(' '.join(parser.parts).split())


def search_dialog():
    return '''<dialog id="search-dialog" aria-labelledby="search-title"><form method="dialog" class="search-heading"><h2 id="search-title">搜索文档</h2><button aria-label="关闭搜索">关闭 ×</button></form><label class="search-label" for="search-input">关键词</label><input id="search-input" type="search" placeholder="工作流、模型绑定、备份…" autocomplete="off"><p id="search-status" role="status">输入关键词，在本站文档中查找。</p><ol id="search-results"></ol><p class="search-foot">本地静态索引，无账号、无追踪。</p></dialog>'''


def render_page(page, pages, index, body, toc, provenance):
    title = escape(page['title'])
    path = route(page['slug'])
    navigation = nav_html(pages, page['slug'])
    source = page.get('source')
    source_note = ('<a href="' + source_link(source, provenance) + '">来源 · ' + escape(provenance['commit'][:7]) + '</a>') if source else '<span>项目文档</span>'
    edit_url = ('https://github.com/orchpact/orchpact/edit/main/' + quote(source, safe='/')) if source else 'https://github.com/orchpact/orchpact.github.io/edit/main/' + page['file']
    previous = pages[index - 1] if index else None
    following = pages[index + 1] if index + 1 < len(pages) else None
    pagination = ''.join('<a class="' + direction + '" href="' + route(p['slug']) + '"><small>' + label + '</small><strong>' + escape(p['title']) + ' ' + arrow + '</strong></a>' for p, direction, label, arrow in [(previous, 'previous', '上一篇', '←'), (following, 'next', '下一篇', '→')] if p)
    diagram_scripts = ''
    if re.search(r'<code\b[^>]*\bclass="[^"]*\blanguage-mermaid\b', body):
        diagram_scripts = '<script src="/assets/vendor/mermaid/mermaid.min.js" defer></script><script src="/assets/diagrams.js" defer></script>'
    return f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="description" content="{title} · Orchpact（序契）使用文档。了解可复用工作流、应用接入与自托管运行边界。"><title>{title} · Orchpact 文档</title><link rel="canonical" href="{SITE['url']}{path}"><link rel="icon" href="/assets/mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/docs.css"><script src="/assets/docs.js" defer></script>{diagram_scripts}</head>
<body class="docs-page"><a class="skip-link" href="#main">跳到正文</a>
<header class="docs-header"><a class="brand" href="/" aria-label="Orchpact 首页"><img src="/assets/orchpact-logo.svg" alt="Orchpact" width="145" height="34"></a><nav aria-label="全站导航"><a href="/">项目介绍</a><a href="/docs/" aria-current="true">文档</a><a href="https://github.com/orchpact/orchpact">GitHub ↗</a></nav><button class="search-toggle" data-search hidden>搜索文档 <kbd>/</kbd></button></header>
<details class="mobile-directory"><summary>文档目录 <span>＋</span></summary><nav aria-label="手机文档导航">{navigation}</nav></details>
<div class="docs-layout"><aside class="docs-sidebar"><p class="sidebar-label">THE WORKFLOW MANUAL</p><nav aria-label="文档导航">{navigation}</nav><a class="sidebar-bottom" href="https://github.com/orchpact/orchpact/issues">讨论与问题 ↗</a></aside>
<main id="main" class="doc-main"><div class="document-meta"><span>{escape(page['section'])}</span>{source_note}</div><article class="prose">{body}</article><nav class="page-turn" aria-label="相邻文档">{pagination}</nav><footer class="doc-footer"><span>定义协作，按约交付。</span><a href="{edit_url}">编辑此页 ↗</a><a href="https://github.com/orchpact/orchpact/blob/main/LICENSE">MIT</a></footer></main>
<aside class="doc-toc"><p>本页内容</p>{toc}</aside></div>{search_dialog()}</body></html>'''


def build():
    pages = json.loads((ROOT / 'content/navigation.json').read_text())
    provenance = json.loads((ROOT / 'source-docs.json').read_text())
    if not re.fullmatch(r'[0-9a-f]{40}', provenance['commit']):
        raise ValueError('Docs require an explicit source commit')
    records = {row['source']: row for row in provenance['documents']}
    source_routes = {p['source']: route(p['slug']) for p in pages if 'source' in p}
    slugs = [p['slug'] for p in pages]
    if len(slugs) != len(set(slugs)) or any(not re.fullmatch(r'[a-z0-9-]*', slug) for slug in slugs):
        raise ValueError('Documentation routes must be unique slugs')
    rendered = []
    search = []
    for index, page in enumerate(pages):
        record = records[page['source']] if 'source' in page else None
        relative = record['file'] if record else page['file']
        file = ROOT / relative
        if file.is_symlink() or not file.resolve().is_relative_to(ROOT):
            raise ValueError('Unsafe content path')
        data = file.read_bytes()
        if record and hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ValueError('Managed docs changed; sync an upstream commit: ' + relative)
        md = markdown.Markdown(extensions=['extra', 'toc', 'sane_lists'], extension_configs={'toc': {'slugify': slugify_unicode, 'toc_depth': '2-3', 'permalink': '↗', 'permalink_title': '链接到本节'}})
        body = md.convert(data.decode())
        body = re.sub(r'\b(href|src)="([^"]+)"', lambda match: match[1] + '="' + escape(rewrite_link(match[2], page, source_routes, provenance), quote=True) + '"', body)
        body=body.replace('<table>','<div class="table-scroll"><table>').replace('</table>','</table></div>')
        rendered.append((page['slug'], render_page(page, pages, index, body, md.toc, provenance)))
        search.append(dict(title=page['title'], section=page['section'], url=route(page['slug']), text=plain_text(body)))
    if DIST.is_symlink() or (DIST.exists() and not (DIST / '.orchpact-site').is_file()):
        raise ValueError('Refusing to overwrite an unmanaged dist directory')
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    (DIST / '.orchpact-site').write_text('Generated by scripts/build.py\n')
    for file in (ROOT / 'src').rglob('*'):
        if file.is_symlink():
            raise ValueError('Symlink in website source')
        if file.is_file():
            target = DIST / file.relative_to(ROOT / 'src')
            target.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(file, target)
    for slug, document in rendered:
        folder = DIST / route(slug).strip('/')
        folder.mkdir(parents=True, exist_ok=True); (folder / 'index.html').write_text(document)
    (DIST / 'search-index.json').write_text(json.dumps(search, ensure_ascii=False) + '\n')
    (DIST / 'source-docs.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
    (DIST / '.nojekyll').write_text('')
    (DIST / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://orchpact.github.io/sitemap.xml\n')
    urls = [SITE['url'] + '/'] + [SITE['url'] + route(p['slug']) for p in pages]
    (DIST / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join('<url><loc>' + url + '</loc></url>' for url in urls) + '</urlset>\n')
    (DIST / '404.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面未找到 · Orchpact</title><link rel="stylesheet" href="/assets/docs.css"></head><body><main class="not-found"><p class="sidebar-label">404 / ORCHPACT</p><h1>这条路径还没有交付物。</h1><p>页面可能已经移动，或链接存在拼写错误。</p><a href="/docs/">从文档目录继续 ↗</a><a href="/">返回项目介绍</a></main></body></html>''')
    print(json.dumps(dict(pages=len(pages) + 1, documentation_pages=len(pages), source_commit=provenance['commit'], output='dist')))


if __name__ == '__main__':
    build()
