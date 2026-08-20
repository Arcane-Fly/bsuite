#!/usr/bin/env node
/**
 * check-shared-package-reach.mjs — a shared @bsuite/* package fix that merges
 * to `development` is not "done" the moment it is merged. It reaches nobody
 * until every consumer's `pnpm-lock.yaml` actually RESOLVES it, and
 * `--frozen-lockfile` (every Vercel `installCommand` in this estate) refuses
 * to move the resolved version on its own.
 *
 * WHY THIS EXISTS
 *
 * Measured 2026-08-20, `@bsuite/schema-builder`:
 *
 *   packages/schema-builder/package.json version (on development)   1.4.0
 *   npm latest for @bsuite/schema-builder                           1.3.1
 *   pnpm-lock.yaml pin in crm7 / BSU / conduit                      1.3.1
 *   Vercel installCommand in all three                              corepack enable
 *                                                                    && rm -rf node_modules
 *                                                                    && pnpm install --frozen-lockfile
 *
 * `publish-schema-builder.yml` fires on push to `main` when
 * `packages/schema-builder/**` changed, so promoting `development` to `main`
 * publishes 1.4.0. But every consumer installs `--frozen-lockfile`, so it
 * keeps installing 1.3.1 regardless. The declared range (`^1.3.1`) would
 * accept 1.4.0 — the LOCKFILE is what refuses it, and nothing else in the
 * estate reads the lockfile against the package's OWN source of truth.
 *
 * This happened TWICE in 48 hours to two different packages:
 *   bsuite#2190 — @bsuite/schema-builder, three consumers pinned 1.3.1
 *                 against 1.4.0.
 *   bsuite#2189 — @bsuite/page-builder, five consumers pinned 1.0.1
 *                 against a 1.0.2 fix ("an authored seed height is not a
 *                 height the user chose"); npm latest was still 1.0.1 at
 *                 measurement time.
 *
 * Both write-ups name the same systemic gap: the publish path has no
 * lockfile-refresh step. This guard is the detector for that gap. It does
 * not fix the gap itself — see the "publish -> reach" procedure in
 * docs/20260731-platform-operations-reference-v1.00W.md, which this guard's
 * failure output points readers to.
 *
 * Re-run 2026-08-20 while writing this guard turned up two MORE unreachable
 * fixes nobody had reported yet, same shape:
 *
 *   @bsuite/schema-registry   repo 1.0.3, npm latest 1.0.2, ALL SIX
 *                             consumers pinned at 1.0.2
 *   @bsuite/ui                repo 1.3.0, npm latest 1.2.2, all FOUR
 *                             consumers that depend on it pinned at 1.2.2
 *
 * See this script's own output for the current, live table — do not trust
 * the counts above once this file ages; re-run it.
 *
 * HOW THIS DIFFERS FROM ITS TWO NEIGHBOURS WITH SIMILAR NAMES
 *
 * Three related, non-duplicate checks exist in this repo. Each reads a
 * different pair of numbers, and each catches a defect the other two cannot:
 *
 *   scripts/check-shared-package-reach.py (existing, unchanged by this file)
 *     compares a consumer's DECLARED RANGE in package.json against npm
 *     LATEST. Catches a caret that structurally cannot reach latest at all
 *     (a 0.x minor lock) — a package.json-authoring defect. Blind to the
 *     lockfile entirely: a correctly-ranged package.json with a stale
 *     lockfile pin reads as clean.
 *
 *   scripts/check-own-package-freshness.mjs (existing, unchanged by this
 *   file)
 *     compares a consumer's LOCKFILE PIN against npm LATEST. Catches the
 *     defect this file's header used as its own motivating incidents
 *     (dry-lint 0.5.0, theme 0.11.2) — but only AFTER npm has published the
 *     newer version. Before that, `lockfile pin == npm latest` reads
 *     CURRENT, which is exactly the schema-builder/page-builder/
 *     schema-registry/ui state today: npm has not been asked to publish yet,
 *     so the existing freshness guard is silent on all four.
 *
 *   THIS FILE compares a consumer's LOCKFILE PIN against the REPO'S OWN
 *   packages/<name>/package.json version — the version this monorepo
 *   currently declares, whether or not it has reached npm yet. That is the
 *   earliest point any automation can see the defect: the moment a version
 *   bump merges to `development`, before promotion, before publish, before
 *   the existing freshness guard has anything to compare against.
 *
 * WHAT IT CHECKS
 *
 * For every @bsuite/<name> package under packages/ with a non-private
 * package.json: read its declared version. For every app that names it as a
 * dependency, resolve what that app's pnpm-lock.yaml importers['.'] block
 * ACTUALLY PINS — never grepped; the lockfile is walked with a state machine
 * scoped to `importers: -> '.': -> {dependencies,devDependencies,
 * optionalDependencies}:`, the same scoping check-own-package-freshness.mjs
 * uses, specifically so a same-shaped `name: version` pair sitting in an
 * `overrides:` block (a documented decoy in this exact file format — see the
 * self-test) is never mistaken for a resolved pin.
 *
 *   FAIL   the lockfile pin is OLDER than the repo's declared version. This
 *          fix cannot reach the app no matter what promotes or publishes,
 *          until someone regenerates that lockfile.
 *   REPORT the repo's declared version is NEWER than npm's published latest.
 *          This is the normal, harmless state between a merge and the next
 *          promotion — reported so a reader can tell "not yet published"
 *          apart from "published and still unreached", never failed.
 *
 * A registry lookup failure (rate limit, offline) degrades the REPORT line
 * to "npm: unreachable" and does NOT fail the guard — npm's state is not
 * load-bearing for the FAIL verdict above, which is a pure repo-vs-lockfile
 * comparison and needs no network access at all.
 *
 * Usage:
 *   node scripts/check-shared-package-reach.mjs
 *   node scripts/check-shared-package-reach.mjs --self-test
 *   node scripts/check-shared-package-reach.mjs --require-edges=40
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** App directory -> nothing else needed; every app's pnpm-lock.yaml lives at its root. */
const APPS = ['crm7', 'business-suite-unified', 'throughput', 'braden', 'conduit', 'R80.4']

