#!/usr/bin/env node
/**
 * finalise-prereleases — turn every `x.y.z-next.N` package version into `x.y.z`,
 * in preparation for a promotion to `main`.
 *
 * WHY IT EXISTS
 * ───────────────────────────────────────────────────────────────────────────
 * `check-no-prerelease-in-production.mjs` BLOCKS a promotion whose packages
 * still carry `-next.N` versions. A gate that blocks without naming the exact
 * command to unblock it is a gate people learn to route around, and this repo
 * has a standing complaint about gates citing artefacts that do not exist. This
 * is the artefact that gate cites.
 *
 * It is deliberately narrow: it edits ONLY the `version` field of package
 * manifests under `packages/`, and only when that version carries a prerelease.
 * It does not touch app manifests, lockfiles, or the registry — those are the
 * downstream steps, which cannot happen until the release versions actually
 * exist on npm, which cannot happen until this edit is merged to main.
 *
 * THE ORDER MATTERS AND IS NOT NEGOTIABLE
 * ───────────────────────────────────────────────────────────────────────────
 *   1. this script            packages/<pkg>/package.json  1.1.1-next.3 -> 1.1.1
 *   2. promote to main        publish-<pkg>.yml publishes 1.1.1 to `latest`
 *   3. app repoint            each app's package.json range and lockfile move
 *                             from the exact prerelease onto the released version
 *
 * Doing 3 before 2 pins apps to a version that does not exist yet, and
 * `--frozen-lockfile` will fail the build with a 404 that reads like a registry
 * outage. `check-own-package-freshness` is what forces 3 to actually happen: the
 * moment `latest` moves to 1.1.1, every app still resolving 1.1.1-next.3 is
 * STALE-BUT-IN-RANGE, which is a hard failure, not a warning.
 *
 * USAGE
 *   node scripts/finalise-prereleases.mjs --check    # report only, exit 1 if any remain
 *   node scripts/finalise-prereleases.mjs            # rewrite in place
 *   node scripts/finalise-prereleases.mjs --self-test
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * `1.2.3-next.4` -> `1.2.3`. Build metadata is preserved, because `+build.5` is
 * not a prerelease and stripping it would be an unrelated change smuggled into a
 * promotion diff.
 */
export function finalise(version) {
  if (typeof version !== 'string') return null
  const [core, build] = version.split('+', 2)
  if (!core.includes('-')) return null // already a release: nothing to do
  const released = core.split('-')[0]
  if (!/^\d+\.\d+\.\d+$/.test(released)) return null
  return build === undefined ? released : `${released}+${build}`
}

export function planFor(packages) {
  const plan = []
  for (const p of packages) {
    const next = finalise(p.version)
    if (next) plan.push({ ...p, from: p.version, to: next })
  }
  return plan
}

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
    if (!pkg.name || pkg.private === true) continue
    out.push({ dir: name, name: pkg.name, version: pkg.version ?? '', manifest })
  }
  return out
}

function selfTest() {
  const cases = []
  const check = (label, a, e) => cases.push([label, JSON.stringify(a) === JSON.stringify(e), JSON.stringify(a), JSON.stringify(e)])

  check('strips a -next.N prerelease', finalise('1.1.1-next.3'), '1.1.1')
  check('strips any prerelease shape, not just next', finalise('2.0.0-rc.1'), '2.0.0')
  check('strips a bare numeric prerelease', finalise('1.0.0-0'), '1.0.0')
  check('returns null for an already-released version', finalise('1.1.1'), null)
  check('PRESERVES build metadata', finalise('1.1.1-next.3+abc'), '1.1.1+abc')
  check('leaves build-metadata-only versions alone', finalise('1.1.1+abc'), null)
  check('refuses a non-semver core', finalise('next-1.2'), null)
  check('refuses a non-string', finalise(undefined), null)

  check(
    'plan covers only the prerelease packages',
    planFor([
      { dir: 'theme', name: '@bsuite/theme', version: '1.1.1-next.0' },
      { dir: 'ui', name: '@bsuite/ui', version: '1.3.0' },
    ]).map((p) => `${p.name} ${p.from}->${p.to}`),
    ['@bsuite/theme 1.1.1-next.0->1.1.1'],
  )
  check('plan is empty when nothing is a prerelease', planFor([{ dir: 'ui', name: '@bsuite/ui', version: '1.3.0' }]), [])

  const failed = cases.filter(([, ok]) => !ok)
  for (const [label, ok, a, e] of cases) if (!ok) console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`)
  if (failed.length) {
    console.error(`\nfinalise-prereleases --self-test: ${failed.length} of ${cases.length} FAILED`)
    return 1
  }
  console.log(
    `finalise-prereleases --self-test: ${cases.length} assertions — prerelease stripping, ` +
      `build-metadata preservation, and refusal on malformed input.`,
  )
  return 0
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest()
  const checkOnly = process.argv.includes('--check')

  const packages = readPackages(ROOT)
  if (packages.length === 0) {
    console.error('::error::no publishable packages found under packages/ — refusing to report "nothing to finalise".')
    return 2
  }
  const plan = planFor(packages)

  if (plan.length === 0) {
    console.log(`finalise-prereleases: ${packages.length} publishable package(s) examined; none carry a prerelease. Nothing to do.`)
    return 0
  }

  for (const p of plan) console.log(`  ${p.name}  ${p.from}  ->  ${p.to}`)

  if (checkOnly) {
    console.error(`\nfinalise-prereleases --check: ${plan.length} package(s) still carry a prerelease version.`)
    return 1
  }

  for (const p of plan) {
    // Rewrite the version LINE, not the parsed object: re-serialising the JSON
    // would reformat the whole manifest and bury a one-field change inside a
    // whole-file diff that nobody can review.
    const src = readFileSync(p.manifest, 'utf8')
    const rewritten = src.replace(
      /(^\s*"version"\s*:\s*")[^"]+(")/m,
      (_m, a, b) => `${a}${p.to}${b}`,
    )
    if (rewritten === src) {
      console.error(`::error::could not rewrite the version field in ${p.manifest} — left untouched.`)
      return 2
    }
    writeFileSync(p.manifest, rewritten)
  }

  console.log(`\nfinalise-prereleases: rewrote ${plan.length} manifest(s).`)
  console.log('Next: commit, promote to main (that publishes the released versions to `latest`),')
  console.log('then repoint each app onto the released version and regenerate its lockfile.')
  return 0
}

process.exit(main())
