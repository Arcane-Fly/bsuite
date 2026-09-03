#!/usr/bin/env node
/**
 * assert-docs-trees-present.mjs — the DOCS-SPECIFIC presence guard.
 *
 * scripts/assert-app-trees-present.sh passes an app whose `src/` checked out
 * OR whose `docs/` did — `[ -d "$app/src" ] || [ -d "$app/docs" ]`. A tree
 * with `src/` present and `docs/` entirely missing clears that guard outright.
 * Every gate this PR wires reads six apps' `docs/` directories specifically;
 * relying on the shared guard alone means an app whose docs submodule failed
 * to populate reads as a fully-checked-out tree with zero documents in it —
 * which is indistinguishable from a genuinely empty docs corpus to every
 * scanner downstream, and reports as a clean pass over nothing.
 *
 * TWO LEVELS, because the first alone repeats the same blind spot at a
 * smaller scale:
 *
 *   1. EXISTENCE — `docs/` itself must exist under all six apps.
 *   2. VOLUME — once a `docs/.dangling-link-baseline.json` is banked (it
 *      carries a per-root document count alongside its findings), each app's
 *      `docs/` must hold AT LEAST that many `.md` files. A directory that
 *      exists but is emptied by a bad checkout still passes level 1.
 *
 * Level 2 only activates once the baseline exists — the first CI run on this
 * PR has no baseline yet (bsuite audit §7 C1 banks it from that first run's
 * own log, in a second commit), so this prints a note and exits 0 rather than
 * demanding a number nobody has measured yet.
 */
import { existsSync, readdirSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { readBaseline, writeBaseline } from './lib/ratchet.mjs';

const SELF = fileURLToPath(import.meta.url);
const APPS = ['crm7', 'conduit', 'business-suite-unified', 'R80.4', 'braden', 'throughput'];
const BASELINE_FILE = 'docs/.dangling-link-baseline.json';

function countMd(dir) {
  let n = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith('.md')) n++;
    }
  }
  return n;
}

function main() {
  const missing = APPS.filter((app) => !existsSync(join(app, 'docs')));
  if (missing.length) {
    console.error(`::error::app docs/ dir(s) did not check out: ${missing.join(', ')}`);
    console.error('  scripts/assert-app-trees-present.sh alone is not enough here — it passes a tree');
    console.error('  with src/ but no docs/, which is exactly the tree that reports every doc-content');
    console.error('  gate in this workflow as clean over zero coverage.');
    process.exit(1);
  }

  const base = readBaseline(BASELINE_FILE);
  if (base && base.error) {
    console.error(`::error::${base.error}`);
    process.exit(1);
  }
  if (!base || !base.perRoot) {
    console.log('assert-docs-trees-present: all six app docs/ dirs present.');
    console.log(`  no ${BASELINE_FILE} banked yet — per-root minimum document counts are not enforced`);
    console.log('  until the first ratchet baseline lands (bsuite audit §7 C1).');
    process.exit(0);
  }

  let failed = false;
  for (const app of APPS) {
    const n = countMd(join(app, 'docs'));
    const min = base.perRoot[app];
    if (typeof min === 'number' && n < min) {
      console.error(`::error::${app}/docs has ${n} document(s), banked minimum is ${min} — scanned less than banked.`);
      failed = true;
    } else {
      console.log(`  ${app}/docs: ${n} document(s) (>= banked minimum ${min ?? '?'})`);
    }
  }
  if (existsSync('docs')) {
    const parentN = countMd('docs');
    const min = base.perRoot.docs;
    if (typeof min === 'number' && parentN < min) {
      console.error(`::error::docs/ has ${parentN} document(s), banked minimum is ${min} — scanned less than banked.`);
      failed = true;
    } else {
      console.log(`  docs/: ${parentN} document(s) (>= banked minimum ${min ?? '?'})`);
    }
  }

  if (failed) process.exit(1);
  console.log('assert-docs-trees-present: all six app docs/ dirs present, each at or above its banked minimum.');
}

if (process.argv.includes('--self-test')) {
  const checks = [];
  const check = (name, ok) => checks.push([name, ok]);
  const run = (cwd) => {
    try { execFileSync('node', [SELF], { cwd, encoding: 'utf8', stdio: 'pipe' }); return 0; }
    catch (e) { return e.status ?? 1; }
  };

  // 1. A missing app docs/ dir fails outright — even with a baseline present.
  let dir = mkdtempSync(join(tmpdir(), 'assert-docs-selftest-'));
  try {
    for (const app of APPS.slice(1)) mkdirSync(join(dir, app, 'docs'), { recursive: true });
    // APPS[0] deliberately has NO docs/ dir.
    check('missing app docs/ dir fails', run(dir) !== 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }

  // 2. All six present, no baseline -> soft pass (level 1 only).
  dir = mkdtempSync(join(tmpdir(), 'assert-docs-selftest-'));
  try {
    for (const app of APPS) mkdirSync(join(dir, app, 'docs'), { recursive: true });
    mkdirSync(join(dir, 'docs'), { recursive: true });
    check('all six present, no baseline -> passes', run(dir) === 0);

    // 3. Baseline banked at CURRENT (empty) counts -> still passes (0 >= 0).
    const perRoot = { docs: 0 };
    for (const app of APPS) perRoot[app] = 0;
    writeBaseline(join(dir, BASELINE_FILE), { findings: 0, scanned: 0, perRoot });
    check('baseline at 0 minimum -> still passes', run(dir) === 0);

    // 4. Raise the banked minimum above what the fixture actually has -> fails.
    const raised = { ...perRoot, [APPS[0]]: 3 };
    writeBaseline(join(dir, BASELINE_FILE), { findings: 0, scanned: 3, perRoot: raised });
    check('doc count below banked per-root minimum fails', run(dir) !== 0);

    // 5. Add the missing documents -> passes again.
    for (let i = 0; i < 3; i++) writeFileSync(join(dir, APPS[0], 'docs', `f${i}.md`), `# F${i}\n`);
    check('doc count restored to banked minimum passes', run(dir) === 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }

  let bad = 0;
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
    if (!ok) bad++;
  }
  console.log(`\n  ${checks.length - bad}/${checks.length} self-tests pass`);
  process.exit(bad ? 1 : 0);
}

main();
