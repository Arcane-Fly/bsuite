#!/usr/bin/env bash
# scripts/check-secret-naming.sh
#
# BSuite secret-naming drift guard.
# Canonical reference: AGENTS.md §Environment Variables
#   - Vite apps (BSU, crm7, R80.4, braden, throughput):
#       VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
#       (frontend reads via `import.meta.env.VITE_*`)
#   - Next.js apps (conduit):
#       NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#       (frontend reads via `process.env.NEXT_PUBLIC_*`)
#   - Server-side (edge fns, API routes, server actions):
#       SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#       (server reads via `process.env.*` or Deno.env.get)
#   - DEPRECATED everywhere: SUPABASE_ANON_KEY (Supabase rotated to PUBLISHABLE_KEY in 2025).
#
# This script enforces 5 rules across the parent monorepo AND each submodule:
#   R1) Vite-app source must NOT read `process.env.SUPABASE_*` (server-only names in client bundle).
#   R2) Vite-app source must NOT read `import.meta.env.NEXT_PUBLIC_SUPABASE_*` (wrong meta-framework).
#   R3) Next.js (conduit) consumer source must NOT use `import.meta.env` at all.
#   R4) No source may reference the deprecated `SUPABASE_ANON_KEY` (use `*_PUBLISHABLE_KEY` instead).
#   R5) No source may read `process.env.VITE_*` from the client bundle path.
#
# Exit codes:
#   0 — clean
#   1 — at least one drift violation found (diagnostic output on stderr)
#
# Allowlists below cover (a) the pre-existing drift state at the time this guard
# was introduced (tracked by bsuite#464) and (b) legitimate compat/migration code.
# DO NOT broaden the allowlist without filing a ticket. Once bsuite#464 lands the
# rename, individual lines can drop out of the allowlist one PR at a time.
#
# Comments may opt a line out of any rule with the marker:
#   // legacy compat — remove after YYYY-MM-DD
# or
#   # legacy compat — remove after YYYY-MM-DD
# The marker MUST appear on the same line as the offending reference.

set -u  # do not set -e — we want to aggregate violations across rules

REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$REPO_ROOT"

VITE_APPS=(business-suite-unified crm7 R80.4 braden throughput)
NEXT_APPS=(conduit)

# Source globs scanned per app — keep in sync with the workflow file.
# We intentionally restrict to runtime source (src/, app/, pages/, api/, supabase/functions/)
# so that .env.example, docs/, coverage/, README.md, archive/, and similar do not trigger.
SRC_GLOBS=(
  'src/**/*.ts'
  'src/**/*.tsx'
  'src/**/*.js'
  'src/**/*.jsx'
  'src/**/*.mjs'
  'src/**/*.cjs'
  'app/**/*.ts'
  'app/**/*.tsx'
  'app/**/*.js'
  'app/**/*.jsx'
  'pages/**/*.ts'
  'pages/**/*.tsx'
  'pages/**/*.js'
  'pages/**/*.jsx'
  'api/**/*.ts'
  'api/**/*.tsx'
  'api/**/*.js'
  'api/**/*.jsx'
  'supabase/functions/**/*.ts'
  'supabase/functions/**/*.js'
)

VIOLATIONS=0
DIAGNOSTICS=""

note() {
  DIAGNOSTICS="${DIAGNOSTICS}$1"$'\n'
}

