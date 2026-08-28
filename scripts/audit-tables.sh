#!/usr/bin/env bash
#
# scripts/audit-tables.sh
# ------------------------------------------------------------------------------
# Reusable table usage audit pipeline for the shared BSuite Supabase DB.
#
# Purpose:
#   Collect 12 independent signal dimensions (7 pass-1 DB-side + 5 pass-2 app-side)
#   for every table in the `public` schema and merge them into a single TSV with a
#   classification column (USED_STRONG / USED_WEAK / UNCLEAR / NEEDS_REVIEW).
#
#   NEEDS_REVIEW is a NEUTRAL bucket: tables with zero signals anywhere. The
#   script cannot automatically decide whether such a table is a legitimate-but-
#   unwired feature (audit-doc `NEEDS_WIRING`, e.g. `apprentice_placements`) or
#   a deprecated / duplicated entity (audit-doc `DROP_ELIGIBLE_PENDING_APPROVAL`).
#   Human review per the audit doc's "Verdict vocabulary" subsection is required
#   to split NEEDS_REVIEW rows. No script output is ever a drop recommendation.
#
#   UNCLEAR is emitted when `pg_stat_user_tables` shows activity but pass-2
#   app/edge/DB signals are all zero — typical causes: external service-role
#   writer, Supabase Studio-only query, or stats-reset masking recent writes.
#   Investigate before acting.
#
#   Always run `--pass all` (default) before interpreting NEEDS_REVIEW. A
#   `--pass 1` run will over-flag tables because app-side signals are absent.
#
#   This is the automated version of the manual audit documented in
#   `docs/20260506-table-usage-audit-v1.00F.md`. Re-run quarterly or before any
#   schema cleanup decision.
#
#   This script is diagnostic only — it NEVER runs DDL, UPDATE, INSERT, DELETE, or
#   any write. Only read-only SELECTs against pg_catalog, information_schema,
#   pg_stat_user_tables, pg_policies, pg_get_viewdef, pg_get_functiondef.
#
# Prerequisites:
#   - psql (PostgreSQL client)
#   - rg   (ripgrep)
#   - python3
#   - Either --db-url flag, or POSTGRES_URL_NON_POOLING env var, or a readable
#     crm7/.env.local with a POSTGRES_URL_NON_POOLING= line.
#
# Usage:
#   scripts/audit-tables.sh [OPTIONS]
#
# Options:
#   --help               Print this help and exit.
#   --pass 1|2|all       Which pass(es) to run (default: all).
#   --out <dir>          Output directory (default: ./audit-out-<timestamp>).
#   --db-url <url>       Postgres connection string (overrides env + .env.local).
#   --apps <csv>         Comma-separated app dirs to scan
#                        (default: crm7,business-suite-unified,R80.4,throughput,conduit,braden).
#                        Missing directories are skipped with a warning.
#
# Exit codes:
#   0  Success.
#   1  Unexpected runtime error.
#   2  Configuration error (bad flag, no DB URL resolvable, output dir not writable).
#   3  Missing required dependency (psql, rg, or python3).
#
# References:
#   - docs/20260506-table-usage-audit-v1.00F.md              (methodology + verdicts)
#   - docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md  (r7_* vs conduit_*)
#   - docs/20260227-dry-one-shot-architecture-v1.04A.md      (entity ownership)
#
# ------------------------------------------------------------------------------

set -euo pipefail

# ---------- defaults --------------------------------------------------------

PASS="all"
OUT_DIR=""
DB_URL=""
APPS_CSV="crm7,business-suite-unified,R80.4,throughput,conduit,braden"

# Use bash parameter expansion rather than external `basename` so the script
# survives a degraded PATH long enough to report a clean dep-check failure.
SCRIPT_NAME="${0##*/}"
# TIMESTAMP uses `date`; resolved later, AFTER the dep check, so that a missing
# /usr/bin still reports a useful "psql/rg/date not found" error with exit 3.
TIMESTAMP=""

# ---------- helpers ---------------------------------------------------------

