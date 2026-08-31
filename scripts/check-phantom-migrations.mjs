#!/usr/bin/env node
/**
 * check-phantom-migrations.mjs — a migration RECORDED AS APPLIED whose objects
 * do not exist.
 *
 * WHY THIS EXISTS
 *
 * Measured on the live database 2026-08-21. `schema_migrations` held a row for
 * `20260304090001`, and every one of the three features it defines was absent:
 *
 *   to_regclass('public.rate_adjustments')    NULL
 *   to_regclass('public.billing_cycles')      NULL
 *   gto_complaints.external_referral column   ABSENT
 *
 * Five months. 742 recorded migrations. Nothing noticed — because a table that
 * was never created looks EXACTLY like a feature nobody has built yet. It
 * surfaced only when another lane tripped over the hole while asking for a role
 * gate on one of the missing tables, and reported itself blocked on a
 * permissions model. There was no permissions problem. There was nothing to gate.
 *
 * THE LEDGER IS NOT EVIDENCE. A version in `schema_migrations` says a file was
 * recorded, not that its statements ran. `CREATE TABLE IF NOT EXISTS` is a
 * silent no-op; a `DO $$ ... $$` block that throws aborts the rest of the file;
 * a hand `migration repair` writes the row with no SQL at all. Each of those
 * leaves the same footprint: a green ledger and a missing object.
 *
 * WHAT THIS CHECKS
 *
 * For every migration file at or above MIGRATION_FLOOR whose version IS recorded
 * as applied, parse the objects it claims to create and assert each one exists.
 * A mismatch is a phantom.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not flag a missing object for an UNRECORDED migration — that is
 * simply a pending migration, which is the schema-lag gate's job.
 *
 * ---------------------------------------------------------------------------
 * THE FLOOR BLIND SPOT — FIXED 2026-08-31
 * ---------------------------------------------------------------------------
 * This gate used to skip `version < MIGRATION_FLOOR` BEFORE it ever asked
 * whether the version was recorded. The header justified that with a real
 * measurement: on 2026-08-21 all 81 below-floor "pending" migrations were
 * already applied, so reporting them would bury the real findings under 81
 * false alarms.
 *
 * That reasoning is sound — and it only ever applied to UNRECORDED migrations.
 * A RECORDED below-floor migration whose objects are absent is a phantom by
 * this gate's own definition, and skipping it put the blind spot exactly where
 * the estate's oldest unapplied work lives.
 *
 * Measured 2026-08-31 on tuybltdrdefjblnplpqo, the hole was occupied:
 *
 *   20260506000000  public.schema_mutations_audit   ABSENT
 *   20260506000000  public.rename_physical_column   ABSENT
 *
 * `20260506000000_rename_physical_column_rpc.sql` is RECORDED — but under the
 * name `reconciled-2026-05-19`, one of 72 bulk reconcile marker rows. The
 * ledger is keyed on VERSION ALONE, so the marker burned the version and the
 * applier will never run the file. Two production apps ship a UI control that
 * calls the RPC it defines. Every click 404s.
 *
 * THE RULE NOW: the floor gates the UNRECORDED branch only. A recorded version
 * is scanned wherever it sits. Measured cost of lifting it: 4 findings across
 * 787 recorded migrations — not 81. The 81 were unrecorded, and are still
 * skipped.
 *
 * The below-floor UNRECORDED files are not simply dropped either. A migration
 * below the floor that was never recorded will NEVER be applied — the applier
 * skips it by version and nothing else will ever pick it up — so its absent
 * objects are permanently absent. That is a different defect from a phantom
 * and it is reported separately as STRANDED, non-fatal unless
 * `--fail-on-stranded` is passed. Reporting it as a phantom would be the
 * 81-false-alarm mistake; reporting it as nothing at all is how
 * `reorder_entity_fields` sat absent since May with every gate green.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const FLOOR = process.env.MIGRATION_FLOOR || '20260611000000';
const args = process.argv.slice(2);

/** Objects a migration file claims to create. */
/**
 * Identifier fragments. Postgres dumps QUOTE every identifier
 * (`CREATE TABLE "public"."foo"`), hand-written migrations mostly do not, and
 * the two appear in the same trees. Before these fragments existed the parser
 * matched only the bare form, so on a quoted dump the optional
 * `IF NOT EXISTS` branch backtracked and the regex matched the word `if`
 * itself — `public.if` and `public.as` were reported as missing tables.
 * That never surfaced while baseline dumps sat below the floor and were
 * skipped wholesale; the stranded scan reads them, so it had to be fixed.
 *
 * `S` = optional schema (capturing, WITHOUT the dot), `N` = a name.
 */