# Allowlist entries are EXACT `<repo>/<path>:<line>` prefixes or `<repo>/<path>:*`
# wildcards. They snapshot the pre-bsuite#464 state — see bsuite#464 to retire
# them line-by-line.
ALLOWLIST=(
  # ---- R80.4 vite/vitest config fallback shims (intentional dual-path) ----
  'R80.4/vite.config.ts:*'
  'R80.4/vitest.config.ts:*'
  # ---- braden check-env scripts (utility, not bundled to client) ----
  'braden/scripts/check-env.cjs:*'
  'braden/scripts/check-env.js:*'
  'braden/cypress.config.ts:*'
  'braden/test-admin-post-migration.js:*'
  'braden/test-admin.js:*'
  # ---- braden mid-migration dual-read fallbacks in src/ (bsuite#464 cleanup) ----
  'braden/src/components/admin/hooks/usePagesData.ts:*'
  'braden/src/components/content/hooks/useContentForm.ts:*'
  'braden/src/components/content/hooks/useContentPages.ts:*'
  'braden/src/hooks/admin/useSiteEditorData.ts:*'
  'braden/src/integrations/supabase/client.ts:*'
  'braden/src/integrations/supabase/legacyTables.ts:*'
  'braden/src/lib/crmIntegration.js:*'
  'braden/src/lib/leadSync.js:*'
  'braden/src/lib/webhooks.js:*'
  'braden/src/services/adminCrudService.ts:*'
  'braden/src/services/pagesService.ts:*'
  # ---- crm7 mid-migration dual-read fallbacks in src/ (bsuite#464 cleanup) ----
  'crm7/src/lib/supabase.ts:*'
  'crm7/src/main.tsx:*'
  'crm7/src/services/emailService.ts:*'
  # ---- crm7 server-side API routes (Vercel functions, process.env is correct) ----
  'crm7/api/ai/chat.ts:*'
  'crm7/api/ai/rate-review.ts:*'
  'crm7/api/ai/__tests__/rate-review.cors-preflight.test.ts:*'
  'crm7/api/config.ts:*'
  'crm7/api/db/[...path].ts:*'
  'crm7/api/rpc/[...path].ts:*'  # W3 RPC edge proxy — same server env pattern as api/db
  'crm7/api/health.ts:*'
  'crm7/api/ai/docs-gap-issue.ts:*'
  # ---- throughput server-side API routes (Vercel functions, process.env is correct) ----
  # throughput/vercel.json declares `functions: { "api/**/*.{js,ts}": ... }`, so
  # this is a serverless runtime, not Vite client source: `process.env` is the
  # ONLY way to read config there and the server-side names are canonical per
  # AGENTS.md. Byte-for-byte the same three-tier fallback as the already-listed
  # crm7/api/config.ts. It was missing only because throughput's api/ directory
  # post-dates this allowlist, so the rule started firing on a file that was
  # correct the whole time.
  'throughput/api/llm/_shared/auth.ts:*'
  # ---- crm7 server-side AI tools (edge functions, process.env is correct) ----
  'crm7/src/lib/ai/tools/ui-builder-tools.ts:*'
  'crm7/src/lib/ai/tools/ui-builder-tools.test.ts:*'
  # ---- conduit ANON_KEY fallback in src/lib/supabase/cacheable.ts (bsuite#464 cleanup) ----
  'conduit/src/lib/supabase/cacheable.ts:*'
  # ---- BSU edge functions reading SUPABASE_ANON_KEY (bsuite#464 cleanup; runtime-injected by Supabase) ----
  'business-suite-unified/supabase/functions/email-dispatcher/index.ts:*'
  'business-suite-unified/supabase/functions/feature-builder-ai/index.ts:*'
  'business-suite-unified/supabase/functions/feature-builder-export/index.ts:*'
  'business-suite-unified/supabase/functions/generate-document/index.ts:*'
  'business-suite-unified/supabase/functions/idea-assistant/index.ts:*'
  'business-suite-unified/supabase/functions/send-notification/index.ts:*'
  # ---- crm7 edge functions reading SUPABASE_ANON_KEY (bsuite#464 cleanup) ----
  'crm7/supabase/functions/avetmiss-export/index.ts:*'
  'crm7/supabase/functions/generate-document/index.ts:*'
  'crm7/supabase/functions/tga-search/index.ts:*'
  'crm7/supabase/functions/charge-rate-quote-dispatch/index.ts:*'
  # ---- braden edge functions reading SUPABASE_ANON_KEY (bsuite#464 cleanup) ----
  'braden/supabase/functions/add-admin-user/index.ts:*'
  'braden/supabase/functions/list-hero-images/index.ts:*'
  # ---- throughput deploy-database utility script (Node script, not bundled) ----
  'throughput/src/scripts/deploy-database.js:*'
  # ---- THE canonical key resolver — the one place allowed to name every variant ----
  # This helper exists precisely to centralise the fallback chain that R4 and R6
  # police everywhere else: platform-injected SUPABASE_PUBLISHABLE_KEYS first,
  # then the injected SUPABASE_ANON_KEY (which this project's 2026-04-22
  # legacy-key disable re-pointed at the modern publishable key), then the
  # local-CLI-only singular name. Exempting it is not a broadening of the
  # amnesty: every OTHER file gets stricter, because they now route through here
  # instead of reading the unsettable name directly. Tracked by bsuite#465.
  'crm7/supabase/functions/_shared/supabase-keys.ts:*'
  'business-suite-unified/supabase/functions/_shared/supabase-keys.ts:*'
  # ...and its tests, which must NAME every variant in order to assert the
  # precedence between them. A test that cannot mention `SUPABASE_ANON_KEY` is a
  # test that cannot pin the fallback that is currently load-bearing.
  'crm7/supabase/functions/_shared/__tests__/supabase-keys.test.ts:*'
  'business-suite-unified/supabase/functions/_shared/__tests__/supabase-keys.test.ts:*'
  # ---- BSU e2e test infrastructure (Playwright, runs in Node) ----
  'business-suite-unified/tests/e2e/cross-app-org-creation.spec.ts:*'
  'business-suite-unified/tests/e2e/phase1-braden-lead-notification.spec.ts:*'
)

