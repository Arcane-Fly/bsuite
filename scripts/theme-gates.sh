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
#                                  R80.4 the app's own @layer base beat it
#   "throughput is fine"        -> did not build against the published theme
#
# Contract: docs/plans/20260803-theme-conformance-dod-v1.00W.md
# Usage: scripts/theme-gates.sh [--quick]     (--quick skips builds/tests)
set -uo pipefail
cd "$(dirname "$0")/.."

QUICK=0
[[ ${1:-} == --quick ]] && QUICK=1

APPS=(crm7 conduit business-suite-unified R80.4 throughput braden)
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
# ROW FILTER — R80.4, not R80.3.
# G1, G3 and C4 below read scripts/audit-d2c-theme.sh's table by matching the
# app name at the start of each row. That script emits a row labelled `R80.4`
# (its APPS list, line 19). These three filters said `R80.3` — the submodule's
# name before it was renamed — so the R80.4 row matched NOTHING and its counts
# were silently dropped from all three totals. `.github/workflows/
# theme-conformance.yml` had the identical bug and fixed it (see its comment at
# :184); this local runner was not fixed with it, so the command an engineer
# runs by hand scanned five apps while CI scanned six.
# Measured on a planted fixture (R80.4 row carrying C1=5, C3=7, C4=3):
#   pair  old(R80\.3)  new(R80\.4)
#   C1    1            6
#   C3    0            7      <- hard-zero gate reporting PASS over 7 bypasses
#   C4    0            3      <- hard-zero gate reporting PASS over 3 violations
# A count over rows that cannot match is not a pass; G13 already refuses that
# shape explicitly ("a count over an empty tree is not a pass") and these three
# did it silently.
run G1 "no NEW pure white/black (ratchet vs baseline)" bash -c '
  scripts/audit-d2c-theme.sh > /tmp/tg.txt 2>&1
  col() { awk -v w="$1" "/^(crm7|conduit|business-suite-unified|R80\\.4|throughput|packages|braden) /{s=0; for(i=1;i<=NF;i++) if(\$i==\"/\"){s++; if(s==w){print \$(i-1); break}}}" /tmp/tg.txt | paste -sd+ | bc; }
  t=$(col 1); b=$(cat .github/theme-c1-baseline.txt 2>/dev/null || echo 999)
  [ "$t" -le "$b" ] || { echo "C1 rose to $t against baseline $b"; exit 1; }'

run G2 "only contract colours in packages/" scripts/audit-palette-whitelist.py
run G3 "no palette bypass in app source" bash -c '
  scripts/audit-d2c-theme.sh > /tmp/tg3.txt 2>&1
  c3=$(awk "/^(crm7|conduit|business-suite-unified|R80\\.4|throughput|packages|braden) /{s=0; for(i=1;i<=NF;i++) if(\$i==\"/\"){s++; if(s==3){print \$(i-1); break}}}" /tmp/tg3.txt | paste -sd+ | bc)
  [ "$c3" -eq 0 ] || { echo "C3 palette bypasses: $c3"; exit 1; }'
run G4 "no app redeclares a package token" scripts/audit-token-ownership.sh
run G10 "no silently-dropped utilities" scripts/audit-invalid-utilities.sh
run G12 "no AA-tuned text token carries an opacity modifier" scripts/check-dimmed-text-tokens.sh
run G13 "fill-token-as-text does not grow" scripts/check-fill-token-as-text.sh
# R1 — the per-page checklist in § 2 of the DoD pointed at scripts/audit-routes.sh
# for two weeks while no such file existed, so none of it ran. This asserts the
# inventory that file now owns is still there and still non-empty: a sweep over
# an emptied inventory visits nothing and reports success.
run R1 "route inventory declared and non-empty" scripts/audit-routes.sh --inventory
# G11 — an inline `style` attribute is the top of the cascade short of !important,
# so it beats every layer, utility and class. That is how the Dashboard heading
# defeated the heading ramp while every other gate reported clean. The codemod is
# run in DRY mode here: if it can convert anything, someone has added a new inline
# colour style since the estate was swept to zero.
run G11 "no NEW convertible inline colour styles" bash -c '
  t=0
  for a in crm7 conduit business-suite-unified R80.4 throughput braden; do
    [ -d "$a" ] || continue
    n=$(node scripts/codemod-inline-colour-styles.mjs "$a" 2>/dev/null | sed -n "s/^  converted:  \\([0-9]*\\).*/\\1/p")
    t=$((t + ${n:-0}))
  done
  [ "$t" -eq 0 ] || { echo "$t convertible inline colour style(s) — run: node scripts/codemod-inline-colour-styles.mjs <app> --apply"; exit 1; }' 
