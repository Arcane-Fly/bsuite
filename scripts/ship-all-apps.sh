#!/usr/bin/env bash
# Deploy all 6 BSuite apps to Vercel production.
#
# Requirements (local use):
#   npm i -g vercel && vercel login
#   Each submodule must be linked: cd <app> && vercel link
#
# Requirements (CI / cron-agent use):
#   Set VERCEL_TOKEN secret in repo settings.
#   Trigger via: gh workflow run ship-all-apps.yml -R GaryOcean428/bsuite
#   Or via GitHub API:
#     POST /repos/GaryOcean428/bsuite/actions/workflows/ship-all-apps.yml/dispatches
#     {"ref":"main","inputs":{"dry_run":"false"}}
#
# Usage:
#   ./scripts/ship-all-apps.sh            # deploy all apps to production
#   ./scripts/ship-all-apps.sh --dry-run  # log only, no actual deploys

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/." && pwd)"
DRY_RUN="${1:-}"

APPS=(crm7 business-suite-unified conduit braden R80.3 throughput)
FAILED=()
DEPLOYED=()

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

echo "BSuite ship-all-apps — $(ts)"
[[ "$DRY_RUN" == "--dry-run" ]] && echo "Mode: DRY RUN"
echo ""

for app in "${APPS[@]}"; do
  dir="$REPO_ROOT/$app"
  echo "[$app]"

  if [[ ! -d "$dir" ]]; then
    echo "  SKIP — directory $app not found"
    FAILED+=("$app:missing-dir")
    continue
  fi

  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "  DRY-RUN — would: cd $app && vercel deploy --prod --yes"
    DEPLOYED+=("$app:dry-run")
    continue
  fi

  if (cd "$dir" && vercel deploy --prod --yes 2>&1); then
    echo "  OK — deployed to production"
    DEPLOYED+=("$app")
  else
    echo "  FAIL — see output above"
    FAILED+=("$app:deploy-error")
  fi
  echo ""
done

echo ""
echo "=== Summary $(ts) ==="
echo "Deployed (${#DEPLOYED[@]}): ${DEPLOYED[*]:-none}"
echo "Failed   (${#FAILED[@]}):   ${FAILED[*]:-none}"

[[ ${#FAILED[@]} -gt 0 ]] && exit 1
exit 0
