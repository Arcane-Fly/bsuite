#!/usr/bin/env python3
import argparse
import collections
import datetime
import fcntl
import json
import os
from pathlib import Path
import tempfile

LEDGER = Path('/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation/hermes-queue.json')
REASON = 'planner produced no plan on kimi-k3:cloud or glm-5.3:cloud retry'


def reconcile(data, timestamp):
    result = json.loads(json.dumps(data))
    ids = [item['id'] for item in result['items']]
    if len(ids) != len(set(ids)):
        raise ValueError('duplicate row IDs')
    changed = []
    for item in result['items']:
        if item.get('status') != 'blocked' or item.get('blocked_reason') != REASON:
            continue
        item.setdefault('provider_recovery_history', []).append({
            'at': timestamp, 'from_status': item['status'], 'from_reason': item['blocked_reason'],
            'to_status': 'pending', 'owner': 'devin-bsuite-closeout-20260919',
            'reason': 'Operator switched execution to Devin on 2026-09-20; retry prior missing-plan attempt, not a completion.'})
        item['status'] = 'pending'
        item['last_block_note'] = item.pop('blocked_reason')
        changed.append(item['id'])
    for old, new in zip(data['items'], result['items']):
        if old['id'] not in changed and old != new:
            raise ValueError('unselected row changed')
        if old.get('status') == 'completed' and old != new:
            raise ValueError('completed evidence changed')
    return result, changed


def counts(data):
    return dict(collections.Counter(item.get('status', 'missing') for item in data['items']))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        original = {'other': {'keep': True}, 'items': [
            {'id': 'a-1', 'status': 'blocked', 'blocked_reason': REASON, 'evidence': ['keep']},
            {'id': 'a-2', 'status': 'blocked', 'blocked_reason': 'real implementation failure'},
            {'id': 'a-3', 'status': 'completed', 'blocked_reason': REASON, 'evidence': ['accepted']},
            {'id': 'a-4', 'status': 'pending', 'related_issues': [{'status': 'blocked'}]}]}
        preserved = json.dumps(original)
        updated, selected = reconcile(original, 'fixture-time')
        assert selected == ['a-1']
        assert json.dumps(original) == preserved
        assert updated['items'][0]['status'] == 'pending'
        assert updated['items'][0]['evidence'] == ['keep']
        assert updated['items'][0]['provider_recovery_history'][0]['from_reason'] == REASON
        assert updated['items'][1:] == original['items'][1:]
        assert updated['other'] == original['other']
        assert reconcile(updated, 'again') == (updated, [])
        try:
            reconcile({'items': [{'id': 'a-1'}, {'id': 'a-1'}]}, 'fixture-time')
        except ValueError:
            pass
        else:
            raise AssertionError('duplicate IDs accepted')
        print('PASS: exact selection, preserved evidence, other blockers unchanged, idempotence, duplicate rejection')
        return
    with Path(str(LEDGER) + '.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        original = LEDGER.read_bytes()
        data = json.loads(original)
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        updated, changed = reconcile(data, timestamp)
        report = {'source': str(LEDGER), 'apply': args.apply, 'observed_at': timestamp,
                  'predicate': {'status': 'blocked', 'blocked_reason': REASON},
                  'before': counts(data), 'after': counts(updated),
                  'selected_count': len(changed), 'selected_ids': changed,
                  'total_before': len(data['items']), 'total_after': len(updated['items'])}
        if args.apply and changed:
            backup = Path(str(LEDGER) + '.bak-20260920-devin')
            with backup.open('xb') as stream:
                stream.write(original)
                stream.flush()
                os.fsync(stream.fileno())
            fd, temporary = tempfile.mkstemp(dir=LEDGER.parent, prefix=LEDGER.name + '.devin-')
            try:
                with os.fdopen(fd, 'w') as stream:
                    json.dump(updated, stream, indent=2)
                    stream.write('\n')
                    stream.flush()
                    os.fsync(stream.fileno())
                if LEDGER.read_bytes() != original:
                    raise ValueError('ledger changed while locked; refusing replacement')
                os.replace(temporary, LEDGER)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
            if json.loads(LEDGER.read_bytes()) != updated:
                raise ValueError('read-back mismatch')
            report['backup'] = str(backup)
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
