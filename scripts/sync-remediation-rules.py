#!/usr/bin/env python3
"""Distribute one portable remediation rule; check content and agent entry points."""
import argparse
from pathlib import Path

APPS = ('business-suite-unified', 'crm7', 'conduit', 'braden', 'R80.4', 'throughput')
RULE = Path('.agents/rules/remediation-execution.md')
START = '<!-- bsuite-remediation-rules:start -->'
END = '<!-- bsuite-remediation-rules:end -->'

def entry(name):
    reference = ('@.agents/rules/remediation-execution.md' if name == 'CLAUDE.md' else
                 'Read [.agents/rules/remediation-execution.md](.agents/rules/remediation-execution.md) before remediation work.')
    return f'{START}\n## Remediation execution rules (2026-09-09)\n\n{reference}\nThis current contract governs remediation execution where older workflow defaults conflict.\n{END}\n\n'

def sync(root, write=False):
    source = (root / RULE).read_bytes()
    errors = []
    for repo in (root, *(root / app for app in APPS)):
        target = repo / RULE
        if write and repo != root:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(source)
        if not target.exists() or target.read_bytes() != source:
            errors.append(f'{target}: missing or divergent rule')
        for name in ('AGENTS.md', 'CLAUDE.md'):
            path = repo / name
            if not path.exists():
                errors.append(f'{path}: missing existing entry point')
                continue
            text = path.read_text()
            block = entry(name)
            if write:
                if START in text and END in text:
                    a, rest = text.split(START, 1)
                    _, b = rest.split(END, 1)
                    text = a + b.lstrip('\n')
                path.write_text(block + text)
                text = path.read_text()
            if not text.startswith(block) or text.count(START) != 1:
                errors.append(f'{path}: missing or duplicate loader')
    return errors

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    failures = sync(Path(__file__).resolve().parents[1], args.write)
    print('\n'.join(failures) if failures else 'PASS: 7 rule copies and 14 agent loaders')
    raise SystemExit(bool(failures))
