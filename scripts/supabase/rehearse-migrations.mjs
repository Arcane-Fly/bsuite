#!/usr/bin/env node
/**
 * rehearse-migrations.mjs — apply a migration somewhere that is not production,
 * and prove from the catalog that it did what it claims.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `d.crm.crm7.app` runs development CODE against main's SCHEMA. There is one
 * Supabase project, so a migration-dependent change has nowhere to be exercised
 * before it reaches production. Production is the first place the code and the
 * schema ever meet.
 *
 * `supabase-preview-db.yml` already computes WHICH scopes a PR touches. It has
 * never built a database. Its final step prints a warning that the plan is
 * "advisory". A plan nothing executes is future confusion that reads like
 * progress. This script is the executor that plan was always missing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MAKES THIS DIFFERENT FROM crm7's pgtap.yml
 * ─────────────────────────────────────────────────────────────────────────────
 * crm7's pgtap.yml replays the baseline plus crm7's OWN post-baseline
 * migrations. That reproduces "production minus the other seven scopes".
 *
 * The eight scopes share ONE database and ONE `supabase_migrations.schema_migrations`
 * ledger keyed on the 14-digit version ALONE. In production the scopes interleave
 * by version. Measured 2026-08-12: conduit's OLDEST migration
 * (20260304040000_add_rls_to_r7_tables.sql) fails immediately on a fresh database
 * with `relation "user_tenants" does not exist` — `user_tenants` is not conduit's
 * table. conduit's chain is NOT self-contained and never was; it has only ever
 * worked because some other scope created that table first.
 *
 * So a per-scope rehearsal is not merely incomplete, it is WRONG for six of the
 * eight scopes. This script replays the union of all scopes in GLOBAL version
 * order, which is the only ordering production has ever had.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT ASSERTS — AND WHAT IT REFUSES TO ACCEPT AS EVIDENCE
 * ─────────────────────────────────────────────────────────────────────────────
 * A row in `supabase_migrations.schema_migrations` proves THE LEDGER WAS
 * WRITTEN. It does not prove the SQL ran, and this estate has had three distinct
 * "recorded is not applied" mechanisms in a single day. This script never reads
 * that table as evidence of anything.
 *
 * Evidence here is the CATALOG: pg_class / pg_proc / pg_policies / pg_tables /
 * information_schema grants, plus to_regclass() and to_regprocedure() probes.
 *
 * Two failure classes are detected:
 *
 *   1. THE MIGRATION ERRORED. psql exit code, ON_ERROR_STOP=1. Not a grep of
 *      stderr, not a warning that execution continues past.
 *
 *   2. THE MIGRATION APPLIED AND CHANGED NOTHING. `CREATE TABLE IF NOT EXISTS`
 *      on an existing table is a silent no-op that skips every column. A
 *      column-level REVOKE is a no-op while a table-level grant stands. Both
 *      exit 0. Both are caught here by taking a catalog census before and after
 *      and requiring the census to MOVE.
 *
 *      A migration that genuinely only touches DATA (a backfill) legitimately
 *      moves no catalog. It must say so, in the file, on its own line:
 *
 *          -- rehearsal: data-only
 *
 *      That marker is a claim by the author, reviewable in the diff. Its absence
 *      on a no-op migration is a failure, not a warning.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NO REGULAR EXPRESSIONS. Standing estate rule: parsers, not patterns. Version
 * extraction, quarantine parsing and marker detection are all done with string
 * indexing and character-code checks. There is no RegExp in this file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * USAGE
 *   node scripts/supabase/rehearse-migrations.mjs --plan
 *   node scripts/supabase/rehearse-migrations.mjs --self-test --db-url URL
 *   node scripts/supabase/rehearse-migrations.mjs --apply --db-url URL \
 *        [--changed <path,path>] [--baseline-max 20260807110000]
 *
 * The rehearsal database is DISPOSABLE and holds NO production credential.
 * This script must never be pointed at production. --db-url is refused if it
 * does not resolve to a loopback host (see assertLoopback).
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIGIT_0 = '0'.charCodeAt(0);
const DIGIT_9 = '9'.charCodeAt(0);
const VERSION_LENGTH = 14;
const DATA_ONLY_MARKER = '-- rehearsal: data-only';

/* ───────────────────────── parsing (no regex) ───────────────────────── */

function allDigits(text) {
  if (text.length === 0) return false;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < DIGIT_0 || code > DIGIT_9) return false;
  }
  return true;
}

/**
 * `<14-digit-version>_<name>.sql` -> version, else null.
 * Helper files (verify_migrations.sql) and anything not 14 leading digits
 * followed by an underscore are not migrations. Same rule the Supabase CLI uses.
 */
