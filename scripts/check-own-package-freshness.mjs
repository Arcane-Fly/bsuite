#!/usr/bin/env node
/**
 * scripts/check-own-package-freshness.mjs
 *
 * Do the six consuming apps actually RUN the @bsuite/* packages this estate
 * publishes?
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * The operator's standing directive is that consuming apps run the LATEST
 * version of the packages we publish ourselves:
 *
 *   "pinning packages is not a long term solution. the packages we own are
 *    evolving and need frequent updates as we correct and the standing
 *    directive is the latest compatible versions of packages and deps so if
 *    you're pinning our packages below our own latest version then what is
 *    the point of updating our own packages."
 *
 * It was violated twice in a fortnight, both times INVISIBLY:
 *
 *   1. @bsuite/dry-lint was EXACT-pinned at 0.5.0 in crm7 and
 *      business-suite-unified while 1.0.1 was published. 1.0.1 carries the
 *      grid/dot doctrine rule; three real doctrine violations sat live on
 *      public marketing pages for as long as the pin held. BSU's own
 *      oauth-contract.test.ts ASSERTED that pin, marked "DO NOT WEAKEN" — the
 *      test suite was actively defending the defect.
 *
 *   2. @bsuite/theme 0.11.2 (a dark-mode near-white-hairline fix, commit
 *      caee3fca, bsuite#1957) was published and NOT ONE of the six apps
 *      consumed it. Same for @bsuite/nav-core 0.9.1 in five of six, and
 *      @bsuite/ui 1.0.3 in all four consumers. In every one of those cases
 *      the declared caret range ALREADY ADMITTED the newer version — only the
 *      lockfile pin held it back. That is why no human and no existing check
 *      ever saw it: package.json looks correct, and the drift lives entirely
 *      in the resolved-version column of pnpm-lock.yaml.
 *
 * There are 16 publish-*.yml workflows in .github/workflows/. There was
 * NOTHING that checked whether anybody consumes what they publish. This is
 * that check.
 *
 * CLASSIFICATION
 * ---------------------------------------------------------------------------
 *   STALE-BUT-IN-RANGE   FAIL. The declared range already admits latest; the
 *                        lockfile just pins older. Fixable by a pure lockfile
 *                        refresh with zero risk. This is the exact class that
 *                        hid the theme dark-mode defect.
 *   EXACT-PINNED-BEHIND  FAIL. The declared spec has no caret/tilde/range
 *                        operator and sits below latest. The dry-lint 0.5.0
 *                        shape.
 *   RANGE-BEHIND         WARN. Latest is OUTSIDE the declared range, so
 *                        adopting it needs a deliberate package.json bump and
 *                        possibly a breaking-change review. A human decision,
 *                        not an oversight — reported, never failed.
 *   EMBARGOED            INFO. The app's OWN pnpm-workspace.yaml sets
 *                        `minimumReleaseAge` and latest is still inside that
 *                        window (and not in `minimumReleaseAgeExclude`).
 *                        A legitimate reason to be behind.
 *   LINKED               INFO. Resolved to link:/file: — a workspace or local
 *                        checkout, not a registry install.
 *   NOT-PUBLISHED        INFO. The registry returns 404. Private or never
 *                        published; nothing to be behind.
 *   AHEAD                INFO. Lockfile resolves ABOVE dist-tags.latest
 *                        (a deprecated/unpublished head, or a mis-tagged
 *                        release). Surfaced rather than silently passed.
 *   CURRENT              ok.
 *
 * DESIGN CONSTRAINTS, EACH LEARNED FROM A REAL FAILURE IN THIS REPO
 * ---------------------------------------------------------------------------
 *  * PARSE THE LOCKFILE WITH A YAML PARSER. NEVER GREP IT. A previous pass
 *    grepped the `overrides:` block of a pnpm-lock.yaml and reported its KEYS
 *    as resolved versions. `overrides:`, `importers:` and `packages:` are all
 *    top-level maps full of `name: version`-looking lines; only a real parse
 *    tells them apart. This script hard-refuses to run without the `yaml`
 *    package rather than degrading to a regex.
 *
 *  * SCANNING ZERO IS A HARD FAILURE, NOT A PASS. A guard that silently scans
 *    nothing reports PASS (bsuite#1688; LANE-WATCHER, 2026-08-13). Every app
 *    must yield at least one @bsuite/* dependency edge, every declared app
 *    must be present, and the total must clear an explicit floor.
 *
 *  * AN UNINITIALISED SUBMODULE IS AN EMPTY DIRECTORY THAT PASSES `-d`. We
 *    check for the actual package.json and pnpm-lock.yaml, never the dir.
 *
 *  * FAIL CLOSED ON THE NETWORK. A registry error is never "everything is
 *    current"; it exits 2 naming the package and the error.
 *
 * EXIT CODES
 *   0  every consumed @bsuite/* package is current (warnings may be printed)
 *   1  policy failure — STALE-BUT-IN-RANGE and/or EXACT-PINNED-BEHIND found
 *   2  harness failure — missing parser dep, unreadable app, registry error,
 *      zero packages examined, floor not met. NOT a pass.
 *
 * USAGE
 *   node scripts/check-own-package-freshness.mjs
 *   node scripts/check-own-package-freshness.mjs --self-test
 *   node scripts/check-own-package-freshness.mjs --json
 *   node scripts/check-own-package-freshness.mjs --root=DIR --apps=a,b
 *
 * The `yaml` and `semver` packages are resolved from (in order)
 * $BSUITE_GUARD_NODE_MODULES, this script's directory, and process.cwd().
 * See .github/workflows/own-package-freshness.yml for how CI provides them.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

import { APP_REPOS, pathExists } from './check-lockfile-hygiene.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);

const OWN_SCOPE = '@bsuite/';
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

// Floor for the real six-app tree. The tree currently declares ~52 @bsuite/*
// dependency edges; 30 leaves generous room for apps legitimately shedding
// dependencies while still catching "the walk found almost nothing".
const DEFAULT_MIN_PACKAGES = 30;

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

const FAILING = new Set(['STALE-BUT-IN-RANGE', 'EXACT-PINNED-BEHIND']);
const WARNING = new Set(['RANGE-BEHIND', 'AHEAD']);

// ---------------------------------------------------------------------------
// Dependency loading — fail closed, never degrade to a regex
// ---------------------------------------------------------------------------

function loadDep(spec) {
  const bases = [];
  const override = process.env.BSUITE_GUARD_NODE_MODULES;
  if (override) {
    const abs = path.resolve(override);
    // Accept both "the dir containing node_modules" and "the node_modules dir".
    bases.push(abs);
    if (path.basename(abs) === 'node_modules') bases.push(path.dirname(abs));
  }
  bases.push(HERE, process.cwd());

  const req = createRequire(path.join(HERE, '__resolver__.cjs'));
  try {
    return req(req.resolve(spec, { paths: bases }));
  } catch {
    return null;
  }
}

const YAML = loadDep('yaml');
const semver = loadDep('semver');

if (!YAML || !semver) {
  const missing = [!YAML && 'yaml', !semver && 'semver'].filter(Boolean).join(', ');
  console.error(
    `check-own-package-freshness: CANNOT RUN — missing required module(s): ${missing}.\n` +
      '  This guard refuses to fall back to grepping pnpm-lock.yaml. A previous pass\n' +
      "  did exactly that and reported the `overrides:` block's KEYS as resolved\n" +
      '  versions. A structural parse or nothing.\n' +
      '  Provide them with:\n' +
      '    npm install --prefix "$SCRATCH" --no-save --no-package-lock yaml@^2 semver@^7\n' +
      '    BSUITE_GUARD_NODE_MODULES="$SCRATCH" node scripts/check-own-package-freshness.mjs',
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// npm registry
// ---------------------------------------------------------------------------

class RegistryError extends Error {}

function makeRegistryClient({ registry, fixture }) {
  const cache = new Map();

  async function live(name) {
    const url = `${registry.replace(/\/+$/, '')}/${name.replace('/', '%2f')}`;
    // FULL packument, deliberately. The abbreviated
    // `application/vnd.npm.install-v1+json` document is smaller and tempting,
    // but it OMITS the `time` map — and without publish dates the embargo
    // evaluation has nothing to work with. Found live 2026-08-17: with the
    // abbreviated header, R80.4's exact-pinned @bsuite/dry-lint 0.5.0 (latest
    // 1.0.1, published 24 days earlier, far outside the 7-day window) was
    // classified EMBARGOED — informational — instead of EXACT-PINNED-BEHIND.
    // A missing input presented as a legitimate excuse to be behind, which is
    // the precise failure mode this guard exists to retire. See the empty-time
    // hard-stop in installableCeiling().
    const headers = { accept: 'application/json' };
    const token = process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN;
    if (token) headers.authorization = `Bearer ${token}`;

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
        if (res.status === 404) return { published: false };
        if (!res.ok) {
          // 4xx other than 404 will not improve on retry; 5xx might.
          const body = (await res.text().catch(() => '')).slice(0, 200);
          const err = new RegistryError(`${name}: registry returned HTTP ${res.status} ${res.statusText} — ${body}`);
          if (res.status < 500) throw err;
          lastError = err;
        } else {
          const json = await res.json();
          return normalisePackument(name, json);
        }
      } catch (error) {
        if (error instanceof RegistryError && !/HTTP 5/.test(error.message)) throw error;
        lastError = error;
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
    throw new RegistryError(
      `${name}: could not be read from ${registry} after 3 attempts — ${lastError?.message ?? 'unknown error'}. ` +
        'Refusing to report freshness against a registry we could not reach (fail closed).',
    );
  }

  function normalisePackument(name, json) {
    const latest = json?.['dist-tags']?.latest;
    if (!latest) {
      throw new RegistryError(`${name}: registry document has no dist-tags.latest — cannot determine the published latest`);
    }
    const times = {};
    for (const [version, iso] of Object.entries(json?.time ?? {})) {
      if (!semver.valid(version)) continue; // skips "created" / "modified"
      const ms = Date.parse(iso);
      if (Number.isFinite(ms)) times[version] = ms;
    }
    return { published: true, latest, times };
  }

  return {
    source: fixture ? 'FIXTURE' : registry,
    async get(name) {
      if (cache.has(name)) return cache.get(name);
      let value;
      if (fixture) {
        const entry = fixture[name];
        if (entry === undefined || entry === '404') value = { published: false };
        else value = normalisePackument(name, entry);
      } else {
        value = await live(name);
      }
      cache.set(name, value);
      return value;
    },
    get packageCount() {
      return cache.size;
    },
  };
}

// ---------------------------------------------------------------------------
// Embargo (pnpm `minimumReleaseAge`)
// ---------------------------------------------------------------------------

function globToRegExp(pattern) {
  const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? ' ' : `\\${c}`));
  return new RegExp(`^${escaped.replace(/ /g, '.*')}$`);
}

async function readEmbargo(appDir) {
  const wsPath = path.join(appDir, 'pnpm-workspace.yaml');
  if (!(await pathExists(wsPath))) return { minutes: 0, excludes: [], source: null };
  const doc = YAML.parse(await readFile(wsPath, 'utf8')) ?? {};
  const minutes = Number(doc.minimumReleaseAge ?? 0);
  const excludes = Array.isArray(doc.minimumReleaseAgeExclude) ? doc.minimumReleaseAgeExclude : [];
  return {
    minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
    excludes,
    excludeMatchers: excludes.map(globToRegExp),
    source: wsPath,
  };
}

function isEmbargoExcluded(embargo, name) {
  return (embargo.excludeMatchers ?? []).some((re) => re.test(name));
}

/**
 * The newest version this app is actually ALLOWED to install right now.
 * Equal to `latest` when no embargo applies.
 */
