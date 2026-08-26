#!/usr/bin/env node
/**
 * check-doc-classification.mjs — every doc declares WHAT IT IS and WHAT PROVES IT.
 *
 * WHY THIS EXISTS
 *
 * Measured 2026-08-22: 463 docs, 158 gates, and 34 docs citing a gate. Docs assert
 * things; gates measure reality; almost nothing binds the two. "What is actually
 * finished?" cost a full session to answer and came back ZERO.
 *
 * And one directory holds knowledge with FOUR DIFFERENT AUTHORITIES. 38 docs touch
 * Fair Work awards, 74 touch the D2C theme, and they share a filename shape. An agent
 * cannot tell which it may edit. Editing an award to make a test pass is a compliance
 * event, not a tidy-up.
 *
 * THE RATCHET, and why it is not a mass migration
 *
 * A big-bang rename was attempted for doc NAMING and reverted: 51 files across six
 * submodules, including applied migrations and pgTAP tests citing doc paths in
 * comments. Those are historical records. So this gate:
 *
 *   - enforces on CHANGED files only
 *   - holds a committed BASELINE of the unclassified count
 *   - fails if that count RISES
 *
 * Debt shrinks or holds. It cannot expand. Backfill is opportunistic, never a sweep.
 *
 * Standard: docs/20260822-knowledge-classification-standard-v1.00A.md
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { isNavigational } from './lib/doc-conventions.mjs';

const KINDS = ['law', 'obligation', 'decision', 'standard', 'plan', 'record'];
const AUTHORITIES = ['external', 'operator', 'engineering', 'none'];
/** Received knowledge goes stale silently, so it must carry an expiry. */
const NEEDS_REVIEW_BY = ['law', 'obligation'];
/** A claim about our own work is only checkable if it names its proof. */
const NEEDS_EVIDENCE = ['plan', 'standard'];

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const body = text.slice(4, end);
  const out = {};
  let listKey = null;
  for (const raw of body.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { (out[listKey] ||= []).push(item[1].trim()); continue; }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    listKey = null;
    if (kv[2] === '') { listKey = kv[1]; out[kv[1]] = []; }
    else out[kv[1]] = kv[2].trim();
  }
  return out;
}

export function validate(fm) {
  const errs = [];
  if (!fm) return ['no YAML frontmatter — the doc does not declare what it is'];
  if (!fm.kind) errs.push('missing `kind`');
  else if (!KINDS.includes(fm.kind)) errs.push(`kind "${fm.kind}" is not one of ${KINDS.join('|')}`);
  if (!fm.authority) errs.push('missing `authority`');
  else if (!AUTHORITIES.includes(fm.authority)) errs.push(`authority "${fm.authority}" is not one of ${AUTHORITIES.join('|')}`);
  if (!fm.owner) errs.push('missing `owner` — a doc nobody answers for is a doc nobody maintains');
  if (fm.kind && NEEDS_REVIEW_BY.includes(fm.kind) && !fm.review_by)
    errs.push(`kind "${fm.kind}" is RECEIVED knowledge and must carry \`review_by\` — a mirror with no expiry looks current forever`);
  if (fm.kind && NEEDS_EVIDENCE.includes(fm.kind) && (!fm.evidence || !fm.evidence.length))
    errs.push(`kind "${fm.kind}" must name its \`evidence\` — without it the doc can never be shown complete`);
  // authority/kind coherence: external law is never ours to change
  if (fm.kind === 'law' && fm.authority !== 'external')
    errs.push('kind `law` must have authority `external` — we mirror instruments, we do not own them');
  if (fm.kind === 'record' && fm.authority !== 'none')
    errs.push('kind `record` must have authority `none` — a dated record is history, not a live document');
  return errs;
}

