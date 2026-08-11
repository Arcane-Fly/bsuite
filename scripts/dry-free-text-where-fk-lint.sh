#!/usr/bin/env bash
# dry-free-text-where-fk-lint.sh
#
# Phase 6c lint — flags new migrations that add free-text columns with names
# matching *_name | *_email | *_phone | *_company | *_code to a table that
# already has a foreign-key-looking column (`*_id UUID REFERENCES ...`).
# The rule is intended as a code-review prompt: when a free-text is added
# next to an FK, the reviewer must either:
#
#   1. Remove the free-text (use the FK-linked entity instead), OR
#   2. Acknowledge the exemption with an inline comment:
#        -- DRY exemption: <reason>
#      on or immediately above the flagged line.
#
# Exit codes:
#   0 — clean (no new violations)
#   1 — violations found, PR should be blocked pending fix or exemption
#   2 — usage / environment error
#
# Usage (CI): ./scripts/dry-free-text-where-fk-lint.sh <BASE_REF>
#   BASE_REF defaults to origin/main when not provided.
#
# The script uses a tiny awk parser (no regex quantifiers) and only scans
# files that are new or modified in the diff range. Parent directory
# layout is respected: migrations live under */supabase/migrations/*.sql
# OR */packages/db/migrations/*.sql.

set -euo pipefail

BASE_REF="${1:-origin/main}"
PATTERN_COLS='_name _email _phone _company _code'

# Collect changed .sql files
changed_files="$(git diff --name-only --diff-filter=AM "$BASE_REF"...HEAD \
    | grep -E '(^|/)supabase/migrations/.*\.sql$|(^|/)packages/db/migrations/.*\.sql$' || true)"

if [ -z "$changed_files" ]; then
    echo "[dry-lint] No changed SQL migration files in diff vs $BASE_REF — clean."
    exit 0
fi

echo "[dry-lint] Scanning changed migrations vs $BASE_REF:"
printf '  %s\n' $changed_files

violations=0

# --- awk parser ---
# Walk each file, tracking the CURRENT table context inside a CREATE/ALTER
# TABLE block. For each column line, check:
#   (a) is this a text column with a suspect name suffix?
#   (b) does the current table block already contain an FK-shape column
#       (`*_id ... REFERENCES` OR `FOREIGN KEY (*_id)`)?
# If both true AND no `-- DRY exemption:` comment on/above the line → flag.
#
# We use awk (present on all CI runners) and no regex quantifiers. Suffix
# match is done via a small set of `index()` tests — no regex engine.

REGISTRY="scripts/dry-lint-exemptions.registry"

for f in $changed_files; do
    # Registry channel for APPLIED (frozen) migrations: once a migration is in
    # supabase_migrations.schema_migrations it must not be edited in place
    # (see supabase/migrations/CLAUDE.md), so in-file `-- DRY exemption:`
    # comments are impossible retroactively. `<basename>:<column>` entries in
    # the registry acknowledge those columns instead.
    exempt_cols=""
    if [ -f "$REGISTRY" ]; then
        # `|| true` guards set -euo pipefail: no registry match is the normal
        # case and must not abort the scan.
        exempt_cols=$({ grep "^$(basename "$f"):" "$REGISTRY" 2>/dev/null || true; } | cut -d: -f2 | tr '\n' ' ')
    fi

    # Read file into awk with the suspect list as a variable
    awk -v FILE="$f" -v PATTERNS="$PATTERN_COLS" -v EXEMPT=" $exempt_cols " '
BEGIN {
    split(PATTERNS, suffixes, " ");
    in_block = 0;
    block_has_fk = 0;
    block_table = "";
    prev_comment_line = -2;
    prev_was_exemption = 0;
    violations_found = 0;
}

# Normalise: trim and lowercase a copy for matching
function tolower_copy(s,    out) { out = s; return tolower(out); }

function ends_block(line,    low) {
    low = tolower_copy(line);
    # A bare `);` on its own (possibly with trailing comment) closes a
    # CREATE TABLE block. ALTER TABLE ADD COLUMN is a single-statement and
    # never enters a multi-line block — we process it inline.
    if (line ~ /^[[:space:]]*\)[[:space:]]*;/) return 1;
    return 0;
}

function line_is_exemption(line,    low) {
    low = tolower_copy(line);
    # Tiny anchored literal, no quantifiers.
    if (index(low, "-- dry exemption:") > 0) return 1;
    if (index(low, "--dry exemption:") > 0) return 1;
    return 0;
}

function has_fk_shape(line,    low) {
    low = tolower_copy(line);
    # heuristic: a line with "references " AND a column name containing "_id" somewhere
    if (index(low, " references ") == 0) return 0;
    if (index(low, "_id ") == 0 && index(low, "_id,") == 0) return 0;
    return 1;
}

