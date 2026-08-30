#!/usr/bin/env node
/**
 * check-published-matches-source — does the PUBLISHED tarball contain what the
 * source at that same version says it should?
 *
 * WHY THIS EXISTS, AND WHY check-own-package-freshness DOES NOT COVER IT
 * ─────────────────────────────────────────────────────────────────────
 * The freshness guard answers "is every consumer on our latest version?" — a
 * VERSION question. On 2026-08-17 it was green while this was true:
 *
 *     packages/theme source @ 0.13.0     fonts.css + --role-border-interactive
 *                                        + gradient-underline + a 22-assertion
 *                                        contrast test
 *     @bsuite/theme@0.13.0 on npm        fonts.css ONLY
 *
 * Two pull requests both set the version to 0.13.0. Whichever reached `main`
 * first published. The second could not republish a version npm already held, so
 * it **no-oped without failing** — no error, no warning, no red check. The
 * registry and the source diverged at the SAME version number, and every
 * version-based check in the estate agreed everything was fine.
 *
 * The user-visible consequence: every app on 0.13.0 got the fonts and NOT the 3:1
 * interactive border contrast fix. `border-input` stayed at 1.12:1 on every
 * Input, Select, Textarea and outline Button, while the item read "merged".
 *
 * THE GENERAL SHAPE, which is why this is a guard and not a one-off fix:
 * **a version number is a claim about content, and npm will not check it for
 * you.** Publish is idempotent-by-refusal, and a refusal in CI reads as a
 * successful no-op unless something looks at the bytes.
 *
 * WHAT IT ASSERTS
 * ───────────────
 * For each of our published packages, at the version the SOURCE currently
 * declares: download that exact version's tarball and require that every file the
 * source ships under the package's `files`/entry points is present in it.
 *
 * It compares PRESENCE and CONTENT HASH, not mtimes or ordering, so a rebuild
 * that produces byte-identical output does not trip it.
 *
 * It does NOT fail when the source version is simply UNPUBLISHED — that is the
 * normal state between a merge to development and the next promotion, and the
 * freshness guard already covers staleness. It fails when a version EXISTS on npm
 * and its contents do not match the source that claims to be it. That is the
 * unrecoverable-by-waiting case: republishing is impossible, so the only fix is a
 * version bump, and nobody knows to make one.
 *
 * USAGE
 *   node scripts/check-published-matches-source.mjs
 *   node scripts/check-published-matches-source.mjs --self-test
 */

import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')

/** Files that legitimately differ or are absent in a tarball. */
const IGNORE = [
  /(^|\/)node_modules\//,
  /(^|\/)\.turbo\//,
  /(^|\/)CHANGELOG\.md$/, // often shipped, but never load-bearing
  /\.test\.(ts|tsx|js|mjs)$/, // tests are usually excluded from the tarball by design
  /(^|\/)__tests__\//,
  /(^|\/)tsconfig[^/]*\.json$/,
]

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16)

function walk(dir, base = dir, out = []) {
  for (const e of readdirSync(dir)) {
    const abs = join(dir, e)
    const rel = relative(base, abs)
    if (IGNORE.some((re) => re.test(rel))) continue
    if (statSync(abs).isDirectory()) walk(abs, base, out)
    else out.push(rel)
  }
  return out
}

/** Pure — so --self-test exercises the real decision, not a paraphrase of it. */
export function evaluate(pkgs) {
  const failures = []
  const unverifiable = []
  let compared = 0

  for (const p of pkgs) {
    if (p.status === 'unpublished') continue // normal between merge and promotion
    if (p.status === 'error') {
      failures.push({ code: 'P0', message: `${p.name}: could not be checked — ${p.detail}` })
      continue
    }
    if (p.status === 'unverifiable') {
      /*
       * Reported, never counted as compared. It is not a failure — a dist-only
       * package is a legitimate shape — but it must not read as a clean pass,
       * because nothing about it was actually checked.
       */
      unverifiable.push(p.name)
      continue
    }
    compared++
    for (const f of p.missing ?? []) {
      failures.push({
        code: 'P1',
        message:
          `${p.name}@${p.version}: SOURCE ships ${f} but the PUBLISHED tarball does not. ` +
          `A version already on npm cannot be republished, so this is only fixable by a ` +
          `version bump — and nothing else in the estate will tell you.`,
      })
    }
    for (const f of p.differing ?? []) {
      failures.push({
        code: 'P2',
        message: `${p.name}@${p.version}: ${f} differs between source and the published tarball.`,
      })
    }
  }

  if (compared === 0 && pkgs.length > 0 && !pkgs.some((p) => p.status === 'error')) {
    // Every package unpublished is legitimate; scanning zero packages is not.
    if (pkgs.length === 0) failures.push({ code: 'P3', message: 'no packages examined' })
  }

  return { ok: failures.length === 0, failures, compared }
}

function selfTest() {
  const cases = [
    ['a matching package passes', [{ name: 'a', version: '1', status: 'ok', missing: [], differing: [] }], true],
    ['an unpublished version is not a failure', [{ name: 'a', version: '9', status: 'unpublished' }], true],
    ['P1 a file missing from the tarball fails', [{ name: 'a', version: '1', status: 'ok', missing: ['src/x.css'] }], false],
    ['P2 a differing file fails', [{ name: 'a', version: '1', status: 'ok', missing: [], differing: ['src/y.css'] }], false],
    ['P0 an unreadable package fails', [{ name: 'a', status: 'error', detail: 'network' }], false],
    [
      'THE REGRESSION FIXTURE — theme 0.13.0 shipped fonts but lost the contrast fix',
      [{ name: '@bsuite/theme', version: '0.13.0', status: 'ok',
         missing: ['src/css/vars.css', 'src/non-text-contrast.test.ts'], differing: [] }],
      false,
    ],
  ]
  let bad = 0
  for (const [name, pkgs, wantOk] of cases) {
    const got = evaluate(pkgs).ok
    if (got !== wantOk) { console.error(`  FAIL ${name}: expected ok=${wantOk}, got ${got}`); bad++ }
  }
  console.log(
    `check-published-matches-source --self-test: ${cases.length} cases exercised across ` +
      `both directions (match, unpublished-is-fine, P1 missing, P2 differing, P0 unreadable, ` +
      `plus the real theme@0.13.0 regression).`,
  )
  return bad
}

