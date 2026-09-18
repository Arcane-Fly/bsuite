#!/usr/bin/env node
/**
 * The COMPONENT registry — the estate's shared UI surface and who actually uses it.
 *
 * WHY. The feature index answers "what does this platform do". Nothing answered
 * "what is this platform BUILT FROM", and that is the question every one of the
 * recurring defects turns on. D8.1 asks for a sibling count; "fix the class, not
 * the page" needs to know what the class IS; and the estate has repeatedly
 * shipped a shared component that nothing consumes — @bsuite/data-grid sat at
 * ONE render site against 215 hand-rolled tables, and 19 of braden's 20 shadcn
 * tokens had zero readers. Both were invisible because nothing counted.
 *
 * A shared component with zero consumers is not a library, it is dead code with
 * a version number. This registry makes that countable.
 *
 * GENERATED, never hand-maintained — the parent feature index drifted 94 rows by
 * being hand-kept, and this surface is seven times larger.
 *
 *   node scripts/generate-component-registry.mjs           # write
 *   node scripts/generate-component-registry.mjs --check    # CI drift gate
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = path.join(ROOT, 'docs/00-roadmap/bsuite-component-registry.json');
const MD_OUT = path.join(ROOT, 'docs/00-roadmap/BSUITE-COMPONENT-REGISTRY.md');

const PACKAGES = ['ui', 'data-grid', 'page-builder', 'nav-core', 'theme', 'schema-builder', 'jodie', 'auth', 'data-export', 'workflow-canvas'];
const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4'];

/** An exported symbol that looks like a React component: PascalCase. */
export function componentExports(srcText) {
  const out = new Set();
  for (const m of srcText.matchAll(/^export\s+(?:declare\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/gm)) out.add(m[1]);
  for (const m of srcText.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop().trim();
      if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) out.add(name);
    }
  }
  return [...out];
}

/**
 * Which symbols each app file imports from each @bsuite package.
 *
 * PARSED, NOT GREPPED, and that distinction is the whole accuracy of this file.
 * The first cut matched `import[^;]*\bName\b[^;]*from '@bsuite/ui'` with grep,
 * which is line-oriented — so it saw only SINGLE-LINE imports. Multi-line
 * imports are the normal form once a file pulls in more than two symbols, so
 * the count silently excluded most real usage: `Button` was reported with ZERO
 * consumers while being mentioned in 702 files. Publishing that would have
 * marked 123 live components as dead code.
 */
function importedSymbolsByPackage(fileText) {
  const map = new Map();
  // `import { A, B as C } from '@bsuite/pkg'` — the [\s\S] class is what lets
  // the brace block span newlines, which is exactly what grep could not do.
  for (const m of fileText.matchAll(/import\s*(?:type\s*)?\{([\s\S]*?)\}\s*from\s*['"]@bsuite\/([a-z-]+)['"]/g)) {
    const pkg = m[2];
    if (!map.has(pkg)) map.set(pkg, new Set());
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, '').trim();
      if (name) map.get(pkg).add(name);
    }
  }
  // `import Default from '@bsuite/pkg'`
  for (const m of fileText.matchAll(/import\s+([A-Z][A-Za-z0-9_]*)\s*(?:,\s*\{[\s\S]*?\}\s*)?from\s*['"]@bsuite\/([a-z-]+)['"]/g)) {
    const pkg = m[2];
    if (!map.has(pkg)) map.set(pkg, new Set());
    map.get(pkg).add(m[1]);
  }
  return map;
}

/**
 * Source files that count as real code — AND whether the tree could be READ at all.
 *
 * THE DEFECT THIS SHAPE EXISTS TO KILL. The previous `readSrc` opened with
 * `if (!fs.existsSync(d)) return;` and returned a bare array. An app whose
 * submodule was never checked out therefore produced `[]`, byte-identical to an
 * app that genuinely imports nothing — so "I could not read this app" and "this
 * app uses nothing" became the same number. Downstream, `localComponentFiles`
 * substituted a literal `0` for the unavailable app on the same reasoning.
 *
 * That is not hypothetical and it is not once. The committed artifact was found
 * carrying the empty-tree answer THREE times:
 *
 *   527bc9a3e  201 of 201 shared components "no consumer", all six apps 0
 *   241ea0c42  182 of 182 "no consumer", all six apps 0 (undone by 6a6ae01e8,
 *              whose subject is literally "drop broken registry")
 *   320ec5365  181 of 195 "no consumer" — crm7 measured 443, the other FIVE 0
 *
 * The last one is the important one: a PARTIAL gap reads as a plausible number.
 * A registry whose stated purpose is "a shared component nothing imports is dead
 * code with a version number" had, in that state, nominated almost the entire
 * shared surface for deletion.
 *
 * So the scan now reports three things a caller cannot confuse: the files it
 * read, the paths it could NOT read, and whether the root existed at all.
 *
 * `*.stories.*` is excluded for the SAME reason `*.test.*` and `*.spec.*` are:
 * a story's named exports are Storybook story objects, not package exports.
 * Counting them inflates `sharedComponents` and, because no app imports a
 * story, inflates `unusedSharedComponents` by exactly the same amount — the
 * adoption number this registry exists to report gets worse the more the
 * shared surface is documented.
 *
 * Measured before that fix: `@bsuite/page-builder` reported 35 exports, of
 * which 12 (`WidthLadder`, `CardStyleDefault`, `NestedCardDoubleFrame`, …)
 * were story objects from `cardSurfaces.stories.tsx`.
 *
 * The regex here matches a FILENAME, not TypeScript structure — the
 * repository's no-regex rule governs parsing imports and exports, which this
 * script does by explicit string scanning in `componentExports`.
 */
function scanSrc(dir) {
  const files = [];
  const unreadable = [];
  let rootExists = true;
  const rel = (p) => path.relative(ROOT, p) || '.';
  const walk = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (err) {
      const code = (err && err.code) || 'EUNKNOWN';
      // A missing ROOT is "this app is not here" — a coverage question the
      // caller classifies. A missing or unreadable path BELOW the root, and an
      // unreadable root, are instrument failures: record them by name.
      if (d === dir && code === 'ENOENT') rootExists = false;
      else unreadable.push(`${rel(d)} (${code})`);
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec|d|stories)\./.test(e.name)) files.push(p);
    }
  };
  walk(dir);
  return { files, unreadable, rootExists };
}

