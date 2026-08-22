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
# The inventory below covers crm7, braden, throughput, conduit and
# business-suite-unified and R80.4 — every app, as of 2026-08-22.
#
# R80.4 was the last one out, and the line this file printed about it was WRONG in a
# way worth keeping: "porting that one file ... is what unlocks a signed-in sweep
# there". The file was the smaller half. R8 had no `@playwright/test`, no config and no
# `tests/` directory at all, so anyone who followed that instruction would have added a
# file, found nothing ran, and been left to work out why. Closed by R80.4#187.
#
# The habit that got it closed is worth keeping too: a gap that is PRINTED is a gap
# someone can close, and a gap merely absent from a route list reads as coverage. That
# is why the else-branch below still names the covered count rather than saying nothing.
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
  [braden]="${THEME_GATE_BASE_URL_BRADEN:-https://d.braden.com.au}"
  [throughput]="${THEME_GATE_BASE_URL_THROUGHPUT:-https://d.ideas.crm7.app}"
  [conduit]="${THEME_GATE_BASE_URL_CONDUIT:-https://d.conduit.crm7.app}"
  [business-suite-unified]="${THEME_GATE_BASE_URL_BSU:-https://d.suite.crm7.app}"
  [R80.4]="${THEME_GATE_BASE_URL_R804:-https://d.r8.crm7.app}"
)

# Public routes. `/auth/login` is deliberately absent for the OAuth CLIENT
# apps (crm7, braden, throughput, conduit): it is a redirect shim to BSU's
# OAuth server, so it lands off-origin and can only ever report SKIPPED.
# business-suite-unified IS the OAuth server, so its own `/auth/login` is a
# real form and is included. `/auth/callback` is absent everywhere for the
# reason theme-gates-browser.sh already records — opened without a `code`
# param it correctly logs "Missing authorization code", a guaranteed console
# error and not a defect. Every route below was loaded live against the `d.*`
# domain (or, for business-suite-unified, verified via a real signed-in
# Playwright run) while this file was written — see docs/nav/route-
# inventory.json for the full per-app inventory these were drawn from.
declare -A PUBLIC_ROUTES=(
  [crm7]="/ /404 /unauthorized /privacy /terms"
  [braden]="/ /apprenticeships /contact /products"
  [throughput]="/pricing /login"
  [conduit]="/auth/register /portal/candidate /portal/careers /pricing"
  [business-suite-unified]="/auth/login /auth/reset-password"
  # R8's router is a plain path switch in src/main.tsx, not a route tree: /auth/login and
  # /auth/callback are the only paths outside AuthGate, and everything else is a 404 by
  # design. A short list here is the whole app, not a sample of it.
  [R80.4]="/auth/login"
)

# Authenticated routes — the coverage this lane adds. Small, not exhaustive:
# each one has to survive three auditors in two themes on every run, and a set
# that is honest about its size beats one that claims the router's full
# surface and quietly skips most of it. conduit's `/api/*` "routes" in the
# inventory are JSON endpoints, not pages, and are deliberately excluded — a
# DOM/contrast auditor has nothing to measure on an API response.
# FORM ROUTES ARE NOT OPTIONAL HERE. Every crm7 entry below used to be a LIST
# page — /dashboard, /contacts, /clients — and a list page has no primary action
# to press. The defect the operator reported on 2026-08-20 was a submit button
# clipped inside its own card and covered by an overlay, on /clients/create. The
# entire class of page where a primary action LIVES was unwalked, so no auditor
# could have caught it however good it was.
#
# One create form per app, chosen because they exercise the card grid the defect
# lived in. Still a sample, still small — see the note above about honesty over
# claimed coverage — but a sample that now includes the shape that broke.
declare -A AUTH_ROUTES=(
  [crm7]="/dashboard /contacts /clients /people /apprentices /communications /clients/create /contacts/create"
  [braden]="/admin /admin/auth /admin/branding /admin/marketing"
  [throughput]="/ /analytics /ideas/new /launch /monitoring"
  [conduit]="/ /analytics /candidates /admin/templates"
  [business-suite-unified]="/ /admin /admin/branding /billing /analytics /branding"
  # CALCULATOR_PATHS in src/main.tsx — `/` and `/calculate` are the same page, and the
  # trailing-slash variant is deliberately honoured too. Both are behind AuthGate.
  [R80.4]="/ /calculate"
)

APP_ORDER=(crm7 braden throughput conduit business-suite-unified R80.4)

# Named so the hole is visible in the output rather than implied by silence.
UNCOVERED=""

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
if [[ -n $UNCOVERED ]]; then
  echo "  NOT COVERED: $UNCOVERED"
  echo "  (no tests/e2e/auth.setup.ts there, so no session can be minted)"
else
  echo "  COVERED: all $n_apps app(s) — every one can mint a signed-in session"
fi
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
# ONE PER APP, not one shared session (V-9, 2026-08-19). Before this pass only
# crm7 had a producer, so a single global mint was correct. Now every app's
# storageState is scoped to that app's own origin (or, for conduit, cookie
# domain) — Playwright will not replay crm7's localStorage against braden's
# origin, so reusing one session across apps would silently leave every OTHER
# app's authenticated routes unauditable. Minting therefore happens PER APP,
# inside the loop below, unless the caller opted out or supplied an explicit
# override (which then applies to every app in the run — a deliberate escape
# hatch for reusing one hand-minted state against a single-app `--app` run).
if [[ $NO_SESSION -eq 1 ]]; then
  echo "  --no-session: authenticated routes will be attempted ANONYMOUSLY."
  echo "  They will bounce to the OAuth server and be reported SKIPPED, which"
  echo "  this runner counts as a failure. That is the point of the flag."
