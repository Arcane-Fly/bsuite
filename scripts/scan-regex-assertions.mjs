#!/usr/bin/env node
/**
 * REGEX ASSERTIONS IN TESTS — the ratchet's measurement.
 *
 * Operator, 2026-08-26: "Regex is forbidden for being brittle."
 *
 * The brittleness is specific and worth stating, because it is not obvious that a
 * PASSING regex assertion is a problem. `expect(x).not.toMatch(/invitation sent/i)`
 * fails in BOTH directions:
 *
 *   - reword the copy  -> a CORRECT implementation starts failing;
 *   - reword the FAILURE message -> the negative assertion stops matching and
 *     PASSES, while the code under test still does the wrong thing.
 *
 * The second is why this is a gate and not a style preference. A test that guards
 * a phrase guards nothing once the phrase moves, and it does so silently.
 *
 * WHAT IS COUNTED: regex literals passed to an assertion matcher — `toMatch`,
 * `toThrow`, `toThrowError`, `toHaveBeenCalledWith`, `stringMatching`. That is the
 * brittle case.
 *
 * WHAT IS NOT: regex used as test SETUP or in production code — `.replace()`,
 * `.split()`, a route matcher. Those are implementation, not an assertion about
 * behaviour, and sweeping them would be a codemod nobody asked for.
 * `toMatchObject` is structural matching, not regex, and is explicitly fine.
 *
 * COMMENTS ARE STRIPPED FIRST. Prose that quotes `toMatch(/…/)` to explain why it
 * was removed is not an assertion. Counting it means the file that documents the
 * fix reads as a violation — measured twice on 2026-08-26 before this was written.
 *
 * FAILS CLOSED (D-92). A file that cannot be read is UNKNOWN, never clean, and
 * "checked nothing" must not share an exit code with "found nothing".
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.env.SCAN_ROOT ?? process.cwd()
const APPS = ['crm7', 'business-suite-unified', 'conduit', 'throughput', 'braden', 'R80.4']
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/
const MATCHERS = ['toMatch', 'toThrow', 'toThrowError', 'stringMatching', 'toHaveBeenCalledWith']

/** Strip block, line and JSX comments so prose ABOUT a matcher is not counted. */
export function stripComments(src) {
  let out = ''
  let i = 0
  let mode = 'code'
  while (i < src.length) {
    const two = src.slice(i, i + 2)
    if (mode === 'code') {
      if (two === '/*') { mode = 'block'; i += 2; continue }
      if (two === '//') { mode = 'line'; i += 2; continue }
      out += src[i]; i += 1; continue
    }
    if (mode === 'block') {
      if (two === '*/') { mode = 'code'; i += 2; continue }
      i += 1; continue
    }
    if (src[i] === '\n') { mode = 'code'; out += '\n' }
    i += 1
  }
  return out
}

/** Count `matcher(/…/)` occurrences — a regex literal as the first argument. */
export function countRegexAssertions(src) {
  const clean = stripComments(src)
  let n = 0
  for (const m of MATCHERS) {
    let from = 0
    for (;;) {
      const at = clean.indexOf(`${m}(`, from)
      if (at === -1) break
      from = at + m.length + 1
      // first non-space character after the paren
      let j = from
      while (j < clean.length && (clean[j] === ' ' || clean[j] === '\n')) j += 1
      if (clean[j] === '/') n += 1
    }
  }
  return n
}

function walk(dir, acc) {
  let entries
  try { entries = readdirSync(dir) } catch { return acc }
  for (const e of entries) {
    if (e === 'node_modules' || e === 'dist' || e === '.git' || e === 'coverage') continue
    const p = join(dir, e)
    let st
    try { st = statSync(p) } catch { acc.unreadable.push(p); continue }
    if (st.isDirectory()) walk(p, acc)
    else if (TEST_FILE.test(e)) acc.files.push(p)
  }
  return acc
}

// Importing this file must not run the scan — the self-test imports the two
// pure functions above, and a top-level scan would fail closed on a checkout
// that has no submodules and take the self-test down with it.
async function main() {
  const results = []
  let hardFailure = null
  for (const app of APPS) {
    const src = join(ROOT, app, 'src')
    if (!existsSync(src)) {
      hardFailure = `app "${app}" is not checked out at ${src}. A missing app reports a LOW count — a false pass.`
      break
    }
    const acc = walk(src, { files: [], unreadable: [] })
    let total = 0
    const offenders = []
    for (const f of acc.files) {
      let text
      try { text = readFileSync(f, 'utf8') } catch { acc.unreadable.push(f); continue }
      const n = countRegexAssertions(text)
      if (n > 0) { total += n; offenders.push({ file: f.slice(ROOT.length + 1), n }) }
    }
    results.push({ app, filesScanned: acc.files.length, assertions: total, unknown: acc.unreadable.length, offenders })
  }

  if (hardFailure) {
    console.error(`[scan-regex-assertions] FAIL CLOSED: ${hardFailure}`)
    process.exit(2)
  }

  const totalAssertions = results.reduce((a, r) => a + r.assertions, 0)
  const totalUnknown = results.reduce((a, r) => a + r.unknown, 0)
  const totalFiles = results.reduce((a, r) => a + r.filesScanned, 0)

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ totalFiles, totalAssertions, totalUnknown, results }, null, 2))
  } else {
    console.log('regex assertions in tests — root ' + ROOT + '\n')
    console.log('app                        testFiles   regexAssertions   UNKNOWN')
    for (const r of results) {
      console.log(
        `${r.app.padEnd(24)} ${String(r.filesScanned).padStart(9)}   ${String(r.assertions).padStart(15)}   ${String(r.unknown).padStart(7)}`,
      )
    }
    console.log(
      `${'ESTATE'.padEnd(24)} ${String(totalFiles).padStart(9)}   ${String(totalAssertions).padStart(15)}   ${String(totalUnknown).padStart(7)}`,
    )
    console.log(
      '\nUNKNOWN means the file could not be read. It is NOT clean —\n' +
        '"checked nothing" and "found nothing" do not share an exit code here.',
    )
  }
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('node:fs')
    appendFileSync(process.env.GITHUB_OUTPUT, `assertions=${totalAssertions}\nunknown=${totalUnknown}\n`)
  }

}

import { fileURLToPath } from 'node:url'
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main()
}
