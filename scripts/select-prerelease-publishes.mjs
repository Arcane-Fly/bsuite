#!/usr/bin/env node
/**
 * select-prerelease-publishes — which packages should publish a PRERELEASE from
 * this push to `development`?
 *
 * WHY THIS EXISTS
 * ───────────────────────────────────────────────────────────────────────────
 * `scripts/publish-dist-tag.mjs` decided WHICH TAG a publish takes once it is
 * running. It made a prerelease safe. It did not make one HAPPEN: all fifteen
 * `publish-*.yml` workflows still trigger only on `push: branches: [main]`, so
 * on `development` nothing publishes at all and the deadlock it was written to
 * cut stayed shut — reachable only by a human remembering to dispatch fifteen
 * workflows by hand, one at a time, on the right ref.
 *
 * This is the other half. It answers, for one push to `development`:
 *
 *   "which packages changed, carry a prerelease version, are not already on the
 *    registry at that version, and have a publish workflow to run?"
 *
 * and emits a GitHub Actions matrix. `publish-next.yml` then DISPATCHES each
 * package's own existing `publish-<name>.yml` on the development ref rather than
 * reimplementing its build.
 *
 * WHY DISPATCH RATHER THAN A GENERIC BUILD JOB
 * ───────────────────────────────────────────────────────────────────────────
 * The fifteen publish workflows are not interchangeable. `page-builder` installs
 * filtered against its own lockfile because the root workspace pins a vite that
 * breaks plugin-react@6; `ui`, `schema-registry` and `page-builder` must build
 * their `workspace:` siblings before typechecking against them, because a linked
 * package with no dist/ reads to tsc as a missing module; several run tests, some
 * run a dry-run publish first, `theme` and `tsconfig` do neither.
 *
 * A generic prerelease job would have to restate all of that, and this repo has
 * already paid for that mistake in a neighbouring file: theme-conformance.yml and
 * scripts/theme-session.sh held the same app list twice, drifted, and the sweep
 * died twelve minutes in naming `playwright` rather than the missing entry. One
 * capability living in two files, with nothing asserting they agree, keeps
 * drifting. So the prerelease path RUNS THE RELEASE PATH — same steps, same
 * tests, same dry run — and differs only in the ref it runs on, which is the one
 * thing that is genuinely different.
 *
 * WHAT IT REFUSES TO DO
 * ───────────────────────────────────────────────────────────────────────────
 * A publishable package that changed, carries a prerelease version, and has NO
 * `publish-<name>.yml` is a HARD FAILURE, not a silent skip. A selector that
 * quietly drops the one package it cannot route is the shape this estate keeps
 * finding (#1966): the run is green, the fix never shipped, and nothing said so.
 *
 * Packages that changed but carry a RELEASE version are reported as warnings and
 * named. They publish nothing here — correct, since a release may only publish
 * from main — but staying silent about them is how a change reaches development,
 * reaches no preview host, and looks like it shipped.
 *
 * USAGE
 *   node scripts/select-prerelease-publishes.mjs --changed <file> [--json]
 *   node scripts/select-prerelease-publishes.mjs --all
 *   node scripts/select-prerelease-publishes.mjs --self-test
 *
 * `--changed` takes a file holding one changed path per line (git diff
 * --name-only), because an argv list of a few thousand paths overflows.
 * Writes `matrix=` and `count=` to $GITHUB_OUTPUT when it is set.
 */

import { readFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isPrerelease } from './publish-dist-tag.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * A package is PUBLISHABLE when it has a name and is not marked private.
 * `@bsuite/theme-codemod` is private and must never appear in a matrix; a
 * directory under packages/ with no package.json at all (a stray build output,
 * a half-created package) is not a package and is skipped without ceremony.
 */
export function readPackages(root = ROOT, fs = { readdirSync, existsSync, readFileSync }) {
  const dir = join(root, 'packages')
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const name of fs.readdirSync(dir).sort()) {
    const manifest = join(dir, name, 'package.json')
    if (!fs.existsSync(manifest)) continue
    let pkg
    try {
      pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'))
    } catch {
      // A package.json that does not parse is a real problem, but it is the
      // build's problem, not the selector's. Reporting it as "no packages
      // changed" would be the silent-skip defect, so surface it.
      out.push({ dir: name, name: null, version: null, private: false, unparseable: true })
      continue
    }
    if (!pkg.name) continue
    out.push({
      dir: name,
      name: pkg.name,
      version: typeof pkg.version === 'string' ? pkg.version : null,
      private: pkg.private === true,
      unparseable: false,
    })
  }
  return out
}

/** `packages/theme/src/css/vars.css` -> `theme`. Anything else -> null. */
export function packageDirOf(path) {
  const m = /^packages\/([^/]+)\//.exec(path)
  return m ? m[1] : null
}

