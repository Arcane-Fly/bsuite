#!/usr/bin/env node
/**
 * check-no-prerelease-in-production — a `-next.N` prerelease must never reach a
 * production path.
 *
 * THE OTHER DIRECTION FROM publish-dist-tag.mjs
 * ───────────────────────────────────────────────────────────────────────────
 * `publish-dist-tag.mjs` guards the PRODUCER: a prerelease never takes the
 * `latest` dist-tag, on any ref. That closes the accident where `npm publish`
 * silently tags 1.2.0-rc.1 as `latest` and hands every consumer on ^1.2.0 a
 * release candidate.
 *
 * It does nothing about the CONSUMER, and the consumer is where a prerelease
 * actually reaches a customer. Preview builds resolve `next` by naming an exact
 * `-next.N` version in an app's package.json and lockfile on its `development`
 * branch. That branch gets promoted to `main`. Nothing, until this file, stopped
 * the prerelease pin riding along into production — where `--frozen-lockfile`
 * would faithfully install the release candidate the gate was supposed to be
 * evaluating, forever, because a lockfile pin does not expire.
 *
 * FOUR ASSERTIONS, EACH A DIFFERENT WAY THE SAME ACCIDENT HAPPENS
 * ───────────────────────────────────────────────────────────────────────────
 *   P1  No package manifest under `packages/` on a production ref declares a prerelease
 *       version. If one does, `publish-*.yml` on main correctly refuses to move
 *       `latest` — and then `latest` silently stops advancing while every
 *       freshness check reports the apps CURRENT against a stale tag. The
 *       failure is invisible precisely because the producer-side guard worked.
 *
 *   P2  No app's package.json declares an `@bsuite/*` range containing a
 *       prerelease. `^1.1.1-next.0` admits 1.1.1-next.5 and 1.1.1 alike, so it
 *       looks harmless and quietly makes the app a prerelease consumer.
 *
 *   P3  No app's pnpm-lock.yaml RESOLVES an `@bsuite/*` to a prerelease. This is
 *       the one that actually decides what gets installed, and the one nobody
 *       ever reads. The estate has already been burned by drift living entirely
 *       in the lockfile's resolved column while package.json looked correct
 *       (@bsuite/theme 0.11.2, @bsuite/ui 1.0.3, @bsuite/nav-core 0.9.1).
 *
 *   P4  The registry's own `dist-tags.latest` is not a prerelease, for every
 *       package we publish. P1-P3 are all about our source; this one asks npm
 *       what it is actually serving to a plain `^1.1.0` resolve. A mis-tag done
 *       by hand, or by a workflow that predates the tag decision, is invisible
 *       to every file-based check in this repo.
 *
 * P4 runs on ANY ref, because a mis-tagged registry is wrong everywhere. P1-P3
 * are production-path assertions and run when the target is `main`.
 *
 * WHY THIS IS A GATE AND NOT A CONVENTION
 * ───────────────────────────────────────────────────────────────────────────
 * The prerelease path only works if promoting an app means putting its
 * @bsuite/* dependencies BACK onto released versions first. That is a step a
 * human has to remember, on every promotion, for six apps. A step like that is
 * not remembered; it is enforced or it is skipped. This is the enforcement, and
 * its error message names the exact edit.
 *
 * USAGE
 *   node scripts/check-no-prerelease-in-production.mjs                 # infer target from git
 *   node scripts/check-no-prerelease-in-production.mjs --target main
 *   node scripts/check-no-prerelease-in-production.mjs --registry-only
 *   node scripts/check-no-prerelease-in-production.mjs --self-test
 *
 * `yaml` is resolved from $BSUITE_GUARD_NODE_MODULES, this script's directory,
 * then process.cwd() — the same contract check-own-package-freshness.mjs uses.
 * It REFUSES to run without it rather than degrading to grepping the lockfile.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { APP_REPOS } from './check-lockfile-hygiene.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OWN_SCOPE = '@bsuite/'

function loadDep(spec) {
  const bases = []
  const override = process.env.BSUITE_GUARD_NODE_MODULES
  if (override) {
    const abs = path.resolve(override)
    bases.push(abs)
    if (path.basename(abs) === 'node_modules') bases.push(path.dirname(abs))
  }
  bases.push(HERE, process.cwd())
  const req = createRequire(path.join(HERE, '__resolver__.cjs'))
  try {
    return req(req.resolve(spec, { paths: bases }))
  } catch {
    return null
  }
}

/**
 * A semver prerelease is the part after the FIRST `-` and before any `+` build
 * metadata. Deliberately the same rule publish-dist-tag.mjs uses — two guards
 * disagreeing about what a prerelease IS would be worse than neither.
 */
