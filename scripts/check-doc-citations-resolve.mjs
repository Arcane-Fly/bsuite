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
 * FOUR VERDICTS, because collapsing them is what produced the wrong number
 *
 *   UNQUALIFIED  the file exists in a submodule; the citation just lacks its prefix.
 *                Fixable by editing the doc. This is the actionable class — the
 *                ONLY one that fails the build.
 *   EXTERNAL     the file exists outside this repo (the ~/.agents skills hub).
 *                Not fixable here, and not a defect.
 *   PLANNED      the citing entry carries a `(planned)` suffix — the row-before-diff
 *                doctrine: a plan doc may cite a script that is not built YET. Exempt
 *                from the ratchet below by design, not by omission.
 *   UNRESOLVED   nothing by that path exists anywhere, and it does not say `(planned)`.
 *                Under a MONOTONIC CEILING (2026-09-03): the count may only fall or
 *                hold, never rise — but UNRESOLVED itself still does not fail the
 *                build on its own, per the original ruling below. A ceiling is not
 *                the same claim as "zero is required".
 *
 * ONLY UNQUALIFIED STILL FAILS OUTRIGHT. A citation naming a file outside this repo
 * is correct, and an openly-`(planned)` citation is a proposal whose own line says so
 * — judging either needs a human read, not an exit code. The UNRESOLVED ceiling exists
 * so the UNPLANNED backlog cannot grow silently, without pretending a script that does
 * not exist yet is somehow a build failure.
 *
 * EVIDENCE: FRONTMATTER IS EXISTENCE-CHECKED TOO (2026-09-03), not just the prose
 * CITATION sweep below. The classification standard's `evidence:` list can name a
 * migration (`.sql`), a component (`.ts`/`.tsx`), another document (`.md`), or a bare
 * workflow filename with no `.github/workflows/` prefix — none of those matched the
 * old scripts/.github-only regex, so 48 of 132 real `evidence:` entries were never
 * checked at all. `parseEvidence()` reads that YAML list directly instead of widening
 * the regex indefinitely, which is exactly the over-fitting trap the AUTHORITY-pin
 * checker next door already learned the hard way.
 */

import { readFileSync, existsSync, readdirSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { compareRatchet, writeBaseline } from './lib/ratchet.mjs';

const SELF = fileURLToPath(import.meta.url);
const BASELINE_FILE = 'docs/.unresolved-citation-baseline.json';

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

/**
 * parseEvidence — pull the `evidence:` YAML list out of a doc's frontmatter.
 *
 * Not a YAML parser. The classification standard's own grammar is one list item
 * per line, `  - <path>`, optionally closed by a trailing parenthetical — either a
 * free-text annotation like `(Gate G1)` (stripped, ignored) or the `(planned)`
 * exemption marker (stripped, recorded). That is the whole shape this needs; a real
 * YAML parser would accept nesting the standard never uses, and silently swallow a
 * malformed list instead of the list simply ending — which is the failure mode that
 * makes THIS OWN classification-standard doc, which quotes the grammar as an example
 * inside its BODY, a trap: reading past the closing `---` would double-count it.
 */
export function parseEvidence(text) {
  if (!text.startsWith('---')) return [];
  const end = text.indexOf('\n---', 3);
  if (end === -1) return [];
  const fm = text.slice(0, end);
  const out = [];
  let inList = false;
  for (const line of fm.split('\n')) {
    if (/^evidence:\s*$/.test(line)) { inList = true; continue; }
    if (!inList) continue;
    const m = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!m) { inList = false; continue; }
    let raw = m[1].trim().replace(/^`(.+)`$/, '$1').replace(/:\d+$/, '');
    let planned = false;
    const paren = raw.match(/^(.*?)\s+\(([^)]*)\)\s*$/);
    if (paren) {
      if (/^planned$/i.test(paren[2])) planned = true;
      raw = paren[1].trim();
    }
    if (raw) out.push({ path: raw, planned });
  }
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

  // ── evidence: frontmatter parsing — the new forms the old regex never saw ──
  { n: 'evidence: captures a .sql path outside scripts/', f: () => {
    const ev = parseEvidence('---\nevidence:\n  - crm7/supabase/migrations/20260905000000_x.sql\n---\n# doc\n');
    return ev.length === 1 && ev[0].path === 'crm7/supabase/migrations/20260905000000_x.sql' && ev[0].planned === false;
  } },
  { n: 'evidence: captures a .tsx/.ts path outside scripts/', f: () => {
    const ev = parseEvidence('---\nevidence:\n  - crm7/src/components/reports/Foo.test.ts\n---\n# doc\n');
    return ev[0]?.path === 'crm7/src/components/reports/Foo.test.ts';
  } },
  { n: 'evidence: captures a cross-doc .md citation', f: () => {
    const ev = parseEvidence('---\nevidence:\n  - docs/plans/20260817-estate-completion-plan-v1.00D.md\n---\n# doc\n');
    return ev[0]?.path === 'docs/plans/20260817-estate-completion-plan-v1.00D.md';
  } },
  { n: 'evidence: captures a bare workflow filename with no .github/workflows/ prefix', f: () => {
    const ev = parseEvidence('---\nevidence:\n  - phantom-migrations.yml\n---\n# doc\n');
    return ev[0]?.path === 'phantom-migrations.yml';
  } },
  { n: 'a (planned) suffix marks the entry exempt and is stripped from the path', f: () => {
    const ev = parseEvidence('---\nevidence:\n  - scripts/not-built-yet.mjs (planned)\n---\n# doc\n');
    return ev[0]?.path === 'scripts/not-built-yet.mjs' && ev[0]?.planned === true;
  } },
  { n: 'a non-planned trailing annotation is stripped but NOT marked planned', f: () => {
    const ev = parseEvidence('---\nevidence:\n  - docs/plans/20260817-x-v1.00D.md (Gate G1)\n---\n# doc\n');
    return ev[0]?.path === 'docs/plans/20260817-x-v1.00D.md' && ev[0]?.planned === false;
  } },
  { n: 'evidence: parsing stops at the closing frontmatter fence — does not read the BODY',
    f: () => {
      // This exact shape — a doc quoting the evidence: grammar in its own prose —
      // is not hypothetical: docs/20260822-knowledge-classification-standard-v1.00A.md
      // does precisely this, and a body-reading parser would double-count it.
      const t = '---\nevidence:\n  - scripts/a.mjs\n---\n\nBody text quoting the format:\n\nevidence:\n  - scripts/b.mjs\n';
      const ev = parseEvidence(t);
      return ev.length === 1 && ev[0].path === 'scripts/a.mjs';
    } },
];

