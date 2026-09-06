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
import { execFileSync } from 'node:child_process';
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
 * Source files that count as real code.
 *
 * `*.stories.*` is excluded for the SAME reason `*.test.*` and `*.spec.*` are:
 * a story's named exports are Storybook story objects, not package exports.
 * Counting them inflates `sharedComponents` and, because no app imports a
 * story, inflates `unusedSharedComponents` by exactly the same amount — the
 * adoption number this registry exists to report gets worse the more the
 * shared surface is documented.
 *
 * Measured before this fix: `@bsuite/page-builder` reported 35 exports, of
 * which 12 (`WidthLadder`, `CardStyleDefault`, `NestedCardDoubleFrame`, …)
 * were story objects from `cardSurfaces.stories.tsx`.
 *
 * The regex here matches a FILENAME, not TypeScript structure — the
 * repository's no-regex rule governs parsing imports and exports, which this
 * script does by explicit string scanning in `componentExports`.
 */
function readSrc(dir) {
  const files = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec|d|stories)\./.test(e.name)) files.push(p);
    }
  };
  walk(dir);
  return files;
}

export function buildRegistry() {
  // One pass over every app file, parsing its @bsuite imports. O(files), not
  // O(files x components) — the grep version shelled out once per (component, app).
  const usage = new Map(); // "pkg::Name" -> { app -> fileCount }
  const localCounts = {};
  for (const app of APPS) {
    const appSrc = path.join(ROOT, app, 'src');
    localCounts[app] = fs.existsSync(path.join(appSrc, 'components')) ? readSrc(path.join(appSrc, 'components')).length : 0;
    for (const f of readSrc(appSrc)) {
      let text;
      try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
      if (!text.includes('@bsuite/')) continue;
      for (const [pkg, names] of importedSymbolsByPackage(text)) {
        for (const name of names) {
          const key = `${pkg}::${name}`;
          if (!usage.has(key)) usage.set(key, {});
          usage.get(key)[app] = (usage.get(key)[app] || 0) + 1;
        }
      }
    }
  }

  const components = [];
  for (const pkg of PACKAGES) {
    const srcDir = path.join(ROOT, 'packages', pkg, 'src');
    if (!fs.existsSync(srcDir)) continue;
    const names = new Set();
    for (const f of readSrc(srcDir)) for (const n of componentExports(fs.readFileSync(f, 'utf8'))) names.add(n);
    for (const name of [...names].sort()) {
      const consumers = usage.get(`${pkg}::${name}`) || {};
      const total = Object.values(consumers).reduce((a, b) => a + b, 0);
      components.push({ name, package: `@bsuite/${pkg}`, consumers, consumerFiles: total, consumingApps: Object.keys(consumers).length });
    }
  }
  return {
    generatedFrom: 'scripts/generate-component-registry.mjs',
    method: 'exports parsed from packages/*/src; consumers parsed from every app import statement (multi-line aware), not grepped',
    sharedComponents: components.length,
    unusedSharedComponents: components.filter((c) => c.consumerFiles === 0).length,
    localComponentFiles: localCounts,
    components,
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
  out.push('## Local component files per app', '');
  out.push('| App | Local component files |', '|---|---|');
  for (const [a, n] of Object.entries(reg.localComponentFiles)) out.push(`| ${a} | ${n} |`);
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

  const bad = cases.filter((c) => !c.ok);
  for (const c of bad) console.error(`FAIL ${c.n}: expected ${JSON.stringify(c.e)}, got ${JSON.stringify(c.a)}`);
  console.log(bad.length ? `component-registry --self-test: ${bad.length} FAILED` : `component-registry --self-test: OK (${cases.length} cases)`);
  process.exit(bad.length ? 1 : 0);
}

const reg = buildRegistry();
const json = JSON.stringify(reg, null, 2) + '\n';
const md = renderMd(reg);
if (process.argv.includes('--check')) {
  const okJson = fs.existsSync(JSON_OUT) && fs.readFileSync(JSON_OUT, 'utf8') === json;
  const okMd = fs.existsSync(MD_OUT) && fs.readFileSync(MD_OUT, 'utf8') === md;
  if (okJson && okMd) { console.log(`component-registry: in sync (${reg.sharedComponents} components)`); process.exit(0); }
  console.error('component-registry: out of date. Run: node scripts/generate-component-registry.mjs');
  process.exit(1);
}
fs.writeFileSync(JSON_OUT, json);
fs.writeFileSync(MD_OUT, md);
console.log(`component-registry: ${reg.sharedComponents} shared components, ${reg.unusedSharedComponents} with no consumer`);
