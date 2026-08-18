#!/usr/bin/env bash
# Mint a Playwright storageState so the theme gates can audit SIGNED-IN pages.
#
# WHY THIS EXISTS
# ---------------------------------------------------------------------------
# audit-applied-tokens.mjs, audit-ui-pages.mjs and audit-legibility.mjs have all
# accepted a `--storage <storageState.json>` flag for months. No workflow has
# ever passed one, and the route lists the gates walk are the LOGGED-OUT pages:
# `/`, `/login`, `/404`, `/unauthorized`, `/privacy`, `/terms`. Every
# authenticated surface in the estate — which is nearly all of it — has been
# unmeasured, and the gates reported green the whole time. An unaudited route is
# missing coverage, never a pass; theme-gates-browser.sh says so in its own
# closing message and then has no way to act on it.
#
# The blocker was real until 2026-08-17: nothing produced a session. crm7's E2E
# auth was rebuilt that day to sign in PROGRAMMATICALLY — Supabase password
# grant, session seeded into localStorage under the app's own storage key —
# because a browser OAuth handshake can never work from CI (an ephemeral CI
# origin cannot be a registered `redirect_uri`, and Supabase matches it
# byte-exactly).
#
# THIS SCRIPT DOES NOT REIMPLEMENT ANY OF THAT. It runs crm7's own
# `tests/e2e/auth.setup.ts` through crm7's own Playwright config and copies out
# the storageState that setup project writes. A second implementation of a
# sign-in helper is a second thing to rot: the token endpoint, the grant shape
# and the per-app storage key would then live in two places and drift silently,
# and the drift would present as a green gate over an anonymous sweep — exactly
# the failure crm7's helper was rebuilt to kill.
#
# WHY A DEPLOYED TARGET AND NOT A LOCAL SERVER
# `--base-url` defaults to the app's `d.`-prefixed development domain. crm7's
# playwright.config.ts boots `pnpm preview --port 5676` for any localhost
# target, which needs a `dist/` that a fresh checkout does not have; pointing at
# a real origin skips that block entirely. It also means the storageState's
# `origins[]` entry matches the origin the sweep then visits — Playwright
# replays localStorage per exact origin, so a state minted against one host is
# inert against another.
#
# THE FILE HOLDS REAL BEARER TOKENS. It is written outside the repository, mode
# 0600, and must never be committed or echoed.
#
# Usage:
#   scripts/theme-session.sh [--app crm7] [--base-url URL] [--out PATH] [--quiet]
#
# Consumed by: scripts/audit-routes.sh
set -uo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT=$PWD

APP=crm7
BASE_URL=''
OUT=''
QUIET=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app)      APP=${2:?--app needs a value}; shift 2 ;;
    --base-url) BASE_URL=${2:?--base-url needs a value}; shift 2 ;;
    --out)      OUT=${2:?--out needs a value}; shift 2 ;;
    --quiet)    QUIET=1; shift ;;
    *) echo "theme-session: unknown argument '$1'" >&2; exit 2 ;;
  esac
done

# Only crm7 has a session producer today. Naming the others here rather than
# failing with "unknown app" keeps the gap legible: the answer to "why is BSU
# unmeasured signed in" is a missing auth.setup.ts, not a missing route list.
if [[ $APP != crm7 ]]; then
  echo "theme-session: no session producer exists for '$APP'." >&2
  echo "  crm7 is the only app with tests/e2e/auth.setup.ts. Porting that file" >&2
  echo "  to another app is what unlocks a signed-in sweep there; this script" >&2
  echo "  deliberately does not invent a second sign-in path." >&2
  exit 2
fi

: "${BASE_URL:=${THEME_GATE_BASE_URL_CRM7:-https://d.crm.crm7.app}}"
: "${OUT:=${XDG_RUNTIME_DIR:-/tmp}/bsuite-theme-session-$APP.json}"

SETUP_SPEC="$REPO_ROOT/$APP/tests/e2e/auth.setup.ts"
STATE_SRC="$REPO_ROOT/$APP/playwright/.auth/user.json"

say() { [[ $QUIET -eq 1 ]] || printf '%s\n' "$*"; }

# An uninitialised submodule is an EMPTY DIRECTORY, and an empty directory
# passes `-d`. Test for the FILE this script actually consumes.
if [[ ! -f $SETUP_SPEC ]]; then
  echo "theme-session: $APP/tests/e2e/auth.setup.ts is not present." >&2
  echo "  The submodule is uninitialised (an empty dir still passes -d, so this" >&2
  echo "  checks the file). Run: git submodule update --init $APP" >&2
  exit 2