const S = '(?:"?([a-z_][a-z0-9_]*)"?\\s*\\.\\s*)?';
const N = '"?([a-z_][a-z0-9_]*)"?';
const rx = (body) => new RegExp(body, 'gi');

/**
 * Words that are SQL syntax, never an object name. A regex cannot tell a
 * statement from the same words inside a string literal, and
 * `20260513140000_annotate_secdef_triggers_phase21A.sql` line 316 contains
 *
 *     WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
 *
 * which the CREATE-TABLE matcher read as a table called `as`. Rejecting
 * keywords is cheaper and safer than trying to strip string literals, and it
 * also absorbs any future backtrack that lands on a keyword.
 */
const KEYWORDS = new Set([
  'as', 'if', 'not', 'exists', 'only', 'table', 'index', 'unique', 'concurrently',
  'or', 'replace', 'function', 'temp', 'temporary', 'unlogged', 'global', 'local',
  'select', 'into', 'on', 'to', 'from', 'with', 'and', 'is', 'null', 'default',
]);
const isKeyword = (n) => KEYWORDS.has(n.toLowerCase());

/**
 * `m[i]` = schema (may be undefined), `m[i+1]` = name -> "schema.name",
 * or null when the name is a keyword and therefore not an object at all.
 */
const qual = (m, i) =>
  isKeyword(m[i + 1]) ? null : `${(m[i] || 'public').toLowerCase()}.${m[i + 1].toLowerCase()}`;