is_allowlisted() {
  # arg1: <repo>/<path>:<line>
  local entry="$1"
  local path_part="${entry%:*}"
  local line_part="${entry##*:}"
  for allowed in "${ALLOWLIST[@]}"; do
    local a_path="${allowed%:*}"
    local a_line="${allowed##*:}"
    if [ "$a_path" = "$path_part" ]; then
      if [ "$a_line" = "*" ] || [ "$a_line" = "$line_part" ]; then
        return 0
      fi
    fi
  done
  return 1
}

# Filter grep output (path:line:content) through allowlist + same-line marker.
filter_matches() {
  local prefix="$1"  # e.g. "crm7/" or "" for parent
  while IFS= read -r raw; do
    [ -z "$raw" ] && continue
    # Same-line marker check
    if printf '%s' "$raw" | grep -qE 'legacy compat — remove after [0-9]{4}-[0-9]{2}-[0-9]{2}'; then
      continue
    fi
    # Strip content past the second colon to get path:line
    local pathline
    pathline=$(printf '%s' "$raw" | awk -F: '{print $1 ":" $2}')
    local with_prefix="${prefix}${pathline}"
    if is_allowlisted "$with_prefix"; then
      continue
    fi
    printf '%s%s\n' "$prefix" "$raw"
  done
}

run_git_grep() {
  # arg1: repo path ("." for parent or submodule dir)
  # arg2: pattern
  # remaining args: pathspecs
  local repo="$1"; shift
  local pattern="$1"; shift
  ( cd "$repo" && git grep -nE "$pattern" -- "$@" 2>/dev/null ) || true
}

