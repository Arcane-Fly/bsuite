"""Exercise rule distribution without touching real submodule checkouts."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    'sync_rules', Path(__file__).with_name('sync-remediation-rules.py')
)
sync_rules = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync_rules)


class SyncRulesTest(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(prefix='bsuite-rule-test-')
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        source = self.root / sync_rules.RULE
        source.parent.mkdir(parents=True)
        source.write_text('# Canonical fixture contract\n')
        for repo in (self.root, *(self.root / app for app in sync_rules.APPS)):
            repo.mkdir(parents=True, exist_ok=True)
            for name in ('AGENTS.md', 'CLAUDE.md'):
                (repo / name).write_text('# Existing instructions\n')

    def snapshot(self):
        return {
            str(path.relative_to(self.root)): path.read_bytes()
            for path in self.root.rglob('*') if path.is_file()
        }

    def test_populated_checkouts_sync_idempotently_and_detect_drift(self):
        self.assertTrue(sync_rules.sync(self.root))
        self.assertEqual(sync_rules.sync(self.root, write=True), [])
        first = self.snapshot()
        self.assertEqual(sync_rules.sync(self.root, write=True), [])
        self.assertEqual(self.snapshot(), first)
        self.assertEqual(sync_rules.sync(self.root), [])
        rule = self.root / sync_rules.APPS[-1] / sync_rules.RULE
        rule.write_text('# Divergent rule\n')
        before_check = self.snapshot()
        self.assertTrue(sync_rules.sync(self.root))
        self.assertEqual(self.snapshot(), before_check)

    def test_missing_last_checkout_prevents_all_writes(self):
        last = self.root / sync_rules.APPS[-1]
        for name in ('AGENTS.md', 'CLAUDE.md'):
            (last / name).unlink()
        before = self.snapshot()
        self.assertTrue(sync_rules.sync(self.root, write=True))
        self.assertEqual(self.snapshot(), before)
        self.assertFalse((last / '.agents').exists())

    def test_malformed_last_loader_prevents_all_writes(self):
        path = self.root / sync_rules.APPS[-1] / 'CLAUDE.md'
        for malformed in (
            sync_rules.START,
            sync_rules.END,
            sync_rules.END + sync_rules.START,
            sync_rules.START + sync_rules.END + sync_rules.START + sync_rules.END,
        ):
            with self.subTest(markers=malformed):
                path.write_text(malformed + '\n# Keep this text\n')
                before = self.snapshot()
                self.assertTrue(sync_rules.sync(self.root, write=True))
                self.assertEqual(self.snapshot(), before)


if __name__ == '__main__':
    unittest.main()