/**
 * Probe the directory itself: how many entries it holds, or WHY it could not be
 * counted.
 *
 * The error CODE is half the answer. A bare `catch { return null; }` collapsed
 * ENOENT and EACCES into one value, so `classifyCoverage` described an app root
 * that is plainly present, merely unreadable, as "does not exist". That failed
 * CLOSED — no count was ever wrong — but this file exists because silence made
 * a false green possible, and a gap report that misnames the gap sends whoever
 * reads it to the wrong fix.
 */
function dirEntryCount(dir) {
  try { return { count: fs.readdirSync(dir).length, code: null }; }
  catch (err) { return { count: null, code: (err && err.code) || 'EUNKNOWN' }; }
}

/**
 * Turn a raw probe of one declared source root into an availability verdict.
 *
 * PURE, so the self-test can exercise every branch without a filesystem — the
 * classification IS the guard, and a guard whose branches are never executed is
 * a comment. `available: false` is fail-closed by construction: every reason
 * below stops the artifact being written, none of them degrades to a zero.
 *
 * `no-source-files` is deliberately treated as UNAVAILABLE rather than as a
 * measured zero. Every declared app here is a substantial React application
 * (the smallest, R80.4, still carries source under `src/`), so "the directory
 * is there but holds no .ts/.tsx" describes a broken checkout, not a finding.
 * Choosing the other way is precisely the substitution this file exists to
 * refuse.
 */
export function classifyCoverage(probe) {
  const { name, entryCount, entryError, rootExists, sourceFiles, unreadable, missingSubRoots } = probe;
  const verdict = (reason, detail) => ({ name, available: false, reason, detail });
  // A fact the probe never reported is not a fact in this file's favour. Every
  // branch below is fail-closed; a caller that forgets to measure one of the
  // declared roots must not be the single path that reads as `ok`.
  if (!Array.isArray(missingSubRoots)) {
    return verdict('probe-incomplete', `${name}: the probe did not report which declared sub-roots were present`);
  }
  if (entryCount === null) {
    // ENOENT is "this source is not here". Any other code is an instrument
    // failure over a directory that DOES exist, and calling that "does not
    // exist" is the same substitution this file refuses one level up.
    if (entryError === 'ENOENT') return verdict('absent', `${name}/ does not exist`);
    return verdict('unreadable', `${name}/ is present but could not be read (${entryError || 'the probe reported no error code'})`);
  }
  if (entryCount === 0) return verdict('not-initialised', `${name}/ is an empty directory — the submodule was never checked out`);
  if (unreadable && unreadable.length) {
    const shown = unreadable.slice(0, 3).join(', ');
    return verdict('unreadable', `could not read ${unreadable.length} path(s): ${shown}${unreadable.length > 3 ? ', …' : ''}`);
  }
  if (!rootExists) return verdict('no-src-directory', `${name}/src does not exist`);
  if (sourceFiles === 0) return verdict('no-source-files', `${name}/src exists but holds no .ts/.tsx source files`);
  // THE THIRD INSTANCE OF THIS FILE'S OWN CLASS, found by review of the commit
  // that closed the first two. `src` was classified; the `src/components` root
  // one level down was scanned and its `rootExists` thrown away, so a missing
  // components directory reached `localComponentFiles` as a literal 0 — a
  // directory that could not be read, published as a measured zero, in the very
  // artifact this file exists to keep honest. Latent while all six apps carry
  // `src/components`; one app-router move from live.
  if (missingSubRoots.length) {
    return verdict('missing-subtree', `${name}: ${missingSubRoots.join(', ')} does not exist — its file count would be a measured zero for a directory that is not there`);
  }
  return { name, available: true, reason: 'ok', detail: null };
}

