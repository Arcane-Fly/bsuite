#!/usr/bin/env python3
"""Isolated unit tests for .devin/closeout.py.

All tests run against fixture ROOT/STATE/LEDGER/HOOKS in a temp dir;
the production ledger and hooks are never touched.
"""
import hashlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import closeout  # noqa: E402


class Fixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.state = root / 'state'
        self.state.mkdir()
        self.ledger = root / 'ledger.json'
        self.hooks = root / 'hooks'
        self.hooks.mkdir()
        self._saved = (closeout.ROOT, closeout.STATE, closeout.LEDGER, closeout.HOOKS)
        closeout.ROOT = root
        closeout.STATE = self.state
        closeout.LEDGER = self.ledger
        closeout.HOOKS = self.hooks
        self.write_ledger([
            {'id': 'bsuite-1', 'status': 'pending'},
            {'id': 'bsuite-2', 'status': 'blocked'},
            {'id': 'bsuite-3', 'status': 'completed'},
        ])
        self.ledger_bytes = self.ledger.read_bytes()

    def tearDown(self):
        closeout.ROOT, closeout.STATE, closeout.LEDGER, closeout.HOOKS = self._saved
        self.assertEqual(self.ledger.read_bytes(), self.ledger_bytes,
                         'ledger bytes changed')
        self.tmp.cleanup()

    def write_ledger(self, items):
        self.ledger.write_text(json.dumps({'items': items}))

    def fake_run(self, rc=0, make_artifact=True):
        def _run(command, cwd=None, env=None, stdout=None, stderr=None):
            self.last_env = env
            row = command[2]
            lane = Path(command[1]).name.split('-')[1]
            stage = {'planning': 'plan', 'implementation': 'impl',
                     'accountability': 'review'}[lane]
            if make_artifact:
                (self.state / f'{stage}-{row}.md').write_text('artifact\n')
            return mock.Mock(returncode=rc)
        return _run


class TestSnapshot(Fixture):
    def test_counts_top_level_items_including_blocked(self):
        _, snap = closeout.ledger_snapshot()
        self.assertEqual(snap['ledger_total'], 3)
        self.assertEqual(snap['counts'], {'pending': 1, 'blocked': 1, 'completed': 1})
        self.assertFalse(snap['complete'])

    def test_duplicate_ids_raise(self):
        self.write_ledger([{'id': 'x-1'}, {'id': 'x-1'}])
        try:
            with self.assertRaises(ValueError):
                closeout.ledger_snapshot()
        finally:
            self.ledger.write_bytes(self.ledger_bytes)

    def test_empty_ledger_never_complete(self):
        self.write_ledger([])
        try:
            _, snap = closeout.ledger_snapshot()
            self.assertFalse(snap['complete'])
        finally:
            self.ledger.write_bytes(self.ledger_bytes)


class TestPlanAttempt(Fixture):
    def test_rc0_with_artifact_awaits_lead_review(self):
        with mock.patch.object(closeout.subprocess, 'run', self.fake_run(rc=0)):
            rc = closeout.run_stage('bsuite-1', 'plan')
        self.assertEqual(rc, 0)
        receipt = json.loads((self.state / 'plan-bsuite-1.receipt.json').read_text())
        self.assertEqual(receipt['state'], 'awaiting_lead_review')
        self.assertTrue(receipt['artifact_exists'])

    def test_nonzero_rc_needs_attention(self):
        with mock.patch.object(closeout.subprocess, 'run', self.fake_run(rc=7)):
            closeout.run_stage('bsuite-1', 'plan')
        receipt = json.loads((self.state / 'plan-bsuite-1.receipt.json').read_text())
        self.assertEqual(receipt['state'], 'needs_attention')

    def test_missing_artifact_needs_attention(self):
        with mock.patch.object(closeout.subprocess, 'run',
                               self.fake_run(rc=0, make_artifact=False)):
            closeout.run_stage('bsuite-1', 'plan')
        receipt = json.loads((self.state / 'plan-bsuite-1.receipt.json').read_text())
        self.assertEqual(receipt['state'], 'needs_attention')

    def test_child_env_marks_bsu_closeout_child(self):
        self.last_env = None
        with mock.patch.object(closeout.subprocess, 'run', self.fake_run()):
            closeout.run_stage('bsuite-1', 'plan')
        self.assertEqual(self.last_env['BSU_CLOSEOUT_CHILD'], '1')