// ---------------------------------------------------------------------------
// Pure functions — no file I/O, no network. Exercised directly by --self-test.
// ---------------------------------------------------------------------------

/**
 * Resolve what a pnpm-lock.yaml's `importers['.']` block pins for `pkgName`.
 *
 * Scoped to importers -> '.' -> {dependencies,devDependencies,
 * optionalDependencies} ONLY. A pnpm-lock.yaml legitimately carries other
 * top-level maps shaped exactly like `name: version` pairs — most
 * dangerously `overrides:`, which can name the SAME package at a DIFFERENT
 * version for reasons unrelated to what is actually installed. A scan that
 * is not scoped to the importer block will read whichever one it meets
 * first, which is how a previous pass in this repo (check-own-package-
 * freshness.mjs's own header names it) reported an `overrides:` block's keys
 * as resolved versions.
 *
 * Returns { specifier, version, kind } where kind is 'version' | 'link' |
 * null (not found in the '.' importer at all).
 */
export function readLockPin(lockText, pkgName) {
  const lines = lockText.split('\n')
  const FIELDS = new Set(['dependencies', 'devDependencies', 'optionalDependencies'])
  let state = 'top' // top -> importers -> dot -> field -> pkgkv
  let field = null
  let pkg = null
  let specifier = null
  let version = null

  const anyPkgKeyRe = /^ {6}'?([^':]+)'?:\s*$/
  const fieldKeyRe = /^ {4}(\S[^:]*):\s*$/
  const importerKeyRe = /^ {2}(\S[^:]*):\s*$/

  for (const line of lines) {
    if (/^\S/.test(line)) {
      state = line === 'importers:' ? 'importers' : 'top'
      continue
    }
    if (state === 'top') continue

    if (state === 'importers') {
      const m = line.match(importerKeyRe)
      if (m) state = m[1] === '.' ? 'dot' : 'importers'
      continue
    }

    if (state === 'dot') {
      const m = line.match(fieldKeyRe)
      if (m && FIELDS.has(m[1])) {
        field = m[1]
        state = 'field'
        continue
      }
      if (/^ {2}\S/.test(line)) state = 'importers' // left '.' for the next importer
      continue
    }

    if (state === 'field' || state === 'pkgkv') {
      if (state === 'pkgkv') {
        const mv = line.match(/^ {8}version:\s*(.+)$/)
        const ms = line.match(/^ {8}specifier:\s*(.+)$/)
        if (mv && pkg === pkgName) version = mv[1].trim()
        if (ms && pkg === pkgName) specifier = ms[1].trim()
        if (version !== null && pkg === pkgName) break // found what we came for
      }
      const pm = line.match(anyPkgKeyRe)
      if (pm) {
        pkg = pm[1]
        state = 'pkgkv'
        continue
      }
      const fm = line.match(fieldKeyRe)
      if (fm && FIELDS.has(fm[1])) {
        field = fm[1]
        state = 'field'
        continue
      }
      if (/^ {2}\S/.test(line) && !/^ {4}/.test(line)) state = 'importers'
      continue
    }
  }

  if (version === null) return { specifier, version: null, kind: null }
  if (version.startsWith('link:') || version.startsWith('file:')) {
    return { specifier, version, kind: 'link' }
  }
  // Strip peer-resolution suffixes: `1.2.3(react@19.2.8)(...)` -> `1.2.3`.
  // Strip an `npm:other-name@` alias prefix if present.
  let base = version.split('(')[0].trim()
  const at = base.lastIndexOf('@')
  if (at > 0) base = base.slice(at + 1)
  return { specifier, version: base, kind: 'version' }
}

