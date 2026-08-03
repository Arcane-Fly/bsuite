#!/usr/bin/env bash
# THE terminal verifier for theme conformance.
#
# Exits 0 only when every gate in the DoD passes. This is the loop's success
# condition — one command, binary, observable. Without it "done" is an opinion,
# and this effort has already produced three confident "done"s that a script
# disproved in seconds:
#
#   "packages/ is clean"        -> 62 off-palette colours
#   "the heading ramp is in"    -> tokens existed, nothing applied them, and in
#                                  R80.3 the app's own @layer base beat it
#   "throughput is fine"        -> did not build against the published theme
#
# Contract: docs/plans/20260803-theme-conformance-dod-v1.00W.md
# Usage: scripts/theme-gates.sh [--quick]     (--quick skips builds/tests)
set -uo pipefail
cd "$(dirname "$0")/.."

QUICK=0
[[ ${1:-} == --quick ]] && QUICK=1

APPS=(crm7 conduit business-suite-unified R80.3 throughput braden)
PKGS=(theme ui nav-core page-builder schema-builder)

pass=0; fail=0
declare -a FAILED=()

run() { # $1=id  $2=label  $3=command
  local out rc
  out=$("${@:3}" 2>&1); rc=$?
  if [[ $rc -eq 0 ]]; then
    printf '  \033[32m✓\033[0m %-6s %s\n' "$1" "$2"; pass=$((pass+1))
  else
    printf '  \033[31m✗\033[0m %-6s %s\n' "$1" "$2"; fail=$((fail+1)); FAILED+=("$1 — $2")
    printf '%s\n' "$out" | tail -6 | sed 's/^/          /'
  fi
}

echo
echo "THEME CONFORMANCE GATES"
echo "───────────────────────────────────────────────────────────────"

# ── static gates ────────────────────────────────────────────────────────────
run G1 "no NEW pure white/black (ratchet vs baseline)" bash -c '
  scripts/audit-d2c-theme.sh > /tmp/tg.txt 2>&1
  col() { awk -v w="$1" "/^(crm7|conduit|business-suite-unified|R80\\.3|throughput|packages|braden) /{s=0; for(i=1;i<=NF;i++) if(\$i==\"/\"){s++; if(s==w){print \$(i-1); break}}}" /tmp/tg.txt | paste -sd+ | bc; }
  t=$(col 1); b=$(cat .github/theme-c1-baseline.txt 2>/dev/null || echo 999)
  [ "$t" -le "$b" ] || { echo "C1 rose to $t against baseline $b"; exit 1; }'

run G2 "only contract colours in packages/" scripts/audit-palette-whitelist.py
run G3 "no palette bypass in app source" bash -c '
  scripts/audit-d2c-theme.sh > /tmp/tg3.txt 2>&1
  c3=$(awk "/^(crm7|conduit|business-suite-unified|R80\\.3|throughput|packages|braden) /{s=0; for(i=1;i<=NF;i++) if(\$i==\"/\"){s++; if(s==3){print \$(i-1); break}}}" /tmp/tg3.txt | paste -sd+ | bc)
  [ "$c3" -eq 0 ] || { echo "C3 palette bypasses: $c3"; exit 1; }'
run G4 "no app redeclares a package token" scripts/audit-token-ownership.sh
run G10 "no silently-dropped utilities" scripts/audit-invalid-utilities.sh
run C4 "destructive colour matches the contract" bash -c '
  scripts/audit-d2c-theme.sh > /tmp/tg4.txt 2>&1
  c4=$(awk "/^(crm7|conduit|business-suite-unified|R80\\.3|throughput|packages|braden) /{s=0; for(i=1;i<=NF;i++) if(\$i==\"/\"){s++; if(s==4){print \$(i-1); break}}}" /tmp/tg4.txt | paste -sd+ | bc)
  [ "$c4" -eq 0 ] || { echo "C4 wrong-destructive: $c4"; exit 1; }'

if [[ $QUICK -eq 1 ]]; then
  echo "───────────────────────────────────────────────────────────────"
  echo "  (--quick: builds, tests and ESM skipped)"
else
  # ── build / test gates ────────────────────────────────────────────────────
  for a in "${APPS[@]}"; do
    [[ -d $a ]] || continue
    run "B:$a" "builds" bash -c "cd '$a' && timeout 560 pnpm build >/dev/null 2>&1"
  done
  for a in "${APPS[@]}"; do
    [[ -d $a ]] || continue
    run "T:$a" "tests pass" bash -c "cd '$a' && timeout 420 pnpm test >/dev/null 2>&1"
  done
  for p in "${PKGS[@]}"; do
    [[ -d packages/$p ]] || continue
    run "P:$p" "package tests" bash -c "cd 'packages/$p' && timeout 300 pnpm test >/dev/null 2>&1"
  done
  run G9 "packages import under Node ESM" scripts/verify-esm-imports.sh
fi

echo "───────────────────────────────────────────────────────────────"
printf '  %s passed, %s failed\n' "$pass" "$fail"
if [[ $fail -gt 0 ]]; then
  echo
  echo "  NOT DONE — outstanding:"
  for f in "${FAILED[@]}"; do echo "    · $f"; done
  echo
  exit 1
fi
echo
echo "  ALL GATES GREEN"
echo
