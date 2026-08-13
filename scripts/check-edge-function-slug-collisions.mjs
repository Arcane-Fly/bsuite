#!/usr/bin/env node
/**
 * check-edge-function-slug-collisions.mjs
 *
 * bsuite#1943: every scope in this monorepo — the parent's own
 * `supabase/functions/` plus all six submodules (crm7, R80.4, braden,
 * business-suite-unified, conduit, throughput) — deploys its edge functions
 * to the SAME Supabase project. `.github/workflows/supabase-functions-deploy.yml`
 * passes `--project-ref "$SUPABASE_PROJECT_ID"` for EVERY scope in its matrix:
 *
 *   supabase functions deploy "$fn_name" --project-ref "$SUPABASE_PROJECT_ID" $DEPLOY_FLAGS
 *
 * A Supabase function slug is unique per project. So when two scopes declare a
 * directory of the same name under `supabase/functions/`, they are not two
 * functions — they are one live artifact, and its contents are whichever scope
 * deployed most recently. There is no error, no warning, and no record: the
 * losing repo simply believes its own source is running when it is not.
 *
 * Confirmed real, not theoretical. Four slugs were declared in both crm7 and
 * business-suite-unified:
 *
 *   tga-search · generate-document · oauth-google-email · oauth-microsoft-email
 *
 * The two scopes overwrote each other repeatedly (crm7's scope ran
 * 2026-08-11T10:23:03Z, BSU's ran 2026-08-11T10:59:42Z the same morning). The
 * live consequence measured on 2026-08-12: the deployed `tga-search` was BSU's
 * copy, which does not verify the caller's JWT signature, so a garbage bearer
 * token returned HTTP 200 with data — while crm7, the only repo that actually
 * calls the function, had shipped a JWKS-verifying version it believed was live.
 *
 * WHY THERE IS NO ALLOWLIST
 * -------------------------
 * The sibling gate `check-migration-version-collisions.mjs` carries an
 * allowlist, because two migrations CAN legitimately share a timestamp by
 * coincidence and still both be correct. That reasoning does not transfer.
 * Two scopes declaring one slug is never benign: the deploy order decides
 * which source runs, and deploy order is not a contract anyone can express.
 * An allowlist here would be an escape hatch for exactly the defect the gate
 * exists to make impossible, so this checker deliberately has none. A genuine
 * two-owner need is resolved by giving each owner its OWN slug (conduit's
 * `r7-` prefix is the established in-estate precedent), not by exempting the
 * collision.
 *
 * WHY THIS READS DIRECTORIES, NOT FILE CONTENT
 * --------------------------------------------
 * The slug is the directory name — that is precisely what the deploy loop
 * passes to `supabase functions deploy`. Scanning directory entries (rather
 * than grepping sources for slug strings) means the gate cannot be tripped by
 * a slug named in a comment, a doc, a test fixture, or a rate-limit path
 * allowlist, and cannot be satisfied by prose either. Self-test cases 6 and 7
 * below assert both halves of that property.
 *
 * Usage:
 *   node scripts/check-edge-function-slug-collisions.mjs [--root=<path>] [--require-scopes=<n>]
 *   node scripts/check-edge-function-slug-collisions.mjs --self-test
 *
 * Exit 0 clean, 1 violations, 2 usage error.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/**
 * Every scope the deploy workflow can deploy functions for. Matches the
 * 7-entry choice list + matrix in .github/workflows/supabase-functions-deploy.yml
 * exactly ("root" plus the six submodules). All of them are deployed with the
 * same --project-ref, so a slug collision in ANY pair of them is a live
 * last-deploy-wins overwrite.
 */
const SCOPES = [
  { name: 'root', dir: 'supabase/functions' },
  { name: 'crm7', dir: 'crm7/supabase/functions' },
  { name: 'R80.4', dir: 'R80.4/supabase/functions' },
  { name: 'braden', dir: 'braden/supabase/functions' },
  { name: 'business-suite-unified', dir: 'business-suite-unified/supabase/functions' },
  { name: 'conduit', dir: 'conduit/supabase/functions' },
  { name: 'throughput', dir: 'throughput/supabase/functions' },
]