/**
 * Pure decision, so --self-test exercises the real thing rather than a paraphrase.
 *
 * `published` is a Set of "name@version" strings already on the registry; the
 * caller supplies it so this stays testable without a network. An absent entry
 * means "not published", which is the normal state for a fresh prerelease.
 */
export function select({ packages, changedPaths, workflowExists, published = new Set() }) {
  const changedDirs = new Set()
  for (const p of changedPaths) {
    const d = packageDirOf(p)
    if (d) changedDirs.add(d)
  }

  const matrix = []
  const warnings = []
  const errors = []

  for (const pkg of packages) {
    if (!changedDirs.has(pkg.dir)) continue

    if (pkg.unparseable) {
      errors.push(`packages/${pkg.dir}/package.json changed and does not parse as JSON`)
      continue
    }
    if (pkg.private) continue
    if (!pkg.version) {
      errors.push(`${pkg.name} changed but declares no version`)
      continue
    }

    const workflow = `publish-${pkg.dir}.yml`

    if (!isPrerelease(pkg.version)) {
      warnings.push(
        `${pkg.name} changed at RELEASE version ${pkg.version} — nothing publishes from ` +
          `development, so this change reaches no preview host. Bump it to a ` +
          `-next.N prerelease to get it onto d.* before promotion, or leave it if it ` +
          `is meant to ship only through main.`,
      )
      continue
    }

    // The hard failure. A package we cannot route is not a package we skip.
    if (!workflowExists(workflow)) {
      errors.push(
        `${pkg.name} carries prerelease ${pkg.version} but .github/workflows/${workflow} ` +
          `does not exist, so this prerelease can never publish. Add the workflow, or the ` +
          `package will keep changing on development and silently reaching nobody.`,
      )
      continue
    }

    if (published.has(`${pkg.name}@${pkg.version}`)) {
      warnings.push(
        `${pkg.name}@${pkg.version} is already on the registry — skipping. Bump the ` +
          `prerelease counter (-next.N+1) to publish a new build.`,
      )
      continue
    }

    matrix.push({ package: pkg.name, dir: pkg.dir, version: pkg.version, workflow })
  }

  return { matrix, warnings, errors }
}

// ---------------------------------------------------------------------------
// Self-test — prove it can FAIL and can SKIP before believing it when it passes
// ---------------------------------------------------------------------------

