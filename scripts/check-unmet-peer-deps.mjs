#!/usr/bin/env node
/**
 * check-unmet-peer-deps.mjs — an app that consumes a `@bsuite/*` package must
 * satisfy that package's peer dependencies, or the app throws at runtime on a
 * path no compiler, linter, test or build can see.
 *
 * WHY THIS EXISTS
 *
 * On 2026-08-19 the R80.4 lane reported this, and it is the clearest example
 * the estate has produced of a defect that every static gate is blind to:
 *
 *   r8.crm7.app threw "No QueryClient set, use QueryClientProvider to set one"
 *   the moment a session existed. The calculator did not render AT ALL. R8
 *   worked signed OUT and was blank signed IN, for every signed-in user, on
 *   every page load.
 *
 * The chain: `AppShell` renders `src/config/navigation.ts`, which calls
 * `useTenantNavigation` from `@bsuite/schema-registry/react`. That package
 * declares `@tanstack/react-query: ^5` as a PEER dependency — a requirement the
 * CONSUMER installs. R80.4 never installed it, and the hook throws on first
 * render.
 *
 * WHY SIX GATES MISSED IT, which is the transferable part:
 *
 *   typecheck  the hook's types resolve fine; the provider is a RUNTIME
 *              requirement and invisible to the compiler
 *   eslint     nothing is lexically wrong
 *   tests      no test signs in and renders the shell
 *   build      Vite bundles a missing provider without complaint
 *   DoD        18 benchmarks, none about dependency contracts
 *   pnpm       DOES warn about the unmet peer — at install time, in output no
 *              gate reads and every human scrolls past
 *
 * It was found by signing in to production as a real user. That is the only
 * thing that found it.
 *
 * WHY A PARENT GATE RATHER THAN SIX COPIES
 *
 * The R80.4 lane shipped `scripts/check-peer-deps.mjs` in its own repo and
 * offered it to the other five apps verbatim. Six copies of a script drift —
 * this estate has the receipts, in a path-keyed allowlist that died loudly on a
 * rename and silently on a delete. One parent gate reads every app at the
 * recorded gitlink and cannot fall out of step with itself.
 *
 * STRICTNESS, AND WHY IT MATTERS HERE
 *
 * A peer counts as satisfied only when the APP declares it, or when it is
 * present in the APP'S OWN `node_modules`. A hoisted copy in the repo root does
 * NOT count: react-query existed elsewhere in this estate the whole time R8 was
 * down. Resolving against the root would have called that outage clean.
 *
 * NO `paths:` FILTER on the workflow — same two reasons as the sibling gates:
 * the change that breaks this arrives inside a SUBMODULE and the parent tree
 * holds only a gitlink, so a path filter can never match it; and a
 * path-filtered required check never reports on a PR that misses the filter,
 * so the PR waits forever.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Apps are DERIVED from .gitmodules. A hardcoded list rots silently. */