/**
 * True for directories the deploy loop skips rather than deploys. Mirrors the
 * workflow's own rule verbatim:
 *
 *   if [[ "$fn_name" == _* ]]; then ... continue; fi
 *
 * `_shared` exists in several scopes by design — it is a module directory, not
 * a function, and is never a slug. Flagging it would make the gate cry wolf on
 * every run and train people to ignore it.
 */
function isSharedModuleDir(name) {
  return name.startsWith('_')
}

/**
 * List every deployable function slug across the given scopes, resolved under
 * `root`. Only DIRECTORIES count — the deploy loop iterates `"$FUNCTIONS_DIR"/*​/`
 * and additionally guards with `[ -d "$fn_dir" ] || continue`, so a stray file
 * sitting in supabase/functions/ is never deployed and must never be reported.
 */
function scanScopes(scopes, root) {
  const declarations = []
  for (const scope of scopes) {
    const dirPath = path.join(root, scope.dir)
    if (!fs.existsSync(dirPath)) continue
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (isSharedModuleDir(entry.name)) continue
      declarations.push({
        scope: scope.name,
        slug: entry.name,
        dir: path.join(scope.dir, entry.name),
      })
    }
  }
  return declarations
}

/** Group declarations by slug; a slug claimed by 2+ scopes is a collision. */
function findCollisions(declarations) {
  const groups = new Map()
  for (const d of declarations) {
    if (!groups.has(d.slug)) groups.set(d.slug, [])
    groups.get(d.slug).push(d)
  }
  const collisions = []
  for (const [slug, entries] of groups) {
    const scopes = new Set(entries.map((e) => e.scope))
    if (scopes.size > 1) collisions.push({ slug, entries })
  }
  collisions.sort((a, b) => a.slug.localeCompare(b.slug))
  return collisions
}

function describeCollision({ slug, entries }) {
  const where = entries.map((e) => `${e.scope} (${e.dir})`).join(' and ')
  return (
    `"${slug}" is declared by ${entries.length} scopes: ${where}. ` +
    `All scopes deploy to one Supabase project, so only ONE of these is ever ` +
    `live — whichever deployed most recently — and the other repo's source is ` +
    `silently not running.`
  )
}

