#!/usr/bin/env python3
"""Near-pure endpoint gate — parses the OKLCH lightness component.

WHY THIS EXISTS, AND WHY C1 COULD NOT DO IT
-------------------------------------------
`scripts/audit-d2c-theme.sh` class C1 is a string matcher. Its OKLCH arm is
literally `oklch\\(\\s*1(\\.0+)?\\s+0\\s+0` — it recognises the TEXT of pure
white, not the COLOUR. So `oklch(0.994 0.002 260)` sails through it while
rendering, to any eye and to the operator's own DevTools readout, as pure
white. That is not a hypothetical: the panel surface shipped at 0.994 for
weeks, the audit was green the whole time, and the operator looked at a
rendered page and said "pure white displayed, which is forbidden".
`packages/theme/src/css/vars.css` records the episode in full at the
`--light-bg-accent` declaration, and ends with the sentence this file is the
answer to:

    "A colour rule enforced by string match will keep accepting values like
     that."

So this gate does not match text. It PARSES the lightness component and
compares it as a number. A value is a violation when it is close enough to an
endpoint that no eye can separate it from the endpoint — regardless of how it
happens to be spelled.

THE THRESHOLDS, AND WHERE THEY COME FROM
----------------------------------------
Both are derived from the contract, not chosen for feel.

  MAX_L = 0.985
    The lightest colour the D2C contract defines is `--white`, the near-white
    #f8f9fa, at L 0.982. The lightest SURFACE is `--role-bg-panel` at 0.98.
    `--bg-shell-sidebar` and `--bg-footer` sit at 0.984. 0.985 clears every
    one of them and still catches 0.99 and up.

    The operator's own reasoning fixes the line: 0.994 is 0.6 lightness points
    off pure white, "below any perceptual threshold, so the panel still READ as
    white even though it no longer WAS white", while 0.98 is 2.0 points below
    and "reads as a raised surface". 0.985 is 1.5 points off white — inside the
    band the contract already treats as indistinguishable.

  MIN_L = 0.060
    `--black` is the near-black #0a0e1a at L 0.166, and the deepest surface
    actually in use is the dark hero at 0.09. A floor of 0.06 leaves that
    alone and catches the values that are black with a rounding error on them.
    It is deliberately looser than the white side because nothing in the tree
    currently sits between 0.06 and 0, so the gate starts at zero on that arm
    rather than importing a backlog it was not built to describe.

WHAT IT DOES NOT COUNT, AND WHY EACH ONE MATTERS
------------------------------------------------
  · COMMENTS. Every one of them, block and line, using the same two-pass
    comment mask as `audit-palette-whitelist.py`. C1's permanent floor of ~7 is
    entirely comment prose — sentences like "was oklch(1 0 0) — pure white"
    tripping the regex that the value would. That floor is exactly what forced
    C1 to be a ratchet instead of a hard zero, and it is why this repository
    now has a documented rule that a comment must DESCRIBE a banned value and
    never spell it. A parser has no excuse for repeating that mistake: a
    sentence about a colour is documentation, not paint.

  · RELATIVE COLOUR SYNTAX. `oklch(from var(--x) l c h)` resolves through a
    token; its lightness is whatever the token says, and reading `l` as a
    number would be nonsense.

  · `var(--token)` in the lightness slot, for the same reason.

  · `theme-audit-ok: <reason>` on the line or the line above — the estate's
    existing marker, same spelling, same two-line convention, so there is one
    opt-out to learn and not two. The reason is not optional.

  · The NAMING exception paths from `audit-d2c-theme.sh`: files whose job is to
    contain a colour as DATA (the colour rule's own source, tests asserting the
    ban, colour pickers and converters). Note this is the NAMING list only. The
    FORMAT list — PDF, email, manifests — is deliberately NOT honoured: no
    rendering engine has ever required a value 0.6 points off white, so format
    latitude cannot license one. That split is the same one that surfaced 17
    pure whites sitting in crm7's PDF renderers under a blanket exemption.

Usage:
  scripts/audit-oklch-lightness.py                 # report, exit 1 if any
  scripts/audit-oklch-lightness.py --count         # bare number, always exit 0
  scripts/audit-oklch-lightness.py --histogram     # the distribution, for
                                                   # re-deriving the thresholds
  scripts/audit-oklch-lightness.py --max-l 0.99    # override, for testing
Exit: 0 clean, 1 violations, 2 bad arguments.
"""
import argparse
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Same roster as audit-d2c-theme.sh. Kept in the same order so the two reports
# can be read side by side.
APPS = ['crm7', 'conduit', 'business-suite-unified', 'R80.4', 'throughput',
        'packages', 'braden']

# Defaults documented in the module docstring above.
MAX_L = 0.985
MIN_L = 0.060

# Mirrors audit-d2c-theme.sh's EXCLUDE list. `.vercel/output/static/assets/`
# alone contributed ~1175 phantom matches to crm7's first C1 count; a compiled
# bundle is not authored source and must never reach a compliance number.
# `worktrees`/`.claude` matter just as much: 1.3GB of stale agent checkouts
# made crm7's C1 read 290 straight after a change that only REMOVED colours.
SKIP_DIRS = {
    'node_modules', 'dist', 'build', '.next', 'out', 'coverage', '.turbo',
    'storybook-static', '.git', '.vercel', '.output', '.cache', '.svelte-kit',
    'public', '.claude', 'worktrees', '.superpowers', 'playwright-report',
    'test-results', '__snapshots__', 'eslint-rules',
}
SKIP_SUFFIX = ('.map', '.min.css', '.min.js', '.d.ts')
SCAN_SUFFIX = ('.css', '.scss', '.ts', '.tsx', '.js', '.jsx', '.html', '.vue')

