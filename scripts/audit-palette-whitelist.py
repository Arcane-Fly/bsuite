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

BLOCK_COMMENT = re.compile(r'/\*.*?\*/', re.S)
LINE_COMMENT = re.compile(r'(^\s*\*|//).*$', re.M)


def comment_mask(text: str) -> set:
    """1-indexed line numbers that lie inside a /* ... */ block.

    Stripping comments line-by-line only works for one-liners. A block comment
    spanning several lines has middle lines that carry no delimiter at all, so
    a per-line strip leaves them looking like code — and vars.css documents the
    values it REMOVED, so those middle lines are full of the exact literals
    this gate is looking for. Measured per file, once.
    """
    inside, out, depth = set(), set(), 0
    for n, line in enumerate(text.splitlines(), 1):
        opens, closes = line.count('/*'), line.count('*/')
        if depth:
            inside.add(n)
        elif opens and not (closes and line.rindex('*/') > line.index('/*')):
            inside.add(n)
        depth += opens - closes
        if depth < 0:
            depth = 0
    out |= inside
    return out

MARKER = 'theme-audit-ok'
SKIP_DIRS = {'node_modules', 'dist', 'build', '.git', 'coverage', '__snapshots__', 'docs'}
SKIP_SUFFIX = ('.map', '.min.css', '.min.js', '.d.ts', '.html')
SCAN_SUFFIX = ('.css', '.ts', '.tsx', '.js', '.jsx')


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


def strip_comments(text: str) -> str:
    return LINE_COMMENT.sub('', BLOCK_COMMENT.sub('', text))


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

    viol: dict[str, list] = {}
    for root, dirs, files in os.walk(ROOT / 'packages'):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn.endswith(SKIP_SUFFIX) or not fn.endswith(SCAN_SUFFIX):
                continue
            path = pathlib.Path(root) / fn
            rel = path.relative_to(ROOT).as_posix()
            try:
                text = path.read_text(errors='ignore')
            except OSError:
                continue
            lines = text.splitlines()
            in_block = comment_mask(text)
            prev = ''
            for n, raw in enumerate(lines, 1):
                if MARKER in raw or MARKER in prev or n in in_block:
                    prev = raw
                    continue
                line = strip_comments(raw)
                for a, b, c in OKLCH.findall(line):
                    t = (norm_num(a), norm_num(b), norm_num(c))
                    if t not in allowed_ok:
                        viol.setdefault(rel, []).append((n, 'oklch(%s %s %s)' % t))
                for h in hexes(line):
                    if len(h) in HEX_LENGTHS and norm_hex(h) not in allowed_hex:
                        viol.setdefault(rel, []).append((n, '#' + h))
                prev = raw

    total = sum(len(v) for v in viol.values())
    print(f'Permitted palette: {len(allowed_ok)} oklch + {len(allowed_hex)} hex '
          f'(from the two source-of-truth documents)')
    print(f'Off-palette colour literals in packages/: {total}\n')
    for rel in sorted(viol):
        print(f'  {rel}')
        for n, c in viol[rel][:12]:
            print(f'      {n}: {c}')
        if len(viol[rel]) > 12:
            print(f'      ... and {len(viol[rel]) - 12} more')
    return 1 if total else 0


if __name__ == '__main__':
    raise SystemExit(main())