function installableCeiling(packument, embargo, name, now) {
  if (!embargo.minutes || isEmbargoExcluded(embargo, name)) {
    return { version: packument.latest, held: false, heldMinutes: 0 };
  }
  // An embargo cannot be evaluated without publish dates. If the registry
  // document carried none, we do NOT get to call the package "embargoed" —
  // that would dress a missing input up as a legitimate excuse to be behind.
  // Fail closed and name the cause.
  if (Object.keys(packument.times).length === 0) {
    throw new RegistryError(
      `${name}: this app declares minimumReleaseAge=${embargo.minutes} but the registry document ` +
        'carried NO version publish times, so the embargo window cannot be evaluated. Refusing to ' +
        'report EMBARGOED (or CURRENT) on missing data — check the registry accept header/mirror.',
    );
  }
  const cutoffMs = now - embargo.minutes * 60_000;
  const eligible = Object.entries(packument.times)
    .filter(([v, ms]) => ms <= cutoffMs && !semver.prerelease(v) && semver.lte(v, packument.latest))
    .map(([v]) => v)
    .sort(semver.rcompare);
  if (eligible.length === 0) {
    return { version: null, held: true, heldMinutes: embargo.minutes };
  }
  const best = eligible[0];
  return { version: best, held: semver.lt(best, packument.latest), heldMinutes: embargo.minutes };
}

