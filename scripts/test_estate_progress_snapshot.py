import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('snapshot', Path(__file__).with_name('estate-progress-snapshot.py'))
snapshot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snapshot)


class SnapshotTests(unittest.TestCase):
    def row(self, **kw):
        return {'id': 'bsuite-1', 'status': 'pending', 'url': 'https://github.com/old/bsuite/issues/1', **kw}

    def test_closed_does_not_grant_acceptance(self):
        rows = snapshot.reconcile([self.row()], {'old/bsuite': {'issues': [{'number': 1, 'state': 'CLOSED', 'url': 'https://github.com/new/bsuite/issues/4'}]}})
        self.assertTrue(rows[0]['status_disagreement'])
        self.assertEqual(rows[0]['acceptance'], 'NOT_REVALIDATED')
        self.assertEqual(rows[0]['ledger'], 'pending')

    def test_missing_or_denied_source_is_unknown(self):
        for source in [{}, {'old/bsuite': {'error': '403', 'issues': []}}]:
            r = snapshot.reconcile([self.row()], source)[0]
            self.assertEqual(r['github'], 'UNKNOWN')
            self.assertFalse(r['status_disagreement'])

    def test_no_renumber_assumption(self):
        r = snapshot.reconcile([self.row()], {'new/bsuite': {'issues': [{'number': 1, 'state': 'CLOSED'}]}})[0]
        self.assertEqual(r['github'], 'UNKNOWN')

    def test_completed_but_open_is_disagreement(self):
        r = snapshot.reconcile([self.row(status='completed')], {'old/bsuite': {'issues': [{'number': 1, 'state': 'OPEN', 'url': self.row()['url']}]}})[0]
        self.assertTrue(r['status_disagreement'])

    def test_completed_unknown_remains_visible(self):
        for state in ('UNKNOWN', 'NO_ISSUE_URL', 'OPEN'):
            self.assertTrue(snapshot.needs_attention({'ledger':'completed', 'github':state}))
        self.assertFalse(snapshot.needs_attention({'ledger':'completed', 'github':'CLOSED'}))

    def test_ambiguous_issue_urls_refused(self):
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            snapshot.issue_ref(self.row(other='https://github.com/other/repo/issues/2'))

    def test_duplicate_rows_refused(self):
        with self.assertRaises(ValueError):
            snapshot.reconcile([self.row(), self.row()], {})

    def test_fresh_cache_avoids_network(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            (path/'old__bsuite.json').write_text(json.dumps({'repo':'old/bsuite', 'at':snapshot.time.time(), 'issues':[], 'error':None}))
            with patch.object(snapshot.subprocess, 'run', side_effect=AssertionError('network used')):
                self.assertTrue(snapshot.fetch_issues('old/bsuite',path,900)['cached'])

    def test_failed_refresh_does_not_relabel_old_cache_fresh(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            old = {'repo':'old/bsuite', 'at':0, 'issues':[], 'error':None}
            (path/'old__bsuite.json').write_text(json.dumps(old))
            with patch.object(snapshot.subprocess,'run',side_effect=OSError('offline')):
                result=snapshot.fetch_issues('old/bsuite',path,900)
            self.assertEqual(result['error'],'offline')
            self.assertEqual(json.loads((path/'old__bsuite.json').read_text()),old)

    def test_owner_mapping_and_source_health_changes(self):
        before = {'queue_sha256':'a', 'rows':[{'id':'1','owner':'old','url':'old'}], 'sources':{}}
        after = {'queue_sha256':'b', 'rows':[{'id':'1','owner':'new','url':'new'}], 'sources':{'r':{'error':'403'}}}
        delta = snapshot.compare_reports(before, after)
        self.assertEqual(delta['changed_since_previous'], ['1'])
        self.assertTrue(delta['queue_changed'])
        self.assertTrue(delta['source_health_changed'])
        after['rows'] = []
        self.assertEqual(snapshot.compare_reports(before, after)['removed_since_previous'], ['1'])

    def test_history_is_retained(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = snapshot.archive_report(root, {'rows':[1], 'sources':{}})
            second = snapshot.archive_report(root, {'rows':[2], 'sources':{}})
            self.assertNotEqual(first, second)
            self.assertEqual(json.loads(Path(first).read_text())['rows'], [1])
            self.assertTrue(Path(second).exists())

    def test_truncation_and_error_are_incomplete(self):
        self.assertTrue(snapshot.incomplete_sources({'r':{'possibly_truncated':True}}))
        self.assertTrue(snapshot.incomplete_sources({'r':{'error':'403'}}))
        self.assertFalse(snapshot.incomplete_sources({'r':{'issues':[]}}))

    def test_future_or_invalid_cache_refetches(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for stamp in (snapshot.time.time()+999, 'invalid'):
                (root/'old__bsuite.json').write_text(json.dumps({'repo':'old/bsuite','at':stamp,'issues':[]}))
                with patch.object(snapshot.subprocess, 'run', side_effect=OSError('offline')) as run:
                    self.assertEqual(snapshot.fetch_issues('old/bsuite',root,900)['error'], 'offline')
                    run.assert_called_once()


if __name__ == '__main__':
    unittest.main()