print_help() {
  # Extract the header comment block from the top of this script, stopping at
  # the first non-comment line. Robust to header-block size changes (no hard-
  # coded line ranges). Uses awk, which is POSIX-required. Sentinel banner
  # lines (`# ===== HELP BEGIN/END =====`) are suppressed from the output.
  awk '
    NR == 1 { next }                            # skip shebang
    /^# ===== HELP (BEGIN|END) =====$/ { next } # suppress sentinel banners
    /^# / { sub(/^# ?/, ""); print; next }
    /^#$/ { print ""; next }
    { exit }                                    # stop at first non-comment line
  ' "$0"
}

if [ -t 1 ]; then
  C_RED=$'\033[31m'
  C_AMBER=$'\033[33m'
  C_GREEN=$'\033[32m'
  C_DIM=$'\033[2m'
  C_BOLD=$'\033[1m'
  C_RESET=$'\033[0m'
else
  C_RED=""
  C_AMBER=""
  C_GREEN=""
  C_DIM=""
  C_BOLD=""
  C_RESET=""
fi

log() { printf '%s[%s]%s %s\n' "$C_DIM" "$SCRIPT_NAME" "$C_RESET" "$*" >&2; }
warn() { printf '%s[%s]%s %s%s%s\n' "$C_DIM" "$SCRIPT_NAME" "$C_RESET" "$C_AMBER" "$*" "$C_RESET" >&2; }
err()  { printf '%s[%s]%s %s%s%s\n' "$C_DIM" "$SCRIPT_NAME" "$C_RESET" "$C_RED"   "$*" "$C_RESET" >&2; }

die_config() { err "$*"; exit 2; }
die_deps()   { err "$*"; exit 3; }

# ---------- flag parsing ----------------------------------------------------

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h)
      print_help
      exit 0
      ;;
    --pass)
      PASS="${2:-}"
      shift 2
      ;;
    --out)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --db-url)
      DB_URL="${2:-}"
      shift 2
      ;;
    --apps)
      APPS_CSV="${2:-}"
      shift 2
      ;;
    *)
      die_config "Unknown flag: $1 (try --help)"
      ;;
  esac
done

case "$PASS" in
  1|2|all) ;;
  *) die_config "--pass must be 1, 2, or all (got: $PASS)" ;;
esac

# OUT_DIR default is set AFTER the dep check, once TIMESTAMP is available.

# ---------- dep check -------------------------------------------------------

# Only check non-coreutils deps. Standard POSIX utilities (date, awk, sed, grep,
# cut, tr, wc, head, tail, sort, mkdir) are assumed present; if /usr/bin is on
# PATH they're all available, and `set -e` will surface any actual missing one
# with a clear shell error if not.
command -v psql    >/dev/null 2>&1 || die_deps "psql not found in PATH (install PostgreSQL client)."
command -v rg      >/dev/null 2>&1 || die_deps "rg (ripgrep) not found in PATH."
command -v python3 >/dev/null 2>&1 || die_deps "python3 not found in PATH."

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
if [ -z "$OUT_DIR" ]; then
  OUT_DIR="./audit-out-$TIMESTAMP"
fi

# ---------- resolve DB URL --------------------------------------------------

strip_quotes() {
  # Remove surrounding single or double quotes from stdin.
  sed -E "s/^[\"']//; s/[\"']$//"
}

resolve_db_url() {
  if [ -n "$DB_URL" ]; then
    return 0
  fi
  if [ -n "${POSTGRES_URL_NON_POOLING:-}" ]; then
    DB_URL="$POSTGRES_URL_NON_POOLING"
    return 0
  fi
  if [ -f "crm7/.env.local" ]; then
    local raw
    raw="$(grep -E '^POSTGRES_URL_NON_POOLING=' crm7/.env.local | head -1 | cut -d= -f2- || true)"
    if [ -n "$raw" ]; then
      DB_URL="$(printf '%s' "$raw" | strip_quotes)"
      return 0
    fi
  fi
  die_config "No DB URL available. Pass --db-url <url>, set POSTGRES_URL_NON_POOLING, or run from a repo with crm7/.env.local."
}

