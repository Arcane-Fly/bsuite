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
 * simply a pending migration, which is the schema-lag gate's job. And it
 * ignores anything below the floor, because the applier ignores it too:
 * measured 2026-08-21, all 81 "pending" migrations predate
 * MIGRATION_FLOOR=20260611000000 and ZERO are genuinely unapplied. Reporting
 * those as phantoms would bury the real ones under 81 false alarms.
 */

import { readFileSync, existsSync } from 'node:fs';

const FLOOR = process.env.MIGRATION_FLOOR || '20260611000000';
const args = process.argv.slice(2);

/** Objects a migration file claims to create. */
export function claimedObjects(sql) {
  const out = { tables: [], functions: [], columns: [], indexedTables: [] };
  // Strip line comments so prose describing a CREATE TABLE is not read as one.
  // A comment mentioning a table name has bitten this estate repeatedly.
  const code = sql.replace(/--[^\n]*/g, '');

  for (const m of code.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_]+\.)?([a-z_][a-z0-9_]*)/gi)) {
    out.tables.push(`${(m[1] || 'public.').toLowerCase()}${m[2].toLowerCase()}`);
  }
  for (const m of code.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-z_]+\.)?([a-z_][a-z0-9_]*)\s*\(/gi)) {
    const schema = (m[1] || 'public.').toLowerCase();
    // pg_temp objects live for the session that made them and are GONE by
    // definition. A migration that builds a scratch helper there is correct.
    if (schema === 'pg_temp.') continue;
    out.functions.push(`${schema}${m[2].toLowerCase()}`);
  }
  // A CREATE INDEX names a table too, and an index on a missing table is the
  // same defect. The first version of this gate missed
  // idx_host_employers_xero_contact_id sitting two lines below the ALTER it
  // DID catch -- the file had TWO statements against a table that does not
  // exist and the gate reported one.
  for (const m of code.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?[a-z_][a-z0-9_]*\s+ON\s+(?:ONLY\s+)?([a-z_]+\.)?([a-z_][a-z0-9_]*)/gi)) {
    const t = `${(m[1] || 'public.').toLowerCase()}${m[2].toLowerCase()}`;
    if (!out.tables.includes(t)) out.indexedTables.push(t);
  }
  for (const m of code.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_]+\.)?([a-z_][a-z0-9_]*)([\s\S]*?);/gi)) {
    const table = `${(m[1] || 'public.').toLowerCase()}${m[2].toLowerCase()}`;
    for (const c of m[3].matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi)) {
      out.columns.push(`${table}.${c[1].toLowerCase()}`);
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
  for (const m of code.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_]+\.)?([a-z_][a-z0-9_]*)/gi))
    out.tables.push(`${(m[1] || 'public.').toLowerCase()}${m[2].toLowerCase()}`);
  for (const m of code.matchAll(/DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?([a-z_]+\.)?([a-z_][a-z0-9_]*)/gi))
    out.functions.push(`${(m[1] || 'public.').toLowerCase()}${m[2].toLowerCase()}`);
  for (const m of code.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_]+\.)?([a-z_][a-z0-9_]*)([\s\S]*?);/gi)) {
    const table = `${(m[1] || 'public.').toLowerCase()}${m[2].toLowerCase()}`;
    for (const c of m[3].matchAll(/DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi))
      out.columns.push(`${table}.${c[1].toLowerCase()}`);
    // A RENAMED column is not missing -- it exists under the new name. Counting
    // the old name as a phantom flagged training_plans.qualification_id_uuid,
    // which the same migration adds and then renames.
    for (const c of m[3].matchAll(/RENAME\s+COLUMN\s+([a-z_][a-z0-9_]*)\s+TO\s+([a-z_][a-z0-9_]*)/gi)) {
      out.columns.push(`${table}.${c[1].toLowerCase()}`);
      out.columns.push(`${table}.${c[2].toLowerCase()}`);
    }
  }
  return out;
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
];

function selfTest() {
  let failed = 0;
  for (const t of SELF_TESTS) {
    const o = claimedObjects(t.sql);
    const d = droppedObjects(t.sql);
    const ok = t.expect(o, d);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        got: ${JSON.stringify(o)}`); }
  }
  console.log(`\n  ${SELF_TESTS.length - failed}/${SELF_TESTS.length} self-tests pass`);
  process.exit(failed ? 1 : 0);
}

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

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Every object dropped by a migration at or after `from`, cached per directory. */
const dropCache = new Map();
function droppedAtOrAfter(root, from) {
  if (!dropCache.has(root)) {
    const per = [];
    for (const f of readdirSync(root).filter((n) => n.endsWith('.sql')).sort()) {
      const v = (f.match(/^(\d{14})/) || [])[1];
      if (!v) continue;
      per.push({ v, d: droppedObjects(readFileSync(join(root, f), 'utf8')) });
    }
    dropCache.set(root, per);
  }
  const out = { tables: new Set(), functions: new Set(), columns: new Set() };
  for (const { v, d } of dropCache.get(root)) {
    if (v < from) continue;
    d.tables.forEach((x) => out.tables.add(x));
    d.functions.forEach((x) => out.functions.add(x));
    d.columns.forEach((x) => out.columns.add(x));
  }
  return out;
}

const findings = [];
let examined = 0, skippedBelowFloor = 0, notRecorded = 0;

for (const root of roots) {
  if (!existsSync(root)) { console.log(`  ${root}: MISSING — not scanned`); continue; }
  for (const f of readdirSync(root).filter((n) => n.endsWith('.sql')).sort()) {
    const version = (f.match(/^(\d{14})/) || [])[1];
    if (!version) continue;
    if (version < FLOOR) { skippedBelowFloor++; continue; }
    if (!applied.has(version)) { notRecorded++; continue; }
    examined++;
    const o = claimedObjects(readFileSync(join(root, f), 'utf8'));
    // Subtract anything dropped by THIS migration or any LATER one. An object
    // legitimately removed after it was created is not a phantom.
    const gone = droppedAtOrAfter(root, version);
    for (const t of o.tables) if (!have.tables.has(t) && !gone.tables.has(t)) findings.push({ version, file: f, kind: 'table', name: t });
    for (const fn of o.functions) if (!have.functions.has(fn) && !gone.functions.has(fn)) findings.push({ version, file: f, kind: 'function', name: fn });
    for (const c of o.columns) if (!have.columns.has(c) && !gone.columns.has(c)) findings.push({ version, file: f, kind: 'column', name: c });
    for (const t of (o.indexedTables || [])) if (!have.tables.has(t) && !gone.tables.has(t)) findings.push({ version, file: f, kind: 'indexed table', name: t });
  }
}

for (const x of findings) {
  console.log(`  PHANTOM  ${x.version}  ${x.kind} ${x.name} is CLAIMED by ${x.file}, RECORDED as applied, and DOES NOT EXIST`);
}
console.log(`\n  examined ${examined} recorded migration(s) at or above floor ${FLOOR}`);
console.log(`  ${skippedBelowFloor} below the floor (the applier ignores them too), ${notRecorded} not yet recorded (that is schema-lag's job, not this gate's)`);
console.log(`  ${findings.length} phantom(s)`);
process.exit(findings.length ? 1 : 0);
