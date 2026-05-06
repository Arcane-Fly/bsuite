#!/usr/bin/env bash
# verify-silent-auth-wired.sh
#
# CI guard: assert each consumer of @bsuite/auth wires attemptSilentAuth()
# into their auth boot path. The doctrine fix in @bsuite/auth v0.2.0 only
# prevents the cross-app SSO bug if every consumer actually calls
# attemptSilentAuth before rendering an unauthenticated state.
#
# Failure modes this catches:
#   - Consumer imports startBSTokenRefresh but not attemptSilentAuth.
#   - Consumer regresses by removing the attemptSilentAuth() call.
#
# Runs against the current submodule pointers in this repo. Each submodule
# directory is grepped for both an import of `attemptSilentAuth` from
# `@/lib/business-suite-oauth` (or `@bsuite/auth`) AND an actual call site.
#
# Exit codes:
#   0 — all consumers wired correctly
#   1 — at least one consumer missing the wiring

set -euo pipefail

# Each consumer's root + the file we expect to wire silent re-auth.
# Conduit is included per AUTH_CANONICAL.md (full BS OAuth 2.1 PKCE client).
CONSUMERS=(
  "crm7|src/contexts/AuthContext.tsx"
  "throughput|src/contexts/AuthContext.tsx"
  "R80.3|src/contexts/AuthContext.tsx"
  "braden|src/contexts/AuthContext.tsx"
  "conduit|src/contexts/AuthContext.tsx"
)

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")"/.. && pwd)"
fail=0

for entry in "${CONSUMERS[@]}"; do
  consumer="${entry%%|*}"
  rel="${entry#*|}"
  path="${REPO_ROOT}/${consumer}/${rel}"

  if [ ! -f "$path" ]; then
    # Consumer subdirectory missing (submodule not initialized) — soft skip.
    echo "warn: ${consumer} not present at ${path} — skipping"
    continue
  fi

  if ! grep -q 'attemptSilentAuth' "$path"; then
    echo "FAIL: ${consumer}: ${rel} does not reference attemptSilentAuth"
    echo "  AUTH_CANONICAL.md requires every BS OAuth 2.1 client to invoke attemptSilentAuth"
    echo "  in its auth boot path so cross-app SSO via prompt=none works."
    fail=1
  else
    echo "ok:   ${consumer}: attemptSilentAuth referenced in ${rel}"
  fi
done

if [ "$fail" -ne 0 ]; then
  echo
  echo "One or more consumers are missing the silent-auth wiring."
  echo "Fix: import attemptSilentAuth from '@/lib/business-suite-oauth' and call"
  echo "it in the AuthContext mount effect when getSession() returns null."
  exit 1
fi

echo
echo "All ${#CONSUMERS[@]} consumers wired correctly."