elif [[ -n $SESSION && ! -f $SESSION ]]; then
  echo "  ✗ --session '$SESSION' does not exist"
  exit 1
fi
EXPLICIT_SESSION=$SESSION
declare -A APP_SESSION=()

mint_session_for() { # $1=app  -> sets APP_SESSION[$1], returns 1 on failure
  local a=$1
  if [[ $NO_SESSION -eq 1 ]]; then
    APP_SESSION[$a]=''
    return 0
  fi
  if [[ -n $EXPLICIT_SESSION ]]; then
    APP_SESSION[$a]=$EXPLICIT_SESSION
    return 0
  fi
  echo "  minting a session for $a (scripts/theme-session.sh -> $a auth.setup.ts)"
  local s
  if ! s=$(scripts/theme-session.sh --app "$a" --base-url "${BASE_URL[$a]}" --quiet 2>/tmp/theme-session-$a.err); then
    echo "  ✗ could not mint a session for $a:"
    sed 's/^/      /' "/tmp/theme-session-$a.err"
    rm -f "/tmp/theme-session-$a.err"
    return 1
  fi
  rm -f "/tmp/theme-session-$a.err"
  echo "  session ready for $a"
  APP_SESSION[$a]=$s
}

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
    if [[ $kind == public ]]; then
      routes=${PUBLIC_ROUTES[$app]:-}; storage=''
    else
      routes=${AUTH_ROUTES[$app]:-}
      if [[ -n ${routes// /} && $NO_SESSION -ne 1 ]]; then
        # Lazy: only mint when this app actually HAS authenticated routes to
        # walk, so a future app with public-only coverage never pays for a
        # session it does not use.
        [[ -v APP_SESSION[$app] ]] || mint_session_for "$app" || exit 1
      fi
      storage=${APP_SESSION[$app]:-}
    fi
    [[ -n ${routes// /} ]] || continue

    targets=(); for r in $routes; do targets+=("$base$r"); done
    printf '    %s: %s route(s)\n' "$kind" "${#targets[@]}"

    for auditor in audit-applied-tokens audit-ui-pages audit-legibility audit-hittable-actions; do
      run_auditor "$auditor" "$app" "$storage" "${targets[@]}"
      n_skipped=$(printf '%s\n' "$AUDIT_OUT" | grep -c 'SKIPPED' || true)

      if [[ $AUDIT_RC -ne 0 ]]; then
        fail=$((fail + 1)); FAILED+=("$app $kind — $auditor")
        printf '      \033[31m✗\033[0m %s\n' "$auditor"

        # STATE WHAT WAS FOUND, ALWAYS. The filter below matches an auditor's
        # FINDING lines ("  ✗ /dashboard [dark] — 3 below AA", "  3.21:1 …").
        # It does not match an auditor that fell over — a page that never
        # loaded, a bad flag, a crash — and on 2026-08-18 that is exactly what
        # reached CI: a bare red ✗ with nothing under it, so the only way to
        # learn what failed was to reproduce the whole sweep locally. The
        # output was captured in AUDIT_OUT the entire time and thrown away.
        #
        # So: try the finding filter, and if it matches NOTHING, print the tail
        # verbatim rather than printing nothing. A gate that cannot say what it
        # saw is a gate every reader has to re-run.
        detail=$(printf '%s\n' "$AUDIT_OUT" | grep -E '^[[:space:]]+(✗|[0-9.]+:1|U[0-9])' | head -8)
        if [[ -n $detail ]]; then
          printf '%s\n' "$detail" | sed 's/^/          /'
        else
          printf '          (no finding lines matched — %s did not report findings, it FAILED.\n' "$auditor"
          printf '           last 15 lines of its output follow verbatim)\n'
          printf '%s\n' "$AUDIT_OUT" | tail -15 | sed 's/^/          | /'
        fi
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
# STATE THE DENOMINATOR. This line used to read "examined 42 route(s)" with no
# total, and it was quoted in promotion sign-offs as though it meant the estate
# was visually sound. It never did: the inventory holds 552 routes, 398 of them
# crm7's. A reader — including the agent writing the sign-off — cannot judge a
# clean result without knowing what fraction it covers.
INVENTORY_TOTAL=$(node -e 'const d=require("./docs/nav/route-inventory.json");const r=Array.isArray(d)?d:(d.routes||d.entries||[]);console.log(r.length)' 2>/dev/null || echo 0)
if [[ ${INVENTORY_TOTAL:-0} -gt 0 ]]; then
  pct=$(( n_total * 100 / INVENTORY_TOTAL ))
  echo "  examined $n_total of $INVENTORY_TOTAL route(s) in the inventory (${pct}%) — $n_public public, $n_auth authenticated"
  echo "  this is a CURATED SAMPLE, not the estate. A clean result here means these $n_total pages are clean."
else
  echo "  examined $n_total route(s) — $n_public public, $n_auth authenticated"
fi
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
