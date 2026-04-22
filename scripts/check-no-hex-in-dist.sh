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

APPS=(business-suite-unified crm7 R80.3 conduit throughput)
FAIL=0

for app in "${APPS[@]}"; do
  DIST="$REPO_ROOT/$app/dist"
  if [ ! -d "$DIST" ]; then
    echo "⚠️  $app/dist not found — skipping (run pnpm build first)"
    continue
  fi

  # Allow hex only inside the @bsuite/theme fallback table comment blocks
  HITS=$(grep -rE '#[0-9a-fA-F]{6}\b' "$DIST" --include="*.css" \
    | grep -v '@bsuite/theme' \
    | grep -v 'node_modules' \
    | wc -l)

  if [ "$HITS" -gt 0 ]; then
    echo "❌ $app: $HITS hex literal(s) found in dist/:"
    grep -rEn '#[0-9a-fA-F]{6}\b' "$DIST" --include="*.css" \
      | grep -v '@bsuite/theme' | head -10
    FAIL=1
  else
    echo "✅ $app: no hex literals in dist/"
  fi
done

exit $FAIL