/**
 * The gap report. NAMES the declared sources that could not be read.
 *
 * Silence is what made the false green possible, so this is the loud half of
 * the fix and its TEXT is asserted in the self-test, not merely its existence:
 * a guard tested only by exit code can stop naming the thing it caught and
 * still look green.
 */
export function gapReport(coverage) {
  const gaps = coverage.filter((c) => !c.available);
  if (!gaps.length) return '';
  const width = Math.max(...gaps.map((g) => g.name.length));
  const out = [
    `component-registry: REFUSING TO REPORT — ${gaps.length} of ${coverage.length} declared sources could not be read.`,
    '',
  ];
  for (const g of gaps) out.push(`  ${g.name.padEnd(width)}  ${g.reason.padEnd(16)}  ${g.detail}`);
  out.push(
    '',
    'A source that could not be READ is not a source that uses NOTHING. Reporting one',
    'as the other is how this artifact shipped "201 of 201 shared components have no',
    'consumer" (527bc9a3e), "182 of 182" (241ea0c42) and "181 of 195" (320ec5365).',
    'Counts produced in this state must not support any deletion, archive or',
    'deprecation decision.',
    '',
    'Fix: git submodule update --init --recursive',
  );
  return out.join('\n');
}

/**
 * THE CONTENT GATE. What a committed artifact must ASSERT about itself.
 *
 * `--check` used to be a text comparison, and a text comparison cannot see this
 * failure: inside an empty-submodule tree the regenerated file and the
 * committed file AGREE — both hold the zeros — so the check exits 0 and reports
 * "in sync". The exit code was never the gate. This is.
 *
 * The last complaint is the shipped signature itself: an artifact in which
 * EVERY shared component is unused is, at this estate's scale, a statement that
 * the scan saw no app source at all.
 */
export function artifactComplaints(reg, declaredApps = APPS) {
  if (!reg || typeof reg !== 'object' || Array.isArray(reg)) return ['artifact is not a JSON object'];
  const out = [];
  if (reg.coverageComplete !== true) {
    out.push('coverageComplete is not true — the artifact does not assert that every declared source was read');
  }
  for (const key of ['unavailableApps', 'unavailablePackages']) {
    const v = reg[key];
    if (!Array.isArray(v)) out.push(`${key} is missing — written by a generator that could not tell absence from a measured zero`);
    else if (v.length) out.push(`${key} is non-empty: ${v.join(', ')}`);
  }
  const local = reg.localComponentFiles && typeof reg.localComponentFiles === 'object' ? reg.localComponentFiles : {};
  for (const app of declaredApps) {
    if (!Object.prototype.hasOwnProperty.call(local, app)) out.push(`localComponentFiles has no entry for declared app ${app}`);
    else if (!Number.isFinite(local[app])) out.push(`localComponentFiles.${app} is ${JSON.stringify(local[app])}, not a measured count`);
  }
  if (Number.isFinite(reg.sharedComponents) && reg.sharedComponents > 0 && reg.unusedSharedComponents === reg.sharedComponents) {
    out.push(`all ${reg.sharedComponents} shared components are classified unused — the signature of a registry generated with no app sources`);
  }
  return out;
}

