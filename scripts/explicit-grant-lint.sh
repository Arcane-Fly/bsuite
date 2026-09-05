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
# Self-test:  ./scripts/explicit-grant-lint.sh --self-test
#   Runs the SAME awk program over fixtures with a planted violation and over a
#   clean one, asserting exit 1 then exit 0. A gate that has never been seen to
#   fail is not a gate — and this one became a REQUIRED check on 2026-09-03,
#   which is exactly when "it has always been green" stops being reassuring.
#
# WHY THIS IS NOT PATH-FILTERED ANY MORE (2026-09-03, C5).
#   .github/workflows/explicit-grant-lint.yml used to carry
#   `paths: ['**/supabase/migrations/**.sql', …]`. GitHub does not START a
#   workflow whose paths the PR's changeset misses, so the context never
#   reports — and a REQUIRED context that never reports leaves the PR waiting
#   forever with every visible check green. The filter is gone and this script
#   does the cheap thing instead: it computes the changed-file list and exits 0
#   in under a second when none of them is a migration.
#
#   It does NOT exit 0 when the diff is EMPTY. An empty diff means the base ref
#   never resolved, which is a scan that examined nothing — indistinguishable,
#   from the outside, from a clean one. That is the estate's most-repeated
#   failure class and it fails loudly here instead.
#
# The script uses tiny awk parsing — no regex quantifiers — and only scans
# files that are NEW or MODIFIED in the diff range.

set -euo pipefail

SELF_TEST=0
if [ "${1:-}" = "--self-test" ]; then
    SELF_TEST=1
    shift
fi

BASE_REF="${1:-origin/main}"

if [ "$SELF_TEST" -eq 0 ]; then
    # EMPTINESS is measured on the WHOLE diff, with NO --diff-filter. A PR whose
    # entire changeset is deletions has an empty A/M list and a perfectly real
    # diff; refusing that one as "scanned nothing" would be a false alarm on a
    # legitimate PR, which is how a loud guard gets switched off.
    all_changed="$(git diff --name-only "$BASE_REF"...HEAD || true)"
    total_changed="$(printf '%s' "$all_changed" | grep -c . || true)"

    # SCOPE is measured on A/M only — a deleted migration cannot be missing a
    # grant, and re-reading it would fail on a path that no longer exists.
    added_or_modified="$(git diff --name-only --diff-filter=AM "$BASE_REF"...HEAD || true)"

    # A PR always changes at least one file. Zero means the diff range never
    # resolved — the scan examined NOTHING, which is not the same as having
    # found nothing, and is the failure this estate repeats most often.
    if [ "$total_changed" -eq 0 ]; then
        echo "[grant-lint] REFUSING TO PASS: the diff vs $BASE_REF is empty." >&2
        echo "  A pull request always changes at least one file, so an empty range means" >&2
        echo "  the base ref never resolved (a shallow clone, or a fetch that failed" >&2
        echo "  quietly). Scanning nothing and reporting clean is how a gate goes green" >&2
        echo "  on exactly the change it exists to catch. Fix the checkout depth or the" >&2
        echo "  base-ref fetch; do not treat this as a pass." >&2
        exit 2
    fi

    changed_files="$(printf '%s\n' "$added_or_modified" \
        | grep -E '(^|/)supabase/migrations/.*\.sql$|(^|/)packages/db/migrations/.*\.sql$' || true)"

    if [ -z "$changed_files" ]; then
        echo "[grant-lint] examined $total_changed changed file(s) in the diff vs $BASE_REF; 0 were SQL migrations — nothing this gate owns, clean."
        exit 0
    fi

    migration_count="$(printf '%s' "$changed_files" | grep -c . || true)"
    echo "[grant-lint] examined $total_changed changed file(s) vs $BASE_REF; $migration_count are SQL migration(s):"
    printf '  %s\n' $changed_files
fi

scan_file() {
    awk -v FILE="$1" '
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
' "$1"
}

# ---------------------------------------------------------------------------
# SELF-TEST — the gate must be SEEN to fail, over the SAME awk program the real
# run uses, before any verdict it prints is worth reading. Asserts the exact
# exit code in both directions: a probe that CRASHES also exits non-zero
# without having proven anything.
# ---------------------------------------------------------------------------
if [ "$SELF_TEST" -eq 1 ]; then
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    failed=0

    assert_case() {
        want="$1"; label="$2"; file="$3"
        set +e
        scan_file "$file" >"$tmp/out.txt" 2>&1
        got=$?
        set -e
        if [ "$got" -eq "$want" ]; then
            echo "  ok   $label (exit $got)"
        else
            failed=$((failed + 1))
            echo "  FAIL $label — expected exit $want, got $got" >&2
            sed 's/^/       /' "$tmp/out.txt" >&2
        fi
    }

    cat >"$tmp/violation.sql" <<'SQL'
create table public.planted_violation (
  id uuid primary key
);
SQL
    cat >"$tmp/granted.sql" <<'SQL'
create table public.planted_clean (
  id uuid primary key
);
grant select on public.planted_clean to anon;
SQL
    cat >"$tmp/blanket.sql" <<'SQL'
create table public.planted_blanket (
  id uuid primary key
);
grant select on all tables in schema public to authenticated;
SQL
    cat >"$tmp/other_schema.sql" <<'SQL'
create table auth.not_our_problem (
  id uuid primary key
);
SQL
    cat >"$tmp/no_tables.sql" <<'SQL'
alter table public.existing add column note text;
SQL

    assert_case 1 "planted violation — CREATE TABLE public.x with no GRANT" "$tmp/violation.sql"
    assert_case 0 "clean — the same table WITH a grant" "$tmp/granted.sql"
    assert_case 0 "clean — a blanket GRANT ON ALL TABLES IN SCHEMA public" "$tmp/blanket.sql"
    assert_case 0 "out of scope — a table in a non-public schema" "$tmp/other_schema.sql"
    assert_case 0 "out of scope — a migration that creates no table" "$tmp/no_tables.sql"

    if [ "$failed" -gt 0 ]; then
        echo "[grant-lint --self-test] $failed of 5 case(s) FAILED — the detector is broken, so its verdicts mean nothing." >&2
        exit 1
    fi
    echo "[grant-lint --self-test] 5 of 5 case(s) passed (1 planted violation caught, 4 clean)."
    exit 0
fi

violations=0

for f in $changed_files; do
    set +e
    scan_file "$f"
    rc=$?
    set -e
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

echo "[grant-lint] $migration_count migration file(s) examined, every new CREATE TABLE has an explicit grant — clean."
exit 0