const SELF_TESTS = [
  { n: 'a doc with no frontmatter fails', t: '# Title\n', e: (r) => r.length === 1 },
  { n: 'a complete standard passes',
    t: '---\nkind: standard\nauthority: engineering\nowner: bsuite\nevidence:\n  - scripts/x.mjs\n---\n',
    e: (r) => r.length === 0 },
  { n: 'a plan with NO evidence fails — this is the whole point',
    t: '---\nkind: plan\nauthority: engineering\nowner: bsuite\n---\n',
    e: (r) => r.some((x) => x.includes('evidence')) },
  { n: 'law without review_by fails — a mirror with no expiry looks current forever',
    t: '---\nkind: law\nauthority: external\nowner: r8\n---\n',
    e: (r) => r.some((x) => x.includes('review_by')) },
  { n: 'law claiming engineering authority fails',
    t: '---\nkind: law\nauthority: engineering\nowner: r8\nreview_by: 2026-12-01\n---\n',
    e: (r) => r.some((x) => x.includes('mirror instruments')) },
  { n: 'record must be authority none',
    t: '---\nkind: record\nauthority: operator\nowner: bsuite\n---\n',
    e: (r) => r.some((x) => x.includes('history')) },
  { n: 'an unknown kind is rejected, not silently accepted',
    t: '---\nkind: notes\nauthority: engineering\nowner: bsuite\n---\n',
    e: (r) => r.some((x) => x.includes('not one of')) },
  { n: 'owner is required — a doc nobody answers for is unmaintained',
    t: '---\nkind: record\nauthority: none\n---\n',
    e: (r) => r.some((x) => x.includes('owner')) },
  { n: 'evidence parses as a list, not a string',
    t: '---\nkind: plan\nauthority: engineering\nowner: b\nevidence:\n  - a.mjs\n  - b.yml\n---\n',
    e: (r, fm) => Array.isArray(fm.evidence) && fm.evidence.length === 2 },
];

