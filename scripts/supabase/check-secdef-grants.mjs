#!/usr/bin/env node
/**
 * check-secdef-grants.mjs — catalog assertions for anon/PUBLIC reachability.
 *
 * THE CLASS THIS CLOSES
 * ─────────────────────
 * Postgres grants EXECUTE to PUBLIC by DEFAULT on every function it creates.
 * A SECURITY DEFINER function therefore becomes anon-reachable by having no
 * grant statement written for it at all — the exposure is the default, not a
 * decision. `public.is_developer_admin()` sat that way through roughly ten
 * CREATE/DROP cycles because every migration that touched it wrote a GRANT and
 * none wrote a REVOKE.
 *
 * A DROP + CREATE restores that default, so this is not a defect you fix once.
 * It is drift, and drift needs a standing assertion — which is what this is.
 *
 * WHAT IT ASSERTS
 * ───────────────
 *   1. NO SECURITY DEFINER function in schema `public` holds EXECUTE granted to
 *      PUBLIC. Zero tolerance, no allowlist. Entries in the PENDING-PUBLIC-EXECUTE
 *      section of the anon allowlist are the ONLY exception, and each names the
 *      migration that removes it — a ratchet that may only shrink.
 *   2. A SECURITY DEFINER function in `public` holding a NAMED `anon` EXECUTE
 *      grant must be listed in scripts/secdef-anon-allowlist.txt with a reason.
 *   3. The set of tables with RLS enabled and ZERO policies must not GROW beyond
 *      the set banked in scripts/rls-no-policy-allowlist.txt. A 15th fails.
 *   4. None of those banked tables may carry ANY privilege — TRUNCATE included —
 *      granted to anon or authenticated. (A table created under permissive
 *      default privileges can inherit anon TRUNCATE from supabase_admin.)
 *
 * WHY PUBLIC IS CHECKED VIA aclexplode AND NOT has_function_privilege
 * ───────────────────────────────────────────────────────────────────
 * has_function_privilege('anon', oid, 'EXECUTE') returns TRUE for a role that
 * only inherits through PUBLIC, so it cannot tell a deliberate named grant from
 * an unrevoked default — the exact distinction this gate exists to make. The
 * ACL is read directly instead, and `coalesce(proacl, acldefault('f', proowner))`
 * matters: a function whose proacl is NULL has never been GRANTed or REVOKEd and
 * is PUBLIC-executable by default. Reading proacl alone would score that
 * worst-case function as clean.
 *
 * WHAT IT DOES NOT ASSERT
 * ───────────────────────
 *   - It says nothing about whether a function's BODY is safe, only who may call it.
 *   - It does not check SECURITY INVOKER functions (they run as the caller, so
 *     RLS and table grants already bound them).
 *   - It does not check schemas other than `public`.
 *   - Allowlist entries are matched on the FULL signature. A listed function that
 *     is ABSENT from the database is reported but is NOT fatal: the rehearsal
 *     substrate is a partial replay and may legitimately lack a scope's function.
 *     Growth is gated; absence is only reported.
 *   - The RLS bank is a RATCHET, not an equality check, for the same reason: a
 *     banked table missing from the substrate is reported, never fatal. Only a
 *     table appearing that is NOT banked fails.
 *   - It does not assert that the 14 banked tables SHOULD have no policies. That
 *     is a design ruling recorded in the bank file, not a fact this can measure.
 *   - Under --substrate replay it does NOT run check 4 at all, and says so on
 *     stdout rather than quietly returning a smaller number. A partial replay
 *     cannot answer a converged-state question; see the comment above check 4.
 *
 * TELLING "CHECKED NOTHING" FROM "FOUND NOTHING"
 * ──────────────────────────────────────────────
 * Every check reports {findings, scanned}. A run whose `scanned` denominator
 * falls below --min-functions / --min-tables FAILS as "scanned less than banked"
 * rather than reporting a clean result. An empty or wrong database is the way
 * this gate would otherwise report a false pass.
 *
 * These are FLOORS, not equality checks, because the rehearsal substrate is a
 * baseline dump plus a replay and its object count legitimately differs from
 * production (measured 2026-09-03: production carries 282 SECURITY DEFINER
 * functions and 442 RLS-enabled tables in `public`).
 *
 * USAGE
 *   node scripts/supabase/check-secdef-grants.mjs --db-url URL
 *   node scripts/supabase/check-secdef-grants.mjs --db-url URL --self-test      # loopback only; plants for real
 *   node scripts/supabase/check-secdef-grants.mjs --db-url URL --self-test-tx   # safe anywhere; BEGIN/ROLLBACK
 *
 *   --substrate live    (default) all four checks; for production or any converged database
 *   --substrate replay            checks 1-3 only; for the rehearsal's partial replay
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const ANON_ALLOWLIST = path.join(REPO, 'scripts', 'secdef-anon-allowlist.txt');
const RLS_BANK = path.join(REPO, 'scripts', 'rls-no-policy-allowlist.txt');

/* ───────────────────────── psql plumbing ───────────────────────── */

