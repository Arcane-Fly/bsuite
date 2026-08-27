#!/usr/bin/env node
/**
 * set-dod-status — write a Definition-of-Done verdict back to the feature index.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The universal contract says: "When a gate returns APPROVE, write `dod_status` back to
 * the row with the evidence pointer — a verdict that lives only in a chat transcript is
 * not a verdict."
 *
 * There was no way to do that. `estate-align.mjs` READS `dod_status` — it validates the
 * state and refuses an `approved` with no evidence — but it has no write path, and
 * neither did anything else. Measured 2026-08-27: all **659** rows read `not-evaluated`,
 * and estate-align says so in its own output: *"every feature is not-evaluated. The gate
 * has never been run against this index."*
 *
 * That is the same shape as ADR-0010 citing `bsuite_feature_index.sibling_class` as its
 * enforcement while nothing read the field: a rule with no mechanism. The rule was right.
 * The mechanism was missing. This is the mechanism.
 *
 * WHAT IT REFUSES, AND WHY EACH ONE MATTERS
 * ─────────────────────────────────────────
 *   - an unknown feature id            — a verdict on a row that does not exist is lost
 *   - a state outside the known set    — estate-align's check C would then fail the tree
 *   - `approved` with no evidence      — "an APPROVE nobody can check is a claim, not a
 *                                        verdict", which is check C's own wording
 *   - a formatting change              — the write is asserted to round-trip byte-for-byte
 *                                        before it touches disk (see below)
 *
 * THE FORMATTING ASSERTION IS NOT PARANOIA
 * ────────────────────────────────────────
 * The index is 1.5 MB and 54,000 lines, serialised with ONE-space indent and non-ASCII
 * escaped. A naive `JSON.stringify(d, null, 2)` re-writes every line — a one-field change
 * becomes a 1.7 MB diff that no reviewer can read and that conflicts with every other
 * lane touching the file. So the exact serialisation is reproduced and verified against
 * the bytes on disk before any write is attempted.
 *
 * Usage:
 *   node scripts/set-dod-status.mjs --feature <id> --state <state> [--evidence <ptr>]
 *   node scripts/set-dod-status.mjs --feature a,b,c --state approved --evidence bsuite#123 --apply
 *   node scripts/set-dod-status.mjs --self-test
 *
 * Dry run by default. Pass --apply to write.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = join(ROOT, 'docs/00-roadmap/bsuite-feature-index.json');

/** Must match estate-align.mjs. A state it does not know fails that gate's check C. */
export const DOD_STATES = new Set(['not-evaluated', 'in-progress', 'approved', 'send-back', 'waived']);

/** States that are a CLAIM about finished work, and so must carry something checkable. */
export const STATES_NEEDING_EVIDENCE = new Set(['approved']);

/* The index is serialised with a ONE-space indent and non-ASCII escaped. Reproducing that
 * exactly is what keeps a one-field change to a one-line diff. Verified byte-identical
 * against the file on disk before every write. */