export function isPrerelease(version) {
  if (typeof version !== 'string' || version.length === 0) return false
  return version.split('+')[0].includes('-')
}

/**
 * A RANGE contains a prerelease when any of its comparators names one.
 * `^1.1.1-next.0`, `>=1.0.0-rc.1 <2`, `1.2.3-next.4` all count; `^1.1.0` and
 * `workspace:*` do not.
 *
 * Not a full range parser on purpose: this needs to be conservative in the
 * direction of FLAGGING, and any `-` following a digit inside a version token
 * is a prerelease marker in semver.
 */
export function rangeHasPrerelease(range) {
  if (typeof range !== 'string') return false
  if (range.startsWith('workspace:') || range.startsWith('link:') || range.startsWith('file:')) return false
  return /\d+\.\d+\.\d+-[0-9A-Za-z.-]+/.test(range)
}

/**
 * pnpm records a resolved version as `1.1.0(peer@x)(peer@y)`. The peer suffix
 * can itself contain a version with a `-`, so the prerelease test must look at
 * the HEAD of the string only — testing the whole thing would flag
 * `1.1.0(tailwindcss@4.3.3-beta)` as a prerelease of @bsuite/theme, which it is
 * not. That is a false positive that would block a correct promotion.
 */
export function resolvedVersionOf(raw) {
  if (typeof raw !== 'string') return null
  const m = /^([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)(?:\+[0-9A-Za-z.-]+)?(?:\(|$)/.exec(raw.trim())
  return m ? m[1] : null
}

// ---------------------------------------------------------------------------
// The four assertions, as pure functions over already-read data
// ---------------------------------------------------------------------------

export function checkPackageVersions(packages) {
  const bad = []
  for (const p of packages) {
    if (p.private) continue
    if (isPrerelease(p.version)) {
      bad.push(
        `packages/${p.dir}/package.json declares prerelease version ${p.version}. ` +
          `A prerelease never takes the 'latest' dist-tag, so promoting this leaves ` +
          `${p.name} frozen on npm at its last release while every freshness check ` +
          `reports the apps current. Finalise it to ${p.version.split('-')[0]} first.`,
      )
    }
  }
  return bad
}

export function checkAppRanges(apps) {
  const bad = []
  for (const app of apps) {
    for (const [name, range] of Object.entries(app.deps)) {
      if (!name.startsWith(OWN_SCOPE)) continue
      if (rangeHasPrerelease(range)) {
        bad.push(
          `${app.name}/package.json declares ${name}: "${range}" — a prerelease range. ` +
            `Production would install a release candidate. Repoint it at the released ` +
            `version and regenerate the lockfile.`,
        )
      }
    }
  }
  return bad
}

export function checkAppLockfiles(apps) {
  const bad = []
  for (const app of apps) {
    for (const [name, resolved] of Object.entries(app.resolved)) {
      if (!name.startsWith(OWN_SCOPE)) continue
      const v = resolvedVersionOf(resolved)
      if (v && isPrerelease(v)) {
        bad.push(
          `${app.name}/pnpm-lock.yaml RESOLVES ${name} to ${v} — a prerelease. ` +
            `--frozen-lockfile installs exactly this, so production would run the ` +
            `release candidate regardless of what package.json says.`,
        )
      }
    }
  }
  return bad
}

export function checkRegistryTags(tags) {
  const bad = []
  for (const [name, latest] of Object.entries(tags)) {
    if (latest === null) continue // never published; nothing to mis-tag
    if (isPrerelease(latest)) {
      bad.push(
        `registry: ${name} has dist-tags.latest = ${latest}, a PRERELEASE. ` +
          `Every consumer on a plain caret range resolves this. Fix with ` +
          `\`npm dist-tag add ${name}@<released version> latest\`.`,
      )
    }
  }
  return bad
}

// ---------------------------------------------------------------------------
// Reading the real tree
// ---------------------------------------------------------------------------

function readPackages(root) {
  const dir = join(root, 'packages')
  if (!existsSync(dir)) return []
  const out = []
  for (const name of readdirSync(dir).sort()) {
    const manifest = join(dir, name, 'package.json')
    if (!existsSync(manifest)) continue
    let pkg
    try {
      pkg = JSON.parse(readFileSync(manifest, 'utf8'))
    } catch {
      continue
    }
    if (!pkg.name) continue
    out.push({ dir: name, name: pkg.name, version: pkg.version ?? '', private: pkg.private === true })
  }
  return out
}

function readApps(root, YAML) {
  const out = []
  const missing = []
  for (const name of APP_REPOS) {
    const manifest = join(root, name, 'package.json')
    const lock = join(root, name, 'pnpm-lock.yaml')
    // An UNINITIALISED SUBMODULE IS AN EMPTY DIRECTORY, and an empty directory
    // passes `-d`. Test for the FILE, or six apps silently become zero apps and
    // the guard reports a clean pass over nothing.
    if (!existsSync(manifest)) {
      missing.push(name)
      continue
    }
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }

    const resolved = {}
    if (existsSync(lock)) {
      const doc = YAML.parse(readFileSync(lock, 'utf8'))
      for (const importer of Object.values(doc?.importers ?? {})) {
        for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
          for (const [dep, entry] of Object.entries(importer?.[section] ?? {})) {
            if (entry && typeof entry === 'object' && typeof entry.version === 'string') {
              resolved[dep] = entry.version
            }
          }
        }
      }
    } else {
      missing.push(`${name}/pnpm-lock.yaml`)
    }
    out.push({ name, deps, resolved })
  }
  return { apps: out, missing }
}