function selfTest() {
  const pkgs = [
    { dir: 'theme', name: '@bsuite/theme', version: '1.1.1-next.0', private: false, unparseable: false },
    { dir: 'ui', name: '@bsuite/ui', version: '1.3.0', private: false, unparseable: false },
    { dir: 'theme-codemod', name: '@bsuite/theme-codemod', version: '1.0.0', private: true, unparseable: false },
    { dir: 'orphan', name: '@bsuite/orphan', version: '0.1.0-next.2', private: false, unparseable: false },
    { dir: 'broken', name: null, version: null, private: false, unparseable: true },
    { dir: 'unversioned', name: '@bsuite/unversioned', version: null, private: false, unparseable: false },
  ]
  const has = (w) => ['publish-theme.yml', 'publish-ui.yml'].includes(w)

  const cases = []
  const check = (label, actual, expected) => {
    const a = JSON.stringify(actual)
    const e = JSON.stringify(expected)
    cases.push([label, a === e, a, e])
  }

  let r = select({ packages: pkgs, changedPaths: ['packages/theme/src/css/vars.css'], workflowExists: has })
  check('a changed prerelease package is selected', r.matrix.map((m) => m.package), ['@bsuite/theme'])
  check('and reports no errors', r.errors, [])

  r = select({ packages: pkgs, changedPaths: ['packages/ui/src/index.ts'], workflowExists: has })
  check('a changed RELEASE package is not selected', r.matrix, [])
  check('but IS warned about, never silently dropped', r.warnings.length, 1)

  r = select({ packages: pkgs, changedPaths: ['packages/theme-codemod/src/x.ts'], workflowExists: has })
  check('a private package is never selected', r.matrix, [])
  check('and needs no warning — it is not publishable by design', r.warnings, [])

  r = select({ packages: pkgs, changedPaths: ['packages/orphan/src/x.ts'], workflowExists: has })
  check('a prerelease with NO publish workflow is a hard error', r.errors.length, 1)
  check('and is NOT quietly added to the matrix', r.matrix, [])

  r = select({ packages: pkgs, changedPaths: ['packages/broken/package.json'], workflowExists: has })
  check('an unparseable package.json is an error, not a skip', r.errors.length, 1)

  r = select({ packages: pkgs, changedPaths: ['packages/unversioned/src/x.ts'], workflowExists: has })
  check('a package with no version is an error, not a skip', r.errors.length, 1)

  r = select({
    packages: pkgs,
    changedPaths: ['packages/theme/src/css/vars.css'],
    workflowExists: has,
    published: new Set(['@bsuite/theme@1.1.1-next.0']),
  })
  check('an already-published prerelease is skipped', r.matrix, [])
  check('and says why, so a no-op is not read as a publish', r.warnings.length, 1)

  r = select({ packages: pkgs, changedPaths: ['docs/whatever.md', 'scripts/x.mjs'], workflowExists: has })
  check('a push touching no package selects nothing', r.matrix, [])
  check('and that is not an error', r.errors, [])

  r = select({ packages: pkgs, changedPaths: ['packages/theme/src/a', 'packages/orphan/src/b'], workflowExists: has })
  check('one bad package does not suppress a good one', r.matrix.map((m) => m.package), ['@bsuite/theme'])
  check('and the bad one still errors', r.errors.length, 1)

  // POSITIVE CONTROL against the REAL tree, not only hand-written fixtures.
  // A selector that only ever sees its author's fixtures cannot notice that the
  // real packages/ directory stopped looking the way it assumed.
  const real = readPackages()
  const publishable = real.filter((p) => !p.private && p.name)
  check('the real tree exposes packages at all', publishable.length > 0, true)
  const missingWorkflow = publishable.filter(
    (p) => !existsSync(join(ROOT, '.github/workflows', `publish-${p.dir}.yml`)),
  )
  // Not an assertion that every package HAS one — three legitimately do not.
  // The assertion is that we can still SEE the difference, i.e. the path
  // convention this selector depends on still resolves against the real repo.
  check(
    'the publish-<dir>.yml convention resolves against the real tree',
    publishable.length - missingWorkflow.length > 0,
    true,
  )

  const failed = cases.filter(([, ok]) => !ok)
  for (const [label, ok, a, e] of cases) {
    if (!ok) console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`)
  }
  if (failed.length) {
    console.error(`\nselect-prerelease-publishes --self-test: ${failed.length} of ${cases.length} FAILED`)
    return 1
  }
  console.log(
    `select-prerelease-publishes --self-test: ${cases.length} assertions across ` +
      `selection, release-version warning, private skip, missing-workflow refusal, ` +
      `unparseable and unversioned manifests, already-published skip, and a positive ` +
      `control against the real packages/ tree (${publishable.length} publishable, ` +
      `${missingWorkflow.length} intentionally without a publish workflow).`,
  )
  return 0
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}

async function publishedVersions(packages) {
  // One registry read per candidate. A failure here must NOT be read as "not
  // published" — that would republish a version that exists, or rather fail the
  // publish later with a confusing 403. Fail closed instead.
  const out = new Set()
  for (const p of packages) {
    const url = `https://registry.npmjs.org/${p.name.replace('/', '%2f')}`
    const res = await fetch(url, { headers: { accept: 'application/json' } })
    if (res.status === 404) continue // never published: nothing to skip
    if (!res.ok) throw new Error(`registry read for ${p.name} returned ${res.status} — refusing to guess`)
    const doc = await res.json()
    for (const v of Object.keys(doc.versions ?? {})) out.add(`${p.name}@${v}`)
  }
  return out
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest()

  const packages = readPackages()
  let changedPaths
  if (process.argv.includes('--all')) {
    changedPaths = packages.map((p) => `packages/${p.dir}/package.json`)
  } else {
    const file = arg('--changed')
    if (!file) {
      console.error('usage: select-prerelease-publishes.mjs --changed <file> | --all | --self-test')
      return 2
    }
    changedPaths = readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
  }

  const workflowExists = (w) => existsSync(join(ROOT, '.github/workflows', w))

  // Candidates first, so the registry is only read for packages that could publish.
  const dry = select({ packages, changedPaths, workflowExists })
  let published = new Set()
  if (dry.matrix.length) {
    published = await publishedVersions(dry.matrix.map((m) => ({ name: m.package })))
  }
  const { matrix, warnings, errors } = select({ packages, changedPaths, workflowExists, published })

  for (const w of warnings) console.log(`::warning::${w}`)
  for (const e of errors) console.log(`::error::${e}`)

  const summary = [
    `select-prerelease-publishes: ${changedPaths.length} changed path(s); ` +
      `${packages.length} package(s) in tree; ${matrix.length} prerelease publish(es) selected` +
      (warnings.length ? `, ${warnings.length} warning(s)` : '') +
      (errors.length ? `, ${errors.length} ERROR(S)` : '') + '.',
    ...matrix.map((m) => `  → ${m.package}@${m.version} via ${m.workflow}`),
  ].join('\n')
  console.log(summary)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify(matrix)}\n`)
    appendFileSync(process.env.GITHUB_OUTPUT, `count=${matrix.length}\n`)
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + summary + '\n```\n')
  }

  return errors.length ? 1 : 0
}

main().then((c) => process.exit(c)).catch((e) => {
  console.error(`::error::select-prerelease-publishes failed: ${e.message}`)
  process.exit(2)
})