MARKER = 'theme-audit-ok'

# audit-d2c-theme.sh's NAMING_EXCEPTION_RE, verbatim. See the docstring for why
# the FORMAT list is not here.
NAMING_EXCEPTION_RE = re.compile(
    r'(packages/eslint-config/rules/|__tests__|\.test\.|\.spec\.|Branding|'
    r'branding|OklchColorPicker|color-convert|/charts?/|chart\.tsx)')

# The lightness slot only. Anything that is not a bare number or percentage —
# `from`, `var(`, `calc(` — fails to match and is therefore skipped, which is
# the intended behaviour for all three.
OKLCH_L = re.compile(r'oklch\(\s*(\d*\.?\d+)(%?)\s', re.I)

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from theme_audit_lib import code_lines  # noqa: E402


def lightness(raw: str, pct: str) -> float:
    return round(float(raw) / 100, 5) if pct else round(float(raw), 5)


def scan_files(root: pathlib.Path):
    for app in APPS:
        base = root / app
        if not base.is_dir():
            continue
        # `dirpath`, NOT `root` — os.walk's loop variable would shadow the
        # parameter and every app after the first would be resolved against a
        # leftover directory string. The self-test caught it on its first run.
        for dirpath, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fn in files:
                if fn.endswith(SKIP_SUFFIX) or not fn.endswith(SCAN_SUFFIX):
                    continue
                yield app, pathlib.Path(dirpath) / fn


def collect(root: pathlib.Path):
    """Every parsed lightness in authored, non-comment, non-exempt source."""
    found = []
    for app, path in scan_files(root):
        rel = path.relative_to(root).as_posix()
        if NAMING_EXCEPTION_RE.search(rel):
            continue
        try:
            text = path.read_text(errors='ignore')
        except OSError:
            continue
        if 'oklch(' not in text.lower():
            continue
        raws = text.splitlines()
        code = code_lines(text)
        prev = ''
        for n, raw in enumerate(raws, 1):
            # The marker is read from the RAW line, not the blanked one — it
            # lives in a comment by construction, so a code-only view cannot
            # see it.
            if MARKER in raw or MARKER in prev:
                prev = raw
                continue
            for num, pct in OKLCH_L.findall(code[n - 1]):
                found.append((app, rel, n, lightness(num, pct), raw.strip()))
            prev = raw
    return found


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument('--count', action='store_true')
    ap.add_argument('--histogram', action='store_true')
    ap.add_argument('--max-l', type=float, default=MAX_L)
    ap.add_argument('--min-l', type=float, default=MIN_L)
    # Exists so scripts/test-theme-audit-gates.sh can point the scanner at a
    # throwaway tree. A guard that has never been observed failing is not known
    # to work, and proving it on the real estate would mean writing a fixture
    # into a submodule checkout.
    ap.add_argument('--root', default=None)
    args = ap.parse_args()

    root = pathlib.Path(args.root).resolve() if args.root else ROOT
    found = collect(root)

    if args.histogram:
        highs = sorted({f[3] for f in found}, reverse=True)[:16]
        lows = sorted({f[3] for f in found})[:16]
        print(f'{len(found)} parsed oklch() lightness values in authored source')
        print(f'  16 highest: {highs}')
        print(f'  16 lowest:  {lows}')
        print(f'\n  thresholds in force: L > {args.max_l} or L < {args.min_l}')
        return 0

    viol = [f for f in found if f[3] > args.max_l or f[3] < args.min_l]

    if args.count:
        print(len(viol))
        return 0

    # The denominator is printed on a clean pass DELIBERATELY, and with a noun
    # scripts/check-guard-self-reporting.mjs recognises. LANE-WATCHER exists
    # because this estate keeps shipping guards that exit 0 having examined
    # nothing — an uninitialised submodule is an empty directory and passes
    # `[ -d ]` — so "0 violations" is only meaningful next to how many colour
    # literals were actually read.
    print(f'Near-pure endpoint scan — parsed OKLCH lightness')
    print(f'  fail when L > {args.max_l} (near white) or L < {args.min_l} (near black)')
    print(f'  {len(found)} oklch colour literals parsed in authored source '
          f'across {len(APPS)} roots')
    print(f'  {len(viol)} violations\n')

    per_app = {}
    for app, rel, n, l, line in viol:
        per_app.setdefault(app, []).append((rel, n, l, line))
    for app in APPS:
        if app in per_app:
            print(f'  {app}: {len(per_app[app])}')
            for rel, n, l, line in per_app[app]:
                print(f'      {rel}:{n}  L={l}')
                print(f'          {line[:120]}')
    if viol:
        print('\nA near-pure value is banned in EVERY role, exactly as a pure one is.')
        print('Bind to a token instead of writing a fresh literal:')
        print('  panel / card surface   -> var(--role-bg-panel)     L 0.98')
        print('  shell chrome near-white-> var(--white)             L 0.982  (#f8f9fa)')
        print('  near-black             -> var(--black)             L 0.166  (#0a0e1a)')
        print('  the same with alpha    -> color-mix(in oklch, var(--role-bg-panel) 96%, transparent)')
        print('')
        print('If the value is genuinely correct, annotate it with')
        print("'theme-audit-ok: <reason>' on that line or the line above.")
    return 1 if viol else 0


if __name__ == '__main__':
    raise SystemExit(main())
