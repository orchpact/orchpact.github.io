"""Import an explicit clean main-repository commit into this independent site."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def safe_path(root, relative):
    path = root / relative
    if Path(relative).is_absolute() or '..' in Path(relative).parts or path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
        raise ValueError('Unsafe document path: ' + relative)
    return path


def sync(source):
    source = source.resolve()
    def git(*args):
        return subprocess.check_output(['git', '-C', str(source), *args], text=True).strip()
    if git('status', '--porcelain'):
        raise ValueError('Commit and review the source checkout before syncing docs')
    commit = git('rev-parse', 'HEAD')
    manifest_path = ROOT / 'source-docs.json'
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'documents': []}
    for row in previous['documents']:
        target = safe_path(ROOT, row['file'])
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != row['sha256']:
            raise ValueError('Managed snapshot has local edits; preserve and resolve them first: ' + row['file'])
    navigation = json.loads((ROOT / 'content/navigation.json').read_text())
    records = []
    pending = []
    for row in navigation:
        if 'source' not in row:
            continue
        path = safe_path(source, row['source'])
        # Read committed blobs, so ignored/untracked local files can never enter the snapshot.
        data = subprocess.check_output(['git', '-C', str(source), 'show', commit + ':' + row['source']])
        if not path.is_file() or path.read_bytes() != data:
            raise ValueError('Source file differs from committed content: ' + row['source'])
        relative = 'content/reference/' + (row['slug'] or 'index') + '.md'
        target = safe_path(ROOT, relative)
        pending.append((target, data))
        records.append(dict(source=row['source'], file=relative, sha256=hashlib.sha256(data).hexdigest()))
    # All source and destination checks complete before the first mutation.
    for target, data in pending:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    report = dict(repository='https://github.com/orchpact/orchpact', commit=commit,
                  committed_at=git('show', '-s', '--format=%cI', commit), documents=records)
    manifest_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(dict(commit=commit, documents=len(records))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    sync(parser.parse_args().source)
