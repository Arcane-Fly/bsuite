#!/usr/bin/env bash
#
# rehearse-local.sh — run the migration rehearsal on THIS machine.
#
# WHY THIS FILE EXISTS
# ────────────────────
# `.github/workflows/supabase-migration-rehearsal.yml` already proves a migration
# applies on top of the production baseline. It only does so on a PR, on a GitHub
# runner. That leaves the question this estate keeps paying for — "does this
# migration apply cleanly, AND does the feature work against the result?" —
# answerable only after you have pushed, and the second half not answerable at
# all, because a runner has no app and no browser.
#
# There is ONE shared Supabase project. `d.crm.crm7.app` runs development CODE
# against main's SCHEMA, so a migration-dependent feature has nowhere to be
# exercised before production. Supabase is installed locally. This is the path
# that uses it, and `--keep` is the half CI structurally cannot give you.
#
# rehearsal-bootstrap.sh's header already claimed it was "used by BOTH the local
# run and CI". There was no local run. This is it.
#
# WHAT IT DOES
#   1. Preflight — docker, supabase CLI, psql, the baseline dump, all six
#      submodules. Refuses rather than rehearsing a fraction of the estate.
#   2. Boots a disposable Supabase database in an ISOLATED temp project.
#   3. Runs the positive control FIRST — a good migration, a broken one, and a
#      silent no-op — and stops if the instrument cannot tell them apart.
#   4. Builds the production baseline substrate (364 tables, Postgres 17).
#   5. Replays every scope in global version order and judges the ones you changed.
#   6. With --keep, leaves the database up and prints its URL.
#
# HOW THIS DELIBERATELY DIVERGES FROM THE CI JOB, AND WHY
# ──────────────────────────────────────────────────────
# CI gets a pristine, disposable runner. A laptop is neither, and the two
# differences below are both capable of destroying a developer's work. Rather
# than reproduce CI's steps and inherit hazards CI is immune to, this script
# runs the same ENGINE (rehearse-migrations.mjs) and the same SUBSTRATE
# (rehearsal-bootstrap.sh) inside an isolated Supabase project of its own:
#
#   * PORT COLLISION → WRONG DATABASE. Every app in this estate pins its local
#     Supabase to 54322, and so does the parent's config.toml — which is what
#     the CI job connects to. If crm7's stack is already up (measured: 354 tables
#     in `public`), `...@127.0.0.1:54322/postgres` IS crm7's database, and
#     rehearsal-bootstrap.sh opens by dropping every table in `public`. That is
#     not a wrong answer; it is destroyed local data. So the rehearsal gets its
#     own project_id ("bsuite_rehearsal" → container `supabase_db_bsuite_rehearsal`)
#     and its own port, and refuses to touch any database it did not itself start.
#
#   * THE MIGRATIONS STASH. The CI job must `mv supabase/migrations` aside before
#     `db start`, because db start auto-applies them and the parent's 22 are not
#     replayable from empty. On a runner an interrupted move costs nothing. Here
#     it strands 22 tracked files in /tmp and the repository looks like someone
#     deleted them. Booting from a temp project directory removes the need to
#     move anything: it has no migrations to auto-apply, so the tracked tree is
#     never written to at all.
#
# Everything that constitutes the VERDICT is shared with CI. Only the container
# the verdict is computed in differs.
#
# Usage:
#   scripts/supabase/rehearse-local.sh [options]
#
#     --changed <a,b>   Comma-separated migration paths to GATE (repo-relative).
#                       Default: auto-detected against origin/development.
#     --all-above-floor Gate every migration at or above the floor. Slow (a
#                       catalog census per migration) but answers the broader
#                       question "can this tree rebuild the database at all".
#     --keep            Leave the database running and print its URL, so you can
#                       point an app at the post-migration schema.
#     --port <n>        Port for the rehearsal database (default 54522).
#     --reuse           Reuse a rehearsal database this script already started.
#     --no-self-test    Skip the positive control. You are then trusting an
#                       instrument you have not checked. Not recommended.
#     --stop            Stop the rehearsal database and exit.
#     -h, --help        This header.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Kept in lockstep with supabase-migration-rehearsal.yml's `env:` block. If you
# change one, change the other — they are the same two facts about the estate.
BASELINE_MAX='20260807110000'
MIGRATION_FLOOR='20260611000000'