function parseVersion(basename) {
  const underscore = basename.indexOf('_');
  if (underscore !== VERSION_LENGTH) return null;
  const version = basename.slice(0, VERSION_LENGTH);
  return allDigits(version) ? version : null;
}

function isNonTx(basename) {
  return basename.endsWith('.nontx.sql');
}

/** Strip a trailing `# comment`, trim. Used for quarantine files. */
function stripComment(line) {
  const hash = line.indexOf('#');
  return (hash === -1 ? line : line.slice(0, hash)).trim();
}

/** True when any line of the file, trimmed, is exactly the data-only marker. */
function declaresDataOnly(sqlText) {
  for (const line of sqlText.split('\n')) {
    if (line.trim() === DATA_ONLY_MARKER) return true;
  }
  return false;
}

/* ───────────────────────── scope + file discovery ───────────────────────── */

function loadScopes(root) {
  const file = path.join(root, 'supabase', 'migration-scopes.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  return manifest.scopes.map((scope) => ({
    id: scope.id,
    label: scope.label,
    workdir: scope.workdir,
    // A scope may omit migrations_dir (R80.4 does, because the manifest says it
    // owns no database). Derive the conventional path anyway so the FILESYSTEM,
    // not the manifest, gets the last word — see collectMigrations.
    migrationsDir: scope.migrations_dir || path.posix.join(scope.workdir, 'supabase', 'migrations'),
    declaredOwnsDatabase: scope.has_database !== false,
  }));
}

/**
 * Quarantine: a scope may carry `KNOWN-BROKEN-IN-CI.txt` inside its migrations
 * directory (crm7 owns 13 entries today). Entries are paths; we key on basename
 * because that is what is unique per scope. Read from the scope that owns the
 * list — do NOT re-declare another repo's debt in the parent, or the two lists
 * drift and the parent's stale copy silently un-quarantines a still-broken file.
 */
function loadQuarantine(absMigrationsDir) {
  const file = path.join(absMigrationsDir, 'KNOWN-BROKEN-IN-CI.txt');
  if (!fs.existsSync(file)) return new Set();
  const names = new Set();
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const cleaned = stripComment(rawLine);
    if (cleaned.length === 0) continue;
    names.add(path.basename(cleaned));
  }
  return names;
}

function collectMigrations(root, scopes) {
  const found = [];
  const missingScopes = [];
  const manifestDrift = [];
  for (const scope of scopes) {
    const absDir = path.join(root, scope.migrationsDir);
    const dirExists = fs.existsSync(absDir);

    // MANIFEST DRIFT. `has_database: false` is a claim about the world, and the
    // world changes. R80.4 carried that flag from the day it replaced R80.3 and
    // then shipped its first migration (20260814010000_r80_saved_quotes.sql) on
    // 2026-08-12. Trusting the flag would have silently excluded a real
    // migration from rehearsal — the exact "gate that does not gate" shape this
    // script exists to prevent. The filesystem wins; the drift is reported.
    if (!scope.declaredOwnsDatabase) {
      if (!dirExists) continue;
      manifestDrift.push(scope.id);
    }

    if (!dirExists) {
      missingScopes.push(scope.id);
      continue;
    }
    const quarantined = loadQuarantine(absDir);
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.sql')) continue;
      const version = parseVersion(entry.name);
      if (version === null) continue;
      found.push({
        scope: scope.id,
        basename: entry.name,
        abs: path.join(absDir, entry.name),
        rel: path.posix.join(scope.migrationsDir, entry.name),
        version,
        nontx: isNonTx(entry.name),
        quarantined: quarantined.has(entry.name),
      });
    }
  }
  // GLOBAL order — this is production's order. Ties broken deterministically so
  // two runs of the same tree always produce the same sequence.
  found.sort((a, b) => {
    if (a.version !== b.version) return a.version < b.version ? -1 : 1;
    if (a.scope !== b.scope) return a.scope < b.scope ? -1 : 1;
    return a.basename < b.basename ? -1 : 1;
  });
  return { migrations: found, missingScopes, manifestDrift };
}

/* ───────────────────────── psql plumbing ───────────────────────── */

/**
 * The rehearsal target must be a throwaway. A rehearsal that can reach
 * production is not a rehearsal. Loopback-only, checked before any statement.
 */
function assertLoopback(dbUrl) {
  let host;
  try {
    host = new URL(dbUrl).hostname;
  } catch {
    throw new Error('--db-url is not a parsable URL');
  }
  const allowed = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
  if (!allowed.has(host)) {
    throw new Error(
      `refusing to rehearse against non-loopback host "${host}". ` +
        'This script builds and destroys schemas; it must never touch a shared or production database.',
    );
  }
}