// ---------------------------------------------------------------------------
// Lockfile reading
// ---------------------------------------------------------------------------

/**
 * pnpm records a resolved dependency's `version:` as one of
 *   `1.2.3`                              plain
 *   `1.2.3(react@19.2.8)(...)`           with peer-resolution suffixes
 *   `@scope/other@1.2.3(...)`            npm: alias
 *   `link:../x` / `file:../x`            workspace / local checkout
 */
function readResolvedVersion(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return { kind: 'unknown', raw };
  if (raw.startsWith('link:') || raw.startsWith('file:')) return { kind: 'link', raw, version: null };
  let base = raw.split('(')[0].trim();
  const at = base.lastIndexOf('@');
  if (at > 0) base = base.slice(at + 1);
  if (!semver.valid(base)) return { kind: 'unknown', raw, version: null };
  return { kind: 'version', raw, version: base };
}

async function readApp(root, app) {
  const appDir = path.join(root, app);
  const pkgPath = path.join(appDir, 'package.json');
  const lockPath = path.join(appDir, 'pnpm-lock.yaml');

  // An uninitialised submodule is an EMPTY DIRECTORY that passes `-d`. Check
  // for the files, never the directory.
  if (!(await pathExists(pkgPath))) {
    throw new RegistryError(
      `${app}: ${path.relative(root, pkgPath)} is absent — uninitialised submodule? ` +
        `Run \`git submodule update --init ${app}\`. A missing app is not a clean app.`,
    );
  }
  if (!(await pathExists(lockPath))) {
    throw new RegistryError(
      `${app}: ${path.relative(root, lockPath)} is absent — cannot read resolved versions.`,
    );
  }

  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  const lock = YAML.parse(await readFile(lockPath, 'utf8'));

  const importer = lock?.importers?.['.'];
  if (!importer || typeof importer !== 'object') {
    throw new RegistryError(
      `${app}: pnpm-lock.yaml has no \`importers['.']\` block — malformed, truncated, or ` +
        'workspace-poisoned (see scripts/check-lockfile-hygiene.mjs).',
    );
  }

  const declared = [];
  for (const field of DEP_FIELDS) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (!name.startsWith(OWN_SCOPE)) continue;
      const lockEntry = importer[field]?.[name];
      declared.push({
        app,
        field,
        name,
        range: String(range),
        lockSpecifier: lockEntry?.specifier === undefined ? null : String(lockEntry.specifier),
        resolved: lockEntry?.version === undefined ? null : readResolvedVersion(String(lockEntry.version)),
      });
    }
  }

  // Zero @bsuite deps in an app that has them is the silent-scan failure this
  // whole guard family exists to retire. Every app in this estate consumes at
  // least @bsuite/theme; a zero here means we read the wrong file.
  if (declared.length === 0) {
    throw new RegistryError(
      `${app}: package.json declares ZERO ${OWN_SCOPE}* dependencies across ` +
        `${DEP_FIELDS.join('/')}. Every app in this estate consumes at least one, so this is a ` +
        'scan defect (wrong root? wrong file?), not a clean result. Refusing to report a pass.',
    );
  }

  const embargo = await readEmbargo(appDir);
  return { app, declared, embargo };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function isExactSpec(range) {
  // `1.2.3` is exact. `=1.2.3`, `^1.2.3`, `~1.2.3`, `>=1.2.3`, `1.x`, `*`,
  // `workspace:*`, `catalog:` are not.
  return semver.valid(range) !== null;
}