export function buildRegistry() {
  // One pass over every app file, parsing its @bsuite imports. O(files), not
  // O(files x components) — the grep version shelled out once per (component, app).
  const usage = new Map(); // "pkg::Name" -> { app -> fileCount }
  const localCounts = {};
  const appCoverage = {};
  const coverage = [];
  for (const app of APPS) {
    const appRoot = path.join(ROOT, app);
    const appSrc = path.join(appRoot, 'src');
    const scan = scanSrc(appSrc);
    const componentScan = scanSrc(path.join(appSrc, 'components'));
    const unreadable = [...scan.unreadable, ...componentScan.unreadable];
    for (const f of scan.files) {
      let text;
      // An unreadable FILE is the same lie one level down: skipping it silently
      // drops every import it declared. Record it so classifyCoverage refuses.
      try { text = fs.readFileSync(f, 'utf8'); } catch (err) { unreadable.push(`${path.relative(ROOT, f)} (${(err && err.code) || 'EUNKNOWN'})`); continue; }
      if (!text.includes('@bsuite/')) continue;
      for (const [pkg, names] of importedSymbolsByPackage(text)) {
        for (const name of names) {
          const key = `${pkg}::${name}`;
          if (!usage.has(key)) usage.set(key, {});
          usage.get(key)[app] = (usage.get(key)[app] || 0) + 1;
        }
      }
    }
    const appEntries = dirEntryCount(appRoot);
    const verdict = classifyCoverage({
      name: app,
      entryCount: appEntries.count,
      entryError: appEntries.code,
      rootExists: scan.rootExists,
      sourceFiles: scan.files.length,
      unreadable,
      // `src/components` is a DECLARED root here — its file count is what gets
      // published as `localComponentFiles` — so whether it EXISTS is carried
      // into the verdict instead of arriving as `componentScan.files.length`
      // being 0. Scanning a root and discarding its `rootExists` is how the
      // measured-zero substitution survived one level down.
      missingSubRoots: componentScan.rootExists ? [] : ['src/components'],
    });
    coverage.push(verdict);
    // `null`, NEVER 0, when the app was not measured — and "not measured" now
    // includes an absent src/components, which the verdict above refuses.
    localCounts[app] = verdict.available ? componentScan.files.length : null;
    appCoverage[app] = {
      available: verdict.available,
      reason: verdict.reason,
      detail: verdict.detail,
      sourceFiles: verdict.available ? scan.files.length : null,
      componentFiles: localCounts[app],
    };
  }

  const components = [];
  const packageCoverage = {};
  for (const pkg of PACKAGES) {
    // The identical tolerance lived three lines away, as `if (!fs.existsSync(srcDir)) continue;`
    // — a declared package that vanished dropped its exports and shrank
    // `sharedComponents` with no signal. Same class, same treatment.
    const pkgRoot = path.join(ROOT, 'packages', pkg);
    const scan = scanSrc(path.join(pkgRoot, 'src'));
    const names = new Set();
    const unreadable = [...scan.unreadable];
    for (const f of scan.files) {
      let text;
      try { text = fs.readFileSync(f, 'utf8'); } catch (err) { unreadable.push(`${path.relative(ROOT, f)} (${(err && err.code) || 'EUNKNOWN'})`); continue; }
      for (const n of componentExports(text)) names.add(n);
    }
    const pkgEntries = dirEntryCount(pkgRoot);
    const verdict = classifyCoverage({
      name: `packages/${pkg}`,
      entryCount: pkgEntries.count,
      entryError: pkgEntries.code,
      rootExists: scan.rootExists,
      sourceFiles: scan.files.length,
      unreadable,
      // A package declares ONE root, `src`, and it is classified above. Stated
      // rather than omitted, because an omitted probe field is refused.
      missingSubRoots: [],
    });
    coverage.push(verdict);
    packageCoverage[`@bsuite/${pkg}`] = {
      available: verdict.available,
      reason: verdict.reason,
      detail: verdict.detail,
      sourceFiles: verdict.available ? scan.files.length : null,
      exports: verdict.available ? names.size : null,
    };
    if (!verdict.available) continue;
    for (const name of [...names].sort()) {
      const consumers = usage.get(`${pkg}::${name}`) || {};
      const total = Object.values(consumers).reduce((a, b) => a + b, 0);
      components.push({ name, package: `@bsuite/${pkg}`, consumers, consumerFiles: total, consumingApps: Object.keys(consumers).length });
    }
  }

  const unavailableApps = APPS.filter((a) => !appCoverage[a].available);
  const unavailablePackages = PACKAGES.filter((p) => !packageCoverage[`@bsuite/${p}`].available).map((p) => `@bsuite/${p}`);
  return {
    generatedFrom: 'scripts/generate-component-registry.mjs',
    method: 'exports parsed from packages/*/src; consumers parsed from every app import statement (multi-line aware), not grepped',
    coverageContract: 'every declared source must be READABLE and every declared root must EXIST — for an app that is both `src` and the `src/components` whose file count is published as localComponentFiles. A source that could not be read, and a declared root that is not there, are reported as unavailable and BLOCK generation; neither is ever counted as zero. localComponentFiles is null, never 0, for an app that was not measured.',
    coverageComplete: coverage.every((c) => c.available),
    declaredApps: [...APPS],
    unavailableApps,
    unavailablePackages,
    appCoverage,
    packageCoverage,
    sharedComponents: components.length,
    unusedSharedComponents: components.filter((c) => c.consumerFiles === 0).length,
    localComponentFiles: localCounts,
    components,
    // Kept LAST and read by gapReport so the failure text can name every gap
    // with its reason, not just count them.
    coverage,
  };
}