async function readRegistryTags(packages) {
  const tags = {}
  for (const p of packages) {
    if (p.private) continue
    const url = `https://registry.npmjs.org/${p.name.replace('/', '%2f')}`
    const res = await fetch(url, { headers: { accept: 'application/vnd.npm.install-v1+json' } })
    if (res.status === 404) {
      tags[p.name] = null
      continue
    }
    if (!res.ok) {
      // UNKNOWN is not CLEAN. A registry we could not read is a question we did
      // not answer, and answering it "fine" is the defect this estate keeps
      // finding.
      throw new Error(`registry read for ${p.name} returned ${res.status} — refusing to report a verdict it did not check`)
    }
    const doc = await res.json()
    tags[p.name] = doc?.['dist-tags']?.latest ?? null
  }
  return tags
}

// ---------------------------------------------------------------------------
// Self-test — every assertion proven to FAIL on a planted defect, and to PASS
// on the legitimate case that most resembles it
// ---------------------------------------------------------------------------

function selfTest() {
  const cases = []
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected)
    cases.push([label, ok, JSON.stringify(actual), JSON.stringify(expected)])
  }

  // P1
  check('P1 flags a prerelease package version',
    checkPackageVersions([{ dir: 'theme', name: '@bsuite/theme', version: '1.1.1-next.0', private: false }]).length, 1)
  check('P1 passes a released package version',
    checkPackageVersions([{ dir: 'theme', name: '@bsuite/theme', version: '1.1.1', private: false }]), [])
  check('P1 ignores a private package',
    checkPackageVersions([{ dir: 'x', name: '@bsuite/x', version: '1.0.0-next.1', private: true }]), [])
  check('P1 passes build metadata, which is NOT a prerelease',
    checkPackageVersions([{ dir: 'theme', name: '@bsuite/theme', version: '1.1.1+build.5', private: false }]), [])

  // P2
  check('P2 flags a prerelease range',
    checkAppRanges([{ name: 'R80.4', deps: { '@bsuite/theme': '^1.1.1-next.0' }, resolved: {} }]).length, 1)
  check('P2 passes an ordinary caret range',
    checkAppRanges([{ name: 'R80.4', deps: { '@bsuite/theme': '^1.1.0' }, resolved: {} }]), [])
  check('P2 ignores third-party deps entirely',
    checkAppRanges([{ name: 'R80.4', deps: { vite: '^7.0.0-beta.1' }, resolved: {} }]), [])
  check('P2 passes workspace: protocol',
    checkAppRanges([{ name: 'R80.4', deps: { '@bsuite/theme': 'workspace:*' }, resolved: {} }]), [])

  // P3 — including the peer-suffix false positive that would block a correct promotion
  check('P3 flags a prerelease resolution',
    checkAppLockfiles([{ name: 'R80.4', deps: {}, resolved: { '@bsuite/theme': '1.1.1-next.0(react@19.2.8)' } }]).length, 1)
  check('P3 passes a released resolution',
    checkAppLockfiles([{ name: 'R80.4', deps: {}, resolved: { '@bsuite/theme': '1.1.0(react@19.2.8)' } }]), [])
  check('P3 does NOT flag a released version whose PEER is a prerelease',
    checkAppLockfiles([{ name: 'R80.4', deps: {}, resolved: { '@bsuite/theme': '1.1.0(tailwindcss@4.3.3-beta.2)' } }]), [])
  check('P3 ignores third-party resolutions',
    checkAppLockfiles([{ name: 'R80.4', deps: {}, resolved: { vite: '7.0.0-beta.1' } }]), [])

  // P4
  check('P4 flags a prerelease on dist-tags.latest',
    checkRegistryTags({ '@bsuite/theme': '1.1.1-next.0' }).length, 1)
  check('P4 passes a released latest', checkRegistryTags({ '@bsuite/theme': '1.1.0' }), [])
  check('P4 treats never-published as nothing to check', checkRegistryTags({ '@bsuite/eslint-config': null }), [])

  // Parser units — resolvedVersionOf is where a wrong answer is silent
  check('resolvedVersionOf strips a peer suffix', resolvedVersionOf('1.1.0(react@19.2.8)'), '1.1.0')
  check('resolvedVersionOf keeps a prerelease', resolvedVersionOf('1.1.1-next.0(react@19)'), '1.1.1-next.0')
  check('resolvedVersionOf handles a bare version', resolvedVersionOf('1.1.0'), '1.1.0')
  check('resolvedVersionOf rejects a link', resolvedVersionOf('link:../theme'), null)

  // POSITIVE CONTROL OVER THE READING CODE, NOT ONLY THE PURE FUNCTIONS.
  //
  // Everything above tests decisions made on data that was handed to them. The
  // way this guard actually goes wrong in production is not a wrong decision —
  // it is reading the tree and finding nothing, then reporting a clean pass over
  // the nothing it found. So plant a real prerelease in a real directory tree,
  // with a real pnpm-lock.yaml, and require that the readers SEE it.
  const YAML = loadDep('yaml')
  if (!YAML) {
    console.error(
      '  ! fixture control SKIPPED — `yaml` is not resolvable here, so readApps() was ' +
        'not exercised. CI always provides it (see no-prerelease-in-production.yml); a ' +
        'local run without it has tested the decisions and NOT the reading.',
    )
  } else {
    const fixture = mkdtempSync(join(tmpdir(), 'no-prerelease-fixture-'))
    try {
      mkdirSync(join(fixture, 'packages', 'theme'), { recursive: true })
      writeFileSync(
        join(fixture, 'packages', 'theme', 'package.json'),
        JSON.stringify({ name: '@bsuite/theme', version: '1.1.1-next.0' }),
      )
      for (const app of APP_REPOS) {
        mkdirSync(join(fixture, app), { recursive: true })
        writeFileSync(
          join(fixture, app, 'package.json'),
          JSON.stringify({ name: app, dependencies: { '@bsuite/theme': '^1.1.1-next.0', react: '^19.0.0' } }),
        )
        writeFileSync(
          join(fixture, app, 'pnpm-lock.yaml'),
          [
            "lockfileVersion: '9.0'",
            'importers:',
            '  .:',
            '    dependencies:',
            "      '@bsuite/theme':",
            '        specifier: ^1.1.1-next.0',
            '        version: 1.1.1-next.0(react@19.2.8)',
            "      'react':",
            '        specifier: ^19.0.0',
            '        version: 19.2.8',
            '',
          ].join('\n'),
        )
      }

      const fixturePackages = readPackages(fixture)
      const { apps: fixtureApps, missing } = readApps(fixture, YAML)

      check('fixture: readPackages sees the planted package', fixturePackages.length, 1)
      check('fixture: readApps sees all six apps', fixtureApps.length, APP_REPOS.length)
      check('fixture: nothing reported missing', missing, [])
      check('fixture: P1 catches the planted prerelease version', checkPackageVersions(fixturePackages).length, 1)
      check('fixture: P2 catches it in all six app ranges', checkAppRanges(fixtureApps).length, APP_REPOS.length)
      check('fixture: P3 catches it in all six LOCKFILES', checkAppLockfiles(fixtureApps).length, APP_REPOS.length)
      check(
        'fixture: the lockfile reader actually parsed a version, rather than finding nothing',
        fixtureApps.every((a) => a.resolved['@bsuite/theme'] === '1.1.1-next.0(react@19.2.8)'),
        true,
      )
      check('fixture: react is read too, so the reader is not @bsuite-only by accident',
        fixtureApps.every((a) => a.resolved.react === '19.2.8'), true)

      // And the NEGATIVE half: the same fixture with released versions must be clean,
      // or "it flags everything" would pass the test above just as well.
      for (const app of APP_REPOS) {
        writeFileSync(
          join(fixture, app, 'package.json'),
          JSON.stringify({ name: app, dependencies: { '@bsuite/theme': '^1.1.0' } }),
        )
        writeFileSync(
          join(fixture, app, 'pnpm-lock.yaml'),
          [
            "lockfileVersion: '9.0'",
            'importers:',
            '  .:',
            '    dependencies:',
            "      '@bsuite/theme':",
            '        specifier: ^1.1.0',
            '        version: 1.1.0(react@19.2.8)',
            '',
          ].join('\n'),
        )
      }
      writeFileSync(
        join(fixture, 'packages', 'theme', 'package.json'),
        JSON.stringify({ name: '@bsuite/theme', version: '1.1.1' }),
      )
      const cleanPackages = readPackages(fixture)
      const { apps: cleanApps } = readApps(fixture, YAML)
      check('fixture: a released tree passes P1', checkPackageVersions(cleanPackages), [])
      check('fixture: a released tree passes P2', checkAppRanges(cleanApps), [])
      check('fixture: a released tree passes P3', checkAppLockfiles(cleanApps), [])
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  }

  const failed = cases.filter(([, ok]) => !ok)
  for (const [label, ok, a, e] of cases) {
    if (!ok) console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`)
  }
  if (failed.length) {
    console.error(`\ncheck-no-prerelease-in-production --self-test: ${failed.length} of ${cases.length} FAILED`)
    return 1
  }
  console.log(
    `check-no-prerelease-in-production --self-test: ${cases.length} assertions — each of P1-P4 ` +
      `proven to FAIL on a planted prerelease AND to PASS on the legitimate case that most ` +
      `resembles it (build metadata, a private package, a third-party prerelease, the ` +
      `workspace: protocol, and a released version whose PEER is a prerelease)` +
      (YAML
        ? `, plus a fixture control over the READERS: a temp tree with a planted ` +
          `1.1.1-next.0 in ${APP_REPOS.length} app manifests and ${APP_REPOS.length} real ` +
          `pnpm-lock.yaml files, required to be caught, then rewritten to released versions ` +
          `and required to come back clean.`
        : ` — fixture control SKIPPED, see the warning above.`),
  )
  return 0
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  return i === -1 ? fallback : process.argv[i + 1]
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest()

  const registryOnly = process.argv.includes('--registry-only')
  const target = arg('--target', process.env.GITHUB_BASE_REF || process.env.GITHUB_REF_NAME || '')
  const productionPath = target === 'main' || target === 'refs/heads/main'

  const packages = readPackages(ROOT)
  if (packages.length === 0) {
    console.error('::error::no packages found under packages/ — this guard checked nothing. Refusing to report a pass.')
    return 2
  }

  const problems = []
  let scanned = { packages: 0, apps: 0, edges: 0, tags: 0 }

  if (productionPath && !registryOnly) {
    const YAML = loadDep('yaml')
    if (!YAML) {
      console.error(
        '::error::the `yaml` package is not resolvable. This guard parses pnpm-lock.yaml\n' +
          '  structurally and will NOT degrade to grepping it — a previous pass in this repo\n' +
          "  grepped a lockfile and reported the `overrides:` block's KEYS as resolved versions.\n" +
          '  Provide it via $BSUITE_GUARD_NODE_MODULES (see own-package-freshness.yml).',
      )
      return 2
    }

    const { apps, missing } = readApps(ROOT, YAML)
    if (missing.length) {
      console.error(`::error::not readable: ${missing.join(', ')} — submodules did not check out. UNVERIFIED, not clean.`)
      return 2
    }

    problems.push(...checkPackageVersions(packages))
    problems.push(...checkAppRanges(apps))
    problems.push(...checkAppLockfiles(apps))

    scanned.packages = packages.filter((p) => !p.private).length
    scanned.apps = apps.length
    scanned.edges = apps.reduce(
      (n, a) =>
        n +
        Object.keys(a.deps).filter((k) => k.startsWith(OWN_SCOPE)).length +
        Object.keys(a.resolved).filter((k) => k.startsWith(OWN_SCOPE)).length,
      0,
    )
    if (scanned.edges === 0) {
      console.error('::error::zero @bsuite/* dependency edges found across six apps. That is not a clean tree, it is a broken read.')
      return 2
    }
  }

  // P4 always.
  const tags = await readRegistryTags(packages)
  problems.push(...checkRegistryTags(tags))
  scanned.tags = Object.keys(tags).length

  const where = productionPath ? `PRODUCTION path (target '${target}')` : `non-production ref (target '${target || '<unset>'}')`
  // Denominators are stated as PLAIN PLURALS on purpose. check-guard-self-
  // reporting.mjs stems the noun that governs the number, and its stemmer is
  // asymmetric for nouns ending in `e` — so the house-style `15 package(s)`
  // does not match the list entry `packages?` unless the paren form is also
  // registered by hand, one noun at a time. Writing `15 packages` matches
  // today without extending a shared list as a side effect of this lane.
  const summary =
    `check-no-prerelease-in-production: ${where} — ` +
    (productionPath && !registryOnly
      ? `${scanned.packages} publishable packages, ${scanned.apps} apps and ${scanned.edges} @bsuite/* references examined in the tree, plus `
      : 'P1-P3 not applicable on this ref; ') +
    `${scanned.tags} packages examined on the registry. ${problems.length} problem(s).`

  if (problems.length) {
    console.error(`BLOCKED — a prerelease is on a production path:`)
    for (const p of problems) console.error(`  ✗ ${p}`)
    console.error('')
    console.error('Fix, in order:')
    console.error('  1. node scripts/finalise-prereleases.mjs        # strip -next.N from packages/*/package.json')
    console.error('  2. promote, so main publishes the released versions to `latest`')
    console.error('  3. repoint each app at the released version and regenerate its lockfile')
    console.error('')
    console.error(summary)
    return 1
  }

  console.log(summary)
  return 0
}

main().then((c) => process.exit(c)).catch((e) => {
  console.error(`::error::check-no-prerelease-in-production failed: ${e.message}`)
  process.exit(2)
})
