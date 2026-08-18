#!/usr/bin/env node
/**
 * check-published-peer-ranges — what the REGISTRY serves, not what the source says.
 *
 * WHY THIS READS npm AND NOT package.json
 * ---------------------------------------
 * `scripts/drift-scan.mjs` exempts `packages/*` from its WORKSPACE signal on the
 * reasoning that `workspace:^` "is the correct and required idiom, because pnpm
 * rewrites it to a real range at pack time". That exemption cites a measurement:
 * the published `@bsuite/ui@1.2.0` tarball carries real npm ranges and no
 * `workspace:` specifier.
 *
 * The measurement was true. The generalisation was not. On 2026-08-18:
 *
 *     @bsuite/page-builder@1.0.0   peerDependencies: { "@bsuite/theme": "workspace:^" }
 *
 * The literal string reached npm. `workspace:` is a pnpm workspace protocol; it
 * is not a semver range, and no consumer outside this workspace can satisfy it.
 * The rewrite is a pack-time behaviour that depends on the publishing context,
 * so whether it happens is a property of HOW a package was published — which no
 * amount of reading the source can tell you.
 *
 * Hence this guard's rule: the only trustworthy evidence about a published
 * artefact is the published artefact.
 *
 * IT CHECKS TWO THINGS
 *   1. UNRESOLVABLE  — any dependency/peerDependency/optionalDependency range
 *      that is a `workspace:` or `file:` specifier. Always a defect.
 *   2. STALE-PEER    — an `@bsuite/*` peer range that the peer's own CURRENT
 *      latest fails to satisfy. This is what `@bsuite/schema-registry@1.0.2`
 *      does today: it peers on `@bsuite/nav-core: ^0.8.0` while nav-core is at
 *      1.0.0, so every install of every app prints an unmet-peer warning. It is
 *      the same root cause: `workspace:^` froze the range to whatever the
 *      sibling happened to be at publish time.
 *
 * Exit 0 clean, 1 on findings, 2 when it could not look. A check that passes
 * when it could not look is the defect it exists to catch.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = process.env.NPM_REGISTRY || 'https://registry.npmjs.org'
const DEP_BLOCKS = ['dependencies', 'peerDependencies', 'optionalDependencies']

/** Ranges that are not semver at all and cannot be resolved off this machine. */
export function isUnresolvable(range) {
  return typeof range === 'string' && (range.startsWith('workspace:') || range.startsWith('file:'))
}

/**
 * Does `version` satisfy `range`? Deliberately supports only the range forms
 * this estate actually publishes — `^x.y.z`, `~x.y.z`, `>=a <b`, `>=a`, exact —
 * and REFUSES anything else rather than guessing. A satisfies() that silently
 * returns true on a form it does not understand would turn this guard into a
 * rubber stamp, which is precisely the failure mode being fixed.
 */