resolve_db_url

# ---------- output dir ------------------------------------------------------

mkdir -p "$OUT_DIR" || die_config "Cannot create output dir: $OUT_DIR"
if [ ! -w "$OUT_DIR" ]; then
  die_config "Output dir not writable: $OUT_DIR"
fi
log "Output dir: $OUT_DIR"

# ---------- app list --------------------------------------------------------

IFS=',' read -r -a APPS <<< "$APPS_CSV"
VALID_APPS=()
for app in "${APPS[@]}"; do
  app="$(printf '%s' "$app" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
  [ -z "$app" ] && continue
  if [ -d "$app" ]; then
    VALID_APPS+=("$app")
  else
    warn "App directory missing, skipping: $app"
  fi
done
if [ "${#VALID_APPS[@]}" -eq 0 ] && [ "$PASS" != "1" ]; then
  warn "No app directories found for pass-2; pass-2 signals will be empty."
fi
log "Apps in scope: ${VALID_APPS[*]:-<none>}"

# ---------- DB connection test ---------------------------------------------

log "Testing DB connection…"
if ! psql "$DB_URL" -t -A -c 'SELECT 1;' >/dev/null 2>&1; then
  die_config "Cannot connect to DB. Check --db-url / POSTGRES_URL_NON_POOLING."
fi
log "DB connection OK."

# ---------- pass-1 psql invoker --------------------------------------------

psql_tsv() {
  # $1 = output file, reads SQL from stdin.
  local out="$1"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t > "$out"
}

# ---------- pass 1 ----------------------------------------------------------