fi

# ── credentials ─────────────────────────────────────────────────────────────
# Read from the environment first; fall back to the repo-root .env.local, which
# is where this estate keeps them. Parsed rather than sourced: `.` would execute
# the file, and a value containing a backtick or $(...) would run as code. The
# LAST non-empty assignment wins — crm7/.env.local carries duplicate keys where
# an earlier occurrence is empty, and taking the first would report a credential
# as missing while it sits ten lines below.
env_from_file() { # $1=file $2=key
  [[ -f $1 ]] || return 0
  awk -F= -v k="$2" '
    $1 == k {
      v = $0; sub(/^[^=]*=/, "", v)
      gsub(/^[ \t]*"?|"?[ \t\r]*$/, "", v)
      if (v != "") last = v
    }
    END { if (last != "") print last }' "$1"
}
for key in VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY CRM7_E2E_EMAIL CRM7_E2E_PASSWORD; do
  if [[ -z ${!key:-} ]]; then
    val=$(env_from_file "$REPO_ROOT/.env.local" "$key")
    [[ -z $val ]] && val=$(env_from_file "$REPO_ROOT/$APP/.env.local" "$key")
    [[ -n $val ]] && export "$key=$val"
  fi
done

missing=()
for key in VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY CRM7_E2E_EMAIL CRM7_E2E_PASSWORD; do
  [[ -n ${!key:-} ]] || missing+=("$key")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  # FAIL, never degrade. auth.setup.ts writes an EMPTY storage state when
  # credentials are absent, by design, so that ordinary local runs of the E2E
  # suite still work. An empty state fed to the theme sweep would make every
  # authenticated route bounce to the OAuth server and be SKIPPED — which is
  # indistinguishable, from the outside, from a sweep that had no authenticated
  # routes at all. That is the exact shape of the defect this lane exists to
  # remove, so the producer refuses to hand back a state it knows is empty.
  echo "theme-session: missing credential(s): ${missing[*]}" >&2
  echo "  Without them auth.setup.ts writes an EMPTY state, every signed-in" >&2
  echo "  route would be SKIPPED, and the sweep would look like it passed." >&2
  exit 2
fi

# ── run crm7's own auth setup project ───────────────────────────────────────
say "theme-session: minting a session for $APP against $BASE_URL"
say "  via $APP/tests/e2e/auth.setup.ts (consumed, not reimplemented)"
rm -f "$STATE_SRC"
log=$(mktemp)
if ! ( cd "$REPO_ROOT/$APP" && PLAYWRIGHT_BASE_URL="$BASE_URL" \
        timeout 300 pnpm exec playwright test --project=auth-setup --reporter=line ) \
        >"$log" 2>&1; then
  echo "theme-session: crm7 auth-setup FAILED — see below." >&2
  tail -25 "$log" >&2
  rm -f "$log"
  exit 1
fi
rm -f "$log"

if [[ ! -f $STATE_SRC ]]; then
  echo "theme-session: auth-setup exited 0 but wrote no state at $STATE_SRC" >&2
  exit 1
fi

# ── prove the state is not the empty one ────────────────────────────────────
# `{"cookies":[],"origins":[]}` is a legal storageState and Playwright loads it
# without complaint. Counting what is actually in it is the difference between
# a session and a file shaped like one.
read -r n_origins n_keys < <(node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
  const origins = s.origins ?? []
  const keys = origins.reduce((n, o) => n + (o.localStorage ?? []).length, 0)
  process.stdout.write(`${origins.length} ${keys}\n`)
' "$STATE_SRC")

if [[ ${n_origins:-0} -eq 0 || ${n_keys:-0} -eq 0 ]]; then
  echo "theme-session: the minted state is EMPTY ($n_origins origin(s), $n_keys key(s))." >&2
  echo "  Credentials were present, so this is a real sign-in failure — not the" >&2
  echo "  quiet local-run degradation auth.setup.ts allows when they are absent." >&2
  exit 1
fi

install -m 600 /dev/null "$OUT"
cat "$STATE_SRC" >"$OUT"
say "  minted $n_origins origin(s), $n_keys localStorage key(s) -> $OUT"
# stdout contract: the LAST line is the path, so a caller can capture it with
# `$(scripts/theme-session.sh --quiet)`.
printf '%s\n' "$OUT"