function psqlScalar(dbUrl, sql) {
  return execFileSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  }).trim();
}

function psqlFile(dbUrl, absFile, singleTransaction) {
  const args = [dbUrl, '-v', 'ON_ERROR_STOP=1'];
  if (singleTransaction) args.push('--single-transaction');
  args.push('-f', absFile);
  return execFileSync('psql', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/* ───────────────────────── the catalog census ─────────────────────────
 * Every query returns newline-joined, deterministically ORDERED text. We keep
 * the full text (not just a hash) so a change can be REPORTED, not merely
 * detected — "something moved" is not an actionable gate result.
 *
 * System schemas are excluded. `supabase_migrations` is excluded ON PURPOSE:
 * the ledger must never be able to make a no-op migration look like it did work.
 */
const CENSUS_QUERIES = {
  tables: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT n.nspname || '.' || c.relname || ' [' || c.relkind::text || ']' AS x
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r','p','v','m','f')
        AND n.nspname NOT IN ('pg_catalog','information_schema','supabase_migrations')
        AND n.nspname NOT LIKE 'pg_toast%'
        AND n.nspname NOT LIKE 'pg_temp%'
    ) q`,

  columns: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT table_schema || '.' || table_name || '.' || column_name || ' ' ||
             data_type || ' null=' || is_nullable || ' def=' || coalesce(column_default,'-') AS x
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog','information_schema','supabase_migrations')
    ) q`,

  /* prosrc is hashed: a CREATE OR REPLACE FUNCTION that changes only the body
     is exactly the shape of the header-trust fixes under rehearsal today. */
  functions: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
             || ' secdef=' || p.prosecdef::text
             || ' cfg=' || coalesce(array_to_string(p.proconfig, ','), '-')
             || ' body=' || md5(coalesce(p.prosrc, '')) AS x
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema')
    ) q`,

  policies: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT schemaname || '.' || tablename || '.' || policyname
             || ' cmd=' || cmd
             || ' roles=' || array_to_string(roles, '|')
             || ' using=' || md5(coalesce(qual, ''))
             || ' check=' || md5(coalesce(with_check, '')) AS x
      FROM pg_policies
    ) q`,

  rls: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT n.nspname || '.' || c.relname || ' rls=' || c.relrowsecurity::text || ' force=' || c.relforcerowsecurity::text AS x
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r','p')
        AND n.nspname NOT IN ('pg_catalog','information_schema','supabase_migrations')
    ) q`,

  /* Table-level grants. The estate rule is that a column REVOKE cannot beat a
     table grant, so the table grant is what must be observed. */
  grants: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT table_schema || '.' || table_name || ' ' || grantee || ' ' || privilege_type AS x
      FROM information_schema.role_table_grants
      WHERE table_schema NOT IN ('pg_catalog','information_schema','supabase_migrations')
    ) q`,

  // Function EXECUTE grants. `role_table_grants` above is TABLES ONLY, so until
  // 2026-08-17 this census could not see a single function ACL — and this estate
  // ships a lot of them: the standing rule after a CREATE FUNCTION is to REVOKE
  // from PUBLIC *and* from anon (two different routes, neither substituting for
  // the other) then GRANT to the intended roles. Every such migration applied
  // cleanly, moved nothing this census watched, and was rejected as a no-op.
  //
  // That is worse than it sounds. The rejection message tells the author to
  // declare the migration DATA ONLY, which would be false and would then exempt
  // it from verification permanently. A blind spot that instructs you to
  // mislabel the thing it cannot see is how a class stops being checked.
  //
  // Read from pg_proc.proacl rather than information_schema.role_routine_grants:
  // the latter shows only routines the current role can see, which makes the
  // census depend on who ran it. grantee 0 is PUBLIC and pg_get_userbyid(0)
  // errors, so it is spelled out. A NULL proacl is emitted as an explicit
  // "(default acl)" line rather than dropped, because NULL -> explicit IS the
  // transition a hardening migration makes, and a dropped row would make the
  // before and after look identical.
  routine_grants: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT n.nspname || '.' || p.proname || '(' ||
             pg_get_function_identity_arguments(p.oid) || ') ' ||
             CASE WHEN p.proacl IS NULL THEN '(default acl)'
                  ELSE CASE WHEN a.grantee = 0 THEN 'PUBLIC'
                            ELSE pg_get_userbyid(a.grantee) END
                       || ' ' || a.privilege_type END AS x
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      LEFT JOIN LATERAL aclexplode(p.proacl) a ON true
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','supabase_migrations')
        AND n.nspname NOT LIKE 'pg_toast%'
    ) q`,

  // Scheduled jobs. Same blind spot, different surface: a migration whose whole
  // purpose is cron.schedule() creates no catalog object at all.
  //
  // Expressed as a GUARDED probe rather than a CASE, and that is not style. A
  // `CASE WHEN to_regclass('cron.job') IS NULL THEN … ELSE (SELECT … FROM
  // cron.job) END` guards RUNTIME but not ANALYSIS: Postgres parses the
  // unreachable branch too, so on a database without pg_cron the whole census
  // dies with `relation "cron.job" does not exist`. Found by running this
  // against a real disposable Postgres 17 rather than reasoning about it.
  //
  // A missing extension must read as "not observable here", never as "no jobs".
  // Those are different facts and only one of them is a finding.
  cron_jobs: {
    guard: `SELECT (to_regclass('cron.job') IS NOT NULL)::text`,
    absent: '(pg_cron not installed — cron jobs not observable on this database)',
    sql: `SELECT coalesce(string_agg(
            j.jobname || ' [' || j.schedule || '] active=' || j.active::text,
            E'\\n' ORDER BY j.jobname), '') FROM cron.job j`,
  },

  indexes: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT schemaname || '.' || indexname || ' ' || md5(indexdef) AS x
      FROM pg_indexes
      WHERE schemaname NOT IN ('pg_catalog','information_schema','supabase_migrations')
    ) q`,

  constraints: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT n.nspname || '.' || rel.relname || '.' || con.conname
             || ' ' || con.contype::text || ' ' || md5(pg_get_constraintdef(con.oid)) AS x
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','supabase_migrations')
    ) q`,

  /* COMMENTS ARE CATALOG. Added after this census called
     20260814050000_xero_audit_log_ip_provenance_backfill.sql a silent no-op.
     It is a data backfill that owns NO DDL — but it also runs COMMENT ON COLUMN
     xero_audit_log.ip, documenting that the value is a CLAIM and not a fact.
     That comment is the entire user-facing half of the fix: it is what stops a
     reader treating a forgeable address as evidence. A census blind to comments
     called the migration inert and would have failed the PR that shipped it.
     The gate was wrong, not the migration. objoid >= 16384 excludes the
     built-in catalog's own comments. */
  comments: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT pg_describe_object(d.classoid, d.objoid, d.objsubid) || ' = ' || md5(d.description) AS x
      FROM pg_description d
      WHERE d.objoid >= 16384
    ) q`,

  /* Enum LABELS, not just the type's existence.

     `ALTER TYPE ... ADD VALUE` was invisible to this census: the type already
     exists, no table/function/constraint moves, and nothing else here looks at
     pg_enum. A migration whose ONLY job is adding an enum value therefore
     rehearsed as 'noop' and was rejected — while having done exactly what it
     said. That is the same shape as the function-ACL blind spot recorded above,
     and the same wrong fix was available: declare it DATA ONLY. It is not data,
     and doing so would have exempted every future ADD VALUE from verification.

     Labels are ordered by enumsortorder so a value inserted with BEFORE/AFTER
     moves the census too, not only an append. */
  enums: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT n.nspname || '.' || t.typname || ' = ' ||
             string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS x
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname NOT IN ('pg_catalog','information_schema','supabase_migrations')
      GROUP BY n.nspname, t.typname
    ) q`,

  triggers: `SELECT coalesce(string_agg(x, E'\\n' ORDER BY x), '') FROM (
      SELECT n.nspname || '.' || c.relname || '.' || t.tgname AS x
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal
        AND n.nspname NOT IN ('pg_catalog','information_schema','supabase_migrations')
    ) q`,
};