export function satisfies(version, range) {
  // PARTIAL VERSIONS ARE REAL AND THIS REFUSED THEM. `<2` is a perfectly ordinary
  // upper bound and an earlier draft demanded three segments, so it read `<2` as
  // unparseable and reported UNREADABLE-RANGE over the very range this guard's
  // own fix introduces. Its self-test caught that before it ever ran on CI.
  // Missing segments are zero, exactly as semver defines them.
  const parse = (v) => {
    const m = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(v).trim())
    if (!m) return null
    return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)]
  }
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  const v = parse(version)
  if (!v) return { ok: false, why: `unparseable version ${version}` }
  const parts = String(range).trim().split(/\s+/).filter(Boolean)
  let lower = null, lowerIncl = true, upper = null, upperIncl = false

  for (const part of parts) {
    if (part.startsWith('^')) {
      const b = parse(part.slice(1))
      if (!b) return { ok: false, why: `unparseable range ${range}` }
      lower = b
      // caret on 0.x pins the MINOR — ^0.9.0 does not admit 1.0.0 or 0.10.0
      upper = b[0] === 0 ? [0, b[1] + 1, 0] : [b[0] + 1, 0, 0]
    } else if (part.startsWith('~')) {
      const b = parse(part.slice(1))
      if (!b) return { ok: false, why: `unparseable range ${range}` }
      lower = b; upper = [b[0], b[1] + 1, 0]
    } else if (part.startsWith('>=')) {
      lower = parse(part.slice(2)); lowerIncl = true
      if (!lower) return { ok: false, why: `unparseable range ${range}` }
    } else if (part.startsWith('>')) {
      lower = parse(part.slice(1)); lowerIncl = false
      if (!lower) return { ok: false, why: `unparseable range ${range}` }
    } else if (part.startsWith('<=')) {
      upper = parse(part.slice(2)); upperIncl = true
      if (!upper) return { ok: false, why: `unparseable range ${range}` }
    } else if (part.startsWith('<')) {
      upper = parse(part.slice(1)); upperIncl = false
      if (!upper) return { ok: false, why: `unparseable range ${range}` }
    } else if (part === '*' || part === 'x') {
      lower = [0, 0, 0]; upper = null
    } else if (parse(part)) {
      const b = parse(part)
      lower = b; upper = b; lowerIncl = true; upperIncl = true
    } else {
      return { ok: false, why: `unsupported range form ${JSON.stringify(range)} — refusing to guess` }
    }
  }
  if (!lower && !upper) return { ok: false, why: `empty range ${JSON.stringify(range)}` }
  if (lower) { const c = cmp(v, lower); if (c < 0 || (c === 0 && !lowerIncl)) return { ok: false, why: null } }
  if (upper) { const c = cmp(v, upper); if (c > 0 || (c === 0 && !upperIncl)) return { ok: false, why: null } }
  return { ok: true, why: null }
}

