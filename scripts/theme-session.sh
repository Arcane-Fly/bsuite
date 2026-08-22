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
# THIS SCRIPT DOES NOT REIMPLEMENT ANY OF THAT. It runs each app's own
# `tests/e2e/auth.setup.ts` through that app's own Playwright config and copies
# out the storageState that setup project writes. A second implementation of a
# sign-in helper is a second thing to rot: the token endpoint, the grant shape
# and the per-app storage key would then live in two places and drift silently,
# and the drift would present as a green gate over an anonymous sweep — exactly
# the failure crm7's helper was rebuilt to kill.
#
# FIVE APPS, NOT ONE (V-9, 2026-08-19)
# crm7 was the only app with a session producer until this pass. Four more now
# have their own tests/e2e/auth.setup.ts, ported (not reimplemented) from
# crm7's: braden and throughput are BS OAuth CLIENTS exactly like crm7, so they
# use the identical mechanism (Supabase password grant, session seeded into
# localStorage under each app's own default storageKey). conduit is also a BS
# OAuth client but its Supabase browser client is `@supabase/ssr`, whose
# storage is COOKIES — its auth.setup.ts writes the session in that wire
# format instead (see the long comment in conduit/tests/e2e/auth.setup.ts for
# how that format was derived and verified against the real package).
# business-suite-unified is the OAuth SERVER, not a client, so its own
# auth.setup.ts drives its native `/login` FORM rather than a password grant —
# that already existed (PR #142) and did not need porting, only a credential
# fallback (see business-suite-unified/tests/e2e/auth.setup.ts) so it does not
# need a brand-new secret to be useful here.
#
# R80.4 JOINED ON 2026-08-22 (R80.4#187). It was the last app out, and the note that
# used to sit here said it bridges auth via a `bs_*` pair "of a different shape". That
# was true and it was not the obstacle: R8 does keep `bs_oauth_*` keys, but its Supabase
# session lives under `sb-r8-auth` — it is the ONLY app in the estate that overrides
# `storageKey`, where the other five let supabase-js fall back to
# `sb-<project-ref>-auth-token`. Seed the default key there and you write a session the
# app never reads, which looks exactly like a sign-in that quietly failed.
#
# The real obstacle was that R8 had no `@playwright/test`, no config and no `tests/`
# directory at all — so the "port one file" advice this estate printed on every route
# sweep could never have worked.
#
# CREDENTIALS ARE SHARED ON PURPOSE. Every app below reads CRM7_E2E_EMAIL /
# CRM7_E2E_PASSWORD (business-suite-unified falls back to them; the other four
# use them directly) rather than a per-app pair, because the whole estate
# shares ONE Supabase project (tuybltdrdefjblnplpqo) and that account was
# verified live against every app's own login path. This means the workflow
# that already exports these four secrets for crm7 covers all five apps with
# no new secret to provision.
#
# WHY A DEPLOYED TARGET AND NOT A LOCAL SERVER
# `--base-url` defaults to each app's `d.`-prefixed development domain. Every
# app's playwright.config.ts boots a local dev/preview server for any
# localhost target, which needs a `dist/`/install that a fresh checkout does
# not have; pointing at a real origin skips that block entirely. It also means
# the storageState's `origins[]`/`cookies[]` entries match the origin the sweep
# then visits — Playwright replays a stored session only against the exact
# origin (and, for cookies, domain) it was minted for.
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

# Per-app producer config: Playwright project name, the storageState file that
# project writes (relative to the app dir), and the default deployed base URL.
# R80.4 joined on 2026-08-22 (R80.4#187) — see the header note above.
declare -A PROJECT_NAME=(
  [crm7]=auth-setup
  [braden]=auth-setup
  [throughput]=auth-setup
  [conduit]=auth-setup
  [business-suite-unified]=setup
  [R80.4]=setup
)
declare -A STATE_REL=(
  [crm7]=playwright/.auth/user.json
  [braden]=playwright/.auth/user.json
  [throughput]=playwright/.auth/user.json
  [conduit]=playwright/.auth/user.json
  [business-suite-unified]=playwright/.auth/developer.json
  [R80.4]=playwright/.auth/user.json
)
declare -A DEFAULT_BASE_URL=(
  [crm7]=https://d.crm.crm7.app
  [braden]=https://d.braden.com.au
  [throughput]=https://d.ideas.crm7.app
  [conduit]=https://d.conduit.crm7.app
  [business-suite-unified]=https://d.suite.crm7.app
  [R80.4]=https://d.r8.crm7.app
)