function takeCensus(dbUrl) {
  const census = {};
  for (const [name, probe] of Object.entries(CENSUS_QUERIES)) {
    // A probe is either a bare SQL string, or {guard, sql, absent} for a surface
    // that may not exist on this database. The guard runs FIRST and its query
    // never names the guarded object, so an absent extension cannot take the
    // census down with a parse error — see cron_jobs for why that distinction
    // cost a debugging round.
    if (typeof probe === 'string') {
      census[name] = psqlScalar(dbUrl, probe);
      continue;
    }
    census[name] =
      psqlScalar(dbUrl, probe.guard).trim() === 'true'
        ? psqlScalar(dbUrl, probe.sql)
        : probe.absent;
  }
  return census;
}

/** Line-level added/removed per category. Reported, not just counted. */
function diffCensus(before, after) {
  const changes = {};
  for (const name of Object.keys(CENSUS_QUERIES)) {
    const beforeLines = new Set(before[name].split('\n').filter((l) => l.length > 0));
    const afterLines = new Set(after[name].split('\n').filter((l) => l.length > 0));
    const added = [...afterLines].filter((l) => !beforeLines.has(l));
    const removed = [...beforeLines].filter((l) => !afterLines.has(l));
    if (added.length > 0 || removed.length > 0) {
      changes[name] = { added, removed };
    }
  }
  return changes;
}