/** Plain X.Y.Z compare. Returns -1/0/1. Neither side here is ever a range. */
export function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10))
  const pb = String(b).split('.').map((n) => parseInt(n, 10))
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

/**
 * Is this specifier an EXACT pin (no ^ ~ >= workspace: catalog: etc)? An
 * exact pin cannot be fixed by regenerating the lockfile alone — the
 * package.json specifier itself has to move first, the same distinction
 * check-own-package-freshness.mjs's EXACT-PINNED-BEHIND status draws. Used
 * only to sharpen the FAIL message below; it does not change the verdict.
 */
export function isExactSpecifier(spec) {
  return typeof spec === 'string' && /^\d+\.\d+\.\d+/.test(spec.trim())
}

/**
 * The decision at the heart of the guard, pure so --self-test exercises the
 * real logic rather than a paraphrase of it.
 *
 *   repoVersion  packages/<name>/package.json version, this tree
 *   lockVersion  what a consumer's lockfile resolves (null / 'link' handled
 *                by the caller before this is reached)
 *   npmLatest    dist-tags.latest, or null if unpublished / unreachable
 */
export function classify(repoVersion, lockVersion, npmLatest) {
  const lockCmp = compareVersions(lockVersion, repoVersion)
  const unreachable = lockCmp < 0
  const npmCmp = npmLatest ? compareVersions(repoVersion, npmLatest) : null
  const repoAheadOfNpm = npmCmp === 1
  return {
    unreachable,
    repoAheadOfNpm,
    /*
     * TWO REASONS A LOCKFILE CAN SIT BEHIND THE REPO. They are not the same
     * problem, and collapsing them made this guard block every version bump —
     * the one change that MUST be able to merge, because merging is what
     * triggers the publish.
     *
     *   AWAITING-PUBLISH  npm does not have this version. No lockfile CAN point
     *                     at it. Expected on a bump; a real defect on main.
     *   UNREACHABLE-FIX   npm HAS it and the lockfile still trails. Actionable
     *                     right now: regenerate the lockfile.
     *
     * The tell is `npm-latest == lock-pin`: when those agree and both trail the
     * repo, the publish never ran. Reading that as stale lockfiles is what cost
     * four days in August (bsuite#2189). The SEVERITY IS UNCHANGED ON MAIN —
     * see the branch policy at the call site — only the label and the branch it
     * blocks have moved.
     */
    status: unreachable
      ? repoAheadOfNpm
        ? 'AWAITING-PUBLISH'
        : 'UNREACHABLE-FIX'
      : lockCmp > 0
        ? 'LOCK-AHEAD-OF-REPO'
        : 'OK',
  }
}