if (process.argv.includes('--self-test')) {
  let bad = 0;
  for (const t of SELF_TESTS) {
    const fm = parseFrontmatter(t.t);
    const r = validate(fm);
    const ok = t.e(r, fm || {});
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.n}`);
    if (!ok) { bad++; console.log(`        got: ${JSON.stringify(r)}`); }
  }
  console.log(`\n  ${SELF_TESTS.length - bad}/${SELF_TESTS.length} self-tests pass`);
  process.exit(bad ? 1 : 0);
}

const BASELINE = 'docs/.classification-baseline';
const args = process.argv.slice(2);
const changed = args.filter((a) => !a.startsWith('--'));

function walk(d, out = []) {
  if (!existsSync(d)) return out;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'archive') walk(p, out); }
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/* The navigational-file set lives in ONE place — see scripts/lib/doc-conventions.mjs
   for why this is a shared module rather than a copy in each gate. */

const all = walk('docs').filter((p) => !isNavigational(p));
const unclassified = all.filter((p) => !parseFrontmatter(readFileSync(p, 'utf8'))?.kind);

// Positive control: an empty scan would report zero unclassified, which reads as a
// clean estate and is a dead scan.
if (all.length < 20) {
  console.error(`  POSITIVE CONTROL FAILED: only ${all.length} doc(s) found. Run from the parent repo root.`);
  process.exit(3);
}

let failed = false;
const changedDocs = changed.filter((p) => !isNavigational(p));
if (changed.length !== changedDocs.length) {
  console.log(`  ${changed.length - changedDocs.length} navigational file(s) not enforced (README/STATUS/INDEX are indexes, not documents)`);
}
if (changedDocs.length) {
  console.log(`  enforcing on ${changedDocs.length} changed doc(s):\n`);
  for (const p of changedDocs) {
    if (!existsSync(p)) continue;
    const errs = validate(parseFrontmatter(readFileSync(p, 'utf8')));
    if (errs.length) {
      failed = true;
      console.log(`  ${p}`);
      for (const e of errs) console.log(`      ${e}`);
    }
  }
  if (!failed) console.log('  all changed docs classify correctly');
}

const base = existsSync(BASELINE) ? Number(readFileSync(BASELINE, 'utf8').trim()) : null;
console.log(`\n  unclassified: ${unclassified.length} of ${all.length} doc(s)`);
if (base === null) {
  console.log(`  no baseline yet — write ${unclassified.length} to ${BASELINE} to arm the ratchet`);
} else if (unclassified.length > base) {
  /*
   * NAME THE UNTRACKED ONES BEFORE CRYING BROKEN.
   *
   * This walks the working tree, so an unlanded draft from another lane counts
   * toward the debt while CI — which only ever sees committed files — stays
   * green. That has now produced the same false alarm twice, and both times the
   * next person had to stash files, re-run, and reason it out from scratch.
   *
   * The ratchet still FAILS: an uncommitted doc is real debt the moment it
   * lands, and a gate that quietly forgave it would be the vacuous kind. What
   * changes is that the output says WHICH files are untracked and what the
   * count would be without them, so "another lane has drafts open" is
   * distinguishable at a glance from "someone added unclassified debt".
   */
  let untracked = [];
  try {
    untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', 'docs'],
      { encoding: 'utf8' })
      .split('\n').map((l) => l.trim()).filter((l) => l.endsWith('.md'));
  } catch {
    // Not a git checkout, or git is unavailable. Fall through: the ratchet
    // still reports, it just cannot attribute. Never silently pass.
    untracked = [];
  }
  const untrackedUnclassified = unclassified.filter((u) =>
    untracked.includes(typeof u === 'string' ? u : u.path ?? u.file ?? ''));
  console.log(`  RATCHET BROKEN: baseline ${base}, now ${unclassified.length}. Debt may shrink or hold, never rise.`);
  if (untrackedUnclassified.length > 0) {
    const wouldBe = unclassified.length - untrackedUnclassified.length;
    console.log(`\n  ${untrackedUnclassified.length} of those are UNTRACKED — not committed, so CI does not see them:`);
    for (const u of untrackedUnclassified) console.log(`      ${typeof u === 'string' ? u : u.path ?? u.file}`);
    console.log(`  Without them the count is ${wouldBe} against a baseline of ${base}` +
      `${wouldBe <= base ? ' — the COMMITTED tree is within the ratchet.' : '.'}`);
    console.log('  This still fails: an uncommitted doc is debt the moment it lands.');
    console.log('  If they are not yours, ask their author to land them with kind/authority/evidence.');
  }
  failed = true;
} else {
  console.log(`  ratchet ok: baseline ${base}, now ${unclassified.length}${unclassified.length < base ? ` (${base - unclassified.length} paid down — update the baseline)` : ''}`);
  /*
   * THE RATCHET MUST REFUSE BOTH DIRECTIONS, not just upward.
   *
   * A baseline left ABOVE the true count is slack: it silently re-permits
   * exactly as much debt as was just paid off, so the next doc to lose its
   * frontmatter passes unnoticed. That is the estate's own recorded rule —
   * precedent 20260809__two_directional_ratchet — and this gate did not
   * implement its downward half. It reported "ratchet ok" with a baseline
   * seven above the truth.
   *
   * Refusing here costs one line in a commit that already lowered the count,
   * and it is the only moment the slack is visible.
   */
  /* Compare the COMMITTED count. Another lane's untracked drafts inflate the
     local number and would otherwise mask a re-bank that CI, which sees only
     the committed tree, is about to demand. */
  let committed = unclassified.length;
  try {
    const others = execFileSync('git', ['ls-files', '--others', '--exclude-standard', 'docs'],
      { encoding: 'utf8' }).split('\n').filter(Boolean);
    committed -= unclassified.filter((u) =>
      others.includes(typeof u === 'string' ? u : u.path ?? u.file ?? '')).length;
  } catch { /* not a git tree — fall back to the raw count */ }

  if (committed < base) {
    console.log(
      `  RE-BANK REQUIRED: the committed count fell to ${committed} but ${BASELINE} still reads ${base}. ` +
        `A baseline above the truth re-permits the debt you just paid off — write ${committed} to it.`,
    );
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