export function renderMd(reg) {
  const dead = reg.components.filter((c) => c.consumerFiles === 0);
  const used = reg.components.filter((c) => c.consumerFiles > 0).sort((a, b) => b.consumerFiles - a.consumerFiles);
  const out = [];
  out.push('---', 'kind: standard', 'authority: engineering', 'owner: bsuite', 'evidence:', '  - scripts/generate-component-registry.mjs', '---', '');
  out.push('# BSuite — component registry', '');
  out.push('Generated by `scripts/generate-component-registry.mjs`. Edit the code, not this file.', '');
  out.push(`**${reg.sharedComponents} shared components · ${reg.sharedComponents - dead.length} consumed · ${dead.length} with no consumer**`, '');
  out.push('A shared component nothing imports is not a library — it is dead code with a version number. This table is the denominator for "fix the class, not the page".', '');
  out.push('## Source coverage', '');
  out.push('Every count below is a MEASUREMENT, not a default. Generation refuses to write this file while any declared source is unreadable or any declared root is missing — including an app whose `src/components` is absent — because a directory that could not be read is not a directory that holds nothing. See `scripts/generate-component-registry.mjs`.', '');
  out.push('| App | Read | Local component files |', '|---|---|---|');
  for (const app of reg.declaredApps) {
    const c = reg.appCoverage[app];
    out.push(`| ${app} | ${c.available ? 'yes' : `NO — ${c.reason}`} | ${c.componentFiles === null ? 'not measured' : c.componentFiles} |`);
  }
  out.push('');
  out.push('## Shared components with NO consumer', '');
  if (dead.length === 0) out.push('None — every shared component is imported somewhere.', '');
  else {
    out.push('| Component | Package |', '|---|---|');
    for (const c of dead) out.push(`| \`${c.name}\` | ${c.package} |`);
    out.push('');
  }
  out.push('## Shared components in use', '');
  out.push('| Component | Package | Files importing | Apps |', '|---|---|---|---|');
  for (const c of used) out.push(`| \`${c.name}\` | ${c.package} | ${c.consumerFiles} | ${Object.keys(c.consumers).join(', ')} |`);
  return out.join('\n') + '\n';
}