function censusTotal(census) {
  let count = 0;
  for (const name of Object.keys(CENSUS_QUERIES)) {
    count += census[name].split('\n').filter((l) => l.length > 0).length;
  }
  return count;
}

/* ───────────────────────── environment proof ─────────────────────────
 * Called before and after the replay. Asserts OBJECTS, from the catalog.
 * Deliberately never queries supabase_migrations.
 */
function proveEnvironment(dbUrl, probes) {
  const results = [];
  for (const probe of probes) {
    const value = psqlScalar(dbUrl, `SELECT coalesce(${probe.sql}::text, 'ABSENT')`);
    results.push({ label: probe.label, kind: probe.kind, value });
  }
  return results;
}

const BASE_PROBES = [
  { label: 'server version', kind: 'server', sql: 'current_setting(\'server_version\')' },
  { label: 'auth.uid() exists', kind: 'function', sql: "to_regprocedure('auth.uid()')" },
  { label: 'auth.role() exists', kind: 'function', sql: "to_regprocedure('auth.role()')" },
  { label: 'auth.jwt() exists', kind: 'function', sql: "to_regprocedure('auth.jwt()')" },
  { label: 'extensions schema', kind: 'schema', sql: "to_regnamespace('extensions')" },
  { label: 'public.user_tenants', kind: 'table', sql: "to_regclass('public.user_tenants')" },
  { label: 'public.r7_candidates', kind: 'table', sql: "to_regclass('public.r7_candidates')" },
  { label: 'anon grant count', kind: 'grants', sql: "(SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='anon')" },
  { label: 'policy count', kind: 'policies', sql: '(SELECT count(*) FROM pg_policies)' },
  { label: 'public table count', kind: 'tables', sql: "(SELECT count(*) FROM pg_tables WHERE schemaname='public')" },
];

/* ───────────────────────── self-test (positive control) ─────────────────────────
 * A gate never seen to fail is not a gate. This exercises all three verdicts
 * against the live rehearsal database and then removes its own traces.
 *
 *   GOOD    creates a table            -> expect PASS
 *   BROKEN  references a missing table -> expect FAIL (psql error)
 *   NO-OP   CREATE TABLE IF NOT EXISTS -> expect FAIL (census did not move)
 *
 * The NO-OP case is the one that matters most: it exits 0, it writes a ledger
 * row in the real applier, and it is invisible to every text lint in the estate.
 */
const SELF_TEST_SCHEMA = 'rehearsal_selftest';

