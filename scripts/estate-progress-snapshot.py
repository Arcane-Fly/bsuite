#!/usr/bin/env python3
"""Estate-state read-only reconciliation; writes report/cache/history artifacts only."""
import argparse
import fcntl
import collections
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import os
import time

DEFAULT_QUEUE = Path('/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation/hermes-queue.json')
ISSUE_URL = re.compile(r'^https://github\.com/([\w.-]+/[\w.-]+)/issues/(\d+)/?$')


def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=path.name + '.')
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(data)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def issue_ref(row):
    # Match actual URLs, never infer that an issue number survived a repo move.
    refs = set()
    for value in row.values():
        if isinstance(value, str):
            match = ISSUE_URL.fullmatch(value)
            if match:
                refs.add((match.group(1), int(match.group(2))))
    if len(refs) > 1:
        raise ValueError(f"Ambiguous issue URLs for queue row {row.get('id')}; reconcile explicitly")
    return next(iter(refs), None)


def fetch_issues(repo, cache, ttl, refresh=False):
    path = cache / (repo.replace('/', '__') + '.json')
    if not refresh and path.exists():
        try:
            saved = json.loads(path.read_text())
            if saved.get('repo') == repo and 0 <= time.time() - saved['at'] < ttl:
                return saved | {'cached': True}
        except (ValueError, KeyError, TypeError):
            pass
    try:
        result = subprocess.run(
            ['gh', 'issue', 'list', '--repo', repo, '--state', 'all', '--limit', '1000',
             '--json', 'number,state,url,updatedAt'], capture_output=True, text=True, timeout=60)
        if result.returncode:
            raise RuntimeError(result.stderr.strip()[:300])
        rows = json.loads(result.stdout)
        if not isinstance(rows, list):
            raise ValueError('GitHub returned a non-list response')
        saved = {'repo': repo, 'at': time.time(), 'issues': rows, 'error': None,
                 'possibly_truncated': len(rows) >= 1000}
        atomic(path, json.dumps(saved))
        return saved | {'cached': False}
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as exc:
        return {'repo': repo, 'at': time.time(), 'issues': [], 'error': str(exc), 'cached': False}


def reconcile(items, sources):
    ids = [row['id'] for row in items]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate queue IDs; reconciliation refused')
    rows = []
    for item in items:
        ref = issue_ref(item)
        state, url = 'NO_ISSUE_URL', None
        if ref:
            repo, number = ref
            source = sources.get(repo, {})
            issue = next((x for x in source.get('issues', []) if x['number'] == number), None)
            state = issue['state'] if issue else 'UNKNOWN'
            url = issue['url'] if issue else f'https://github.com/{repo}/issues/{number}'
        ledger = item.get('status', 'missing')
        mismatch = state in ('OPEN', 'CLOSED') and ((ledger == 'completed') != (state == 'CLOSED'))
        rows.append({'id': item['id'], 'title': item.get('title', ''), 'ledger': ledger, 'github': state, 'url': url,
                     'status_disagreement': mismatch,
                     'owner_recorded': item.get('owner'), 'acceptance': 'NOT_REVALIDATED'})
    return rows


def needs_attention(row):
    # A completed ledger label must not hide loss of source verification.
    return row['ledger'] != 'completed' or row['github'] != 'CLOSED'


def compare_reports(before, report):
    old = {r['id']: r for r in before.get('rows', [])}
    new = {r['id']: r for r in report['rows']}
    def health(value):
        return {key: {k: source.get(k) for k in ('error', 'possibly_truncated')}
                for key, source in value.get('sources', {}).items()}
    return {
        'changed_since_previous': [key for key, row in new.items() if old.get(key) != row] if old else None,
        'removed_since_previous': sorted(set(old) - set(new)),
        'queue_changed': before.get('queue_sha256') != report['queue_sha256'] if before else None,
        'source_health_changed': health(before) != health(report) if before else None,
    }


def archive_report(output, report):
    # Preserve relevant observations, not all unrelated issues fetched for caching.
    compact = {k: v for k, v in report.items() if k != 'sources'}
    compact['sources'] = {repo: {k: v for k, v in source.items() if k != 'issues'}
                          for repo, source in report['sources'].items()}
    encoded = json.dumps(compact, sort_keys=True, indent=2) + '\n'
    digest = hashlib.sha256(encoded.encode()).hexdigest()
    path = output / 'history' / (digest + '.json')
    if not path.exists():
        atomic(path, encoded)
    return str(path)