if (process.argv.includes('--self-test')) {
  const cases = [];
  const t = (n, a, e) => cases.push({ n, ok: JSON.stringify(a) === JSON.stringify(e), a, e });
  t('exports: a function export is found', componentExports('export function Foo() {}'), ['Foo']);
  t('exports: a const export is found', componentExports('export const Bar = () => {}'), ['Bar']);
  t('exports: lowercase is not a component', componentExports('export function useThing() {}'), []);
  t('exports: a brace re-export is found', componentExports('export { Baz }'), ['Baz']);
  t('exports: an aliased re-export uses the EXPORTED name, not the local one',
    componentExports('export { Inner as Outer }'), ['Outer']);
  t('exports: a type-only lowercase name is still excluded', componentExports('export const x = 1'), []);
  // Story objects are not package exports. Guards the count-inflation above.
  t('exports: a story export is still parsed as an export by componentExports',
    componentExports('export const WidthLadder = {}'), ['WidthLadder']);
  t('exports: duplicates across forms collapse',
    componentExports('export function Dup() {}\nexport { Dup }'), ['Dup']);
  const imp = (txt, pkg) => [...(importedSymbolsByPackage(txt).get(pkg) || [])].sort();
  t('imports: a single-line import is read', imp("import { A } from '@bsuite/ui'", 'ui'), ['A']);
  // THE REGRESSION. A multi-line import is the normal form and the grep version
  // could not see it, which is how Button read as having zero consumers.
  t('imports: a MULTI-LINE import is read',
    imp("import {\n  A,\n  B,\n} from '@bsuite/ui'", 'ui'), ['A', 'B']);
  t('imports: an alias is recorded under the SOURCE name, which is what the package exports',
    imp("import { A as Local } from '@bsuite/ui'", 'ui'), ['A']);
  t('imports: a type-only import still counts as usage',
    imp("import type { A } from '@bsuite/ui'", 'ui'), ['A']);
  t('imports: a default import is read', imp("import Thing from '@bsuite/ui'", 'ui'), ['Thing']);
  t('imports: another package is not attributed to this one',
    imp("import { A } from '@bsuite/nav-core'", 'ui'), []);
  t('imports: a non-bsuite import is ignored', imp("import { A } from 'react'", 'ui'), []);

  // ---- COVERAGE. Absence must not be readable as a measured zero. ----
  const ok = { name: 'crm7', entryCount: 12, entryError: null, rootExists: true, sourceFiles: 451, unreadable: [], missingSubRoots: [] };
  t('coverage: a populated app is available', classifyCoverage(ok).available, true);
  t('coverage: an EMPTY app directory is an uninitialised submodule, not an app that uses nothing',
    classifyCoverage({ ...ok, entryCount: 0, rootExists: false, sourceFiles: 0 }).reason, 'not-initialised');
  t('coverage: a missing app directory is absent',
    classifyCoverage({ ...ok, entryCount: null, entryError: 'ENOENT', rootExists: false, sourceFiles: 0 }).reason, 'absent');
  t('coverage: an app present but without src is a gap, NOT zero consumers',
    classifyCoverage({ ...ok, rootExists: false, sourceFiles: 0 }).reason, 'no-src-directory');
  t('coverage: an UNREADABLE path fails even when other files were read',
    classifyCoverage({ ...ok, unreadable: ['crm7/src/x (EACCES)'] }).reason, 'unreadable');
  t('coverage: a src directory holding no source files is a gap, not a measured zero',
    classifyCoverage({ ...ok, sourceFiles: 0 }).reason, 'no-source-files');
  t('coverage: unreadable outranks a plausible file count',
    classifyCoverage({ ...ok, unreadable: ['a (EACCES)'] }).available, false);
  // A ROOT THAT EXISTS AND CANNOT BE READ IS NOT AN ABSENT ROOT. Both fail
  // closed, so this is the message, not the gate — but the gap report is the
  // loud half of this fix and a gap it misnames is a gap nobody finds.
  t('coverage: an app root that EXISTS but cannot be read is unreadable, not absent',
    classifyCoverage({ ...ok, entryCount: null, entryError: 'EACCES' }).reason, 'unreadable');
  t('coverage: and it does not tell the reader that directory does not exist',
    classifyCoverage({ ...ok, entryCount: null, entryError: 'EACCES' }).detail.includes('does not exist'), false);
  t('coverage: an uncountable root with no error code reported still fails closed',
    classifyCoverage({ ...ok, entryCount: null, entryError: undefined }).available, false);
  // THE THIRD INSTANCE. src/components is published as localComponentFiles, so
  // its absence must not arrive at the artifact as the number 0.
  t('coverage: a missing src/components is a gap, NOT a local component count of zero',
    classifyCoverage({ ...ok, missingSubRoots: ['src/components'] }).reason, 'missing-subtree');
  t('coverage: which makes the app unavailable, so its count is written null',
    classifyCoverage({ ...ok, missingSubRoots: ['src/components'] }).available, false);
  t('coverage: and the gap report names the subtree, not just the app',
    classifyCoverage({ ...ok, missingSubRoots: ['src/components'] }).detail.includes('src/components'), true);
  t('coverage: a probe that never reported its sub-roots fails closed instead of reading as ok',
    classifyCoverage({ name: 'crm7', entryCount: 12, entryError: null, rootExists: true, sourceFiles: 451, unreadable: [] }).reason,
    'probe-incomplete');

  // ---- THE GAP REPORT MUST NAME THE APP. Exit codes do not name anything. ----
  const gapText = gapReport([
    classifyCoverage(ok),
    classifyCoverage({ name: 'conduit', entryCount: 0, entryError: null, rootExists: false, sourceFiles: 0, unreadable: [], missingSubRoots: [] }),
  ]);
  t('gap report: names the app that could not be read', gapText.includes('conduit'), true);
  t('gap report: does NOT name an app that was read fine', gapText.includes('crm7'), false);
  t('gap report: states the reason', gapText.includes('not-initialised'), true);
  t('gap report: counts the gap against the declared total', gapText.includes('1 of 2 declared sources'), true);
  t('gap report: tells the reader how to fix it', gapText.includes('git submodule update --init --recursive'), true);
  t('gap report: is EMPTY when every declared source was read', gapReport([classifyCoverage(ok)]), '');

  // ---- THE CONTENT GATE. A committed artifact must assert its own completeness. ----
  const goodArtifact = {
    coverageComplete: true, unavailableApps: [], unavailablePackages: [],
    sharedComponents: 201, unusedSharedComponents: 130,
    localComponentFiles: { crm7: 451, 'business-suite-unified': 119, conduit: 100, braden: 208, throughput: 91, 'R80.4': 6 },
  };
  t('content gate: a complete artifact has no complaints', artifactComplaints(goodArtifact), []);
  // THE SHIPPED ARTIFACT at 527bc9a3e, verbatim in shape. It must be rejected.
  const shipped = {
    sharedComponents: 201, unusedSharedComponents: 201,
    localComponentFiles: { crm7: 0, 'business-suite-unified': 0, conduit: 0, braden: 0, throughput: 0, 'R80.4': 0 },
  };
  const shippedComplaints = artifactComplaints(shipped);
  t('content gate: the artifact shipped at 527bc9a3e is REJECTED', shippedComplaints.length > 0, true);
  t('content gate: it is rejected for not asserting coverage',
    shippedComplaints.some((c) => c.includes('coverageComplete')), true);
  t('content gate: it is rejected for the all-unused signature',
    shippedComplaints.some((c) => c.includes('all 201 shared components are classified unused')), true);
  t('content gate: an artifact from the OLD generator is rejected on the missing field',
    artifactComplaints({ ...goodArtifact, unavailableApps: undefined }).some((c) => c.includes('unavailableApps is missing')), true);
  t('content gate: a null local count is not a measured count',
    artifactComplaints({ ...goodArtifact, localComponentFiles: { ...goodArtifact.localComponentFiles, conduit: null } })
      .some((c) => c.includes('localComponentFiles.conduit is null')), true);
  t('content gate: a declared app absent from the artifact is caught',
    artifactComplaints({ ...goodArtifact, localComponentFiles: { crm7: 451 } })
      .some((c) => c.includes('no entry for declared app conduit')), true);
  t('content gate: a non-empty unavailableApps is caught by name',
    artifactComplaints({ ...goodArtifact, unavailableApps: ['throughput'] })
      .some((c) => c.includes('throughput')), true);

  // ---- WIRING. The cases above prove the CLASSIFIERS. Nothing proved they were
  // CALLED, and a guard that is not called is a comment with a test suite.
  //
  // MUTATION-TESTED 2026-09-10 against the parent commit: with the generation
  // gap-refusal block deleted AND `localCounts[app] = componentScan.files.length`
  // restored — the original defect, verbatim — `--self-test` still printed
  // "OK (36 cases)" and exited 0. CI runs only --self-test and --check, so a
  // removal of the whole guard would have shipped green. These cases spawn the
  // REAL script over a REAL temp tree, so the wiring is what is under test.
  const SELF = fileURLToPath(import.meta.url);
  const wiringRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'component-registry-wiring-'));
  const w = (...parts) => path.join(wiringRoot, ...parts);
  const write = (rel, text) => {
    const abs = w(rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  };
  try {
    // A minimal but COMPLETE estate: every declared package exports one
    // component, every declared app imports all of them and carries its own
    // src/components.
    fs.mkdirSync(w('scripts'), { recursive: true });
    fs.copyFileSync(SELF, w('scripts', path.basename(SELF)));
    fs.mkdirSync(w('docs', '00-roadmap'), { recursive: true });
    const sym = (n) => 'X' + n.replace(/[^A-Za-z]/g, '');
    for (const pkg of PACKAGES) write(`packages/${pkg}/src/index.tsx`, `export function ${sym(pkg)}() {}\n`);
    const appFile = PACKAGES.map((pkg) => `import { ${sym(pkg)} } from '@bsuite/${pkg}';`).join('\n') + '\nexport const Page = 1;\n';
    for (const app of APPS) {
      write(`${app}/src/app.tsx`, appFile);
      write(`${app}/src/components/local.tsx`, `export function Local${sym(app)}() {}\n`);
    }
    const run = () => spawnSync(process.execPath, [w('scripts', path.basename(SELF))], { encoding: 'utf8' });
    const artifact = w('docs', '00-roadmap', 'bsuite-component-registry.json');

    // POSITIVE CONTROL FIRST. Without it, every refusal below is green for the
    // wrong reason — a script that refuses everything passes them all.
    const complete = run();
    t('wiring: a COMPLETE tree actually generates', complete.status, 0);
    const reg = fs.existsSync(artifact) ? JSON.parse(fs.readFileSync(artifact, 'utf8')) : null;
    t('wiring: and the artifact it wrote asserts complete coverage', reg && reg.coverageComplete, true);
    t('wiring: and every declared app carries a measured count',
      reg !== null && APPS.every((a) => Number.isFinite(reg.localComponentFiles[a])), true);
    const written = fs.readFileSync(artifact, 'utf8');

    // THE REFUSAL, END TO END. One declared app absent.
    fs.renameSync(w('conduit'), w('.conduit-moved'));
    const absent = run();
    t('wiring: an ABSENT declared app makes generation exit non-zero', absent.status, 1);
    t('wiring: and the refusal NAMES the app', absent.stderr.includes('conduit'), true);
    t('wiring: and states the reason', absent.stderr.includes('absent'), true);
    t('wiring: and it wrote nothing on the way out', fs.readFileSync(artifact, 'utf8'), written);
    fs.renameSync(w('.conduit-moved'), w('conduit'));

    // THE THIRD INSTANCE, END TO END. src present, src/components absent. This
    // exact tree generated exit 0 with localComponentFiles.conduit = 0 at the
    // parent commit, and --check agreed: "in sync ... all 6 declared apps read".
    fs.rmSync(w('conduit', 'src', 'components'), { recursive: true, force: true });
    const noComponents = run();
    t('wiring: a missing src/components makes generation exit non-zero', noComponents.status, 1);
    t('wiring: and the refusal names the app', noComponents.stderr.includes('conduit'), true);
    t('wiring: and names the subtree it could not read', noComponents.stderr.includes('src/components'), true);
    t('wiring: and no measured zero was written for it', fs.readFileSync(artifact, 'utf8'), written);
  } finally {
    fs.rmSync(wiringRoot, { recursive: true, force: true });
  }

  const bad = cases.filter((c) => !c.ok);
  for (const c of bad) console.error(`FAIL ${c.n}: expected ${JSON.stringify(c.e)}, got ${JSON.stringify(c.a)}`);
  console.log(bad.length ? `component-registry --self-test: ${bad.length} FAILED` : `component-registry --self-test: OK (${cases.length} cases)`);
  process.exit(bad.length ? 1 : 0);
}

