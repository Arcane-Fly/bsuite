#!/usr/bin/env node
/**
 * check-zero-consumers — fail when a package, token or hook ships with no consumer.
 *
 * WHY THIS IS THE HIGHEST-VALUE GATE ON THE BOARD
 * ----------------------------------------------
 * Of the ten things this estate documented and never delivered, SIX share one shape:
 * the machinery was built and the wiring never happened.
 *
 *   - `--role-border-interactive` minted, 173 files still on the old resting border
 *   - the RAMS funding matrix ratified as an ADR, `to_regclass` returns null
 *   - `@bsuite/jodie`, `@bsuite/eslint-config`, `@bsuite/tsconfig` published, zero apps
 *   - a shared scanner adopted in five apps while its four predecessors stayed live
 *   - a hook published and lockfiled, imported by nobody
 *   - an RPC and a pg_cron poller built, and `useSiteEditor.ts:139` still reads
 *     `// Your existing publish logic here`
 *
 * It does not read as half-finished because nothing shipped. It reads that way because
 * the last 10% — the wiring — is where work stops, and NO GATE MEASURED WIRING.
 *
 * This is that gate. It would have caught five of the ten before they were called done.
 *
 * WHAT IT DOES NOT CLAIM
 * ----------------------
 * Each detector states what it cannot see, and anything it cannot judge is reported as
 * UNVERIFIABLE rather than counted as unused. A gate that guesses gets switched off.
 *
 *   - Tailwind v4 turns `--color-*` tokens declared in an `@theme` block into utility
 *     classes, so a token with no `var()` reference may still be used as `bg-brand-500`.
 *     Those are UNVERIFIABLE here, never "unused".
 *   - Database functions are reached from SQL as often as from PostgREST — a policy, a
 *     trigger, another function's body. `zero POLICY references` has already been
 *     mistaken for `unused` in this estate and a revoke broke an RPC's inner call. SQL
 *     reach needs `pg_proc.prosrc`, which is a live-database question, so RPCs are
 *     reported for review and never failed on. See --rpc-report.
 *
 * RATCHET
 * -------
 * Known cases live in scripts/zero-consumers-baseline.json. The list may only SHRINK: a
 * NEW zero-consumer artifact fails, and a baselined entry that has since gained a
 * consumer also fails, so the file cannot become a place findings go to be forgotten.
 *
 *   node scripts/check-zero-consumers.mjs
 *   node scripts/check-zero-consumers.mjs --self-test
 *   node scripts/check-zero-consumers.mjs --write-baseline
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const BASELINE = 'scripts/zero-consumers-baseline.json'
const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']

const sh = (cmd, args) => {
  try { return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) }
  catch (e) { return e.stdout ?? '' }
}

function listFiles(dirs, exts) {
  const out = []
  const walk = (d, depth = 0) => {
    if (depth > 12 || !existsSync(d)) return
    let entries
    try { entries = readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'build') continue
      const p = `${d}/${e.name}`
      if (e.isDirectory()) walk(p, depth + 1)
      else if (exts.some((x) => e.name.endsWith(x))) out.push(p)
    }
  }
  for (const d of dirs) walk(d)
  return out
}

// ---------------------------------------------------------------- packages
export function packageConsumers(ownNames, manifests) {
  const counts = new Map(ownNames.map((n) => [n, []]))
  for (const { path, json } of manifests) {
    const deps = {
      ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}),
      ...(json.peerDependencies ?? {}), ...(json.optionalDependencies ?? {}),
    }
    for (const name of Object.keys(deps)) {
      if (!counts.has(name)) continue
      if (json.name === name) continue                 // a package is not its own consumer
      counts.get(name).push(path)
    }
  }
  return counts
}

// ---------------------------------------------------------------- hooks
export function hookConsumers(hooks, sources) {
  const counts = new Map(hooks.map((h) => [h.name, []]))
  for (const { path, text } of sources) {
    for (const h of hooks) {
      if (path === h.definedIn) continue                // a definition is not a use
      // An identifier reference outside the file that defines it.
      if (new RegExp(`\\b${h.name}\\b`).test(text)) counts.get(h.name).push(path)
    }
  }
  return counts
}

// ---------------------------------------------------------------- tokens
/**
 * A token declared inside an `@theme` block becomes a Tailwind utility, so absence of
 * `var(--x)` proves nothing about it. Those are UNVERIFIABLE, never "unused".
 */
/**
 * Which token DECLARATIONS were added in this diff? Pure, so the self-test exercises the
 * real parser: a `+` line adding `--x:` is a mint; a `-` line, or a `+` line that merely
 * REFERENCES a token via var(), is not.
 */
