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

    # An empty range has TWO causes and conflating them is a defect in both
    # directions.
    #
    #   (a) The base ref never resolved — shallow clone, or a fetch that failed
    #       quietly. The scan examined NOTHING, which is not the same as having
    #       found nothing, and is the failure this estate repeats most often.
    #
    #   (b) The range resolved perfectly and genuinely carries no files. A sync
    #       / back-merge PR (`main` -> `development`, opened after a promotion
    #       so the two refs stop drifting) changes ZERO files by construction,
    #       and GitHub itself reports changedFiles=0 for it.
    #
    # This gate used to assert "a PR always changes at least one file" and fail
    # (b) as if it were (a). That premise is false, and because `grant-lint` is
    # REQUIRED on `development`, it blocked the one PR the promotion workflow
    # depends on: bsuite#3099 sat BLOCKED from 2026-09-05 with every other one
    # of the 33 required contexts green. Measured, not inferred — GitHub
    # reported changedFiles=0 and this was the only failing required context.
    #
    # The discriminator below is a PROOF, not a heuristic. If a merge base
    # resolves AND its tree is byte-identical to HEAD's tree, then there is
    # verifiably no content in the range and no scan could have found anything.
    # If git cannot resolve the endpoints or a merge base between them — the
    # shallow-clone and failed-fetch cases — we are in (a) and still fail loud.
    if [ "$total_changed" -eq 0 ]; then
        merge_base="$(git merge-base "$BASE_REF" HEAD 2>/dev/null || true)"
        base_tree=""
        head_tree=""
        if [ -n "$merge_base" ]; then
            base_tree="$(git rev-parse --verify --quiet "$merge_base^{tree}" || true)"
            head_tree="$(git rev-parse --verify --quiet 'HEAD^{tree}' || true)"
        fi

        if [ -n "$base_tree" ] && [ "$base_tree" = "$head_tree" ]; then
            echo "[grant-lint] nothing to scan, and here is why that is provable:"
            echo "  the merge base with $BASE_REF is $merge_base and its tree ($base_tree)"
            echo "  is identical to HEAD's tree, so the range is verifiably empty of content"
            echo "  rather than unresolved. This is the shape of a sync / back-merge PR."
            exit 0
        fi

        echo "[grant-lint] REFUSING TO PASS: the diff vs $BASE_REF is empty." >&2
        echo "  The range is empty AND git could not prove it is legitimately empty:" >&2
        echo "    merge base : ${merge_base:-<unresolvable>}" >&2
        echo "    base tree  : ${base_tree:-<unresolvable>}" >&2
        echo "    HEAD tree  : ${head_tree:-<unresolvable>}" >&2
        echo "  That means the base ref never resolved (a shallow clone, or a fetch that" >&2
        echo "  failed quietly). Scanning nothing and reporting clean is how a gate goes" >&2
        echo "  green on exactly the change it exists to catch. Fix the checkout depth or" >&2
        echo "  the base-ref fetch; do not treat this as a pass." >&2
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

    # ── The RANGE logic, exercised through the whole script on real repos ─────
    #
    # The five cases above test `scan_file`, the awk detector. They cannot see
    # the diff-range logic at all — which is where the bsuite#3099 defect lived,
    # and is exactly why it survived a green self-test. These four drive the
    # script end to end against throwaway repositories.
    SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
    repos="$(mktemp -d)"
    trap 'rm -rf "$tmp" "$repos"' EXIT

    mk_repo() {
        r="$repos/$1"
        mkdir -p "$r"
        git init -q -b base "$r"
        git -C "$r" config user.email selftest@example.invalid
        git -C "$r" config user.name  selftest
        git -C "$r" config commit.gpgsign false
        mkdir -p "$r/supabase/migrations"
        echo seed >"$r/README.md"
        git -C "$r" add -A
        git -C "$r" commit -qm seed
    }

    assert_range_case() {
        want="$1"; label="$2"; repo="$repos/$3"; base="$4"
        set +e
        ( cd "$repo" && bash "$SELF" "$base" ) >"$repos/out.txt" 2>&1
        got=$?
        set -e
        if [ "$got" -eq "$want" ]; then
            echo "  ok   $label (exit $got)"
        else
            failed=$((failed + 1))
            echo "  FAIL $label — expected exit $want, got $got" >&2
            sed 's/^/       /' "$repos/out.txt" >&2
        fi
    }

    # (b) the sync / back-merge shape: an empty commit leaves HEAD's tree
    # identical to the merge base's, so the range is provably empty.
    mk_repo sync
    git -C "$repos/sync" checkout -q -b headref
    git -C "$repos/sync" commit -q --allow-empty -m "sync: no new work"

    # (a) the failure this gate exists for: a base ref that does not resolve.
    mk_repo unresolved

    # a real violation reached through the range, proving the new early exit
    # does not swallow the work the gate is for.
    mk_repo violation
    git -C "$repos/violation" checkout -q -b headref
    printf 'create table public.range_violation (\n  id uuid primary key\n);\n' \
        >"$repos/violation/supabase/migrations/001_x.sql"
    git -C "$repos/violation" add -A
    git -C "$repos/violation" commit -qm "add a migration with no grant"

    # a non-empty range that owns nothing — the ordinary clean path.
    mk_repo unrelated
    git -C "$repos/unrelated" checkout -q -b headref
    echo hello >"$repos/unrelated/notes.txt"
    git -C "$repos/unrelated" add -A
    git -C "$repos/unrelated" commit -qm "a file this gate does not own"

    assert_range_case 0 "empty range, trees provably identical — a sync PR passes" sync base
    assert_range_case 2 "empty range, base ref unresolvable — still fails LOUD" unresolved origin/nope
    assert_range_case 1 "non-empty range still catches a migration with no GRANT" violation base
    assert_range_case 0 "non-empty range owning no migration is clean" unrelated base

    if [ "$failed" -gt 0 ]; then
        echo "[grant-lint --self-test] $failed of 9 case(s) FAILED — the detector is broken, so its verdicts mean nothing." >&2
        exit 1
    fi
    echo "[grant-lint --self-test] 9 of 9 case(s) passed (2 planted violations caught, 1 unresolvable base refused, 6 clean)."
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
