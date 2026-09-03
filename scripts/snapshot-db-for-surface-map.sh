#!/usr/bin/env bash
# snapshot-db-for-surface-map.sh — read-only DB snapshot feeding
# scripts/build-surface-map.mjs.
#
# WHAT IT PRODUCES, under $SP:
#   tables.json    — one row per public base table: table_name, rls_enabled,
#                     anon_select, auth_select, has_tenant_id.
#   policies.json   — pg_policies rows for schema public (roles, cmd, qual,
#                     with_check included; `roles` is a native Postgres array
#                     and round-trips through row_to_json as a JSON array, so
#                     build-surface-map.mjs's `(p.roles || []).includes(role)`
#                     matches on an exact element, not a substring).
#   functions.json  — pg_proc rows for schema public: proname, prosecdef.
#                     NOTE: measured against build-surface-map.mjs directly —
#                     the `dbFns` map it builds from this file is never read
#                     again anywhere else in that script. Only the file's
#                     EXISTENCE and parseability are load-bearing today; the
#                     content is captured anyway so a future consumer of
#                     dbFns is not silently short a snapshot.
#   db/edge-functions.json — deployed edge-function slugs, a plain JSON array.
#
# EVERYTHING IS READ-ONLY. The Postgres session is forced into
# default_transaction_read_only; no DDL/DML statement can execute even if one
# were (accidentally) added here later.
#
# Usage:
#   SP=/path/to/snapshot-dir ./scripts/snapshot-db-for-surface-map.sh
#
# Env (read from ENV_FILE, sourced — never echoed, never logged):
#   POSTGRES_URL              required — the read connection string.
#   SUPABASE_ACCESS_TOKEN     optional — management-API token for the
#                              deployed-edge-functions capture. Falls back to
#                              `supabase functions list` (if the CLI is
#                              logged in for SUPABASE_PROJECT_REF), then to
#                              the slugs already committed at
#                              docs/nav/edge-functions-deployed.json.
#
# ENV_FILE defaults to .env.local at the repo root this script is run from;
# pass ENV_FILE=/path/to/other/.env.local to source a different one (e.g. the
# shared project checkout's, when running from a disposable clone that has no
# env file of its own — .env.local is gitignored by design, see .gitignore).
set -euo pipefail

SP="${SP:?SP=<output dir> is required}"
ENV_FILE="${ENV_FILE:-.env.local}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-tuybltdrdefjblnplpqo}"
REPO_ROOT="$(pwd)"

if [ ! -f "$ENV_FILE" ]; then
  echo "snapshot-db-for-surface-map: ENV_FILE not found: $ENV_FILE" >&2
  echo "  Set ENV_FILE=/path/to/.env.local (never committed; see .gitignore)." >&2
  exit 2
fi

mkdir -p "$SP/db"

# Source read-only: this shell's env only, nothing echoed, nothing logged.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

DB="${POSTGRES_URL%%\?*}"
if [ -z "${DB:-}" ]; then
  echo "snapshot-db-for-surface-map: POSTGRES_URL not set after sourcing $ENV_FILE" >&2
  exit 2
fi

