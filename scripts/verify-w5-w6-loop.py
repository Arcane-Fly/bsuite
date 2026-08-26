#!/usr/bin/env python3
"""W5+W6 loop verifier — section-accurate, binary PASS/FAIL."""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path('/home/braden/Desktop/Dev/bsuite')
fails = []

def check(name, ok):
    print(('PASS' if ok else 'FAIL') + f': {name}')
    if not ok:
        fails.append(name)

def sections(text):
    """Split a manual file into {id: segment} by `id: '...'` markers."""
    parts = re.split(r"(?=\{\s*\n\s*id: ')", text)
    out = {}
    for seg in parts:
        m = re.search(r"id: '([a-z0-9-]+)'", seg)
        if m:
            out.setdefault(m.group(1), seg)
    return out

M = (ROOT / 'docs/audits/20260725-jodie-parity-matrix-v1.00F.md').read_text()
EA = sections((ROOT / 'business-suite-unified/src/lib/manuals/manuals/enterprise-admin.ts').read_text())
EM = sections((ROOT / 'business-suite-unified/src/lib/manuals/manuals/employee.ts').read_text())
FO = sections((ROOT / 'business-suite-unified/src/lib/manuals/manuals/field-officer.ts').read_text())

print('== W5 parity matrix ==')
check('list tool FULL', 'list_enterprise_sub_orgs` | FULL' in M)
check('create tool FULL', 'create_enterprise_sub_org` | FULL' in M)
check('provision stays MISSING', 'Provision a new tenant under the Pilbara sub-org' in M and 'MISSING' in M.split('Provision a new tenant under the Pilbara sub-org')[1][:300])
check('feature stays MISSING', 'MISSING' in M.split('placements feature')[1][:300] if 'placements feature' in M else False)
check('no stale unregistered text', 'unregistered pending' not in M)

print('== W6 enterprise-admin ==')
check('getting-started keeps askJodie', 'askJodie' in EA.get('getting-started', ''))
check('sub-orgs keeps askJodie', 'askJodie' in EA.get('sub-orgs', ''))
check('platform-reports keeps askJodie', 'askJodie' in EA.get('platform-reports', ''))
check('tenant-management removed askJodie', 'askJodie' not in EA.get('tenant-management', 'x')[:400])
check('feature-assignment removed askJodie', 'askJodie' not in EA.get('feature-assignment', 'x')[:400])

print('== W6 employee ==')
check('timesheets removed askJodie', 'askJodie' not in EM.get('timesheets', 'x')[:400])
check('leave keeps askJodie', 'askJodie' in EM.get('leave', ''))
check('payslip section removed askJodie', 'askJodie' not in EM.get('payslips', EM.get('payslips-documents', 'x'))[:400])

print('== W6 field-officer ==')
check('case-notes keeps askJodie', 'askJodie' in FO.get('case-notes', ''))
check('incidents removed askJodie', 'askJodie' not in FO.get('incidents', 'x')[:400])

print('== changelog language ==')
for f in ['enterprise-admin.ts', 'employee.ts', 'field-officer.ts']:
    t = (ROOT / 'business-suite-unified/src/lib/manuals/manuals' / f).read_text().lower()
    check(f'{f}: no "we fixed"', 'we fixed' not in t)
    check(f'{f}: no "previously"', 'previously' not in t)

print('== manual tests ==')
r = subprocess.run(
    ['npx', 'vitest', 'run', 'src/lib/manuals'],
    cwd=ROOT / 'business-suite-unified', capture_output=True, text=True, timeout=300,
)
out = r.stdout + r.stderr
m = re.search(r'Tests\s+(\d+) passed', out)
check('manual integrity tests green', r.returncode == 0 and bool(m), )
if m:
    print(f'       ({m.group(1)} tests passed)')

print('== VERDICT ==')
if fails:
    print(f'LOOP VERIFIER: FAIL ({len(fails)} gaps: {", ".join(fails)})')
    sys.exit(1)
print('LOOP VERIFIER: PASS')
sys.exit(0)