// ---------------------------------------------------------------------------
// Self-test — a gate whose pass and no-op states are indistinguishable hides
// defects, so prove the detectors can still fail before trusting a pass.
// ---------------------------------------------------------------------------
if (process.argv.includes('--self-test')) {
  const cases = []
  let bad = 0

  function check(name, got, expected) {
    cases.push(name)
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      console.error(`SELF-TEST FAIL: ${name}`)
      console.error(`  expected: ${JSON.stringify(expected)}`)
      console.error(`  got:      ${JSON.stringify(got)}`)
      bad++
    }
  }

  // --- readLockPin: the normal shapes -------------------------------------
  const NORMAL_LOCK = [
    'lockfileVersion: 9.0',
    '',
    'importers:',
    '',
    "  .:",
    '    dependencies:',
    "      '@bsuite/schema-builder':",
    '        specifier: ^1.3.1',
    '        version: 1.3.1(react@19.2.8)(zod@4.4.3)',
    "      '@bsuite/theme':",
    '        specifier: ^1.0.0',
    '        version: 1.0.1(react@19.2.8)',
    '    devDependencies:',
    "      '@bsuite/eslint-config':",
    '        specifier: 1.0.0',
    '        version: 1.0.0',
  ].join('\n')

  check('reads a dependencies-block pin, strips peer suffixes', readLockPin(NORMAL_LOCK, '@bsuite/schema-builder'), {
    specifier: '^1.3.1',
    version: '1.3.1',
    kind: 'version',
  })
  check('does not confuse a neighbouring package', readLockPin(NORMAL_LOCK, '@bsuite/theme'), {
    specifier: '^1.0.0',
    version: '1.0.1',
    kind: 'version',
  })
  check('reads a devDependencies-block pin too', readLockPin(NORMAL_LOCK, '@bsuite/eslint-config'), {
    specifier: '1.0.0',
    version: '1.0.0',
    kind: 'version',
  })
  check('a package absent from the importer returns null', readLockPin(NORMAL_LOCK, '@bsuite/nav-core'), {
    specifier: null,
    version: null,
    kind: null,
  })

  // --- readLockPin: link:/file: -------------------------------------------
  const LINKED_LOCK = [
    'importers:',
    '',
    '  .:',
    '    dependencies:',
    "      '@bsuite/theme':",
    '        specifier: workspace:*',
    '        version: link:../packages/theme',
  ].join('\n')
  check('a link: resolution is reported as kind=link, not a version', readLockPin(LINKED_LOCK, '@bsuite/theme'), {
    specifier: 'workspace:*',
    version: 'link:../packages/theme',
    kind: 'link',
  })

  // --- THE ANTI-PROSE CASE ---------------------------------------------
  // A pnpm-lock.yaml's `overrides:` block is a top-level map shaped EXACTLY
  // like `name: version` — the same trap check-own-package-freshness.mjs
  // documents and pins a regression test for. Here the decoy is set to a
  // version NEWER than the repo declares (9.9.9), which is the sharpest form
  // of the test: a scan that is not scoped to the importer block would read
  // the decoy and wrongly report the consumer as current or ahead, when the
  // REAL pin (in `importers`) is genuinely behind. This is also the
  // "must still FAIL" case: tightening the parser to ignore the decoy must
  // not also blind it to the real, older pin sitting right below.
  const DECOY_OVERRIDES_LOCK = [
    'lockfileVersion: 9.0',
    '',
    'overrides:',
    "  '@bsuite/schema-builder': 9.9.9",
    "  '@bsuite/ui': 9.9.9",
    '',
    'importers:',
    '',
    '  .:',
    '    dependencies:',
    "      '@bsuite/schema-builder':",
    '        specifier: ^1.3.1',
    '        version: 1.3.1(zod@4.4.3)',
  ].join('\n')
  check(
    'a decoy `overrides:` entry is NOT read as the pin — the real (older) importers pin is',
    readLockPin(DECOY_OVERRIDES_LOCK, '@bsuite/schema-builder'),
    { specifier: '^1.3.1', version: '1.3.1', kind: 'version' },
  )
  check(
    'the decoy does not fabricate a pin for a package the importer never lists',
    readLockPin(DECOY_OVERRIDES_LOCK, '@bsuite/ui'),
    { specifier: null, version: null, kind: null },
  )
  // Proves the two halves together: the real pin (1.3.1) read from the decoy
  // fixture must still be UNREACHABLE against repo 1.4.0 — the anti-prose fix
  // does not relax the failure.
  //
  // Asserts `unreachable`, not the status string. With npm at 1.3.1 the precise
  // verdict is AWAITING-PUBLISH (the publish has not run); with npm at 1.4.0 it
  // is UNREACHABLE-FIX (the lockfile is genuinely stale). What this fixture is
  // FOR is that the decoy `overrides:` entry does not mask the real pin — so it
  // pins the reachability, and both npm states are covered explicitly.
  {
    const pin = readLockPin(DECOY_OVERRIDES_LOCK, '@bsuite/schema-builder')
    check(
      'REGRESSION PIN: the decoy fixture is still UNREACHABLE against repo 1.4.0 (npm behind)',
      classify('1.4.0', pin.version, '1.3.1').unreachable,
      true,
    )
    check(
      'REGRESSION PIN: and once npm HAS 1.4.0 it is the actionable UNREACHABLE-FIX',
      classify('1.4.0', pin.version, '1.4.0').status,
      'UNREACHABLE-FIX',
    )
  }

  // --- compareVersions ------------------------------------------------------
  check('equal versions', compareVersions('1.3.1', '1.3.1'), 0)
  check('older < newer (patch)', compareVersions('1.3.1', '1.4.0'), -1)
  check('newer > older (minor)', compareVersions('1.4.0', '1.3.1'), 1)
  check('handles differing segment counts', compareVersions('1.3', '1.3.1'), -1)
  check('double-digit segments sort numerically, not lexically', compareVersions('1.9.0', '1.10.0'), -1)

  // --- isExactSpecifier -----------------------------------------------------
  check('a caret range is not exact', isExactSpecifier('^1.3.1'), false)
  check('a tilde range is not exact', isExactSpecifier('~1.3.1'), false)
  check('workspace: is not exact', isExactSpecifier('workspace:*'), false)
  check('a bare version IS exact — the dry-lint 0.5.0 shape', isExactSpecifier('1.3.1'), true)
  check('leading/trailing space on a bare version is still exact', isExactSpecifier('  1.0.0  '), true)

  // --- classify: the three verdicts ----------------------------------------
  /*
   * THE TWO REGRESSION FIXTURES, RECLASSIFIED — READ THIS BEFORE CHANGING THEM.
   *
   * Both encode the same real incident: a package version sat in the repo while
   * npm still had the old one, and it was read as a stale-lockfile problem for
   * four days. `npm-latest == lock-pin` is the tell, and these fixtures exist so
   * that state can never be called OK.
   *
   * They now expect AWAITING-PUBLISH rather than UNREACHABLE-FIX. That is a
   * RENAME OF THE DIAGNOSIS, NOT A RELAXATION: on main the state still fails,
   * and now with a message that names the actual cause instead of sending
   * someone to regenerate a lockfile that has nowhere to go. The two cases
   * immediately below pin both halves of that policy, so a future edit cannot
   * quietly turn the main-branch failure off.
   *
   * What DID change: on a branch it no longer blocks. It had to — a version bump
   * necessarily declares a version npm does not have yet, so the old behaviour
   * made every bump unmergeable, including the one fixing a P1 the operator had
   * just reported.
   */
  check(
    'THE SCHEMA-BUILDER REGRESSION FIXTURE — lock 1.3.1 behind repo 1.4.0, npm still 1.3.1',
    classify('1.4.0', '1.3.1', '1.3.1'),
    { unreachable: true, repoAheadOfNpm: true, status: 'AWAITING-PUBLISH' },
  )
  check(
    'THE PAGE-BUILDER REGRESSION FIXTURE — lock 1.0.1 behind repo 1.0.2, npm still 1.0.1 (bsuite#2189)',
    classify('1.0.2', '1.0.1', '1.0.1'),
    { unreachable: true, repoAheadOfNpm: true, status: 'AWAITING-PUBLISH' },
  )
  check(
    'npm HAS the version and the lockfile still trails — that is the actionable one, and it stays UNREACHABLE-FIX',
    classify('1.4.0', '1.3.1', '1.4.0'),
    { unreachable: true, repoAheadOfNpm: false, status: 'UNREACHABLE-FIX' },
  )
  check(
    'AWAITING-PUBLISH and UNREACHABLE-FIX are never the same verdict for the same inputs',
    classify('1.4.0', '1.3.1', '1.3.1').status === classify('1.4.0', '1.3.1', '1.4.0').status,
    false,
  )
  check(
    'a lockfile pin equal to repo, npm already caught up: clean OK, no report',
    classify('1.0.1', '1.0.1', '1.0.1'),
    { unreachable: false, repoAheadOfNpm: false, status: 'OK' },
  )
  check(
    'repo just bumped, nobody promoted yet, but the lockfile ALREADY carries the new version ' +
      '(e.g. hand-verified ahead of CI): not a failure, npm-ahead is reported not failed',
    classify('1.4.0', '1.4.0', '1.3.1'),
    { unreachable: false, repoAheadOfNpm: true, status: 'OK' },
  )
  check(
    'npm registry unreachable (npmLatest=null) never fabricates a failure on its own',
    classify('1.0.1', '1.0.1', null),
    { unreachable: false, repoAheadOfNpm: false, status: 'OK' },
  )
  check(
    'a lockfile resolving ABOVE the repo version is surfaced, not silently OK',
    classify('1.0.1', '1.0.2', '1.0.1'),
    { unreachable: false, repoAheadOfNpm: false, status: 'LOCK-AHEAD-OF-REPO' },
  )

  if (bad) {
    console.error(`\n${bad} self-test failure(s) — the checker itself is broken; its verdicts mean nothing.`)
    process.exit(1)
  }
  console.log(`check-shared-package-reach --self-test: OK (${cases.length} cases)`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Real run
// ---------------------------------------------------------------------------

const requireArg = process.argv.find((a) => a.startsWith('--require-edges='))
const REQUIRE_EDGES = requireArg ? Number(requireArg.split('=')[1]) : 0

async function fetchNpmLatest(name) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (res.status === 404) return { published: false, latest: null }
    if (!res.ok) return { published: null, latest: null, error: `HTTP ${res.status}` }
    const json = await res.json()
    const latest = json?.['dist-tags']?.latest ?? null
    return { published: latest !== null, latest }
  } catch (err) {
    return { published: null, latest: null, error: err.message }
  }
}

