#!/usr/bin/env python3
import argparse
import collections
import datetime
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

ROOT = Path('/home/braden/Desktop/Dev/bsuite')
STATE = ROOT / '.devin/closeout'
LEDGER = Path('/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation/hermes-queue.json')
HOOKS = Path('/home/braden/.agents/hooks')
STAGES = {'plan': 'planning', 'impl': 'implementation', 'review': 'accountability'}
OWNER = 'devin-bsuite-closeout-20260919'


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def atomic_json(path, value):
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=path.name + '.')
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def ledger_snapshot():
    with LEDGER.open() as stream:
        data = json.load(stream)
    items = data['items']
    ids = [item['id'] for item in items]
    if len(ids) != len(set(ids)):
        raise ValueError('duplicate ledger IDs; refusing dispatch')
    counts = dict(collections.Counter(item.get('status', 'missing') for item in items))
    return items, {'observed_at': now(), 'owner': OWNER, 'ledger_total': len(items),
                   'counts': counts, 'source': str(LEDGER),
                   'complete': bool(items) and counts.get('completed', 0) == len(items),
                   'estate_complete': False, 'provider': 'Devin CLI',
                   'model': 'gpt-5-6-sol-medium', 'mode': 'lead-gated',
                   'note': 'Ledger statuses are claims, not acceptance. No automatic merge, closure or disarm.'}


def receipt_path(row, stage):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*-[0-9]+', row):
        raise ValueError('invalid row ID')
    return STATE / f'{stage}-{row}.receipt.json'


def run_stage(row, stage, retry=False):
    items, snapshot = ledger_snapshot()
    item = next((item for item in items if item['id'] == row), None)
    if item is None or item.get('status') == 'completed':
        raise ValueError('row missing or completed; lead must reconcile before dispatch')
    target = receipt_path(row, stage)
    if stage == 'impl':
        assignment_path = STATE / f'impl-{row}.assignment.json'
        assignment = json.loads(assignment_path.read_text())
        if assignment.get('owner') != OWNER or assignment.get('row') != row or assignment.get('approved') is not True:
            raise ValueError('implementation needs an explicit lead-owned assignment')
        plan = STATE / f'plan-{row}.md'
        import hashlib
        if hashlib.sha256(plan.read_bytes()).hexdigest() != assignment.get('plan_sha256'):
            raise ValueError('plan changed since lead approval')
    attempt = 1
    if target.exists():
        previous = json.loads(target.read_text())
        if not retry or previous.get('state') == 'running':
            raise ValueError('attempt already recorded or running; lead must review before retry')
        attempt = previous.get('attempt', 1) + 1
        if attempt > 3:
            raise ValueError('three attempts exhausted; lead must redesign the bounded assignment')
        archive = STATE / f'{stage}-{row}.attempt-{attempt - 1}.json'
        if archive.exists():
            raise ValueError('attempt archive already exists')
        atomic_json(archive, previous)
    elif retry:
        raise ValueError('no previous attempt to retry')
    receipt = {'row': row, 'stage': stage, 'attempt': attempt, 'owner': OWNER, 'started_at': now(),
               'pid': os.getpid(), 'state': 'running', 'model': snapshot['model']}
    atomic_json(target, receipt)
    atomic_json(STATE / 'status.json', snapshot | {'active': receipt})
    environment = dict(os.environ, BSU_CLOSEOUT_CHILD='1',
                       PATH='/home/braden/.local/bin:/usr/local/bin:/usr/bin:/bin')
    command = ['bash', str(HOOKS / f'bsuite-{STAGES[stage]}-lane.sh'), row, str(STATE)]
    with (STATE / 'runner.log').open('a') as log:
        result = subprocess.run(command, cwd=ROOT, env=environment, stdout=log, stderr=log)
    artifact = STATE / f'{stage}-{row}.md'
    receipt.update(finished_at=now(), exit_code=result.returncode,
                   artifact=str(artifact), artifact_exists=artifact.is_file(),
                   state='awaiting_lead_review' if result.returncode == 0 and artifact.is_file() else 'needs_attention')
    atomic_json(target, receipt)
    _, snapshot = ledger_snapshot()
    atomic_json(STATE / 'status.json', snapshot | {'last_attempt': receipt})
    print(json.dumps(receipt), flush=True)
    return result.returncode


def tick():
    items, snapshot = ledger_snapshot()
    atomic_json(STATE / 'status.json', snapshot)
    receipts = list(STATE.glob('*.receipt.json'))
    if len(receipts) >= 2:
        print(json.dumps(snapshot | {'dispatch': 'awaiting lead disposition of two bounded attempts'}), flush=True)
        return 0
    for item in items:
        if item.get('status') == 'pending' and not receipt_path(item['id'], 'plan').exists():
            return run_stage(item['id'], 'plan')
    print(json.dumps(snapshot | {'dispatch': 'no eligible row; reconciliation required'}), flush=True)
    return 0


def monitor():
    repos = ('bsuite', 'crm7', 'business-suite-unified', 'conduit', 'braden', 'R80.4', 'throughput')
    while True:
        results = {}
        for repo in repos:
            try:
                response = subprocess.run(['gh', 'pr', 'list', '--repo', f'GaryOcean428/{repo}',
                                           '--state', 'open', '--limit', '100', '--json',
                                           'number,url,headRefName,baseRefName,mergeStateStatus'],
                                          capture_output=True, text=True, timeout=60)
                results[repo] = json.loads(response.stdout) if response.returncode == 0 else {'error': response.stderr[-1000:]}
            except (subprocess.TimeoutExpired, json.JSONDecodeError) as error:
                results[repo] = {'error': str(error)}
        atomic_json(STATE / 'pr-monitor.json', {'observed_at': now(), 'read_only': True,
                                              'limit_per_repo': 100, 'repos': results})
        time.sleep(300)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tick', action='store_true')
    parser.add_argument('--status', action='store_true')
    parser.add_argument('--monitor', action='store_true')
    parser.add_argument('--run', nargs=2, metavar=('ROW', 'STAGE'))
    parser.add_argument('--retry', action='store_true')
    args = parser.parse_args()
    STATE.mkdir(parents=True, exist_ok=True)
    if args.status:
        print(json.dumps(ledger_snapshot()[1], indent=2))
        return 0
    lock_path = STATE / ('monitor.lock' if args.monitor else 'dispatch.lock')
    with lock_path.open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('BSuite Devin runner already active; no duplicate dispatch', flush=True)
            return 0
        if args.monitor:
            monitor()
        elif args.run:
            row, stage = args.run
            if stage not in STAGES:
                raise ValueError('unknown stage')
            return run_stage(row, stage, retry=args.retry)
        else:
            return tick()
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError) as error:
        print(f'BSuite runner needs attention: {error}', file=sys.stderr)
        sys.exit(1)
