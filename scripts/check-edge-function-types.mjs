#!/usr/bin/env node
/**
 * Type-check every Supabase edge function in the estate.
 *
 * WHY THIS EXISTS — bsuite register P0-8a, 2026-08-16.
 *
 * `get-fairwork-api-key` shipped to production containing:
 *
 *     const supabaseClient = createClient(
 *       supabaseUrl,                                   // never declared
 *       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
 *     );
 *
 * `supabaseUrl` is not declared anywhere in that module. Every invocation threw
 * ReferenceError, the outer catch fired, and the catch returned the Fair Work API
 * key from the environment — so the error path WAS the only path, and it served a
 * paid secret to any authenticated user of any tenant. It ran that way for months.
 *
 * Nothing caught it because NOTHING TYPECHECKS EDGE FUNCTIONS. They are Deno,
 * outside every app's `tsc`; `supabase functions deploy` bundles without checking;
 * no workflow ran `deno check`. This is the estate's second recorded instance of
 * the class — four crm7 functions previously reached production with undeclared
 * names.
 *
 * A single `deno check` would have failed the build on that line.
 *
 * WHAT THIS DOES NOT DO. It type-checks; it does not reason about authorization.
 * `get-fairwork-api-key` would ALSO have needed a human to notice that returning a
 * shared secret to any logged-in caller is wrong by design — a type checker has no
 * opinion about that. Two of the register's findings (33 of 74 functions running
 * `verify_jwt=false`; the vault-reader class) are authz defects this gate cannot
 * see. Do not let a green run here read as "the edge functions are safe".
 *
 * Usage:
 *   node scripts/check-edge-function-types.mjs            # all repos
 *   node scripts/check-edge-function-types.mjs --repo crm7
 *   node scripts/check-edge-function-types.mjs --self-test # prove the gate bites
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const REPOS = ['crm7', 'business-suite-unified', 'conduit', 'throughput', 'braden', 'R80.4', '.']

/** Directories that are not deployable functions. */
const SKIP = new Set(['_shared', 'tests', '__tests__', 'node_modules'])

function discover(repo) {
  const base = join(repo, 'supabase', 'functions')
  if (!existsSync(base)) return []
  const out = []
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP.has(entry.name)) continue
    const idx = join(base, entry.name, 'index.ts')
    if (!existsSync(idx)) continue
    // A function may ship its own deno.json import map (classify-issue maps
    // "zod" -> npm:zod@4). Without --config those bare specifiers are
    // unresolvable and `deno check` reports TS2307 — an INSTRUMENT failure that
    // looks exactly like a real defect. This diverged local from CI: locally a
    // stray resolution made it pass, in CI it did not, so the baseline captured
    // 18 and CI measured 19. Honour the function's own config.
    const cfg = ['deno.json', 'deno.jsonc']
      .map((f) => join(base, entry.name, f))
      .find((f) => existsSync(f))
    out.push({ repo, slug: entry.name, path: idx, config: cfg ?? null })
  }
  return out
}

function checkOne(fnPath, config = null) {
  try {
    // --node-modules-dir=auto is REQUIRED, not cosmetic: without it every function
    // importing `npm:@supabase/supabase-js` fails with "Could not find a matching
    // package", which is an instrument failure that looks exactly like a real type
    // error and would bury the genuine findings in noise.
    const argv = ['check', '--no-lock', '--quiet', '--node-modules-dir=auto']
    if (config) argv.push('--config', config)
    argv.push(fnPath)
    execFileSync('deno', argv, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 120_000,
    })
    return { ok: true }
  } catch (err) {
    const text = `${err.stderr ?? ''}${err.stdout ?? ''}`.trim()
    return { ok: false, output: text }
  }
}