// ASCII US (0x1f). psql's default field separator is `|`, which appears in real
// ACL text; a control byte cannot occur in a relation name, role name or
// privilege type, so splitting on it can never shear a value in half.
const FS = '\u001f';

function psql(dbUrl, sql) {
  return execFileSync('psql', [dbUrl, '-tA', '-F', FS, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function rows(dbUrl, sql) {
  return psql(dbUrl, sql)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(FS));
}

function scalar(dbUrl, sql) {
  const out = rows(dbUrl, sql);
  return out.length ? out[0][0] : '';
}

/* ───────────────────────── allowlist parsing ───────────────────────── */

// Lines are `<payload>  # reason` or `# comment`. A payload with no reason is
// rejected: an allowlist entry whose justification is missing is indistinguishable
// from one nobody reviewed.
function parseAllowlist(file, { section = null } = {}) {
  if (!existsSync(file)) {
    throw new Error(`allowlist missing: ${file}`);
  }
  const entries = [];
  const problems = [];
  let current = null;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const sectionMatch = /^#\s*SECTION:\s*(\S+)/i.exec(line);
    if (sectionMatch) {
      current = sectionMatch[1].toUpperCase();
      continue;
    }
    if (line.startsWith('#')) continue;
    if (section && current !== section) continue;
    if (!section && current && current !== 'DEFAULT') continue;
    const hash = line.indexOf('#');
    if (hash < 0) {
      problems.push(`no reason given: ${line}`);
      continue;
    }
    const payload = line.slice(0, hash).trim();
    const reason = line.slice(hash + 1).trim();
    if (!payload) continue;
    if (!reason) problems.push(`empty reason: ${payload}`);
    entries.push({ payload, reason });
  }
  return { entries, problems };
}

/* ───────────────────────── the four checks ───────────────────────── */

// SIGNATURE RENDERING — types only, and NEITHER of the two obvious spellings.
//
// `oid::regprocedure::text` gains a `public.` prefix whenever search_path does
// not contain public, so an allowlist written without it silently matches
// nothing — and "matches nothing" on an allowlist means "everything is
// unlisted", i.e. the whole estate fails.
//
// `pg_get_function_identity_arguments(oid)` includes PARAMETER NAMES:
// `r7_redeem_talent_pool_consent(p_token text)`, not `(text)`. Measured on the
// real rehearsal substrate 2026-09-03, where it reported four allowlisted
// functions as unlisted while simultaneously reporting the same four as
// "allowlisted but not present" — the two halves of one mismatch. A local
// fixture missed it because functions created as `f(text)` have no parameter
// names to include, so the fixture and reality disagreed about the very thing
// under test.
//
// So: build the type list from proargtypes directly. No schema prefix, no
// parameter names, stable across search_path.

const SQL_PUBLIC_EXECUTE = `
SELECT p.proname || '(' || coalesce((
         SELECT string_agg(format_type(t, NULL), ',' ORDER BY o)
           FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)
       ), '') || ')'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prosecdef
   AND EXISTS (
     SELECT 1
       FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      WHERE a.grantee = 0
        AND a.privilege_type = 'EXECUTE'
   )
 ORDER BY 1`;

const SQL_NAMED_ANON_EXECUTE = `
SELECT p.proname || '(' || coalesce((
         SELECT string_agg(format_type(t, NULL), ',' ORDER BY o)
           FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)
       ), '') || ')'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prosecdef
   AND EXISTS (
     SELECT 1
       FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
       JOIN pg_roles r ON r.oid = a.grantee
      WHERE r.rolname = 'anon'
        AND a.privilege_type = 'EXECUTE'
   )
 ORDER BY 1`;

const SQL_RLS_NO_POLICY = `
SELECT c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
 GROUP BY c.relname
HAVING count(pol.oid) = 0
 ORDER BY 1`;

const SQL_RLS_BANK_GRANTS = `
SELECT c.relname, r.rolname, a.privilege_type
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
  LEFT JOIN pg_roles r ON r.oid = a.grantee
  LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
   AND (coalesce(r.rolname, 'PUBLIC') IN ('anon', 'authenticated', 'PUBLIC'))
   AND NOT EXISTS (SELECT 1 FROM pg_policy p2 WHERE p2.polrelid = c.oid)
 GROUP BY c.relname, r.rolname, a.privilege_type
 ORDER BY 1, 2, 3`;

const SQL_COUNT_SECDEF = `SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef`;
const SQL_COUNT_RLS_TABLES = `SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity`;

function runChecks(dbUrl, { minFunctions, minTables, substrate = 'live', quiet = false }) {
  const say = (s) => { if (!quiet) console.log(s); };
  const failures = [];
  const notes = [];

  const anon = parseAllowlist(ANON_ALLOWLIST);
  const pending = parseAllowlist(ANON_ALLOWLIST, { section: 'PENDING-PUBLIC-EXECUTE' });
  const bank = parseAllowlist(RLS_BANK);
  for (const p of [...anon.problems, ...pending.problems, ...bank.problems]) {
    failures.push(`allowlist entry without a reason — ${p}`);
  }

  const scannedFunctions = Number(scalar(dbUrl, SQL_COUNT_SECDEF));
  const scannedTables = Number(scalar(dbUrl, SQL_COUNT_RLS_TABLES));

  say(`scanned: ${scannedFunctions} SECURITY DEFINER function(s) in public, ${scannedTables} RLS-enabled table(s)`);

  if (scannedFunctions < minFunctions) {
    failures.push(
      `scanned less than banked: ${scannedFunctions} SECURITY DEFINER functions < floor ${minFunctions}. ` +
      `A clean result here would mean "checked nothing", not "found nothing" — refusing to report a pass.`,
    );
  }
  if (scannedTables < minTables) {
    failures.push(
      `scanned less than banked: ${scannedTables} RLS-enabled tables < floor ${minTables}. ` +
      `A clean result here would mean "checked nothing", not "found nothing" — refusing to report a pass.`,
    );
  }

  /* 1 — PUBLIC EXECUTE, zero tolerance except the shrinking PENDING ratchet */
  const publicExec = rows(dbUrl, SQL_PUBLIC_EXECUTE).map((r) => r[0]);
  const pendingSet = new Set(pending.entries.map((e) => e.payload));
  const unpending = publicExec.filter((f) => !pendingSet.has(f));
  say(`check 1 (PUBLIC EXECUTE on SECURITY DEFINER): {findings: ${unpending.length}, scanned: ${scannedFunctions}}`);
  for (const f of unpending) {
    failures.push(
      `SECURITY DEFINER function grants EXECUTE to PUBLIC: ${f}\n` +
      `    Add "REVOKE EXECUTE ON FUNCTION ${f} FROM PUBLIC;" to the migration that creates it, ` +
      `then GRANT to the named roles that actually call it.`,
    );
  }
  for (const p of pendingSet) {
    if (!publicExec.includes(p)) {
      notes.push(`PENDING entry no longer violating — DELETE it from ${path.relative(REPO, ANON_ALLOWLIST)}: ${p}`);
    }
  }

  /* 2 — named anon EXECUTE must be allowlisted */
  const namedAnon = rows(dbUrl, SQL_NAMED_ANON_EXECUTE).map((r) => r[0]);
  const allowed = new Set(anon.entries.map((e) => e.payload));
  const unlisted = namedAnon.filter((f) => !allowed.has(f));
  say(`check 2 (named anon EXECUTE): {findings: ${unlisted.length}, scanned: ${namedAnon.length} anon-granted of ${scannedFunctions}}`);
  for (const f of unlisted) {
    failures.push(
      `SECURITY DEFINER function grants EXECUTE to anon and is not allowlisted: ${f}\n` +
      `    If an unauthenticated route genuinely needs it, add it to ` +
      `${path.relative(REPO, ANON_ALLOWLIST)} with a one-line reason. Otherwise revoke it.`,
    );
  }
  for (const a of allowed) {
    if (!namedAnon.includes(a)) notes.push(`allowlisted anon function not present on this database: ${a}`);
  }

  /* 3 — the RLS-no-policy set may not grow */
  const observed = rows(dbUrl, SQL_RLS_NO_POLICY).map((r) => r[0]);
  const banked = new Set(bank.entries.map((e) => e.payload));
  const grown = observed.filter((t) => !banked.has(t));
  say(`check 3 (RLS enabled, zero policies): {findings: ${grown.length}, scanned: ${observed.length} of ${scannedTables} banked ${banked.size}}`);
  for (const t of grown) {
    failures.push(
      `table has RLS enabled and ZERO policies, and is not banked: public.${t}\n` +
      `    RLS with no policy denies every non-superuser row. Either add the policy it is ` +
      `missing, or — if it is deliberately unreachable and served only through SECURITY ` +
      `DEFINER functions — bank it in ${path.relative(REPO, RLS_BANK)} with the reason.`,
    );
  }
  for (const t of banked) {
    if (!observed.includes(t)) notes.push(`banked RLS-no-policy table not present on this database: public.${t}`);
  }

  /* 4 — none of them may carry an anon/authenticated/PUBLIC grant.
   *
   * LIVE SUBSTRATE ONLY, and this is not a loophole — it is the difference
   * between a question the substrate can answer and one it cannot.
   *
   * Checks 1-3 are GROWTH questions ("did this change introduce a
   * PUBLIC-executable function / an unlisted anon grant / a 15th RLS-no-policy
   * table?"), and a partial replay answers those honestly: anything it DOES
   * build, it builds correctly.
   *
   * Check 4 is a STATE question ("does this table's grant set match the one
   * production converged on?"), and a partial replay cannot answer it. Measured
   * on the real substrate 2026-09-03: it reported 13 findings on
   * tenant_encryption_keys, every one of which is ABSENT from production —
   * because the migration that revokes them, crm7
   * supabase/migrations/archive/20260820010000_tenant_encryption_keys_revoke_anon_grants.sql,
   * lives in an `archive/` subdirectory the replay does not scan. The table is
   * created with default grants and never revoked, on the substrate only.
   *
   * That is the instrument failing to reproduce production, not the tree being
   * wrong, and this file's own sibling says a gate must never confound its
   * instrument with its measurement. So the live scan asserts it and the
   * rehearsal says out loud that it did not.
   */
  if (substrate !== 'live') {
    say(`check 4 (grants on RLS-no-policy tables): SKIPPED on substrate=${substrate} — a partial replay cannot answer a converged-state question (see the comment in this file). The live scan asserts it.`);
    return { failures, notes, scannedFunctions, scannedTables };
  }
  const grants = rows(dbUrl, SQL_RLS_BANK_GRANTS);
  say(`check 4 (grants on RLS-no-policy tables): {findings: ${grants.length}, scanned: ${observed.length}}`);
  for (const [tbl, role, priv] of grants) {
    failures.push(
      `RLS-no-policy table carries a client-role grant: public.${tbl} -> ${role || 'PUBLIC'} ${priv}\n` +
      `    These tables are fail-closed by design and are read only through SECURITY DEFINER ` +
      `functions. Add "REVOKE ${priv} ON public.${tbl} FROM ${role || 'PUBLIC'};" to its migration. ` +
      `(A table created under permissive default privileges can inherit TRUNCATE this way.)`,
    );
  }

  return { failures, notes, scannedFunctions, scannedTables };
}

/* ───────────────────────── self-tests ───────────────────────── */

const PLANT = `
CREATE SCHEMA IF NOT EXISTS public;
CREATE OR REPLACE FUNCTION public.zz_secdef_gate_selftest()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$ SELECT true $fn$;
-- deliberately issue NO revoke: this is the exact defect shape, the Postgres default.
`;
const UNPLANT = `DROP FUNCTION IF EXISTS public.zz_secdef_gate_selftest();`;

// Loopback-only. It really creates the function, so it must never run anywhere
// that is not a disposable database.
function selfTest(dbUrl, opts) {
  const host = (() => { try { return new URL(dbUrl).hostname; } catch { return ''; } })();
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    console.error(`::error::--self-test plants a real function and refuses a non-loopback host (got "${host}"). Use --self-test-tx against a shared database.`);
    process.exit(2);
  }

  // The baseline is deliberately NOT required to be clean. This runs against a
  // replayed substrate that may carry real findings of its own, and "the gate
  // already fails here" must not be confused with "the gate cannot fail". What
  // is asserted is the DELTA: planting the violation must add a finding naming
  // the plant, and removing it must take that finding away again.
  psql(dbUrl, UNPLANT);
  const before = runChecks(dbUrl, { ...opts, quiet: true });
  const namesPlant = (r) => r.failures.filter((f) => f.includes('zz_secdef_gate_selftest')).length;
  console.log(`self-test: baseline carries ${before.failures.length} finding(s), ${namesPlant(before)} of them naming the plant`);
  if (namesPlant(before) !== 0) {
    console.error('::error::self-test: the plant is already reported before it was planted. The detector is matching something else.');
    process.exit(1);
  }

  console.log('self-test: planting a SECURITY DEFINER function with the Postgres default ACL (no REVOKE) — the gate MUST report it');
  psql(dbUrl, PLANT);
  const during = runChecks(dbUrl, { ...opts, quiet: true });
  psql(dbUrl, UNPLANT);
  if (namesPlant(during) !== 1) {
    console.error('::error::self-test: the planted violation was NOT detected. The gate cannot fail, so its clean verdicts are worthless.');
    process.exit(1);
  }
  if (during.failures.length !== before.failures.length + 1) {
    console.error(`::error::self-test: planting one violation moved the finding count from ${before.failures.length} to ${during.failures.length}. The detector is not measuring what it claims.`);
    process.exit(1);
  }
  console.log('  planted violation: detected, and it moved the count by exactly one — PASS');

  console.log('self-test: removing the plant must restore the baseline exactly');
  const after = runChecks(dbUrl, { ...opts, quiet: true });
  if (namesPlant(after) !== 0 || after.failures.length !== before.failures.length) {
    console.error(`::error::self-test: after cleanup the gate reports ${after.failures.length} finding(s) (baseline was ${before.failures.length}). The detector is not reporting the plant.`);
    process.exit(1);
  }
  console.log('  after cleanup: back to baseline — PASS');
  console.log('\nself-test PASSED: the gate was seen to fail on a planted violation, by exactly one finding, and to stop failing when it was removed.');
}

