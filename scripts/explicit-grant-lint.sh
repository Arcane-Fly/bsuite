#!/usr/bin/env bash
# explicit-grant-lint.sh
#
# Per bsuite#964 / Supabase Data API change effective Oct 30 2026:
# every new `CREATE TABLE public.<name>` in a migration MUST be paired
# with at least one `GRANT ... ON public.<name> TO ...` statement in the
# SAME migration file. Without an explicit grant, supabase-js / PostgREST
# / GraphQL access will fail with PostgREST 42501 once the new default
# kicks in on the project.
#
# Acceptable grant targets (any one of these counts as satisfying the rule):
#   anon | authenticated | service_role
#
# Tables that are intentionally service-role-only (e.g. internal webhook
# queues like mapd_webhook_queue) MUST still include an explicit
# `GRANT ... ON public.<name> TO service_role;` to make the intent visible.
#
# Exit codes:
#   0 — clean (no new violations)
#   1 — violations found, PR should be blocked pending fix
#   2 — usage / environment error
#
# Usage (CI): ./scripts/explicit-grant-lint.sh <BASE_REF>
#   BASE_REF defaults to origin/main when not provided.
#
# The script uses tiny awk parsing — no regex quantifiers — and only scans
# files that are NEW or MODIFIED in the diff range.

set -euo pipefail

BASE_REF="${1:-origin/main}"

changed_files="$(git diff --name-only --diff-filter=AM "$BASE_REF"...HEAD \
    | grep -E '(^|/)supabase/migrations/.*\.sql$|(^|/)packages/db/migrations/.*\.sql$' || true)"

if [ -z "$changed_files" ]; then
    echo "[grant-lint] No changed SQL migration files in diff vs $BASE_REF — clean."
    exit 0
fi

echo "[grant-lint] Scanning changed migrations vs $BASE_REF:"
printf '  %s\n' $changed_files

violations=0

for f in $changed_files; do
    awk -v FILE="$f" '
function tolower_copy(s,    out) { out = s; return tolower(out); }

# Find all `create table public.<name>` (or `create table if not exists
# public.<name>`) and accumulate names. Schema-less `create table <name>`
# defaults to `public` in Supabase migrations; treat it the same way unless
# explicitly schema-qualified to a non-public schema.
function extract_table_name(line,    low, idx, rest, name) {
    low = tolower_copy(line);
    idx = index(low, "create table ");
    if (idx == 0) return "";
    rest = substr(low, idx + length("create table "));
    # Skip `if not exists ` if present
    if (index(rest, "if not exists ") == 1) rest = substr(rest, length("if not exists ") + 1);
    # Skip leading whitespace
    gsub(/^[[:space:]]+/, "", rest);
    # Trim trailing whitespace + opening paren / column-list opener
    gsub(/[[:space:]]*\(.*$/, "", rest);
    gsub(/[[:space:]]+$/, "", rest);
    # Extract first whitespace-delimited token = the qualified or bare name
    name = rest;
    gsub(/[[:space:]].*$/, "", name);
    # Strip schema qualifier — only process public.* or unqualified
    if (index(name, ".") > 0) {
        if (index(name, "public.") == 1) {
            return substr(name, length("public.") + 1);
        }
        # Other schema (auth, storage, supabase_migrations, etc.) — out of scope
        return "";
    }
    return name;
}

# Find all `grant ... on public.<name> to ...` and accumulate names.
function extract_grant_target(line,    low, idx, rest, name) {
    low = tolower_copy(line);
    if (index(low, "grant ") == 0) return "";
    if (index(low, " on ") == 0) return "";
    if (index(low, " to ") == 0) return "";
    idx = index(low, " on ");
    rest = substr(low, idx + length(" on "));
    # Skip `table ` keyword if present
    if (index(rest, "table ") == 1) rest = substr(rest, length("table ") + 1);
    # First token after `on [table] ` = qualified or bare table name
    gsub(/^[[:space:]]+/, "", rest);
    name = rest;
    gsub(/[[:space:]].*$/, "", name);
    # Strip schema qualifier — only process public.* or unqualified
    if (index(name, ".") > 0) {
        if (index(name, "public.") == 1) {
            return substr(name, length("public.") + 1);
        }
        return "";
    }
    return name;
}

# Detect ALL TABLES IN SCHEMA public — counts as a blanket grant
function is_blanket_grant(line,    low) {
    low = tolower_copy(line);
    if (index(low, "grant ") == 0) return 0;
    if (index(low, "all tables in schema public") == 0) return 0;
    if (index(low, " to ") == 0) return 0;
    return 1;
}

BEGIN {
    creates_count = 0;
    grants_count = 0;
    blanket_grant = 0;
}

{
    name = extract_table_name($0);
    if (name != "") {
        creates_count++;
        creates[creates_count] = name;
    }

    name = extract_grant_target($0);
    if (name != "") {
        grants_count++;
        grants[grants_count] = name;
    }

    if (is_blanket_grant($0)) {
        blanket_grant = 1;
    }
}

END {
    if (creates_count == 0) exit 0;

    if (blanket_grant) {
        # File contains a blanket `GRANT ... ON ALL TABLES IN SCHEMA public TO <role>` — covers everything.
        exit 0;
    }

    # For each created table, check at least one grant matches
    missing = 0;
    for (i = 1; i <= creates_count; i++) {
        found = 0;
        for (j = 1; j <= grants_count; j++) {
            if (creates[i] == grants[j]) { found = 1; break; }
        }
        if (!found) {
            missing++;
            print "[grant-lint] " FILE ": CREATE TABLE public." creates[i] " has no matching GRANT in same migration." > "/dev/stderr";
        }
    }
    exit (missing > 0 ? 1 : 0);
}
' "$f"
    rc=$?
    if [ "$rc" -eq 1 ]; then
        violations=$((violations + 1))
    elif [ "$rc" -ne 0 ]; then
        echo "[grant-lint] $f: awk error ($rc)" >&2
        exit 2
    fi
done

if [ "$violations" -gt 0 ]; then
    cat >&2 <<'EOF'

──────────────────────────────────────────────────────────────────────────
[grant-lint] FAILED — explicit GRANT required on new public-schema tables.

Per Supabase Data API change effective 2026-10-30 (project tuybltdrdefjblnplpqo):
new tables in `public` will NOT be accessible via PostgREST/supabase-js/
GraphQL unless explicitly granted to a Data API role.

Fix: add to your migration alongside the CREATE TABLE:

    GRANT SELECT ON public.<table>                  TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO service_role;

For service-role-only tables (e.g. internal webhook queues), grant only
service_role and document the intent in the migration comment.

Tracker: bsuite#964
──────────────────────────────────────────────────────────────────────────
EOF
    exit 1
fi

echo "[grant-lint] All new CREATE TABLE statements in this PR have explicit grants — clean."
exit 0