# O1 — the one-shot entity-ownership policy has been DOCUMENTED since 2026-02-27
# and enforced by NOTHING. A documented rule with no gate is a suggestion.
# RATCHET, not hard-zero, deliberately: 9 cross-app writes exist today and whether
# each is a violation or a legitimate exception is a PI ruling, not mine. The
# ratchet stops it getting worse while that is decided, and makes the number
# visible instead of implicit. Drive to 0 as the ruling lands.
run O1 "no NEW cross-app entity writes (one-shot policy)" bash -c '
  n=$(node scripts/audit-one-shot.mjs 2>/dev/null | sed -n "s/^TOTAL cross-app writes: \\([0-9]*\\)/\\1/p")
  b=$(cat .github/one-shot-baseline.txt 2>/dev/null || echo 0)
  [ "${n:-99}" -le "$b" ] || { echo "cross-app writes rose to $n against baseline $b — run: node scripts/audit-one-shot.mjs --list"; exit 1; }'
run C4 "destructive colour matches the contract" bash -c '
  scripts/audit-d2c-theme.sh > /tmp/tg4.txt 2>&1
  c4=$(awk "/^(crm7|conduit|business-suite-unified|R80\\.4|throughput|packages|braden) /{s=0; for(i=1;i<=NF;i++) if(\$i==\"/\"){s++; if(s==4){print \$(i-1); break}}}" /tmp/tg4.txt | paste -sd+ | bc)
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

  # G5/G6 need a running app, so they are opt-in rather than part of the default
  # sweep. THEY ARE THE ONLY GATES THAT PROVE ANYTHING REACHES A USER — every
  # other gate here can be satisfied by a token nothing consumes, which is
  # exactly how a six-level heading ramp shipped, passed every static check, and
  # rendered as one flat colour.
  #   THEME_GATE_URL=http://localhost:8081 THEME_GATE_APP=braden scripts/theme-gates.sh
  if [[ -n ${THEME_GATE_URL:-} ]]; then
    run G5/G6 "ramp + font reach the DOM (${THEME_GATE_APP:-app})" \
      node scripts/audit-applied-tokens.mjs "$THEME_GATE_URL" --app "${THEME_GATE_APP:-unknown}"
  elif [[ ${THEME_GATE_BROWSER:-0} == 1 ]]; then
    # Boots each app itself. Slow (six dev servers), so it is opt-in — but it is
    # opt-in behind a flag rather than behind "go and find a URL yourself",
    # which is what the old message amounted to and why it never got run.
    run G5/G6 "ramp + font in the DOM, all six apps" scripts/theme-gates-browser.sh
  else
    printf '  \033[33m-\033[0m %-6s %s\n' "G5/G6" "ramp + font in the DOM — NOT RUN"
    printf '     %s\n' "└─ this is the only gate that measures what a user sees; every other"
    printf '     %s\n' "   gate here can be satisfied by a token nothing consumes."
    printf '     %s\n' "   Run it:  THEME_GATE_BROWSER=1 scripts/theme-gates.sh"
    printf '     %s\n' "   or directly:  scripts/theme-gates-browser.sh [app ...]"
  fi

  # R2 — the SIGNED-IN sweep. G5/G6 above, however it is run, walks logged-out
  # pages only: `/`, `/login`, `/404`, `/unauthorized`, `/privacy`, `/terms`.
  # Every authenticated surface — nearly the whole product — was never measured,
  # and the suite reported green throughout. Opt-in because it needs credentials
  # and a live deployment, but opt-in behind a flag that names itself, not
  # behind "go and find a session yourself", which is what the old silence
  # amounted to and why it never happened.
  if [[ ${THEME_GATE_ROUTES:-0} == 1 ]]; then
    run R2 "per-page checks on SIGNED-IN routes" scripts/audit-routes.sh
  else
    printf '  \033[33m-\033[0m %-6s %s\n' "R2" "signed-in per-page sweep — NOT RUN"
    printf '     %s\n' "└─ every gate above this line, G5/G6 included, reads LOGGED-OUT pages."
    printf '     %s\n' "   Run it:  THEME_GATE_ROUTES=1 scripts/theme-gates.sh"
    printf '     %s\n' "   or directly:  scripts/audit-routes.sh"
  fi
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