// Safe against any database, production included: everything happens inside one
// transaction that is rolled back. Proves the DETECTOR fires; it does not
// exercise the allowlist plumbing the way --self-test does.
function selfTestTx(dbUrl) {
  const sql = `
BEGIN;
CREATE OR REPLACE FUNCTION public.zz_secdef_gate_selftest()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$ SELECT true $fn$;
${SQL_PUBLIC_EXECUTE.replace('ORDER BY 1', "AND p.proname = 'zz_secdef_gate_selftest' ORDER BY 1")};
ROLLBACK;`;
  const out = psql(dbUrl, sql);
  if (!out.includes('zz_secdef_gate_selftest')) {
    console.error('::error::self-test-tx: the detector did NOT fire on a function planted with the Postgres default ACL. The clean verdict above means nothing.');
    process.exit(1);
  }
  const still = rows(dbUrl, `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='zz_secdef_gate_selftest'`);
  if (still.length !== 0) {
    console.error('::error::self-test-tx: the planted function SURVIVED the rollback. Refusing to continue against this database.');
    process.exit(1);
  }
  console.log('self-test-tx PASSED: detector fired on a planted PUBLIC-EXECUTE function inside a rolled-back transaction, and the plant left nothing behind.');
}

/* ───────────────────────── main ───────────────────────── */