export function claimedObjects(sql) {
  const out = { tables: [], functions: [], columns: [], indexedTables: [] };
  // Strip line comments so prose describing a CREATE TABLE is not read as one.
  // A comment mentioning a table name has bitten this estate repeatedly.
  const code = sql.replace(/--[^\n]*/g, '');

  for (const m of code.matchAll(rx(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${S}${N}`))) {
    const t = qual(m, 1);
    if (t) out.tables.push(t);
  }
  for (const m of code.matchAll(rx(`CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+${S}${N}\\s*\\(`))) {
    const schema = `${(m[1] || 'public').toLowerCase()}.`;
    // pg_temp objects live for the session that made them and are GONE by
    // definition. A migration that builds a scratch helper there is correct.
    if (schema === 'pg_temp.') continue;
    if (isKeyword(m[2])) continue;
    out.functions.push(`${schema}${m[2].toLowerCase()}`);
  }
  // A CREATE INDEX names a table too, and an index on a missing table is the
  // same defect. The first version of this gate missed
  // idx_host_employers_xero_contact_id sitting two lines below the ALTER it
  // DID catch -- the file had TWO statements against a table that does not
  // exist and the gate reported one.
  for (const m of code.matchAll(rx(`CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:CONCURRENTLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?"?[a-z_][a-z0-9_]*"?\\s+ON\\s+(?:ONLY\\s+)?${S}${N}`))) {
    const t = qual(m, 1);
    if (t && !out.tables.includes(t)) out.indexedTables.push(t);
  }
  for (const m of code.matchAll(rx(`ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${S}${N}([\\s\\S]*?);`))) {
    const table = qual(m, 1);
    if (!table) continue;
    for (const c of m[3].matchAll(rx(`ADD\\s+COLUMN\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${N}`))) {
      if (!isKeyword(c[1])) out.columns.push(`${table}.${c[1].toLowerCase()}`);
    }
  }
  return out;
}

/**
 * Objects a migration DROPS. Three false-positive classes made this necessary,
 * all found by running the gate against production before shipping it:
 *
 *   1. A scratch helper created and dropped inside the SAME migration --
 *      `__bsuite1833_replace_call` is created, used to rewrite policy bodies,
 *      and dropped at the end. Correct, and absent from the database by design.
 *   2. An object dropped by a LATER migration -- `overtime_tier_multiplier` and
 *      `is_platform_super_admin` were both legitimately removed afterwards.
 *   3. Objects outside `public`. That one is fixed in the STATE QUERY, not here:
 *      a public-only column list makes every `catalog.*` column look missing.
 *
 * The first run reported 22 phantoms. Every single one was the gate's fault.
 */
export function droppedObjects(sql) {
  const out = { tables: [], functions: [], columns: [] };
  const code = sql.replace(/--[^\n]*/g, '');
  for (const m of code.matchAll(rx(`DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${S}${N}`))) {
    const t = qual(m, 1);
    if (t) out.tables.push(t);
  }
  for (const m of code.matchAll(rx(`DROP\\s+FUNCTION\\s+(?:IF\\s+EXISTS\\s+)?${S}${N}`))) {
    const f = qual(m, 1);
    if (f) out.functions.push(f);
  }
  // A RENAMED TABLE is gone under its old name, exactly like a renamed column.
  // Missing this cost a false positive on `public.custom_fields`: BSU's
  // 20260306000003 creates it, crm7's 20260807072000 renames it to
  // `custom_fields_legacy_unused`, and the gate called the absence a phantom.
  // Both names are recorded — the old one because it is legitimately gone, the
  // new one because a later migration may rename it onward again.
  for (const m of code.matchAll(
    rx(`ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${S}${N}\\s+RENAME\\s+TO\\s+${N}`),
  )) {
    const schema = `${(m[1] || 'public').toLowerCase()}.`;
    if (isKeyword(m[2]) || isKeyword(m[3])) continue;
    out.tables.push(`${schema}${m[2].toLowerCase()}`);
    // `RENAME TO` names the target BARE — it cannot cross schemas — so the new
    // name inherits the source schema, never a defaulted `public.`.
    out.tables.push(`${schema}${m[3].toLowerCase()}`);
  }
  for (const m of code.matchAll(rx(`ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?${S}${N}([\\s\\S]*?);`))) {
    const table = qual(m, 1);
    if (!table) continue;
    for (const c of m[3].matchAll(rx(`DROP\\s+COLUMN\\s+(?:IF\\s+EXISTS\\s+)?${N}`)))
      if (!isKeyword(c[1])) out.columns.push(`${table}.${c[1].toLowerCase()}`);
    // A RENAMED column is not missing -- it exists under the new name. Counting
    // the old name as a phantom flagged training_plans.qualification_id_uuid,
    // which the same migration adds and then renames.
    for (const c of m[3].matchAll(rx(`RENAME\\s+COLUMN\\s+${N}\\s+TO\\s+${N}`))) {
      out.columns.push(`${table}.${c[1].toLowerCase()}`);
      out.columns.push(`${table}.${c[2].toLowerCase()}`);
    }
  }
  return out;
}

/**
 * How a single migration file is routed. THIS is the function that carried the
 * blind-spot bug, so it is exported and self-tested rather than left inline in
 * the CLI loop where nothing could reach it.
 *
 *   'phantom'  — recorded: assert its objects exist. The floor does NOT apply.
 *   'stranded' — below floor and never recorded: the applier will never run it,
 *                so its objects are permanently absent. Reported, not failed.
 *   'lag'      — at/above floor and not yet recorded: schema-lag's job.
 *
 * The old code answered 'skip' for EVERY version below the floor, recorded or
 * not, which is precisely how a recorded-but-absent 20260506000000 read as clean.
 */
export function classify(version, recorded, floor) {
  if (recorded) return 'phantom';
  return version < floor ? 'stranded' : 'lag';
}

const SELF_TESTS = [
  {
    name: 'CREATE TABLE IF NOT EXISTS is claimed',
    sql: 'CREATE TABLE IF NOT EXISTS public.rate_adjustments (id uuid);',
    expect: (o) => o.tables.includes('public.rate_adjustments'),
  },
  {
    name: 'an unqualified table defaults to public',
    sql: 'CREATE TABLE billing_cycles (id uuid);',
    expect: (o) => o.tables.includes('public.billing_cycles'),
  },
  {
    name: 'CREATE OR REPLACE FUNCTION is claimed',
    sql: 'CREATE OR REPLACE FUNCTION public.has_tenant_role(p uuid, r text[]) RETURNS boolean AS $$ SELECT true $$;',
    expect: (o) => o.functions.includes('public.has_tenant_role'),
  },
  {
    name: 'ADD COLUMN IF NOT EXISTS is claimed, qualified by its table',
    sql: 'ALTER TABLE public.gto_complaints ADD COLUMN IF NOT EXISTS external_referral BOOLEAN;',
    expect: (o) => o.columns.includes('public.gto_complaints.external_referral'),
  },
  {
    name: 'multiple ADD COLUMNs in one ALTER are all claimed',
    sql: 'ALTER TABLE t ADD COLUMN IF NOT EXISTS a TEXT, ADD COLUMN IF NOT EXISTS b TEXT;',
    expect: (o) => o.columns.includes('public.t.a') && o.columns.includes('public.t.b'),
  },
  {
    name: 'PROSE mentioning a CREATE TABLE is NOT claimed — comments are stripped',
    sql: '-- This migration used to CREATE TABLE public.ghost_table before it was dropped.\nSELECT 1;',
    expect: (o) => o.tables.length === 0,
  },
  {
    name: 'a scratch helper created AND dropped in the same file is not a phantom',
    sql: 'CREATE OR REPLACE FUNCTION public.__scratch(t text) RETURNS void AS $$ BEGIN END $$;\nDROP FUNCTION IF EXISTS public.__scratch(text);',
    expect: (o, d) => o.functions.includes('public.__scratch') && d.functions.includes('public.__scratch'),
  },
  {
    name: 'DROP COLUMN is recorded as dropped',
    sql: 'ALTER TABLE public.t DROP COLUMN IF EXISTS gone;',
    expect: (o, d) => d.columns.includes('public.t.gone'),
  },
  {
    name: 'a non-public schema is qualified, not defaulted to public',
    sql: 'ALTER TABLE catalog.qualifications ADD COLUMN IF NOT EXISTS origin TEXT;',
    expect: (o) => o.columns.includes('catalog.qualifications.origin'),
  },
  {
    name: 'pg_temp functions are session-scoped and never claimed',
    sql: 'CREATE OR REPLACE FUNCTION pg_temp.merge_1066(a text) RETURNS void AS $$ BEGIN END $$;',
    expect: (o) => o.functions.length === 0,
  },
  {
    name: 'a RENAMED column is treated as gone under its old name',
    sql: 'ALTER TABLE public.training_plans RENAME COLUMN qualification_id_uuid TO qualification_id;',
    expect: (o, d) => d.columns.includes('public.training_plans.qualification_id_uuid'),
  },
  {
    name: 'CREATE INDEX names the table it targets — an index on a missing table is the same defect',
    sql: 'CREATE INDEX IF NOT EXISTS idx_x ON public.host_employers (col) WHERE col IS NOT NULL;',
    expect: (o) => o.indexedTables.includes('public.host_employers'),
  },
  {
    name: 'an index on a table the SAME file creates is not double-counted',
    sql: 'CREATE TABLE public.t (id uuid);\nCREATE INDEX idx_t ON public.t (id);',
    expect: (o) => o.tables.includes('public.t') && !o.indexedTables.includes('public.t'),
  },
  {
    name: 'a DROP is not a claim',
    sql: 'DROP TABLE IF EXISTS public.old_thing;',
    expect: (o) => o.tables.length === 0,
  },
  // --- ALTER TABLE ... RENAME TO (added with the floor fix) ---
  {
    name: 'a RENAMED TABLE is gone under its old name',
    sql: 'ALTER TABLE public.custom_fields RENAME TO custom_fields_legacy_unused;',
    expect: (o, d) => d.tables.includes('public.custom_fields'),
  },
  {
    name: '...and the NEW table name is recorded too, so a second rename still resolves',
    sql: 'ALTER TABLE public.custom_fields RENAME TO custom_fields_legacy_unused;',
    expect: (o, d) => d.tables.includes('public.custom_fields_legacy_unused'),
  },
  {
    name: 'RENAME TO inherits the SOURCE schema — it cannot cross schemas',
    sql: 'ALTER TABLE catalog.old_q RENAME TO new_q;',
    expect: (o, d) => d.tables.includes('catalog.old_q') && d.tables.includes('catalog.new_q'),
  },
  {
    name: 'NEGATIVE: a RENAME TO is not a CLAIM — it creates nothing',
    sql: 'ALTER TABLE public.a RENAME TO b;',
    expect: (o) => o.tables.length === 0,
  },
  {
    name: 'NEGATIVE: RENAME COLUMN is not read as a table rename',
    sql: 'ALTER TABLE public.t RENAME COLUMN a TO b;',
    expect: (o, d) => !d.tables.includes('public.t') && d.columns.includes('public.t.a'),
  },
  // --- QUOTED identifiers, as every pg_dump baseline writes them ---
  {
    name: 'a QUOTED dump table is claimed under its real name',
    sql: 'CREATE TABLE IF NOT EXISTS "public"."custom_fields_legacy_unused" ("id" uuid);',
    expect: (o) => o.tables.includes('public.custom_fields_legacy_unused'),
  },
  {
    name: 'THE GARBAGE CASE: a quoted CREATE TABLE never yields the keyword `if` as a table',
    sql: 'CREATE TABLE IF NOT EXISTS "public"."real_one" ("id" uuid);',
    expect: (o) => !o.tables.includes('public.if') && o.tables.length === 1,
  },
  {
    name: 'a QUOTED function is claimed',
    sql: 'CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS trigger AS $$ BEGIN END $$;',
    expect: (o) => o.functions.includes('public.update_updated_at_column'),
  },
  {
    name: 'a QUOTED index names its quoted table',
    sql: 'CREATE INDEX "idx_a" ON "public"."host_employers" ("col");',
    expect: (o) => o.indexedTables.includes('public.host_employers'),
  },
  {
    name: 'a QUOTED ADD COLUMN is qualified by its quoted table',
    sql: 'ALTER TABLE "public"."gto_complaints" ADD COLUMN IF NOT EXISTS "external_referral" boolean;',
    expect: (o) => o.columns.includes('public.gto_complaints.external_referral'),
  },
  {
    name: 'a QUOTED table rename is recorded as dropped under the old name',
    sql: 'ALTER TABLE "public"."custom_fields" RENAME TO "custom_fields_legacy_unused";',
    expect: (o, d) => d.tables.includes('public.custom_fields'),
  },
  {
    name: 'NEGATIVE: quoting does not change the default schema for an unqualified name',
    sql: 'CREATE TABLE "billing_cycles" ("id" uuid);',
    expect: (o) => o.tables.includes('public.billing_cycles'),
  },
  // --- keyword guard: SQL syntax inside a STRING LITERAL is not an object ---
  {
    name: 'THE STRING-LITERAL CASE: a command_tag list yields no table called `as`',
    sql: "SELECT 1 WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO');",
    expect: (o) => !o.tables.includes('public.as') && o.tables.length === 0,
  },
  {
    name: 'NEGATIVE: the keyword guard still admits a real table next to the literal',
    sql: "CREATE TABLE public.audit_log (id uuid); SELECT 1 WHERE t IN ('CREATE TABLE AS');",
    expect: (o) => o.tables.length === 1 && o.tables.includes('public.audit_log'),
  },
  {
    name: 'NEGATIVE: a table whose name merely CONTAINS a keyword is still a table',
    sql: 'CREATE TABLE public.table_layouts (id uuid); CREATE TABLE public.if_conditions (id uuid);',
    expect: (o) => o.tables.includes('public.table_layouts') && o.tables.includes('public.if_conditions'),
  },
];

/**
 * The floor-routing controls, in BOTH directions. Each row asserts what
 * `classify` must answer AND names the failure it exists to prevent.
 */
const CLASSIFY_TESTS = [
  {
    name: 'THE BUG: a RECORDED migration BELOW the floor is scanned as a phantom',
    args: ['20260506000000', true, '20260611000000'],
    want: 'phantom',
  },
  {
    name: 'a RECORDED migration ABOVE the floor is scanned as a phantom',
    args: ['20260812010000', true, '20260611000000'],
    want: 'phantom',
  },
  {
    name: 'NEGATIVE: an UNRECORDED migration below the floor is STRANDED, never a phantom',
    args: ['20260505000000', false, '20260611000000'],
    want: 'stranded',
  },
  {
    name: 'NEGATIVE: an UNRECORDED migration above the floor is schema-lag\'s, never a phantom',
    args: ['20260930000000', false, '20260611000000'],
    want: 'lag',
  },
  {
    name: 'a migration EXACTLY ON the floor and unrecorded is lag, not stranded (boundary is >=)',
    args: ['20260611000000', false, '20260611000000'],
    want: 'lag',
  },
  {
    name: 'a migration exactly one tick BELOW the floor and unrecorded is stranded',
    args: ['20260610999999', false, '20260611000000'],
    want: 'stranded',
  },
  {
    name: 'recordedness beats the floor in BOTH directions — on the floor and recorded is still phantom',
    args: ['20260611000000', true, '20260611000000'],
    want: 'phantom',
  },
];

function selfTest() {
  let failed = 0;
  for (const t of SELF_TESTS) {
    const o = claimedObjects(t.sql);
    const d = droppedObjects(t.sql);
    const ok = t.expect(o, d);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        got claimed: ${JSON.stringify(o)}\n        got dropped: ${JSON.stringify(d)}`); }
  }
  for (const t of CLASSIFY_TESTS) {
    const got = classify(...t.args);
    const ok = got === t.want;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        want ${t.want}, got ${got}`); }
  }
  const total = SELF_TESTS.length + CLASSIFY_TESTS.length;
  console.log(`\n  ${total - failed}/${total} self-tests pass`);
  process.exit(failed ? 1 : 0);
}

// Everything below is CLI behaviour, and it must not run on import.
// `check-phantom-relations.mjs` reuses `claimedObjects` from this module so that
// the two gates share ONE parser for the CREATE-TABLE grammar; without this
// guard that import executed this file's main, ran these self-tests, and called
// process.exit before the importing gate had done anything at all. Two copies of
// the parser would drift instead, and the drift would land on whichever gate was
// read less.
const INVOKED_DIRECTLY =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (INVOKED_DIRECTLY) {

if (args.includes('--self-test')) selfTest();

// ---- live mode ----
const stateArg = args.find((a) => a.startsWith('--db-state='));
const roots = args.filter((a) => !a.startsWith('--'));

if (!stateArg || !roots.length) {
  console.error('usage: check-phantom-migrations.mjs --db-state=<json> <migrations-dir...> [--self-test]');
  console.error('  the JSON must hold { applied: [version...], tables: [...], functions: [...], columns: [...] }');
  process.exit(2);
}

const statePath = stateArg.split('=')[1];
if (!existsSync(statePath)) {
  console.error(`  db-state file not found: ${statePath}`);
  process.exit(2);
}
const state = JSON.parse(readFileSync(statePath, 'utf8'));
const applied = new Set(state.applied || []);
const have = {
  tables: new Set((state.tables || []).map((s) => s.toLowerCase())),
  functions: new Set((state.functions || []).map((s) => s.toLowerCase())),
  columns: new Set((state.columns || []).map((s) => s.toLowerCase())),
};

// Positive control: the state file must describe a real database, not an empty
// one. An empty state would make every recorded migration look like a phantom,
// or — worse, if the applied list were also empty — make everything look fine.
if (have.tables.size < 50 || applied.size < 100) {
  console.error(`  POSITIVE CONTROL FAILED: db-state describes ${have.tables.size} table(s) and ${applied.size} applied migration(s).`);
  console.error('  That is not a populated database. A phantom scan against an empty state is meaningless,');
  console.error('  not clean. Fix the state query before reading the findings.');
  process.exit(3);
}

/**
 * Every object dropped by a migration at or after `from`, pooled across EVERY
 * root and their subdirectories.
 *
 * Two deliberate widenings over the original per-root, top-level-only scan,
 * both forced by the same false positive:
 *
 *  1. ACROSS ROOTS. All seven migration trees apply to ONE shared database
 *     (tuybltdrdefjblnplpqo). An object created by BSU and dropped by crm7 is
 *     genuinely gone. Scoping drops per-root meant the gate could only explain
 *     an absence using the tree that created it, which is not how the estate
 *     actually applies migrations.
 *  2. INTO SUBDIRECTORIES. `crm7/supabase/migrations/archive/` holds migrations
 *     that RAN — 20260807072000 is in the ledger — and were filed away
 *     afterwards. Their drops are real events against the shared database even
 *     though the files are archived.
 *
 * CLAIMS are still read only from each root's top level. The asymmetry is the
 * point: an archived migration's DROP still happened, but an archived
 * migration's CREATE should not be demanded of the live catalog — archiving is
 * how this estate retires superseded work.
 */
let dropIndex = null;
function sqlFilesRecursive(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...sqlFilesRecursive(join(dir, e.name)));
    else if (e.name.endsWith('.sql')) out.push(join(dir, e.name));
  }
  return out;
}
function droppedAtOrAfter(from) {
  if (!dropIndex) {
    dropIndex = [];
    for (const root of roots) {
      if (!existsSync(root)) continue;
      for (const p of sqlFilesRecursive(root)) {
        const v = (p.split('/').pop().match(/^(\d{14})/) || [])[1];
        if (!v) continue;
        dropIndex.push({ v, d: droppedObjects(readFileSync(p, 'utf8')) });
      }
    }
  }
  const out = { tables: new Set(), functions: new Set(), columns: new Set() };
  for (const { v, d } of dropIndex) {
    if (v < from) continue;
    d.tables.forEach((x) => out.tables.add(x));
    d.functions.forEach((x) => out.functions.add(x));
    d.columns.forEach((x) => out.columns.add(x));
  }
  return out;
}

/**
 * Objects that an UNRECORDED migration AT OR ABOVE the floor claims to create —
 * i.e. work that is in the tree and will run on the next apply.
 *
 * WHY THIS EXISTS: without it this gate deadlocks the very PR that fixes a
 * phantom. The remedy for a phantom is a forward migration above the ledger
 * high-water mark (a replay is impossible — the version is recorded). That
 * forward migration is, by definition, not yet applied when CI runs on its own
 * PR. So the gate would report the phantom, fail the required check, block the
 * merge, and thereby prevent the apply that clears it. The estate has been
 * deadlocked by paired rules before; this one would deadlock on itself.
 *
 * A phantom whose objects are created by a pending forward migration is
 * therefore reported as PENDING FIX and does not fail the job. It still fails
 * if nothing in the tree will create it — which is the case this gate exists
 * for. Below-floor unrecorded files are excluded: the applier will never run
 * them, so they can never fix anything.
 */
let pendingCreates = null;
function pendingFix() {
  if (!pendingCreates) {
    pendingCreates = { tables: new Set(), functions: new Set(), columns: new Set() };
    for (const root of roots) {
      if (!existsSync(root)) continue;
      for (const f of readdirSync(root).filter((n) => n.endsWith('.sql')).sort()) {
        const v = (f.match(/^(\d{14})/) || [])[1];
        if (!v || v < FLOOR || applied.has(v)) continue;
        const o = claimedObjects(readFileSync(join(root, f), 'utf8'));
        o.tables.forEach((x) => pendingCreates.tables.add(x));
        o.functions.forEach((x) => pendingCreates.functions.add(x));
        o.columns.forEach((x) => pendingCreates.columns.add(x));
      }
    }
  }
  return pendingCreates;
}

const findings = [];
const pending = [];
const stranded = [];
let examined = 0, examinedBelowFloor = 0, notRecorded = 0, strandedFiles = 0;

for (const root of roots) {
  if (!existsSync(root)) { console.log(`  ${root}: MISSING — not scanned`); continue; }
  for (const f of readdirSync(root).filter((n) => n.endsWith('.sql')).sort()) {
    const version = (f.match(/^(\d{14})/) || [])[1];
    if (!version) continue;

    // THE FLOOR GATES THE UNRECORDED BRANCH ONLY. See the header. A recorded
    // version is scanned wherever it sits — that is the whole fix. Routed
    // through the exported, self-tested `classify` so the logic the CLI runs is
    // the same logic --self-test asserts, in both directions.
    const route = classify(version, applied.has(version), FLOOR);

    if (route !== 'phantom') {
      if (route === 'lag') { notRecorded++; continue; }
      // Below the floor AND never recorded: the applier skips it by version and
      // nothing else will ever pick it up, so whatever it claims is permanently
      // absent. Not a phantom (the ledger never said it ran) — a DIFFERENT
      // defect, reported separately so it cannot hide inside the phantom count.
      strandedFiles++;
      const o = claimedObjects(readFileSync(join(root, f), 'utf8'));
      const gone = droppedAtOrAfter(version);
      for (const t of o.tables) if (!have.tables.has(t) && !gone.tables.has(t)) stranded.push({ version, file: f, kind: 'table', name: t });
      for (const fn of o.functions) if (!have.functions.has(fn) && !gone.functions.has(fn)) stranded.push({ version, file: f, kind: 'function', name: fn });
      for (const c of o.columns) if (!have.columns.has(c) && !gone.columns.has(c)) stranded.push({ version, file: f, kind: 'column', name: c });
      continue;
    }

    examined++;
    if (version < FLOOR) examinedBelowFloor++;
    const o = claimedObjects(readFileSync(join(root, f), 'utf8'));
    // Subtract anything dropped by THIS migration or any LATER one. An object
    // legitimately removed after it was created is not a phantom.
    const gone = droppedAtOrAfter(version);
    const fix = pendingFix();
    const bucket = (kind, name, has, willBeMade) =>
      (has ? null : (willBeMade ? pending : findings).push({ version, file: f, kind, name }));
    for (const t of o.tables) if (!gone.tables.has(t)) bucket('table', t, have.tables.has(t), fix.tables.has(t));
    for (const fn of o.functions) if (!gone.functions.has(fn)) bucket('function', fn, have.functions.has(fn), fix.functions.has(fn));
    for (const c of o.columns) if (!gone.columns.has(c)) bucket('column', c, have.columns.has(c), fix.columns.has(c));
    for (const t of (o.indexedTables || [])) if (!gone.tables.has(t)) bucket('indexed table', t, have.tables.has(t), fix.tables.has(t));
  }
}

for (const x of findings) {
  console.log(`  PHANTOM  ${x.version}  ${x.kind} ${x.name} is CLAIMED by ${x.file}, RECORDED as applied, and DOES NOT EXIST`);
}
for (const x of pending) {
  console.log(`  PENDING FIX  ${x.version}  ${x.kind} ${x.name} is CLAIMED by ${x.file}, RECORDED as applied, DOES NOT EXIST — but a pending forward migration creates it`);
}
for (const x of stranded) {
  console.log(`  STRANDED ${x.version}  ${x.kind} ${x.name} is CLAIMED by ${x.file}, is NOT recorded, sits BELOW floor ${FLOOR}, and DOES NOT EXIST — the applier will never run it`);
}
console.log(`\n  examined ${examined} recorded migration(s) — ${examinedBelowFloor} of them below floor ${FLOOR}`);
console.log(`  ${notRecorded} at-or-above floor not yet recorded (that is schema-lag's job, not this gate's)`);
console.log(`  ${strandedFiles} below-floor unrecorded file(s) scanned for the stranded class`);
console.log(`  ${findings.length} phantom(s), ${pending.length} pending-fix object(s), ${stranded.length} stranded object(s)`);

// POSITIVE CONTROL. A scan that examines nothing also reports zero phantoms, and
// this gate had no way to tell those apart: `examined 0 ... 0 phantom(s)` exits 0
// and reads, in a green check mark, exactly like a clean estate. The likeliest
// cause is an unpopulated submodule checkout — an empty directory produces a
// confident pass — and the second likeliest is a --db-state JSON that came back
// empty because the query failed.
//
// Mirrors --require-fields in check-required-field-markers.mjs, which exists for
// the same reason and is wired at 150.
const floorArg = args.find((a) => a.startsWith('--require-examined='));
if (floorArg) {
  const floor = Number(floorArg.split('=')[1]);
  if (!Number.isFinite(floor)) {
    console.error(`  --require-examined needs a number, got "${floorArg.split('=')[1]}"`);
    process.exit(2);
  }
  if (examined < floor) {
    console.error(
      `\n  POSITIVE CONTROL FAILED: examined ${examined} recorded migration(s), expected at least ${floor}.`,
    );
    console.error('  Either the migration trees did not populate, or --db-state carried no applied');
    console.error('  versions. A clean result here would be meaningless, not clean — nothing was');
    console.error('  actually compared. Fix the input before reading the findings above.');
    process.exit(3);
  }
  console.log(`  positive control: ${examined} >= ${floor} recorded migration(s) — the comparison really ran`);
}

// POSITIVE CONTROL FOR THE FLOOR FIX ITSELF. The whole point of the change is
// that recorded below-floor migrations get scanned. If that number is 0, either
// the trees regressed or someone raised MIGRATION_FLOOR past every recorded
// file — and in both cases the blind spot is back while the gate still prints
// green. Measured 2026-08-31: 12 across all seven roots.
const belowFloorArg = args.find((a) => a.startsWith('--require-examined-below-floor='));
if (belowFloorArg) {
  const need = Number(belowFloorArg.split('=')[1]);
  if (!Number.isFinite(need)) {
    console.error(`  --require-examined-below-floor needs a number, got "${belowFloorArg.split('=')[1]}"`);
    process.exit(2);
  }
  if (examinedBelowFloor < need) {
    console.error(
      `\n  POSITIVE CONTROL FAILED: examined ${examinedBelowFloor} recorded migration(s) below floor ${FLOOR}, expected at least ${need}.`,
    );
    console.error('  The floor blind spot this gate was fixed to close is open again. A clean result');
    console.error('  here would be the same false green that hid 20260506000000 for four months.');
    process.exit(3);
  }
  console.log(`  positive control: ${examinedBelowFloor} >= ${need} recorded below-floor migration(s) — the blind spot is still covered`);
}

if (pending.length) {
  console.log('\n  the PENDING FIX object(s) above are REPORTED, not failed: the tree already');
  console.log('  carries an unapplied forward migration that creates them. Failing here would');
  console.log('  block the merge that applies the fix, and the phantom could never clear.');
}
if (stranded.length && !args.includes('--fail-on-stranded')) {
  console.log('\n  the stranded object(s) above are REPORTED, not failed. They are not phantoms —');
  console.log('  the ledger never claimed they ran. Pass --fail-on-stranded to enforce.');
}

process.exit(findings.length || (stranded.length && args.includes('--fail-on-stranded')) ? 1 : 0);

} // end INVOKED_DIRECTLY