function runSelfTest(dbUrl, tmpDir) {
  const cases = [
    {
      name: 'GOOD — creates an object',
      sql: `CREATE SCHEMA IF NOT EXISTS ${SELF_TEST_SCHEMA};\nCREATE TABLE ${SELF_TEST_SCHEMA}.probe (id integer PRIMARY KEY, note text);\n`,
      expect: 'pass',
    },
    {
      name: 'BROKEN — references a missing relation',
      sql: `SELECT * FROM ${SELF_TEST_SCHEMA}.this_relation_does_not_exist;\n`,
      expect: 'error',
    },
    {
      // Setup for the regression fixture below. Kept SEPARATE on purpose: if
      // the CREATE and the REVOKE share one case, `functions` moves and the
      // case passes whether or not the census can see ACLs at all — i.e. the
      // fixture would not detect the very regression it exists for. Mutation-
      // tested: deleting the routine_grants probe leaves THIS case green and
      // turns the next one red, which is the split working.
      name: 'GOOD — creates a function (setup for the ACL fixture)',
      sql:
        `CREATE SCHEMA IF NOT EXISTS ${SELF_TEST_SCHEMA};\n` +
        `CREATE OR REPLACE FUNCTION ${SELF_TEST_SCHEMA}.acl_probe() RETURNS integer\n` +
        `  LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $fn$ SELECT 1 $fn$;\n`,
      expect: 'pass',
    },
    {
      // THE REGRESSION FIXTURE for the 2026-08-17 census gap. A pure ACL change
      // on an ALREADY-EXISTING function — no new object, nothing but a REVOKE.
      //
      // Before `routine_grants` was added, this exact shape applied cleanly,
      // moved nothing the census watched, and was rejected as a no-op. It is
      // the estate's most common security migration: the standing rule after
      // CREATE FUNCTION is REVOKE from PUBLIC *and* from anon (two distinct
      // routes, neither substituting for the other), then GRANT to the intended
      // roles.
      //
      // If this reports 'noop' again, the census has gone blind to function
      // ACLs — and the rejection message tells authors to declare such
      // migrations DATA ONLY, which would be false and would exempt the whole
      // class from verification permanently. A blind spot that instructs you to
      // mislabel what it cannot see is how a class stops being checked.
      name: 'GOOD — function ACL hardening ONLY, on an existing function',
      sql: `REVOKE ALL ON FUNCTION ${SELF_TEST_SCHEMA}.acl_probe() FROM PUBLIC;\n`,
      expect: 'pass',
    },
    {
      // Setup for the enum fixture below. SEPARATE on purpose, for the same
      // reason the ACL pair is split: if CREATE TYPE and ADD VALUE shared one
      // case, the type's creation alone would move the census and the case
      // would pass whether or not the enums probe exists — the fixture would
      // not detect the regression it is for. ADD VALUE also cannot run in the
      // same transaction that creates the type.
      name: 'GOOD — creates an enum type (setup for the enum-value fixture)',
      sql:
        `CREATE SCHEMA IF NOT EXISTS ${SELF_TEST_SCHEMA};\n` +
        `DO $do$ BEGIN\n` +
        `  IF to_regtype('${SELF_TEST_SCHEMA}.enum_probe') IS NULL THEN\n` +
        `    CREATE TYPE ${SELF_TEST_SCHEMA}.enum_probe AS ENUM ('first');\n` +
        `  END IF;\n` +
        `END $do$;\n`,
      expect: 'pass',
    },
    {
      // THE REGRESSION FIXTURE for the 2026-08-24 census gap. A pure enum-value
      // addition on an ALREADY-EXISTING type — no new object, nothing but a new
      // label.
      //
      // Before the `enums` probe was added, this exact shape applied cleanly,
      // moved nothing the census watched, and was rejected as a no-op. It cost
      // crm7 migration 20260903000000 (adding 'field_manager' to gto_role) a
      // rehearsal failure while that migration was doing precisely what it said.
      //
      // The wrong fix was available and tempting: declare such migrations DATA
      // ONLY. They are not data, and doing so would exempt every future
      // ALTER TYPE ADD VALUE from verification permanently — the same trap the
      // function-ACL comment above describes.
      name: 'GOOD — ALTER TYPE ADD VALUE only, on an existing enum',
      sql: `ALTER TYPE ${SELF_TEST_SCHEMA}.enum_probe ADD VALUE IF NOT EXISTS 'added_by_self_test';\n`,
      expect: 'pass',
    },
    {
      name: 'NO-OP — CREATE TABLE IF NOT EXISTS on an existing table',
      sql: `CREATE TABLE IF NOT EXISTS ${SELF_TEST_SCHEMA}.probe (id integer PRIMARY KEY, note text, column_that_will_never_appear text);\n`,
      expect: 'noop',
    },
  ];

  const outcomes = [];
  try {
    for (const testCase of cases) {
      const file = path.join(tmpDir, 'selftest.sql');
      fs.writeFileSync(file, testCase.sql);
      const before = takeCensus(dbUrl);
      let verdict;
      let detail = '';
      try {
        psqlFile(dbUrl, file, true);
        const after = takeCensus(dbUrl);
        const changes = diffCensus(before, after);
        if (Object.keys(changes).length === 0) {
          verdict = 'noop';
          detail = 'applied cleanly, catalog census did not move';
        } else {
          verdict = 'pass';
          detail = `catalog moved in: ${Object.keys(changes).join(', ')}`;
        }
      } catch (err) {
        verdict = 'error';
        const stderr = err.stderr ? String(err.stderr).trim() : String(err.message);
        detail = stderr.split('\n')[0];
      }
      outcomes.push({
        name: testCase.name,
        expected: testCase.expect,
        actual: verdict,
        ok: verdict === testCase.expect,
        detail,
      });
    }
  } finally {
    try {
      psqlScalar(dbUrl, `DROP SCHEMA IF EXISTS ${SELF_TEST_SCHEMA} CASCADE; SELECT 'cleaned'`);
    } catch {
      /* cleanup failure must not mask a test verdict */
    }
  }
  return outcomes;
}

/* ───────────────────────── replay ───────────────────────── */

