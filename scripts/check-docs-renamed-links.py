#!/usr/bin/env python3
"""
Which dangling doc links are RENAMES rather than deletions?

An exact-path check reports a renamed target as gone. The reader then concludes
the document was lost and re-derives it — the most expensive form of
documentation rot, and the one the obvious check cannot see. This finds them by
fuzzy filename match and prints the suggested target.

REPORTS ONLY. It suggests; a human or a follow-up pass applies. A wrong rename
target is worse than a dangling link, because the reader follows it and believes
they arrived.

THREE RULES, each added because the naive version was wrong:

  1. BEST match, not FIRST. The first substring hit resolved
     `20260227-dry-one-shot-architecture-v1.02A.md` to `ARCHITECTURE.md` — a
     generic file that merely contains the word.

  2. When only the VERSION differs, take the highest one IN THE REPO. String
     distance ties v1.00A against v1.04A for a link naming v1.02A, and the tie
     was being broken by iteration order — pointing readers at an ARCHIVED
     v1.00A while the live document is v1.04A.

  3. Generic basenames (INDEX.md, README.md, STATUS.md …) are excluded. A match
     on one identifies nothing.

Documents that already declare themselves historical are skipped: a stale link
inside a verdict-bannered file IS the record.
"""
import os, re, difflib, sys
# Derived from THIS FILE's location, never hardcoded. The first version pinned
# an absolute path, so running it from a worktree silently scanned a different
# checkout and reported that one's findings as this one's.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The archive lives outside the repo by design (relocated 2026-07-25); its path
# is read from the pointer README rather than assumed.
ARCHIVE = os.environ.get('BSUITE_DOC_ARCHIVE') or os.path.join(os.path.dirname(ROOT), 'archived-repos-docs')
SKIP={'node_modules','.git','.claude','dist','build','coverage','.next'}
def index(root):
    out=[]
    for d,dirs,files in os.walk(root):
        dirs[:]=[x for x in dirs if x not in SKIP]
        for f in files:
            if f.endswith('.md'): out.append((f, os.path.join(d,f)))
    return out
repo=index(ROOT); arch=index(ARCHIVE)
names_repo={n for n,_ in repo}; names_arch={n for n,_ in arch}
all_names=sorted(names_repo|names_arch)
GENERIC={'INDEX.md','README.md','STATUS.md','CHANGELOG.md','CONTRIBUTING.md','OUTSTANDING.md',
         'FEATURE-SURFACE.md','STACK-AUDIT.md','UNIFIED-ROADMAP.md','CONSISTENCY-REPORT.md','PARENT-DOCS.md'}
def historical(t):
    for l in t.split('\n')[:14]:
        s=l.strip()
        if not s.startswith('>'): continue
        i=s.lstrip('> ').strip(); h=re.sub(r'^#+\s*','',i)
        if i.startswith('#') and re.search(r'VERDICT|SUPERSEDED|NO LONGER|DEAD|re-measured',h,re.I): return True
        if h.startswith('⚠'): return True
    return False
def key(s): return re.sub(r'[^a-z0-9]','', s.lower().replace('.md',''))
found={}
# SELF-REPORTING COUNTERS. LANE-WATCHER failed this script for "exited 0 but
# never stated a non-zero count of anything examined", and it was right to: the
# only number printed was the number of FINDINGS. A findings count alone cannot
# distinguish "scanned 392 files and 3 links look renamed" from "scanned nothing
# and therefore found nothing", and the two look identical on a green run.
n_files=0; n_skipped_historical=0; n_links=0; n_dangling=0; n_resolvable=0
docdirs=[os.path.join(ROOT,'docs')]+[os.path.join(ROOT,a,'docs') for a in
        ['crm7','conduit','business-suite-unified','R80.4','braden','throughput']]