function discoverApps(root) {
  const gm = path.join(root, '.gitmodules');
  if (!fs.existsSync(gm)) return [];
  return [...fs.readFileSync(gm, 'utf8').matchAll(/^\s*path\s*=\s*(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

/**
 * The manifest that states what a package DEMANDS. Prefer the copy installed in
 * the app, because that is the version the app actually runs; fall back to the
 * workspace source for a package not yet installed there.
 */
function packageManifest(root, appDir, dep) {
  return (
    readJson(path.join(appDir, 'node_modules', dep, 'package.json')) ??
    readJson(path.join(root, 'packages', dep.replace('@bsuite/', ''), 'package.json'))
  );
}

export function auditApp(root, app, opts = {}) {
  const appDir = path.join(root, app);
  const pkg = readJson(path.join(appDir, 'package.json'));
  if (!pkg) return { app, scanned: false, deps: 0, edges: [], reason: 'no package.json' };

  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const bsuiteDeps = Object.keys(declared)
    .filter((d) => d.startsWith('@bsuite/'))
    .sort();

  const edges = [];
  for (const dep of bsuiteDeps) {
    const manifest = packageManifest(root, appDir, dep);
    if (!manifest) {
      edges.push({ dep, peer: null, satisfied: false, why: 'manifest not found — cannot read its peers' });
      continue;
    }
    const peers = manifest.peerDependencies ?? {};
    const meta = manifest.peerDependenciesMeta ?? {};
    for (const [peer, range] of Object.entries(peers)) {
      if (meta[peer]?.optional) continue;

      const declaredByApp = declared[peer] ?? null;
      // STRICT: the app's OWN node_modules. See the docblock.
      const installedInApp =
        readJson(path.join(appDir, 'node_modules', peer, 'package.json'))?.version ?? null;

      const forcedUnmet = opts.forceUnmet === `${dep}|${peer}`;
      edges.push({
        dep,
        peer,
        range,
        declaredByApp,
        installedInApp,
        satisfied: forcedUnmet ? false : Boolean(declaredByApp || installedInApp),
      });
    }
  }
  return { app, scanned: true, deps: bsuiteDeps.length, edges };
}

function selfTest() {
  const cases = [];
  const tmp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP ?? '/tmp', 'peerdeps-'));

  function scaffold(name, { appPkg, pkgManifests = {}, appNodeModules = {} }) {
    const root = path.join(tmp, name);
    fs.mkdirSync(path.join(root, 'app'), { recursive: true });
    fs.writeFileSync(path.join(root, '.gitmodules'), '[submodule "app"]\n\tpath = app\n\turl = x\n');
    fs.writeFileSync(path.join(root, 'app', 'package.json'), JSON.stringify(appPkg));
    for (const [dep, manifest] of Object.entries(pkgManifests)) {
      const d = path.join(root, 'packages', dep.replace('@bsuite/', ''));
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify(manifest));
    }
    for (const [mod, manifest] of Object.entries(appNodeModules)) {
      const d = path.join(root, 'app', 'node_modules', mod);
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify(manifest));
    }
    return root;
  }

  const SR = { name: '@bsuite/schema-registry', version: '1.0.0', peerDependencies: { '@tanstack/react-query': '^5' } };

  // 1. The R80.4 outage itself: peer declared by the package, absent from the app.
  cases.push([
    'unmet peer is reported',
    () => {
      const root = scaffold('unmet', {
        appPkg: { name: 'app', dependencies: { '@bsuite/schema-registry': '^1.0.0' } },
        pkgManifests: { '@bsuite/schema-registry': SR },
      });
      const r = auditApp(root, 'app');
      return r.edges.length === 1 && r.edges[0].satisfied === false;
    },
  ]);

  // 2. Declared in the app's package.json — satisfied.
  cases.push([
    'peer declared by the app is satisfied',
    () => {
      const root = scaffold('declared', {
        appPkg: {
          name: 'app',
          dependencies: { '@bsuite/schema-registry': '^1.0.0', '@tanstack/react-query': '^5.101.0' },
        },
        pkgManifests: { '@bsuite/schema-registry': SR },
      });
      return auditApp(root, 'app').edges.every((e) => e.satisfied);
    },
  ]);

  // 3. Present only in the app's own node_modules — satisfied.
  cases.push([
    "peer installed in the app's own node_modules is satisfied",
    () => {
      const root = scaffold('installed', {
        appPkg: { name: 'app', dependencies: { '@bsuite/schema-registry': '^1.0.0' } },
        pkgManifests: { '@bsuite/schema-registry': SR },
        appNodeModules: { '@tanstack/react-query': { name: '@tanstack/react-query', version: '5.101.0' } },
      });
      return auditApp(root, 'app').edges.every((e) => e.satisfied);
    },
  ]);

  // 4. THE ONE THAT MATTERS: a hoisted copy at the repo root does NOT satisfy it.
  cases.push([
    'a peer hoisted to the REPO ROOT does not satisfy the app',
    () => {
      const root = scaffold('hoisted', {
        appPkg: { name: 'app', dependencies: { '@bsuite/schema-registry': '^1.0.0' } },
        pkgManifests: { '@bsuite/schema-registry': SR },
      });
      const d = path.join(root, 'node_modules', '@tanstack', 'react-query');
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ version: '5.101.0' }));
      return auditApp(root, 'app').edges[0].satisfied === false;
    },
  ]);

  // 5. An optional peer is not a requirement.
  cases.push([
    'optional peers are skipped',
    () => {
      const root = scaffold('optional', {
        appPkg: { name: 'app', dependencies: { '@bsuite/x': '^1.0.0' } },
        pkgManifests: {
          '@bsuite/x': {
            name: '@bsuite/x',
            version: '1.0.0',
            peerDependencies: { 'some-optional': '^1' },
            peerDependenciesMeta: { 'some-optional': { optional: true } },
          },
        },
      });
      return auditApp(root, 'app').edges.length === 0;
    },
  ]);

  // 6. Non-@bsuite dependencies are out of scope — this gate is about OUR contracts.
  cases.push([
    'non-@bsuite dependencies are not examined',
    () => {
      const root = scaffold('scope', {
        appPkg: { name: 'app', dependencies: { react: '^19.0.0' } },
        pkgManifests: {},
      });
      return auditApp(root, 'app').edges.length === 0;
    },
  ]);

  // 7. A package whose manifest cannot be read is a FAILURE, not a pass.
  cases.push([
    'an unreadable package manifest fails rather than passing vacuously',
    () => {
      const root = scaffold('missing', {
        appPkg: { name: 'app', dependencies: { '@bsuite/ghost': '^1.0.0' } },
        pkgManifests: {},
      });
      const r = auditApp(root, 'app');
      return r.edges.length === 1 && r.edges[0].satisfied === false;
    },
  ]);

  // 8. Apps are derived from .gitmodules, never hardcoded.
  cases.push([
    'apps are discovered from .gitmodules',
    () => {
      const root = scaffold('discover', { appPkg: { name: 'app' }, pkgManifests: {} });
      return discoverApps(root).join(',') === 'app';
    },
  ]);

  let failed = 0;
  for (const [name, fn] of cases) {
    let ok = false;
    try {
      ok = fn() === true;
    } catch (err) {
      ok = false;
      name += ` (threw: ${err.message})`;
    }
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(
    failed === 0
      ? `check-unmet-peer-deps --self-test: OK — ${cases.length} cases pass`
      : `check-unmet-peer-deps --self-test: FAILED — ${failed} of ${cases.length} cases`,
  );
  return failed === 0 ? 0 : 1;
}

