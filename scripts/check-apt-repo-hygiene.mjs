#!/usr/bin/env node
/*
 * `apt-get update` MUST NOT DEPEND ON A REPO WE NEVER READ — ratcheted at 0.
 *
 * GitHub's runner images ship a Microsoft apt repository that this estate never reads.
 * It intermittently answers 403 / "no longer signed", and under `set -euo pipefail` a
 * failing `apt-get update` is fatal to the job.
 *
 * The reason it stayed unfixed is that it does not look like a defect. On 2026-08-27
 * schema-lag died on it at 21:26 while phantom-migrations, running the same install one
 * minute earlier, passed. A failure that alternates reads as flake, and flake gets
 * re-run rather than fixed — thirteen workflows were rolling a die on every run,
 * including the ones that audit production RLS and migration history.
 *
 * The remedy is one line before the update:
 *     sudo rm -f /etc/apt/sources.list.d/*microsoft* /etc/apt/sources.list.d/*azure* || true
 *
 * Usage:  node scripts/check-apt-repo-hygiene.mjs [--self-test]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// PARENT WORKFLOWS ONLY, deliberately. crm7 carries two of these too, but CI reads a
// submodule at the recorded GITLINK while this script reads the WORKING TREE. A count
// spanning both answers differently per machine, and banking it here would fail in CI
// until an unrelated pointer advance happened to land. crm7's copies are fixed in its
// own PR; a cross-repo count is not this gate's job.
const DIRS = ['.github/workflows']
const BASELINE = 'scripts/.apt-repo-hygiene-baseline'

/**
 * Strip whole-line comments AND YAML `name:` fields before testing.
 *
 * Both are prose ABOUT apt rather than a call to it, and this gate proved it on
 * itself: the step that runs this very check is named "No workflow runs an
 * unmitigated apt-get update", and the first version counted its own step name as a
 * violation. That is the sixth time a grep gate in this estate has matched the token
 * in prose about the token — a comment, a detector's own vocabulary, a dependabot
 * note, and now a step label.
 */
export function stripComments(text) {
  return text
    .split('\n')
    .filter((l) => {
      const t = l.trimStart()
      return !t.startsWith('#') && !/^-?\s*name:/.test(t)
    })
    .join('\n')
}
export function callsAptUpdate(raw) {
  return /apt-get\s+(-[a-z]+\s+)*update/.test(stripComments(raw))
}
export function dropsVendorRepos(raw) {
  return /sources\.list\.d\/\*?(microsoft|azure)/.test(stripComments(raw))
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['no apt at all', 'run: echo hi\n', false, null],
    ['apt-get update, unmitigated', 'run: sudo apt-get update\n', true, false],
    ['apt-get -qq update, unmitigated', 'run: apt-get -qq update\n', true, false],
    ['apt-get update, mitigated', 'run: |\n  sudo rm -f /etc/apt/sources.list.d/*microsoft*\n  sudo apt-get update\n', true, true],
    ['apt-get INSTALL only (no update)', 'run: command -v psql || sudo apt-get install -y postgresql-client\n', false, null],
    ['apt named only in a STEP NAME', 'jobs:\n  a:\n    steps:\n      - name: No workflow runs an unmitigated apt-get update\n        run: node scripts/check-apt-repo-hygiene.mjs\n', false, null],
    ['apt named only in a COMMENT', '# a full `apt-get update` runs five times here\nrun: echo hi\n', false, null],
  ]
  let pass = 0
  for (const [name, text, wantCall, wantMit] of cases) {
    const c = callsAptUpdate(text)
    const m = wantMit === null ? null : dropsVendorRepos(text)
    if (c === wantCall && m === wantMit) { pass++; console.log(`  ok    ${name}`) }
    else console.error(`  FAIL  ${name}: calls=${c} mitigated=${m}`)
  }
  console.log(`check-apt-repo-hygiene self-test: ${pass}/${cases.length} pass`)
  process.exit(pass === cases.length ? 0 : 1)
}

let examined = 0
const unmitigated = []
for (const dir of DIRS) {
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.yml') || x.endsWith('.yaml'))) {
    const text = readFileSync(join(dir, f), 'utf8')
    examined++
    if (callsAptUpdate(text) && !dropsVendorRepos(text)) unmitigated.push(`${dir}/${f}`)
  }
}
if (examined === 0) {
  console.error('::error::no workflow files found — refusing to report a count over nothing')
  process.exit(1)
}

let base
try { base = Number(readFileSync(BASELINE, 'utf8').trim()) } catch { base = null }
const now = unmitigated.length
if (base === null) { console.error(`no baseline — write ${now} to ${BASELINE}`); process.exit(1) }
if (now > base) {
  console.error(`::error::workflows running an unmitigated apt-get update ROSE ${base} -> ${now}.`)
  console.error('  Add before the update:  sudo rm -f /etc/apt/sources.list.d/*microsoft* /etc/apt/sources.list.d/*azure* || true')
  for (const f of unmitigated) console.error(`    ${f}`)
  process.exit(1)
}
if (now < base) { console.error(`FELL ${base} -> ${now}. Bank it:  echo ${now} > ${BASELINE}`); process.exit(1) }
console.log(`check-apt-repo-hygiene: examined ${examined} workflow(s), ${now} run an unmitigated apt-get update (baseline ${base}).`)