for dd in docdirs:
    for d,dirs,files in os.walk(dd):
        dirs[:]=[x for x in dirs if x not in SKIP and x!='archive']
        for fn in files:
            if not fn.endswith('.md'): continue
            p=os.path.join(d,fn)
            raw=open(p,encoding='utf8',errors='replace').read()
            if historical(raw): n_skipped_historical+=1; continue
            n_files+=1
            for ln in raw.split('\n'):
                for m in re.finditer(r'\]\(([^)#\s]+\.md)\)', ln):
                    t=m.group(1)
                    if t.startswith('http'): continue
                    n_links+=1
                    if os.path.exists(os.path.normpath(os.path.join(d,t))): continue
                    n_dangling+=1
                    b=os.path.basename(t)
                    if b in GENERIC or b in names_repo or b in names_arch:
                        n_resolvable+=1; continue
                    kb=key(b)
                    # BEST match, not FIRST. Taking the first substring hit made
                    # `20260227-dry-one-shot-architecture-v1.02A.md` resolve to
                    # `ARCHITECTURE.md` — a generic file that merely contains the
                    # word — when the real successor is the same document at
                    # v1.04A. A wrong rename target is worse than a dangling
                    # link: the reader follows it and believes they arrived.
                    best=None; best_score=0.0
                    for n in all_names:
                        kn=key(n)
                        if not kb or not kn: continue
                        score=difflib.SequenceMatcher(None, kb, kn).ratio()
                        # A SHARED DATE IS NOT A SHARED IDENTITY. Weighting the
                        # 8-digit stamp on its own paired every two documents
                        # written the same day:
                        #   20260424-env-var-audit-matrix   -> …-contributing-rules
                        #   20260504-bsuite-tech-stack-align -> …-documentation-hub
                        #   20260425-operator-handoff        -> …-cross-app-e2e-runbook
                        # all different documents, all same date. The bonus now
                        # applies only when the REST of the name is already a
                        # decent match, so it breaks ties instead of creating them.
                        if kb[:8].isdigit() and kn[:8] == kb[:8]:
                            rest = difflib.SequenceMatcher(None, kb[8:], kn[8:]).ratio()
                            if rest >= 0.6: score += 0.15
                        if score > best_score: best_score, best = score, n
                    cand = best if best_score >= 0.86 else None
                    # WHEN THE ONLY DIFFERENCE IS THE VERSION, take the highest
                    # one that is IN THE REPO. String distance ties between
                    # v1.00A and v1.04A for a link naming v1.02A, and the tie
                    # was being broken by iteration order — which sent readers
                    # to an ARCHIVED v1.00A while the live document is v1.04A.
                    # Pointing at a superseded copy is its own defect.
                    stem = re.sub(r'-v\d+\.\d+[A-Z]?\.md$', '', b)
                    if cand and stem != b:
                        same = [n for n in names_repo
                                if re.sub(r'-v\d+\.\d+[A-Z]?\.md$', '', n) == stem]
                        if same:
                            def ver(n):
                                m = re.search(r'-v(\d+)\.(\d+)', n)
                                return (int(m.group(1)), int(m.group(2))) if m else (0, 0)
                            cand = max(same, key=ver)
                    if cand:
                        found.setdefault((os.path.relpath(p,ROOT), b, cand), 0)
                        found[(os.path.relpath(p,ROOT), b, cand)] += 1
# Denominator FIRST, so a reader sees what was looked at before what was found.
print(
    f'check-docs-renamed-links: {n_files} live markdown file(s) examined across '
    f'{len(docdirs)} docs tree(s) ({n_skipped_historical} skipped as historical), '
    f'{n_links} relative .md link(s) resolved against an index of {len(all_names)} '
    f'known filename(s) — {n_dangling} dangling, of which {n_resolvable} name a file '
    f'that does exist elsewhere, leaving {len(found)} rename candidate(s).'
)
if n_files == 0 or n_links == 0:
    print('::error::Scanned zero files or zero links. A check that examined nothing '
          'must not report a clean pass.')
    raise SystemExit(2)
print(f'RENAMED-LINK candidates (dangling, but a close filename exists): {len(found)} distinct')
byfile={}
for (f,b,c),n in found.items(): byfile.setdefault(f,[]).append((b,c,n))
for f,items in sorted(byfile.items(), key=lambda kv:-len(kv[1]))[:12]:
    print(f'\n### {f}  ({len(items)})')
    for b,c,n in items[:4]: print(f'  {b[:46]:48} -> {c[:50]}  x{n}')
