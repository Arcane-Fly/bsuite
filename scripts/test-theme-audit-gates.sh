#!/usr/bin/env bash
# Positive control for the near-pure endpoint gate.
#
# WHY THIS FILE EXISTS
# The gate it tests replaces a string matcher that was green for weeks over a
# panel surface the operator could see was white. The lesson recorded in
# packages/theme/src/css/vars.css is that a colour rule enforced by string match
# will keep accepting values like that — and the lesson this file adds is that a
# guard nobody has ever watched FAIL is not known to work either. A scanner that
# silently matches nothing reports the same "0" as a clean tree.
#
# So every case below is a fixture the gate must react to in a specific way, run
# against a throwaway tree via --root so nothing is written into a submodule
# checkout.
#
# CASE 6 IS THE ONE THAT MATTERS MOST. It is a regression test for a bug that
# was live in scripts/audit-palette-whitelist.py: comment depth was COUNTED per
# line, block comments were assumed to nest, and a Tailwind opacity wildcard
# written inside comment prose (`bg-overlay/*`) pinned the depth above zero for
# the rest of the file. Everything after it became invisible. In
# crm7/src/styles/theme.css that was 595 of 660 lines, and the two tokens this
# whole change exists to remove sat inside the blind spot. The gate reported
# them clean. If case 6 ever passes again, the scanner has gone blind again.
#
# Usage: scripts/test-theme-audit-gates.sh
set -uo pipefail
cd "$(dirname "$0")/.."
SCANNER="$PWD/scripts/audit-oklch-lightness.py"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/crm7/src" "$TMP/packages/theme/src"

fail=0
check() { # $1=label  $2=expected count  $3=expected exit
  local got exit_code
  got=$(python3 "$SCANNER" --root "$TMP" --count)
  python3 "$SCANNER" --root "$TMP" >/dev/null 2>&1
  exit_code=$?
  if [ "$got" != "$2" ] || [ "$exit_code" != "$3" ]; then
    echo "  FAIL  $1 — expected count=$2 exit=$3, got count=$got exit=$exit_code"
    fail=1
  else
    echo "  ok    $1 (count=$got, exit=$exit_code)"
  fi
}

# The count goes FIRST, and it names a noun the classifier recognises.
# LANE-WATCHER (check-guard-self-reporting.mjs) fails any registered guard that
# "exited 0 but never stated a non-zero count of anything examined", and it
# classifies from the HEAD of the output — a summary printed only at the end is
# truncated away. Per-line "(count=N)" markers are the gate's HIT count, not a
# count of cases exercised, so they do not satisfy it either.
echo "Near-pure gate — positive control: 10 cases exercised (clean-silent, 0.994, 99.4%, near-black, suppression-comment, prose-adjacent, prose-only, oklch(from …), dist/node_modules exclusion, restore-to-silent)."

# ── 1. A clean tree must be silent and exit 0. If this fails, every other
#       case below is meaningless: the scanner would be reporting a constant.
cat > "$TMP/crm7/src/clean.css" <<'CSS'
:root {
  --a: oklch(0.982 0.002 247.8);   /* --white, the contract near-white */
  --b: oklch(0.98 0.006 260);      /* --role-bg-panel */
  --c: oklch(0.985 0.003 250);     /* exactly ON the threshold — must pass */
  --d: oklch(0.166 0.026 269.4);   /* --black */
  --e: color-mix(in oklch, var(--role-bg-panel) 96%, transparent);
}
CSS
check "clean tree is silent" 0 0

# ── 2. THE CASE C1 CANNOT SEE. oklch(0.994) contains no pure-white substring,
#       so the shipped string matcher walks straight past it. This is the whole
#       reason the lane exists.
cat > "$TMP/crm7/src/near_white.css" <<'CSS'
:root { --bg-shell-elevated: oklch(0.994 0.002 260 / 0.96); }
CSS
check "0.994 is caught" 1 1

# ── 3. Percentage form. Same colour, different spelling. A matcher keyed to
#       decimals would miss it; a parser must not.
cat > "$TMP/crm7/src/pct.css" <<'CSS'
:root { --x: oklch(99.4% 0.002 260); }
CSS
check "99.4% is the same colour" 2 1

# ── 4. The near-black arm.
cat > "$TMP/crm7/src/near_black.css" <<'CSS'
:root { --y: oklch(0.02 0.004 260); }
CSS
check "near-black is caught" 3 1

# ── 5. The documented opt-out, on the line and on the line above. Both forms,
#       because a value inside a string literal cannot carry a trailing comment.
cat > "$TMP/packages/theme/src/annotated.css" <<'CSS'
@media (prefers-contrast: high) {
  --hc: oklch(0.999 0 0); /* theme-audit-ok: the user asked their OS for maximum contrast */
}
/* theme-audit-ok: mask stop — the channel is opacity, not paint */
.mask { mask-image: linear-gradient(oklch(0.998 0 0), transparent); }
CSS
check "theme-audit-ok suppresses both forms" 3 1

# ── 6. THE BLIND-SPOT REGRESSION TEST. `bg-overlay/*` is a Tailwind opacity
#       wildcard written in English inside a comment. Under the old per-line
#       depth count it opened a comment that never closed, and the declaration
#       below it — a live 0.994 — became invisible. It must be caught.
cat > "$TMP/crm7/src/poison.css" <<'CSS'
/* The scrim (--color-overlay, bg-overlay/*) used on photo captions.
   A second line of prose, still inside the same comment. */
:root {
  --after-the-poison-pill: oklch(0.994 0.002 260 / 0.96);
}
CSS
check "value after 'bg-overlay/*' prose is still visible" 4 1

# ── 7. Comments themselves are never counted. C1's permanent floor of 7 is
#       entirely prose tripping its own regex, and that floor is the reason it
#       had to be a ratchet instead of a hard zero. A parser has no excuse.
cat > "$TMP/crm7/src/prose.css" <<'CSS'
/* This used to read oklch(0.994 0.002 260) and it was wrong.
   Do not write oklch(0.999 0 0) either. */
:root { --ok: oklch(0.98 0.006 260); } /* not oklch(0.995 0 0) */
CSS
check "prose describing a banned value is not a violation" 4 1

# ── 8. Relative colour syntax resolves through a token; its `l` is not a
#       number and reading it as one would be nonsense.
cat > "$TMP/crm7/src/relative.css" <<'CSS'
:root { --z: oklch(from var(--role-bg-panel) l c h / 0.9); }
CSS
check "oklch(from …) is skipped" 4 1

# ── 9. Build output must never reach a compliance number. crm7's first C1 count
#       carried ~1175 phantom matches from .vercel/output alone.
mkdir -p "$TMP/crm7/dist" "$TMP/crm7/node_modules/pkg"
echo ':root{--q:oklch(0.998 0 0)}' > "$TMP/crm7/dist/bundle.css"
echo ':root{--q:oklch(0.998 0 0)}' > "$TMP/crm7/node_modules/pkg/style.css"
check "dist/ and node_modules/ are excluded" 4 1

# ── 10. Back to clean. Proves the count is driven by the fixtures and not by
#        some constant the scanner emits regardless.
rm -f "$TMP/crm7/src/near_white.css" "$TMP/crm7/src/pct.css" \
      "$TMP/crm7/src/near_black.css" "$TMP/crm7/src/poison.css"
check "removing the fixtures returns it to silent" 0 0

if [ "$fail" -ne 0 ]; then
  echo "Near-pure gate self-test FAILED — the gate is not measuring what it claims."
  exit 1
fi
echo "Near-pure gate self-test passed."
