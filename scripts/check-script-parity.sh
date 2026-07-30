#!/usr/bin/env bash
#
# Gate-script parity: the parent and each submodule must run the SAME gate.
#
# Why this exists (bsuite#1710). Three CI gate scripts were maintained as
# independent copies in the parent and in crm7. They drifted for months, and
# the drift was invisible because both copies exited 0 on their own repo. The
# damage was not theoretical:
#
#   * crm7's `drift-scan.mjs` was 683 lines behind the parent's 1174-line
#     restructure — it never received the newer signals at all.
#   * The parent's newer AST-based COOKIE-SSO rule accepted `=` and `.` as
#     assignment context but not `:`, so `storage: cookieStorage,` — the
#     canonical forbidden pattern CLAUDE.md names FIRST — passed the parent's
#     gate while crm7's blunter copy caught it. The more sophisticated copy
#     was the weaker one, and nothing could see that.
#
# So neither copy was a superset. Divergence between two copies of a security
# gate does not announce itself; each side keeps passing, and the union of
# what they miss grows silently. This gate makes divergence loud.
#
# Scope: only scripts BOTH repos actually invoke from CI or package.json. A
# script present in one repo and unwired in the other is a different problem
# (delete it or wire it) and is deliberately not gated here — see the
# UNGATED note at the bottom.
#
# Usage:
#   bash scripts/check-script-parity.sh            # compare, fail on drift
#   bash scripts/check-script-parity.sh --list     # show what is gated
#
# Exit codes: 0 in parity · 1 drift found · 2 harness error (missing file).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# submodule:script — every entry must be invoked by CI/package.json in BOTH
# the parent and the named submodule.
GATED=(
  "crm7:drift-scan.mjs"
  "crm7:dry-free-text-where-fk-lint.sh"
  "crm7:check-migration-fk-indexes.mjs"
  "crm7:dry-lint-exemptions.registry"
)

if [ "${1:-}" = "--list" ]; then
  printf 'Gated for parity (parent <-> submodule):\n'
  for e in "${GATED[@]}"; do printf '  %s\n' "  scripts/${e##*:}  <->  ${e%%:*}/scripts/${e##*:}"; done
  exit 0
fi

drift=0
missing=0

for entry in "${GATED[@]}"; do
  sub="${entry%%:*}"
  script="${entry##*:}"
  a="scripts/$script"
  b="$sub/scripts/$script"

  if [ ! -f "$a" ]; then
    printf '::error::MISSING %s (gated for parity with %s)\n' "$a" "$b"
    missing=1
    continue
  fi
  if [ ! -f "$b" ]; then
    # A submodule that is not checked out is a harness error, not parity drift.
    # Reporting it as "in parity" would be the exact silent-pass this gate exists
    # to prevent.
    printf '::error::MISSING %s — submodule not checked out? Run with submodules.\n' "$b"
    missing=1
    continue
  fi

  if cmp -s "$a" "$b"; then
    printf '  OK    %s\n' "$script"
  else
    printf '::error::DRIFT %s — parent and %s copies differ\n' "$script" "$sub"
    printf '  Diff (parent -> %s):\n' "$sub"
    diff -u "$a" "$b" | sed 's/^/    /' | head -60
    printf '\n  Resolve by deciding which copy is correct, then copying it BOTH ways.\n'
    printf '  Do not eyeball it: for a detection gate, prove each rule still fires\n'
    printf '  (e.g. `node scripts/drift-scan.mjs --self-test`) before syncing.\n\n'
    drift=1
  fi
done

if [ "$missing" -eq 1 ]; then
  printf '\nHarness error: a gated script is missing. Not a parity pass.\n'
  exit 2
fi

if [ "$drift" -eq 1 ]; then
  printf '\nGate-script parity FAILED. See bsuite#1710 for why this gate exists.\n'
  exit 1
fi

printf '\nAll %d gated scripts in parity.\n' "${#GATED[@]}"

# UNGATED, deliberately: scripts/prerender.mjs exists in both repos and has
# diverged (crm7 is ahead: path-traversal guard, exit-1 on failed routes,
# graceful CI/Chrome-missing skip). It is NOT gated because the parent's copy
# has zero callers — the parent is not a Vite SPA. The right fix is to delete
# the parent's orphan copy, not to keep two copies in lockstep. Left in place
# pending operator sign-off rather than removed unilaterally.
exit 0