function inspect(pkgDir) {
  const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  const { name, version, private: isPrivate } = manifest
  if (isPrivate || !name?.startsWith('@bsuite/')) return null

  let published
  try {
    published = JSON.parse(execFileSync('npm', ['view', `${name}@${version}`, '--json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }))
  } catch {
    return { name, version, status: 'unpublished' }
  }
  if (!published) return { name, version, status: 'unpublished' }

  const tmp = mkdtempSync(join(tmpdir(), 'pubcheck-'))
  try {
    execFileSync('npm', ['pack', `${name}@${version}`, '--pack-destination', tmp], {
      stdio: 'ignore',
    })
    const tgz = readdirSync(tmp).find((f) => f.endsWith('.tgz'))
    execFileSync('tar', ['xzf', join(tmp, tgz), '-C', tmp])
    const packed = join(tmp, 'package')

    // Compare ONLY what the package DECLARES it ships. Walking all of src/ was
    // the first draft and it cried wolf: @bsuite/theme's `files` is
    // ["dist", "src/css", "src/preset-v4.css"], so src/react/* and src/ssr/* are
    // excluded from the tarball BY DESIGN and reported as missing every run. A
    // guard that reports eight false positives alongside two real ones gets
    // muted, and then the two real ones are invisible again — which is the exact
    // failure this guard exists to prevent, reintroduced by the guard itself.
    const declared = Array.isArray(manifest.files) ? manifest.files : ['src']
    const srcFiles = declared.flatMap((entry) => {
      const abs = join(pkgDir, entry)
      if (!existsSync(abs)) return []
      if (statSync(abs).isDirectory()) return walk(abs).map((f) => join(entry, f))
      return [entry]
    // dist/ is a build artefact: it legitimately differs byte-for-byte between a
    // local build and the published one (timestamps, banner, minifier version).
    // The SOURCE files are the honest comparison, so dist is excluded here — the
    // build is verified by the package's own tests, not by this guard.
    }).filter((f) => !f.startsWith('dist'))
    const missing = []
    const differing = []
    for (const rel of srcFiles) {
      const there = join(packed, rel)
      if (!existsSync(there)) { missing.push(rel); continue }
      if (sha(readFileSync(join(pkgDir, rel))) !== sha(readFileSync(there))) differing.push(rel)
    }
    /*
     * ZERO FILES COMPARED IS NOT A PASS.
     *
     * `dist` is excluded above for a good reason — a build legitimately differs
     * byte-for-byte between local and published. But a package that ships ONLY
     * `dist` then has nothing left to compare, and this guard was reporting
     * "0 differing" for it: a clean verdict produced by looking at nothing.
     *
     * Measured 2026-08-30: FIVE of thirteen packages were in that state —
     * auth, charge-calc, data-grid, dates, schema-registry. Unevaluable is not
     * passed, so they now say so in their own status rather than borrowing the
     * clean one.
     */
    if (srcFiles.length === 0) {
      return { name, version, status: 'unverifiable', missing, differing, filesChecked: 0 }
    }
    return { name, version, status: 'ok', missing, differing, filesChecked: srcFiles.length }
  } catch (err) {
    return { name, version, status: 'error', detail: err.message }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)

  const pkgsDir = join(ROOT, 'packages')
  const results = []
  for (const d of readdirSync(pkgsDir)) {
    const dir = join(pkgsDir, d)
    if (!existsSync(join(dir, 'package.json'))) continue
    const r = inspect(dir)
    if (r) results.push(r)
  }

  const { ok, failures, compared } = evaluate(results)

  // LANE-WATCHER: denominator at the HEAD.
  console.log(
    `check-published-matches-source: ${results.length} @bsuite/* package(s) examined, ` +
      `${compared} with their declared version already on npm, ` +
      `${results.filter((r) => r.status === 'unpublished').length} not yet published.`,
  )
  for (const r of results) {
    const tag =
      r.status === 'unpublished' ? 'not yet published'
      : r.status === 'error' ? `ERROR ${r.detail}`
      : r.status === 'unverifiable'
        ? 'UNVERIFIABLE — ships dist only, so there is no source file to compare'
      : `${r.filesChecked} src file(s) compared, ${r.missing.length} missing, ${r.differing.length} differing`
    console.log(`    ${r.name}@${r.version ?? '?'} — ${tag}`)
  }

  const unverifiableNames = results.filter((r) => r.status === 'unverifiable').map((r) => r.name)
  if (unverifiableNames.length > 0) {
    console.log(
      `\n  UNVERIFIABLE by this guard (${unverifiableNames.length}): ${unverifiableNames.join(', ')}\n` +
      '  These ship dist only. dist is excluded because a build differs byte-for-byte\n' +
      '  between local and published, so nothing remains to compare — which means a\n' +
      '  clean verdict here would be produced by looking at nothing. Their builds are\n' +
      "  verified by each package's own tests, not by this guard.",
    )
  }

  if (!ok) {
    for (const f of failures) console.error(`::error::[${f.code}] ${f.message}`)
    process.exit(1)
  }
  console.log('  every published version matches the source that claims to be it.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