function classifyEdge(edge, packument, embargo, now) {
  const { name, range, resolved } = edge;

  if (!packument.published) {
    return { status: 'NOT-PUBLISHED', latest: null, ceiling: null, detail: 'registry returns 404 (private or never published)' };
  }
  const latest = packument.latest;

  if (resolved === null) {
    return {
      status: 'UNRESOLVED',
      latest,
      ceiling: null,
      detail: 'declared in package.json but ABSENT from the lockfile importer — lockfile is out of step with the manifest',
    };
  }
  if (resolved.kind === 'link') {
    return { status: 'LINKED', latest, ceiling: null, detail: `resolved to ${resolved.raw}` };
  }
  if (resolved.kind !== 'version') {
    return { status: 'UNRESOLVED', latest, ceiling: null, detail: `lockfile version ${JSON.stringify(resolved.raw)} is not parseable as semver` };
  }

  const ceiling = installableCeiling(packument, embargo, name, now);

  if (semver.gt(resolved.version, latest)) {
    return {
      status: 'AHEAD',
      latest,
      ceiling: ceiling.version,
      detail: `lockfile resolves ABOVE dist-tags.latest (${latest}) — unpublished head or mis-tagged release`,
    };
  }
  if (semver.eq(resolved.version, latest)) {
    return { status: 'CURRENT', latest, ceiling: ceiling.version, detail: '' };
  }

  // resolved < latest from here down.
  if (ceiling.version === null || (ceiling.held && semver.gte(resolved.version, ceiling.version))) {
    return {
      status: 'EMBARGOED',
      latest,
      ceiling: ceiling.version,
      detail:
        `${latest} is inside this app's own ${ceiling.heldMinutes}-minute minimumReleaseAge window ` +
        `and ${name} is not in minimumReleaseAgeExclude — highest installable is ` +
        `${ceiling.version ?? '(none yet)'}`,
    };
  }

  if (isExactSpec(range) && semver.lt(range, ceiling.version)) {
    return {
      status: 'EXACT-PINNED-BEHIND',
      latest,
      ceiling: ceiling.version,
      detail:
        `package.json pins the EXACT version ${range} with no caret/tilde, so no lockfile refresh ` +
        `can ever reach ${ceiling.version}. Edit package.json (this is the @bsuite/dry-lint 0.5.0 shape).`,
    };
  }

  if (semver.satisfies(ceiling.version, range, { includePrerelease: false })) {
    return {
      status: 'STALE-BUT-IN-RANGE',
      latest,
      ceiling: ceiling.version,
      detail:
        `the declared range ${range} ALREADY ADMITS ${ceiling.version}; only the lockfile pin holds ` +
        `${resolved.version} in place. Fixable by a pure lockfile refresh, zero package.json risk.`,
    };
  }

  return {
    status: 'RANGE-BEHIND',
    latest,
    ceiling: ceiling.version,
    detail:
      `${ceiling.version} is OUTSIDE the declared range ${range} — needs a deliberate package.json ` +
      'bump and possibly a breaking-change review. Human decision, reported not failed.',
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function run({ root, apps, registry, fixture, minPackages, now }) {
  const client = makeRegistryClient({ registry, fixture });
  const harnessErrors = [];
  const rows = [];

  for (const app of apps) {
    let read;
    try {
      read = await readApp(root, app);
    } catch (error) {
      harnessErrors.push(error.message);
      continue;
    }
    for (const edge of read.declared) {
      let packument;
      try {
        packument = await client.get(edge.name);
      } catch (error) {
        harnessErrors.push(`${app}: ${error.message}`);
        continue;
      }
      let verdict;
      try {
        verdict = classifyEdge(edge, packument, read.embargo, now);
      } catch (error) {
        // Classification itself can refuse (e.g. an embargo it cannot
        // evaluate). A refusal is a harness failure, never a quiet pass.
        harnessErrors.push(`${app}: ${error.message}`);
        continue;
      }
      rows.push({ ...edge, ...verdict, embargoSource: read.embargo.source });
    }
  }

  return { rows, harnessErrors, apps, minPackages, registrySource: client.source, distinctPackages: client.packageCount };
}

function report(result, { json }) {
  const { rows, harnessErrors, apps, minPackages, registrySource, distinctPackages } = result;

  if (json) {
    console.log(JSON.stringify({ registrySource, apps, rows, harnessErrors, distinctPackages }, null, 2));
  }

  const failures = rows.filter((r) => FAILING.has(r.status));
  const warnings = rows.filter((r) => WARNING.has(r.status));
  const unresolved = rows.filter((r) => r.status === 'UNRESOLVED');
  const informational = rows.filter((r) => ['EMBARGOED', 'LINKED', 'NOT-PUBLISHED'].includes(r.status));
  const current = rows.filter((r) => r.status === 'CURRENT');

  if (!json) {
    console.log(`check-own-package-freshness — registry: ${registrySource}`);
    console.log('');
    for (const app of apps) {
      const appRows = rows.filter((r) => r.app === app);
      if (appRows.length === 0) continue;
      console.log(`${app} (${appRows.length} ${OWN_SCOPE}* edge(s))`);
      for (const r of appRows.sort((a, b) => a.name.localeCompare(b.name))) {
        const mark = FAILING.has(r.status) || r.status === 'UNRESOLVED' ? '✗' : WARNING.has(r.status) ? '!' : r.status === 'CURRENT' ? '✓' : '·';
        const lock = r.resolved?.version ?? r.resolved?.raw ?? '(absent)';
        console.log(
          `  ${mark} ${r.name.padEnd(28)} declared ${String(r.range).padEnd(12)} lock ${String(lock).padEnd(12)} ` +
            `latest ${String(r.latest ?? '-').padEnd(10)} ${r.status}`,
        );
        if (r.detail) console.log(`      ${r.detail}`);
        if (r.lockSpecifier !== null && r.lockSpecifier !== r.range) {
          console.log(
            `      NOTE: lockfile records specifier ${JSON.stringify(r.lockSpecifier)} but package.json declares ` +
              `${JSON.stringify(r.range)} — the lockfile was generated from a different manifest ` +
              '(`pnpm install --frozen-lockfile` will refuse). Not counted as a freshness failure.',
          );
        }
      }
      console.log('');
    }
  }

  // ---- floors: a guard that examined nothing has verified nothing --------
  const hardStops = [...harnessErrors];
  if (rows.length === 0) {
    hardStops.push(
      `CANNOT REPORT — examined 0 ${OWN_SCOPE}* dependency edges across ${apps.length} app(s). ` +
        'Refusing to report a clean freshness check against nothing.',
    );
  } else if (rows.length < minPackages) {
    hardStops.push(
      `CANNOT REPORT — examined ${rows.length} ${OWN_SCOPE}* dependency edge(s), below the declared ` +
        `floor of ${minPackages}. Either apps stopped consuming our packages (investigate) or the ` +
        'walk found the wrong tree. Not a pass.',
    );
  }
  for (const app of apps) {
    if (rows.some((r) => r.app === app)) continue;
    if (harnessErrors.some((e) => e.startsWith(`${app}:`))) continue;
    hardStops.push(`${app}: yielded 0 examined edges and reported no error — silent scan, not a pass.`);
  }

  if (hardStops.length > 0) {
    console.error('');
    console.error(`HARNESS FAILURE — ${hardStops.length} condition(s) prevent a verdict:`);
    for (const e of hardStops) console.error(`  ✗ ${e}`);
    console.error('');
    console.error(
      `check-own-package-freshness: UNVERIFIED — ${rows.length} edge(s) examined across ` +
        `${apps.length} app(s); the run did not complete. Exit 2.`,
    );
    return 2;
  }

  const summary =
    `check-own-package-freshness: ${apps.length} app(s), ${rows.length} ${OWN_SCOPE}* dependency edge(s) ` +
    `examined across ${distinctPackages} distinct published package(s) via ${registrySource} — ` +
    `${current.length} current, ${failures.filter((r) => r.status === 'STALE-BUT-IN-RANGE').length} stale-but-in-range, ` +
    `${failures.filter((r) => r.status === 'EXACT-PINNED-BEHIND').length} exact-pinned-behind, ` +
    `${warnings.filter((r) => r.status === 'RANGE-BEHIND').length} range-behind, ` +
    `${warnings.filter((r) => r.status === 'AHEAD').length} ahead, ` +
    `${informational.filter((r) => r.status === 'EMBARGOED').length} embargoed, ` +
    `${informational.filter((r) => r.status === 'LINKED').length} linked, ` +
    `${informational.filter((r) => r.status === 'NOT-PUBLISHED').length} not-published.`;

  if (warnings.length > 0) {
    console.error(`${warnings.length} WARNING(S) — human decision required, not failing the build:`);
    for (const r of warnings) console.error(`  ! ${r.app} ${r.name}: ${r.detail}`);
    console.error('');
  }

  if (failures.length > 0 || unresolved.length > 0) {
    console.error(
      `FRESHNESS FAILURE — ${failures.length + unresolved.length} of ${rows.length} edge(s) do not run our latest:`,
    );
    for (const r of [...failures, ...unresolved]) {
      console.error(`  ✗ ${r.app} ${r.name} ${r.resolved?.version ?? '(absent)'} < ${r.ceiling ?? r.latest} [${r.status}]`);
    }
    console.error('');
    console.error(
      'The standing directive is that consuming apps run the LATEST version of the packages this ' +
        'estate publishes. STALE-BUT-IN-RANGE is fixed by regenerating the app lockfile OUTSIDE the ' +
        'bsuite tree (see CLAUDE.md "Lockfile generation"); EXACT-PINNED-BEHIND needs a package.json edit.',
    );
    console.error('');
    console.error(summary);
    return 1;
  }

  console.log(summary);
  return 0;
}

// ---------------------------------------------------------------------------
// Self-test — prove it FAILS before trusting it to PASS
// ---------------------------------------------------------------------------

function iso(msAgo, now) {
  return new Date(now - msAgo).toISOString();
}

async function writeApp(dir, { deps = {}, devDeps = {}, lockDeps = {}, lockDevDeps = {}, workspace = null }) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: path.basename(dir), version: '0.0.0', dependencies: deps, devDependencies: devDeps }, null, 2),
  );
  const importer = {};
  if (Object.keys(lockDeps).length) importer.dependencies = lockDeps;
  if (Object.keys(lockDevDeps).length) importer.devDependencies = lockDevDeps;
  await writeFile(
    path.join(dir, 'pnpm-lock.yaml'),
    YAML.stringify({
      lockfileVersion: '9.0',
      // A decoy `overrides:` block whose KEYS look exactly like package names
      // with versions. The regression this guard's header names: a previous
      // pass grepped this block and reported its keys as resolved versions.
      overrides: { '@bsuite/theme': '0.1.0', '@bsuite/ui': '0.0.1' },
      importers: { '.': importer },
      packages: {},
    }),
  );
  if (workspace) await writeFile(path.join(dir, 'pnpm-workspace.yaml'), YAML.stringify(workspace));
}