# Distinct from every app's 54322 ON PURPOSE — see the header. CI uses 54322
# because a runner has nothing else on it.
DB_PORT=54522
PROJECT_ID='bsuite_rehearsal'
WORKDIR="${TMPDIR:-/tmp}/bsuite-rehearsal-workdir"

CHANGED=''
GATE_ALL=0
KEEP=0
SELF_TEST=1
REUSE=0
STOP_ONLY=0
STARTED_BY_US=0

while [ $# -gt 0 ]; do
  case "$1" in
    --changed) CHANGED="${2:?--changed needs a value}"; shift 2 ;;
    --all-above-floor) GATE_ALL=1; shift ;;
    --keep) KEEP=1; shift ;;
    --port) DB_PORT="${2:?--port needs a value}"; shift 2 ;;
    --reuse) REUSE=1; shift ;;
    --no-self-test) SELF_TEST=0; shift ;;
    --stop) STOP_ONLY=1; shift ;;
    -h|--help) sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//;$d'; exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
done

DB_URL="postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres"
OUR_CONTAINER="supabase_db_${PROJECT_ID}"

say()  { printf '\n\033[1m── %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mFAIL: %s\033[0m\n' "$*" >&2; exit 1; }

# The temp project directory. It carries NO migrations, which is precisely why
# `db start` here cannot auto-apply the parent's 22 and the tracked tree never
# has to be moved aside. major_version and shadow_port are read from the real
# config.toml so the rehearsal cannot drift onto a different Postgres major than
# production — two places to change one value is how they come to disagree.
write_workdir() {
  local major shadow
  major="$(sed -n '/^\[db\]/,$p' supabase/config.toml | grep -m1 '^major_version' | tr -dc '0-9')"
  shadow=$((DB_PORT - 2))
  mkdir -p "$WORKDIR/supabase"
  cat > "$WORKDIR/supabase/config.toml" <<EOF
# GENERATED by scripts/supabase/rehearse-local.sh — do not edit, do not commit.
# An isolated Supabase project so the rehearsal can never collide with, or be
# mistaken for, an app's local stack on 54322.
project_id = "${PROJECT_ID}"

[db]
port = ${DB_PORT}
shadow_port = ${shadow}
major_version = ${major:-17}
EOF
}

stop_db() { supabase --workdir "$WORKDIR" stop --no-backup >/dev/null 2>&1 || true; }

if [ "$STOP_ONLY" -eq 1 ]; then
  write_workdir
  say "Stopping the rehearsal database"
  stop_db
  echo "  stopped (if it was running)"
  exit 0
fi

cleanup() {
  local rc=$?
  if [ "$KEEP" -eq 0 ] && [ "$STARTED_BY_US" -eq 1 ]; then
    say "Stopping the disposable database"
    stop_db
  fi
  return $rc
}
trap cleanup EXIT INT TERM

# ───────────────────────── preflight ─────────────────────────
say "Preflight"

command -v docker   >/dev/null 2>&1 || die "docker is not installed."
docker info         >/dev/null 2>&1 || die "the docker daemon is not reachable. Start Docker and retry."
command -v supabase >/dev/null 2>&1 || die "the supabase CLI is not installed — https://supabase.com/docs/guides/local-development"
command -v psql     >/dev/null 2>&1 || die "psql is not installed (apt-get install postgresql-client)."
command -v node     >/dev/null 2>&1 || die "node is not installed."

# crm7 renames this file as it re-cuts the baseline (20260807 -> 20260907,
# crm7#2533) with no forwarding path, so a hardcoded filename goes stale the
# next time crm7 does. Resolved by pattern instead: newest
# `*_prod_baseline_schema_dump.sql` by name (the 14-digit YYYYMMDD prefix
# sorts lexicographically = chronologically). Exactly one candidate is
# required — see rehearsal-bootstrap.sh for the same resolution, shared logic
# duplicated here because this script runs before submodules are guaranteed
# present and cannot source a file that may not exist yet.
BASELINE_DIR="$ROOT/crm7/supabase/migrations/baseline"
mapfile -t BASELINE_CANDIDATES < <(find "$BASELINE_DIR" -maxdepth 1 -name '*_prod_baseline_schema_dump.sql' 2>/dev/null | sort)

case "${#BASELINE_CANDIDATES[@]}" in
  0)
    die "no *_prod_baseline_schema_dump.sql found under $BASELINE_DIR