/**
 * A gate that cannot fail is not a gate. This synthesises the EXACT defect that
 * motivated the script — a reference to an undeclared identifier — and asserts
 * `deno check` rejects it. If this passes, the gate is inert and the run aborts
 * rather than reporting a clean sweep it did not earn.
 */
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'edgefn-selftest-'))
  const good = join(dir, 'good.ts')
  const bad = join(dir, 'bad.ts')
  writeFileSync(good, `const url = "https://example.test";\nexport const handler = () => url;\n`)
  // The real shape: an identifier that was never declared.
  writeFileSync(bad, `export const handler = () => neverDeclaredIdentifier;\n`)

  const goodRes = checkOne(good)
  const badRes = checkOne(bad)
  rmSync(dir, { recursive: true, force: true })

  if (!goodRes.ok) {
    console.error('[edge-fn-types] SELF-TEST FAILED: a valid file did not pass `deno check`.')
    console.error(goodRes.output)
    return false
  }
  if (badRes.ok) {
    console.error('[edge-fn-types] SELF-TEST FAILED: an undeclared identifier PASSED `deno check`.')
    console.error('  The gate is inert — it would report a clean sweep over the exact defect it exists to catch.')
    return false
  }
  return true
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) {
  const ok = selfTest()
  console.log(ok
    ? '[edge-fn-types] self-test OK — the gate rejects an undeclared identifier and accepts a valid file.'
    : '[edge-fn-types] self-test FAILED.')
  process.exit(ok ? 0 : 1)
}

if (!selfTest()) {
  console.error('[edge-fn-types] refusing to report results from a gate that cannot fail.')
  process.exit(2)
}

const only = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : null
const repos = only ? [only] : REPOS
const fns = repos.flatMap(discover)

if (fns.length === 0) {
  // An empty sweep reading as PASS is how a guard silently dies on a rename.
  console.error(`[edge-fn-types] CANNOT REPORT: discovered 0 edge functions under ${repos.join(', ')}.`)
  console.error('  Either the layout moved or a submodule is uninitialised. Not treating this as a pass.')
  process.exit(2)
}

const failures = []
for (const fn of fns) {
  const res = checkOne(fn.path, fn.config)
  if (!res.ok) failures.push({ ...fn, output: res.output })
}

const scanned = fns.length
const failing = failures.map((f) => `${f.repo}/${f.slug}`).sort()

/**
 * SHRINKING RATCHET, not a clean-or-fail gate. 18 of 64 functions already fail —
 * blocking every PR on all 18 would get this guard disabled within a day, which
 * is how a control ends up reporting PASS over a real defect. Pre-existing debt
 * is baselined; the set may SHRINK and may never GROW.
 */
const BASELINE_PATH = 'scripts/edge-function-typecheck-baseline.json'
let baseline = null
if (existsSync(BASELINE_PATH)) {
  try { baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).failing ?? [] } catch { baseline = null }
}

if (args.includes('--update')) {
  if (only) {
    console.error('[edge-fn-types] refusing to --update from a --repo run: it would drop every other repo from the baseline.')
    process.exit(2)
  }
  writeFileSync(BASELINE_PATH, JSON.stringify({ failing }, null, 2) + '\n')
  console.log(`[edge-fn-types] baseline written: ${failing.length} failing of ${scanned} scanned.`)
  process.exit(0)
}

// A --repo run scans a SUBSET, so it must compare against the matching subset of
// the baseline. Comparing 4 scanned functions to an 18-entry estate baseline would
// report every other repo's known failure as "now fixed" and, with --update, would
// erase them from the baseline entirely — turning a scoped convenience run into
// silent debt amnesia.
if (only && Array.isArray(baseline)) {
  baseline = baseline.filter((k) => k.startsWith(`${only}/`))
}

if (baseline === null) {
  console.error(`[edge-fn-types] CANNOT REPORT: ${BASELINE_PATH} missing or unreadable.`)
  console.error('  Refusing to pass by default. Create it with --update.')
  process.exit(2)
}

const known = new Set(baseline)
const regressions = failing.filter((k) => !known.has(k))
const fixed = baseline.filter((k) => !failing.includes(k))

for (const f of failures.filter((f) => regressions.includes(`${f.repo}/${f.slug}`))) {
  console.error(`  ── NEW FAILURE: ${f.repo}/${f.slug}`)
  for (const line of f.output.split('\n').slice(0, 12)) console.error(`     ${line}`)
  console.error('')
}

if (fixed.length) {
  console.log(`[edge-fn-types] ${fixed.length} function(s) now pass and are still baselined — run --update to ratchet down: ${fixed.join(', ')}`)
}

if (regressions.length) {
  console.error(`[edge-fn-types] ${regressions.length} NEW type-check failure(s) — baseline was ${baseline.length}, now ${failing.length}.`)
  console.error('An undeclared identifier here does not fail the deploy — it throws at runtime,')
  console.error('where a catch block may turn it into a 200 with a secret in the body (P0-8a).')
  process.exit(1)
}

console.log(`[edge-fn-types] OK — ${scanned} function(s) checked, ${failing.length} failing (baseline ${baseline.length}), 0 new.`)
process.exit(0)