const NON_ASCII = new RegExp('[\\u0080-\\uffff]', 'g');
export function serialise(rows) {
  const escaped = JSON.stringify(rows, null, 1).replace(NON_ASCII, (c) =>
    '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  );
  return escaped + '\n';
}

/**
 * Decide what one row becomes. PURE, so the self-test exercises every refusal without
 * touching the index.
 *
 * Returns { ok: true, value } or { ok: false, why }.
 */
export function planVerdict({ row, state, evidence }) {
  if (!row) return { ok: false, why: 'no such feature id in the index' };
  if (!DOD_STATES.has(state)) {
    return { ok: false, why: `state "${state}" is not one of ${[...DOD_STATES].join(', ')}` };
  }
  if (STATES_NEEDING_EVIDENCE.has(state) && !evidence) {
    return { ok: false, why: `state "${state}" must carry --evidence — an APPROVE nobody can check is a claim, not a verdict` };
  }
  // A bare string is the shape the index already uses for `not-evaluated`. Keep it for
  // states that carry nothing, so the diff stays minimal and estate-align's
  // `typeof s === 'string'` branch keeps working.
  const value = evidence ? { state, evidence } : state;
  return { ok: true, value };
}

function selfTest() {
  const cases = [];
  const t = (n, got, want) => cases.push({ n, ok: JSON.stringify(got) === JSON.stringify(want), got, want });
  const row = { id: 'x', dod_status: 'not-evaluated' };

  t('a known state with no evidence becomes a bare string',
    planVerdict({ row, state: 'in-progress' }), { ok: true, value: 'in-progress' });
  t('a state with evidence becomes an object',
    planVerdict({ row, state: 'send-back', evidence: 'bsuite#1' }),
    { ok: true, value: { state: 'send-back', evidence: 'bsuite#1' } });
  t('approved WITH evidence is allowed',
    planVerdict({ row, state: 'approved', evidence: 'bsuite#2' }),
    { ok: true, value: { state: 'approved', evidence: 'bsuite#2' } });
  t('approved WITHOUT evidence is REFUSED',
    planVerdict({ row, state: 'approved' }).ok, false);
  t('an unknown state is REFUSED',
    planVerdict({ row, state: 'done' }).ok, false);
  t('a missing row is REFUSED',
    planVerdict({ row: undefined, state: 'in-progress' }).ok, false);
  t('waived needs no evidence',
    planVerdict({ row, state: 'waived' }), { ok: true, value: 'waived' });

  // The formatting guarantee, exercised against the REAL index rather than a fixture —
  // a round-trip that only works on a toy object proves nothing about the 1.5 MB file.
  if (existsSync(INDEX_PATH)) {
    const raw = readFileSync(INDEX_PATH, 'utf8');
    t('serialise() reproduces the real index byte-for-byte', serialise(JSON.parse(raw)) === raw, true);
  } else {
    console.log('  (index absent — skipping the byte-for-byte serialisation case)');
  }

  const bad = cases.filter((c) => !c.ok);
  for (const b of bad) console.error(`FAIL ${b.n}: expected ${JSON.stringify(b.want)}, got ${JSON.stringify(b.got)}`);
  console.log(`\nset-dod-status self-test: ${cases.length - bad.length}/${cases.length} pass`);
  return bad.length ? 1 : 0;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const apply = process.argv.includes('--apply');
const featureArg = arg('feature');
const state = arg('state');
const evidence = arg('evidence');

if (!featureArg || !state) {
  console.error('usage: set-dod-status.mjs --feature <id[,id...]> --state <state> [--evidence <ptr>] [--apply]');
  console.error(`states: ${[...DOD_STATES].join(' | ')}`);
  process.exit(2);
}

if (!existsSync(INDEX_PATH)) {
  console.error(`HARNESS-FAIL: no feature index at ${INDEX_PATH}. This is the estate's source of truth; its absence is the finding.`);
  process.exit(2);
}

const raw = readFileSync(INDEX_PATH, 'utf8');
const rows = JSON.parse(raw);

// Prove the serialisation is faithful BEFORE deciding anything. If this fails, the file
// was written by something using different formatting and a write here would reflow it.
if (serialise(rows) !== raw) {
  console.error('REFUSING — this tool cannot reproduce the index byte-for-byte.');
  console.error('Writing would reflow all 54,000 lines and turn a one-field change into an');
  console.error('unreadable diff that conflicts with every other lane touching this file.');
  console.error('Fix serialise() to match how the index is currently written, then re-run.');
  process.exit(2);
}

const ids = featureArg.split(',').map((s) => s.trim()).filter(Boolean);
const byId = new Map(rows.map((r) => [r.id, r]));

const plans = ids.map((id) => ({ id, row: byId.get(id), ...planVerdict({ row: byId.get(id), state, evidence }) }));
const refused = plans.filter((p) => !p.ok);

console.log(`set-dod-status: ${ids.length} feature(s), state="${state}"${evidence ? `, evidence="${evidence}"` : ''}\n`);
for (const p of plans) {
  const before = JSON.stringify(p.row ? p.row.dod_status : undefined);
  if (!p.ok) console.log(`  REFUSED  ${p.id}  — ${p.why}`);
  else console.log(`  ${apply ? 'SET     ' : 'would set'} ${p.id}  ${before} -> ${JSON.stringify(p.value)}`);
}

if (refused.length > 0) {
  console.error(`\n  ${refused.length} of ${ids.length} refused. NOTHING was written — the whole set is applied or none of it is.`);
  console.error('  A partial write leaves the index in a state nobody intended and nobody can see.');
  process.exit(1);
}

if (!apply) {
  console.log('\n  DRY RUN — pass --apply to write.');
  process.exit(0);
}

for (const p of plans) p.row.dod_status = p.value;

const out = serialise(rows);
writeFileSync(INDEX_PATH, out, 'utf8');

// Read back. A write that reports success without re-reading is the class of claim this
// whole tool exists to stop being made.
const check = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
const checkById = new Map(check.map((r) => [r.id, r]));
const wrong = plans.filter((p) => JSON.stringify(checkById.get(p.id)?.dod_status) !== JSON.stringify(p.value));
if (wrong.length > 0) {
  console.error(`\n  WROTE BUT READ BACK WRONG for ${wrong.length} row(s): ${wrong.map((w) => w.id).join(', ')}`);
  process.exit(1);
}

console.log(`\n  wrote ${plans.length} verdict(s) and read them back. ${rows.length} rows, ${out.length} bytes.`);
console.log('  Reconcile with: node scripts/estate-align.mjs --strict');