// Which packages does this repo publish, and at what version? Skip private
// (internal-only) packages — they have no reach question, nobody installs
// them from npm.
const packagesDir = join(ROOT, 'packages')
const repoPackages = new Map() // name -> version
for (const dir of existsSync(packagesDir) ? readdirSync(packagesDir).sort() : []) {
  const pkgPath = join(packagesDir, dir, 'package.json')
  if (!existsSync(pkgPath)) continue
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  if (pkg.private) continue
  if (!pkg.name?.startsWith('@bsuite/')) continue
  repoPackages.set(pkg.name, pkg.version)
}

const rows = []
const notes = []

for (const app of APPS) {
  const appDir = join(ROOT, app)
  const pkgPath = join(appDir, 'package.json')
  const lockPath = join(appDir, 'pnpm-lock.yaml')
  if (!existsSync(pkgPath)) {
    notes.push(`${app}: no package.json — submodule not initialised, skipped`)
    continue
  }
  if (!existsSync(lockPath)) {
    console.error(`FAIL ${app}: has package.json but no pnpm-lock.yaml — cannot read resolved versions`)
    rows.push({ app, name: '(all)', status: 'HARNESS-FAIL' })
    continue
  }
  const appPkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const deps = new Set(Object.keys({ ...appPkg.dependencies, ...appPkg.devDependencies, ...appPkg.optionalDependencies }))
  const lockText = readFileSync(lockPath, 'utf8')

  for (const [name, repoVersion] of repoPackages) {
    if (!deps.has(name)) continue // not a consumer of this package
    const pin = readLockPin(lockText, name)
    if (pin.kind === null) {
      notes.push(`${app} -> ${name}: declared in package.json but absent from the lockfile importer (see check-own-package-freshness.mjs)`)
      continue
    }
    if (pin.kind === 'link') {
      rows.push({ app, name, repoVersion, lockVersion: pin.version, status: 'LINKED' })
      continue
    }
    rows.push({ app, name, repoVersion, lockVersion: pin.version, specifier: pin.specifier })
  }
}