The substrate is the PRODUCTION BASELINE, not an empty database. Replaying onto
an empty database is exactly what lets CREATE TABLE IF NOT EXISTS look like it
worked — the estate's historical defect. Run:
  git submodule update --init --recursive"
    ;;
  1)
    BASELINE="${BASELINE_CANDIDATES[0]}"
    ;;
  *)
    die "${#BASELINE_CANDIDATES[@]} baseline dumps found under $BASELINE_DIR — refusing to guess which is production's:
$(printf '  %s\n' "${BASELINE_CANDIDATES[@]}")
Remove the stale one(s) or resolve the collision before rehearsing."
    ;;
esac

# A rehearsal missing a scope is not a rehearsal. Same assertion the CI job
# makes, for the same reason: a partial checkout finds no problem and reports
# success, which is worse than failing.
missing=''
for a in crm7 R80.4 braden business-suite-unified conduit throughput; do
  [ -e "$a/.git" ] || missing="$missing $a"
done
[ -z "$missing" ] || die "submodules not checked out:$missing

'git worktree add' does not populate submodules, so the rehearsal would replay
the parent's 22 migrations, find nothing wrong, and report a false pass. Run:
  git submodule update --init --recursive"

for a in crm7 R80.4 braden business-suite-unified conduit throughput; do
  printf '  %-26s %4s migration(s)\n' "$a" \
    "$(find "$a/supabase/migrations" -maxdepth 1 -name '*.sql' 2>/dev/null | wc -l)"
done
printf '  %-26s %4s CREATE TABLE statements\n' 'baseline' "$(grep -c -F 'CREATE TABLE ' "$BASELINE")"

# ───────────────────────── the wrong-database guard ─────────────────────────
say "Checking port ${DB_PORT} is ours"

holder="$(docker ps --filter "publish=${DB_PORT}" --format '{{.Names}}' 2>/dev/null | head -1)"
if [ -n "$holder" ] && [ "$holder" != "$OUR_CONTAINER" ]; then
  die "port ${DB_PORT} is held by container '${holder}', not '${OUR_CONTAINER}'.

