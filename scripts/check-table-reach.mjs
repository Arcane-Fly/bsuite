#!/usr/bin/env node
/**
 * check-table-reach.mjs — a table that exists and nothing reads is invisible work.
 *
 * WHY THIS EXISTS
 *
 * 2026-08-22: `rate_adjustments` and `billing_cycles` were created in production —
 * correct columns, correct RLS, four per-operation policies each — and NO APPLICATION
 * REFERENCES EITHER. The migration was green, the schema was right, and no user could
 * reach a single row.
 *
 * That is the estate's dominant failure mode in its database form: built, correct, and
 * not reaching the screen. Every existing gate measured whether the migration APPLIED.
 * None measured whether anything then USED it.
 *
 * WHAT IT MEASURES
 *
 * Tables declared by CREATE TABLE in any submodule's migrations, against every
 * `.from('x')` / `.rpc('x')` call and every generated-types reference in app source.
 * A table with zero reach across the whole estate is reported.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not fail the build. Plenty of tables are legitimately unreached from
 * TypeScript: audit logs written by triggers, queue tables driven by pg_cron, join
 * tables read only through an embed. Failing on those would train everyone to ignore
 * it. It reports, and the number is expected to be looked at.
 *
 * WHAT IT CANNOT SEE — stated, because an unstated blind spot reads as a finding
 *
 * The count moved 212 -> 196 -> 165 -> 164 across four correction rounds, and EVERY
 * round was this detector's own bug, not a change in the estate:
 *
 *   212  a backreference regex, plus eleven English words scraped from SQL comments
 *   196  stripping dollar-quotes lost two real tables created inside DO $$ blocks
 *   165  crm7 reaches 40 tables through a store FACTORY, not through `.from()`
 *   164  braden reaches tables through a union type fed to a generic CRUD service
 *
 * A number this detector produces is a hypothesis until a control confirms it. The
 * controls that hold it honest: ten known-used tables must read REACHED, and the two
 * tables that motivated the gate must still read unreached.
 *
 * Residual: a table whose name is COMPUTED at runtime — assembled from a variable, a
 * template with an interpolation, or an enum member resolved elsewhere — is invisible
 * to any static scan, and will be reported as unreached. Confirm by hand before
 * treating an entry as dead.
 *
 * THE GREP THAT DID NOT WORK, recorded so it is not rewritten
 *
 * `grep -rhoE "\.from\((['\"])[a-z_]+\1"` returns ZERO across all six apps. The
 * backreference does not survive `grep -oE`. Zero read as "no app touches any table",
 * which is obviously false and was caught only by testing the pattern against a table
 * known to be in use. A zero from grep is a hypothesis, never a finding.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', '.turbo']);

/**
 * Strip what is not SQL before parsing it.
 *
 * The first run of this gate reported `as`, `exists`, `for`, `hands`, `here`, `if`,
 * `is`, `migration`, `omitted`, `throughout` and `time` as tables — eleven English
 * words, every one scraped out of a COMMENT or a quoted string that happened to
 * contain the phrase "create table". One came from a literal inside an event trigger:
 *
 *     WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
 *
 * A parser that reads prose reports prose. Comments and string literals go first.
 *
 * DOLLAR-QUOTED BODIES ARE **NOT** STRIPPED, and that was a correction. Stripping them
 * cleared the prose words but silently lost two REAL tables — `vet_assessments` and
 * `tenant_encryption_keys` are both created inside `DO $$ … $$` blocks. A `DO` block
 * runs real DDL; only a FUNCTION body is inert. Removing both together traded eleven
 * false positives for two false negatives, which is the worse trade: a false positive
 * is visible and gets argued with, a false negative is silence.
 */
export function stripNonSql(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')      // block comments
    .replace(/--[^\n]*/g, ' ')              // line comments
    .replace(/'(?:[^']|'')*'/g, "''");      // single-quoted literals
}

/** Words that follow "create table" in real SQL but never name a table. */
const NOT_A_TABLE = new Set(['if', 'not', 'exists', 'as', 'select', 'public', 'temp', 'temporary', 'unlogged']);

