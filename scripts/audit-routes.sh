#!/usr/bin/env bash
# THE per-page validation runner — and the first one in this estate that walks
# a SIGNED-IN page.
#
# WHY THIS FILE EXISTS AT ALL
# ---------------------------------------------------------------------------
# docs/plans/20260803-theme-conformance-dod-v1.00W.md § 2 says, verbatim:
# "Route inventory lives in `scripts/audit-routes.sh`." It did not. The file was
# absent from the parent repo and from all six submodules, so the entire P1–P9
# per-page checklist in the Definition of Done was unimplemented, and the theme
# workflow invoked none of the three page auditors that DO exist. A checklist
# named in a DoD with no runner behind it is a paragraph, not a gate.
#
# WHAT WAS ACTUALLY UNMEASURED
# The gates that did run walked a fixed list of LOGGED-OUT routes — `/`,
# `/login`, `/404`, `/unauthorized`, `/privacy`, `/terms`. Every authenticated
# surface, which is nearly the whole product, was never looked at. The three
# auditors have accepted `--storage <storageState.json>` for months and no
# workflow ever passed one.
#
# The blocker was genuine: nothing produced a session. It stopped being genuine
# on 2026-08-17, when crm7's E2E auth was rebuilt to sign in programmatically.
# scripts/theme-session.sh consumes that helper; this script consumes
# scripts/theme-session.sh.
#
# A SKIP IS NOT A PASS — AND THAT IS ENFORCED HERE, NOT ELSEWHERE
# audit-applied-tokens.mjs deliberately exits 0 when a route was skipped, so
# that an auth-gated app is not permanently red for a reason the theme cannot
# fix. That was the right call while no session existed. It is the wrong call
# now, because it makes "audited and clean" and "never loaded" the same exit
# code. Measured on this tree, 2026-08-17:
#
#   /dashboard, no session : "– SKIPPED: redirected off-origin to
#                             https://suite.crm7.app — not audited"   exit 0
#   /dashboard, session    : "light: 6/6 distinct headings · font
#                             Geist Variable ... all clean"           exit 0
#
# Identical exit codes for "measured" and "never seen". So on an AUTHENTICATED
# route this runner treats any skip as a failure. On a public route a skip is
# reported and tolerated — a public route that bounces is information about the
# app, not about coverage this run promised.
#
# HONEST SCOPE, STATED AT THE HEAD
# The inventory below covers crm7 only. crm7 is the only app with an
# auth.setup.ts, so it is the only app where a signed-in sweep is possible
# today; the other five are named as NOT COVERED in the head block every run,
# because a gap that is printed is a gap someone can close, and a gap that is
# merely absent from a route list reads as coverage.
#
# Usage:
#   scripts/audit-routes.sh                       # full sweep, mints a session
#   scripts/audit-routes.sh --app crm7
#   scripts/audit-routes.sh --session <path>      # reuse an existing state
#   scripts/audit-routes.sh --no-session          # run anyway; auth routes fail
#   scripts/audit-routes.sh --inventory           # validate + count, no network
#   scripts/audit-routes.sh --inventory --require-authenticated 6
#
# Contract: docs/plans/20260803-theme-conformance-dod-v1.00W.md § 2
set -uo pipefail
cd "$(dirname "$0")/.."

# ─── ROUTE INVENTORY ────────────────────────────────────────────────────────
# Small and verified beats large and aspirational. Every route below was loaded
# through audit-applied-tokens.mjs against the live d.* domain while this file
# was written; none is here on the strength of appearing in a router config.
#
# Base URLs are the `d.`-prefixed DEVELOPMENT deployments from
# docs/20260731-platform-operations-reference-v1.00W.md, overridable per app so
# this is not a hardcode. A deployed origin rather than a local dev server is
# deliberate: crm7's playwright.config.ts boots `pnpm preview` for any localhost
# target, which needs a dist/ a fresh checkout has not built, and Playwright
# replays a storageState only against the exact origin it was minted for.
declare -A BASE_URL=(
  [crm7]="${THEME_GATE_BASE_URL_CRM7:-https://d.crm.crm7.app}"
)

# Public routes. `/auth/login` is deliberately absent: it is a redirect shim to
# BSU's OAuth server, so it lands off-origin and can only ever report SKIPPED.
# `/auth/callback` is absent for the reason theme-gates-browser.sh already
# records — opened without a `code` param it correctly logs "Missing
# authorization code", which is a guaranteed console error and not a defect.
declare -A PUBLIC_ROUTES=(
  [crm7]="/ /404 /unauthorized /privacy /terms"
)