run_pass1() {
  log "Pass 1: collecting DB-side signals…"

  printf 'relname\ttotal_size\test_rows\twrites\tseq_scan\tidx_scan\tlast_vac\n' > "$OUT_DIR/inventory.tsv"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t <<'SQL' >> "$OUT_DIR/inventory.tsv"
SELECT
  t.relname,
  pg_size_pretty(pg_total_relation_size(t.oid)),
  t.reltuples::bigint,
  COALESCE(s.n_tup_ins,0) + COALESCE(s.n_tup_upd,0) + COALESCE(s.n_tup_del,0),
  COALESCE(s.seq_scan,0),
  COALESCE(s.idx_scan,0),
  COALESCE(s.last_autovacuum::text, s.last_vacuum::text, '-')
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = t.oid
WHERE n.nspname = 'public' AND t.relkind = 'r'
ORDER BY t.relname;
SQL

  printf 'relname\tincoming_fks\n' > "$OUT_DIR/fk-incoming.tsv"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t <<'SQL' >> "$OUT_DIR/fk-incoming.tsv"
SELECT c.relname, count(*)
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.confrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE con.contype = 'f' AND n.nspname = 'public'
GROUP BY c.relname
ORDER BY c.relname;
SQL

  printf 'relname\trls_policies\n' > "$OUT_DIR/rls-policies.tsv"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t <<'SQL' >> "$OUT_DIR/rls-policies.tsv"
SELECT tablename, count(*)
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
SQL

  printf 'relname\ttriggers\n' > "$OUT_DIR/triggers.tsv"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t <<'SQL' >> "$OUT_DIR/triggers.tsv"
SELECT c.relname, count(*)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
GROUP BY c.relname
ORDER BY c.relname;
SQL

  printf 'relname\tfn_refs\n' > "$OUT_DIR/fn-refs.tsv"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t <<'SQL' >> "$OUT_DIR/fn-refs.tsv"
WITH tbls AS (
  SELECT c.relname
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
fns AS (
  SELECT p.proname, pg_get_functiondef(p.oid) AS src
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
)
SELECT t.relname, count(DISTINCT f.proname)
FROM tbls t
LEFT JOIN fns f ON f.src ~* ('\m' || t.relname || '\M')
GROUP BY t.relname
HAVING count(DISTINCT f.proname) > 0
ORDER BY t.relname;
SQL

  printf 'relname\tview_refs\n' > "$OUT_DIR/view-refs.tsv"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t <<'SQL' >> "$OUT_DIR/view-refs.tsv"
WITH tbls AS (
  SELECT c.relname
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
views AS (
  SELECT c.relname AS view_name, pg_get_viewdef(c.oid) AS src
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
)
SELECT t.relname, count(DISTINCT v.view_name)
FROM tbls t
LEFT JOIN views v ON v.src ~* ('\m' || t.relname || '\M')
GROUP BY t.relname
HAVING count(DISTINCT v.view_name) > 0
ORDER BY t.relname;
SQL

  printf 'relname\tn_live_tup\tn_dead_tup\tlast_autovacuum\tlast_autoanalyze\n' > "$OUT_DIR/stats-activity.tsv"
  psql "$DB_URL" -A -F $'\t' --quiet --no-align --pset=pager=off -t <<'SQL' >> "$OUT_DIR/stats-activity.tsv"
SELECT relname, n_live_tup, n_dead_tup,
       COALESCE(last_autovacuum::text, '-'),
       COALESCE(last_autoanalyze::text, '-')
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
SQL

  local n
  n=$(($(wc -l < "$OUT_DIR/inventory.tsv") - 1))
  log "Pass 1 complete: $n tables in public schema."
}

# ---------- pass 2 ----------------------------------------------------------

extract_tables() {
  # From inventory.tsv, emit table names (skip header).
  tail -n +2 "$OUT_DIR/inventory.tsv" | cut -f1
}

count_hits_in_dir() {
  # $1 = pattern (fixed string), $2 = dir, $3 = extra glob flags
  # Returns count of MATCHING LINES (not files), 0 on no dir / no hits.
  local pattern="$1" dir="$2"
  shift 2 || true
  [ -d "$dir" ] || { printf 0; return; }
  # shellcheck disable=SC2068
  rg -cIF "$pattern" "$dir" $@ 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}'
}

count_files_in_dir() {
  # Like count_hits_in_dir but counts FILES matching (loose), not lines.
  local pattern="$1" dir="$2"
  shift 2 || true
  [ -d "$dir" ] || { printf 0; return; }
  # shellcheck disable=SC2068
  rg -lIF "$pattern" "$dir" $@ 2>/dev/null | wc -l | tr -d ' '
}

run_pass2() {
  log "Pass 2: collecting app-surface signals…"

  local strict_hdr="table"
  local loose_hdr="table"
  local edge_hdr="table"
  for app in "${VALID_APPS[@]}"; do
    strict_hdr+="\t$app"
    loose_hdr+="\t$app"
    edge_hdr+="\t$app"
  done
  strict_hdr+="\ttotal"
  loose_hdr+="\ttotal"
  edge_hdr+="\ttotal"

  printf '%b\n' "$strict_hdr" > "$OUT_DIR/app-refs-strict.tsv"
  printf '%b\n' "$loose_hdr"  > "$OUT_DIR/app-refs-loose.tsv"
  printf '%b\n' "$edge_hdr"   > "$OUT_DIR/edge-fn-refs.tsv"
  printf 'table\ttypes_refs\n' > "$OUT_DIR/types-refs.tsv"

  local exclude_globs=(--glob '!node_modules' --glob '!.next' --glob '!dist' --glob '!build' --glob '!.turbo' --glob '!*.lock' --glob '!pnpm-lock.yaml' --glob '!package-lock.json')

  local t
  local -i i=0
  local -i total_tables
  total_tables=$(extract_tables | wc -l | tr -d ' ')

  while IFS= read -r t; do
    [ -z "$t" ] && continue
    i=$((i + 1))
    if [ $((i % 25)) -eq 0 ]; then
      log "Pass 2 progress: $i / $total_tables tables"
    fi

    # strict: `'<table>'` literal across <app>/src/
    local strict_row="$t"
    local strict_total=0
    for app in "${VALID_APPS[@]}"; do
      local c
      c=$(count_hits_in_dir "'$t'" "$app/src")
      strict_row+="\t$c"
      strict_total=$((strict_total + c))
    done
    strict_row+="\t$strict_total"
    printf '%b\n' "$strict_row" >> "$OUT_DIR/app-refs-strict.tsv"

    # loose: count of FILES containing the table name anywhere in the app tree
    local loose_row="$t"
    local loose_total=0
    for app in "${VALID_APPS[@]}"; do
      local c
      c=$(count_files_in_dir "$t" "$app" "${exclude_globs[@]}")
      loose_row+="\t$c"
      loose_total=$((loose_total + c))
    done
    loose_row+="\t$loose_total"
    printf '%b\n' "$loose_row" >> "$OUT_DIR/app-refs-loose.tsv"

    # edge functions: <app>/supabase/functions
    local edge_row="$t"
    local edge_total=0
    for app in "${VALID_APPS[@]}"; do
      local c
      c=$(count_files_in_dir "$t" "$app/supabase/functions")
      edge_row+="\t$c"
      edge_total=$((edge_total + c))
    done
    edge_row+="\t$edge_total"
    printf '%b\n' "$edge_row" >> "$OUT_DIR/edge-fn-refs.tsv"

    # generated types refs
    local types_total=0
    for app in "${VALID_APPS[@]}"; do
      [ -d "$app" ] || continue
      local c
      c=$(rg -lIF "$t" "$app" --glob 'database.types.ts' --glob 'supabase.types.ts' --glob 'db.types.ts' 2>/dev/null | wc -l | tr -d ' ')
      types_total=$((types_total + c))
    done
    printf '%s\t%d\n' "$t" "$types_total" >> "$OUT_DIR/types-refs.tsv"

  done < <(extract_tables)

  # rpc-calls.txt: sorted-unique list of .rpc('name') references
  : > "$OUT_DIR/rpc-calls.txt"
  if [ "${#VALID_APPS[@]}" -gt 0 ]; then
    local rpc_roots=()
    for app in "${VALID_APPS[@]}"; do
      [ -d "$app/src" ] && rpc_roots+=("$app/src")
    done
    if [ "${#rpc_roots[@]}" -gt 0 ]; then
      rg -IoE "\.rpc\(['\"]([a-z_][a-z0-9_]*)['\"]" "${rpc_roots[@]}" --glob '!node_modules' -r '$1' 2>/dev/null \
        | sort -u >> "$OUT_DIR/rpc-calls.txt" || true
    fi
  fi

  log "Pass 2 complete: $total_tables tables scanned across ${#VALID_APPS[@]} apps."
}

# ---------- merge + classify -----------------------------------------------

run_merge() {
  log "Merging signals + classifying…"

  OUT_DIR="$OUT_DIR" python3 <<'PYEOF'
import csv, os, sys

out = os.environ['OUT_DIR']

def kv(path, skip_header=True):
    d = {}
    p = os.path.join(out, path)
    if not os.path.exists(p): return d
    with open(p) as f:
        if skip_header: next(f, None)
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) >= 2 and parts[0]:
                try: d[parts[0]] = int(parts[1])
                except ValueError: pass
    return d

def inventory():
    d = {}
    p = os.path.join(out, 'inventory.tsv')
    if not os.path.exists(p): return d
    with open(p) as f:
        next(f, None)
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) >= 7 and parts[0]:
                d[parts[0]] = {
                    'size': parts[1],
                    'rows': parts[2],
                    'writes': int(parts[3] or 0),
                    'seqs':   int(parts[4] or 0),
                    'idxs':   int(parts[5] or 0),
                    'last_vac': parts[6],
                }
    return d