async function fetchManifest(name) {
  const res = await fetch(`${REGISTRY}/${name.replace('/', '%2f')}`, {
    headers: { accept: 'application/vnd.npm.install-v1+json, application/json' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`${name}: registry returned ${res.status}`)
  return res.json()
}

/** Local package names, so the guard checks OUR packages and never the world's. */
export function localPackageNames(root = REPO_ROOT) {
  const dir = join(root, 'packages')
  if (!existsSync(dir)) return []
  const names = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const p = join(dir, entry.name, 'package.json')
    if (!existsSync(p)) continue
    try {
      const d = JSON.parse(readFileSync(p, 'utf8'))
      if (d.name && !d.private) names.push(d.name)
    } catch { /* a package.json we cannot parse is reported by the caller, not swallowed here */ }
  }
  return names.sort()
}

async function main(argv) {
  if (argv.includes('--self-test')) return selfTest()

  const names = localPackageNames()
  if (names.length === 0) {
    console.log('::error::No publishable package found under packages/ — this guard scanned nothing.')
    console.log('Scanning zero packages is a hard failure, never a pass.')
    return 2
  }

  const manifests = new Map()
  for (const n of names) {
    try {
      manifests.set(n, await fetchManifest(n))
    } catch (e) {
      console.log(`::error::${n}: could not read the registry — ${e.message}. Refusing to report a clean pass.`)
      return 2
    }
  }

  const findings = []
  let edges = 0
  for (const name of names) {
    const meta = manifests.get(name)
    if (!meta) continue // never published; nothing to serve, nothing to check
    const latest = meta['dist-tags']?.latest
    const published = meta.versions?.[latest]
    if (!published) continue

    for (const block of DEP_BLOCKS) {
      for (const [dep, range] of Object.entries(published[block] || {})) {
        edges++
        if (isUnresolvable(range)) {
          findings.push(
            `UNRESOLVABLE  ${name}@${latest} ${block}.${dep} = ${JSON.stringify(range)} — a ` +
              `pnpm workspace/file protocol reached the registry. It is not a semver range, so ` +
              `no consumer outside this workspace can satisfy it. Declare an explicit range in ` +
              `packages/*/package.json instead of relying on a pack-time rewrite.`,
          )
          continue
        }
        if (block !== 'peerDependencies' || !dep.startsWith('@bsuite/')) continue
        const peerMeta = manifests.get(dep)
        const peerLatest = peerMeta?.['dist-tags']?.latest
        if (!peerLatest) continue
        const { ok, why } = satisfies(peerLatest, range)
        if (why) {
          findings.push(`UNREADABLE-RANGE  ${name}@${latest} peer ${dep} = ${JSON.stringify(range)} — ${why}`)
        } else if (!ok) {
          findings.push(
            `STALE-PEER  ${name}@${latest} peers on ${dep} ${range}, but ${dep} is at ${peerLatest} — ` +
              `every install prints an unmet-peer warning. Usually caused by \`workspace:^\` freezing ` +
              `the range to whatever the sibling was at publish time.`,
          )
        }
      }
    }
  }

  if (findings.length > 0) {
    for (const f of findings) console.log(`::error::${f}`)
    console.log('')
    console.log(
      `check-published-peer-ranges: ${names.length} package(s), ${edges} published dependency ` +
        `edge(s) read from ${REGISTRY} — ${findings.length} finding(s).`,
    )
    return 1
  }
  console.log(
    `check-published-peer-ranges: ${names.length} package(s), ${edges} published dependency ` +
      `edge(s) read from ${REGISTRY} — all resolvable, every @bsuite/* peer range admits its ` +
      `peer's current latest.`,
  )
  return 0
}

// ── self-test ────────────────────────────────────────────────────────────────
// A guard never observed failing is not known to work.
function selfTest() {
  const results = []
  const check = (name, fn) => {
    try { fn(); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', `${name} — ${e.message}`]) }
  }
  const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: expected ${b}, got ${a}`) }

  check('workspace: is unresolvable', () => eq(isUnresolvable('workspace:^'), true, 'workspace:^'))
  check('file: is unresolvable', () => eq(isUnresolvable('file:../theme'), true, 'file:'))
  check('a real range is resolvable', () => eq(isUnresolvable('>=0.7.0 <2'), false, '>=0.7.0 <2'))
  check('the live page-builder defect is caught', () => eq(isUnresolvable('workspace:^'), true, 'peer'))
  check('caret on 0.x pins the MINOR — ^0.8.0 rejects 1.0.0', () =>
    eq(satisfies('1.0.0', '^0.8.0').ok, false, 'the live schema-registry defect'))
  check('^0.8.0 also rejects 0.9.1', () => eq(satisfies('0.9.1', '^0.8.0').ok, false, '0.9.1'))
  check('^1.0.0 admits 1.4.0', () => eq(satisfies('1.4.0', '^1.0.0').ok, true, '1.4.0'))
  check('^1.0.0 rejects 2.0.0', () => eq(satisfies('2.0.0', '^1.0.0').ok, false, '2.0.0'))
  check('the chosen fix >=0.7.0 <2 admits 1.0.0', () => eq(satisfies('1.0.0', '>=0.7.0 <2').ok, true, 'fix'))
  check('>=0.7.0 <2 rejects 2.0.0', () => eq(satisfies('2.0.0', '>=0.7.0 <2').ok, false, 'upper bound'))
  check('>=0.7.0 <2 rejects 0.6.0', () => eq(satisfies('0.6.0', '>=0.7.0 <2').ok, false, 'lower bound'))
  check('an exact range admits only itself', () => eq(satisfies('1.0.1', '1.0.0').ok, false, 'exact'))
  check('an unsupported form REFUSES rather than passing', () => {
    const r = satisfies('1.0.0', '1.x || 2.x')
    if (r.ok || !r.why) throw new Error('a form it cannot read must refuse, not pass')
  })
  check('a PARTIAL bound parses — <2 means <2.0.0', () => eq(satisfies('1.9.9', '>=0.7.0 <2').ok, true, 'partial upper'))
  check('a partial lower bound parses — >=1 means >=1.0.0', () => eq(satisfies('0.9.0', '>=1').ok, false, 'partial lower'))
  check('a package with no packages/ dir yields no names', () => eq(localPackageNames('/nonexistent').length, 0, 'empty'))

  for (const [s, n] of results) console.log(`  ${s}  ${n}`)
  const failed = results.filter(([s]) => s === 'FAIL').length
  console.log(
    `check-published-peer-ranges --self-test: ${results.length} cases exercised in BOTH directions ` +
      `(unresolvable-caught, real-range-passed, caret-0x-minor-pin, bounds both ways, unreadable-refused) ` +
      `— ${results.length - failed} passed, ${failed} failed.`,
  )
  return failed === 0 ? 0 : 1
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main(process.argv.slice(2)))
}
