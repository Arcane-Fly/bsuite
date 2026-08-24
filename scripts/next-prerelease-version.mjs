#!/usr/bin/env node
/**
 * next-prerelease-version — compute (and optionally write) the next monotonic
 * `-next.N` version for a package.
 *
 * THE SCHEME
 * ───────────────────────────────────────────────────────────────────────────
 *     <released>  ->  <patch+1>-next.0  ->  <patch+1>-next.1  ->  ...  ->  <patch+1>
 *
 *     1.1.0  ->  1.1.1-next.0  ->  1.1.1-next.1  ->  (promotion)  ->  1.1.1
 *
 * `-next.N` rather than `-rc.N` on purpose: the version and the dist-tag then
 * tell the same story, so `@bsuite/theme@1.1.1-next.2` under `next` reads as one
 * fact instead of two that have to be correlated. The machinery is shape-
 * agnostic — `publish-dist-tag.mjs` treats ANY semver prerelease as a prerelease
 * — so a one-off `-rc.1` still publishes safely under `next`. The scheme is the
 * convention, not a trap.
 *
 * MONOTONIC AGAINST THE REGISTRY, NOT AGAINST THE WORKING TREE
 * ───────────────────────────────────────────────────────────────────────────
 * N is derived from what npm actually holds, not from what package.json last
 * said. Two branches bumping the same package concurrently both read the same
 * registry state, so the second publish collides on an existing version and is
 * REFUSED by the version check rather than silently overwriting — which is the
 * correct outcome, and the one this estate learned the hard way when two PRs
 * both set @bsuite/theme to 0.13.0 and the second no-oped without failing.
 *
 * The published version is also the only evidence that a publish happened.
 * `npm view` is the measurement; package.json is a claim.
 *
 * A base bump that RAISES the minor or major is a deliberate act and is passed
 * in explicitly (`--base 1.2.0`). Without it the base is patch+1 of the highest
 * RELEASED version, which is the common case and the safe default: it can never
 * collide with an existing release line.
 *
 * USAGE
 *   node scripts/next-prerelease-version.mjs --package @bsuite/theme
 *   node scripts/next-prerelease-version.mjs --package @bsuite/theme --base 1.2.0
 *   node scripts/next-prerelease-version.mjs --package @bsuite/theme --write
 *   node scripts/next-prerelease-version.mjs --self-test
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RE_RELEASE = /^(\d+)\.(\d+)\.(\d+)$/
const RE_NEXT = /^(\d+)\.(\d+)\.(\d+)-next\.(\d+)$/

const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2])

/**
 * Pure, so --self-test exercises the real decision. `versions` is every version
 * string the registry holds for the package (releases and prereleases alike).
 */
export function computeNext({ versions, base = null }) {
  const releases = versions.map((v) => RE_RELEASE.exec(v)).filter(Boolean).map((m) => m.slice(1, 4).map(Number))

  let target
  if (base) {
    const m = RE_RELEASE.exec(base)
    if (!m) return { error: `--base ${JSON.stringify(base)} is not an x.y.z release version` }
    target = m.slice(1, 4).map(Number)
    if (releases.some((r) => cmp(r, target) === 0)) {
      return { error: `${base} is already released — a prerelease of it could never publish. Pick a higher base.` }
    }
  } else if (releases.length === 0) {
    // Never released. 0.0.1-next.0 would be odd; 0.1.0 is the conventional
    // first line, so its prerelease series starts there.
    target = [0, 1, 0]
  } else {
    const highest = releases.sort(cmp)[releases.length - 1]
    target = [highest[0], highest[1], highest[2] + 1]
  }

  const prefix = target.join('.')
  const counters = versions
    .map((v) => RE_NEXT.exec(v))
    .filter(Boolean)
    .filter((m) => m.slice(1, 4).map(Number).join('.') === prefix)
    .map((m) => Number(m[4]))

  const n = counters.length === 0 ? 0 : Math.max(...counters) + 1
  return { version: `${prefix}-next.${n}`, base: prefix, counter: n }
}