def last_col(path):
    """Load table->total_of_last_column from multi-column TSVs (strict/loose/edge)."""
    d = {}
    p = os.path.join(out, path)
    if not os.path.exists(p): return d
    with open(p) as f:
        next(f, None)
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) >= 2 and parts[0]:
                try: d[parts[0]] = int(parts[-1])
                except ValueError: pass
    return d

inv   = inventory()
fk    = kv('fk-incoming.tsv')
rls   = kv('rls-policies.tsv')
trg   = kv('triggers.tsv')
fns   = kv('fn-refs.tsv')
views = kv('view-refs.tsv')
strict = last_col('app-refs-strict.tsv')
loose  = last_col('app-refs-loose.tsv')
edge   = last_col('edge-fn-refs.tsv')
types  = kv('types-refs.tsv')

rows = []
for t, meta in sorted(inv.items()):
    app_any = max(strict.get(t,0), loose.get(t,0), edge.get(t,0), types.get(t,0))
    db_internal = fk.get(t,0) + fns.get(t,0) + views.get(t,0) + trg.get(t,0)
    has_activity = (meta['writes'] > 0) or (meta['idxs'] > 5) or (meta['seqs'] > 5)

    strong_app = strict.get(t,0) > 0 or edge.get(t,0) > 0
    weak_app   = loose.get(t,0) > 0 or types.get(t,0) > 0

    # USED_STRONG requires BOTH an app/edge-function reference AND a DB-internal
    # reference (FK, view, function, or trigger) — matching the audit doc's
    # documented classification rule. A strong app ref alone, or a weak app ref
    # paired with DB-internal refs, falls through to USED_WEAK.
    if strong_app and db_internal > 0:
        verdict = 'USED_STRONG'
    elif strong_app or weak_app or db_internal > 0:
        verdict = 'USED_WEAK'
    elif has_activity:
        # Stats show activity but no code/DB refs; pass-2 closure should resolve.
        verdict = 'UNCLEAR'
    else:
        # Zero signals anywhere. Neutral bucket. Human review per the audit doc's
        # "Verdict vocabulary" subsection must split this into NEEDS_WIRING
        # (keep + wire up) vs DROP_ELIGIBLE_PENDING_APPROVAL (separate PR).
        verdict = 'NEEDS_REVIEW'

    rows.append({
        'table': t,
        'size':    meta['size'],
        'rows':    meta['rows'],
        'writes':  meta['writes'],
        'seqs':    meta['seqs'],
        'idxs':    meta['idxs'],
        'fks':     fk.get(t,0),
        'rls':     rls.get(t,0),
        'triggers':trg.get(t,0),
        'fns':     fns.get(t,0),
        'views':   views.get(t,0),
        'app_strict': strict.get(t,0),
        'app_loose':  loose.get(t,0),
        'edge':    edge.get(t,0),
        'types':   types.get(t,0),
        'verdict': verdict,
    })

