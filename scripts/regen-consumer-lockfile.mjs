#!/usr/bin/env node
/*
 * REGENERATE ONE CONSUMER'S pnpm-lock.yaml SO PUBLISHED @bsuite/* FIXES REACH IT.
 *
 * THE GAP THIS CLOSES. Publishing a package tells its consumers nothing. All
 * seventeen `publish-*.yml` end at "Published to npm", and an app installs with
 * `--frozen-lockfile`, so a fix sits on the registry, reachable by the app's own
 * caret specifier, and never ships. This estate has THREE checks that detect that
 * drift — check-shared-package-reach, check-lockfile-hygiene, check-table-reach —
 * and, until this file, ZERO that fix it. Detection without a remedy just moves
 * the manual step to whoever reads the log.
 *
 * WHY A SCRIPT AND NOT STEPS IN A WORKFLOW. `publish-next.yml` already argues
 * this for the publish path and the argument holds here: a capability living in
 * two files with nothing asserting they agree is drift waiting to happen. The
 * runbook prose in AGENTS.md and CLAUDE.md, the bsuite-pnpm-monorepo skill, and
 * CI must all do the SAME thing, so they all call this.
 *
 * THE FIVE INPUTS, AND WHY EACH ONE IS COPIED
 * ────────────────────────────────────────────────────────────────────────────
 * pnpm MUST NOT run inside the bsuite tree: it embeds workspace-relative `..`
 * paths into the lockfile and Vercel then fails with ERR_PNPM_OUTDATED_LOCKFILE.
 * So the regeneration happens in a temp dir, and EVERY pnpm config input has to
 * come with it:
 *
 *   package.json        the specifiers being resolved
 *   pnpm-lock.yaml      the BASE — without it, every transitive dep re-resolves
 *                       and the diff explodes from ~12 lines to ~200. It is also
 *                       what `pnpm update` upgrades FROM, scoped to @bsuite/*.
 *   pnpm-workspace.yaml carries the `overrides:` block. OMITTING THIS SILENTLY
 *                       DROPS EVERY OVERRIDE — conduit has nine, mostly security
 *                       pins — and then the frozen install fails with
 *                       ERR_PNPM_LOCKFILE_CONFIG_MISMATCH, a different error than
 *                       the one you were fixing. This line was missing from the
 *                       runbook until 2026-08-18 and cost a wrong lockfile.
 *   .npmrc              registry/auth config
 *   patches/            crm7 has one; a missing patch dir changes resolution
 *
 * THE THREE VERIFICATIONS, IN ORDER, ALL OF THEM
 * ────────────────────────────────────────────────────────────────────────────
 *   1. the only importer is `.`      — `..` or `../packages/*` means pnpm ran in
 *                                      the tree; this lockfile would break Vercel
 *   2. the overrides survived        — counted in the LOCKFILE, not the yaml: the
 *                                      two legitimately differ (conduit's lockfile
 *                                      carries nine, its yaml eight)
 *   3. `pnpm install --frozen-lockfile` SUCCEEDS — not "parses". This is the only
 *                                      one that catches a config mismatch, and the
 *                                      first two pass happily while it fails.
 *
 * AND THE DIFF SIZE IS THE TELL. A one-package bump is tens of lines. Hundreds
 * means the INPUTS differed — a missing base lockfile or a missing config file —
 * not that the dependencies really moved that much. Measured: the
 * dropped-overrides mistake produced 198 insertions / 196 deletions; the same
 * change done correctly was 12 / 5.
 *
 * USAGE
 *   node scripts/regen-consumer-lockfile.mjs --app crm7            # dry run
 *   node scripts/regen-consumer-lockfile.mjs --app crm7 --write    # apply
 *   node scripts/regen-consumer-lockfile.mjs --all --write --json
 *
 * EXIT CODES  0 already current, or written and verified
 *             1 a verification FAILED — nothing was written
 *             2 dry run: a change is needed (so CI can branch on it)
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APPS = ['crm7', 'business-suite-unified', 'throughput', 'braden', 'conduit', 'R80.4']

/* Every pnpm config input. Order is irrelevant; completeness is not. */
const INPUTS = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc', 'patches']

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/*
 * Count `overrides:` entries as the LOCKFILE records them. Deliberately a line
 * scan of the top-level block rather than a YAML parse: adding a YAML dependency
 * to a script whose whole job is to be runnable anywhere is a worse trade than
 * counting indented keys under a known top-level anchor.
 */