function main() {
  const argv = process.argv.slice(2);
  let dbUrl = '';
  let mode = 'check';
  let minFunctions = 50;
  let minTables = 100;
  let substrate = 'live';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--db-url') dbUrl = argv[++i];
    else if (argv[i] === '--self-test') mode = 'self-test';
    else if (argv[i] === '--self-test-tx') mode = 'self-test-tx';
    else if (argv[i] === '--min-functions') minFunctions = Number(argv[++i]);
    else if (argv[i] === '--min-tables') minTables = Number(argv[++i]);
    else if (argv[i] === '--substrate') substrate = argv[++i];
    else {
      console.error(`unknown argument: ${argv[i]}`);
      process.exit(2);
    }
  }
  if (!dbUrl) {
    console.error('usage: check-secdef-grants.mjs --db-url URL [--self-test|--self-test-tx] [--min-functions N] [--min-tables N]');
    process.exit(2);
  }

  if (!['live', 'replay'].includes(substrate)) {
    console.error(`--substrate must be "live" or "replay" (got ${JSON.stringify(substrate)})`);
    process.exit(2);
  }
  if (mode === 'self-test') return selfTest(dbUrl, { minFunctions, minTables, substrate });
  if (mode === 'self-test-tx') return selfTestTx(dbUrl);

  const { failures, notes } = runChecks(dbUrl, { minFunctions, minTables, substrate });

  for (const n of notes) console.log(`  note: ${n}`);

  if (failures.length === 0) {
    console.log('\nOK — no SECURITY DEFINER function in public is PUBLIC-executable, every anon-executable one is allowlisted, and the RLS-no-policy set has not grown.');
    return;
  }
  console.error(`\n${failures.length} finding(s):\n`);
  for (const f of failures) console.error(`::error::${f}`);
  process.exit(1);
}

main();