def incomplete_sources(sources):
    return any(s.get('error') or s.get('possibly_truncated') for s in sources.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--queue', type=Path, default=DEFAULT_QUEUE)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cache-ttl', type=int, default=900)
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with (args.output / '.snapshot.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return build_report(args)


def build_report(args):
    raw = args.queue.read_bytes()
    data = json.loads(raw)
    items = data['items']
    if not items:
        raise ValueError('Empty queue is not evidence of completion')
    repos = sorted({ref[0] for row in items if (ref := issue_ref(row))})
    sources = {repo: fetch_issues(repo, args.output / 'cache', args.cache_ttl, args.refresh) for repo in repos}
    rows = reconcile(items, sources)
    previous = args.output / 'current.json'
    before = json.loads(previous.read_text()) if previous.exists() else {}
    if before:
        archive_report(args.output, before)
    report = {'observed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'queue': str(args.queue), 'queue_sha256': hashlib.sha256(raw).hexdigest(),
              'total': len(rows), 'ledger_counts': dict(collections.Counter(r['ledger'] for r in rows)),
              'github_counts': dict(collections.Counter(r['github'] for r in rows)),
              'sources': sources, 'rows': rows,
              'coverage_status': 'INCOMPLETE' if incomplete_sources(sources) else 'COLLECTED',
              'estate_acceptance': 'NOT_REVALIDATED'}
    report.update(compare_reports(before, report))
    changed = report['changed_since_previous']
    archive_report(args.output, report)
    lines = ['# Estate progress snapshot', '', report['observed_at'], '',
             'Estate-state read-only; writes report/cache/history artifacts. Issue closure does not establish deployed UX or production acceptance.', '',
             f"Queue rows: {len(rows)}. Ledger: {report['ledger_counts']}. GitHub: {report['github_counts']}.", '',
             'Changed rows (status, owner, title or issue mapping) since previous snapshot: ' + ('baseline; no measured rate' if changed is None else str(len(changed))), '',
             f"Coverage: {report['coverage_status']}; queue changed: {report['queue_changed']}; source health changed: {report['source_health_changed']}; removed rows: {len(report['removed_since_previous'])}.", '',
             '## Source health', '']
    for repo, source in sources.items():
        measured_at = datetime.datetime.fromtimestamp(source['at'], datetime.timezone.utc).isoformat()
        lines.append(f"- {repo} (source observed {measured_at}): {'ERROR: ' + source['error'] if source.get('error') else 'OK'}; cached={source['cached']}; possible truncation={source.get('possibly_truncated', False)}")
    lines += ['', '## Ledger / GitHub disagreements', '', '| Item | Ledger | GitHub |', '|---|---|---|']
    for r in rows:
        if r['status_disagreement']:
            lines.append(f"| [{r['id']}]({r['url']}) | {r['ledger']} | {r['github']} |")
    lines += ['', '## All outstanding rows', '',
              '| Item | Work | Ledger | GitHub | Recorded owner |', '|---|---|---|---|---|']
    def cell(value):
        return str(value or 'unassigned').replace('|', '\\|').replace('\n', ' ')
    for r in rows:
        if needs_attention(r):
            label = f"[{r['id']}]({r['url']})" if r['url'] else r['id']
            lines.append(f"| {label} | {cell(r['title'])} | {r['ledger']} | {r['github']} | {cell(r['owner_recorded'])} |")
    lines += ['', 'Owners are recorded claims, not liveness checks. Unlisted issues are UNKNOWN, never inferred closed.',
              'Rows keep their recorded repository URL until the migration owner verifies an issue mapping.', '']
    atomic(args.output / 'current.json', json.dumps(report, indent=2) + '\n')
    atomic(args.output / 'README.md', '\n'.join(lines))
    print(json.dumps({k: report[k] for k in ('observed_at', 'total', 'ledger_counts', 'github_counts', 'changed_since_previous')}))
    return 1 if incomplete_sources(sources) else 0


if __name__ == '__main__':
    raise SystemExit(main())
