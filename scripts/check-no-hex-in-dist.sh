#!/usr/bin/env bash
# Verify no BSuite-authored hex literals survived into built CSS bundles.
#
# WIRING STATUS: a MANUAL post-build tool. No workflow invokes it, deliberately — the
# parent has no job that builds the apps (build-and-test.yml runs static checks only),
# and adding five Vite builds to gate a warn-level check that `bsuite/no-hardcoded-colours`
# already catches at source is out of proportion. Source is the gate; this is the
# leak detector you run by hand when a hex reaches a bundle anyway. Tracked: bsuite#228.
#
# It previously SKIPPED any app with no dist/ and still exited 0, so running it on an
# unbuilt tree printed five warnings and reported success — a pass over nothing, the
# same class the empty-tree guard exists to kill. It now refuses when it measured
# nothing, and states the count it did measure.
#
# Exits 1 if any hex found, 2 if it measured nothing.
#
# Usage:
#   bash scripts/check-no-hex-in-dist.sh
#
# Prerequisites:
#   chmod +x scripts/check-no-hex-in-dist.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APPS=(business-suite-unified crm7 R80.4 conduit throughput)
FAIL=0
MEASURED=0

for app in "${APPS[@]}"; do
  DIST="$REPO_ROOT/$app/dist"
  if [ ! -d "$DIST" ]; then
    echo "⚠️  $app/dist not found — skipping (run pnpm build first)"
    continue
  fi
  MEASURED=$((MEASURED + 1))

  # WHAT THIS GATE IS FOR, and what it kept flagging instead.
  #
  # The rule is "no BSuite-authored hex in built CSS". The estate's own doctrine says
  # in terms: "Hex/rgb only acceptable for THIRD-PARTY COMPONENT DEFAULTS or legacy
  # compatibility tokens." This gate was flagging exactly those, so it has been red on
  # every app with a graph or a canvas:
  #
  #   .react-flow{--xy-edge-stroke-default:#b1b1b7;...}   @xyflow/react's own CSS
  #   .react-grid-layout{...}                             react-grid-layout's own CSS
  #   @layer properties{@supports ...}                    Tailwind's generated fallback
  #
  # None of those are ours to change. A gate that polices what its own doctrine
  # exempts cannot pass, and a gate that cannot pass gets routed around -- taking its
  # real coverage with it.
  #
  # Excluded by SELECTOR NAMESPACE and by Tailwind's generated construct, not by
  # filename, because chunk names are content-hashed and rename themselves.
  VENDOR_SELECTORS='\.react-flow|\.react-grid-layout|\.xy-|@layer properties|\.monaco-|\.cm-|\.tippy-'

  # `|| true` on the pipeline: under `set -euo pipefail` a grep that matches NOTHING
  # exits 1, and finding nothing is the SUCCESS case here. Without it the script dies
  # silently the moment an app is clean -- exit 1, no output, indistinguishable from a
  # real failure. It only surfaced when the vendor exclusion made an app clean for the
  # first time.
  HITS=$( { grep -rE '#[0-9a-fA-F]{6}\b' "$DIST" --include="*.css" \
    | grep -v '@bsuite/theme' \
    | grep -v 'node_modules' \
    | grep -vE "$VENDOR_SELECTORS" \
    | wc -l; } || true )
  HITS=${HITS:-0}

  if [ "$HITS" -gt 0 ]; then
    echo "❌ $app: $HITS hex literal(s) found in dist/:"
    grep -rEn '#[0-9a-fA-F]{6}\b' "$DIST" --include="*.css" \
      | grep -v '@bsuite/theme' | grep -v 'node_modules' \
      | grep -vE "$VENDOR_SELECTORS" | head -10
    FAIL=1
  else
    echo "✅ $app: no hex literals in dist/"
  fi
done

# A gate that cannot tell "checked nothing" from "found nothing" is not a gate.
if [ "$MEASURED" -eq 0 ]; then
  echo "check-no-hex-in-dist: REFUSING — 0 of ${#APPS[@]} apps had a dist/ to read." >&2
  echo "  Every app was skipped, so this run measured nothing. Build first:" >&2
  echo "    pnpm --filter <app> build   # then re-run" >&2
  exit 2
fi

echo "check-no-hex-in-dist: measured $MEASURED of ${#APPS[@]} app bundle(s)."
exit $FAIL