export function countOverrides(lockText) {
  const lines = lockText.split('\n')
  const start = lines.findIndex((l) => l === 'overrides:')
  if (start === -1) return 0
  let n = 0
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.trim() === '') continue
    if (!l.startsWith('  ')) break // dedented to a new top-level key
    if (l.startsWith('    ')) continue // nested value, not an entry
    n++
  }
  return n
}

/* The importers block must name `.` and nothing that escapes the package root. */
export function importersAreLocal(lockText) {
  const lines = lockText.split('\n')
  const start = lines.findIndex((l) => l === 'importers:')
  if (start === -1) return { ok: false, detail: 'no importers: block at all' }
  const names = []
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.trim() === '') continue
    if (!l.startsWith('  ')) break
    if (l.startsWith('    ')) continue
    names.push(l.trim().replace(/:$/, ''))
  }
  const escaping = names.filter((n) => n.includes('..'))
  if (escaping.length > 0) {
    return { ok: false, detail: `importer(s) escape the package root: ${escaping.join(', ')}` }
  }
  if (names.length !== 1 || names[0] !== '.') {
    return { ok: false, detail: `expected exactly one importer '.', got: ${names.join(', ') || '(none)'}` }
  }
  return { ok: true, detail: "single importer '.'" }
}

/* Resolved versions of every @bsuite/* dep, read from `version:` NOT `specifier:`.
 * A pnpm entry carries both and a naive grep returns whichever comes first. */
export function readBsuiteResolutions(lockText) {
  const out = {}
  const lines = lockText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s+'(@bsuite\/[a-z0-9-]+)':\s*$/)
    if (!m) continue
    let version = null
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const v = lines[j].match(/^\s+version:\s*([^\s(]+)/)
      if (v) { version = v[1]; break }
      if (/^\s+'@/.test(lines[j])) break
    }
    if (version) out[m[1]] = version
  }
  return out
}