if (process.argv.includes('--self-test')) {
  let bad = 0;
  for (const t of SELF_TESTS) {
    let ok = false;
    try { ok = t.f(); } catch { ok = false; }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.n}`);
    if (!ok) bad++;
  }
  console.log(`\n  ${SELF_TESTS.length - bad}/${SELF_TESTS.length} unit self-tests pass`);

  // ── fixture ratchet self-test — proves the SAME entry point can fail ────
  //
  // Everything above tests the extraction logic in isolation. This proves the
  // wired gate: run the script itself, as a subprocess, over a fixture tree —
  // first to bank a clean baseline, then to prove a planted unresolved
  // citation breaks the ratchet, then that a `(planned)` suffix on that exact
  // citation exempts it, then that a clean fixture passes again.
  const fixtureChecks = [];
  const fcheck = (name, ok) => fixtureChecks.push([name, ok]);
  const dir = mkdtempSync(join(tmpdir(), 'doc-citations-selftest-'));
  try {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    writeFileSync(join(dir, '.gitmodules'), '');
    writeFileSync(join(dir, 'scripts', 'exists.mjs'), '// present\n');
    // POSITIVE CONTROL below requires >= 20 docs.
    for (let i = 0; i < 20; i++) writeFileSync(join(dir, 'docs', `filler-${i}.md`), `# Filler ${i}\n`);
    const target = join(dir, 'docs', 'target.md');
    const fm = (extra) =>
      `---\nkind: record\nauthority: none\nowner: x\nevidence:\n  - scripts/exists.mjs\n${extra}---\n# Target\n`;
    writeFileSync(target, fm(''));

    const run = () => {
      try { execFileSync('node', [SELF], { cwd: dir, encoding: 'utf8', stdio: 'pipe' }); return 0; }
      catch (e) { return e.status ?? 1; }
    };
    const bank = () => {
      try { execFileSync('node', [SELF, '--update-baseline'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' }); return 0; }
      catch (e) { return e.status ?? 1; }
    };

    fcheck('unarmed ratchet does not pass', run() !== 0);
    fcheck('--update-baseline exits 0', bank() === 0);
    fcheck('--update-baseline wrote the baseline file', existsSync(join(dir, BASELINE_FILE)));
    fcheck('clean fixture passes once banked', run() === 0);

    // PLANT A VIOLATION: an unresolved, non-planned evidence citation.
    writeFileSync(target, fm('  - scripts/never-written.mjs\n'));
    fcheck('planted unresolved evidence path fails the ratchet', run() !== 0);

    // The SAME citation, marked (planned), is exempt.
    writeFileSync(target, fm('  - scripts/never-written.mjs (planned)\n'));
    fcheck('(planned) suffix exempts the same citation', run() === 0);

    // Back to clean.
    writeFileSync(target, fm(''));
    fcheck('restored-clean fixture passes again', run() === 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  let fbad = 0;
  for (const [name, ok] of fixtureChecks) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
    if (!ok) fbad++;
  }
  console.log(`\n  ${fixtureChecks.length - fbad}/${fixtureChecks.length} fixture ratchet self-tests pass`);

  process.exit(bad || fbad ? 1 : 0);
}

const SUBS = readFileSync('.gitmodules', 'utf8')
  .split('\n').filter((l) => l.includes('path =')).map((l) => l.split('=')[1].trim())
  .concat(['packages']);
// MACHINE-LOCAL, NOT REPO STATE — and CI has none of it, permanently.
//
// Measured 2026-09-03: a developer machine with the skills hub cloned classifies
// `.agents/skills/.../visual-probe.js` as EXTERNAL (3 such citations); the SAME
// commit in CI, where no `~/.agents` exists and never will, classifies the exact
// same three as UNRESOLVED — through no fault of the citation. This is not a bug
// to fix; it is why the UNRESOLVED ceiling below is banked from a CI RUN, never
// from a local one — a local baseline would be permanently, silently wrong by
// however many hub-only citations the corpus carries.
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

/**
 * Classify a citation that did NOT already resolve at the parent root.
 *
 * A BARE workflow filename (`phantom-migrations.yml`, no directory at all) is a
 * blessed shorthand for `.github/workflows/<name>` — the classification standard's
 * own worked example uses exactly this shape. Everything else reuses the original
 * scripts/.github resolution: search each submodule for the path as given, for
 * `scripts/<basename>`, and for `.github/workflows/<basename>`.
 */
function classify(c) {
  const b = basename(c);
  if (!c.includes('/') && /\.ya?ml$/i.test(c)) {
    for (const s of SUBS) {
      const cand = join(s, '.github', 'workflows', c);
      if (existsSync(cand)) return { cls: 'unqualified', where: cand };
    }
  }
  for (const s of SUBS) {
    for (const cand of [join(s, c), join(s, 'scripts', b), join(s, '.github', 'workflows', b)]) {
      if (existsSync(cand)) return { cls: 'unqualified', where: cand };
    }
  }
  const hub = findInHub(b);
  if (hub) return { cls: 'external', where: hub };
  return { cls: 'unresolved', where: null };
}

const docs = walk('docs');
if (docs.length < 20) { console.error(`  POSITIVE CONTROL FAILED: only ${docs.length} doc(s). Run from the parent root.`); process.exit(3); }

const found = new Map();        // path -> Set<citing docs>
const plannedPaths = new Set(); // paths where at least one citer marked (planned)
for (const d of docs) {
  const text = readFileSync(d, 'utf8');
  const entries = [...cite(text)].map((path) => ({ path, planned: false })).concat(parseEvidence(text));
  for (const { path: c, planned } of entries) {
    if (existsSync(c)) continue;
    if (planned) plannedPaths.add(c);
    if (!found.has(c)) found.set(c, new Set());
    found.get(c).add(d);
  }
}

const unqualified = [], external = [], unresolved = [], planned = [];
for (const [c, ds] of [...found].sort()) {
  const { cls, where } = classify(c);
  if (cls === 'unqualified') unqualified.push([c, where, ds]);
  else if (cls === 'external') external.push([c, where, ds]);
  else if (plannedPaths.has(c)) planned.push([c, ds]);
  else unresolved.push([c, ds]);
}

const total = docs.length;
console.log(`  scanned ${total} docs\n`);
console.log(`  UNQUALIFIED — exists in a submodule, citation lacks the prefix (${unqualified.length}):`);
for (const [c, w] of unqualified) console.log(`    ${c.padEnd(48)} -> ${w}`);
console.log(`\n  EXTERNAL — outside this repo, not a defect (${external.length}):`);
for (const [c, w] of external) console.log(`    ${c.padEnd(48)} -> ${w}`);
console.log(`\n  PLANNED — cites a \`(planned)\` path, exempt from the ratchet (${planned.length}):`);
for (const [c, ds] of planned) console.log(`    ${c.padEnd(48)} cited by ${[...ds].map((d) => basename(d)).join(', ').slice(0, 70)}`);
console.log(`\n  UNRESOLVED — nothing by that path anywhere, and not (planned) (${unresolved.length}):`);
for (const [c, ds] of unresolved) console.log(`    ${c.padEnd(48)} cited by ${[...ds].map((d) => basename(d)).join(', ').slice(0, 70)}`);

if (process.argv.includes('--update-baseline')) {
  writeBaseline(BASELINE_FILE, {
    findings: unresolved.length,
    scanned: total,
    banked: new Date().toISOString().slice(0, 10),
  });
  console.log(`\n  banked ${unresolved.length} unresolved / ${total} scanned to ${BASELINE_FILE}`);
  process.exit(0);
}

// Only UNQUALIFIED fails outright. EXTERNAL is correct, PLANNED is an open proposal
// that says so on its own line, and UNRESOLVED is ratcheted below rather than failed
// unconditionally — see the header for why collapsing these was the original bug.
if (unqualified.length) {
  console.log(`\n  FAIL: ${unqualified.length} citation(s) resolve only if you already know which app they mean.`);
  process.exit(1);
}

const ratchet = compareRatchet({
  file: BASELINE_FILE,
  findings: unresolved.length,
  scanned: total,
  mode: 'ceiling',
  label: 'unresolved-citation',
  scriptPath: 'scripts/check-doc-citations-resolve.mjs',
});
console.log(`\n${ratchet.message}`);
if (!ratchet.ok) process.exit(1);

console.log('\n  PASS: every citation either resolves from the parent root, or is external, or is openly');
console.log('  (planned), or is unresolved within the banked ceiling.');
