#!/usr/bin/env node
/**
 * A mutation that ends in `.single()` reports an RLS denial as "not found".
 *
 * PostgREST treats a zero-row UPDATE or DELETE as SUCCESS — 204, or 200 with an
 * empty array — because row-level security filters rows out BEFORE they are
 * counted. Nothing errors, so nothing is logged. Chaining `.single()` turns that
 * into PGRST116 "Cannot coerce the result to a single JSON object", which every
 * caller surfaces as a MISSING RECORD.
 *
 * That is how FutureBuild Academy's eight placements loaded correctly and
 * refused to save with no diagnosable error anywhere (2026-08-24). The rows were
 * readable; `tenant_update_placements` denied the write; the app said "not
 * found". See src/lib/noRowsAffected.ts in crm7 for the correct shape.
 *
 * This guard is a RATCHET: the count may fall, never rise. It does not attempt
 * to fix anything — it makes the remaining instances countable so they cannot be
 * quietly forgotten, and it fails a build that adds a new one.
 *
 *   node scripts/check-silent-zero-row-writes.mjs           # check against baseline
 *   node scripts/check-silent-zero-row-writes.mjs --list    # every remaining site
 *   node scripts/check-silent-zero-row-writes.mjs --update  # lower the baseline
 *   node scripts/check-silent-zero-row-writes.mjs --selftest
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = join(ROOT, 'scripts', 'silent-zero-row-writes-baseline.json')
const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']

/**
 * A service-role client bypasses RLS entirely, so a zero-row write there really
 * does mean the row is absent. Only user-JWT writers can misreport a denial.
 */
const SERVICE_ROLE = /SERVICE_ROLE|service_role|createServiceClient|supabaseAdmin|createAdminClient/

/**
 * Matches `.update(` or `.delete(` followed, within one statement, by
 * `.single()`. Stops at `;` so it cannot run past the end of the chain and
 * pair an update with some later, unrelated `.single()`.
 */
const MUTATION_SINGLE = /\.(update|delete)\s*\([^;]{0,600}?\.single\s*\(\s*\)/gs

export function findSites(source) {
  if (SERVICE_ROLE.test(source)) return 0
  return [...source.matchAll(MUTATION_SINGLE)].length
}

function sourceFiles() {
  const out = []
  for (const app of APPS) {
    const dir = join(ROOT, app, 'src')
    if (!existsSync(dir)) continue
    let listed = ''
    try {
      listed = execFileSync('git', ['-C', join(ROOT, app), 'ls-files', 'src'], {
        encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      })
    } catch {
      continue
    }
    for (const rel of listed.split('\n')) {
      if (!/\.(ts|tsx)$/.test(rel)) continue
      if (/\.(test|spec)\.[tj]sx?$/.test(rel) || rel.includes('__tests__')) continue
      out.push({ app, rel, abs: join(ROOT, app, rel) })
    }
  }
  return out
}

function scan() {
  const sites = []
  for (const f of sourceFiles()) {
    let src
    try { src = readFileSync(f.abs, 'utf8') } catch { continue }
    const n = findSites(src)
    if (n > 0) sites.push({ path: `${f.app}/${f.rel}`, count: n })
  }
  sites.sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
  return sites
}

function selftest() {
  const cases = [
    ['bare update+single is a site',
     `await supabase.from('t').update(x).eq('id',i).select().single();`, 1],
    ['delete+single is a site too',
     `await supabase.from('t').delete().eq('id',i).select().single();`, 1],
    ['the corrected shape is NOT a site',
     `const r = await supabase.from('t').update(x).eq('id',i).select();\nif (!r.data?.length) throw new Error('x');`, 0],
    ['a SELECT ending in single() is not a mutation',
     `await supabase.from('t').select('*').eq('id',i).single();`, 0],
    ['service-role files are exempt wholesale',
     `const c = createServiceClient();\nawait c.from('t').update(x).eq('id',i).select().single();`, 0],
    ['two sites in one file both count',
     `await s.from('a').update(x).select().single();\nawait s.from('b').update(y).select().single();`, 2],
    ['a later unrelated single() does not pair with an earlier update',
     `await s.from('a').update(x);\nawait s.from('b').select('*').single();`, 0],
    ['maybeSingle is not single',
     `await s.from('t').update(x).eq('id',i).select().maybeSingle();`, 0],
    ['multi-line chains still match',
     `await supabase\n  .from('t')\n  .update(x)\n  .eq('id', i)\n  .select()\n  .single();`, 1],
    ['an update with no single() is clean',
     `await supabase.from('t').update(x).eq('id',i).select();`, 0],
  ]
  let failed = 0
  for (const [name, src, want] of cases) {
    const got = findSites(src)
    if (got !== want) { console.error(`  FAIL ${name}: want ${want}, got ${got}`); failed++ }
    else console.log(`  ok   ${name}`)
  }
  console.log(failed === 0 ? `\n${cases.length} self-tests passed` : `\n${failed} self-test(s) FAILED`)
  return failed === 0 ? 0 : 1
}

const argv = process.argv.slice(2)
if (argv.includes('--selftest')) process.exit(selftest())

/**
 * An uninitialised submodule is an empty directory. Without this, the scan finds
 * nothing, reports a fall to zero, and a `--update` would bank that as the new
 * baseline — permanently disarming the guard. A checker that cannot tell
 * "scanned nothing" from "found nothing" is not a checker.
 */
function requireSubmodulesPresent() {
  const present = APPS.filter((a) => existsSync(join(ROOT, a, 'src')))
  const scanned = sourceFiles().length
  if (present.length < 2 || scanned < 200) {
    console.error(
      `\nRefusing to report: only ${present.length} app tree(s) and ${scanned} source ` +
      `file(s) are present.\nThe submodules are not checked out — run ` +
      `\`git submodule update --init --recursive\` first.\n`)
    process.exit(2)
  }
}

requireSubmodulesPresent()
const sites = scan()
const total = sites.reduce((n, s) => n + s.count, 0)

if (argv.includes('--list')) {
  for (const s of sites) console.log(`  ${String(s.count).padStart(2)}  ${s.path}`)
  console.log(`\n  ${total} site(s) across ${sites.length} file(s)`)
  process.exit(0)
}

if (argv.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify({ total, files: sites.length, sites }, null, 2)}\n`)
  console.log(`baseline set to ${total} site(s) across ${sites.length} file(s)`)
  process.exit(0)
}

if (!existsSync(BASELINE)) {
  console.error(`No baseline at ${BASELINE}. Run with --update to create one.`)
  process.exit(1)
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))

if (total > baseline.total) {
  console.error(
    `\nSilent zero-row writes ROSE: ${baseline.total} -> ${total}.\n\n` +
    `A mutation ending in .single() reports an RLS denial as "not found".\n` +
    `Use the shape in crm7/src/lib/noRowsAffected.ts: drop .single(), then\n` +
    `treat an empty result as NoRowsAffectedError.\n\n` +
    `Run --list to see every site.\n`)
  process.exit(1)
}
if (total < baseline.total) {
  console.log(
    `Silent zero-row writes FELL: ${baseline.total} -> ${total}. ` +
    `Run --update to bank it.`)
  process.exit(0)
}
console.log(`Silent zero-row writes held at ${total} across ${sites.length} file(s).`)