function regenerate(app, { write }) {
  const appDir = join(ROOT, app)
  const result = { app, status: 'UNKNOWN', before: {}, after: {}, checks: {}, diffStat: '', notes: [] }
  if (!existsSync(join(appDir, 'package.json'))) {
    result.status = 'SKIPPED'
    result.notes.push('no package.json — submodule not initialised')
    return result
  }

  const beforeText = readFileSync(join(appDir, 'pnpm-lock.yaml'), 'utf8')
  result.before = readBsuiteResolutions(beforeText)
  const overridesBefore = countOverrides(beforeText)

  // OUTSIDE the repo tree — see the docblock. tmpdir() is never under ROOT.
  const lab = mkdtempSync(join(tmpdir(), `lockgen-${app}-`))
  try {
    for (const f of INPUTS) {
      const src = join(appDir, f)
      if (existsSync(src)) cpSync(src, join(lab, f), { recursive: true })
      else if (f === 'package.json' || f === 'pnpm-lock.yaml') {
        result.status = 'FAILED'
        result.notes.push(`required input missing: ${f}`)
        return result
      }
    }

    /*
     * TWO PASSES, AND BOTH ARE LOAD-BEARING. This is the whole reason the drift
     * survived months of people following the runbook.
     *
     * PASS 1 — `pnpm update`, NOT `pnpm install`. Every documented copy of this
     * procedure (CLAUDE.md, AGENTS.md, the bsuite-pnpm-monorepo skill, and
     * check-shared-package-reach's own failure message) said
     * `pnpm install --lockfile-only --no-frozen-lockfile`. That RE-RESOLVES; it
     * does not UPGRADE. An entry already satisfying its range is left exactly
     * where it is, so a lockfile pinning 2.2.0 under `^2.1.0` is satisfied,
     * install keeps 2.2.0, and it reports success.
     *
     * MEASURED 2026-08-27 on throughput, identical inputs, same temp lab:
     *   install --lockfile-only --no-frozen-lockfile   -> 2.2.0  (no change)
     *   install --lockfile-only --resolution-mode=highest -> 2.2.0  (no change:
     *                       the mode governs NEW resolutions; a satisfying
     *                       lockfile entry is still preferred)
     *   update '@bsuite/*' --lockfile-only             -> 2.3.1
     *
     * The procedure could not do the thing it was written to do. Anyone who ran
     * it saw an unchanged lockfile and correctly concluded there was nothing to
     * do — detection said "stale", the remedy said "already current", and the
     * estate believed the remedy.
     *
     * PASS 2 — restore package.json and re-resolve, because `pnpm update` HAS A
     * SIDE EFFECT THE RUNBOOK NEVER MENTIONED: it rewrites the dependency RANGE
     * in package.json (`^2.1.0` -> `^2.3.1`) and records that new range as the
     * lockfile's `specifier:`. Copying back only the lockfile then leaves the
     * recorded specifier disagreeing with package.json, and
     * `pnpm install --frozen-lockfile` REJECTS that — the exact failure seen
     * here before this pass existed.
     *
     * Narrowing the range is a decision about what the app requires. It may
     * well be the right decision, but it is not a lockfile refresh, and it must
     * not happen as an unnoticed side effect of one. So package.json is put
     * back and the lockfile re-resolved against it: the range is preserved, the
     * RESOLUTION stays at the newly published version, and the two agree.
     *
     * Verified end state: package.json ^2.1.0, lockfile specifier ^2.1.0,
     * lockfile resolved 2.3.1.
     *
     * Scoped to '@bsuite/*' deliberately: first-party packages move within
     * ranges the app already declares; every third-party dependency stays
     * pinned where the base lockfile had it. That is what keeps the diff at ~4
     * lines instead of ~200.
     */
    const pkgJsonPath = join(lab, 'package.json')
    const pkgJsonOriginal = readFileSync(pkgJsonPath, 'utf8')
    sh('pnpm', ['update', '@bsuite/*', '--lockfile-only'], lab)
    writeFileSync(pkgJsonPath, pkgJsonOriginal)
    sh('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], lab)

    // The range must be exactly as we found it. If pass 2 failed to restore it,
    // stop: a silently narrowed dependency range is a contract change.
    if (readFileSync(pkgJsonPath, 'utf8') !== pkgJsonOriginal) {
      result.status = 'FAILED'
      result.notes.push('package.json was modified and could not be restored — refusing to narrow a declared range as a side effect')
      return result
    }
    const afterText = readFileSync(join(lab, 'pnpm-lock.yaml'), 'utf8')
    result.after = readBsuiteResolutions(afterText)

    if (afterText === beforeText) {
      result.status = 'CURRENT'
      result.checks = { importers: 'n/a — unchanged', overrides: `${overridesBefore} (unchanged)`, frozenInstall: 'n/a — unchanged' }
      return result
    }

    // ---- verification 1: importers ----
    const imp = importersAreLocal(afterText)
    result.checks.importers = imp.detail
    if (!imp.ok) {
      result.status = 'FAILED'
      result.notes.push('importers check failed — pnpm resolved against something outside the package root')
      return result
    }

    // ---- verification 2: overrides preserved ----
    const overridesAfter = countOverrides(afterText)
    result.checks.overrides = `${overridesBefore} -> ${overridesAfter}`
    if (overridesAfter !== overridesBefore) {
      result.status = 'FAILED'
      result.notes.push(
        `overrides changed ${overridesBefore} -> ${overridesAfter}. A DROP almost always means ` +
          'pnpm-workspace.yaml was not copied; those entries are usually security pins.',
      )
      return result
    }

    if (!write) {
      result.status = 'WOULD-CHANGE'
      result.checks.frozenInstall = 'not run — dry run'
      return result
    }

    writeFileSync(join(appDir, 'pnpm-lock.yaml'), afterText)

    // ---- verification 3: the one that actually catches a config mismatch ----
    try {
      sh('pnpm', ['install', '--frozen-lockfile'], appDir)
      result.checks.frozenInstall = 'SUCCESS'
    } catch (e) {
      writeFileSync(join(appDir, 'pnpm-lock.yaml'), beforeText) // leave the tree as found
      result.status = 'FAILED'
      result.checks.frozenInstall = 'FAILED'
      result.notes.push(`frozen install rejected the new lockfile; reverted. ${String(e.stderr || e).slice(0, 300)}`)
      return result
    }

    result.diffStat = sh('git', ['diff', '--stat', '--', 'pnpm-lock.yaml'], appDir).trim().split('\n').pop() || ''
    result.status = 'WRITTEN'
    return result
  } catch (e) {
    result.status = 'FAILED'
    result.notes.push(String(e.stderr || e.message || e).slice(0, 400))
    return result
  } finally {
    rmSync(lab, { recursive: true, force: true })
  }
}

/* ------------------------------- self-test ------------------------------- */
if (process.argv.includes('--self-test')) {
  const cases = []
  const t = (name, actual, expected) => cases.push({ name, ok: JSON.stringify(actual) === JSON.stringify(expected), actual, expected })

  t('overrides: counts top-level entries only', countOverrides(
    ['overrides:', "  vite: '>=8.0.8'", "  picomatch: '>=4.0.4'", 'packages: {}'].join('\n')), 2)
  t('overrides: absent block is 0', countOverrides('importers:\n  .:\n'), 0)
  t('overrides: nested values are not entries', countOverrides(
    ['overrides:', '  foo:', '    nested: 1', "  bar: '2'"].join('\n')), 2)
  t('importers: single . is ok', importersAreLocal('importers:\n  .:\n    dependencies:\n').ok, true)
  t('importers: .. is rejected', importersAreLocal('importers:\n  ..:\n').ok, false)
  t('importers: ../packages is rejected', importersAreLocal('importers:\n  ../packages/theme:\n').ok, false)
  t('importers: missing block is rejected', importersAreLocal('lockfileVersion: 9\n').ok, false)
  t('resolutions: reads version: not specifier:', readBsuiteResolutions(
    ["  '@bsuite/page-builder':", "    specifier: ^2.1.0", '    version: 2.3.1'].join('\n')),
    { '@bsuite/page-builder': '2.3.1' })
  t('resolutions: ignores a parenthesised peer suffix', readBsuiteResolutions(
    ["  '@bsuite/ui':", '    specifier: ^1.3.0', '    version: 1.3.0(react@19.2.0)'].join('\n')),
    { '@bsuite/ui': '1.3.0' })

  const failed = cases.filter((c) => !c.ok)
  for (const f of failed) console.error(`FAIL ${f.name}\n  expected ${JSON.stringify(f.expected)}\n  actual   ${JSON.stringify(f.actual)}`)
  if (failed.length > 0) process.exit(1)
  console.log(`regen-consumer-lockfile --self-test: OK (${cases.length} cases)`)
  process.exit(0)
}

/* --------------------------------- main ---------------------------------- */
const write = process.argv.includes('--write')
const asJson = process.argv.includes('--json')
const appArg = process.argv.find((a) => a.startsWith('--app='))
const targets = process.argv.includes('--all') ? APPS : appArg ? [appArg.split('=')[1]] : []

if (targets.length === 0) {
  console.error('usage: regen-consumer-lockfile.mjs (--app=<name> | --all) [--write] [--json]')
  process.exit(1)
}

const results = targets.map((a) => regenerate(a, { write }))

if (asJson) {
  console.log(JSON.stringify({ results }, null, 2))
} else {
  for (const r of results) {
    console.log(`\n${r.app}: ${r.status}`)
    const moved = Object.keys(r.after).filter((k) => r.before[k] !== r.after[k])
    for (const k of moved) console.log(`  ${k}  ${r.before[k] || '(absent)'} -> ${r.after[k]}`)
    for (const [k, v] of Object.entries(r.checks)) console.log(`  check ${k}: ${v}`)
    if (r.diffStat) console.log(`  diff: ${r.diffStat}`)
    for (const n of r.notes) console.log(`  note: ${n}`)
  }
}

if (results.some((r) => r.status === 'FAILED')) process.exit(1)
if (results.some((r) => r.status === 'WOULD-CHANGE')) process.exit(2)
process.exit(0)
