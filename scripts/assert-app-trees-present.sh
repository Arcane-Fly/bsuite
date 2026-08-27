#!/usr/bin/env bash
# REFUSE TO SCAN AN EMPTY TREE — the shared guard.
#
# Every static gate in this estate reads the six app directories. If the submodules
# did not check out, they scan nothing, find nothing and exit 0. **An empty tree is
# indistinguishable from a clean one to a grep**, so the run reports a pass over
# zero coverage.
#
# It is not hypothetical. The submodules are PRIVATE: `actions/checkout` with the
# default GITHUB_TOKEN gets "Repository not found" — a 404, not a permission error.
# On 2026-08-28 that aborted a new workflow outright, which is the lucky case. Had it
# half-succeeded, three green gates would have measured nothing.
# `theme-conformance.yml` already carried this guard inline with the note "a false
# pass, which is worse than a failure"; this is that lesson extracted so the other
# workflows can use it instead of each rediscovering it.
#
# Usage:  scripts/assert-app-trees-present.sh [app ...]
#         defaults to all six.
set -uo pipefail
cd "$(dirname "$0")/.."

apps=("$@")
[ ${#apps[@]} -eq 0 ] && apps=(crm7 conduit business-suite-unified R80.4 throughput braden)

missing=""
for app in "${apps[@]}"; do
  [ -d "$app/src" ] || [ -d "$app/docs" ] || missing="$missing $app"
done

if [ -n "$missing" ]; then
  echo "::error::app tree(s) did not check out:$missing" >&2
  echo "  Every static gate here reads those directories; over an empty tree they all pass." >&2
  echo "  The submodules are private — set BSUITE_CROSS_REPO_PAT (repo: read on each app)" >&2
  echo "  on the checkout step, or this run measures nothing and calls it clean." >&2
  exit 1
fi

echo "assert-app-trees-present: ${#apps[@]} app tree(s) present."