if [[ -z ${PROJECT_NAME[$APP]:-} ]]; then
  echo "theme-session: no session producer exists for '$APP'." >&2
  echo "  Supported: ${!PROJECT_NAME[*]}" >&2
  echo "  Each one has its own tests/e2e/auth.setup.ts. Porting that file to a" >&2
  echo "  new app is what unlocks a signed-in sweep there; this script" >&2
  echo "  deliberately does not invent a generic sign-in path." >&2
  exit 2
fi

BASE_URL_VAR="THEME_GATE_BASE_URL_$(printf '%s' "$APP" | tr '[:lower:].-' '[:upper:]__')"
: "${BASE_URL:=${!BASE_URL_VAR:-${DEFAULT_BASE_URL[$APP]}}}"
: "${OUT:=${XDG_RUNTIME_DIR:-/tmp}/bsuite-theme-session-$APP.json}"

SETUP_SPEC="$REPO_ROOT/$APP/tests/e2e/auth.setup.ts"
STATE_SRC="$REPO_ROOT/$APP/${STATE_REL[$APP]}"

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

# ── run the app's own auth setup project ────────────────────────────────────
PROJECT=${PROJECT_NAME[$APP]}
say "theme-session: minting a session for $APP against $BASE_URL"
say "  via $APP/tests/e2e/auth.setup.ts (consumed, not reimplemented)"
rm -f "$STATE_SRC"
log=$(mktemp)
if ! ( cd "$REPO_ROOT/$APP" && PLAYWRIGHT_BASE_URL="$BASE_URL" \
        timeout 300 pnpm exec playwright test --project="$PROJECT" --reporter=line ) \
        >"$log" 2>&1; then
  echo "theme-session: $APP $PROJECT FAILED — see below." >&2
  tail -25 "$log" >&2
  rm -f "$log"
  exit 1
fi
rm -f "$log"

if [[ ! -f $STATE_SRC ]]; then
  echo "theme-session: $PROJECT exited 0 but wrote no state at $STATE_SRC" >&2
  exit 1
fi

# ── prove the state is not the empty one ────────────────────────────────────
# `{"cookies":[],"origins":[]}` is a legal storageState and Playwright loads it
# without complaint. Counting what is actually in it is the difference between
# a session and a file shaped like one.
#
# TWO SHAPES COUNT, not one. Every app but conduit seeds localStorage, so
# `origins[].localStorage` is where the real content lives. conduit seeds
# COOKIES (`@supabase/ssr`'s own storage), so its `origins[]` array is
# legitimately empty and the content lives in the top-level `cookies[]` array
# instead. Checking only `origins` would misreport every conduit run as an
# empty-state failure even when the cookie write succeeded.
read -r n_origins n_keys < <(node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
  const origins = s.origins ?? []
  const cookies = s.cookies ?? []
  const localKeys = origins.reduce((n, o) => n + (o.localStorage ?? []).length, 0)
  const keys = localKeys + cookies.length
  process.stdout.write(`${origins.length + (cookies.length > 0 ? 1 : 0)} ${keys}\n`)
' "$STATE_SRC")

if [[ ${n_origins:-0} -eq 0 || ${n_keys:-0} -eq 0 ]]; then
  echo "theme-session: the minted state is EMPTY ($n_origins origin(s)/domain(s), $n_keys key(s)/cookie(s))." >&2
  echo "  Credentials were present, so this is a real sign-in failure — not the" >&2
  echo "  quiet local-run degradation auth.setup.ts allows when they are absent." >&2
  exit 1
fi

install -m 600 /dev/null "$OUT"
cat "$STATE_SRC" >"$OUT"
say "  minted $n_origins origin(s)/domain(s), $n_keys key(s)/cookie(s) -> $OUT"
# stdout contract: the LAST line is the path, so a caller can capture it with
# `$(scripts/theme-session.sh --quiet)`.
printf '%s\n' "$OUT"