const reg = buildRegistry();

// GENERATION FAILS ON A GAP. Writing a registry from a tree it could not read is
// what produced every false artifact in this file's history; there is no flag to
// override it, because the override is what would get used.
const gaps = gapReport(reg.coverage);
if (gaps) {
  console.error(gaps);
  process.exit(1);
}

const json = JSON.stringify(reg, null, 2) + '\n';
const md = renderMd(reg);
const rel = (p) => path.relative(ROOT, p);
if (process.argv.includes('--check')) {
  // THE ARTIFACT'S CONTENT IS THE GATE, NOT THIS COMPARISON'S EXIT CODE.
  // In a tree with no app sources the regenerated file and the committed file
  // AGREE — both hold the zeros — so a text compare exits 0 and prints
  // "in sync". That is exactly how the false green shipped. The live-coverage
  // check above already refuses that tree; this refuses a committed artifact
  // that was produced in one, even from a tree that is now complete.
  if (!fs.existsSync(JSON_OUT)) {
    console.error(`component-registry: artifact missing — ${rel(JSON_OUT)}`);
    process.exit(1);
  }
  let onDisk;
  try { onDisk = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')); }
  catch (err) { console.error(`component-registry: ${rel(JSON_OUT)} is not parseable JSON — ${err.message}`); process.exit(1); }
  const complaints = artifactComplaints(onDisk);
  if (complaints.length) {
    console.error(`component-registry: the COMMITTED artifact fails its content gate — ${rel(JSON_OUT)}`);
    for (const c of complaints) console.error(`  - ${c}`);
    console.error('Counts in this state must not support any deletion, archive or deprecation decision.');
    console.error('Fix: git submodule update --init --recursive && node scripts/generate-component-registry.mjs');
    process.exit(1);
  }
  const okJson = fs.readFileSync(JSON_OUT, 'utf8') === json;
  const okMd = fs.existsSync(MD_OUT) && fs.readFileSync(MD_OUT, 'utf8') === md;
  if (okJson && okMd) {
    console.log(`component-registry: in sync (${reg.sharedComponents} components, all ${reg.declaredApps.length} declared apps read)`);
    process.exit(0);
  }
  console.error('component-registry: out of date. Run: node scripts/generate-component-registry.mjs');
  process.exit(1);
}
fs.writeFileSync(JSON_OUT, json);
fs.writeFileSync(MD_OUT, md);
console.log(`component-registry: ${reg.sharedComponents} shared components, ${reg.unusedSharedComponents} with no consumer, all ${reg.declaredApps.length} declared apps read`);