function replay(dbUrl, migrations, options) {
  const { baselineMax, changedSet, floor } = options;
  const results = [];

  for (const migration of migrations) {
    if (migration.version < floor) {
      results.push({ ...migration, status: 'below-floor' });
      continue;
    }
    if (baselineMax !== null && migration.version <= baselineMax) {
      // Captured by the baseline dump — the objects are already present, so a
      // replay would fail on "already exists". Not a defect; not evidence either.
      results.push({ ...migration, status: 'in-baseline' });
      continue;
    }
    if (migration.quarantined) {
      results.push({ ...migration, status: 'quarantined' });
      continue;
    }

    const isChanged = changedSet.has(migration.rel);
    // Census is expensive (9 queries over the whole catalog). Only the
    // migrations this PR actually changes need the no-op verdict; the rest are
    // being replayed to build the substrate those changes land on.
    const before = isChanged ? takeCensus(dbUrl) : null;

    try {
      psqlFile(dbUrl, migration.abs, !migration.nontx);
    } catch (err) {
      const stderr = err.stderr ? String(err.stderr).trim() : String(err.message);
      results.push({
        ...migration,
        status: 'failed',
        changed: isChanged,
        error: stderr.split('\n').slice(0, 6).join('\n'),
      });
      continue;
    }

    if (!isChanged) {
      results.push({ ...migration, status: 'applied', changed: false });
      continue;
    }

    const after = takeCensus(dbUrl);
    const changes = diffCensus(before, after);
    if (Object.keys(changes).length > 0) {
      results.push({ ...migration, status: 'applied', changed: true, changes });
      continue;
    }

    const sqlText = fs.readFileSync(migration.abs, 'utf8');
    if (declaresDataOnly(sqlText)) {
      results.push({ ...migration, status: 'applied-data-only', changed: true });
    } else {
      results.push({
        ...migration,
        status: 'noop',
        changed: true,
        error:
          'applied cleanly but the catalog census did not move. If this migration only ' +
          `touches DATA, declare it with a line reading exactly "${DATA_ONLY_MARKER}".`,
      });
    }
  }
  return results;
}

