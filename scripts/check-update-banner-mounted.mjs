#!/usr/bin/env node
/**
 * scripts/check-update-banner-mounted.mjs
 *
 * Per-app floor on real JSX mounts of <UpdateAvailableBanner/> imported from
 * `@bsuite/nav-core` (D-160 R7 / R8). The package ships the banner; until each
 * app renders it, the operator's "refresh to update prompt" does nothing on
 * that surface. check-exported-not-mounted.mjs only needs ONE consumer anywhere
 * and must NOT be extended for this (its own header says so).
 *
 * WHY AST, NOT GREP
 * ---------------------------------------------------------------------------
 * Same reason as check-component-mounts.mjs: a grep counts a docblock
 * `@example <UpdateAvailableBanner …/>`, a string literal, or a test file as a
 * mount. This estate has already shipped green on that class. Mounts resolve
 * through IMPORT BINDINGS from `@bsuite/nav-core` (named or aliased), then any
 * JSX element whose tag is that binding. Comments are not elements.
 *
 * RATCHET
 * ---------------------------------------------------------------------------
 * scripts/update-banner-mount-floors.json holds per-app `floors` (today all 0)
 * and `target` (1 per app, 2 for R80.4 — LiveShell + static branch). A count
 * below its floor fails. A count ABOVE its floor without --update-baseline
 * fails with the remedy ("the floor is a ratchet: bank the rise"). Target
 * reached is reported per app; it is not itself a fail condition today.
 *
 * WHAT THIS DOES NOT ASSERT
 * ---------------------------------------------------------------------------
 * That /version.json is served (check-version-json-served.mjs).
 * That the banner is on every route inside an app (only that the floor of
 * render sites is met — R7's 11 mount points / 12 render sites are the
 * adoption map, checked by humans against the PR body table).
 * That useUnsavedChanges is wired on edit forms.
 *
 * USAGE
 *   node scripts/check-update-banner-mounted.mjs
 *   node scripts/check-update-banner-mounted.mjs --update-baseline
 *   node scripts/check-update-banner-mounted.mjs --self-test
 *   node scripts/check-update-banner-mounted.mjs --floors=<path> --apps-root=<path>
 *
 * EXIT
 *   0  every app at or above its floor, no unbanked rise, non-zero scan
 *   1  floor breach, unbanked rise, or empty scan
 *   2  bootstrap (no typescript / missing floors file)
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  realpathSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = fileURLToPath(import.meta.url);
const DEFAULT_FLOORS = join(HERE, 'update-banner-mount-floors.json');

let ts;
try {
  ts = require('typescript');
} catch {
  console.error(
    'FAIL: the `typescript` package is required and is not installed.\n' +
      'This guard parses TSX rather than grepping it, because a grep counts a\n' +
      'comment mentioning <UpdateAvailableBanner> as a mount. Install deps and\n' +
      're-run; do not replace the parse with a regex.',
  );
  process.exit(2);
}

/** Same six apps as check-component-mounts.mjs, R80.4 with the side-by-side candidate. */
const APPS = [
  { name: 'business-suite-unified', candidates: ['business-suite-unified'] },
  { name: 'crm7', candidates: ['crm7'] },
  { name: 'conduit', candidates: ['conduit'] },
  { name: 'braden', candidates: ['braden'] },
  { name: 'R80.4', candidates: ['R80.4', '../R80.4'] },
  { name: 'throughput', candidates: ['throughput'] },
];

const IMPORTED_NAMES = new Set(['UpdateAvailableBanner']);
const TEST_MARKERS = ['__tests__', '.test.', '.spec.', '.stories.', '/test/', '/tests/', '\\test\\', '\\tests\\'];
const EXCLUDED_SEGMENTS = ['/node_modules/', '/.next/', '/dist/', '/.vercel/'];

function isTestPath(p) {
  const norm = p.replaceAll('\\', '/');
  return TEST_MARKERS.some((m) => norm.includes(m.replaceAll('\\', '/')));
}

function isExcluded(path) {
  const p = path.replaceAll('\\', '/');
  return EXCLUDED_SEGMENTS.some((seg) => p.includes(seg));
}