/** CREATE TABLE [IF NOT EXISTS] [public.]name — the schema-qualified form included. */
export function tablesInSql(sql) {
  const out = new Set();
  const clean = stripNonSql(sql);
  const re = /create\s+(?:(?:global|local)\s+)?(?:temp(?:orary)?\s+|unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:"?([a-z_][a-z0-9_]*)"?\.)?"?([a-z_][a-z0-9_]*)"?/gi;
  let m;
  while ((m = re.exec(clean))) {
    const schema = (m[1] || 'public').toLowerCase();
    if (schema !== 'public') continue;           // non-public schemas are not app surface
    const name = m[2].toLowerCase();
    if (NOT_A_TABLE.has(name)) continue;
    out.add(name);
  }
  return out;
}

/** Every way app code names a table. */
export function tablesReferenced(src) {
  const out = new Set();
  for (const re of [
    /\.from\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g,          // supabase.from('x')
    /\.rpc\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g,           // supabase.rpc('x')
    /Tables<\s*['"`]([a-z_][a-z0-9_]*)['"`]/g,           // generated types
    /Database\['public'\]\['Tables'\]\['([a-z_][a-z0-9_]*)'\]/g,
    /\bfrom\s+public\.([a-z_][a-z0-9_]*)/gi,             // raw SQL in app code

    // ABSTRACTION LAYERS. crm7 reaches most of its tables through a store factory,
    // not through a direct `.from()`. Missing this shape reported `pay_periods` as
    // unreached while `createEntityStore<PayPeriod>('pay_periods', …)` sat in
    // src/stores/payPeriodStore.ts. 364 call sites, 40 distinct tables.
    /\b(?:createEntityStore|createEntityService|createRepository|makeStore|createTableStore|defineEntity)\s*(?:<[^>()]*>)?\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/g,
    /\btable(?:Name)?\s*:\s*['"`]([a-z_][a-z0-9_]*)['"`]/g,   // { table: 'x' } config
  ]) {
    let m;
    while ((m = re.exec(src))) out.add(m[1].toLowerCase());
  }

  // A union type of table names fed to a generic CRUD service is real reach.
  // braden does exactly this: `type UntypedTableName = 'staff' | 'tasks' | 'emails'`.
  // Only unions whose alias NAMES a table are read, so an unrelated string union
  // (statuses, roles) cannot leak in.
  const union = /\btype\s+\w*Table\w*\s*=\s*((?:\s*\|?\s*['"`][a-z_][a-z0-9_]*['"`])+)/g;
  let u;
  while ((u = union.exec(src))) {
    for (const lit of u[1].match(/['"`]([a-z_][a-z0-9_]*)['"`]/g) || []) {
      out.add(lit.replace(/['"`]/g, '').toLowerCase());
    }
  }
  return out;
}

/**
 * Tables the DATABASE writes to at runtime — from inside a function body, a trigger,
 * or a pg_cron command. These are legitimately unreached from TypeScript, and lumping
 * them in with genuinely orphaned tables is what made the first report a wall of 164
 * rows rather than a finding.
 *
 * The distinction that matters is RUNTIME vs SEED. A bare top-level `INSERT INTO x`
 * in a migration is one-time seed data and proves nothing about ongoing use. An INSERT
 * or UPDATE inside a dollar-quoted body runs whenever that function or trigger fires.
 * Only the second counts.
 */
export function serverWritten(sql) {
  const out = new Set();
  const add = (name) => { if (name) out.add(name.toLowerCase().replace(/^public\./, '')); };

  // 1. Writes inside a dollar-quoted body: function source, trigger source, DO block.
  const bodies = sql.match(/\$\$[\s\S]*?\$\$/g) || [];
  for (const raw of bodies) {
    const body = raw.replace(/--[^\n]*/g, ' ');
    for (const re of [
      /\binsert\s+into\s+((?:public\.)?[a-z_][a-z0-9_]*)/gi,
      /\bupdate\s+((?:public\.)?[a-z_][a-z0-9_]*)\s+set\b/gi,
      /\bdelete\s+from\s+((?:public\.)?[a-z_][a-z0-9_]*)/gi,
    ]) { let m; while ((m = re.exec(body))) add(m[1]); }
  }

  // 2. The table a trigger fires ON — EXCEPT a housekeeping timestamp trigger.
  //
  //    `updated_at` triggers are 192 of the estate's trigger definitions
  //    (update_updated_at_column 90, handle_updated_at 82, set_updated_at 20) and they
  //    prove NOTHING about use: they fire only when something else has already
  //    written the row. Counting them classified rate_adjustments and billing_cycles
  //    — the two tables that motivated this whole gate, with provably zero reach —
  //    as server-written. The control caught it.
  const HOUSEKEEPING = /(updated_at|update_timestamp|set_timestamp|moddatetime|modified_at)/i;
  const trig = /create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+[a-z0-9_"]+\s+(?:before|after|instead\s+of)([\s\S]{0,300}?)\bon\s+((?:public\.)?[a-z_][a-z0-9_]*)([\s\S]{0,200}?);/gi;
  let t;
  while ((t = trig.exec(sql))) {
    const fn = (t[3] || '').match(/execute\s+(?:function|procedure)\s+((?:public\.)?[a-z_][a-z0-9_]*)/i);
    if (fn && HOUSEKEEPING.test(fn[1])) continue;
    add(t[2]);
  }

  // 3. pg_cron command strings. The command is a quoted SQL literal, so it survives
  //    outside a dollar-quote and has to be read separately.
  const cron = /cron\.schedule\s*\(([\s\S]{0,600}?)\)\s*;/gi;
  let c;
  while ((c = cron.exec(sql))) {
    for (const re of [
      /\binsert\s+into\s+((?:public\.)?[a-z_][a-z0-9_]*)/gi,
      /\bupdate\s+((?:public\.)?[a-z_][a-z0-9_]*)\s+set\b/gi,
      /\bdelete\s+from\s+((?:public\.)?[a-z_][a-z0-9_]*)/gi,
    ]) { let m; while ((m = re.exec(c[1]))) add(m[1]); }
  }
  return out;
}

const SELF_TESTS = [
  { n: 'CREATE TABLE is found', f: () => tablesInSql('CREATE TABLE public.foo (id int);').has('foo') },
  { n: 'IF NOT EXISTS is found', f: () => tablesInSql('create table if not exists bar (id int);').has('bar') },
  { n: 'quoted identifiers are found', f: () => tablesInSql('CREATE TABLE "public"."baz" (id int);').has('baz') },
  { n: 'a NON-public schema is excluded — not app surface',
    f: () => !tablesInSql('CREATE TABLE audit.events (id int);').has('events') },
  { n: 'CREATE TABLE AS is still a table', f: () => tablesInSql('CREATE TABLE t2 AS SELECT 1;').has('t2') },
  { n: 'TEMP / UNLOGGED qualifiers do not become the name',
    f: () => tablesInSql('CREATE TEMP TABLE scratch (id int);').has('scratch') },

  // Each of these reported a real false positive on the gate's FIRST run. A detector
  // whose first output is its own bugs is the recurring shape; each one is now a test.
  { n: 'FP: a line comment mentioning create table yields nothing',
    f: () => tablesInSql('-- we create table here for the migration\n').size === 0 },
  { n: 'FP: a block comment mentioning create table yields nothing',
    f: () => tablesInSql('/* create table if we need to */').size === 0 },
  { n: "FP: the literal 'CREATE TABLE AS' inside a string yields nothing",
    f: () => tablesInSql("WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS');").size === 0 },
  { n: 'FP: a comment inside a dollar-quoted body is still a comment',
    f: () => tablesInSql('CREATE FUNCTION f() AS $$ -- create table foo\n $$;').size === 0 },
  { n: 'FN GUARD: a REAL table inside a DO $$ block is FOUND — a DO block runs real DDL',
    f: () => tablesInSql('DO $$ BEGIN CREATE TABLE public.vet_assessments (id int); END $$;').has('vet_assessments') },
  { n: 'FP: bare keywords never become table names',
    f: () => ['if', 'exists', 'as', 'select'].every((w) => !tablesInSql(`create table ${w}`).has(w)) },
  { n: 'a real CREATE TABLE next to a comment still parses',
    f: () => tablesInSql('-- create table nope\nCREATE TABLE public.yes (id int);').has('yes') },
  { n: ".from('x') is a reference", f: () => tablesReferenced("supabase.from('clients')").has('clients') },
  { n: 'double quotes work too', f: () => tablesReferenced('sb.from("employers")').has('employers') },
  { n: 'template literals work too', f: () => tablesReferenced('sb.from(`contacts`)').has('contacts') },
  { n: ".rpc('x') counts — a table reached only through an RPC is REACHED",
    f: () => tablesReferenced("supabase.rpc('has_tenant_role')").has('has_tenant_role') },
  { n: 'generated Tables<> counts', f: () => tablesReferenced("type R = Tables<'invoices'>").has('invoices') },
  { n: 'raw SQL in app code counts', f: () => tablesReferenced('const q = `select * from public.leads`').has('leads') },
  { n: 'Array.from is NOT a table — the classic false positive',
    f: () => !tablesReferenced('Array.from({length: 3})').has('length') },

  // The abstraction layer. Without these, 40 of crm7's tables read as unreached.
  { n: 'a store FACTORY taking a table name counts as reach',
    f: () => tablesReferenced("createEntityStore<PayPeriod>('pay_periods', {})").has('pay_periods') },
  { n: 'a factory with no type parameter counts too',
    f: () => tablesReferenced("makeStore('leads')").has('leads') },
  { n: "a { table: 'x' } config key counts",
    f: () => tablesReferenced("useX({ table: 'system_notices' })").has('system_notices') },
  { n: "tableName: 'x' counts as well",
    f: () => tablesReferenced("{ tableName: 'candidates' }").has('candidates') },
  { n: 'a union type of table names fed to a generic CRUD service is reach',
    f: () => tablesReferenced("type UntypedTableName = 'staff' | 'tasks' | 'emails';").has('staff') },
  { n: 'an unrelated string union does NOT leak in — the alias must name a table',
    f: () => !tablesReferenced("type Status = 'open' | 'closed';").has('open') },
  { n: 'the backreference pattern that returned zero is not used here',
    f: () => tablesReferenced("supabase.from('a')").size === 1 },

  // SERVER-WRITTEN. Without this class the report is a wall of 164 rows rather
  // than a finding, because most of them are written by the database itself.
  { n: 'an INSERT inside a function body is a server write',
    f: () => serverWritten("CREATE FUNCTION f() AS $$ BEGIN INSERT INTO public.audit_log VALUES (1); END $$;").has('audit_log') },
  { n: 'an UPDATE ... SET inside a body counts',
    f: () => serverWritten("CREATE FUNCTION f() AS $$ UPDATE public.pay_runs SET x = 1; $$;").has('pay_runs') },
  { n: 'a DELETE FROM inside a body counts',
    f: () => serverWritten("$$ DELETE FROM retention_archive WHERE t < now(); $$").has('retention_archive') },
  { n: 'a trigger ON a table marks that table server-touched',
    f: () => serverWritten('CREATE TRIGGER t AFTER INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION propagate_approval();').has('contacts') },
  { n: 'an updated_at HOUSEKEEPING trigger does NOT — it fires only after someone else wrote',
    f: () => !serverWritten('CREATE TRIGGER t BEFORE UPDATE ON public.rate_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();').has('rate_adjustments') },
  { n: 'handle_updated_at is housekeeping too — 82 of them in this estate',
    f: () => !serverWritten('CREATE TRIGGER t BEFORE UPDATE ON public.x FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();').has('x') },
  { n: 'moddatetime is housekeeping',
    f: () => !serverWritten('CREATE TRIGGER t BEFORE UPDATE ON public.y EXECUTE FUNCTION moddatetime(updated_at);').has('y') },
  { n: 'a pg_cron command string is read — it sits OUTSIDE any dollar-quote',
    f: () => serverWritten("SELECT cron.schedule('nightly','0 2 * * *', $q$ INSERT INTO public.fair_work_retention_runs (id) VALUES (1) $q$);").has('fair_work_retention_runs') },
  { n: 'a BARE seed INSERT is NOT a server write — one-time data proves no ongoing use',
    f: () => serverWritten("INSERT INTO public.awards (code) VALUES ('MA000025');").size === 0 },
  { n: 'a comment inside a body does not create a server write',
    f: () => serverWritten("$$ -- insert into public.nope\n $$").size === 0 },
];

if (process.argv.includes('--self-test')) {
  let bad = 0;
  for (const t of SELF_TESTS) {
    let ok = false;
    try { ok = t.f(); } catch (e) { ok = false; }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.n}`);
    if (!ok) bad++;
  }
  console.log(`\n  ${SELF_TESTS.length - bad}/${SELF_TESTS.length} self-tests pass`);
  process.exit(bad ? 1 : 0);
}

function walk(dir, out, pick) {
  if (!existsSync(dir)) return out;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out, pick);
    else if (pick(e.name)) out.push(p);
  }
  return out;
}

const apps = readFileSync('.gitmodules', 'utf8')
  .split('\n').filter((l) => l.includes('path =')).map((l) => l.split('=')[1].trim());

const created = new Map();   // table -> [migration files]
const serverTouched = new Set(); // written by a function body, trigger, or cron command
const reached = new Map();   // table -> Set(app)
let sqlFiles = 0, srcFiles = 0;

for (const app of [...apps, '.']) {
  for (const d of [join(app, 'supabase/migrations'), join(app, 'migrations')]) {
    for (const f of walk(d, [], (n) => n.endsWith('.sql'))) {
      sqlFiles++;
      const sql = readFileSync(f, 'utf8');
      for (const t of tablesInSql(sql)) {
        if (!created.has(t)) created.set(t, []);
        created.get(t).push(f);
      }
      for (const t of serverWritten(sql)) serverTouched.add(t);
    }
  }
}
for (const app of apps) {
  for (const d of [join(app, 'src'), join(app, 'app'), join(app, 'api'), join(app, 'supabase/functions')]) {
    for (const f of walk(d, [], (n) => SRC_EXT.has(extname(n)))) {
      srcFiles++;
      let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
      for (const t of tablesReferenced(src)) {
        if (!reached.has(t)) reached.set(t, new Set());
        reached.get(t).add(app);
      }
    }
  }
}

// Positive controls. Each guards a way this scan can be silently empty and read clean.
if (sqlFiles < 50) { console.error(`  POSITIVE CONTROL FAILED: only ${sqlFiles} migration file(s). Submodules not checked out?`); process.exit(3); }
if (srcFiles < 500) { console.error(`  POSITIVE CONTROL FAILED: only ${srcFiles} source file(s) scanned.`); process.exit(3); }
if (created.size < 50) { console.error(`  POSITIVE CONTROL FAILED: only ${created.size} table(s) parsed from ${sqlFiles} migrations.`); process.exit(3); }
if (reached.size < 20) { console.error(`  POSITIVE CONTROL FAILED: only ${reached.size} table(s) referenced by ${srcFiles} source files — the reference patterns are broken.`); process.exit(3); }

const unreached = [...created.keys()].filter((t) => !reached.has(t)).sort();
const server = unreached.filter((t) => serverTouched.has(t));
const orphaned = unreached.filter((t) => !serverTouched.has(t));

console.log(`  scanned ${sqlFiles} migrations (${created.size} tables) and ${srcFiles} source files (${reached.size} tables referenced)\n`);
console.log(`  ${created.size - unreached.length} reached by app code`);
console.log(`  ${server.length} unreached by app code but WRITTEN BY THE DATABASE (trigger, function body, or pg_cron) — legitimate`);
console.log(`  ${orphaned.length} ORPHANED: nothing in any app, and nothing server-side either\n`);
console.log(`  ORPHANED (${orphaned.length}):\n`);
for (const t of orphaned) {
  const f = created.get(t)[0].replace(/^.*migrations\//, '');
  console.log(`    ${t.padEnd(42)} ${f}`);
}
console.log(`
  An ORPHANED table is created, granted, policied — and nothing anywhere touches it.
  That is the shape rate_adjustments and billing_cycles shipped in.

  Still not every one is a defect. A join table read only through a PostgREST embed
  never appears by name, and a table whose name is COMPUTED at runtime is invisible to
  any static scan. Confirm by hand before treating an entry as dead.

  This reports so the list gets looked at. It does not fail the build — a gate that
  fails on rows a human has to judge teaches everyone to ignore it.`);
process.exit(0);