function spawnSelf(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SELF, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('close', (code) => resolve({ code, out, err, all: out + err }));
  });
}

async function selfTest() {
  const now = Date.now();
  const DAY = 86_400_000;
  const tmp = await mkdtemp(path.join(tmpdir(), 'own-package-freshness-'));

  try {
    const registry = {
      '@bsuite/theme': {
        'dist-tags': { latest: '0.11.2' },
        time: { created: iso(90 * DAY, now), '0.11.0': iso(40 * DAY, now), '0.11.1': iso(30 * DAY, now), '0.11.2': iso(4 * DAY, now) },
      },
      '@bsuite/dry-lint': {
        'dist-tags': { latest: '1.0.1' },
        time: { '0.5.0': iso(120 * DAY, now), '1.0.0': iso(60 * DAY, now), '1.0.1': iso(30 * DAY, now) },
      },
      '@bsuite/nav-core': {
        'dist-tags': { latest: '1.4.0' },
        time: { '0.9.0': iso(60 * DAY, now), '0.9.1': iso(50 * DAY, now), '1.4.0': iso(20 * DAY, now) },
      },
      '@bsuite/auth': { 'dist-tags': { latest: '0.2.8' }, time: { '0.2.7': iso(70 * DAY, now), '0.2.8': iso(20 * DAY, now) } },
      // No `time` map at all — the shape the abbreviated packument returns.
      '@bsuite/no-times': { 'dist-tags': { latest: '2.0.0' } },
      '@bsuite/never-published': '404',
    };
    const registryPath = path.join(tmp, 'registry.json');
    await writeFile(registryPath, JSON.stringify(registry));

    const lockEntry = (specifier, version) => ({ specifier, version });

    // 1. STALE-BUT-IN-RANGE — the theme dark-mode shape. ^0.11.1 admits 0.11.2.
    await writeApp(path.join(tmp, 'stale-app'), {
      deps: { '@bsuite/theme': '^0.11.1' },
      lockDeps: { '@bsuite/theme': lockEntry('^0.11.1', '0.11.1(react@19.2.8)(tailwindcss@4.3.3)') },
    });

    // 2. EXACT-PINNED-BEHIND — the dry-lint 0.5.0 shape.
    await writeApp(path.join(tmp, 'exact-app'), {
      devDeps: { '@bsuite/dry-lint': '0.5.0' },
      lockDevDeps: { '@bsuite/dry-lint': lockEntry('0.5.0', '0.5.0(eslint@10.8.0)(typescript@6.0.3)') },
    });

    // 3. RANGE-BEHIND — 1.4.0 is outside ^0.9.0. Warn only.
    await writeApp(path.join(tmp, 'range-app'), {
      deps: { '@bsuite/nav-core': '^0.9.0' },
      lockDeps: { '@bsuite/nav-core': lockEntry('^0.9.0', '0.9.1(react@19.2.8)') },
    });

    // 4. EMBARGOED — theme 0.11.2 is 4 days old, embargo is 7 days (10080 min),
    //    and @bsuite/theme is NOT excluded here. Informational, exit 0.
    await writeApp(path.join(tmp, 'embargo-app'), {
      deps: { '@bsuite/theme': '^0.11.1' },
      lockDeps: { '@bsuite/theme': lockEntry('^0.11.1', '0.11.1(react@19.2.8)') },
      workspace: { packages: ['.'], minimumReleaseAge: 10_080, minimumReleaseAgeExclude: ['@bsuite/auth'] },
    });

    // 5. EMBARGO EXCLUDED — same tree, but theme IS excluded, so the embargo
    //    must NOT rescue it. Proves the exclude list is honoured.
    await writeApp(path.join(tmp, 'embargo-excluded-app'), {
      deps: { '@bsuite/theme': '^0.11.1' },
      lockDeps: { '@bsuite/theme': lockEntry('^0.11.1', '0.11.1(react@19.2.8)') },
      workspace: { packages: ['.'], minimumReleaseAge: 10_080, minimumReleaseAgeExclude: ['@bsuite/*'] },
    });

    // 5b. EMBARGO DECLARED BUT NO PUBLISH TIMES — must refuse, not excuse.
    //     Regression fixture for the 2026-08-17 abbreviated-packument defect.
    await writeApp(path.join(tmp, 'embargo-notime-app'), {
      deps: { '@bsuite/no-times': '1.0.0' },
      lockDeps: { '@bsuite/no-times': lockEntry('1.0.0', '1.0.0') },
      workspace: { packages: ['.'], minimumReleaseAge: 10_080 },
    });

    // 6. CURRENT.
    await writeApp(path.join(tmp, 'current-app'), {
      deps: { '@bsuite/auth': '0.2.8', '@bsuite/theme': '^0.11.1' },
      lockDeps: {
        '@bsuite/auth': lockEntry('0.2.8', '0.2.8'),
        '@bsuite/theme': lockEntry('^0.11.1', '0.11.2(react@19.2.8)(tailwindcss@4.3.3)'),
      },
    });

    // 7. NOT-PUBLISHED — must not crash.
    await writeApp(path.join(tmp, 'unpublished-app'), {
      deps: { '@bsuite/never-published': '^1.0.0' },
      lockDeps: { '@bsuite/never-published': lockEntry('^1.0.0', '1.0.0') },
    });

    // 8. LINKED.
    await writeApp(path.join(tmp, 'linked-app'), {
      deps: { '@bsuite/theme': 'workspace:*' },
      lockDeps: { '@bsuite/theme': lockEntry('workspace:*', 'link:../packages/theme') },
    });

    // 9. Zero @bsuite deps — a silent scan, must be a HARD failure.
    await writeApp(path.join(tmp, 'empty-app'), { deps: { react: '^19.2.8' }, lockDeps: { react: lockEntry('^19.2.8', '19.2.8') } });

    // 10. Uninitialised submodule — an EMPTY DIRECTORY that passes `-d`.
    await mkdir(path.join(tmp, 'uninit-app'), { recursive: true });

    // 11. Declared in package.json, absent from the lockfile.
    await writeApp(path.join(tmp, 'unresolved-app'), { deps: { '@bsuite/theme': '^0.11.1' }, lockDeps: {} });

    const base = [`--root=${tmp}`, `--registry-fixture=${registryPath}`, '--min-packages=1'];
    const cases = [
      { label: 'stale-but-in-range fixture EXITS 1', args: [...base, '--apps=stale-app'], code: 1, expect: ['STALE-BUT-IN-RANGE', 'ALREADY ADMITS 0.11.2'] },
      { label: 'exact-pinned-behind fixture EXITS 1', args: [...base, '--apps=exact-app'], code: 1, expect: ['EXACT-PINNED-BEHIND'] },
      { label: 'range-behind fixture EXITS 0 (warn only)', args: [...base, '--apps=range-app'], code: 0, expect: ['RANGE-BEHIND', '1 range-behind'] },
      { label: 'embargoed fixture EXITS 0', args: [...base, '--apps=embargo-app'], code: 0, expect: ['EMBARGOED', '1 embargoed'] },
      { label: 'embargo EXCLUDE list is honoured -> EXITS 1', args: [...base, '--apps=embargo-excluded-app'], code: 1, expect: ['STALE-BUT-IN-RANGE'] },
      { label: 'embargo with NO publish times EXITS 2, never EMBARGOED', args: [...base, '--apps=embargo-notime-app'], // `EMBARGOED\n` is the VERDICT-COLUMN form (status is last on the row).
      // Rejecting the bare word would match the refusal text itself, which
      // legitimately says "Refusing to report EMBARGOED (or CURRENT)".
      code: 2, expect: ['NO version publish times'], reject: ['EMBARGOED\n', '1 embargoed'] },
      { label: 'current fixture EXITS 0', args: [...base, '--apps=current-app'], code: 0, expect: ['2 current'] },
      { label: 'never-published package does not crash', args: [...base, '--apps=unpublished-app'], code: 0, expect: ['NOT-PUBLISHED'] },
      { label: 'link: resolution reported, not failed', args: [...base, '--apps=linked-app'], code: 0, expect: ['LINKED'] },
      { label: 'app with ZERO @bsuite deps EXITS 2', args: [...base, '--apps=empty-app'], code: 2, expect: ['ZERO @bsuite/* dependencies'] },
      { label: 'uninitialised submodule EXITS 2', args: [...base, '--apps=uninit-app'], code: 2, expect: ['uninitialised submodule'] },
      { label: 'declared-but-unlocked EXITS 1', args: [...base, '--apps=unresolved-app'], code: 1, expect: ['UNRESOLVED'] },
      { label: 'package floor not met EXITS 2', args: [`--root=${tmp}`, `--registry-fixture=${registryPath}`, '--apps=current-app', '--min-packages=99'], code: 2, expect: ['below the declared', 'floor of 99'] },
      { label: 'unreachable registry EXITS 2 (fail closed)', args: [`--root=${tmp}`, '--apps=current-app', '--min-packages=1', '--registry=http://127.0.0.1:1/nope'], code: 2, expect: ['fail closed'] },
      { label: 'decoy overrides: block is NOT read as a resolved version', args: [...base, '--apps=current-app'], code: 0, expect: ['@bsuite/theme'], reject: ['lock 0.1.0', 'lock 0.0.1'] },
      { label: 'mixed tree fails on the failing app', args: [...base, '--apps=current-app,stale-app,range-app'], code: 1, expect: ['1 stale-but-in-range', '1 range-behind'] },
    ];

    let passed = 0;
    for (const c of cases) {
      const r = await spawnSelf(c.args);
      const codeOk = r.code === c.code;
      const expectOk = (c.expect ?? []).every((s) => r.all.includes(s));
      const rejectOk = (c.reject ?? []).every((s) => !r.all.includes(s));
      if (codeOk && expectOk && rejectOk) {
        passed++;
        console.log(`  ✓ ${c.label} (exit ${r.code})`);
      } else {
        console.error(`  ✗ ${c.label} — expected exit ${c.code}, got ${r.code}`);
        if (!expectOk) console.error(`      missing expected text: ${JSON.stringify((c.expect ?? []).filter((s) => !r.all.includes(s)))}`);
        if (!rejectOk) console.error(`      found forbidden text: ${JSON.stringify((c.reject ?? []).filter((s) => r.all.includes(s)))}`);
        console.error(r.all.split('\n').map((l) => `      | ${l}`).join('\n'));
      }
    }

    console.log('');
    console.log(`check-own-package-freshness: self-test ${passed}/${cases.length} case(s) passed (${cases.length} child process runs).`);
    return passed === cases.length ? 0 : 1;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(args, flag, fallback) {
  const hit = args.find((a) => a.startsWith(`${flag}=`));
  return hit === undefined ? fallback : hit.slice(flag.length + 1);
}

const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntryPoint) {
  const args = process.argv.slice(2);

  if (args.includes('--self-test')) {
    process.exit(await selfTest());
  }

  const root = path.resolve(argValue(args, '--root', process.cwd()));
  const appsArg = argValue(args, '--apps', null);
  const apps = appsArg ? appsArg.split(',').map((s) => s.trim()).filter(Boolean) : APP_REPOS;
  const registry = argValue(args, '--registry', process.env.NPM_CONFIG_REGISTRY || DEFAULT_REGISTRY);
  const fixturePath = argValue(args, '--registry-fixture', null);
  const minPackages = Number(argValue(args, '--min-packages', appsArg ? '1' : String(DEFAULT_MIN_PACKAGES)));
  const fixture = fixturePath ? JSON.parse(await readFile(path.resolve(fixturePath), 'utf8')) : null;

  const result = await run({ root, apps, registry, fixture, minPackages, now: Date.now() });
  process.exit(report(result, { json: args.includes('--json') }));
}
