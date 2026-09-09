#!/usr/bin/env bash
#
# rehearsal-bootstrap.sh — build the substrate a migration rehearsal lands on.
#
# ONE copy, used by BOTH the local run and CI. crm7 already carries this recipe
# twice (pgtap.yml and db-lint.yml's report-catalog-drift job, whose own comment
# admits it is a duplicate "so as not to destabilise the verified bootstrap").
# Two copies of a bootstrap drift, and the one nobody watches becomes the one
# that lies. This is the single copy for the estate-wide rehearsal.
#
# WHAT THE SUBSTRATE IS
#
#   A real Supabase Postgres image (`supabase db start`), NOT a bare postgres
#   container with a hand-rolled auth schema. crm7's replay-schema-diff.sh
#   documents why that distinction matters: a minimal substrate produces
#   failures that belong to the INSTRUMENT and read exactly like defects in the
#   tree. auth.uid(), storage, vault and the extensions schema must be genuine
#   or the gate cries wolf, and a gate that cries wolf is one people mute.
#
#   On top of that: the production baseline dump. It lives in crm7 but it is a
#   dump of the SHARED public schema — 364 tables including conduit's
#   r7_candidates and the platform's user_tenants (verified 2026-08-12). It is
#   the estate's baseline, not crm7's, and is used here as such.
#
#   crm7 renames this file as it re-cuts the baseline (20260807 -> 20260907,
#   crm7#2533, commit 6abcca41e) with no forwarding path, so a hardcoded
#   filename here goes stale the next time crm7 does. It is resolved below by
#   pattern instead: newest `*_prod_baseline_schema_dump.sql` by name (the
#   14-digit YYYYMMDD prefix sorts lexicographically = chronologically).
#   Exactly one candidate is required — zero means the rename broke us again,
#   more than one means a stale dump was left behind and this script refuses
#   to silently guess which is production's.
#
# WHAT IT DELIBERATELY DOES NOT DO
#
#   It does not populate supabase_migrations.schema_migrations. The rehearsal
#   decides what to replay by VERSION ARITHMETIC against the baseline high-water
#   mark, and proves outcomes from the CATALOG. The ledger is never read as
#   evidence and never written as a side effect, so it cannot make a no-op
#   migration look like work.
#
# Usage: rehearsal-bootstrap.sh <db-url> <repo-root>

set -euo pipefail

DB_URL="${1:?usage: rehearsal-bootstrap.sh <db-url> <repo-root>}"
ROOT="${2:?usage: rehearsal-bootstrap.sh <db-url> <repo-root>}"

BASELINE_DIR="$ROOT/crm7/supabase/migrations/baseline"
mapfile -t BASELINE_CANDIDATES < <(find "$BASELINE_DIR" -maxdepth 1 -name '*_prod_baseline_schema_dump.sql' 2>/dev/null | sort)

case "${#BASELINE_CANDIDATES[@]}" in
  0)
    echo "::error::no *_prod_baseline_schema_dump.sql found under $BASELINE_DIR — cannot build a rehearsal substrate"
    exit 1
    ;;
  1)
    BASELINE="${BASELINE_CANDIDATES[0]}"
    ;;
  *)
    echo "::error::${#BASELINE_CANDIDATES[@]} baseline dumps found under $BASELINE_DIR — refusing to guess which is production's:"
    printf '  %s\n' "${BASELINE_CANDIDATES[@]}"
    echo "Remove the stale one(s) or resolve the collision before rehearsing."
    exit 1
    ;;
esac

echo "Baseline: $(wc -c < "$BASELINE") bytes, $(grep -c -F 'CREATE TABLE ' "$BASELINE") CREATE TABLE statements"

echo "→ Clean slate"
# `DROP SCHEMA public CASCADE` is ONE statement, and it takes a lock on every
# object it cascades through. On a fresh container that is nothing. On a REPLAY
# of a replay it is 400 tables plus their policies and constraints, and it dies
# with `out of shared memory / You might need to increase
# max_locks_per_transaction` — which is the INSTRUMENT failing, not the tree.
#
# Found by running this script a second time. The first run passed, so an
# idempotence bug here would have stayed invisible until someone re-ran a
# rehearsal locally and read the lock error as a schema defect.
#
# Fix: drop the tables one statement at a time. psql is in autocommit, so each
# DROP is its own transaction and the locks are released between them. The
# generated script is empty on a fresh database, which makes this a no-op there.
psql "$DB_URL" -At -v ON_ERROR_STOP=1 -c \
  "SELECT 'DROP TABLE IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' CASCADE;'
   FROM pg_tables WHERE schemaname = 'public';" \
  | psql "$DB_URL" -q -f - > /dev/null

psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
SQL

echo "→ Extensions (into the extensions schema, Supabase convention)"
# Order matters and has bitten this estate before: installing pgcrypto into
# `public` first makes the later `WITH SCHEMA extensions` a silent no-op under
# IF NOT EXISTS, so extensions.gen_random_bytes() goes missing and a CREATE
# TABLE fifteen statements later fails for what looks like an ordering defect
# in the tree. It is not. (crm7 scripts/replay-schema-diff.sh header.)
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role, postgres;
SQL

echo "→ catalog schema stub (owned by business-suite-unified, created out-of-band in prod)"
# Matched to the live shape (name NOT NULL, level nullable) on purpose: a stub
# more permissive than production would let a migration pass here that fails
# there, which is worse than having no stub at all.
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE TABLE IF NOT EXISTS catalog.qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  level text
);
GRANT USAGE ON SCHEMA catalog TO anon, authenticated, service_role, postgres;
GRANT SELECT ON catalog.qualifications TO anon, authenticated, service_role;
SQL

echo "→ Applying production baseline"
# set -o pipefail is what makes psql's exit code survive the pipe to tail.
# Without it a baseline that aborted halfway would leave a PARTIAL schema and
# this step would still report success, with everything downstream then running
# against whatever survived.
set -o pipefail
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$BASELINE" 2>&1 | tail -5

echo "→ Substrate built. Catalog proof:"
psql "$DB_URL" -At -v ON_ERROR_STOP=1 <<'SQL'
-- Policies BY SCHEMA, not a single total. This clean slate rebuilds `public`
-- only; objects a previous replay created in `storage` (conduit's
-- candidate-documents bucket migration creates storage policies) survive it.
-- On CI that is moot — the container is created and destroyed per run — but a
-- repeated LOCAL run accumulates them, and a total would hide that behind a
-- number that merely looked bigger. If the non-public counts are not what a
-- fresh `supabase db start` gives you, restart the container before trusting a
-- result: `supabase stop --no-backup && supabase db start`.
SELECT 'policies by schema   = ' || coalesce(string_agg(schemaname || ':' || n, ', ' ORDER BY schemaname), 'none')
  FROM (SELECT schemaname, count(*)::text AS n FROM pg_policies GROUP BY schemaname) s;
SELECT 'public tables        = ' || count(*) FROM pg_tables WHERE schemaname = 'public';
SELECT 'public functions     = ' || count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';
SELECT 'RLS policies         = ' || count(*) FROM pg_policies;
SELECT 'user_tenants         = ' || coalesce(to_regclass('public.user_tenants')::text, 'ABSENT');
SELECT 'r7_candidates        = ' || coalesce(to_regclass('public.r7_candidates')::text, 'ABSENT');
SELECT 'auth.uid()           = ' || coalesce(to_regprocedure('auth.uid()')::text, 'ABSENT');
SQL
