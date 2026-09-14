"""Exercise rule distribution without touching real submodule checkouts."""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location(
    'sync_rules', Path(__file__).with_name('sync-remediation-rules.py')
)
sync_rules = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync_rules)


class SyncRulesTest(unittest.TestCase):
    def fixture(self, root):
        subprocess.run(('git', 'init', '-q', str(root)), check=True)
        source = root / sync_rules.RULE
        source.parent.mkdir(parents=True)
        source.write_text('# Canonical fixture contract\n')
        modules = []
        for app in sync_rules.APPS:
            repo = root / app
            repo.mkdir()
            subprocess.run(('git', 'init', '-q', str(repo)), check=True)
            modules.append(
                f'[submodule "{app}"]\n\tpath = {app}\n\turl = ../{app}.git\n'
            )
        (root / '.gitmodules').write_text('\n'.join(modules))
        for repo in (root, *(root / app for app in sync_rules.APPS)):
            for name in ('AGENTS.md', 'CLAUDE.md'):
                (repo / name).write_text('# Existing instructions\n')
        return root

    def snapshot(self, root):
        snapshot = {}
        for path in root.rglob('*'):
            if '.git' in path.relative_to(root).parts:
                continue
            relative = str(path.relative_to(root))
            if path.is_symlink():
                snapshot[relative] = ('symlink', os.readlink(path))
            elif path.is_file():
                snapshot[relative] = (
                    'file', path.read_bytes(), path.stat().st_mode & 0o7777
                )
            elif path.is_dir():
                snapshot[relative] = ('directory',)
        return snapshot

    def assert_rejected_without_writes(self, root):
        before = self.snapshot(root)
        self.assertTrue(sync_rules.sync(root, write=True))
        self.assertEqual(self.snapshot(root), before)

    def test_populated_checkouts_sync_idempotently_and_detect_drift(self):
        with tempfile.TemporaryDirectory(prefix='bsuite-rule-test-') as scratch:
            root = self.fixture(Path(scratch))
            protected = root / sync_rules.APPS[0] / 'AGENTS.md'
            protected.chmod(0o640)
            self.assertTrue(sync_rules.sync(root))
            real_mkstemp = sync_rules.tempfile.mkstemp
            calls = 0

            def fail_during_staging(*args, **kwargs):
                nonlocal calls
                calls += 1
                if calls == 5:
                    raise OSError('controlled staging failure')
                return real_mkstemp(*args, **kwargs)

            before_failure = self.snapshot(root)
            with mock.patch.object(
                sync_rules.tempfile, 'mkstemp', side_effect=fail_during_staging
            ):
                self.assertTrue(sync_rules.sync(root, write=True))
            self.assertEqual(self.snapshot(root), before_failure)
            self.assertEqual(sync_rules.sync(root, write=True), [])
            self.assertEqual(protected.stat().st_mode & 0o7777, 0o640)
            first = self.snapshot(root)
            self.assertEqual(sync_rules.sync(root, write=True), [])
            self.assertEqual(self.snapshot(root), first)
            self.assertEqual(sync_rules.sync(root), [])
            self.assertFalse(any(path.name.startswith('.') and '.md.' in path.name
                                 for path in root.rglob('*')))
            rule = root / sync_rules.APPS[-1] / sync_rules.RULE
            rule.write_text('# Divergent rule\n')
            before_check = self.snapshot(root)
            self.assertTrue(sync_rules.sync(root))
            self.assertEqual(self.snapshot(root), before_check)

    def test_invalid_checkout_or_registry_prevents_all_writes(self):
        cases = ('uninitialised', 'non_repository', 'symlink', 'registry_drift')
        for case in cases:
            with self.subTest(case=case), tempfile.TemporaryDirectory(
                prefix='bsuite-rule-test-'
            ) as scratch:
                root = self.fixture(Path(scratch))
                last = root / sync_rules.APPS[-1]
                if case == 'uninitialised':
                    shutil.rmtree(last)
                    last.mkdir()
                elif case == 'non_repository':
                    shutil.rmtree(last / '.git')
                elif case == 'symlink':
                    standin = root / 'standin'
                    shutil.move(last, standin)
                    last.symlink_to(standin, target_is_directory=True)
                else:
                    with (root / '.gitmodules').open('a') as stream:
                        stream.write(
                            '\n[submodule "guessed"]\n'
                            '\tpath = guessed\n\turl = ../guessed.git\n'
                        )
                self.assert_rejected_without_writes(root)

    def test_malformed_or_symlinked_output_prevents_all_writes(self):
        cases = (
            ('markers', sync_rules.START),
            ('markers', sync_rules.END),
            ('markers', sync_rules.END + sync_rules.START),
            (
                'markers',
                sync_rules.START + sync_rules.END + sync_rules.START + sync_rules.END,
            ),
            ('entrypoint_symlink', None),
            ('rule_symlink', None),
            ('parent_symlink', None),
            ('invalid_utf8', None),
        )
        for case, malformed in cases:
            with self.subTest(
                case=case, markers=malformed
            ), tempfile.TemporaryDirectory(prefix='bsuite-rule-test-') as scratch:
                root = self.fixture(Path(scratch))
                repo = root / sync_rules.APPS[-1]
                path = repo / 'CLAUDE.md'
                if case == 'markers':
                    path.write_text(malformed + '\n# Keep this text\n')
                elif case == 'entrypoint_symlink':
                    path.unlink()
                    path.symlink_to(root / 'CLAUDE.md')
                elif case == 'rule_symlink':
                    target = repo / sync_rules.RULE
                    target.parent.mkdir(parents=True)
                    target.symlink_to(root / sync_rules.RULE)
                elif case == 'parent_symlink':
                    standin = repo / 'standin-agents'
                    standin.mkdir()
                    (repo / '.agents').symlink_to(standin, target_is_directory=True)
                else:
                    path.write_bytes(b'\xff\xfe')
                self.assert_rejected_without_writes(root)


if __name__ == '__main__':
    unittest.main()