cols = ['table','size','rows','writes','seqs','idxs','fks','rls','triggers',
        'fns','views','app_strict','app_loose','edge','types','verdict']

merged_path = os.path.join(out, 'audit-merged.tsv')
with open(merged_path, 'w', newline='') as f:
    w = csv.writer(f, delimiter='\t')
    w.writerow(cols)
    for r in rows:
        w.writerow([r[c] for c in cols])

# summary counts for the shell to read
tally = {}
for r in rows:
    tally[r['verdict']] = tally.get(r['verdict'], 0) + 1

with open(os.path.join(out, 'summary.tsv'), 'w') as f:
    f.write('verdict\tcount\n')
    for v in ('USED_STRONG','USED_WEAK','UNCLEAR','NEEDS_REVIEW'):
        f.write(f"{v}\t{tally.get(v,0)}\n")
    f.write(f"TOTAL\t{len(rows)}\n")

needs_review = [r['table'] for r in rows if r['verdict'] == 'NEEDS_REVIEW']
unclear      = [r['table'] for r in rows if r['verdict'] == 'UNCLEAR']
with open(os.path.join(out, 'attention.txt'), 'w') as f:
    f.write('# Tables needing human attention\n')
    f.write('\n## UNCLEAR (DB activity, no code refs)\n')
    for t in unclear: f.write(f'- {t}\n')
    f.write('\n## NEEDS_REVIEW (no signals anywhere)\n')
    for t in needs_review: f.write(f'- {t}\n')