# Authenticated routes — the coverage this lane adds. Six, not sixty: each one
# has to survive three auditors in two themes on every run, and a set that is
# honest about its size beats one that claims the router's full surface and
# quietly skips most of it.
declare -A AUTH_ROUTES=(
  [crm7]="/dashboard /contacts /clients /people /apprentices /communications"
)

APP_ORDER=(crm7)

# Named so the hole is visible in the output rather than implied by silence.
UNCOVERED="business-suite-unified conduit R80.4 throughput braden"

# ─── arguments ──────────────────────────────────────────────────────────────
ONLY_APP=''
SESSION="${THEME_GATE_SESSION:-}"
NO_SESSION=0
INVENTORY_ONLY=0
REQUIRE_AUTH=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app)        ONLY_APP=${2:?--app needs a value}; shift 2 ;;
    --session)    SESSION=${2:?--session needs a value}; shift 2 ;;
    --no-session) NO_SESSION=1; shift ;;
    --inventory)  INVENTORY_ONLY=1; shift ;;
    --require-authenticated) REQUIRE_AUTH=${2:?--require-authenticated needs a value}; shift 2 ;;
    *) echo "audit-routes: unknown argument '$1'" >&2; exit 2 ;;
  esac
done

APPS=("${APP_ORDER[@]}")
if [[ -n $ONLY_APP ]]; then
  found=0
  for a in "${APP_ORDER[@]}"; do [[ $a == "$ONLY_APP" ]] && found=1; done
  [[ $found -eq 1 ]] || { echo "audit-routes: '$ONLY_APP' is not in the inventory (have: ${APP_ORDER[*]})" >&2; exit 2; }
  APPS=("$ONLY_APP")
fi

# ─── derived counts ─────────────────────────────────────────────────────────
# DERIVED, never written down. A literal count is correct on the day it is typed
# and wrong the first time somebody adds a route, and a guard whose self-report
# is a stale literal is the exact thing LANE-WATCHER exists to catch.
n_public=0; n_auth=0
for a in "${APPS[@]}"; do
  for _ in ${PUBLIC_ROUTES[$a]:-}; do n_public=$((n_public + 1)); done
  for _ in ${AUTH_ROUTES[$a]:-};   do n_auth=$((n_auth + 1)); done