class TestAssignmentGating(Fixture):
    def plan_file(self):
        plan = self.state / 'plan-bsuite-1.md'
        plan.write_text('plan body\n')
        return plan

    def assignment(self, **over):
        doc = {'owner': closeout.OWNER, 'row': 'bsuite-1', 'approved': True,
               'plan_sha256': hashlib.sha256(self.plan_file().read_bytes()).hexdigest()}
        doc.update(over)
        (self.state / 'impl-bsuite-1.assignment.json').write_text(json.dumps(doc))

    def test_existing_receipt_blocks_repeat(self):
        (self.state / 'plan-bsuite-1.receipt.json').write_text('{}')
        with mock.patch.object(closeout.subprocess, 'run') as run:
            with self.assertRaises(ValueError):
                closeout.run_stage('bsuite-1', 'plan')
        run.assert_not_called()

    def test_impl_requires_assignment(self):
        cases = [
            ('absent', None),
            ('not approved', {'approved': False}),
            ('wrong owner', {'owner': 'someone-else'}),
            ('wrong row', {'row': 'bsuite-2'}),
            ('plan changed', {'plan_sha256': '0' * 64}),
        ]
        for name, over in cases:
            with self.subTest(case=name):
                (self.state / 'impl-bsuite-1.assignment.json').unlink(missing_ok=True)
                self.plan_file()
                if over is not None:
                    self.assignment(**over)
                with mock.patch.object(closeout.subprocess, 'run') as run:
                    with self.assertRaises((ValueError, OSError)):
                        closeout.run_stage('bsuite-1', 'impl')
                run.assert_not_called()

    def test_impl_accepted_assignment_runs(self):
        self.plan_file()
        self.assignment()
        run = mock.Mock(side_effect=self.fake_run())
        with mock.patch.object(closeout.subprocess, 'run', run):
            closeout.run_stage('bsuite-1', 'impl')
        run.assert_called_once()


class TestRetry(Fixture):
    def failed_plan_receipt(self, attempt=1):
        receipt = {'row': 'bsuite-1', 'stage': 'plan', 'attempt': attempt,
                   'state': 'needs_attention', 'exit_code': 15}
        (self.state / 'plan-bsuite-1.receipt.json').write_text(json.dumps(receipt))
        return receipt

    def test_retry_failed_plan_archives_and_writes_attempt2(self):
        previous = self.failed_plan_receipt()
        with mock.patch.object(closeout.subprocess, 'run', self.fake_run(rc=0)):
            closeout.run_stage('bsuite-1', 'plan', retry=True)
        archive = json.loads((self.state / 'plan-bsuite-1.attempt-1.json').read_text())
        self.assertEqual(archive, previous)
        receipt = json.loads((self.state / 'plan-bsuite-1.receipt.json').read_text())
        self.assertEqual(receipt['attempt'], 2)
        self.assertEqual(receipt['state'], 'awaiting_lead_review')

    def test_retry_running_refused_no_subprocess(self):
        (self.state / 'plan-bsuite-1.receipt.json').write_text(
            json.dumps({'row': 'bsuite-1', 'stage': 'plan', 'state': 'running'}))
        with mock.patch.object(closeout.subprocess, 'run') as run:
            with self.assertRaises(ValueError):
                closeout.run_stage('bsuite-1', 'plan', retry=True)
        run.assert_not_called()

    def test_retry_absent_receipt_refused(self):
        with mock.patch.object(closeout.subprocess, 'run') as run:
            with self.assertRaises(ValueError):
                closeout.run_stage('bsuite-1', 'plan', retry=True)
        run.assert_not_called()

    def test_fourth_attempt_refused(self):
        self.failed_plan_receipt(attempt=3)
        with mock.patch.object(closeout.subprocess, 'run') as run:
            with self.assertRaises(ValueError):
                closeout.run_stage('bsuite-1', 'plan', retry=True)
        run.assert_not_called()

    def test_existing_archive_refused(self):
        self.failed_plan_receipt()
        (self.state / 'plan-bsuite-1.attempt-1.json').write_text('{}')
        with mock.patch.object(closeout.subprocess, 'run') as run:
            with self.assertRaises(ValueError):
                closeout.run_stage('bsuite-1', 'plan', retry=True)
        run.assert_not_called()


class TestTickCap(Fixture):
    def test_two_receipts_cap_tick_without_dispatch(self):
        (self.state / 'plan-bsuite-1.receipt.json').write_text('{}')
        (self.state / 'plan-bsuite-2.receipt.json').write_text('{}')
        with mock.patch.object(closeout.subprocess, 'run') as run:
            rc = closeout.tick()
        self.assertEqual(rc, 0)
        run.assert_not_called()

    def test_tick_makes_no_ledger_status_writes(self):
        before = self.ledger.read_bytes()
        with mock.patch.object(closeout.subprocess, 'run', self.fake_run(rc=0)):
            closeout.tick()
        self.assertEqual(self.ledger.read_bytes(), before)
        receipt = json.loads((self.state / 'plan-bsuite-1.receipt.json').read_text())
        self.assertEqual(receipt['state'], 'awaiting_lead_review')


class TestAtomicJson(Fixture):
    def test_writes_complete_json_and_cleans_own_temp(self):
        target = self.state / 'out.json'
        closeout.atomic_json(target, {'a': [1, 2, 3]})
        self.assertEqual(json.loads(target.read_text()), {'a': [1, 2, 3]})
        leftovers = [p.name for p in self.state.iterdir() if p.name.startswith('out.json.')]
        self.assertEqual(leftovers, [])

    def test_cleanup_only_own_temp_on_failure(self):
        other = self.state / 'out.json.keepme'
        other.write_text('x')
        with mock.patch('os.replace', side_effect=OSError('boom')):
            with self.assertRaises(OSError):
                closeout.atomic_json(self.state / 'out.json', {'a': 1})
        self.assertTrue(other.exists())
        leftovers = [p.name for p in self.state.iterdir()
                     if p.name.startswith('out.json.') and p.name != 'out.json.keepme']
        self.assertEqual(leftovers, [])


if __name__ == '__main__':
    unittest.main()
