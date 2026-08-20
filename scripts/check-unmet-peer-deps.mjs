#!/usr/bin/env node
/**
 * check-unmet-peer-deps.mjs — an app that consumes a `@bsuite/*` package must
 * satisfy that package's peer dependencies AT A VERSION THE PACKAGE ACCEPTS,
 * or the app throws at runtime on a path no compiler, linter, test or build
 * can see.
 *
 * WHY THIS EXISTS
 *
 * On 2026-08-19 the R80.4 lane reported the clearest example this estate has
 * produced of a defect every static gate is blind to:
 *
 *   r8.crm7.app threw "No QueryClient set, use QueryClientProvider to set one"
 *   the moment a session existed. The calculator did not render AT ALL. R8
 *   worked signed OUT and was blank signed IN — every signed-in user, every
 *   page load.
 *
 * `@bsuite/schema-registry/react` declares `@tanstack/react-query: ^5` as a
 * PEER — a requirement the CONSUMER installs. R80.4 never installed it, so the
 * hook threw on first render.
 *
 * WHY SIX GATES MISSED IT, which is the transferable part:
 *
 *   typecheck  the hook's types resolve; the provider is a RUNTIME requirement
 *   eslint     nothing lexically wrong
 *   tests      no test signs in and renders the shell
 *   build      Vite bundles a missing provider without complaint
 *   DoD        18 benchmarks, none about dependency contracts
 *   pnpm       DOES warn — at install time, in output no gate reads and every
 *              human scrolls past
 *
 * It was found by signing in to production as a real user, and by nothing else.
 *
 * PRESENCE IS NOT ENOUGH, AND THIS GATE LEARNED THAT THE HARD WAY
 *
 * The first version of this script checked whether the peer was THERE. Written,
 * self-tested, reported clean across 120 edges — and wrong, because it never
 * asked whether the version was one the package accepts.
 *
 * Measured on R80.4's own lockfile the same day: `@bsuite/schema-registry@1.0.2`
 * declared `@bsuite/nav-core: ^0.8.0`, and every app in this estate runs
 * nav-core 1.0.1. pnpm records that resolution in the lockfile ANYWAY — it
 * warns at install and writes the file regardless. So "the peer appears" proves
 * nothing at all; the version has to be checked against the range, which is why
 * `lib/semver-range.mjs` sits beside this file.
 *
 * (`schema-registry@1.0.3` widened that peer to `>=0.8.0 <2` and the estate is
 * clean today. The gate exists so the next one is caught by CI rather than by
 * an operator finding a blank page.)
 *
 * WHY THE LOCKFILE, NOT `node_modules`
 *
 * No install step: the gate reads a COMMITTED lockfile, which is precisely what
 * `--frozen-lockfile` will install and therefore what the deploy runs.
 * Inspecting a local `node_modules` would measure the machine, not the deploy —
 * and would have called R8's outage clean, because react-query existed
 * elsewhere in this estate the entire time R8 was down.
 *
 * WHY A PARENT GATE RATHER THAN SIX COPIES
 *
 * The R80.4 lane shipped its own script and offered it to the other five apps
 * verbatim. Six copies drift — this estate has the receipts, in a path-keyed
 * allowlist that died loudly on a rename and silently on a delete. One parent
 * gate reads every app at the recorded gitlink and cannot fall out of step
 * with itself.
 *
 * NO `paths:` FILTER on the workflow — same two reasons as the sibling gates:
 * the change that breaks this arrives inside a SUBMODULE and the parent tree
 * holds only a gitlink, so a path filter can never match it; and a
 * path-filtered required check never reports on a PR that misses the filter, so
 * the PR waits forever.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { satisfies, selfTestSemverRange } from './lib/semver-range.mjs';
import { readLockfile, parseLockfile, resolvedPeersFromSnapshotKey, splitNameVersion } from './lib/pnpm-lock-peers.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

/** Apps are DERIVED from .gitmodules. A hardcoded list rots silently. */
function discoverApps(root) {
  const gm = path.join(root, '.gitmodules');
  if (!fs.existsSync(gm)) return [];
  return [...fs.readFileSync(gm, 'utf8').matchAll(/^\s*path\s*=\s*(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

/**
 * Every peer edge an app actually resolves for the `@bsuite/*` packages in its
 * lockfile. One row per (package, peer).
 */
export function auditLock(lock, opts = {}) {
  const prefix = opts.prefix ?? '@bsuite/';
  const edges = [];

  // Index snapshot keys by their base spec so a package with several peer
  // resolutions (different consumers, different peer sets) is fully covered.
  const snapshotsBySpec = new Map();
  for (const key of lock.snapshotKeys) {
    const base = key.split('(')[0];
    if (!snapshotsBySpec.has(base)) snapshotsBySpec.set(base, []);
    snapshotsBySpec.get(base).push(key);
  }

  for (const [spec, info] of lock.packages) {
    if (!spec.startsWith(prefix)) continue;
    if (info.peers.size === 0) continue;

    const keys = snapshotsBySpec.get(spec) ?? [];
    for (const [peer, range] of info.peers) {
      if (info.optionalPeers.has(peer)) continue;

      if (keys.length === 0) {
        edges.push({ spec, peer, range, resolved: null, satisfied: false, why: 'no snapshot resolves this package, so its peers were never provided' });
        continue;
      }

      for (const key of keys) {
        const resolvedPeers = resolvedPeersFromSnapshotKey(key);
        const resolved = resolvedPeers.get(peer) ?? null;
        if (resolved === null) {
          edges.push({ spec, peer, range, resolved: null, satisfied: false, why: 'not provided by the consumer at all' });
          continue;
        }
        let satisfied, why;
        try {
          satisfied = satisfies(resolved, range);
          why = satisfied ? null : `resolved ${resolved} is outside the declared range`;
        } catch (err) {
          // UNPARSEABLE IS A FAILURE. A range checker that quietly passes what
          // it cannot read launders an unknown into an assurance.
          satisfied = false;
          why = `range could not be evaluated: ${err.message}`;
        }
        if (opts.forceUnmet === `${splitNameVersion(spec)?.name}|${peer}`) {
          satisfied = false;
          why = 'forced unmet (positive control)';
        }
        edges.push({ spec, peer, range, resolved, satisfied, why });
      }
    }
  }
  return edges;
}

export function auditApp(root, app, opts = {}) {
  const lockPath = path.join(root, app, 'pnpm-lock.yaml');
  if (!fs.existsSync(lockPath)) {
    return { app, scanned: false, reason: 'no pnpm-lock.yaml', edges: [] };
  }
  return { app, scanned: true, edges: auditLock(readLockfile(lockPath), opts) };
}

function selfTest() {
  const failures = [];
  const note = (ok, name) => {
    if (!ok) failures.push(name);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  };

  const sem = selfTestSemverRange();
  note(sem.failures.length === 0, `semver-range: ${sem.cases} cases (${sem.failures.join('; ') || 'all pass'})`);

  const LOCK = (peerBlock, snapshot) => `lockfileVersion: '9.0'

packages:

  '@bsuite/schema-registry@1.0.2':
    resolution: {integrity: sha512-x}
${peerBlock}
snapshots:

  ${snapshot}
    dependencies:
      react: 19.2.8
`;

  const PEERS = `    peerDependencies:
      '@bsuite/nav-core': ^0.8.0
      react: '>=18 <21'
`;

  // 1. THE R80.4 CASE. nav-core resolves to 1.0.1 against a declared ^0.8.0.
  //    pnpm wrote this exact shape and only warned. Presence-only checking
  //    called it clean, which is why this case is first.
  {
    const lock = parseLockfile(
      LOCK(PEERS, `'@bsuite/schema-registry@1.0.2(@bsuite/nav-core@1.0.1(react@19.2.8))(react@19.2.8)':`),
    );
    const edges = auditLock(lock);
    const navcore = edges.find((e) => e.peer === '@bsuite/nav-core');
    note(edges.length === 2 && navcore?.satisfied === false && navcore.resolved === '1.0.1',
      'a peer RESOLVED but OUT OF RANGE is reported (the R80.4 case)');
  }

  // 2. The same shape, widened range, is clean.
  {
    const lock = parseLockfile(
      LOCK(
        `    peerDependencies:
      '@bsuite/nav-core': '>=0.8.0 <2'
      react: '>=18 <21'
`,
        `'@bsuite/schema-registry@1.0.2(@bsuite/nav-core@1.0.1(react@19.2.8))(react@19.2.8)':`,
      ),
    );
    note(auditLock(lock).every((e) => e.satisfied), 'a peer inside its declared range passes');
  }

  // 3. A peer the consumer never provided at all — the original R8 outage.
  {
    const lock = parseLockfile(LOCK(PEERS, `'@bsuite/schema-registry@1.0.2(react@19.2.8)':`));
    const navcore = auditLock(lock).find((e) => e.peer === '@bsuite/nav-core');
    note(navcore?.satisfied === false && navcore.resolved === null,
      'a peer the consumer never provided is reported');
  }

  // 4. An optional peer is not a requirement.
  {
    const lock = parseLockfile(
      LOCK(
        `${PEERS}    peerDependenciesMeta:
      '@bsuite/nav-core':
        optional: true
`,
        `'@bsuite/schema-registry@1.0.2(react@19.2.8)':`,
      ),
    );
    note(auditLock(lock).every((e) => e.peer !== '@bsuite/nav-core'), 'optional peers are skipped');
  }

  // 5. A range this checker cannot evaluate FAILS. It never guesses.
  {
    const lock = parseLockfile(
      LOCK(
        `    peerDependencies:
      react: 1.2.3 - 2.0.0
`,
        `'@bsuite/schema-registry@1.0.2(react@19.2.8)':`,
      ),
    );
    const e = auditLock(lock)[0];
    note(e?.satisfied === false && /could not be evaluated/.test(e.why),
      'an unevaluable range is a FAILURE, never a silent pass');
  }

  // 6. Nested parentheses belong to the peer's own peers, not to this package.
  {
    const key = '@bsuite/schema-registry@1.0.3(@bsuite/nav-core@1.0.1(react-dom@19.2.8(react@19.2.8))(react@19.2.8))(react@19.2.8)(zod@4.4.3)';
    const m = resolvedPeersFromSnapshotKey(key);
    note(
      m.get('@bsuite/nav-core') === '1.0.1' && m.get('react') === '19.2.8' &&
        m.get('zod') === '4.4.3' && !m.has('react-dom'),
      "nested peer-of-a-peer versions are not mistaken for this package's own",
    );
  }

  // 7. Non-@bsuite packages are out of scope — this gate is about OUR contracts.
  {
    const lock = parseLockfile(`lockfileVersion: '9.0'

packages:

  'react@19.2.8':
    resolution: {integrity: sha512-x}
    peerDependencies:
      something: ^1

snapshots:

  'react@19.2.8':
    dependencies: {}
`);
    note(auditLock(lock).length === 0, 'non-@bsuite packages are not examined');
  }

  // 8. Apps are discovered from .gitmodules, never hardcoded.
  {
    const tmp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP ?? '/tmp', 'peerdeps-'));
    fs.writeFileSync(path.join(tmp, '.gitmodules'), '[submodule "a"]\n\tpath = a\n\turl = x\n[submodule "b"]\n\tpath = b\n\turl = y\n');
    note(discoverApps(tmp).join(',') === 'a,b', 'apps are discovered from .gitmodules');
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // 9. A missing lockfile is NOT SCANNED, and not-scanned is not a pass.
  {
    const tmp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP ?? '/tmp', 'peerdeps-'));
    fs.mkdirSync(path.join(tmp, 'app'));
    const r = auditApp(tmp, 'app');
    note(r.scanned === false, 'an app with no lockfile is NOT SCANNED rather than clean');
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(
    failures.length === 0
      ? `check-unmet-peer-deps --self-test: OK — 9 groups pass`
      : `check-unmet-peer-deps --self-test: FAILED — ${failures.length} group(s)`,
  );
  return failures.length === 0 ? 0 : 1;
}

function main(argv) {
  if (argv.includes('--self-test')) return selfTest();

  const requireEdges = Number((argv.find((a) => a.startsWith('--require-edges=')) ?? '=0').split('=')[1] || 0);
  const forceUnmet = (argv.find((a) => a.startsWith('--force-unmet=')) ?? '=').split('=')[1] || null;

  const apps = discoverApps(ROOT);
  if (apps.length === 0) {
    console.error('check-unmet-peer-deps: FAIL — no submodules found in .gitmodules.');
    return 1;
  }

  const results = apps.map((app) => auditApp(ROOT, app, { forceUnmet }));
  const unscanned = results.filter((r) => !r.scanned);
  const allEdges = results.flatMap((r) => r.edges);
  const unmet = results.flatMap((r) => r.edges.filter((e) => !e.satisfied).map((e) => ({ ...e, app: r.app })));

  console.log(`check-unmet-peer-deps: ${apps.length} app(s), ${allEdges.length} resolved peer edge(s)\n`);
  for (const r of results) {
    if (!r.scanned) {
      console.log(`  ${r.app.padEnd(24)} NOT SCANNED — ${r.reason}`);
      continue;
    }
    const bad = r.edges.filter((e) => !e.satisfied).length;
    console.log(`  ${r.app.padEnd(24)} ${String(r.edges.length).padStart(3)} peer edge(s), ${bad} unsatisfied`);
  }

  if (unmet.length > 0) {
    console.log('');
    for (const e of unmet) {
      console.log(
        `  FAIL: ${e.app} — ${e.spec} requires ${e.peer}@${e.range}, ` +
          `resolved ${e.resolved ?? '(nothing)'}. ${e.why}. ` +
          `This throws at runtime on the first render that reaches it; no ` +
          `typecheck, lint, test or build can see it. See the R80.4 outage in ` +
          `this script's docblock.`,
      );
    }
  }

  // Positive control against a silently unscanned tree: an uninitialised
  // submodule is an empty directory with no lockfile, and a scan of nothing
  // reports clean.
  if (requireEdges > 0 && allEdges.length < requireEdges) {
    console.error(
      `\ncheck-unmet-peer-deps: FAIL — expected at least ${requireEdges} resolved peer ` +
        `edge(s) but found ${allEdges.length}. The submodules did not populate, so a clean ` +
        `result here would mean "examined nothing", not "found nothing".`,
    );
    return 1;
  }
  if (unscanned.length > 0) {
    console.error(`\ncheck-unmet-peer-deps: FAIL — ${unscanned.length} app(s) could not be scanned.`);
    return 1;
  }
  if (unmet.length > 0) {
    console.error(`\ncheck-unmet-peer-deps: FAIL — ${unmet.length} unsatisfied peer edge(s).`);
    return 1;
  }
  console.log(
    `\ncheck-unmet-peer-deps: OK — all ${allEdges.length} resolved peer edge(s) are inside their declared ranges, across ${apps.length} app(s).`,
  );
  return 0;
}

process.exit(main(process.argv.slice(2)));