function selfTest() {
  const cases = []
  const check = (label, a, e) => cases.push([label, JSON.stringify(a) === JSON.stringify(e), JSON.stringify(a), JSON.stringify(e)])

  check('first prerelease off a release line is -next.0',
    computeNext({ versions: ['1.0.0', '1.1.0'] }).version, '1.1.1-next.0')
  check('the counter advances past existing prereleases',
    computeNext({ versions: ['1.1.0', '1.1.1-next.0', '1.1.1-next.1'] }).version, '1.1.1-next.2')
  check('the counter is a MAX, not a count — a gap does not rewind it',
    computeNext({ versions: ['1.1.0', '1.1.1-next.0', '1.1.1-next.7'] }).version, '1.1.1-next.8')
  check('prereleases of a DIFFERENT base do not move the counter',
    computeNext({ versions: ['1.1.0', '1.2.0-next.4'] }).version, '1.1.1-next.0')
  check('an explicit base is honoured',
    computeNext({ versions: ['1.1.0', '1.1.1-next.3'], base: '1.2.0' }).version, '1.2.0-next.0')
  check('an explicit base with its own prereleases continues that series',
    computeNext({ versions: ['1.1.0', '1.2.0-next.0'], base: '1.2.0' }).version, '1.2.0-next.1')
  check('a base that is already RELEASED is refused, not silently bumped',
    Boolean(computeNext({ versions: ['1.1.0', '1.2.0'], base: '1.2.0' }).error), true)
  check('a malformed base is refused',
    Boolean(computeNext({ versions: ['1.1.0'], base: '1.2' }).error), true)
  check('a never-published package starts at 0.1.0-next.0',
    computeNext({ versions: [] }).version, '0.1.0-next.0')
  check('release ordering is numeric, not lexicographic (1.10.0 > 1.9.0)',
    computeNext({ versions: ['1.9.0', '1.10.0'] }).version, '1.10.1-next.0')
  check('non-next prereleases are ignored by the counter',
    computeNext({ versions: ['1.1.0', '1.1.1-rc.9'] }).version, '1.1.1-next.0')
  check('the result is strictly greater than every -next it saw',
    computeNext({ versions: ['1.1.0', '1.1.1-next.0'] }).counter > 0, true)

  const failed = cases.filter(([, ok]) => !ok)
  for (const [label, ok, a, e] of cases) if (!ok) console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`)
  if (failed.length) {
    console.error(`\nnext-prerelease-version --self-test: ${failed.length} of ${cases.length} FAILED`)
    return 1
  }
  console.log(
    `next-prerelease-version --self-test: ${cases.length} assertions — monotonicity across gaps, ` +
      `base isolation, numeric (not lexicographic) release ordering, explicit-base refusal on an ` +
      `already-released version, and the never-published case.`,
  )
  return 0
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  return i === -1 ? fallback : process.argv[i + 1]
}

function manifestFor(pkgName) {
  const dir = join(ROOT, 'packages')
  for (const d of readdirSync(dir)) {
    const m = join(dir, d, 'package.json')
    if (!existsSync(m)) continue
    try {
      if (JSON.parse(readFileSync(m, 'utf8')).name === pkgName) return m
    } catch {
      /* a manifest that does not parse is not this one */
    }
  }
  return null
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest()

  const pkgName = arg('--package')
  if (!pkgName) {
    console.error('usage: next-prerelease-version.mjs --package @bsuite/<name> [--base x.y.z] [--write]')
    return 2
  }

  const res = await fetch(`https://registry.npmjs.org/${pkgName.replace('/', '%2f')}`, {
    headers: { accept: 'application/vnd.npm.install-v1+json' },
  })
  let versions = []
  if (res.status === 404) {
    versions = []
  } else if (!res.ok) {
    // UNKNOWN is not "never published". Guessing here burns a version number
    // permanently, because npm will not let you republish one.
    console.error(`::error::registry read for ${pkgName} returned ${res.status} — refusing to guess the next version.`)
    return 2
  } else {
    versions = Object.keys((await res.json()).versions ?? {})
  }

  const out = computeNext({ versions, base: arg('--base') })
  if (out.error) {
    console.error(`::error::${out.error}`)
    return 1
  }

  console.log(out.version)

  if (process.argv.includes('--write')) {
    const manifest = manifestFor(pkgName)
    if (!manifest) {
      console.error(`::error::no package under packages/ declares the name ${pkgName}`)
      return 2
    }
    const src = readFileSync(manifest, 'utf8')
    const rewritten = src.replace(/(^\s*"version"\s*:\s*")[^"]+(")/m, (_m, a, b) => `${a}${out.version}${b}`)
    if (rewritten === src) {
      console.error(`::error::could not rewrite the version field in ${manifest}`)
      return 2
    }
    writeFileSync(manifest, rewritten)
    console.error(`wrote ${out.version} to ${manifest} (${versions.length} version(s) seen on the registry)`)
  }

  return 0
}

main().then((c) => process.exit(c)).catch((e) => {
  console.error(`::error::next-prerelease-version failed: ${e.message}`)
  process.exit(2)
})
