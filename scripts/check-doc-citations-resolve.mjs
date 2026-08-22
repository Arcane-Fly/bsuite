#!/usr/bin/env node
/**
 * check-doc-citations-resolve.mjs — a doc that cites a path nobody can follow
 * is a doc with no evidence, however confident it reads.
 *
 * WHY THIS EXISTS
 *
 * The classification standard makes `evidence` the binding between a claim and the
 * gate that proves it. That binding is worth nothing if the cited path does not
 * resolve from where the reader is standing.
 *
 * FOUR MEASUREMENTS OF THE SAME THING, EACH WRONG, RECORDED SO THEY ARE NOT REPEATED
 *
 *   "22 docs cite a gate that no longer exists"  — the original claim
 *   19 dead targets   — but `existsSync` was only tried at the PARENT root, so every
 *                       submodule script read as deleted
 *   6 truly absent    — but the extension alternation let `.json` be cut down to
 *                       `.js`, inventing `scripts/hook-suppression-baseline.js`,
 *                       a file nothing had ever cited
 *   11 unqualified    — but after fixing the docs the same 11 still "failed", because
 *                       `\bscripts/dod.mjs` matches INSIDE `R80.4/scripts/dod.mjs`:
 *                       a slash is a word boundary
 *
 * The truth was 11 unqualified submodule paths, 2 references to scripts outside this
 * repo entirely, and 4 that were never written. Not one gate had been deleted.
 *
 * THREE VERDICTS, because collapsing them is what produced the wrong number
 *
 *   UNQUALIFIED  the file exists in a submodule; the citation just lacks its prefix.
 *                Fixable by editing the doc. This is the actionable class.
 *   EXTERNAL     the file exists outside this repo (the ~/.agents skills hub).
 *                Not fixable here, and not a defect.
 *   UNRESOLVED   nothing by that path exists anywhere. Either never written, or
 *                proposed — the citing line usually says which.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

/**
 * The lookbehind is the whole trick. Without `(?<![A-Za-z0-9_/.-])` this pattern
 * matches the TAIL of an already-correct path, so fixing a doc does not clear the
 * finding — which is exactly what happened.
 *
 * The lazy `+?` plus `(?![A-Za-z0-9])` is the other half: a greedy match backtracks
 * happily from `.json` to `.js` and reports a file nobody wrote.
 */
export const CITATION =
  /(?<![A-Za-z0-9_/.-])(scripts\/[A-Za-z0-9_./-]+?\.(?:mjs|js|sh|ts)|\.github\/workflows\/[A-Za-z0-9_.-]+?\.ya?ml)(?![A-Za-z0-9])/g;

export function cite(text) {
  const out = new Set();
  let m;
  CITATION.lastIndex = 0;
  while ((m = CITATION.exec(text))) out.add(m[1]);
  return out;
}

const SELF_TESTS = [
  { n: 'a bare script path is a citation', f: () => cite('run scripts/dod.mjs').has('scripts/dod.mjs') },
  { n: 'an ALREADY-QUALIFIED path is not re-reported — a slash is a word boundary',
    f: () => !cite('R80.4/scripts/dod.mjs').has('scripts/dod.mjs') },
  { n: '.json is NOT cut down to .js — this invented a file nobody cited',
    f: () => cite('scripts/hook-suppression-baseline.json').size === 0 },
  { n: '.mjs still matches', f: () => cite('scripts/x.mjs').has('scripts/x.mjs') },
  { n: 'a workflow path matches', f: () => cite('.github/workflows/ci.yml').has('.github/workflows/ci.yml') },
  { n: 'a qualified workflow path is not re-reported',
    f: () => !cite('crm7/.github/workflows/ci.yml').has('.github/workflows/ci.yml') },
  { n: '.yaml as well as .yml', f: () => cite('.github/workflows/a.yaml').has('.github/workflows/a.yaml') },
  { n: 'a trailing :50 line ref does not break the match',
    f: () => cite('`.github/workflows/verify.yml:50`').has('.github/workflows/verify.yml') },
  { n: 'prose mentioning the word scripts is not a citation', f: () => cite('the scripts directory').size === 0 },
];

if (process.argv.includes('--self-test')) {
  let bad = 0;
  for (const t of SELF_TESTS) {
    let ok = false;
    try { ok = t.f(); } catch { ok = false; }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.n}`);
    if (!ok) bad++;
  }
  console.log(`\n  ${SELF_TESTS.length - bad}/${SELF_TESTS.length} self-tests pass`);
  process.exit(bad ? 1 : 0);
}

const SUBS = readFileSync('.gitmodules', 'utf8')
  .split('\n').filter((l) => l.includes('path =')).map((l) => l.split('=')[1].trim())
  .concat(['packages']);
const HUB = process.env.HOME ? join(process.env.HOME, '.agents') : null;

function walk(d, out = []) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function findInHub(name, dir = HUB, depth = 0) {
  if (!dir || depth > 5 || !existsSync(dir)) return null;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isFile() && e.name === name) return p;
    if (e.isDirectory()) { const r = findInHub(name, p, depth + 1); if (r) return r; }
  }
  return null;
}

const docs = walk('docs');
if (docs.length < 20) { console.error(`  POSITIVE CONTROL FAILED: only ${docs.length} doc(s). Run from the parent root.`); process.exit(3); }

const found = new Map();
for (const d of docs) {
  for (const c of cite(readFileSync(d, 'utf8'))) {
    if (existsSync(c)) continue;
    if (!found.has(c)) found.set(c, new Set());
    found.get(c).add(d);
  }
}

const unqualified = [], external = [], unresolved = [];
for (const [c, ds] of [...found].sort()) {
  const b = basename(c);
  let where = null;
  for (const s of SUBS) {
    for (const cand of [join(s, c), join(s, 'scripts', b)]) if (existsSync(cand)) { where = cand; break; }
    if (where) break;
  }
  if (where) unqualified.push([c, where, ds]);
  else {
    const hub = findInHub(b);
    (hub ? external : unresolved).push([c, hub, ds]);
  }
}

const total = docs.length;
console.log(`  scanned ${total} docs\n`);
console.log(`  UNQUALIFIED — exists in a submodule, citation lacks the prefix (${unqualified.length}):`);
for (const [c, w] of unqualified) console.log(`    ${c.padEnd(48)} -> ${w}`);
console.log(`\n  EXTERNAL — outside this repo, not a defect (${external.length}):`);
for (const [c, w] of external) console.log(`    ${c.padEnd(48)} -> ${w}`);
console.log(`\n  UNRESOLVED — nothing by that path anywhere (${unresolved.length}):`);
for (const [c, , ds] of unresolved) console.log(`    ${c.padEnd(48)} cited by ${[...ds].map((d) => basename(d)).join(', ').slice(0, 70)}`);

// Only UNQUALIFIED fails. EXTERNAL is correct, and UNRESOLVED is usually a proposal
// whose citing line says so — judging that needs a human read, not an exit code.
if (unqualified.length) {
  console.log(`\n  FAIL: ${unqualified.length} citation(s) resolve only if you already know which app they mean.`);
  process.exit(1);
}
console.log('\n  PASS: every citation either resolves from the parent root, or is external, or is openly unresolved.');