const edgesExamined = rows.filter((r) => r.status !== 'LINKED' && r.status !== 'HARNESS-FAIL').length

if (edgesExamined < REQUIRE_EDGES) {
  console.error(
    `FAIL positive control: only ${edgesExamined} consumer/package edge(s) examined, expected at least ` +
      `${REQUIRE_EDGES}. A clean result on a tree that was not scanned is meaningless, not clean.`,
  )
  process.exit(1)
}

// npm lookups — informational only, never load-bearing for the FAIL verdict.
const npmLatest = new Map()
for (const name of repoPackages.keys()) {
  npmLatest.set(name, await fetchNpmLatest(name))
}

/*
 * The reach guard is STRICTER on production. On a branch a version bump is in
 * flight and npm cannot have it yet; on main the publish should already have
 * fired, and if npm still lacks the version that is the August failure
 * repeating.
 */
const ON_PRODUCTION_BRANCH = (() => {
  /*
   * A PUSH to main, not a PULL REQUEST targeting it.
   *
   * The first version of this check also fired on `GITHUB_BASE_REF === 'main'`,
   * and that deadlocked the very next promotion: merging development into main
   * is WHAT TRIGGERS THE PUBLISH, so while the promotion PR is open npm cannot
   * possibly have the new version yet. Failing there blocks the merge that would
   * fix it — the same self-blocking shape this file was just corrected for, one
   * step further along.
   *
   * After the merge lands, the push event fires, the publish workflow runs, and
   * a subsequent push to main showing repo > npm means the publish genuinely did
   * not run. That is the August failure, and that is what still fails.
   */
  const ref = process.env.GITHUB_REF ?? ''
  const event = process.env.GITHUB_EVENT_NAME ?? ''
  if (event === 'pull_request') return false
  return /(^|\/)main$/.test(ref)
})()