# ---- R1: Vite-app source must NOT read process.env.SUPABASE_* ----
check_r1() {
  local issues=""
  for app in "${VITE_APPS[@]}"; do
    [ -d "$app" ] || continue
    local prefix="${app}/"
    local matches
    matches=$(run_git_grep "$app" \
      'process\.env\.(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY)' \
      "${SRC_GLOBS[@]}" | filter_matches "$prefix")
    if [ -n "$matches" ]; then
      issues="${issues}${matches}"$'\n'
    fi
  done
  if [ -n "$issues" ]; then
    note "R1 VIOLATION — Vite-app source reads server-only \`process.env.SUPABASE_*\` (use \`import.meta.env.VITE_SUPABASE_*\` instead):"
    note "$issues"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# ---- R2: Vite-app source must NOT read import.meta.env.NEXT_PUBLIC_SUPABASE_* ----
check_r2() {
  local issues=""
  for app in "${VITE_APPS[@]}"; do
    [ -d "$app" ] || continue
    local prefix="${app}/"
    local matches
    matches=$(run_git_grep "$app" \
      'import\.meta\.env\.NEXT_PUBLIC_SUPABASE_' \
      "${SRC_GLOBS[@]}" | filter_matches "$prefix")
    if [ -n "$matches" ]; then
      issues="${issues}${matches}"$'\n'
    fi
  done
  if [ -n "$issues" ]; then
    note "R2 VIOLATION — Vite-app source reads \`import.meta.env.NEXT_PUBLIC_SUPABASE_*\` (wrong meta-framework, use \`VITE_SUPABASE_*\`):"
    note "$issues"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# ---- R3: Next.js consumer source must NOT use import.meta.env ----
check_r3() {
  local issues=""
  for app in "${NEXT_APPS[@]}"; do
    [ -d "$app" ] || continue
    local prefix="${app}/"
    # Scan non-edge source only — Deno edge fns may legitimately use import.meta
    # but they do not use Vite. We exclude supabase/functions/ explicitly.
    local matches
    matches=$(
      ( cd "$app" && git grep -nE 'import\.meta\.env' -- \
          'src/**/*.ts' 'src/**/*.tsx' 'src/**/*.js' 'src/**/*.jsx' \
          'app/**/*.ts' 'app/**/*.tsx' 'app/**/*.js' 'app/**/*.jsx' \
          'pages/**/*.ts' 'pages/**/*.tsx' 'pages/**/*.js' 'pages/**/*.jsx' \
          ':!supabase/functions/**' 2>/dev/null
      ) | filter_matches "$prefix"
    )
    if [ -n "$matches" ]; then
      issues="${issues}${matches}"$'\n'
    fi
  done
  if [ -n "$issues" ]; then
    note "R3 VIOLATION — Next.js consumer source uses \`import.meta.env\` (wrong meta-framework, use \`process.env.NEXT_PUBLIC_*\`):"
    note "$issues"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# ---- R4: Deprecated SUPABASE_ANON_KEY references in source ----
check_r4() {
  local issues=""
  for app in "${VITE_APPS[@]}" "${NEXT_APPS[@]}"; do
    [ -d "$app" ] || continue
    local prefix="${app}/"
    local matches
    matches=$(run_git_grep "$app" \
      '(VITE_|NEXT_PUBLIC_)?SUPABASE_ANON_KEY' \
      "${SRC_GLOBS[@]}" | filter_matches "$prefix")
    if [ -n "$matches" ]; then
      issues="${issues}${matches}"$'\n'
    fi
  done
  # Parent monorepo source (e.g. shared packages, scripts/)
  local parent_matches
  parent_matches=$(git grep -nE '(VITE_|NEXT_PUBLIC_)?SUPABASE_ANON_KEY' -- \
      'packages/**/src/**/*.ts' 'packages/**/src/**/*.tsx' \
      'packages/**/src/**/*.js' 'packages/**/src/**/*.jsx' \
      'scripts/**/*.ts' 'scripts/**/*.mjs' 'scripts/**/*.js' \
      2>/dev/null | filter_matches "")
  if [ -n "$parent_matches" ]; then
    issues="${issues}${parent_matches}"$'\n'
  fi
  if [ -n "$issues" ]; then
    note "R4 VIOLATION — deprecated \`SUPABASE_ANON_KEY\` referenced in source (Supabase rotated to PUBLISHABLE_KEY in 2025; in CLIENT source use \`VITE_SUPABASE_PUBLISHABLE_KEY\` / \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\`; in EDGE FUNCTIONS use the \`getPublishableKey()\` helper — see R6, the bare \`SUPABASE_PUBLISHABLE_KEY\` is unsettable there):"
    note "$issues"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# ---- R6: the UNSETTABLE bare SUPABASE_PUBLISHABLE_KEY inside edge functions ----
#
# Added 2026-08-06 after a live outage. `supabase secrets set` REFUSES the name:
#
#   $ supabase secrets set SUPABASE_PUBLISHABLE_KEY=... --project-ref tuybltdrdefjblnplpqo
#   Env name cannot start with SUPABASE_, skipping: SUPABASE_PUBLISHABLE_KEY
#
# The `SUPABASE_` prefix is reserved by the platform, so on hosted runtimes that
# variable can never hold a value. Per the Supabase docs the platform injects the
# PLURAL `SUPABASE_PUBLISHABLE_KEYS` (a JSON dictionary); the singular form is
# documented only as a local-CLI fallback.
#
# 16 crm7 edge functions had been migrated onto the singular name — BY THIS VERY
# GUARD, whose R4 diagnostic recommended it — and every one of them silently
# resolved to `''`. An empty apikey is a hard gateway 401
# (`{"message":"No API key found in request"}`), and `handover-to-employment`,
# which guards on the value, returned HTTP 500 on every production call.
#
# This rule is deliberately scoped to `supabase/functions/**`: in Vite/Next
# CLIENT source the `VITE_`/`NEXT_PUBLIC_` prefixed publishable names are correct
# and settable, and R1/R2/R5 already govern those.
check_r6() {
  local issues=""
  for app in "${VITE_APPS[@]}" "${NEXT_APPS[@]}"; do
    [ -d "$app" ] || continue
    local prefix="${app}/"
    local matches
    matches=$(
      ( cd "$app" && git grep -nE "(Deno\.env\.get\(['\"]|process\.env\.)SUPABASE_PUBLISHABLE_KEY['\"]?" -- \
          'supabase/functions/**/*.ts' 'supabase/functions/**/*.js' 2>/dev/null
      ) | filter_matches "$prefix"
    )
    if [ -n "$matches" ]; then
      issues="${issues}${matches}"$'\n'
    fi
  done
  if [ -n "$issues" ]; then
    note "R6 VIOLATION — edge function reads the UNSETTABLE \`SUPABASE_PUBLISHABLE_KEY\`. The \`SUPABASE_\` prefix is reserved, so \`supabase secrets set\` refuses this name and it resolves to '' on every hosted invocation (→ gateway 401 'No API key found in request'). Use the \`getPublishableKey()\` helper from \`supabase/functions/_shared/supabase-keys.ts\`, which reads the platform-injected \`SUPABASE_PUBLISHABLE_KEYS\` dictionary:"
    note "$issues"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# ---- R5: process.env.VITE_* (Vite vars must use import.meta.env) ----
check_r5() {
  local issues=""
  for app in "${VITE_APPS[@]}"; do
    [ -d "$app" ] || continue
    local prefix="${app}/"
    local matches
    matches=$(run_git_grep "$app" \
      'process\.env\.VITE_' \
      "${SRC_GLOBS[@]}" | filter_matches "$prefix")
    if [ -n "$matches" ]; then
      issues="${issues}${matches}"$'\n'
    fi
  done
  if [ -n "$issues" ]; then
    note "R5 VIOLATION — source reads \`process.env.VITE_*\` (Vite-prefixed vars must use \`import.meta.env.VITE_*\`):"
    note "$issues"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

check_r1
check_r2
check_r3
check_r4
check_r5
check_r6

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "secret-naming drift check: PASS (canonical names per AGENTS.md §Environment Variables)"
  exit 0
fi

{
  echo "secret-naming drift check: FAIL — ${VIOLATIONS} rule(s) violated"
  echo ""
  echo "$DIAGNOSTICS"
  echo "Canonical naming per AGENTS.md §Environment Variables:"
  echo "  Vite apps (BSU, crm7, R80.4, braden, throughput): import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY"
  echo "  Next.js (conduit):                              process.env.NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  echo "  Server-side (API routes):                       SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
  echo "  Edge functions, publishable key:                getPublishableKey() from _shared/supabase-keys.ts"
  echo "                                                  (reads the platform-injected SUPABASE_PUBLISHABLE_KEYS dictionary)"
  echo "  NEVER in client source:                         SUPABASE_ANON_KEY (deprecated since Supabase 2025 rotation)"
  echo "  NEVER in an edge function:                      bare SUPABASE_PUBLISHABLE_KEY — the SUPABASE_ prefix is"
  echo "                                                  reserved, so this name is UNSETTABLE and always resolves to ''"
  echo ""
  echo "To opt a single line out (e.g. for a documented legacy compat shim), add:"
  echo "    // legacy compat — remove after YYYY-MM-DD"
  echo "as a same-line comment. Without a same-line marker, the line will fail CI."
  echo ""
  echo "Tracking: bsuite#465 (this guard) / bsuite#464 (the rename work)."
} >&2

exit 1