function runCheck({ declarations }) {
  return { violations: findCollisions(declarations) }
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function withTempScopes(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slugcollision-selftest-'))
  try {
    return fn(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function writeFunctionDir(root, scopeDir, slug, content = 'Deno.serve(() => new Response("ok"))\n') {
  const dir = path.join(root, scopeDir, slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.ts'), content)
}

function writeLooseFile(root, scopeDir, filename, content = '') {
  const dir = path.join(root, scopeDir)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, filename), content)
}

function selfTest() {
  const cases = []

  // 1. Distinct slugs across distinct scopes: clean.
  cases.push([
    'distinct slugs across scopes pass',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', 'alpha')
        writeFunctionDir(root, 'conduit/supabase/functions', 'beta')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return violations.length === 0
      }),
  ])

  // 2. THE DEFECT. One slug in two scopes must fail. This is the case that
  //    reproduces bsuite#1943 — if this ever passes, the gate is disarmed.
  cases.push([
    'same slug in two scopes FAILS',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', 'tga-search')
        writeFunctionDir(root, 'business-suite-unified/supabase/functions', 'tga-search')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return (
          violations.length === 1 &&
          violations[0].slug === 'tga-search' &&
          violations[0].entries.length === 2
        )
      }),
  ])

  // 3. Three-way collision reports all three, not just the first pair.
  cases.push([
    'three-way collision reports all three scopes',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', 'shared-name')
        writeFunctionDir(root, 'business-suite-unified/supabase/functions', 'shared-name')
        writeFunctionDir(root, 'supabase/functions', 'shared-name')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return violations.length === 1 && violations[0].entries.length === 3
      }),
  ])

  // 4. `_shared` in every scope is a module dir, never a slug — must NOT fire.
  //    The deploy loop skips `_*`, so flagging it would be a false positive on
  //    literally every run.
  cases.push([
    '_shared in multiple scopes is not a collision',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', '_shared')
        writeFunctionDir(root, 'business-suite-unified/supabase/functions', '_shared')
        writeFunctionDir(root, 'braden/supabase/functions', '_shared')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return violations.length === 0
      }),
  ])

  // 5. Positive control on the skip rule itself: proving `_shared` is ignored
  //    is only meaningful if a NON-underscore slug in those same scopes DOES
  //    fire. Otherwise case 4 would also pass on a checker that scanned nothing.
  cases.push([
    'skip rule is narrow — a real slug beside _shared still fires',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', '_shared')
        writeFunctionDir(root, 'business-suite-unified/supabase/functions', '_shared')
        writeFunctionDir(root, 'crm7/supabase/functions', 'real-slug')
        writeFunctionDir(root, 'business-suite-unified/supabase/functions', 'real-slug')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return violations.length === 1 && violations[0].slug === 'real-slug'
      }),
  ])

  // 6. ANTI-PROSE. A slug named in FILE CONTENT — a comment, a doc, a
  //    rate-limit path allowlist — must not trip the gate. BSU really does
  //    list '/functions/v1/tga-search' in src/pages/Developer/RateLimits.tsx
  //    without owning the function, and that must stay legal.
  cases.push([
    'a slug mentioned only in file CONTENT does not trigger',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', 'tga-search')
        writeFunctionDir(
          root,
          'business-suite-unified/supabase/functions',
          'unrelated',
          '// calls tga-search and generate-document via /functions/v1/tga-search\n',
        )
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return violations.length === 0
      }),
  ])

  // 7. ANTI-PROSE, other half: a loose FILE named like a colliding slug is not
  //    a declaration either — the deploy loop only iterates directories.
  cases.push([
    'a loose file named like a slug is not a declaration',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', 'tga-search')
        writeLooseFile(root, 'business-suite-unified/supabase/functions', 'tga-search', 'not a dir')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return violations.length === 0
      }),
  ])

  // 8. Two same-named dirs cannot exist in ONE scope (the filesystem forbids
  //    it), so a slug repeated within a single scope is impossible by
  //    construction — assert the checker treats a single scope as clean rather
  //    than double-counting a nested directory.
  cases.push([
    'nested subdirectories inside a function dir are not extra slugs',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', 'alpha')
        fs.mkdirSync(path.join(root, 'crm7/supabase/functions/alpha/helpers'), { recursive: true })
        writeFunctionDir(root, 'business-suite-unified/supabase/functions', 'helpers')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        return violations.length === 0
      }),
  ])

  // 9. The scope list must cover every scope the deploy workflow can target.
  //    If someone adds a scope to the workflow matrix and not here, the gate
  //    goes half-blind — silently.
  cases.push([
    'scope list covers all seven deployable scopes',
    () =>
      SCOPES.length === 7 &&
      ['root', 'crm7', 'R80.4', 'braden', 'business-suite-unified', 'conduit', 'throughput'].every(
        (n) => SCOPES.some((s) => s.name === n),
      ),
  ])

  // 10. The failure message must name both scopes and say the source is not
  //     running — an operator reading CI output should not need this file.
  cases.push([
    'failure message names both scopes',
    () =>
      withTempScopes((root) => {
        writeFunctionDir(root, 'crm7/supabase/functions', 'dup')
        writeFunctionDir(root, 'conduit/supabase/functions', 'dup')
        const { violations } = runCheck({ declarations: scanScopes(SCOPES, root) })
        if (violations.length !== 1) return false
        const msg = describeCollision(violations[0])
        return msg.includes('crm7') && msg.includes('conduit') && msg.includes('"dup"')
      }),
  ])

  let fail = 0
  cases.forEach(([name, run], n) => {
    let ok = false
    let err = null
    try {
      ok = run()
    } catch (e) {
      err = e
    }
    if (!ok) {
      fail++
      console.error(`self-test ${n} (${name}) FAILED${err ? `: ${err.stack || err}` : ''}`)
    }
  })
  if (fail) {
    console.error(`check-edge-function-slug-collisions: ${fail}/${cases.length} self-test failure(s)`)
    process.exit(1)
  }
  console.log(`check-edge-function-slug-collisions: self-test OK (${cases.length} cases)`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usageError(msg) {
  console.error(`check-edge-function-slug-collisions: ${msg}`)
  console.error(
    'Usage: node scripts/check-edge-function-slug-collisions.mjs [--root=<path>] [--require-scopes=<n>] | --self-test',
  )
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) selfTest()

let rootArg = '.'
let requireScopes = 0
for (const a of args) {
  if (a.startsWith('--root=')) {
    rootArg = a.slice('--root='.length)
  } else if (a.startsWith('--require-scopes=')) {
    requireScopes = Number(a.slice('--require-scopes='.length))
    if (!Number.isInteger(requireScopes) || requireScopes < 0) {
      usageError(`--require-scopes must be a non-negative integer, got "${a}"`)
    }
  } else if (a.startsWith('-')) {
    usageError(`unknown flag "${a}"`)
  } else {
    usageError(`unexpected positional argument "${a}"`)
  }
}

const root = path.resolve(rootArg)
if (!fs.existsSync(root)) usageError(`--root path does not exist: ${root}`)

const declarations = scanScopes(SCOPES, root)

// A gate that reports OK when it scanned nothing is not a gate.
//
// In CI this runs after `actions/checkout` with `submodules: recursive`. If the
// token cannot clone the private sibling repos, checkout leaves the submodule
// directories EMPTY — the scan then finds zero function dirs, prints OK, and
// disarms itself. Same failure mode the migration-collision gate guards against
// with the same flag; the collision this gate exists to catch is BETWEEN
// submodules, so an unchecked-out submodule makes a pass meaningless by
// definition, not merely incomplete.
const scopesFound = new Set(declarations.map((d) => d.scope))
if (requireScopes > 0 && scopesFound.size < requireScopes) {
  console.error(
    `check-edge-function-slug-collisions: expected edge functions in at least ` +
      `${requireScopes} scope(s) but found ${scopesFound.size} ` +
      `(${[...scopesFound].join(', ') || 'none'}).\n` +
      `Submodules are probably not checked out — verify the checkout token can ` +
      `clone the private sibling repos. Refusing to report OK on an unscanned tree.`,
  )
  process.exit(1)
}

if (declarations.length === 0) {
  if (requireScopes > 0) {
    console.error(
      'check-edge-function-slug-collisions: no edge functions found at all, but ' +
        `--require-scopes=${requireScopes} was requested. Refusing to pass.`,
    )
    process.exit(1)
  }
  console.log('check-edge-function-slug-collisions: no edge functions found — OK')
  process.exit(0)
}

const { violations } = runCheck({ declarations })

if (violations.length) {
  console.error(
    'Edge function slug collision check FAILED:\n' +
      violations.map((c) => `  - ${describeCollision(c)}`).join('\n'),
  )
  console.error(
    `\nEvery scope deploys with the same --project-ref (see ` +
      `.github/workflows/supabase-functions-deploy.yml), and a Supabase function ` +
      `slug is unique per project. Two scopes declaring one slug is therefore one ` +
      `function with two competing sources, resolved by deploy order.\n\n` +
      `Fix by giving the slug ONE owner:\n` +
      `  - if only one repo actually calls it, delete the other repo's copy; or\n` +
      `  - if both genuinely need it, rename one to an app-scoped slug (conduit's\n` +
      `    r7-* functions are the in-estate precedent) and update that repo's callers.\n\n` +
      `There is deliberately no allowlist — see the header of ` +
      `scripts/check-edge-function-slug-collisions.mjs for why (bsuite#1943).`,
  )
  process.exit(1)
}

console.log(
  `check-edge-function-slug-collisions: OK — ${declarations.length} function slug(s) ` +
    `across ${scopesFound.size} scope(s) (${[...scopesFound].sort().join(', ')}), no collisions.`,
)
process.exit(0)