function main(argv) {
  if (argv.includes('--self-test')) return selfTest();

  const requireEdges = Number(
    (argv.find((a) => a.startsWith('--require-edges=')) ?? '=0').split('=')[1] || 0,
  );
  const forceUnmet = (argv.find((a) => a.startsWith('--force-unmet=')) ?? '=').split('=')[1] || null;

  const apps = discoverApps(ROOT);
  if (apps.length === 0) {
    console.error('check-unmet-peer-deps: FAIL — no submodules found in .gitmodules.');
    return 1;
  }

  const results = apps.map((app) => auditApp(ROOT, app, { forceUnmet }));
  const unscanned = results.filter((r) => !r.scanned);
  const allEdges = results.flatMap((r) => r.edges);
  const unmet = allEdges.filter((e) => !e.satisfied);

  console.log(
    `check-unmet-peer-deps: ${apps.length} app(s), ${allEdges.length} required peer edge(s)\n`,
  );
  for (const r of results) {
    if (!r.scanned) {
      console.log(`  ${r.app.padEnd(24)} NOT SCANNED — ${r.reason}`);
      continue;
    }
    const bad = r.edges.filter((e) => !e.satisfied).length;
    console.log(
      `  ${r.app.padEnd(24)} ${String(r.deps).padStart(2)} @bsuite dep(s), ` +
        `${String(r.edges.length).padStart(2)} required peer(s), ${bad} unsatisfied`,
    );
  }

  if (unmet.length > 0) {
    console.log('');
    for (const e of unmet) {
      const which = results.find((r) => r.edges.includes(e))?.app ?? '?';
      if (!e.peer) {
        console.log(`  FAIL: ${which} — ${e.dep}: ${e.why}`);
        continue;
      }
      console.log(
        `  FAIL: ${which} consumes ${e.dep}, which REQUIRES ${e.peer}@${e.range}, ` +
          `and ${which} neither declares it nor has it installed. ` +
          `This throws at runtime on the first render that reaches it — no ` +
          `typecheck, lint, test or build can see it. See the R80.4 outage in ` +
          `this script's docblock.`,
      );
    }
  }

  // Positive control against a silently unscanned tree: an uninitialised
  // submodule is an empty directory, and a scan of nothing reports clean.
  if (requireEdges > 0 && allEdges.length < requireEdges) {
    console.error(
      `\ncheck-unmet-peer-deps: FAIL — expected at least ${requireEdges} required peer ` +
        `edge(s) but found ${allEdges.length}. The submodules did not populate, so a ` +
        `clean result here would mean "examined nothing", not "found nothing".`,
    );
    return 1;
  }
  if (unscanned.length > 0) {
    console.error(
      `\ncheck-unmet-peer-deps: FAIL — ${unscanned.length} app(s) could not be scanned.`,
    );
    return 1;
  }
  if (unmet.length > 0) {
    console.error(`\ncheck-unmet-peer-deps: FAIL — ${unmet.length} unmet peer dependency edge(s).`);
    return 1;
  }
  console.log(
    `\ncheck-unmet-peer-deps: OK — all ${allEdges.length} required peer edge(s) satisfied across ${apps.length} app(s).`,
  );
  return 0;
}

process.exit(main(process.argv.slice(2)));
