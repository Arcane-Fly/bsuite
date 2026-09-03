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

import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { isNavigational, isPointerFile } from './lib/doc-conventions.mjs';

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

/*
 * SCHEDULED-FLOOR self-tests — through the SAME `scheduledFloor()` the live
 * --check-floor path calls, per PI ruling 2026-09-03 (audit §7, C2): 0 weeks
 * equals origin, N weeks subtracts N*per_week, the floor never goes negative,
 * and a missing origin_date must fail rather than pass silently.
 */
const FLOOR_TESTS = [
  { n: 'floor at 0 weeks equals origin', f: () => scheduledFloor({ origin_count: 175, origin_date: '2026-09-03', per_week: 15 }, new Date('2026-09-03T00:00:00Z')) === 175 },
  { n: 'floor after 1 week is origin - per_week', f: () => scheduledFloor({ origin_count: 175, origin_date: '2026-09-03', per_week: 15 }, new Date('2026-09-10T00:00:00Z')) === 160 },
  { n: 'floor after 4 weeks is origin - 4*per_week', f: () => scheduledFloor({ origin_count: 175, origin_date: '2026-09-03', per_week: 15 }, new Date('2026-10-01T00:00:00Z')) === 115 },
  { n: 'floor never goes negative — floors at 0', f: () => scheduledFloor({ origin_count: 175, origin_date: '2026-09-03', per_week: 15 }, new Date('2030-01-01T00:00:00Z')) === 0 },
  { n: 'missing origin_date returns null (caller must treat as FAILURE, never a silent pass)', f: () => scheduledFloor({ origin_count: 175, origin_date: null, per_week: 15 }) === null },
  // THE NaN HOLE (review 2026-09-03, bsuite#2970): `175 > NaN` is false, so a
  // baseline missing origin_count or per_week used to print "floor holds." and
  // exit 0. Every schedule field is now checked; the helper never returns NaN.
  { n: 'missing origin_count returns null, never NaN', f: () => scheduledFloor({ origin_date: '2026-09-03', per_week: 15 }) === null },
  { n: 'missing per_week returns null, never NaN', f: () => scheduledFloor({ origin_count: 175, origin_date: '2026-09-03' }) === null },
  { n: 'a STRING per_week ("15") is non-numeric and returns null', f: () => scheduledFloor({ origin_count: 175, origin_date: '2026-09-03', per_week: '15' }) === null },
  { n: 'scheduleUnarmed names every missing field', f: () => JSON.stringify(scheduleUnarmed({ origin_date: '2026-09-03' })) === '["origin_count","per_week"]' },
  { n: 'scheduleUnarmed names a non-numeric field', f: () => JSON.stringify(scheduleUnarmed({ origin_count: 'x', origin_date: '2026-09-03', per_week: 15 })) === '["origin_count"]' },
  { n: 'scheduleUnarmed names an unparseable origin_date', f: () => JSON.stringify(scheduleUnarmed({ origin_count: 1, origin_date: 'yesterday', per_week: 1 })) === '["origin_date"]' },
  { n: 'scheduleUnarmed is empty on a complete schedule', f: () => scheduleUnarmed({ origin_count: 175, origin_date: '2026-09-03', per_week: 15 }).length === 0 },
  { n: 'denominator fall is caught', f: () => denominatorFell(290, 300) === true },
  { n: 'denominator rise is not a fall', f: () => denominatorFell(310, 300) === false },
  { n: 'denominator equality is not a fall', f: () => denominatorFell(300, 300) === false },
];

/*
 * ENTRY-POINT self-tests — review 2026-09-03 (bsuite#2970), rule 6: a gate must
 * prove it can fail THROUGH THE SAME ENTRY POINT CI runs, not through a helper
 * called with literals. Each case spawns THIS script as a child process against
 * a temp fixture tree (a `docs/` with 25 files, 5 of them unclassified — above
 * the 20-doc positive control) and a temp baseline, and asserts the EXIT CODE.
 * The baseline lives at `docs/.classification-baseline.json` RELATIVE TO CWD, so
 * running the child with cwd=<fixture> can never touch the committed one.
 */