function resolveApp(app, root) {
  for (const c of app.candidates) {
    const dir = join(root, c);
    const srcDir = join(dir, 'src');
    try {
      if (statSync(srcDir).isDirectory()) return { dir, srcDir, name: app.name };
    } catch {
      /* next */
    }
  }
  return null;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist' || e.name === '.vercel') continue;
      walk(full, out);
    } else if (e.isFile() && (e.name.endsWith('.tsx') || e.name.endsWith('.ts') || e.name.endsWith('.jsx') || e.name.endsWith('.js'))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Count real JSX mounts of UpdateAvailableBanner imported from @bsuite/nav-core.
 * Returns { mounts, sites: [{file, line}] }.
 */
export function analyseFile(file, sourceText = null) {
  const text = sourceText ?? readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);

  const bindings = new Set();
  for (const stmt of src.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const mod = stmt.moduleSpecifier.text;
    // Bare package or subpath that is still the package (not /vite — banner is browser export).
    if (mod !== '@bsuite/nav-core' && !mod.startsWith('@bsuite/nav-core/')) continue;
    // The vite subpath does not export the banner; skip it so a mistaken import does not count.
    if (mod === '@bsuite/nav-core/vite' || mod.startsWith('@bsuite/nav-core/vite')) continue;
    const clause = stmt.importClause;
    if (!clause) continue;
    if (clause.name && IMPORTED_NAMES.has('default')) {
      // default import of the banner is not the public API; ignore
    }
    const named = clause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const el of named.elements) {
        const imported = el.propertyName ? el.propertyName.text : el.name.text;
        if (IMPORTED_NAMES.has(imported)) bindings.add(el.name.text);
      }
    }
  }

  const sites = [];
  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(src);
      if (bindings.has(tag)) {
        const { line } = src.getLineAndCharacterOfPosition(node.getStart(src));
        sites.push({ file, line: line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return { mounts: sites.length, sites, bindings: [...bindings] };
}

export function scanApp(appDir, srcDir) {
  const files = walk(srcDir).filter((f) => !isExcluded(f) && !isTestPath(f));
  let mounts = 0;
  const sites = [];
  let filesParsed = 0;
  for (const f of files) {
    let r;
    try {
      r = analyseFile(f);
      filesParsed += 1;
    } catch {
      continue;
    }
    if (r.mounts > 0) {
      mounts += r.mounts;
      for (const s of r.sites) {
        sites.push({ file: relative(appDir, s.file).replaceAll('\\', '/'), line: s.line });
      }
    }
  }
  return { mounts, sites, filesParsed, filesSeen: files.length };
}

export function evaluateApp({ name, mounts, floor, target }) {
  const failures = [];
  if (mounts < floor) {
    failures.push(
      `${name}: mount count ${mounts} is below floor ${floor}. ` +
        `Render <UpdateAvailableBanner /> imported from '@bsuite/nav-core' at the R7 mount point(s).`,
    );
  }
  if (mounts > floor) {
    failures.push(
      `${name}: mount count ${mounts} is above floor ${floor}. ` +
        `the floor is a ratchet: bank the rise with ` +
        `node scripts/check-update-banner-mounted.mjs --update-baseline`,
    );
  }
  const targetReached = mounts >= target;
  return { failures, targetReached };
}

function loadFloors(path) {
  if (!existsSync(path)) {
    throw new Error(`floors file missing: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function mainRun(argv) {
  const floorsPath =
    (argv.find((a) => a.startsWith('--floors=')) || '').slice('--floors='.length) || DEFAULT_FLOORS;
  const appsRoot =
    (argv.find((a) => a.startsWith('--apps-root=')) || '').slice('--apps-root='.length) || process.cwd();
  const update = argv.includes('--update-baseline');
  const floorsDoc = loadFloors(floorsPath);
  const floors = floorsDoc.floors || {};
  const targets = floorsDoc.target || {};

  const rows = [];
  const allFailures = [];
  let totalFiles = 0;
  let totalMounts = 0;
  const nextFloors = { ...floors };

  for (const app of APPS) {
    const found = resolveApp(app, appsRoot);
    if (!found) {
      console.error(
        `FAIL: ${app.name} has no src/ at any of (${app.candidates.join(', ')}) under ${appsRoot}. ` +
          `Missing app directories must not be silently skipped.`,
      );
      process.exit(1);
    }
    const scanned = scanApp(found.dir, found.srcDir);
    totalFiles += scanned.filesParsed;
    totalMounts += scanned.mounts;
    const floor = Number(floors[app.name] ?? 0);
    const target = Number(targets[app.name] ?? 1);
    const ev = evaluateApp({ name: app.name, mounts: scanned.mounts, floor, target });
    rows.push({
      name: app.name,
      mounts: scanned.mounts,
      floor,
      target,
      targetReached: ev.targetReached,
      files: scanned.filesParsed,
      sites: scanned.sites,
    });
    nextFloors[app.name] = scanned.mounts;
    for (const f of ev.failures) allFailures.push(f);
  }

  if (totalFiles === 0) {
    console.error('FAIL: scanned ZERO source files. A scan of nothing is not a pass.');
    process.exit(1);
  }

  console.log(
    'app                        mounts  floor  target  target-met  files',
  );
  console.log(
    '------------------------- ------- ------ ------- ---------- ------',
  );
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(25)} ${String(r.mounts).padStart(7)} ${String(r.floor).padStart(6)} ` +
        `${String(r.target).padStart(7)} ${String(r.targetReached).padStart(10)} ${String(r.files).padStart(6)}`,
    );
    for (const s of r.sites) {
      console.log(`    ${s.file}:${s.line}`);
    }
  }
  console.log(
    `ok-scan — ${rows.length} app(s), ${totalFiles} source file(s) parsed, ${totalMounts} UpdateAvailableBanner mount(s).`,
  );

  if (update) {
    const payload = {
      ...floorsDoc,
      floors: nextFloors,
      banked_at: new Date().toISOString().slice(0, 10),
    };
    writeFileSync(floorsPath, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`floors updated at ${floorsPath}`);
    process.exit(0);
  }

  if (allFailures.length > 0) {
    console.error('');
    for (const f of allFailures) console.error(`::error::${f}`);
    process.exit(1);
  }

  console.log(
    `ok — ${rows.length} app(s), ${totalFiles} source files parsed; every app meets its UpdateAvailableBanner floor.`,
  );
  process.exit(0);
}

function selfTest() {
  const cases = [];
  const t = (name, ok, detail = '') => {
    cases.push({ name, ok: !!ok });
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : detail ? ` — ${detail}` : ''}`);
  };

  // Pure AST controls
  {
    const src =
      "import { UpdateAvailableBanner } from '@bsuite/nav-core'\n" +
      'export function Shell() {\n' +
      '  return <UpdateAvailableBanner />\n' +
      '}\n';
    const r = analyseFile('Shell.tsx', src);
    t('AST: planted mount counts 1', r.mounts === 1, JSON.stringify(r));
  }
  {
    const src =
      '/**\n * @example\n * <UpdateAvailableBanner control={x} />\n */\n' +
      "import { something } from 'x'\n" +
      'export function Doc() { return null }\n';
    const r = analyseFile('Doc.tsx', src);
    t('AST: docblock-only mention counts 0', r.mounts === 0, JSON.stringify(r));
  }
  {
    const src =
      "import { UpdateAvailableBanner as UAB } from '@bsuite/nav-core'\n" +
      'export function Shell() { return <UAB /> }\n';
    const r = analyseFile('Shell.tsx', src);
    t('AST: aliased import mount counts 1', r.mounts === 1, JSON.stringify(r));
  }
  {
    const src =
      "import { UpdateAvailableBanner } from '@bsuite/nav-core'\n" +
      "const s = '<UpdateAvailableBanner />'\n" +
      'export function Shell() { return <div>{s}</div> }\n';
    const r = analyseFile('Shell.tsx', src);
    t('AST: string literal is not a mount', r.mounts === 0, JSON.stringify(r));
  }
  {
    const src = "import { versionJsonPlugin } from '@bsuite/nav-core/vite'\nexport const p = versionJsonPlugin\n";
    const r = analyseFile('vite.config.ts', src);
    t('AST: vite subpath import does not bind banner', r.mounts === 0 && r.bindings.length === 0);
  }
  {
    const ev = evaluateApp({ name: 'crm7', mounts: 0, floor: 1, target: 1 });
    t('evaluate: below floor fails', ev.failures.some((f) => f.includes('below floor')));
  }
  {
    const ev = evaluateApp({ name: 'crm7', mounts: 2, floor: 1, target: 1 });
    t(
      'evaluate: rise without re-bank fails with ratchet remedy',
      ev.failures.some((f) => f.includes('bank the rise')),
    );
  }
  {
    const ev = evaluateApp({ name: 'crm7', mounts: 1, floor: 1, target: 1 });
    t('evaluate: exact floor passes', ev.failures.length === 0 && ev.targetReached);
  }

  // Spawn through the real entry point over a temp six-app fixture tree.
  const fx = mkdtempSync(join(tmpdir(), 'uab-mount-'));
  try {
    const appNames = APPS.map((a) => a.name);
    for (const name of appNames) {
      mkdirSync(join(fx, name, 'src'), { recursive: true });
      // minimal empty file so walk finds something
      writeFileSync(join(fx, name, 'src', 'empty.ts'), 'export {}\n');
    }
    // Planted mount in business-suite-unified
    writeFileSync(
      join(fx, 'business-suite-unified', 'src', 'Shell.tsx'),
      "import { UpdateAvailableBanner } from '@bsuite/nav-core'\n" +
        'export function Shell() { return <UpdateAvailableBanner /> }\n',
    );
    // Docblock-only in crm7 (must count 0)
    writeFileSync(
      join(fx, 'crm7', 'src', 'Doc.tsx'),
      '/** @example <UpdateAvailableBanner /> */\nexport const x = 1\n',
    );
    // Test-file mount in conduit (must count 0)
    mkdirSync(join(fx, 'conduit', 'src', '__tests__'), { recursive: true });
    writeFileSync(
      join(fx, 'conduit', 'src', '__tests__', 'Banner.test.tsx'),
      "import { UpdateAvailableBanner } from '@bsuite/nav-core'\n" +
        'export function T() { return <UpdateAvailableBanner /> }\n',
    );

    const floorsAllZero = {
      floors: Object.fromEntries(appNames.map((n) => [n, 0])),
      target: {
        'business-suite-unified': 1,
        crm7: 1,
        conduit: 1,
        braden: 1,
        'R80.4': 2,
        throughput: 1,
      },
      banked_at: '2026-09-03',
      owner: 'self-test',
    };
    const floorsPath = join(fx, 'floors.json');
    writeFileSync(floorsPath, JSON.stringify(floorsAllZero));

    // Rise without re-bank: BSU has 1, floor 0 → exit 1
    {
      const r = spawnSync(
        process.execPath,
        [SCRIPT, `--floors=${floorsPath}`, `--apps-root=${fx}`],
        { encoding: 'utf8' },
      );
      t(
        'spawn: rise without re-bank exit 1',
        r.status === 1,
        `status=${r.status} err=${(r.stderr || '').slice(-200)}`,
      );
      t(
        'spawn: rise remedy names bank the rise',
        /bank the rise/.test(`${r.stdout}\n${r.stderr}`),
      );
    }

    // Bank the rise
    {
      const r = spawnSync(
        process.execPath,
        [SCRIPT, `--floors=${floorsPath}`, `--apps-root=${fx}`, '--update-baseline'],
        { encoding: 'utf8' },
      );
      t('spawn: --update-baseline exit 0', r.status === 0, `status=${r.status} ${(r.stderr || '').slice(-150)}`);
      const next = JSON.parse(readFileSync(floorsPath, 'utf8'));
      t(
        'spawn: floor for business-suite-unified banked to 1',
        next.floors['business-suite-unified'] === 1,
        JSON.stringify(next.floors),
      );
      t(
        'spawn: docblock and test mounts did not inflate crm7/conduit floors',
        next.floors.crm7 === 0 && next.floors.conduit === 0,
        JSON.stringify(next.floors),
      );
    }

    // Clean pass at banked floors
    {
      const r = spawnSync(
        process.execPath,
        [SCRIPT, `--floors=${floorsPath}`, `--apps-root=${fx}`],
        { encoding: 'utf8' },
      );
      t(
        'spawn: clean pass at banked floors exit 0',
        r.status === 0,
        `status=${r.status} out=${(r.stdout || '').slice(-250)} err=${(r.stderr || '').slice(-150)}`,
      );
      t(
        'spawn: table prints non-zero examined count',
        /source file\(s\) parsed/.test(r.stdout || '') || /source files parsed/.test(r.stdout || ''),
        (r.stdout || '').slice(-300),
      );
    }

    // Floor breach: raise BSU floor above count
    {
      const doc = JSON.parse(readFileSync(floorsPath, 'utf8'));
      doc.floors['business-suite-unified'] = 2;
      writeFileSync(floorsPath, JSON.stringify(doc));
      const r = spawnSync(
        process.execPath,
        [SCRIPT, `--floors=${floorsPath}`, `--apps-root=${fx}`],
        { encoding: 'utf8' },
      );
      t(
        'spawn: floor breach exit 1',
        r.status === 1 && /below floor/.test(`${r.stdout}\n${r.stderr}`),
        `status=${r.status}`,
      );
    }
  } finally {
    rmSync(fx, { recursive: true, force: true });
  }

  const bad = cases.filter((c) => !c.ok);
  console.log(
    `\ncheck-update-banner-mounted --self-test: ${cases.length - bad.length}/${cases.length} passed`,
  );
  process.exit(bad.length ? 1 : 0);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) {
    selfTest();
    return;
  }
  mainRun(argv);
}

let isMain = false;
try {
  isMain = realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
} catch {
  isMain =
    Boolean(process.argv[1]) &&
    fileURLToPath(import.meta.url) === join(process.argv[1]);
}
if (isMain) main();
