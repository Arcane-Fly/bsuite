#!/usr/bin/env bash
# Phase 5 CI: verify no hex literals survived into built CSS bundles.
# Run after `pnpm build` in each app.
# Exits 1 if any hex found (fails CI).
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

for app in "${APPS[@]}"; do
  DIST="$REPO_ROOT/$app/dist"
  if [ ! -d "$DIST" ]; then
    echo "⚠️  $app/dist not found — skipping (run pnpm build first)"
    continue
  fi

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

exit $FAIL