function col_name_from_decl(line,    low, a, nf) {
    # Pull the first token after leading whitespace. Works for
    # "column_name TYPE ..." style lines inside a CREATE TABLE, and for
    # "ADD COLUMN column_name TYPE ...".
    low = tolower_copy(line);
    gsub(/^[[:space:]]+/, "", low);
    if (index(low, "add column ") == 1) low = substr(low, length("add column ") + 1);
    if (index(low, "add column if not exists ") == 1) low = substr(low, length("add column if not exists ") + 1);
    nf = split(low, a, "[[:space:]]+");
    if (nf < 1) return "";
    # Strip leading quotes/backticks that a human might add
    gsub(/^["\x60]+/, "", a[1]);
    gsub(/["\x60]+$/, "", a[1]);
    return a[1];
}

function col_type_from_decl(line,    low, a, nf, tp) {
    low = tolower_copy(line);
    gsub(/^[[:space:]]+/, "", low);
    if (index(low, "add column ") == 1) low = substr(low, length("add column ") + 1);
    if (index(low, "add column if not exists ") == 1) low = substr(low, length("add column if not exists ") + 1);
    nf = split(low, a, "[[:space:]]+");
    if (nf < 2) return "";
    tp = a[2];
    # Strip trailing punctuation commonly seen after type: "," ";"
    gsub(/[,;].*$/, "", tp);
    gsub(/[[:space:]]+$/, "", tp);
    return tp;
}

function is_text_type(tp) {
    if (tp == "text") return 1;
    if (tp == "varchar") return 1;
    if (index(tp, "varchar(") == 1) return 1;
    if (index(tp, "character") == 1) return 1;
    return 0;
}

function suffix_matches(name,    i, s) {
    for (i in suffixes) {
        s = suffixes[i];
        if (s == "") continue;
        if (length(name) <= length(s)) continue;
        if (substr(name, length(name) - length(s) + 1) == s) return s;
    }
    return "";
}

{
    line = $0;
    low = tolower_copy(line);

    # Track "exemption on previous line" — an exemption can appear inline on
    # the declaration line OR immediately above it.
    if (line_is_exemption(line)) {
        prev_was_exemption = 1;
        next;
    }

    # Enter a CREATE TABLE block
    if (in_block == 0 && (index(low, "create table ") > 0 || index(low, "create table if not exists ") > 0)) {
        in_block = 1;
        block_has_fk = 0;
        # Extract table name heuristically — token after "table" (or "exists")
        n = split(low, parts, "[[:space:]]+");
        for (i = 1; i <= n; i++) {
            if (parts[i] == "table") {
                block_table = parts[i+1];
                if (parts[i+1] == "if") block_table = parts[i+4];
                gsub(/\(/, "", block_table);
                break;
            }
        }
        prev_was_exemption = 0;
        next;
    }

    # Inside a block — track FK shape and suspect columns
    if (in_block == 1) {
        if (has_fk_shape(line)) {
            block_has_fk = 1;
        }

        # Check this line for suspect column
        if (is_text_type(col_type_from_decl(line))) {
            nm = col_name_from_decl(line);
            sm = suffix_matches(nm);
            if (sm != "" && block_has_fk == 1 && prev_was_exemption == 0 && index(EXEMPT, " " nm " ") == 0) {
                # We have to hold judgement until end-of-block to know if
                # FK truly exists. Collect pending flags.
                pending_names[++pending_count] = nm;
                pending_lines[pending_count] = FNR;
                pending_suffix[pending_count] = sm;
            }
        }

        if (ends_block(line)) {
            # Emit flags if block truly had FK shape
            if (block_has_fk == 1) {
                for (p = 1; p <= pending_count; p++) {
                    printf "::error file=%s,line=%d::DRY lint: column \"%s\" has free-text suffix %s added to a table that references another entity (has a *_id FOREIGN KEY). Either replace with the FK column or acknowledge via `-- DRY exemption: <reason>`.\n",
                        FILE, pending_lines[p], pending_names[p], pending_suffix[p];
                    violations_found++;
                }
            }
            in_block = 0;
            block_has_fk = 0;
            block_table = "";
            pending_count = 0;
            prev_was_exemption = 0;
            next;
        }

        prev_was_exemption = 0;
        next;
    }

    # Outside a CREATE TABLE block: catch ALTER TABLE ... ADD COLUMN
    #
    # col_name_from_decl()/col_type_from_decl() only strip a LEADING
    # "add column " (or "... if not exists ") prefix — they were written for
    # bare per-column lines inside a CREATE TABLE block. Called on the full
    # "alter table <table> add column ..." line, the leading token is "alter",
    # not the column name, so this branch NEVER extracted a real column name
    # or type: suffix_matches("alter") is always "", so a bare
    # `ALTER TABLE ... ADD COLUMN foo_name text` -- the dominant single-column
    # form this repo migrations mostly use (see lint-migrations-revoke-anon.mjs
    # header comment) -- was silently never flagged, exemption or not. Slice
    # the line down to the "add column ..." tail first so the same
    # prefix-stripping the CREATE TABLE path already relies on actually
    # applies here too.
    if (index(low, "alter table ") == 1 && index(low, " add column ") > 0) {
        add_col_pos = index(low, " add column ");
        decl = substr(line, add_col_pos + 1);
        nm = col_name_from_decl(decl);
        tp = col_type_from_decl(decl);
        sm = suffix_matches(nm);
        if (sm != "" && is_text_type(tp) && prev_was_exemption == 0) {
            # We cannot verify from this line alone whether the table has
            # an FK column — emit a soft warning with advisory text.
            printf "::warning file=%s,line=%d::DRY lint: ALTER TABLE adds free-text column \"%s\" with suffix %s. Verify the target table does not already have a *_id FOREIGN KEY for this concept, or add `-- DRY exemption: <reason>`.\n",
                FILE, FNR, nm, sm;
            violations_found++;
        }
    }
    prev_was_exemption = 0;
}

END {
    exit (violations_found > 0 ? 3 : 0);
}
'  "$f" && rc=0 || rc=$?

    if [ "$rc" -eq 3 ]; then
        violations=$((violations + 1))
    elif [ "$rc" -ne 0 ]; then
        echo "[dry-lint] awk parser failed on $f (rc=$rc)" >&2
        exit 2
    fi
done

if [ "$violations" -gt 0 ]; then
    echo ""
    echo "[dry-lint] $violations SQL file(s) contain DRY violations. See ::error / ::warning lines above."
    echo "[dry-lint] Fix by using a FK column OR add '-- DRY exemption: <reason>' on/above the declaration."
    exit 1
fi

echo "[dry-lint] Clean — no free-text-where-FK violations in changed migrations."
exit 0