function classificationFixture() {
  const root = mkdtempSync(join(tmpdir(), 'c2-classification-'));
  mkdirSync(join(root, 'docs'), { recursive: true });
  for (let i = 0; i < 20; i++) {
    writeFileSync(join(root, 'docs', `20260101-classified-${i}-v1.00F.md`),
      '---\nkind: record\nauthority: none\nowner: bsuite\n---\n# classified\n');
  }
  for (let i = 0; i < 5; i++) {
    writeFileSync(join(root, 'docs', `20260102-unclassified-${i}-v1.00W.md`), '# no frontmatter\n');
  }
  return root;
}
function daysAgoIso(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
function runEntryPoint(root, baseline, cliArgs) {
  if (baseline !== null) writeFileSync(join(root, 'docs', '.classification-baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`);
  else rmSync(join(root, 'docs', '.classification-baseline.json'), { force: true });
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...cliArgs], { cwd: root, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
const TODAY = new Date().toISOString().slice(0, 10);
const CLEAN = { origin_count: 5, origin_date: TODAY, current_count: 5, current_date: TODAY, scanned: 25, per_week: 1 };
const ENTRY_POINT_TESTS = [
  { n: 'ENTRY: clean fixture, --check-floor → exit 0 "floor holds"',
    b: CLEAN, a: ['--check-floor'], code: 0, out: /floor holds/ },
  { n: 'ENTRY: origin_date 3 weeks back at 1/week (floor 2 < live 5), --check-floor → exit 1 FLOOR BREACHED',
    b: { ...CLEAN, origin_date: daysAgoIso(21) }, a: ['--check-floor'], code: 1, out: /FLOOR BREACHED: 5 > 2/ },
  { n: 'ENTRY: origin_date missing, --check-floor → exit 1 SCHEDULE UNARMED: origin_date',
    b: { ...CLEAN, origin_date: undefined }, a: ['--check-floor'], code: 1, out: /SCHEDULE UNARMED: origin_date/ },
  { n: 'ENTRY: origin_count missing, --check-floor → exit 1 SCHEDULE UNARMED: origin_count (was "floor today: NaN … floor holds." exit 0)',
    b: { ...CLEAN, origin_count: undefined }, a: ['--check-floor'], code: 1, out: /SCHEDULE UNARMED: origin_count/ },
  { n: 'ENTRY: per_week missing, --check-floor → exit 1 SCHEDULE UNARMED: per_week',
    b: { ...CLEAN, per_week: undefined }, a: ['--check-floor'], code: 1, out: /SCHEDULE UNARMED: per_week/ },
  { n: 'ENTRY: per_week non-numeric ("1"), --check-floor → exit 1 SCHEDULE UNARMED: per_week',
    b: { ...CLEAN, per_week: '1' }, a: ['--check-floor'], code: 1, out: /SCHEDULE UNARMED: per_week/ },
  { n: 'ENTRY: no baseline file at all, --check-floor → exit 1 SCHEDULE UNARMED',
    b: null, a: ['--check-floor'], code: 1, out: /SCHEDULE UNARMED/ },
  { n: 'ENTRY: PR path, clean fixture → exit 0 "ratchet ok"',
    b: CLEAN, a: [], code: 0, out: /ratchet ok/ },
  { n: 'ENTRY: PR path, baseline current_count below the live count → exit 1 RATCHET BROKEN',
    b: { ...CLEAN, current_count: 4 }, a: [], code: 1, out: /RATCHET BROKEN/ },
  { n: 'ENTRY: PR path, baseline current_count above the live count → exit 1 RE-BANK REQUIRED',
    b: { ...CLEAN, current_count: 6 }, a: [], code: 1, out: /RE-BANK REQUIRED/ },
  { n: 'ENTRY: PR path, banked scanned above the live denominator → exit 1 SCANNED LESS THAN BANKED',
    b: { ...CLEAN, scanned: 30 }, a: [], code: 1, out: /SCANNED LESS THAN BANKED/ },
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
  for (const t of FLOOR_TESTS) {
    const ok = t.f();
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.n}`);
    if (!ok) bad++;
  }
  const fixture = classificationFixture();
  try {
    for (const t of ENTRY_POINT_TESTS) {
      const r = runEntryPoint(fixture, t.b === null ? null : JSON.parse(JSON.stringify(t.b)), t.a);
      const ok = r.code === t.code && t.out.test(r.out);
      console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.n}`);
      if (!ok) { bad++; console.log(`        exit ${r.code}, wanted ${t.code}; output:\n${r.out.replace(/^/gm, '        | ')}`); }
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
  const total = SELF_TESTS.length + FLOOR_TESTS.length + ENTRY_POINT_TESTS.length;
  console.log(`\n  ${total - bad}/${total} self-tests pass (${ENTRY_POINT_TESTS.length} through the CLI entry point against a temp fixture; fixture removed)`);
  process.exit(bad ? 1 : 0);
}

const BASELINE = 'docs/.classification-baseline.json';
/* PI ruling 2026-09-03 (audit §7, C2): the classification debt must shrink 15/week
 * from the 2026-09-03 origin. This constant feeds the SCHEDULED FLOOR only — the
 * nightly, non-required check below — and never the PR-path ratchet, which stays
 * a plain rise/fall comparison against `current_count`. */
const CLASSIFICATION_PER_WEEK = 15;
const REMEDY = 'node scripts/check-doc-classification.mjs --update-baseline';
const args = process.argv.slice(2);
const reasonIdx = args.indexOf('--reason');
const REASON = reasonIdx !== -1 ? args[reasonIdx + 1] : null;
const changed = args.filter((a, i) => !a.startsWith('--') && !(reasonIdx !== -1 && i === reasonIdx + 1));

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

/* A POINTER IS NOT A DOCUMENT — same predicate check-doc-naming uses, imported from
   the same module, for the same reason NAVIGATIONAL_FILES lives there: a rule held in
   two places diverges. Asking a signpost for `kind`, `authority` and `evidence` is
   asking a link for authorship. Content-detected, never path- or name-detected. */
const isPointer = (p) => { try { return isPointerFile(readFileSync(p, 'utf8')) } catch { return false } };
const all = walk('docs').filter((p) => !isNavigational(p) && !isPointer(p));
const unclassified = all.filter((p) => !parseFrontmatter(readFileSync(p, 'utf8'))?.kind);

// Positive control: an empty scan would report zero unclassified, which reads as a
// clean estate and is a dead scan.
if (all.length < 20) {
  console.error(`  POSITIVE CONTROL FAILED: only ${all.length} doc(s) found. Run from the parent repo root.`);
  process.exit(3);
}

let failed = false;
const changedDocs = changed.filter((p) => !isNavigational(p) && !isPointer(p));
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

/*
 * SCHEDULED FLOOR — PI ruling 2026-09-03 (audit §7, C2).
 *
 * The PR-path ratchet below only ever refuses a RISE and demands a re-bank on an
 * unbanked FALL; it has no mechanism to make debt actually shrink over time, so a
 * baseline can sit unmoved forever and still read "ratchet ok". The floor is that
 * mechanism: `origin_count` decays by `per_week` from `origin_date`, and a nightly,
 * NON-REQUIRED job (never a PR check — see estate-alignment.yml) fails when the live
 * count sits above the floor.
 *
 * `origin_date` missing is a FAILURE under --check-floor ("schedule unarmed"), not a
 * silent pass — a floor nobody can compute is not a floor. It is deliberately NOT a
 * failure on the ordinary PR path, which must stay exactly the rise/fall check it was.
 */
export function scheduledFloor(schedule, today = new Date()) {
  if (scheduleUnarmed(schedule).length) return null;
  const { origin_count, origin_date, per_week } = schedule;
  const start = new Date(`${origin_date}T00:00:00Z`).getTime();
  const weeks = Math.max(0, Math.floor((today.getTime() - start) / (7 * 24 * 60 * 60 * 1000)));
  return Math.max(0, origin_count - per_week * weeks);
}

/*
 * EVERY schedule field, not only origin_date — review 2026-09-03 (bsuite#2970).
 * With origin_count or per_week missing the arithmetic above yields NaN, and
 * `live > NaN` is false, so --check-floor printed "floor today: NaN … floor
 * holds." and exited 0: the exact silent pass the header forbids, in the nightly
 * lane where nobody looks. Returns the NAMES of the fields that are missing or
 * non-numeric (origin_date: missing or not a parseable date); empty means armed.
 */
export function scheduleUnarmed(schedule) {
  const bad = [];
  if (!schedule || typeof schedule !== 'object') return ['origin_count', 'origin_date', 'per_week'];
  if (typeof schedule.origin_count !== 'number' || !Number.isFinite(schedule.origin_count)) bad.push('origin_count');
  if (typeof schedule.origin_date !== 'string' || !schedule.origin_date || Number.isNaN(new Date(`${schedule.origin_date}T00:00:00Z`).getTime())) bad.push('origin_date');
  if (typeof schedule.per_week !== 'number' || !Number.isFinite(schedule.per_week)) bad.push('per_week');
  return bad;
}

/** A scan that examined fewer docs than it did when banked has gone blind, not clean. */
export function denominatorFell(scannedNow, bankedScanned) {
  return scannedNow < bankedScanned;
}

function loadBaseline() {
  if (!existsSync(BASELINE)) return null;
  return JSON.parse(readFileSync(BASELINE, 'utf8'));
}
function writeBaseline(b) {
  writeFileSync(BASELINE, `${JSON.stringify(b, null, 2)}\n`);
}

if (args.includes('--reset-schedule')) {
  if (!REASON) {
    console.error('FAIL: --reset-schedule requires --reason "<text>" — origin_* is a schedule commitment and must not move silently.');
    process.exit(1);
  }
  const prior = loadBaseline();
  const today = new Date().toISOString().slice(0, 10);
  const banked = {
    origin_count: unclassified.length,
    origin_date: today,
    current_count: unclassified.length,
    current_date: today,
    scanned: all.length,
    per_week: prior?.per_week ?? CLASSIFICATION_PER_WEEK,
  };
  writeBaseline(banked);
  console.log(`SCHEDULE RESET. reason: ${REASON}`);
  console.log(`  new origin: ${banked.origin_count} unclassified of ${banked.scanned} docs, from ${banked.origin_date}, ${banked.per_week}/week`);
  process.exit(0);
}

if (args.includes('--update-baseline')) {
  const prior = loadBaseline();
  if (!prior) {
    console.error(`FAIL: no baseline at ${BASELINE} to update. Use --reset-schedule --reason "<text>" to arm one first.`);
    process.exit(1);
  }
  const banked = {
    ...prior,
    current_count: unclassified.length,
    current_date: new Date().toISOString().slice(0, 10),
    scanned: all.length,
  };
  writeBaseline(banked);
  console.log(`BANKED: current_count=${banked.current_count} scanned=${banked.scanned} (origin unchanged: ${banked.origin_count} from ${banked.origin_date})`);
  process.exit(0);
}

if (args.includes('--check-floor')) {
  // NIGHTLY-ONLY. Never invoked on the PR path — see estate-alignment.yml's
  // schedule-gated job. The floor is a schedule commitment, not a per-PR gate.
  const b = loadBaseline();
  if (!b) {
    console.error(`SCHEDULE UNARMED: no baseline at ${BASELINE} — the floor has nothing to decay from.`);
    process.exit(1);
  }
  // Every field, by name — a floor computed from a missing origin_count or
  // per_week is NaN, and NaN "holds" against any live count (review bsuite#2970).
  const unarmed = scheduleUnarmed(b);
  if (unarmed.length) {
    for (const f of unarmed) console.error(`SCHEDULE UNARMED: ${f} — missing or non-numeric in ${BASELINE}; the floor cannot be computed.`);
    process.exit(1);
  }
  const floor = scheduledFloor(b, new Date());
  console.log(`unclassified: ${unclassified.length} of ${all.length} doc(s); floor today: ${floor} (origin ${b.origin_count} on ${b.origin_date}, ${b.per_week}/week)`);
  if (unclassified.length > floor) {
    console.error(`FLOOR BREACHED: ${unclassified.length} > ${floor}.`);
    process.exit(1);
  }
  console.log('floor holds.');
  process.exit(0);
}

const baseline = loadBaseline();
const base = baseline ? baseline.current_count : null;
console.log(`\n  unclassified: ${unclassified.length} of ${all.length} doc(s)`);
if (base === null) {
  console.log(`  no baseline yet — run \`node scripts/check-doc-classification.mjs --reset-schedule --reason "<why>"\` to arm the ratchet`);
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

  /* NAME THEM. The block below has always named the UNTRACKED offenders, and named
   * nothing else — so a run where every offender was committed printed a bare
   * "232 of 298" and left you to find the two that moved.
   *
   * Measured: bsuite#2549 broke this ratchet 230 -> 232 with both new docs committed,
   * so the untracked block stayed silent and the output named no file at all. The
   * paths were in `unclassified` the whole time.
   *
   * Newest-first, capped — the same idiom audit-doc-completion.mjs uses for the
   * unbound list, and for the same reason: a ratchet breaks by a handful, and the
   * docs that broke it are the ones just added, so they sort to the top. Printing
   * all 232 would bury the two that matter. */
  const pathOf = (u) => (typeof u === 'string' ? u : (u.path ?? u.file ?? String(u)));
  const dateKey = (f) => (f.match(/(\d{8})-/)?.[1] ?? '00000000');
  const newestFirst = [...unclassified].sort((a, b) => {
    const d = dateKey(pathOf(b)).localeCompare(dateKey(pathOf(a)));
    return d !== 0 ? d : pathOf(a).localeCompare(pathOf(b));
  });
  const SHOW = 15;
  console.log(`\n  Undeclared doc(s), most recently dated first (showing ${Math.min(SHOW, newestFirst.length)} of ${newestFirst.length}):`);
  for (const u of newestFirst.slice(0, SHOW)) console.log(`      ${pathOf(u)}`);
  if (newestFirst.length > SHOW) console.log(`      … ${newestFirst.length - SHOW} more.`);
  console.log('\n  Each needs kind / authority / evidence in its frontmatter. An undated');
  console.log('  standing document sorts last here and is easy to miss — check those too.');
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
        `A baseline above the truth re-permits the debt you just paid off — run \`${REMEDY}\`.`,
    );
    failed = true;
  }

  /*
   * THE DENOMINATOR MUST NOT SHRINK EITHER — PI ruling 2026-09-03 (audit §7, C2).
   *
   * `unclassified` alone cannot tell "the estate got cleaner" from "the walk found
   * fewer docs" — a scan that silently examines less of the tree reports a smaller
   * numerator for the wrong reason and reads as progress. `scanned` is the banked
   * denominator (docs/.classification-baseline.json's `scanned`, written the same
   * commit as `current_count`); a live count BELOW it means the scan saw less than
   * it did when banked, and that is refused rather than believed.
   */
  if (denominatorFell(all.length, baseline.scanned)) {
    console.log(
      `  SCANNED LESS THAN BANKED: examined ${all.length} doc(s), baseline scanned ${baseline.scanned}. ` +
        `The scan may have gone blind — investigate before trusting ${unclassified.length}. If the tree ` +
        `genuinely shrank (docs deleted), run \`${REMEDY}\`.`,
    );
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
