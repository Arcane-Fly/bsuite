#!/usr/bin/env bash
# A FILL TOKEN USED AS TEXT — ratcheted, because the backlog is 176 sites.
#
# `text-(--color-<role>)` names the FILL colour. The estate has a separate
# `--color-<role>-text` for type, and vars.css says why in its own words:
# "A saturated fill colour is not a legible text colour; these are the text
# variants and are the ONLY correct token for coloured type."
#
# MEASURED 2026-08-28, worst of the five surface roles, floor 4.5:1:
#
#   light        fill-as-text          the -text token would give
#     warning        1.59  FAIL            5.08
#     accent         1.64  FAIL            5.24
#     info           1.64  FAIL            5.22
#     success        2.98  FAIL            5.71
#     error          4.02  FAIL            6.38
#     primary        4.31  FAIL            6.01
#     secondary      8.66  pass            6.49
#   dark
#     primary        3.18  FAIL            5.99
#     error          3.41  FAIL            5.98
#     secondary      1.58  FAIL            6.78
#     accent/success/warning/info  pass
#
# Six of seven roles fail in light, three of seven in dark, and in EVERY case the
# `-text` token passes comfortably. The fix is mechanical —
# `text-(--color-error)` becomes `text-error-text` — but there are 176 sites across
# six repos and some sit on washes where the composite must be re-checked, so this
# is a RATCHET rather than a ban: the count may FALL, never rise.
#
# Found via the JodieAI mode-selector chips, where the SELECTED state's label
# measured 1.70:1 in light mode. Those are <button>s and the colour carries state,
# so it is not decorative.
#
# When the count reaches zero, replace this with a ban like
# scripts/check-dimmed-text-tokens.sh.
set -uo pipefail
cd "$(dirname "$0")/.."

BASELINE_FILE=scripts/.fill-token-as-text-baseline
APPS=(crm7 conduit business-suite-unified R80.4 throughput braden packages)
INC=(--include='*.tsx' --include='*.ts' --include='*.jsx')
EXCLUDE=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
         --exclude-dir=.next --exclude-dir=.vercel --exclude-dir=.git
         --exclude-dir=.claude --exclude-dir=worktrees --exclude-dir=coverage)

PATTERN='text-\(--color-(primary|accent|success|warning|error|info|secondary)\)'

# Refuse to measure an empty tree: over absent submodules this counts 0 and passes.
missing=""
for app in crm7 conduit business-suite-unified R80.4 throughput braden; do
  [ -d "$app/src" ] || missing="$missing $app"
done
if [ -n "$missing" ]; then
  echo "::error::app tree(s) absent:$missing — a count over an empty tree is not a pass." >&2
  exit 1
fi

now=$(grep -rEoh "$PATTERN" "${APPS[@]}" "${INC[@]}" "${EXCLUDE[@]}" 2>/dev/null | grep -c . || true)
base=$(cat "$BASELINE_FILE" 2>/dev/null || echo "")

if [ -z "$base" ]; then
  echo "no baseline yet — write $now to $BASELINE_FILE to arm the ratchet" >&2
  exit 1
fi

if [ "$now" -gt "$base" ]; then
  echo "::error::fill-token-as-text ROSE $base -> $now. A fill colour is not a legible text colour;" >&2
  echo "  use --color-<role>-text. Six of seven roles fail 4.5:1 in light mode as fills." >&2
  exit 1
fi

if [ "$now" -lt "$base" ]; then
  echo "fill-token-as-text FELL $base -> $now. Bank it:  echo $now > $BASELINE_FILE" >&2
  echo "  A baseline above the true count re-permits the debt you just paid off." >&2
  exit 1
fi

echo "check-fill-token-as-text: ratchet ok — baseline $base, now $now."
