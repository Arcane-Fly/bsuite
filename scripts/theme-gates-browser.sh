#!/usr/bin/env bash
# G5/G6 for every app, without needing a server already running.
#
# WHY THIS EXISTS
# theme-gates.sh prints "- G5/G6 ... set THEME_GATE_URL to run" and then reports
# ALL GATES GREEN. That dash is the whole problem: G5/G6 is the ONLY gate that
# measures what a user actually sees, every other gate in the suite can be
# satisfied by a token nothing consumes, and it is the one gate the default
# sweep skips. A green run that skipped it is green about the source, not the
# screen — which is exactly how a six-level heading ramp shipped, passed every
# static check, and rendered as one flat colour.
#
# So this boots each app itself, probes it, and tears it down.
#
# WHAT A SKIP MEANS HERE
# An app whose routes redirect to the OAuth server lands off-origin, because the
# server rejects a localhost redirect_uri. audit-applied-tokens.mjs refuses to
# audit that page — attributing Supabase's raw JSON 400 to the app produced 8
# pure endpoints, Times New Roman and a collapsed ramp against a healthy crm7.
# Those routes are reported SKIPPED and counted separately. A skip is coverage
# this run does not have. It is never a pass.
#
# Usage: scripts/theme-gates-browser.sh [app ...]     (default: all six)
set -uo pipefail
cd "$(dirname "$0")/.."

# Routes worth probing per app. Authenticated routes are deliberately absent —
# they cannot be reached without a session and would only ever report SKIPPED.
declare -A ROUTES=(
  # /auth/callback is deliberately ABSENT. A callback cannot be meaningfully
  # audited without a live OAuth handshake: opening it directly has no `code`
  # param, so the app CORRECTLY logs "Missing authorization code" and the audit
  # records a guaranteed console error that is not a defect. Excluded because it
  # is not auditable, not because it fails — the token audit still covers it.
  [crm7]="/ /login /404 /unauthorized /privacy /terms"
  [conduit]="/ /login"
  [business-suite-unified]="/ /login /auth/callback"
  [R80.3]="/ /login"
  [throughput]="/ /login"
  [braden]="/ /about /services /products /contact"
)
APPS=("${@:-}")
[[ -z ${APPS[0]:-} ]] && APPS=(crm7 conduit business-suite-unified R80.3 throughput braden)

pass=0; fail=0; skip=0
declare -a FAILED=()

echo
echo "G5/G6 — RAMP, FONT, ENDPOINTS AND CONTRAST IN A REAL BROWSER"
echo "───────────────────────────────────────────────────────────────"