# has_tenant_id names a wider concept than the literal column 'tenant_id':
# build-surface-map.mjs's own TENANT_RE (used to decide whether an RLS qual
# is tenant-scoped) is
#   tenant_id|org_id|organisation_id|organization_id|current_tenant|acting_scope|user_tenants
# and posture()'s RLS_ON_TENANT_SCOPED verdict already fires on a column such
# as tenants.organization_id. Matching only the exact name tenant_id desyncs
# has_tenant_id from that verdict: the tenants table itself carries no
# tenant_id column (it has organization_id, parent_tenant_id, tenant_type),
# so an exact-match query marks it has_tenant_id=false while its RLS policy
# reads RLS_ON_TENANT_SCOPED -- flipping tenant_scoped from 'yes' to 'n/a' on
# every route that reaches only tenants, with no code change behind it.
# Reuse the SAME pattern here so the two stay consistent by construction, not
# by luck. NOTE: no backticks in the SQL text below -- this string is
# double-quoted for bash, and a backtick there is command substitution, not
# markdown.
echo "snapshot-db-for-surface-map: writing tables.json"
PGOPTIONS='-c default_transaction_read_only=on' psql "$DB" -At -c "
select coalesce(json_agg(row_to_json(t)), '[]')
from (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    exists (
      select 1 from information_schema.role_table_grants g
      where g.table_schema = 'public' and g.table_name = c.relname
        and g.grantee = 'anon' and g.privilege_type = 'SELECT'
    ) as anon_select,
    exists (
      select 1 from information_schema.role_table_grants g
      where g.table_schema = 'public' and g.table_name = c.relname
        and g.grantee = 'authenticated' and g.privilege_type = 'SELECT'
    ) as auth_select,
    exists (
      -- Anchored to a whole or underscore-prefixed match, never a bare
      -- substring: an UNANCHORED version of this same pattern matched
      -- platform_branding.force_override_tenant_ids (a config array column
      -- on a deliberately platform-wide, non-tenant-scoped table whose
      -- SELECT policy is USING (true) by design) and mislabelled it
      -- has_tenant_id=true, which turned its correct, intentional open
      -- policy into a false FINDING_CROSS_TENANT. 'force_override_tenant_ids'
      -- ends in the PLURAL 'tenant_ids', so anchoring the pattern to end of
      -- string (...$) excludes it while still matching 'tenant_id',
      -- 'parent_tenant_id', 'organization_id', etc.
      select 1 from information_schema.columns col
      where col.table_schema = 'public' and col.table_name = c.relname
        and col.column_name ~* '(^|_)(tenant_id|org_id|organisation_id|organization_id|current_tenant|acting_scope|user_tenants)$'
    ) as has_tenant_id
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname
) t
" > "$SP/tables.json"

echo "snapshot-db-for-surface-map: writing policies.json"
PGOPTIONS='-c default_transaction_read_only=on' psql "$DB" -At -c "
select coalesce(json_agg(row_to_json(p)), '[]')
from (
  select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname
) p
" > "$SP/policies.json"

echo "snapshot-db-for-surface-map: writing functions.json"
PGOPTIONS='-c default_transaction_read_only=on' psql "$DB" -At -c "
select coalesce(json_agg(row_to_json(f)), '[]')
from (
  select p.proname, p.prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  order by p.proname
) f
" > "$SP/functions.json"

if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "snapshot-db-for-surface-map: writing db/edge-functions.json via Supabase management API"
  curl -sf -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions" \
    | node -e "
        let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
          const arr = JSON.parse(s).map(f=>f.slug);
          process.stdout.write(JSON.stringify(arr));
        })" > "$SP/db/edge-functions.json"
elif command -v supabase >/dev/null 2>&1 \
     && supabase functions list --project-ref "$SUPABASE_PROJECT_REF" -o json >/dev/null 2>&1; then
  echo "snapshot-db-for-surface-map: writing db/edge-functions.json via supabase CLI"
  supabase functions list --project-ref "$SUPABASE_PROJECT_REF" -o json \
    | node -e "
        let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
          const arr = JSON.parse(s).map(f=>f.slug ?? f.name);
          process.stdout.write(JSON.stringify(arr));
        })" > "$SP/db/edge-functions.json"
else
  echo "snapshot-db-for-surface-map: FALLBACK — no SUPABASE_ACCESS_TOKEN and no logged-in" >&2
  echo "  supabase CLI; copying slugs from docs/nav/edge-functions-deployed.json instead of" >&2
  echo "  a fresh capture. Deployed-function drift since that file's captured_at will not" >&2
  echo "  be reflected in this snapshot." >&2
  node -e "
    const d = require(process.cwd() + '/docs/nav/edge-functions-deployed.json');
    console.log(JSON.stringify(d.functions ?? d));
  " > "$SP/db/edge-functions.json"
fi

echo "snapshot-db-for-surface-map: done -> $SP"
for f in tables.json policies.json functions.json db/edge-functions.json; do
  n=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).length)" "$SP/$f" 2>/dev/null || echo '?')
  echo "  $f: $n row(s)"
done