let failures = 0
console.log(`check-shared-package-reach: ${repoPackages.size} published @bsuite/* package(s), ${APPS.length} app(s)`)
console.log('')
console.log(
  `${'APP'.padEnd(25)}${'PACKAGE'.padEnd(24)}${'REPO'.padEnd(10)}${'LOCK-PIN'.padEnd(12)}${'NPM-LATEST'.padEnd(12)}STATUS`,
)
for (const r of rows) {
  if (r.status === 'HARNESS-FAIL') {
    console.log(`${r.app.padEnd(25)}${r.name.padEnd(24)}${'-'.padEnd(10)}${'-'.padEnd(12)}${'-'.padEnd(12)}HARNESS-FAIL`)
    continue
  }
  if (r.status === 'LINKED') {
    console.log(`${r.app.padEnd(25)}${r.name.padEnd(24)}${r.repoVersion.padEnd(10)}${'(link)'.padEnd(12)}${'-'.padEnd(12)}LINKED`)
    continue
  }
  const npm = npmLatest.get(r.name)
  const npmCol = npm?.error ? 'unreachable' : npm?.latest ?? 'not-published'
  const verdict = classify(r.repoVersion, r.lockVersion, npm?.latest ?? null)
  console.log(
    `${r.app.padEnd(25)}${r.name.padEnd(24)}${r.repoVersion.padEnd(10)}${r.lockVersion.padEnd(12)}${String(npmCol).padEnd(12)}${verdict.status}`,
  )
  if (verdict.status === 'AWAITING-PUBLISH') {
    if (ON_PRODUCTION_BRANCH) {
      failures++
      console.error(
        `  FAIL: ${r.name}@${r.repoVersion} is on main but npm's latest is ${npmCol}. THE PUBLISH DID NOT RUN. ` +
          `A green publish job is not evidence — it SKIPS when the version already exists. Dispatch ` +
          `publish-${r.name.replace('@bsuite/', '')}.yml on main, then confirm with \`npm view ${r.name} version\`. ` +
          `This is the shape that went unnoticed for four days (bsuite#2189).`,
      )
    } else {
      console.log(
        `  awaiting publish: ${r.app} pins ${r.name}@${r.lockVersion}, repo declares ${r.repoVersion}, npm has ` +
          `${npmCol}. There is nothing to regenerate a lockfile TO yet — the publish fires on merge to main. ` +
          `Not a failure on a branch. It becomes one there.`,
      )
    }
  } else if (verdict.unreachable) {
    failures++
    const fixAdvice = isExactSpecifier(r.specifier)
      ? `${r.app}'s package.json EXACT-pins ${r.specifier} — a lockfile regen alone cannot reach ` +
        `${r.repoVersion}; edit the specifier first (the @bsuite/dry-lint 0.5.0 shape).`
      : `This fix cannot reach ${r.app} until its lockfile is regenerated — the declared specifier ` +
        `${r.specifier} already admits ${r.repoVersion}.`
    console.error(
      `  FAIL: ${r.app} pins ${r.name}@${r.lockVersion} (specifier ${r.specifier}) but the repo declares ` +
        `${r.repoVersion}. ${fixAdvice} See the publish -> reach procedure in ` +
        `docs/20260731-platform-operations-reference-v1.00W.md.`,
    )
  } else if (verdict.repoAheadOfNpm) {
    console.log(
      `  report: repo ${r.name}@${r.repoVersion} is ahead of npm latest ${npmCol} — normal between a merge ` +
        'and the next promotion, not a failure.',
    )
  }
}

if (process.env.VERBOSE) {
  console.log('')
  notes.forEach((n) => console.log(`note  ${n}`))
}

console.log('')
if (failures > 0) {
  console.error(
    `${failures} of ${edgesExamined} consumer/package edge(s) are UNREACHABLE-FIX: the repo's declared ` +
      "version is newer than what the consumer's lockfile resolves. Promotion and publish alone will not " +
      'fix these — each needs its lockfile regenerated (outside the bsuite tree — see AGENTS.md / the ' +
      'bsuite-pnpm-monorepo skill) after the new version is confirmed on npm.',
  )
  process.exit(1)
}

console.log(`check-shared-package-reach: OK — ${edgesExamined} consumer/package edge(s) examined, none unreachable`)