/* ───────────────────────── cli ───────────────────────── */

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    dbUrl: process.env.REHEARSAL_DB_URL || '',
    mode: 'plan',
    changed: [],
    baselineMax: null,
    floor: '20260611000000',
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') { options.root = argv[i + 1]; i += 1; }
    else if (arg === '--db-url') { options.dbUrl = argv[i + 1]; i += 1; }
    else if (arg === '--changed') { options.changed = argv[i + 1].split(',').filter((s) => s.length > 0); i += 1; }
    else if (arg === '--baseline-max') { options.baselineMax = argv[i + 1]; i += 1; }
    else if (arg === '--floor') { options.floor = argv[i + 1]; i += 1; }
    else if (arg === '--plan') { options.mode = 'plan'; }
    else if (arg === '--apply') { options.mode = 'apply'; }
    else if (arg === '--self-test') { options.mode = 'self-test'; }
    else if (arg === '--prove-env') { options.mode = 'prove-env'; }
    else if (arg === '--json') { options.json = true; }
    else if (arg === '-h' || arg === '--help') { options.mode = 'help'; }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === 'help') {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
    return 0;
  }

  const scopes = loadScopes(options.root);
  const { migrations, missingScopes, manifestDrift } = collectMigrations(options.root, scopes);
  for (const scopeId of manifestDrift) {
    console.log(
      `::warning::scope "${scopeId}" is declared has_database:false in supabase/migration-scopes.json but HAS migrations on disk. ` +
        'Rehearsing it anyway. Update the manifest.',
    );
  }

  if (options.mode === 'plan') {
    const eligible = migrations.filter(
      (m) => m.version >= options.floor && (options.baselineMax === null || m.version > options.baselineMax),
    );
    if (options.json) {
      console.log(JSON.stringify({ total: migrations.length, eligible, missingScopes }, null, 2));
      return 0;
    }
    console.log(`Scopes with a migrations directory present: ${scopes.length - missingScopes.length}/${scopes.length}`);
    if (missingScopes.length > 0) {
      console.log(`  NOT CHECKED OUT (cannot rehearse): ${missingScopes.join(', ')}`);
    }
    console.log(`Migrations discovered: ${migrations.length}`);
    console.log(`Eligible for replay (>= floor ${options.floor}${options.baselineMax ? `, > baseline ${options.baselineMax}` : ''}): ${eligible.length}`);
    const byScope = {};
    for (const m of eligible) byScope[m.scope] = (byScope[m.scope] || 0) + 1;
    for (const [scope, count] of Object.entries(byScope).sort()) {
      console.log(`    ${scope}: ${count}`);
    }
    console.log('\nGlobal replay order (first 20):');
    for (const m of eligible.slice(0, 20)) {
      console.log(`  ${m.version}  ${m.scope.padEnd(24)} ${m.basename}${m.quarantined ? '  [QUARANTINED]' : ''}`);
    }
    return 0;
  }

  if (!options.dbUrl) {
    console.error('::error::--db-url (or REHEARSAL_DB_URL) is required for this mode');
    return 2;
  }
  assertLoopback(options.dbUrl);

  if (options.mode === 'prove-env') {
    const probes = proveEnvironment(options.dbUrl, BASE_PROBES);
    console.log('Environment proof — catalog probes (NOT schema_migrations):');
    for (const probe of probes) {
      console.log(`  ${probe.label.padEnd(28)} = ${probe.value}`);
    }
    return 0;
  }

  if (options.mode === 'self-test') {
    const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'rehearsal-selftest-'));
    const outcomes = runSelfTest(options.dbUrl, tmpDir);
    console.log('Positive control — the gate must be seen to fail, in both directions:\n');
    let allOk = true;
    for (const outcome of outcomes) {
      const mark = outcome.ok ? 'OK  ' : 'BAD ';
      if (!outcome.ok) allOk = false;
      console.log(`  ${mark} ${outcome.name}`);
      console.log(`       expected=${outcome.expected} actual=${outcome.actual}`);
      console.log(`       ${outcome.detail}`);
    }
    if (!allOk) {
      console.error('\n::error::self-test did not reproduce its expected verdicts — the INSTRUMENT is broken, not the tree.');
      return 1;
    }
    console.log('\nSelf-test passed: the gate detects a good migration, an erroring migration, and a silent no-op.');
    return 0;
  }

  // apply
  const changedSet = new Set(options.changed);
  console.log(`Replaying ${migrations.length} discovered migrations in global version order.`);
  if (missingScopes.length > 0) {
    console.error(`::error::scopes not checked out: ${missingScopes.join(', ')} — a rehearsal missing a scope is not a rehearsal of this database.`);
    return 2;
  }

  const before = proveEnvironment(options.dbUrl, BASE_PROBES);
  console.log('\nEnvironment BEFORE replay:');
  for (const probe of before) console.log(`  ${probe.label.padEnd(28)} = ${probe.value}`);

  const results = replay(options.dbUrl, migrations, {
    baselineMax: options.baselineMax,
    changedSet,
    floor: options.floor,
  });

  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log('\nReplay summary:');
  for (const [status, count] of Object.entries(counts).sort()) {
    console.log(`  ${status.padEnd(20)} ${count}`);
  }

  const after = proveEnvironment(options.dbUrl, BASE_PROBES);
  console.log('\nEnvironment AFTER replay:');
  for (const probe of after) console.log(`  ${probe.label.padEnd(28)} = ${probe.value}`);

  // Report the changed migrations in full — this is the PR's actual evidence.
  const changedResults = results.filter((r) => r.changed);
  if (changedResults.length > 0) {
    console.log('\n─── Migrations changed by this PR ───');
    for (const r of changedResults) {
      console.log(`\n  ${r.rel}`);
      console.log(`    version ${r.version}   scope ${r.scope}   status ${r.status.toUpperCase()}`);
      if (r.error) console.log(`    ${r.error.split('\n').join('\n    ')}`);
      if (r.changes) {
        for (const [category, delta] of Object.entries(r.changes)) {
          console.log(`    ${category}: +${delta.added.length} -${delta.removed.length}`);
          for (const line of delta.added.slice(0, 6)) console.log(`      + ${line}`);
          for (const line of delta.removed.slice(0, 6)) console.log(`      - ${line}`);
        }
      }
    }
  }

  // Verdict. A pre-existing failure is estate debt (quarantine tracks it); a
  // failure or no-op in a migration THIS PR changed is this PR's problem.
  const changedBad = changedResults.filter((r) => r.status === 'failed' || r.status === 'noop');
  const untrackedFailures = results.filter((r) => r.status === 'failed' && !r.changed);

  if (untrackedFailures.length > 0) {
    console.log('\n─── Pre-existing replay failures (not changed by this PR) ───');
    for (const r of untrackedFailures) {
      console.log(`  ${r.rel}`);
      console.log(`    ${r.error.split('\n')[0]}`);
    }
    console.log('\n  These are estate debt: the tree cannot rebuild this database.');
    console.log('  Track each in the owning scope\'s KNOWN-BROKEN-IN-CI.txt, or fix it.');
  }

  if (changedBad.length > 0) {
    console.error(`\n::error::${changedBad.length} migration(s) changed by this PR failed rehearsal.`);
    for (const r of changedBad) console.error(`::error::${r.rel} — ${r.status}`);
    return 1;
  }

  if (options.changed.length > 0) {
    console.log(`\nRehearsal PASSED for ${changedResults.length} changed migration(s).`);
  } else {
    console.log('\nRehearsal complete (no changed-migration set supplied; nothing was gated).');
  }
  return 0;
}

process.exit(main());
