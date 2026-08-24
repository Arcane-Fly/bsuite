#!/usr/bin/env python3
"""Palette whitelist — only colours present in the two source-of-truth
documents are permitted in packages/.

Operator ruling 2026-08-03: "only colors in the packages that can be found in
the downloads html bsuite and corporate example files are permitted".

THE TWO DOCUMENTS
  packages/theme/docs/d2c-theme-source-of-truth.html              — D2C Neon Electric
  packages/theme/docs/braden-corporate-theme-source-of-truth.html — Corporate
Both are checked into the repo, so the gate does not depend on anyone's
Downloads folder staying put.

WHY A WHITELIST RATHER THAN ANOTHER BAN
The pure-endpoint ban removed the worst values but could not catch a colour
that is merely INVENTED — a one-off `oklch(0.62 0.19 41)` that nobody chose,
that maps to no token, and that sits a few degrees off-brand forever. A ban
enumerates what is forbidden and never finishes; a whitelist enumerates what
is allowed, and converges.

MATCHING
  · Compared on the BASE triple (L C H), ignoring `/ alpha`: an alpha variant
    of a permitted colour is a derivation, not a new colour.
  · Numeric, not textual — `oklch(0.20 0.020 263)` and `oklch(0.2 0.02 263)`
    are one colour written two ways.
  · `var(--token)` and `oklch(from var(--x) l c h / a)` never match: they
    resolve through a token, which is the outcome this is driving toward.
  · Comments are skipped entirely. A sentence naming a colour is documentation
    OF a value, not the value; rewording prose to satisfy a grep makes the
    documentation worse and the gate no better.
  · Hex must appear in a colour context (quoted, after a CSS `:`, or inside a
    Tailwind arbitrary value). Without that, `PRs #933-#939` and `issue #539`
    read as colours — the first run reported 107 hits, mostly issue numbers.

Usage:  scripts/audit-palette-whitelist.py [--list-allowed]
Exit:   0 clean, 1 violations, 2 a source-of-truth document is missing.
"""
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = [
    ROOT / 'packages/theme/docs/d2c-theme-source-of-truth.html',
    ROOT / 'packages/theme/docs/braden-corporate-theme-source-of-truth.html',
]

OKLCH = re.compile(
    r'oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+)\s*(?:/\s*[0-9.]+%?\s*)?\)', re.I)
HEX = re.compile(
    r'["\'`]#([0-9a-fA-F]{3,8})["\'`]'      # quoted:      '#3b82f6'
    r'|:\s*#([0-9a-fA-F]{3,8})\b'           # declaration: color: #3b82f6
    r'|-\[#([0-9a-fA-F]{3,8})\]'            # tailwind:    bg-[#3b82f6]
    # var() fallback: var(--accent-primary, #3b82f6). Easy to miss because the
    # hex touches a comma rather than a quote or colon — and it is the most
    # dangerous position of the four, because if the token is undefined the
    # "fallback" is simply the value, permanently and invisibly. That is
    # exactly how every card resize handle in page-builder came to be drawn in
    # pure black: it read var(--text-secondary, oklch(0 0 0 / 0.45)) against a
    # token this system never defines.
    r'|,\s*#([0-9a-fA-F]{3,8})\s*\)'
)
HEX_LENGTHS = {3, 4, 6, 8}                  # 4 and 8 are the alpha forms

# Comment handling moved to scripts/theme_audit_lib.py — SEE ITS DOCSTRING.
#
# This file used to carry a `comment_mask()` that counted `/*` and `*/` per
# line and accumulated a depth. Block comments do not nest, so one `/*` written
# inside comment PROSE — `bg-overlay/*`, a Tailwind opacity wildcard — pinned
# the depth above zero for the rest of the file and made every remaining line
# invisible to this gate. It was blind to 62% of packages/theme/src/css/vars.css
# and 100% of packages/eslint-config/rules/no-hardcoded-colours.js.
#
# The corrected pass still measures 0 off-palette literals, so nothing was in
# fact hiding in the blind spot. Nothing was stopping it either, which is the
# whole point of the gate.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from theme_audit_lib import code_lines  # noqa: E402

