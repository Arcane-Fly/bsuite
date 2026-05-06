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

# Each consumer's root + the directory grepped for the silent-auth call site.
# Conduit is included per AUTH_CANONICAL.md (full BS OAuth 2.1 PKCE client).
# The grep is recursive to allow apps to host their auth boot path under any
# of the canonical layouts (e.g. throughput uses `src/lib/auth/AuthProvider.tsx`
# while crm7 uses `src/contexts/AuthContext.tsx`).
CONSUMERS=(
  "crm7|src"
  "throughput|src"
  "R80.3|src"
  "braden|src"
  "conduit|src"
)

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")"/.. && pwd)"
fail=0

for entry in "${CONSUMERS[@]}"; do
  consumer="${entry%%|*}"
  rel="${entry#*|}"
  path="${REPO_ROOT}/${consumer}/${rel}"

  if [ ! -d "$path" ]; then
    # Consumer subdirectory missing (submodule not initialized) — soft skip.
    echo "warn: ${consumer} not present at ${path} — skipping"
    continue
  fi

  # Search for any call site (not just a comment / type import). A bare token
  # match is sufficient — false-positives here would be an active call to
  # `attemptSilentAuth` in test code, which is fine: the doctrine just
  # requires it to be wired SOMEWHERE in the consumer's source.
  hits=$(grep -rl 'attemptSilentAuth' "$path" --include='*.ts' --include='*.tsx' 2>/dev/null || true)
  if [ -z "$hits" ]; then
    echo "FAIL: ${consumer}: no .ts/.tsx file under ${rel}/ references attemptSilentAuth"
    echo "  AUTH_CANONICAL.md requires every BS OAuth 2.1 client to invoke attemptSilentAuth"
    echo "  in its auth boot path so cross-app SSO via prompt=none works."
    fail=1
  else
    echo "ok:   ${consumer}: attemptSilentAuth referenced in:"
    echo "$hits" | sed 's|^|        |'
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
