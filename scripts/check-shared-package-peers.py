#!/usr/bin/env python3
"""Class sweep: every consumer x every NON-OPTIONAL peer of every @bsuite/* shared package."""
import json, os, urllib.request, sys

REPOS = {
    'crm7':       'crm7',
    'bsu':        'business-suite-unified',
    'conduit':    'conduit',
    'throughput': 'throughput',
    'braden':     'braden',
}
cache = {}
def peers(name, spec):
    ver = spec.lstrip('^~>=< ').split(' ')[0]
    key = f'{name}@{ver}'
    if key in cache: return cache[key]
    try:
        with urllib.request.urlopen(f'https://registry.npmjs.org/{name.replace("/","%2f")}/{ver}', timeout=20) as r:
            d = json.load(r)
    except Exception as e:
        cache[key] = ('ERR', str(e)); return cache[key]
    pd   = d.get('peerDependencies', {}) or {}
    meta = d.get('peerDependenciesMeta', {}) or {}
    req = {k: v for k, v in pd.items() if not meta.get(k, {}).get('optional')}
    cache[key] = ('OK', req)
    return cache[key]

rows = []
for repo, path in REPOS.items():
    pj = os.path.join(path, 'package.json')
    if not os.path.exists(pj): continue
    d = json.load(open(pj))
    declared = {}
    for blk in ('dependencies','devDependencies','peerDependencies','optionalDependencies'):
        declared.update(d.get(blk, {}) or {})
    for pkg, spec in sorted((d.get('dependencies') or {}).items()):
        if not pkg.startswith('@bsuite/'): continue
        status, req = peers(pkg, spec)
        if status == 'ERR':
            rows.append((repo, pkg, spec, 'REGISTRY-ERR', req)); continue
        for peer, range_ in sorted(req.items()):
            ok = peer in declared
            rows.append((repo, pkg, spec, peer, ('DECLARED ' + declared[peer]) if ok else f'*** MISSING (needs {range_}) ***'))

miss = [r for r in rows if 'MISSING' in str(r[4])]
print(f"{'REPO':<11} {'SHARED PKG':<26} {'SPEC':<10} {'NON-OPTIONAL PEER':<20} STATUS")
print('-'*110)
for r in rows:
    if 'MISSING' in str(r[4]) or '--all' in sys.argv:
        print(f'{r[0]:<11} {r[1]:<26} {r[2]:<10} {r[3]:<20} {r[4]}')
print('-'*110)
print(f'TOTAL peer relationships checked: {len(rows)}')
print(f'UNDECLARED NON-OPTIONAL PEERS   : {len(miss)}')

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
