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

const SQL_ALL_SECDEF = `
SELECT p.proname || '(' || coalesce((
         SELECT string_agg(format_type(t, NULL), ',' ORDER BY o)
           FROM unnest(p.proargtypes) WITH ORDINALITY AS u(t, o)
       ), '') || ')'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef
 ORDER BY 1`;

const SQL_COUNT_SECDEF = `SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef`;
const SQL_COUNT_RLS_TABLES = `SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity`;

function runChecks(dbUrl, { minFunctions, minTables, substrate = 'live', quiet = false, lists = null }) {
  const say = (s) => { if (!quiet) console.log(s); };
  const failures = [];
  const notes = [];

  const anon = lists?.anon ?? parseAllowlist(ANON_ALLOWLIST);
  const pending = lists?.pending ?? parseAllowlist(ANON_ALLOWLIST, { section: 'PENDING-PUBLIC-EXECUTE' });
  const bank = lists?.bank ?? parseAllowlist(RLS_BANK);
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
  // A PENDING entry that has stopped violating is a FAILURE, not a note.
  //
  // The exemption exists only for as long as its cause does. Left as a note, the
  // line survives the migration that fixed it and quietly becomes a permanent
  // hole: the next function to acquire a PUBLIC grant under that same name would
  // be waved straight through by an exemption nobody re-argued. So the gate goes
  // red until the line is deleted, which is the only moment anyone is guaranteed
  // to be looking.
  //
  // ABSENT IS NOT FIXED. If the function is not on this database at all, no
  // conclusion is available — a partial replay simply may not have built it — so
  // that is a note. Only a function that EXISTS and is no longer PUBLIC-executable
  // proves the exemption has outlived its cause.
  const allSecdef = new Set(rows(dbUrl, SQL_ALL_SECDEF).map((r) => r[0]));
  for (const p of pendingSet) {
    if (publicExec.includes(p)) continue;
    if (!allSecdef.has(p)) {
      notes.push(`PENDING entry names a function absent from this database — no conclusion drawn: ${p}`);
      continue;
    }
    failures.push(
      `PENDING exemption has outlived its cause: ${p} exists and is NO LONGER PUBLIC-executable.\n` +
      `    DELETE its line from ${path.relative(REPO, ANON_ALLOWLIST)} (section PENDING-PUBLIC-EXECUTE). ` +
      `An exemption kept past its fix is a standing hole: the next function to acquire a PUBLIC ` +
      `grant under this name would be waved through by a line nobody re-argued.`,
    );
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
  const bankedGrants = grants.filter(([t]) => banked.has(t));
  say(
    `check 4 (grants on RLS-no-policy tables): {findings: ${grants.length}, scanned: ${observed.length}}` +
    ` (${bankedGrants.length} on banked tables, ${grants.length - bankedGrants.length} on unbanked)`,
  );
  // The remediation differs by whether the table is BANKED, so the message must
  // too. "These tables are fail-closed by design" is a claim about intent, and it
  // is only true of a table someone banked with a reason. For an UNBANKED table
  // the fail-closed shape is exactly what is in question — check 3 has already
  // reported it as possibly accidental — so telling the reader to REVOKE would be
  // prescribing a remedy for a diagnosis nobody has made.
  for (const [tbl, role, priv] of grants) {
    const who = role || 'PUBLIC';
    if (banked.has(tbl)) {
      failures.push(
        `BANKED fail-closed table carries a client-role grant: public.${tbl} -> ${who} ${priv}\n` +
        `    ${path.relative(REPO, RLS_BANK)} records this table as deliberately unreachable — RLS on, ` +
        `zero policies, every read and write through a SECURITY DEFINER function — so this grant ` +
        `contradicts its own bank entry. Add "REVOKE ${priv} ON public.${tbl} FROM ${who};" to its ` +
        `migration. (A table created under permissive default privileges can inherit TRUNCATE this ` +
        `way, and TRUNCATE is not row-scoped, so RLS does not bound it.)`,
      );
    } else {
      failures.push(
        `UNBANKED table has RLS with zero policies AND a client-role grant: public.${tbl} -> ${who} ${priv}\n` +
        `    Check 3 has already reported this table as not banked. Do NOT assume it is fail-closed by ` +
        `design — this combination is equally consistent with a misconfiguration: RLS switched on and ` +
        `the policy never written, leaving a grant that now denies every row. Decide which it is first. ` +
        `If the table SHOULD be reachable, add the policy it is missing. If it should not, bank it in ` +
        `${path.relative(REPO, RLS_BANK)} with the reason AND revoke the grant.`,
      );
    }
  }

  return { failures, notes, scannedFunctions, scannedTables };
}

/* ───────────────────────── self-tests ───────────────────────── */

// TWO planted functions, and the second one is the point.
//
// `zz_secdef_gate_selftest_named` declares NAMED parameters, because that is the
// shape the estate's real migrations use and the shape that broke this gate on
// its first real run: pg_get_function_identity_arguments() renders them as
// `(p_token text)`, which matches no allowlist entry, while the allowlist and
// every other message says `(text)`. A fixture of bare-typed functions cannot
// reproduce that, so the rendering path went untested until production data
// tested it. It is exercised in CI now.
// DROP before CREATE, never bare CREATE OR REPLACE.
//
// `CREATE OR REPLACE FUNCTION` PRESERVES the existing function's ACL. If a
// same-named function already existed — a previous interrupted run, or anything
// that happened to collide — the "plant" would inherit that ACL instead of the
// Postgres default, so it might not be PUBLIC-executable at all. The self-test
// would then assert that the detector stayed quiet about a function that was
// never a violation, and report PASS having proved nothing. A self-test that can
// silently stop testing is worse than none, because it launders the very
// assumption the gate rests on.
//
// DROP guarantees the object is new, so its proacl is NULL and the default
// (EXECUTE to PUBLIC) applies. That is asserted explicitly after planting rather
// than assumed — see assertPlantIsPublicExecutable().
const PLANT = `
CREATE SCHEMA IF NOT EXISTS public;
DROP FUNCTION IF EXISTS public.zz_secdef_gate_selftest();
DROP FUNCTION IF EXISTS public.zz_secdef_gate_selftest_named(text, integer);
CREATE FUNCTION public.zz_secdef_gate_selftest()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$ SELECT true $fn$;
CREATE FUNCTION public.zz_secdef_gate_selftest_named(p_token text, p_count integer)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$ SELECT true $fn$;
-- deliberately issue NO revoke on either: this is the exact defect shape, the
-- Postgres default that nobody chooses.
`;
const UNPLANT = `
DROP FUNCTION IF EXISTS public.zz_secdef_gate_selftest();
DROP FUNCTION IF EXISTS public.zz_secdef_gate_selftest_named(text, integer);`;

// Reads the SAME predicate check 1 uses, restricted to the plants. The point is
// to prove the fixture carries the defect before asking whether the detector
// sees it: "the detector stayed quiet" and "there was nothing to see" are
// otherwise indistinguishable, and only one of them is a passing test.
const SQL_PLANT_IS_PUBLIC_EXECUTABLE = `
SELECT p.proname
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname LIKE 'zz_secdef_gate_selftest%'
   AND EXISTS (
     SELECT 1
       FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
   )
 ORDER BY 1`;

function assertPlantIsPublicExecutable(dbUrl, expected) {
  const got = rows(dbUrl, SQL_PLANT_IS_PUBLIC_EXECUTABLE).map((r) => r[0]);
  const missing = expected.filter((n) => !got.includes(n));
  if (missing.length > 0) {
    console.error(
      `::error::self-test: the planted function(s) ${missing.join(', ')} are NOT PUBLIC-executable, ` +
      `so they do not carry the defect this gate detects. Whatever the detector says next would ` +
      `prove nothing. (CREATE OR REPLACE preserves an existing ACL — the plant must be DROPped first.)`,
    );
    process.exit(1);
  }
  return got;
}

// The signature the checker MUST render for the named-parameter plant: types
// only, comma separated, no spaces, no schema prefix, no parameter names.
const PLANT_NAMED_SIG = 'zz_secdef_gate_selftest_named(text,integer)';

// Loopback-only. It really creates the function, so it must never run anywhere
// that is not a disposable database.
function selfTest(dbUrl, opts) {
  const host = (() => { try { return new URL(dbUrl).hostname; } catch { return ''; } })();
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    console.error(`::error::--self-test plants a real function and refuses a non-loopback host (got "${host}"). Use --self-test-tx against a shared database.`);
    process.exit(2);
  }

  const namesPlant = (r) => r.failures.filter((f) => f.includes('zz_secdef_gate_selftest')).length;
  const fail = (msg) => { console.error(`::error::self-test: ${msg}`); process.exit(1); };

  // CASE 1 — the detector fires, by exactly the right amount, and stops.
  //
  // The baseline is deliberately NOT required to be clean. This runs against a
  // replayed substrate that may carry real findings of its own, and "the gate
  // already fails here" must not be confused with "the gate cannot fail". What
  // is asserted is the DELTA.
  psql(dbUrl, UNPLANT);
  const before = runChecks(dbUrl, { ...opts, quiet: true });
  console.log(`self-test: baseline carries ${before.failures.length} finding(s), ${namesPlant(before)} of them naming a plant`);
  if (namesPlant(before) !== 0) fail('a plant is already reported before it was planted. The detector is matching something else.');

  console.log('self-test 1: planting TWO SECURITY DEFINER functions with the Postgres default ACL (no REVOKE) — one bare-typed, one with NAMED parameters');
  psql(dbUrl, PLANT);
  const plantedPublic = assertPlantIsPublicExecutable(dbUrl, ['zz_secdef_gate_selftest', 'zz_secdef_gate_selftest_named']);
  console.log(`  fixture verified: ${plantedPublic.join(', ')} really are PUBLIC-executable, so they carry the defect under test`);
  const during = runChecks(dbUrl, { ...opts, quiet: true });
  if (namesPlant(during) !== 2) fail(`expected both plants to be reported, got ${namesPlant(during)}. The gate cannot fail, so its clean verdicts are worthless.`);
  if (during.failures.length !== before.failures.length + 2) {
    fail(`planting two violations moved the finding count from ${before.failures.length} to ${during.failures.length}. The detector is not measuring what it claims.`);
  }

  // The named-parameter plant must be reported by its TYPE signature. This is
  // the assertion that would have caught the first real run's failure: a gate
  // that renders `(p_token text)` matches no allowlist entry and reports the
  // whole estate as unlisted.
  const named = during.failures.find((f) => f.includes('zz_secdef_gate_selftest_named'));
  if (!named || !named.includes(PLANT_NAMED_SIG)) {
    fail(
      `the named-parameter plant was not rendered as ${PLANT_NAMED_SIG}. ` +
      `Reported instead: ${named ? named.split('\n')[0] : '(nothing)'}. ` +
      `Parameter names or a schema prefix in the signature mean NO allowlist entry can ever match.`,
    );
  }
  console.log(`  both plants detected; named parameters rendered as ${PLANT_NAMED_SIG} — PASS`);

  // CASE 2 — a PENDING entry SUPPRESSES a live violation.
  const pendingLive = {
    ...opts,
    quiet: true,
    lists: {
      pending: { entries: [{ payload: PLANT_NAMED_SIG, reason: 'self-test fixture' }], problems: [] },
    },
  };
  const suppressed = runChecks(dbUrl, pendingLive);
  if (suppressed.failures.some((f) => f.includes(PLANT_NAMED_SIG) && f.includes('grants EXECUTE to PUBLIC'))) {
    fail('a PENDING entry did not suppress its own violation — the exemption mechanism does not work.');
  }
  console.log('self-test 2: a PENDING entry suppresses its live violation — PASS');

  // CASE 3 — THE RATCHET. Once the cause is fixed, the exemption must FAIL.
  psql(dbUrl, `REVOKE EXECUTE ON FUNCTION public.zz_secdef_gate_selftest_named(text, integer) FROM PUBLIC;`);
  const outlived = runChecks(dbUrl, pendingLive);
  const ratchet = outlived.failures.find((f) => f.includes('outlived its cause') && f.includes(PLANT_NAMED_SIG));
  if (!ratchet) {
    fail(
      `a PENDING entry whose function is no longer PUBLIC-executable did NOT fail. ` +
      `The exemption would outlive its cause and become a permanent hole.`,
    );
  }
  console.log('self-test 3: a PENDING entry whose cause is fixed FAILS, naming it — PASS');

  // CASE 4 — absent is not fixed.
  psql(dbUrl, UNPLANT);
  const absent = runChecks(dbUrl, pendingLive);
  if (absent.failures.some((f) => f.includes('outlived its cause') && f.includes(PLANT_NAMED_SIG))) {
    fail('a PENDING entry naming an ABSENT function was reported as fixed. A partial replay may simply not have built it — that is not evidence.');
  }
  console.log('self-test 4: a PENDING entry naming an absent function draws no conclusion — PASS');

  // CASE 5 — cleanup restores the baseline exactly.
  const after = runChecks(dbUrl, { ...opts, quiet: true });
  if (namesPlant(after) !== 0 || after.failures.length !== before.failures.length) {
    fail(`after cleanup the gate reports ${after.failures.length} finding(s) (baseline was ${before.failures.length}). The detector is not reporting the plant.`);
  }
  console.log('self-test 5: removing the plants restores the baseline exactly — PASS');

  console.log('\nself-test PASSED: the gate fires on planted violations by exactly the right amount, renders named parameters as types, honours a PENDING exemption, FAILS when that exemption outlives its cause, draws no conclusion from an absent function, and goes quiet when the plants are removed.');
}

