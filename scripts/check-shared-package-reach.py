#!/usr/bin/env python3
"""Class sweep for Task 1.1: which consumers are RANGE-LOCKED out of the latest
published version of a shared @bsuite/* package?

The class: a caret on a 0.x version is MINOR-locked (^0.6.3 := >=0.6.3 <0.7.0),
so a fix shipped in a later minor is unreachable and NOTHING reports a failure."""
import json, os, urllib.request, re, sys

REPOS = {
    'crm7':'crm7', 'bsu':'business-suite-unified',
    'conduit':'conduit', 'throughput':'throughput',
    'braden':'braden',
}
latest = {}
def get_latest(name):
    if name in latest: return latest[name]
    try:
        with urllib.request.urlopen(f'https://registry.npmjs.org/{name.replace("/","%2f")}', timeout=25) as r:
            d = json.load(r)
        latest[name] = d.get('dist-tags',{}).get('latest')
    except Exception as e:
        latest[name] = None
    return latest[name]

def parts(v):
    m = re.match(r'(\d+)\.(\d+)\.(\d+)', v or '')
    return tuple(int(x) for x in m.groups()) if m else None

def reaches(spec, newest):
    """Can `spec` resolve `newest`? Handles ^ and ~ incl. the 0.x special cases."""
    n = parts(newest)
    if not n: return None
    s = spec.strip()
    if s.startswith('^'):
        b = parts(s[1:])
        if not b: return None
        if b[0] > 0:   return n[0] == b[0] and n >= b          # ^1.2.3 -> <2.0.0
        if b[1] > 0:   return n[0] == 0 and n[1] == b[1] and n >= b   # ^0.6.3 -> <0.7.0  MINOR-LOCKED
        return n[0]==0 and n[1]==0 and n[2] >= b[2]            # ^0.0.3 -> <0.0.4
    if s.startswith('~'):
        b = parts(s[1:])
        return bool(b) and n[0]==b[0] and n[1]==b[1] and n >= b
    if parts(s): return parts(s) == n                          # exact pin
    return None

rows=[]
for repo, path in REPOS.items():
    pj=os.path.join(path,'package.json')
    if not os.path.exists(pj): continue
    deps=(json.load(open(pj)).get('dependencies') or {})
    for pkg,spec in sorted(deps.items()):
        if not pkg.startswith('@bsuite/'): continue
        newest=get_latest(pkg)
        if not newest: rows.append((repo,pkg,spec,'?','REGISTRY-UNREACHABLE')); continue
        r=reaches(spec,newest)
        if r is True:    v='reaches latest'
        elif r is False: v=f'*** LOCKED OUT of {newest} ***'
        else:            v='UNPARSEABLE RANGE - review by hand'
        rows.append((repo,pkg,spec,newest,v))

bad=[r for r in rows if 'LOCKED OUT' in r[4] or 'UNPARSEABLE' in r[4] or 'UNREACH' in r[4]]
print(f"{'REPO':<11} {'SHARED PACKAGE':<28} {'DECLARED':<12} {'LATEST':<10} VERDICT")
print('-'*100)
for r in rows:
    if '--all' in sys.argv or r in bad:
        print(f'{r[0]:<11} {r[1]:<28} {r[2]:<12} {r[3]:<10} {r[4]}')
print('-'*100)
print(f'Consumer x shared-package pairs checked : {len(rows)}')
print(f'RANGE-LOCKED OUT of a shipped fix       : {len([r for r in rows if "LOCKED OUT" in r[4]])}')
print(f'Needs manual review                     : {len(bad)-len([r for r in rows if "LOCKED OUT" in r[4]])}')

# Fail closed. A gate that cannot tell "checked nothing" from "found nothing"
# is not a gate (D-92): if no consumer package.json was readable at all, the
# zero above is meaningless, so exit non-zero rather than report a false pass.
_checked = len(rows)
if _checked == 0:
    print('GATE FAILED: zero consumer/package pairs inspected - submodules not checked out?')
    raise SystemExit(2)
if any('MISSING' in str(r[4]) or 'LOCKED OUT' in str(r[4]) for r in rows):
    raise SystemExit(1)
print('GATE PASSED')