for app in "${APPS[@]}"; do
  [[ -d $app ]] || continue
  log=$(mktemp); : >"$log"
  # setsid so the server survives this shell and we can reap it by PID rather
  # than pkill -f vite, which would also kill an unrelated app the operator has
  # open. Killing the wrong dev server is a silent way to make a gate lie.
  ( cd "$app" && setsid nohup pnpm dev >"$log" 2>&1 </dev/null & echo $! >"$log.pid" )
  sleep 1
  pid=$(cat "$log.pid" 2>/dev/null)

  url=''
  for _ in $(seq 1 60); do
    url=$(grep -oE 'http://localhost:[0-9]+' "$log" 2>/dev/null | head -1)
    [[ -n $url ]] && curl -s -o /dev/null --max-time 2 "$url/" && break
    url=''; sleep 2
  done

  if [[ -z $url ]]; then
    # Distinguish "the app is broken" from "something else holds the port".
    # Reporting a stale dev server as an app failure sends you debugging the
    # wrong thing — this cost a cycle on conduit, whose port was still held by a
    # server from an earlier manual run.
    if grep -q 'EADDRINUSE' "$log" 2>/dev/null; then
      port=$(grep -oE 'port: [0-9]+' "$log" | head -1 | grep -oE '[0-9]+')
      printf '  \033[31m✗\033[0m %-24s port %s already in use — another server is holding it,\n' "$app" "${port:-?}"
      printf '      %-24s this is an environment condition, NOT an app or theme failure.\n' ''
      fail=$((fail+1)); FAILED+=("$app — port ${port:-?} in use (stale server, not the app)")
    else
      printf '  \033[31m✗\033[0m %-24s dev server never came up (see %s)\n' "$app" "$log"
      fail=$((fail+1)); FAILED+=("$app — server did not start")
    fi
  else
    printf '  %-24s %s\n' "$app" "$url"
    # ALL routes in ONE invocation. The first version spawned a process — and
    # therefore a whole Chromium — per route; twelve routes had not finished
    # after fifteen minutes. The auditor now reuses a single browser.
    targets=()
    for r in ${ROUTES[$app]}; do targets+=("$url$r"); done
    out=$(node scripts/audit-applied-tokens.mjs "${targets[@]}" --app "$app" 2>&1)
    # The STRUCTURAL half. audit-applied-tokens proves the colours and font reach
    # the DOM; it cannot see a missing nav, a table with no cells, a 404'd logo,
    # 56px of sideways scroll or a raw `undefined` on screen. Every one of those
    # is a defect the operator sees first and no colour gate can detect.
    uiout=$(node scripts/audit-ui-pages.mjs "${targets[@]}" --app "$app" 2>&1)
    # G13 — LEGIBILITY. The only check that asks the question the operator asks:
    # can a human read this? It measures the COMPUTED colour of rendered text
    # against the COMPUTED colour actually behind it, so it is invariant to
    # whatever caused the problem — a wrong class, a bad token, a stray opacity.
    # It exists because I shipped text painted the SAME COLOUR as its background
    # and every other gate was green: the palette gates check which colours are
    # legal, G12 checks what a token resolves to, and the defect was which token
    # the CLASS binds to. Nothing looked at the pixels.
    #
    # RATCHETED TO ZERO on 2026-08-05. It ran as a warning only while the
    # estate-wide number was unknown; it is now measured at 0 across all six
    # apps, signed in, in BOTH themes — crm7 6 routes, conduit 8, BSU 7,
    # braden 6, throughput 4, R80.3 1. A warning that nobody has to clear
    # decays into scenery, so from here a finding FAILS.
    #
    # Run it in both themes: dark mode partially rescues the success and
    # warning fills because their dark values are already light, so a
    # single-theme run declared half the estate's pill defects clean when they
    # were not.
    lgout=$(node scripts/audit-legibility.mjs "${targets[@]}" --app "$app" --theme both 2>&1)
    lgn=$(sed -n 's/^  \([0-9]*\) finding(s).*/\1/p' <<<"$lgout" | head -1)
    if [[ ${lgn:-0} -gt 0 ]]; then
      fail=$((fail+1)); FAILED+=("$app: G13 legibility — $lgn below AA")
      printf '      \033[31m✗\033[0m G13 legibility: %s below AA\n' "$lgn"
      grep -E '^\s+[0-9.]+:1' <<<"$lgout" | head -5 | sed 's/^/        /'
    else
      printf '      \033[32m✓\033[0m G13 legibility (both themes)\n'
    fi
    while IFS= read -r l; do
      case "$l" in
        "      U"*) fail=$((fail+1)); FAILED+=("$app: ${l##*( )}"); printf '      \033[31m✗\033[0m %s\n' "${l##*( )}" ;;
      esac
    done <<<"$uiout" 
    while IFS= read -r line; do
      case "$line" in
        *SKIPPED*) skip=$((skip+1)); printf '      \033[33m-\033[0m %s\n' "${line#*SKIPPED: }" ;;
        *"✓ ramp"*) pass=$((pass+1)) ;;
        "  ✗ "*)   fail=$((fail+1)); FAILED+=("$app: ${line#  ✗ }"); printf '      \033[31m✗\033[0m %s\n' "${line#  ✗ }" ;;
      esac
    done <<<"$out"
    printf '      %s ok, %s failed so far\n' "$pass" "$fail"
  fi

  [[ -n ${pid:-} ]] && kill -- -"$pid" 2>/dev/null
  rm -f "$log.pid"
done

echo "───────────────────────────────────────────────────────────────"
printf '  %s routes passed, %s failed, %s skipped\n' "$pass" "$fail" "$skip"
if [[ $fail -gt 0 ]]; then
  echo
  echo "  NOT DONE:"
  for f in "${FAILED[@]}"; do echo "    · $f"; done
  echo
  exit 1
fi
if [[ $skip -gt 0 ]]; then
  echo
  echo "  $skip route(s) were NOT audited — they redirect to the OAuth server,"
  echo "  which rejects a localhost redirect_uri. That is missing coverage, not"
  echo "  a pass. Reaching them needs a signed-in run against the d.* domains."
fi
echo
