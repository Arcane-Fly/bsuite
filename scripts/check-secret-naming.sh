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
#   - Server-side API routes (Vercel functions): SUPABASE_URL, SUPABASE_SECRET_KEY
#       (SUPABASE_SERVICE_ROLE_KEY is the legacy name for the same credential —
#       see R1 below; crm7/api/ai/_shared/usageWriter.ts is the live consumer)
#   - EDGE FUNCTIONS: do not read a key name directly. Use `getPublishableKey()`
#       from `supabase/functions/_shared/supabase-keys.ts`.
#
#       READ THIS BEFORE EDITING R4 OR R6. In an Edge Function the PLATFORM sets
#       the environment, not you. `supabase secrets set` REFUSES any name with the
#       reserved `SUPABASE_` prefix:
#           Env name cannot start with SUPABASE_, skipping: SUPABASE_PUBLISHABLE_KEY
#       So `SUPABASE_PUBLISHABLE_KEY` is UNSETTABLE on hosted and always resolves
#       to ''. The platform injects the PLURAL `SUPABASE_PUBLISHABLE_KEYS` instead.
#
#       And on THIS project `SUPABASE_ANON_KEY` is NOT dead: the 2026-04-22
#       legacy-key disable made Supabase re-point that injected variable at the
#       modern publishable key (verified by digest against the live secret list).
#       It is the WORKING name in an edge function. R4 therefore scopes its ban to
#       CLIENT source; R6 owns edge functions and bans the unsettable name.
#
#       This is not theory. Between 2026-06-05 and 2026-08-06 an earlier version of
#       R4's diagnostic told authors to use the unsettable name, and 18 edge
#       functions across crm7 and BSU were migrated onto it — each commit citing
#       this guard. Every one sent an empty apikey, which the gateway rejects
#       before any handler runs, and it read at the call site as an expired
#       session. A gate that fires and is obeyed can be worse than one that never
#       fires. If you change a rule here, first try to SET the name it mandates and
#       read the refusal.
#
# This script enforces 6 rules across the parent monorepo AND each submodule:
#   R1) Vite-app source must NOT read `process.env.SUPABASE_*` (server-only names in client bundle,
#       including `SUPABASE_SECRET_KEY` — the modern replacement for `SUPABASE_SERVICE_ROLE_KEY`,
#       added 2026-09-04 after it read by omission; see crm7/api/ai/_shared/usageWriter.ts).
#   R2) Vite-app source must NOT read `import.meta.env.NEXT_PUBLIC_SUPABASE_*` (wrong meta-framework).
#   R3) Next.js (conduit) consumer source must NOT use `import.meta.env` at all.
#   R4) CLIENT source must NOT reference `SUPABASE_ANON_KEY` (use the `VITE_`/`NEXT_PUBLIC_`
#       prefixed publishable names). Edge functions are governed by R6, not by this.
#   R5) No source may read `process.env.VITE_*` from the client bundle path.
#   R6) An edge function must NOT read the bare, unsettable `SUPABASE_PUBLISHABLE_KEY`.
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

# Which submodules are actually checked out.
#
# `[ -d "$sub" ]` is NOT this question and was the bug: an uninitialised
# submodule is an EMPTY DIRECTORY, which passes `-d`. Every rule below then ran
# `cd "$sub" && git grep`, which git resolves against the PARENT repo — matching
# nothing, because the parent tracks a gitlink and no files underneath it. The
# whole check therefore reported a confident PASS on a tree it had not read.
#
# `rev-parse --git-dir` does not answer it either: run inside an empty submodule
# directory it WALKS UP and reports the parent's git dir, so it succeeds for a
# submodule that is not there. The only sound test is whether the repository
# rooted at that path IS that path.
is_initialised_submodule() {
  local sub="$1" top
  top=$(git -C "$sub" rev-parse --show-toplevel 2>/dev/null) || return 1
  [ "$top" = "${REPO_ROOT}/${sub}" ]
}

