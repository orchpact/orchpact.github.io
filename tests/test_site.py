import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('check',ROOT/'scripts/check.py');check=importlib.util.module_from_spec(spec);spec.loader.exec_module(check)
spec=importlib.util.spec_from_file_location('sync',ROOT/'scripts/sync_docs.py');sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)

class SiteTests(unittest.TestCase):
    def test_checker_rejects_missing_routes_and_fragments(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            root.joinpath('index.html').write_text('<html lang="zh-CN"><head><link rel="canonical" href="https://orchpact.github.io/"></head><body><h1>Test</h1><a href="/missing/">missing</a><a href="#absent">anchor</a></body></html>')
            errors,_=check.validate(root)
            self.assertTrue(any('missing /missing/' in e for e in errors))
            self.assertTrue(any('missing anchor #absent' in e for e in errors))

    def test_sync_paths_cannot_escape_or_follow_symlinks(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for path in ('../outside.md','/outside.md'):
                with self.assertRaises(ValueError):sync.safe_path(root,path)
            root.joinpath('linked.md').symlink_to('/tmp')
            with self.assertRaises(ValueError):sync.safe_path(root,'linked.md')

    def test_complete_built_site_passes(self):
        errors,counts=check.validate(ROOT/'dist')
        self.assertEqual(errors,[])
        self.assertGreaterEqual(counts['html_pages'],19)

if __name__=='__main__':unittest.main()