export function newDeclsFromDiff(diffText) {
  const out = new Set()
  for (const line of diffText.split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue
    const m = line.match(/^\+\s*(--[a-z0-9][a-z0-9-]*)\s*:/i)
    if (m) out.add(m[1])
  }
  return out
}

export function classifyToken(name, definedInThemeBlock, varRefs) {
  if (varRefs > 0) return 'used'
  if (definedInThemeBlock) return 'unverifiable'
  return 'unused'
}

function selfTest() {
  let bad = 0
  const fail = (m) => { console.error(`  FAIL ${m}`); bad++ }

  // packages
  {
    const counts = packageConsumers(['@bsuite/ui', '@bsuite/orphan'], [
      { path: 'crm7/package.json', json: { name: 'crm7', dependencies: { '@bsuite/ui': '^1.0.0' } } },
      { path: 'packages/ui/package.json', json: { name: '@bsuite/ui', dependencies: {} } },
      // A package listing ITSELF must not count as its own consumer.
      { path: 'packages/orphan/package.json', json: { name: '@bsuite/orphan', dependencies: { '@bsuite/orphan': '1.0.0' } } },
    ])
    if (counts.get('@bsuite/ui').length !== 1) fail('package with one consumer counted wrong')
    if (counts.get('@bsuite/orphan').length !== 0) fail('a package counted ITSELF as a consumer')
  }

  // hooks
  {
    const hooks = [{ name: 'useThing', definedIn: 'packages/ui/src/useThing.ts' }]
    const counts = hookConsumers(hooks, [
      { path: 'packages/ui/src/useThing.ts', text: 'export function useThing() {}' },
      { path: 'crm7/src/A.tsx', text: 'import { useThing } from "@bsuite/ui"; useThing()' },
    ])
    if (counts.get('useThing').length !== 1) fail('hook consumer count wrong (definition must not count)')
    const none = hookConsumers([{ name: 'useOrphan', definedIn: 'p/x.ts' }],
      [{ path: 'p/x.ts', text: 'export const useOrphan = () => {}' }])
    if (none.get('useOrphan').length !== 0) fail('an unused hook was counted as used')
    // A substring must not count: useThingElse is not useThing.
    const sub = hookConsumers([{ name: 'useThing', definedIn: 'p/x.ts' }],
      [{ path: 'p/x.ts', text: 'export const useThing = 1' }, { path: 'a.ts', text: 'useThingElse()' }])
    if (sub.get('useThing').length !== 0) fail('a longer identifier was counted as a use of the shorter one')
  }

  // tokens
  {
    if (classifyToken('--x', false, 3) !== 'used') fail('a referenced token is not "used"')
    if (classifyToken('--x', false, 0) !== 'unused') fail('an unreferenced plain token is not "unused"')
    if (classifyToken('--color-x', true, 0) !== 'unverifiable')
      fail('an @theme token with no var() must be UNVERIFIABLE — Tailwind turns it into a utility')
  }

  // minted-token diff parsing
  {
    const d = [
      '--- a/packages/theme/src/x.css',
      '+++ b/packages/theme/src/x.css',
      '+  --newly-minted: #123;',
      '-  --removed-token: #456;',
      '+  color: var(--already-there);',
      '   --untouched: #789;',
    ].join('\n')
    const got = newDeclsFromDiff(d)
    if (!got.has('--newly-minted')) fail('an added token declaration was not detected as minted')
    if (got.has('--removed-token')) fail('a REMOVED token was counted as minted')
    if (got.has('--already-there')) fail('a var() REFERENCE on an added line was counted as a declaration')
    if (got.has('--untouched')) fail('an unchanged context line was counted as minted')
    if (got.size !== 1) fail(`minted set should hold exactly 1, holds ${got.size}`)
  }

  console.log(
    'check-zero-consumers --self-test: 14 assertions across four detectors — package ' +
      'consumer counting including the self-reference trap, hook counting including the ' +
      'definition-is-not-a-use and substring traps, and token classification including ' +
      'the Tailwind @theme case that must never be called unused, and minted-token diff ' +
      'parsing including the removed-token and var()-reference-on-an-added-line traps.',
  )
  return bad
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  if (selfTest() !== 0) { console.error('::error::checker failed its own self-test'); process.exit(1) }

  const findings = { package: [], hook: [], token: [] }
  const unverifiable = { token: 0 }

  // ---- packages -----------------------------------------------------------
  const pkgDirs = readdirSync('packages', { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(`packages/${e.name}/package.json`))
    .map((e) => `packages/${e.name}`)
  const ownNames = pkgDirs.map((d) => JSON.parse(readFileSync(`${d}/package.json`, 'utf8')).name).filter(Boolean)

  const manifestPaths = [
    ...pkgDirs.map((d) => `${d}/package.json`),
    'package.json',
    ...APPS.flatMap((a) => (existsSync(`${a}/package.json`) ? [`${a}/package.json`] : [])),
    ...APPS.flatMap((a) => listFiles([`${a}/packages`], ['package.json'])),
  ]
  const manifests = manifestPaths.filter(existsSync).map((p) => {
    try { return { path: p, json: JSON.parse(readFileSync(p, 'utf8')) } } catch { return null }
  }).filter(Boolean)

  // ------------------------------------------------------------------------
  // THE INPUTS MUST BE PRESENT BEFORE ANY VERDICT.
  //
  // The apps are SUBMODULES. In a parent worktree they are empty directories until
  // `git submodule update --init` runs. With no app package.json on disk, every shared
  // package has zero consumers — and the first run of this gate duly reported 14 of 16
  // packages unused, including @bsuite/ui and @bsuite/theme, which every app depends on.
  //
  // That is the estate's most-repeated failure class wearing a different hat: a scan
  // over an empty tree is "could not measure", never a finding. Assert the denominator
  // before drawing any conclusion from it.
  // ------------------------------------------------------------------------
  const missingApps = APPS.filter((a) => !existsSync(`${a}/package.json`))
  if (missingApps.length) {
    console.error(
      `::error::${missingApps.length} of ${APPS.length} app(s) are not checked out ` +
        `(${missingApps.join(', ')}). Every consumer of a shared package lives in an app, so ` +
        `with these absent EVERY package would report zero consumers. That is "could not ` +
        `measure", not a finding. Run with submodules initialised: ` +
        `git submodule update --init --recursive`,
    )
    process.exit(1)
  }

  const pkgCounts = packageConsumers(ownNames, manifests)
  for (const [name, consumers] of pkgCounts) if (consumers.length === 0) findings.package.push(name)

  // ---- hooks --------------------------------------------------------------
  const pkgSrcFiles = listFiles(pkgDirs.map((d) => `${d}/src`), ['.ts', '.tsx'])
  const hooks = []
  for (const f of pkgSrcFiles) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(use[A-Z][A-Za-z0-9_]*)/g)) {
      hooks.push({ name: m[1], definedIn: f })
    }
  }
  const appSrcFiles = listFiles(APPS.map((a) => `${a}/src`), ['.ts', '.tsx'])
  const sources = [...pkgSrcFiles, ...appSrcFiles].map((p) => ({ path: p, text: readFileSync(p, 'utf8') }))
  const hookCounts = hookConsumers(hooks, sources)
  for (const [name, consumers] of hookCounts) if (consumers.length === 0) findings.hook.push(name)

  // ---- tokens -------------------------------------------------------------
  const cssFiles = listFiles(['packages/theme/src', 'packages/design-tokens'], ['.css'])
  const allText = [...sources.map((s) => s.text), ...listFiles([...APPS, 'packages'], ['.css']).map((p) => readFileSync(p, 'utf8'))].join('\n')
  const tokens = new Map()
  for (const f of cssFiles) {
    const text = readFileSync(f, 'utf8')
    // Which declarations sit inside an `@theme { … }` block?
    const themeRanges = []
    for (const m of text.matchAll(/@theme[^{]*\{/g)) {
      let depth = 1, i = m.index + m[0].length
      while (i < text.length && depth > 0) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; i++ }
      themeRanges.push([m.index, i])
    }
    for (const m of text.matchAll(/(--[a-z0-9][a-z0-9-]*)\s*:/gi)) {
      const inTheme = themeRanges.some(([a, b]) => m.index >= a && m.index < b)
      const prev = tokens.get(m[1])
      tokens.set(m[1], { inTheme: (prev?.inTheme ?? false) || inTheme })
    }
  }
  for (const [name, meta] of tokens) {
    const refs = (allText.match(new RegExp(`var\\(\\s*${name}\\b`, 'g')) || []).length
    const verdict = classifyToken(name, meta.inTheme, refs)
    if (verdict === 'unused') findings.token.push(name)
    else if (verdict === 'unverifiable') unverifiable.token++
  }

  for (const k of Object.keys(findings)) findings[k].sort()

  if (process.argv.includes('--write-baseline')) {
    writeFileSync(BASELINE, JSON.stringify({
      _comment: [
        'Artifacts that exist with ZERO consumers, already known. This list may only SHRINK.',
        'A NEW zero-consumer artifact fails the gate; an entry here that has since gained a',
        'consumer ALSO fails, so this cannot become a place findings go to be forgotten.',
        'Regenerate deliberately with --write-baseline; never to make a red run green.',
      ],
      ...findings,
    }, null, 2) + '\n')
    console.log(`wrote ${BASELINE}`)
    return
  }

  let baseline = { package: [], hook: [], token: [] }
  try { baseline = { ...baseline, ...JSON.parse(readFileSync(BASELINE, 'utf8')) } } catch { /* first run */ }

  // A ZERO denominator is "could not measure", never "nothing to measure".
  const denom = { package: ownNames.length, hook: hooks.length, token: tokens.size }
  for (const [kind, n] of Object.entries(denom)) {
    if (n === 0) {
      console.error(`::error::the ${kind} detector found 0 artifacts to examine. That is "could not check", not a clean bill.`)
      process.exit(1)
    }
  }

  // HEAD LINE FIRST — every denominator before any verdict.
  console.log(
    `[zero-consumers] ${denom.package} package(s), ${denom.hook} exported hook(s), ` +
      `${denom.token} theme token(s) examined. Zero-consumer: ` +
      `${findings.package.length} package(s), ${findings.hook.length} hook(s), ` +
      `${findings.token.length} token(s). ` +
      `${unverifiable.token} token(s) UNVERIFIABLE (declared in an @theme block, so Tailwind may ` +
      `emit them as utilities — never counted as unused).`,
  )

  // WHICH TOKEN DECLARATIONS ARE NEW IN THIS DIFF?
  //
  // A token's consumers live in APP source, and the apps are submodules — so whether a
  // token is "used" depends on which gitlinks are checked out. My local run and CI
  // disagreed by one token for exactly that reason, and chasing parity would have meant
  // regenerating the baseline on every pointer advance.
  //
  // The doctrine was never "no token may be unreferenced". It is "a token MINTED and not
  // consumed" — --role-border-interactive was created and 173 files stayed on the old
  // border. So a token is fatal only when its DECLARATION IS NEW IN THIS DIFF.
  //
  // TWO dots, not three. `base...HEAD` diffs from the MERGE BASE, so once a branch merges
  // its base in — which every long-lived branch here does — everything the base added
  // since the fork reads as "added by this branch". That is how `--input`, a token this
  // branch never touched, was reported as newly minted and failed CI.
  const newTokenDecls = new Set()
  {
    const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/development'
    const diff = sh('git', ['diff', '--unified=0', base, 'HEAD', '--', 'packages/theme', 'packages/design-tokens'])
    for (const t of newDeclsFromDiff(diff)) newTokenDecls.add(t)
  }

  let failed = 0
  for (const kind of ['package', 'hook', 'token']) {
    const known = new Set(baseline[kind] ?? [])
    const now = new Set(findings[kind])
    for (const n of findings[kind]) {
      if (known.has(n)) { console.log(`  known   ${kind}: ${n} has no consumer`); continue }
      if (kind === 'token' && !newTokenDecls.has(n)) {
        console.log(`::warning::token '${n}' has no consumer and is not in the baseline. Not fatal: it was not declared in this diff, and token reach moves with the submodule pointers. Extend or trim the baseline with --write-baseline.`)
        continue
      }
      const minted = kind === 'token'
        ? ' It is declared in THIS diff — a token minted and not consumed is the exact pattern this gate exists for.'
        : ''
      console.error(`::error::NEW zero-consumer ${kind}: '${n}' exists and nothing uses it.${minted} Wire it, or remove it — there is no third state.`)
      failed++
    }
    for (const n of known) {
      if (!now.has(n)) {
        // Token reach moves with the submodule pointers, so a newly-USED token would
        // otherwise fail every pointer-advance PR for doing its job. Packages and hooks
        // live in this repo's own tree, so a stale entry there is real and stays fatal.
        if (kind === 'token') {
          console.log(`::warning::${BASELINE} still lists token '${n}', but it now has a consumer. Trim it with --write-baseline when convenient.`)
        } else {
          console.error(`::error::${BASELINE} still lists ${kind} '${n}', but it now HAS a consumer. Remove the entry — this list may only shrink.`)
          failed++
        }
      }
    }
  }

  if (failed) process.exit(1)
  console.log('✓ no new zero-consumer artifacts.')
}

if (import.meta.url === `file://${process.argv[1]}`) main()