# Space-separated on purpose: the membership test below is a `case` glob against
# `" $ALL_SUBMODULES "`, which needs a SPACE either side of each name. Leaving the
# newlines that `awk` emits makes `*" crm7 "*` fail to match, every allowlist path
# then falls back to being parent-relative, and R0 declares all 52 entries dead.
ALL_SUBMODULES=$(git config --file .gitmodules --get-regexp '^submodule\..*\.path$' 2>/dev/null | awk '{print $2}' | tr '\n' ' ')
UNSCANNED=""
for _sub in $ALL_SUBMODULES; do
  is_initialised_submodule "$_sub" || UNSCANNED="${UNSCANNED} ${_sub}"
done

# Source globs scanned per app — keep in sync with the workflow file.
# `:(glob)` is deliberate: a DEFAULT git pathspec treats `src/**/*.ts` as
# fnmatch without FNM_PATHNAME, so it needs a second slash and silently skips
# every file directly under src/ or api/ (19 root-level src files and
# R80.4/api/fwc.js were never scanned before 2026-09-04). With `:(glob)`,
# `**` is any depth including zero.
# We intentionally restrict to runtime source (src/, app/, pages/, api/, supabase/functions/)
# so that .env.example, docs/, coverage/, README.md, archive/, and similar do not trigger.
SRC_GLOBS=(
  ':(glob)src/**/*.ts'
  ':(glob)src/**/*.tsx'
  ':(glob)src/**/*.js'
  ':(glob)src/**/*.jsx'
  ':(glob)src/**/*.mjs'
  ':(glob)src/**/*.cjs'
  ':(glob)app/**/*.ts'
  ':(glob)app/**/*.tsx'
  ':(glob)app/**/*.js'
  ':(glob)app/**/*.jsx'
  ':(glob)pages/**/*.ts'
  ':(glob)pages/**/*.tsx'
  ':(glob)pages/**/*.js'
  ':(glob)pages/**/*.jsx'
  ':(glob)api/**/*.ts'
  ':(glob)api/**/*.tsx'
  ':(glob)api/**/*.js'
  ':(glob)api/**/*.jsx'
  ':(glob)supabase/functions/**/*.ts'
  ':(glob)supabase/functions/**/*.js'
)

