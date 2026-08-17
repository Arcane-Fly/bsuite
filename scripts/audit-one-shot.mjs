#!/usr/bin/env node
/**
 * O1 — ENFORCE the one-shot / DRY entity-ownership policy.
 *
 * The policy has been DOCUMENTED since 2026-02-27 and enforced by nothing:
 *   docs/20260227-dry-one-shot-architecture-v1.04A.md §1
 *   "Every entity has exactly one owning app that provides the create/edit UI.
 *    Other apps may READ the entity but NEVER create or edit it independently."
 *
 * A documented rule with no gate is a suggestion. This is the gate.
 *
 * IT READS THE DOC, IT DOES NOT RESTATE IT.
 * The ownership map is parsed out of the markdown table at runtime, so the gate
 * cannot drift from the policy. Restating the table here would create a second
 * source of truth — the exact defect this whole programme keeps hitting (the
 * theme contract's header said errors were purple while its body said red, and
 * four apps followed the header).
 *
 * WHAT COUNTS AS A VIOLATION
 * A write — .insert(), .update(), .upsert(), .delete() — against a table the
 * app does not own. Reads are explicitly fine and are the whole point.
 *
 * WHAT IS DELIBERATELY NOT A VIOLATION
 *   · Reads (.select) — the policy exists to make these easy.
 *   · The owning app writing its own table.
 *   · Edge functions and migrations — server-side, not the create/edit UI the
 *     policy governs, and they legitimately cross domains.
 *   · Tests and mocks.
 *   · A line carrying `one-shot-ok: <reason>` on it or in the 12 lines above,
 *     for the lifecycle-handover exception the doc approves in §1 (a Conduit
 *     candidate becoming a CRM7 apprentice takes an immutable copy — that is a
 *     migration, not a mirror).
 *
 * Usage: scripts/audit-one-shot.mjs [--list]
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DOC = 'docs/20260227-dry-one-shot-architecture-v1.04A.md';
const MARKER = 'one-shot-ok';

// Doc app names -> repo directory names.
const APP_DIR = {
  CRM7: 'crm7', R8: 'R80.4', BSU: 'business-suite-unified',
  Throughput: 'throughput', Conduit: 'conduit', braden: 'braden',
};

if (!existsSync(DOC)) { console.error(`policy doc missing: ${DOC}`); process.exit(2); }

// ── parse the ownership table OUT OF THE DOC ────────────────────────────────
const owners = new Map();   // table -> Set(owner dirs)
for (const line of readFileSync(DOC, 'utf8').split('\n')) {
  if (!line.startsWith('|') || !line.includes('`')) continue;
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length < 6) continue;
  const ownerCell = cells[2];
  const tableCell = cells[5];
  const tables = [...tableCell.matchAll(/`([a-z0-9_.]+)`/g)].map((m) => m[1])
    .filter((t) => !t.startsWith('auth.'));           // auth.users is not ours to write
  if (!tables.length) continue;
  const dirs = Object.entries(APP_DIR)
    .filter(([docName]) => new RegExp(`\\b${docName}\\b`, 'i').test(ownerCell))
    .map(([, dir]) => dir);
  if (!dirs.length) continue;
  for (const t of tables) {
    if (!owners.has(t)) owners.set(t, new Set());
    dirs.forEach((d) => owners.get(t).add(d));
  }
}

if (!owners.size) { console.error(`parsed 0 entities from ${DOC} — table format changed?`); process.exit(2); }

const APPS = ['crm7', 'conduit', 'business-suite-unified', 'R80.4', 'throughput', 'braden'];
// The write must be in the SAME chained expression as the .from(). A loose
// [\s\S]{0,400} window spans STATEMENTS and manufactures violations: it matched
// `.from('user_tenants').select(...)` — a READ, explicitly allowed — against an
// unrelated `.insert(` further down the file. Reads are the entire point of the
// policy, so a gate that flags them is worse than no gate.
// The gap therefore may not contain a statement terminator, another .from(), or
// a .select() — any of those means the chain ended and this is a different call.
const WRITE = /\.from\(\s*['"`]([a-z0-9_]+)['"`]\s*\)((?:(?![;{}]|\.from\(|\.select\()[\s\S]){0,200}?)\.(insert|update|upsert|delete)\s*\(/g;

let total = 0;
const perApp = {};
const hits = [];

for (const app of APPS) {
  perApp[app] = 0;
  let files = [];
  try {
    files = execFileSync('grep', ['-rl', '--include=*.ts', '--include=*.tsx', '.from(', `${app}/src`],
      { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch { continue; }

  for (const f of files) {
    // Server-side and test code are out of scope — the policy governs the
    // create/edit UI, not migrations or edge functions.
    if (/\.(test|spec)\.|__tests__|__mocks__|\/supabase\/functions\//.test(f)) continue;
    const src = readFileSync(f, 'utf8');
    const lines = src.split('\n');
    for (const m of src.matchAll(WRITE)) {
      const table = m[1];
      const own = owners.get(table);
      if (!own || own.has(app)) continue;             // unknown table, or this app owns it
      const lineNo = src.slice(0, m.index).split('\n').length;
      const ctx = lines.slice(Math.max(0, lineNo - 13), lineNo).join('\n');
      if (ctx.includes(MARKER)) continue;             // documented lifecycle handover
      total++; perApp[app]++;
      hits.push(`  ${f}:${lineNo}  ${m[3]} on \`${table}\` — owned by ${[...own].join('/')}`);
    }
  }
}

console.log();
console.log(`ONE-SHOT ENTITY OWNERSHIP  (${owners.size} entities parsed from ${DOC})`);
console.log('─'.repeat(64));
for (const a of APPS) console.log(`  ${a.padEnd(26)} ${perApp[a] ?? 0}`);
console.log();
console.log(`TOTAL cross-app writes: ${total}`);
if (process.argv.includes('--list') && hits.length) { console.log(); hits.forEach((h) => console.log(h)); }
console.log();
if (total > 0) {
  console.log('An app writing a table it does not own has forked the entity.');
  console.log('Fix by linking to the owning app\'s form, or selecting the existing record.');
  console.log(`If it is the approved lifecycle handover (§1), annotate with '${MARKER}: <reason>'.`);
  console.log('Run with --list to see every site.');
  process.exit(1);
}
console.log('OK: no app writes an entity another app owns.');