print(f'Wrote {merged_path} ({len(rows)} tables)', file=sys.stderr)
PYEOF

  log "Merge complete: $OUT_DIR/audit-merged.tsv"
}

# ---------- summary ---------------------------------------------------------

print_summary() {
  if [ ! -f "$OUT_DIR/summary.tsv" ]; then
    warn "No summary.tsv produced; skipping summary."
    return
  fi

  printf '\n%s== Table usage audit summary ==%s\n' "$C_BOLD" "$C_RESET"
  printf '  DB URL:    %s\n' "$(printf '%s' "$DB_URL" | sed -E 's|:[^:@]+@|:<redacted>@|')"
  printf '  Output:    %s\n' "$OUT_DIR"
  printf '  Apps:      %s\n' "${VALID_APPS[*]:-<none>}"
  printf '  Pass:      %s\n\n' "$PASS"

  # Read summary.tsv and colorize.
  while IFS=$'\t' read -r verdict count; do
    [ "$verdict" = "verdict" ] && continue
    case "$verdict" in
      USED_STRONG)  printf '  %-14s %s%d%s\n' "$verdict:" "$C_GREEN" "$count" "$C_RESET" ;;
      USED_WEAK)    printf '  %-14s %s%d%s\n' "$verdict:" "$C_GREEN" "$count" "$C_RESET" ;;
      UNCLEAR)      printf '  %-14s %s%d%s\n' "$verdict:" "$C_AMBER" "$count" "$C_RESET" ;;
      NEEDS_REVIEW) printf '  %-14s %s%d%s\n' "$verdict:" "$C_RED"   "$count" "$C_RESET" ;;
      TOTAL)        printf '  %-14s %s%d%s\n' "$verdict:" "$C_BOLD"  "$count" "$C_RESET" ;;
      *)            printf '  %-14s %d\n' "$verdict:" "$count" ;;
    esac
  done < "$OUT_DIR/summary.tsv"

  # Attention list
  if [ -f "$OUT_DIR/attention.txt" ]; then
    local unclear_count needs_count
    unclear_count=$(awk -F'\t' '$1=="UNCLEAR" {print $2}' "$OUT_DIR/summary.tsv" || echo 0)
    needs_count=$(awk -F'\t' '$1=="NEEDS_REVIEW" {print $2}' "$OUT_DIR/summary.tsv" || echo 0)
    if [ "${unclear_count:-0}" != "0" ] || [ "${needs_count:-0}" != "0" ]; then
      printf '\n%sTables needing human attention:%s see %s\n' "$C_BOLD" "$C_RESET" "$OUT_DIR/attention.txt"
    fi
  fi

  printf '\n%sNext:%s review %s/audit-merged.tsv and consult docs/20260506-table-usage-audit-v1.00F.md.\n\n' "$C_BOLD" "$C_RESET" "$OUT_DIR"
}

# ---------- main ------------------------------------------------------------

main() {
  case "$PASS" in
    1)
      run_pass1
      # Minimal merge (no app cols) so users still get a usable TSV.
      # Create empty pass-2 TSVs with just a header so the merger can consume them.
      printf 'table\ttotal\n' > "$OUT_DIR/app-refs-strict.tsv"
      printf 'table\ttotal\n' > "$OUT_DIR/app-refs-loose.tsv"
      printf 'table\ttotal\n' > "$OUT_DIR/edge-fn-refs.tsv"
      printf 'table\ttypes_refs\n' > "$OUT_DIR/types-refs.tsv"
      : > "$OUT_DIR/rpc-calls.txt"
      run_merge
      ;;
    2)
      # Pass 2 requires pass-1 output; if missing, run pass-1 first.
      if [ ! -f "$OUT_DIR/inventory.tsv" ]; then
        warn "Pass-1 inventory not present in $OUT_DIR; running pass-1 first."
        run_pass1
      fi
      run_pass2
      run_merge
      ;;
    all)
      run_pass1
      run_pass2
      run_merge
      ;;
  esac

  print_summary
}

main "$@"

# After checkout, make this script executable:
#   chmod +x scripts/audit-tables.sh