MARKER = 'theme-audit-ok'
SKIP_DIRS = {'node_modules', 'dist', 'build', '.git', 'coverage', '__snapshots__', 'docs'}
SKIP_SUFFIX = ('.map', '.min.css', '.min.js', '.d.ts', '.html')
# `.mjs` was absent until 2026-08-24, which exempted packages/theme-codemod/migrate.mjs —
# a COLOUR CODEMOD — from the colour gate. `.cjs` joins it for the same reason.
SCAN_SUFFIX = ('.css', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs')


def norm_num(s: str) -> float:
    s = s.strip()
    return round(float(s[:-1]) / 100, 4) if s.endswith('%') else round(float(s), 4)


def norm_hex(h: str) -> str:
    h = h.lower()
    if len(h) in (3, 4):                    # #abc / #abcd -> aabbcc
        h = ''.join(c * 2 for c in h[:3])
    return h[:6]                            # drop the alpha pair


def hexes(text: str):
    """HEX has three alternatives, so each match is a tuple with two empties."""
    return [h for groups in HEX.findall(text) for h in groups if h]


def main() -> int:
    missing = [d for d in DOCS if not d.is_file()]
    if missing:
        for d in missing:
            print(f'MISSING source of truth: {d.relative_to(ROOT)}', file=sys.stderr)
        return 2

    allowed_ok, allowed_hex = set(), set()
    for d in DOCS:
        text = d.read_text(errors='ignore')
        allowed_ok |= {(norm_num(a), norm_num(b), norm_num(c))
                       for a, b, c in OKLCH.findall(text)}
        # The documents ARE the palette, so their hex is read without the
        # colour-context requirement — they are swatch tables, not prose.
        allowed_hex |= {norm_hex(h) for h in re.findall(r'#([0-9a-fA-F]{3,8})\b', text)
                        if len(h) in HEX_LENGTHS}

    if '--list-allowed' in sys.argv:
        print(f'{len(allowed_ok)} oklch + {len(allowed_hex)} hex permitted')
        for t in sorted(allowed_ok):
            print('  oklch(%s %s %s)' % t)
        for h in sorted(allowed_hex):
            print('  #' + h)
        return 0

    # SCAN ROOTS. `mobile/` is a real, non-gitlink directory in THIS repo carrying a
    # "D2C Neon Electric" header and 15 raw oklch literals — including
    # warning: oklch(0.868 0.125 81.4) against the declared --role-warning of
    # oklch(0.728 0.168 22.5). It was never scanned, so that drift sat undetected.
    # Submodule roots are deliberately absent: they are gitlinks and are covered by
    # each app's own gate.
    SCAN_ROOTS = [ROOT / 'packages', ROOT / 'mobile']

    viol: dict[str, list] = {}
    scanned = 0
    for scan_root in SCAN_ROOTS:
        if not scan_root.is_dir():
            continue
        for root, dirs, files in os.walk(scan_root):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fn in files:
                if fn.endswith(SKIP_SUFFIX) or not fn.endswith(SCAN_SUFFIX):
                    continue
                scanned += 1
                path = pathlib.Path(root) / fn
                rel = path.relative_to(ROOT).as_posix()
                try:
                    text = path.read_text(errors='ignore')
                except OSError:
                    continue
                lines = text.splitlines()
                code = code_lines(text)
                prev = ''
                for n, raw in enumerate(lines, 1):
                    # The marker is read from the RAW line: it lives in a comment
                    # by construction, so the code-only view cannot see it.
                    if MARKER in raw or MARKER in prev:
                        prev = raw
                        continue
                    line = code[n - 1]
                    for a, b, c in OKLCH.findall(line):
                        t = (norm_num(a), norm_num(b), norm_num(c))
                        if t not in allowed_ok:
                            viol.setdefault(rel, []).append((n, 'oklch(%s %s %s)' % t))
                    for h in hexes(line):
                        if len(h) in HEX_LENGTHS and norm_hex(h) not in allowed_hex:
                            viol.setdefault(rel, []).append((n, '#' + h))
                    prev = raw

    total = sum(len(v) for v in viol.values())

    # THE DENOMINATOR, AND WHY THIS LINE EXISTS.
    #
    # The old pass line printed "Permitted palette: 223 oklch + 27 hex" — the size of the
    # ALLOWLIST parsed out of the two source-of-truth documents, not a count of anything
    # scanned. It was byte-identical whether the walk covered 583 files or ZERO, which is
    # what made this guard pass vacuously. theme-conformance.yml pays for a full
    # `submodules: recursive` checkout with a cross-repo PAT and this guard read none of it.
    #
    # A scan that examined nothing is "could not check", never "found nothing" (D-92).
    roots = ', '.join(r.name for r in SCAN_ROOTS if r.is_dir())
    print(f'[palette-whitelist] {scanned} file(s) examined across {roots}; '
          f'{total} off-palette colour literal(s).')
    print(f'Permitted palette: {len(allowed_ok)} oklch + {len(allowed_hex)} hex '
          f'(from the two source-of-truth documents)')
    if scanned == 0:
        print('ERROR: 0 files examined. That is "could not check", not a clean bill — '
              'the scan roots resolved to nothing.', file=sys.stderr)
        return 2
    print()
    for rel in sorted(viol):
        print(f'  {rel}  ({len(viol[rel])})')
        for n, c in viol[rel][:12]:
            print(f'      {n}: {c}')
        if len(viol[rel]) > 12:
            print(f'      ... and {len(viol[rel]) - 12} more')

    # RATCHET.
    #
    # Widening the scan to mobile/ surfaced 40 literals that had never been looked at.
    # They are real — mobile/components/ui/Toast.tsx declares oklch(0.0 0.0 0.0), pure
    # black, which is banned outright — but they are also a React Native colour system
    # nobody can re-decide safely in one pass. Failing the world on day one would get the
    # gate switched off, which is how it became vacuous in the first place.
    #
    # So they are BANKED, per file, and the count may only SHRINK. A new file fails, a
    # file that grows fails, and a file that shrinks ALSO fails until the baseline is
    # trimmed — the same "may not grow, or shrink unbanked" convention the hook-suppression
    # ratchet uses, so the number cannot quietly drift in either direction.
    baseline_path = ROOT / 'scripts/palette-whitelist-baseline.json'
    try:
        baseline = json.loads(baseline_path.read_text()).get('ceilings', {})
    except (OSError, ValueError):
        baseline = {}

    if '--write-baseline' in sys.argv:
        baseline_path.write_text(json.dumps({
            '_comment': [
                'Off-palette colour literals that are KNOWN and banked, per file.',
                'The count may only SHRINK. A new file fails; a file that grows fails; and a',
                'file that shrinks fails too, until the ceiling here is lowered to match — so',
                'the number cannot drift quietly in either direction.',
                'Regenerate deliberately with --write-baseline. Never to make a red run green.',
            ],
            'ceilings': {rel: len(v) for rel, v in sorted(viol.items())},
        }, indent=2) + '\n')
        print(f'wrote {baseline_path.relative_to(ROOT)} with {len(viol)} file(s)')
        return 0

    failed = 0
    for rel, v in sorted(viol.items()):
        ceiling = baseline.get(rel)
        if ceiling is None:
            print(f'::error::{rel} has {len(v)} off-palette literal(s) and is not banked. '
                  f'A colour outside the two source-of-truth documents is a new drift.', file=sys.stderr)
            failed += 1
        elif len(v) > ceiling:
            print(f'::error::{rel} has {len(v)} off-palette literal(s), ceiling is {ceiling}. '
                  f'This may not grow.', file=sys.stderr)
            failed += 1
        elif len(v) < ceiling:
            print(f'::error::{rel} is down to {len(v)} from a ceiling of {ceiling} — good. '
                  f'Lower the ceiling in scripts/palette-whitelist-baseline.json so it cannot '
                  f'drift back up.', file=sys.stderr)
            failed += 1
    for rel in baseline:
        if rel not in viol:
            print(f'::error::scripts/palette-whitelist-baseline.json still banks {rel}, which '
                  f'is now clean. Remove the entry — this list may only shrink.', file=sys.stderr)
            failed += 1

    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