The substrate build drops every table in \`public\`. Against another stack's
database that is destroyed local data, not a wrong answer. Refusing.

Either stop that container, or give the rehearsal a different port:
    scripts/supabase/rehearse-local.sh --port 54622"
fi
if [ -z "$holder" ] && [ "$REUSE" -eq 1 ]; then
  die "--reuse was passed but nothing is listening on ${DB_PORT}."
fi
echo "  ${DB_PORT}: ${holder:-free}"

# ───────────────────────── boot ─────────────────────────
write_workdir
if [ "$REUSE" -eq 0 ]; then
  say "Starting the disposable database (project ${PROJECT_ID}, port ${DB_PORT})"
  [ -n "$holder" ] && stop_db
  supabase --workdir "$WORKDIR" db start
  STARTED_BY_US=1
else
  say "Reusing the rehearsal database on ${DB_PORT}"
  STARTED_BY_US=1
fi

# Belt and braces. Whatever we think we started, confirm the thing answering on
# the port is the container we named — BEFORE anything destructive runs.
now_holding="$(docker ps --filter "publish=${DB_PORT}" --format '{{.Names}}' 2>/dev/null | head -1)"
[ "$now_holding" = "$OUR_CONTAINER" ] \
  || die "after start, port ${DB_PORT} is held by '${now_holding:-nothing}', expected '${OUR_CONTAINER}'. Refusing to touch it."
psql "$DB_URL" -At -c "SELECT 'connected: postgres ' || current_setting('server_version');" \
  || die "cannot reach $DB_URL"

# ───────────────────────── positive control ─────────────────────────
# BEFORE the real replay, against the same engine that will judge it. A gate
# never seen to fail is not a gate.
if [ "$SELF_TEST" -eq 1 ]; then
  say "Positive control — prove the gate can fail before trusting it to pass"
  node scripts/supabase/rehearse-migrations.mjs --self-test --db-url "$DB_URL" \
    || die "the self-test did not reproduce its expected verdicts.
The INSTRUMENT is broken, not your migration. Do not trust any result below it."
fi

# ───────────────────────── substrate ─────────────────────────
say "Building the production baseline substrate"
./scripts/supabase/rehearsal-bootstrap.sh "$DB_URL" "$ROOT"

# ───────────────────────── what to gate ─────────────────────────
# Auto-detection mirrors the CI job: parent-tree migration files plus the
# migrations that moved inside each submodule. Locally the comparison point is
# the merge-base with origin/development rather than a PR base sha, and
# uncommitted work counts too — the whole point is to check BEFORE pushing.
if [ "$GATE_ALL" -eq 1 ]; then
  say "Gating every migration at or above the floor ${MIGRATION_FLOOR}"
  CHANGED="$(
    for dir in . crm7 R80.4 braden business-suite-unified conduit throughput; do
      d="${dir}/supabase/migrations"; [ -d "$d" ] || continue
      find "$d" -maxdepth 1 -name '*.sql'
    done | sed 's#^\./##' | while read -r f; do
      v="$(basename "$f")"; v="${v%%_*}"
      case "$v" in ''|*[!0-9]*) continue ;; esac
      [ "${#v}" -eq 14 ] || continue
      [ "$v" \> "$MIGRATION_FLOOR" ] || [ "$v" = "$MIGRATION_FLOOR" ] || continue
      printf '%s\n' "$f"
    done | sort | paste -sd, -
  )"
elif [ -z "$CHANGED" ]; then
  say "Auto-detecting changed migrations against origin/development"
  base="$(git merge-base HEAD origin/development 2>/dev/null || true)"
  list=''
  if [ -z "$base" ]; then
    echo "  no merge-base with origin/development — falling back to uncommitted work only."
  else
    while IFS= read -r f; do
      case "$f" in *supabase/migrations/*.sql) list="${list}${f}," ;; esac
    done < <(git diff --name-only "$base" HEAD)
  fi
  # Uncommitted and untracked migrations, in the parent and in every submodule.
  while IFS= read -r f; do
    case "$f" in *supabase/migrations/*.sql) list="${list}${f}," ;; esac
  done < <(git status --porcelain --untracked-files=all | cut -c4-)
  for dir in crm7 R80.4 braden business-suite-unified conduit throughput; do
    if [ -n "$base" ]; then
      sub_base="$(git rev-parse --verify --quiet "$base:$dir" 2>/dev/null || true)"
      sub_head="$(git -C "$dir" rev-parse --verify --quiet HEAD 2>/dev/null || true)"
      if [ -n "$sub_base" ] && [ -n "$sub_head" ] && [ "$sub_base" != "$sub_head" ] \
         && git -C "$dir" cat-file -e "$sub_base^{commit}" 2>/dev/null; then
        while IFS= read -r f; do
          case "$f" in supabase/migrations/*.sql) list="${list}${dir}/${f}," ;; esac
        done < <(git -C "$dir" diff --name-only "$sub_base" HEAD)
      fi
    fi
    while IFS= read -r f; do
      case "$f" in supabase/migrations/*.sql) list="${list}${dir}/${f}," ;; esac
    done < <(git -C "$dir" status --porcelain --untracked-files=all 2>/dev/null | cut -c4-)
  done
  CHANGED="$(printf '%s' "${list%,}" | tr ',' '\n' | grep -v '^$' | sort -u | paste -sd, - || true)"
fi
echo "  gating: ${CHANGED:-<nothing — replay only, NO VERDICT will be issued>}"

# ───────────────────────── rehearse ─────────────────────────
say "Rehearsing"
set +e
node scripts/supabase/rehearse-migrations.mjs --apply \
  --db-url "$DB_URL" \
  --baseline-max "$BASELINE_MAX" \
  --floor "$MIGRATION_FLOOR" \
  --changed "$CHANGED"
rc=$?
set -e

if [ "$KEEP" -eq 1 ]; then
  cat <<EOF

── The database is still up ────────────────────────────────────────────────
Replaying the SQL is only half the question. The other half — does the FEATURE
work against the result — is the half CI cannot answer. Point an app at it:

  DATABASE_URL=$DB_URL

Stop it when you are done:
  scripts/supabase/rehearse-local.sh --stop
EOF
fi

if [ $rc -ne 0 ]; then
  printf '\n\033[31mRehearsal FAILED (exit %s) — this would not have been safe to ship.\033[0m\n' "$rc"
  exit $rc
fi
printf '\n\033[32mRehearsal passed.\033[0m\n'