done
n_total=$((n_public + n_auth))
n_apps=${#APPS[@]}

# THE HEAD BLOCK. Printed before any work, unconditionally, on every path
# including the failure paths. LANE-WATCHER classifies a guard from the HEAD of
# its output — a summary printed only at the end is truncated away before it is
# read — and a guard that exits 0 without ever stating a non-zero count of what
# it examined is treated as having examined nothing.
echo
echo "audit-routes: $n_total route(s) across $n_apps app(s) — $n_public public, $n_auth authenticated"
echo "  NOT COVERED: $UNCOVERED"
echo "  (no auth.setup.ts in those five, so no session can be minted for them;"
echo "   porting that one file is what unlocks a signed-in sweep there)"
echo "───────────────────────────────────────────────────────────────"

# ─── inventory validation ───────────────────────────────────────────────────
# Runs on every invocation, not just --inventory: a sweep over a malformed or
# emptied inventory would visit nothing and report success, which is the
# vacuous-guard failure in its purest form.
inv_bad=0
for a in "${APPS[@]}"; do
  [[ -n ${BASE_URL[$a]:-} ]] || { echo "  ✗ $a has no base URL"; inv_bad=1; }
  case "${BASE_URL[$a]:-}" in
    http://*|https://*) : ;;
    *) echo "  ✗ $a base URL is not absolute: '${BASE_URL[$a]:-}'"; inv_bad=1 ;;
  esac
  seen=' '
  for r in ${PUBLIC_ROUTES[$a]:-} ${AUTH_ROUTES[$a]:-}; do
    [[ $r == /* ]] || { echo "  ✗ $a route '$r' does not start with /"; inv_bad=1; }
    case "$seen" in *" $r "*) echo "  ✗ $a route '$r' is declared twice"; inv_bad=1 ;; esac
    seen="$seen$r "
  done
done
if [[ $n_total -eq 0 ]]; then
  echo "  ✗ the inventory is EMPTY — this run would examine nothing and pass"
  inv_bad=1
fi
# The ratchet. Pin this in CI at the number of authenticated routes currently
# declared, and deleting one turns the gate red instead of quietly shrinking
# coverage back towards the logged-out-only sweep this lane replaced.
if [[ $n_auth -lt $REQUIRE_AUTH ]]; then
  echo "  ✗ only $n_auth authenticated route(s) declared, floor is $REQUIRE_AUTH"
  echo "    Authenticated coverage went DOWN. Restore the routes, or lower the"
  echo "    floor deliberately in the same change that removes them."
  inv_bad=1
fi
if [[ $inv_bad -ne 0 ]]; then
  echo
  echo "  INVENTORY INVALID — nothing was audited."
  exit 1
fi
[[ $INVENTORY_ONLY -eq 1 ]] && { echo "  ✓ inventory valid"; echo; exit 0; }

# ─── session ────────────────────────────────────────────────────────────────
if [[ $NO_SESSION -eq 1 ]]; then
  echo "  --no-session: authenticated routes will be attempted ANONYMOUSLY."
  echo "  They will bounce to the OAuth server and be reported SKIPPED, which"
  echo "  this runner counts as a failure. That is the point of the flag."
  SESSION=''
elif [[ -z $SESSION ]]; then
  echo "  minting a session (scripts/theme-session.sh -> crm7 auth.setup.ts)"
  if ! SESSION=$(scripts/theme-session.sh --app crm7 --base-url "${BASE_URL[crm7]}" --quiet 2>/tmp/theme-session.err); then
    echo "  ✗ could not mint a session:"
    sed 's/^/      /' /tmp/theme-session.err
    rm -f /tmp/theme-session.err
    exit 1
  fi
  rm -f /tmp/theme-session.err
  echo "  session ready"
elif [[ ! -f $SESSION ]]; then
  echo "  ✗ --session '$SESSION' does not exist"
  exit 1
fi

fail=0; skips_public=0
declare -a FAILED=()

# Run one auditor over one batch of URLs. Findings are reported by the auditor's
# own exit code — all three exit 1 on a finding — so this does not re-parse
# their verdicts, only their SKIP lines, which they emit while exiting 0.
run_auditor() { # $1=label $2=app $3=storage-or-empty $4..=urls
  local label=$1 app=$2 storage=$3; shift 3
  local -a cmd=(node "scripts/$label.mjs" "$@" --app "$app")
  [[ $label == audit-legibility ]] && cmd+=(--theme both)
  [[ -n $storage ]] && cmd+=(--storage "$storage")
  AUDIT_OUT=$("${cmd[@]}" 2>&1); AUDIT_RC=$?
}

for app in "${APPS[@]}"; do
  base=${BASE_URL[$app]}
  echo
  echo "  $app — $base"

  for kind in public authenticated; do
    if [[ $kind == public ]]; then routes=${PUBLIC_ROUTES[$app]:-}; storage=''
    else routes=${AUTH_ROUTES[$app]:-}; storage=$SESSION; fi
    [[ -n ${routes// /} ]] || continue

    targets=(); for r in $routes; do targets+=("$base$r"); done
    printf '    %s: %s route(s)\n' "$kind" "${#targets[@]}"

    for auditor in audit-applied-tokens audit-ui-pages audit-legibility; do
      run_auditor "$auditor" "$app" "$storage" "${targets[@]}"
      n_skipped=$(printf '%s\n' "$AUDIT_OUT" | grep -c 'SKIPPED' || true)

      if [[ $AUDIT_RC -ne 0 ]]; then
        fail=$((fail + 1)); FAILED+=("$app $kind — $auditor")
        printf '      \033[31m✗\033[0m %s\n' "$auditor"
        printf '%s\n' "$AUDIT_OUT" | grep -E '^\s+(✗|[0-9.]+:1|U[0-9])' | head -6 | sed 's/^/          /'
      elif [[ $kind == authenticated && $n_skipped -gt 0 ]]; then
        # THE WHOLE POINT. A skipped authenticated route is a route this run
        # promised to measure and did not. Passing it through would recreate
        # the state this lane exists to end: a green sweep over pages nobody
        # looked at.
        fail=$((fail + 1)); FAILED+=("$app authenticated — $auditor left $n_skipped route(s) UNAUDITED")
        printf '      \033[31m✗\033[0m %s — %s route(s) SKIPPED (unaudited, not passed)\n' "$auditor" "$n_skipped"
        printf '%s\n' "$AUDIT_OUT" | grep 'SKIPPED' | head -4 | sed 's/^/          /'
      else
        [[ $kind == public ]] && skips_public=$((skips_public + n_skipped))
        printf '      \033[32m✓\033[0m %s\n' "$auditor"
      fi
    done
  done
done

echo
echo "───────────────────────────────────────────────────────────────"
echo "  examined $n_total route(s) — $n_public public, $n_auth authenticated"
if [[ $skips_public -gt 0 ]]; then
  echo "  $skips_public public route-audit(s) skipped — coverage this run does not have"
fi
if [[ $fail -gt 0 ]]; then
  echo
  echo "  NOT DONE — outstanding:"
  for f in "${FAILED[@]}"; do echo "    · $f"; done
  echo
  exit 1
fi
echo "  ALL PER-PAGE CHECKS GREEN"
echo