# R4's scope: CLIENT source only — everything above EXCEPT edge functions.
#
# R4's own header has always said "Edge functions are governed by R6, not by
# this", but it scanned SRC_GLOBS, which includes `supabase/functions/**`. So it
# policed the one place its documentation disclaims, and the one place where the
# name it bans is the WORKING name: on this project the 2026-04-22 legacy-key
# disable re-pointed the injected `SUPABASE_ANON_KEY` at the publishable key.
# That is not a hypothetical cost — the header records 18 edge functions migrated
# off it onto the unsettable `SUPABASE_PUBLISHABLE_KEY`, each commit citing this
# guard, every one of them then sending an empty apikey.
#
# It also cost a correct fix: crm7#1672 moved `crm7-generate-document` onto
# `getPublishableKey()` — exactly what the diagnostic asks for — and R4 still
# failed it, on the COMMENT explaining why the old name was wrong. A guard that
# forbids naming the thing it bans cannot be documented around.
#
# R6 continues to own edge functions and is unchanged.
CLIENT_SRC_GLOBS=()
for _glob in "${SRC_GLOBS[@]}"; do
  case "$_glob" in
    supabase/functions/*) ;;
    *) CLIENT_SRC_GLOBS+=("$_glob") ;;
  esac
done
unset _glob

VIOLATIONS=0
DIAGNOSTICS=""

note() {
  DIAGNOSTICS="${DIAGNOSTICS}$1"$'\n'
}

# Allowlist entries are EXACT `<repo>/<path>:<line>` prefixes or `<repo>/<path>:*`
# wildcards. They snapshot the pre-bsuite#464 state — see bsuite#464 to retire
# them line-by-line.
ALLOWLIST=(
  # ---- braden check-env scripts (utility, not bundled to client) ----
  'braden/scripts/check-env.cjs:*'
  'braden/cypress.config.ts:*'
  'braden/test-admin-post-migration.js:*'
  'braden/test-admin.js:*'
  # ---- braden mid-migration dual-read fallbacks in src/ (bsuite#464 cleanup) ----
  'braden/src/components/admin/hooks/usePagesData.ts:*'
  'braden/src/components/content/hooks/useContentForm.ts:*'
  'braden/src/components/content/hooks/useContentPages.ts:*'
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
  # `workflow-tools.ts` is the second member of exactly this category, added by
  # the workflow-canvas Phase 1 work. Its `createScopedSupabaseClient` is the
  # same function as `ui-builder-tools.ts`'s, deliberately so: the implementation
  # plan names ui-builder-tools as THE template for "one engine, two callers".
  # It is server-only by construction — `src/lib/ai/tools/index.ts` is the tool
  # registry, and its ONLY importer estate-wide is `api/ai/chat.ts`, a Vercel
  # serverless function. Nothing here reaches the client bundle, so `process.env`
  # with the server-canonical names is right and `import.meta.env.VITE_*` would
  # be wrong. Same shape as the throughput/api entry above: the rule started
  # firing on a file that was correct the whole time, because the file
  # post-dates the allowlist. Retire with the rest under bsuite#464.
  'crm7/src/lib/ai/tools/workflow-tools.ts:*'
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
    # A comment NAMING a variable is documentation of it, not a read of it.
    #
    # These rules police what the runtime does. `git grep` has no idea what a
    # comment is, so until now the sentence "SUPABASE_ANON_KEY happens to work
    # on this project only because the 2026-04-22 legacy-key disable re-pointed
    # it at the publishable key" — precisely the explanation an author most
    # needs to leave behind, and which the header of this very file spends
    # fifteen lines making — was itself a violation. The guard punished the
    # documentation of the hazard it exists to prevent, so the incentive it
    # created was to delete the warning.
    #
    # This is the estate's recurring prose-vs-code confusion, running the other
    # way. The familiar direction is a guard SATISFIED by prose: crm7's OAuth
    # session-sync check passed with both real `setSession()` calls deleted,
    # contented by a single doc comment. Same root cause — matching text when
    # the question is about code — and both directions are defects.
    #
    # Line-level, deliberately. A trailing comment after real code still
    # reports, because that line DOES contain code. The residual failure mode
    # is therefore a false positive an author can see and reword, never a
    # missed read. Anything stronger needs a parser per language, and the
    # globs above span five file types.
    code_part=${raw#*:}        # strip "path:"
    code_part=${code_part#*:}  # strip "line:"
    code_part=${code_part#"${code_part%%[![:space:]]*}"}
    case "$code_part" in
      '//'*|'/*'*|'*'*) continue ;;
    esac
    # Test files are not runtime source and never reach a bundle.
    #
    # These rules restrict themselves to "runtime source (src/, app/, pages/,
    # api/, supabase/functions/)" by their own comment above, so that docs and
    # .env.example do not trigger. A *.test.ts file sits inside src/ but is no
    # more shipped than a doc is.
    #
    # This matters because in Vitest, assigning process.env.VITE_* is the
    # SUPPORTED way to control what import.meta.env resolves to. R5 forbids
    # exactly that, so a correctly-written test of Vite env handling could only
    # pass by claiming to be "legacy compat — remove after <date>": a marker
    # that is false when written and expires on code that is permanent.
    # R80.4's business-suite-origin.test.ts — the test proving the sign-out fix
    # sends users to the origin that issued their session — hit precisely this.
    #
    # This narrows the glob to the rule's OWN stated intent. It is NOT a
    # broadening of the allowlist, which the header rightly asks to be filed
    # against a ticket: no line is being excused, the scan is being pointed at
    # the set it always said it covered.
    case "$raw" in
      *.test.ts:*|*.test.tsx:*|*.test.js:*|*.test.jsx:*|\
      *.spec.ts:*|*.spec.tsx:*|*.spec.js:*|*.spec.jsx:*|\
      */__tests__/*|*/__mocks__/*)
        continue
        ;;
    esac
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


# A Vite app may declare a serverless runtime beside its client bundle
# (`vercel.json` -> `functions: { "api/**/*.ts": ... }`). Files under such a
# directory run on the server: `process.env.SUPABASE_*` is the canonical read
# there (AGENTS.md §Environment Variables, "Server-side (API routes)"), so R1
# exempts them by DECLARATION rather than by a per-file allowlist entry that has
# to be added after the rule fires on a file that was correct the whole time
# (crm7/api/*, throughput/api/llm/_shared/auth.ts, crm7/api/ai/_shared/usageWriter.ts).
serverless_dirs_for() {
  local app="$1"
  [ -f "$app/vercel.json" ] || return 0
  node -e '
    const fs = require("fs");
    let cfg; try { cfg = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch { process.exit(0); }
    const dirs = new Set();
    for (const glob of Object.keys(cfg.functions || {})) {
      const top = glob.split("/")[0];
      if (top && !top.includes("*") && !top.includes("{")) dirs.add(top);
    }
    process.stdout.write([...dirs].join("|"));
  ' "$app/vercel.json"
}

# ---- R1: Vite-app source must NOT read process.env.SUPABASE_* ----
#
# `SUPABASE_SECRET_KEY` joined this list 2026-09-04 (FOLLOW 65). It is the
# modern replacement for `SUPABASE_SERVICE_ROLE_KEY` — same server-only
# credential, new opaque name (`sb_secret_…` instead of an HS256 JWT). R1's
# pattern named the legacy name only, so a Vite client reading the modern
# name would have passed by omission — exactly the shape of gap this guard
# exists to close. `crm7/api/ai/_shared/usageWriter.ts` is the one live
# consumer of the modern name today, and it is already exempt by the
# `serverless_dirs_for` mechanism below (it lives under `crm7/api/`, a
# declared serverless dir) — this addition changes what CLIENT code is
# banned from reading, not that file's own server-side read.
check_r1() {
  local issues=""
  for app in "${VITE_APPS[@]}"; do
    [ -d "$app" ] || continue
    local prefix="${app}/"
    local matches
    matches=$(run_git_grep "$app" \
      'process\.env\.(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)' \
      "${SRC_GLOBS[@]}" | filter_matches "$prefix")
    local serverless
    serverless=$(serverless_dirs_for "$app")
    if [ -n "$serverless" ] && [ -n "$matches" ]; then
      matches=$(printf '%s\n' "$matches" | grep -vE "^${app}/(${serverless})/" || true)
    fi
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
      "${CLIENT_SRC_GLOBS[@]}" | filter_matches "$prefix")
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

# ---- R0: every allowlist entry must name a file that is actually scanned ----
#
# WHY THIS EXISTS. The allowlist is keyed on PATH, so it breaks in two opposite
# ways when a file moves — and only one of them is visible:
#
#   RENAMED -> the exemption stops matching and the rule fires. LOUD. This is how
#              R0 came to be written: crm7#1669 renamed `generate-document` to
#              `crm7-generate-document` to clear an edge-function slug collision,
#              and a deliberate, documented exemption silently stopped applying.
#              (Chasing that failure turned up two live defects in the renamed
#              function — crm7#1672 — so the loud direction earns its keep.)
#
#   DELETED -> the exemption matches nothing, forever, and NOTHING SAYS SO. This
#              is the dangerous direction. 4 of the 52 entries were already dead
#              when R0 was written, against files removed months earlier.
#
# A dead entry is not untidiness. It is a STANDING GRANT: recreate a file at that
# exact path and it is exempt on arrival, with no review. It also inflates the
# bsuite#464 retirement backlog with rows that cannot be retired because there is
# nothing left to fix.
#
# R0 asks git the same question the scan does — `git grep` searches TRACKED files,
# so `git ls-files --error-unmatch` is exactly "would the scan below see this?".
# Deliberately not `test -e`: an untracked file on disk is invisible to the scan,
# and an entry for one is just as dead.
check_allowlist_freshness() {
  local dead="" skipped="" checked=0

  for allowed in "${ALLOWLIST[@]}"; do
    local path_part="${allowed%:*}"
    local first="${path_part%%/*}"
    local repo="." rel="$path_part"
    case " $ALL_SUBMODULES " in
      *" $first "*) repo="$first"; rel="${path_part#*/}" ;;
    esac

    # An uninitialised submodule is not scanned either, so its entries are
    # neither fresh nor dead — they are UNMEASURED. Saying so is the point: a
    # skipped repo must never read as a clean one.
    if [ "$repo" != "." ] && ! is_initialised_submodule "$repo"; then
      skipped="${skipped}  ${path_part}"$'\n'
      continue
    fi

    checked=$((checked + 1))
    if ! git -C "$repo" ls-files --error-unmatch "$rel" >/dev/null 2>&1; then
      dead="${dead}  ${path_part}"$'\n'
    fi
  done

  if [ -n "$skipped" ]; then
    note "R0 NOTE — ${#ALLOWLIST[@]} allowlist entries, ${checked} checked; the following could not be checked because their submodule is not initialised (this is NOT a pass for them):"
    note "$skipped"
  fi

  if [ -n "$dead" ]; then
    note "R0 VIOLATION — allowlist entries naming files that no longer exist. Each one is a standing exemption for a path nothing occupies: recreate a file there and it is exempt on arrival, unreviewed. DELETE these lines from ALLOWLIST in scripts/check-secret-naming.sh (if a file MOVED, re-point the entry and re-check that the new copy still deserves the exemption — crm7#1672 is what happened the one time anybody looked):"
    note "$dead"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

# ---- --self-test: prove R1 can actually fail before trusting its PASS ----
#
# Added 2026-09-04 (FOLLOW 65) alongside `SUPABASE_SECRET_KEY` joining R1's
# pattern. Plants a real violation of the shape this addition exists to
# catch (a Vite client reading the modern server-only secret name) in a
# scratch file inside a real app's client `src/`, runs R1 against it alone,
# and asserts the violation was caught — then removes the fixture whether or
# not the assertion held, via a trap so a failure mid-test cannot leave it
# behind. A rule that always exits 0 and a rule that correctly finds nothing
# both print PASS; this is what tells them apart. Does not require every
# submodule to be initialised — only the one app it plants into.
#
# STAGED, not just written: `run_git_grep` is plain `git grep` with no
# `--untracked`, matching how R1 runs for real (CI scans a checked-out
# tree, not a scratch file nobody added) — an untracked fixture is
# invisible to it and a self-test built that way passes on a broken rule.
# `git add` makes it visible without ever committing it; cleanup both
# unstages and deletes so neither the index nor the working tree keeps it.
#
# Variable names are prefixed `st_` and deliberately avoid `app` — bash's
# `for app in …` inside `check_r1` is NOT `local`, so calling check_r1 from
# here with a same-named local variable lets that loop clobber THIS
# function's own copy once it runs (verified: it left `st_app` reading the
# LAST entry of VITE_APPS, "throughput", after the call returned — cleanup
# then reset the wrong submodule's nonexistent path and the real fixture
# was left staged). Fresh names sidestep the collision rather than adding
# a `local app` to check_r1's loop, which is a separate, working function
# this task did not otherwise need to touch.
self_test() {
  local st_app="business-suite-unified"
  local st_rel="src/__check_secret_naming_selftest__.ts"
  local st_fixture="${st_app}/${st_rel}"

  if [ ! -d "${st_app}/src" ]; then
    echo "self-test: CANNOT RUN — ${st_app}/src is not checked out (submodule not initialised)" >&2
    return 1
  fi

  # Trap first, write second: if anything below fails partway, cleanup still
  # runs rather than leaving a planted file staged or on disk.
  trap '( cd "'"$st_app"'" && git reset -q -- "'"$st_rel"'" ) 2>/dev/null; rm -f "'"$st_fixture"'"' EXIT

  cat > "$st_fixture" <<'EOF'
// Planted by scripts/check-secret-naming.sh --self-test. Never committed.
export const leaked = process.env.SUPABASE_SECRET_KEY
EOF
  ( cd "$st_app" && git add -- "$st_rel" )

  VIOLATIONS=0
  DIAGNOSTICS=""
  check_r1

  local result=1
  if [ "$VIOLATIONS" -gt 0 ] && printf '%s' "$DIAGNOSTICS" | grep -q "$st_fixture"; then
    echo "self-test: PASS — R1 caught the planted \`process.env.SUPABASE_SECRET_KEY\` read in $st_fixture"
    result=0
  else
    {
      echo "self-test: FAIL — R1 did NOT catch a planted \`process.env.SUPABASE_SECRET_KEY\` read in $st_fixture"
      echo "diagnostics were:"
      printf '%s\n' "$DIAGNOSTICS"
    } >&2
  fi

  ( cd "$st_app" && git reset -q -- "$st_rel" ) 2>/dev/null
  rm -f "$st_fixture"
  trap - EXIT
  return "$result"
}

if [ "${1:-}" = "--self-test" ]; then
  self_test
  exit $?
fi

check_allowlist_freshness
check_r1
check_r2
check_r3
check_r4
check_r5
check_r6

# A PASS is a claim about a tree. Refuse to make it about a tree that was not
# read. Before this guard existed, running the script anywhere the submodules
# were absent — a fresh `git worktree add`, a shallow CI checkout without
# `submodules: recursive`, a container that cloned only the parent — printed
# PASS after scanning six empty directories. Silent-failure-presents-as-empty:
# the most common way a gate in this estate stops gating.
if [ -n "$UNSCANNED" ]; then
  {
    echo "secret-naming drift check: CANNOT REPORT — submodule(s) not checked out:${UNSCANNED}"
    echo ""
    echo "Rules R1-R6 scan submodule working trees. An uninitialised submodule is an"
    echo "EMPTY DIRECTORY, so those rules would match nothing and this script would"
    echo "print PASS having read none of the source it exists to police."
    echo ""
    echo "Fix the checkout, do not skip the check:"
    echo "    git submodule update --init --recursive"
    echo "In GitHub Actions, actions/checkout needs:  with: { submodules: recursive }"
    if [ -n "$DIAGNOSTICS" ]; then
      echo ""
      echo "Findings from the parts that COULD be read (not a complete result):"
      echo "$DIAGNOSTICS"
    fi
  } >&2
  exit 1
fi

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "secret-naming drift check: PASS — ${#ALLOWLIST[@]} allowlist entries verified live, all submodules scanned"
  exit 0
fi

{
  echo "secret-naming drift check: FAIL — ${VIOLATIONS} rule(s) violated"
  echo ""
  echo "$DIAGNOSTICS"
  echo "Canonical naming per AGENTS.md §Environment Variables:"
  echo "  Vite apps (BSU, crm7, R80.4, braden, throughput): import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY"
  echo "  Next.js (conduit):                              process.env.NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  echo "  Server-side (API routes):                       SUPABASE_URL / SUPABASE_SECRET_KEY"
  echo "                                                  (SUPABASE_SERVICE_ROLE_KEY is the legacy name for the same credential)"
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