// Safe against any database, production included: everything happens inside one
// transaction that is rolled back. Proves the DETECTOR fires; it does not
// exercise the allowlist plumbing the way --self-test does.
function selfTestTx(dbUrl) {
  // A NAME THAT CANNOT PRE-EXIST, plus DROP IF EXISTS.
  //
  // `CREATE OR REPLACE FUNCTION` preserves an existing function's ACL, so a
  // colliding name would hand us a "plant" that is not PUBLIC-executable at all,
  // and the self-test would report PASS having proved nothing.
  //
  // A unique name closes a SECOND hole that DROP alone does not. If a same-named
  // function existed BEFORE the transaction, it legitimately comes back when the
  // transaction rolls back — and the post-rollback "did the plant survive?" check
  // then fires a false alarm about a function it never planted. Measured: with a
  // pre-existing zz_secdef_gate_selftest_tx() this refused with "the planted
  // function SURVIVED the rollback" against a database that was behaving
  // perfectly. Unique per run, the question becomes unambiguous.
  const tag = `${process.pid.toString(36)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const fn = `zz_secdef_gate_selftest_tx_${tag}`.slice(0, 63);

  // Two assertions, in this order, and the order is the point:
  //   PLANTED= the fixture really does carry the defect (PUBLIC EXECUTE)
  //   DETECT=  the detector then sees it
  // Without the first, "the detector stayed quiet" and "there was nothing to
  // see" are indistinguishable, and only one of them is a passing test.
  const detector = SQL_PUBLIC_EXECUTE.replace('ORDER BY 1', `AND p.proname = '${fn}' ORDER BY 1`);
  const sql = `
BEGIN;
DROP FUNCTION IF EXISTS public.${fn}();
CREATE FUNCTION public.${fn}()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$ SELECT true $fn$;
SELECT 'PLANTED=' || count(*)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname = '${fn}'
   AND EXISTS (
     SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
   );
SELECT 'DETECT=' || count(*) FROM (${detector}) d;
ROLLBACK;`;

  const out = psql(dbUrl, sql);

  if (!out.includes('PLANTED=1')) {
    console.error(
      `::error::self-test-tx: the planted function public.${fn} is NOT PUBLIC-executable, so it does ` +
      `not carry the defect this gate detects. A quiet detector would prove nothing. Refusing to certify.`,
    );
    process.exit(1);
  }
  if (!out.includes('DETECT=1')) {
    console.error(
      `::error::self-test-tx: the detector did NOT fire on public.${fn}, which IS PUBLIC-executable. ` +
      `The clean verdict from this gate means nothing.`,
    );
    process.exit(1);
  }

  // Unambiguous now: this name existed nowhere before this process chose it, so
  // anything left behind is a genuine rollback failure.
  const still = rows(dbUrl, `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='${fn}'`);
  if (still.length !== 0) {
    console.error(`::error::self-test-tx: public.${fn} SURVIVED the rollback. Refusing to continue against this database.`);
    process.exit(1);
  }
  console.log(`self-test-tx PASSED: public.${fn} was verified PUBLIC-executable, the detector fired on it inside a rolled-back transaction, and the plant left nothing behind.`);
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
