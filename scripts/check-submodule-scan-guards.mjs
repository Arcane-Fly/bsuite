#!/usr/bin/env node
/*
 * A STATIC SCANNER OVER SUBMODULES MUST REFUSE AN EMPTY TREE — ratcheted.
 *
 * WHY. Every static gate here reads the six app directories. If the submodules did
 * not check out, the gate scans nothing, finds nothing and exits 0. An empty tree is
 * indistinguishable from a clean one to a grep, so the run reports a PASS over zero
 * coverage — worse than a failure, because nothing draws the eye to it.
 *
 * The submodules are PRIVATE, so `actions/checkout` without BSUITE_CROSS_REPO_PAT
 * gets "Repository not found" — a 404, not a permission error. Observed 2026-08-28 on
 * a newly added workflow, which aborted outright. That is the LUCKY case: had the
 * checkout half-succeeded, three green gates would have measured nothing.
 *
 * `theme-conformance.yml` learned this and carries the guard inline with the note
 * "a false pass, which is worse than a failure". Nine workflows have some form of it.
 * Thirty-seven do not. This gate stops that number growing while the backlog is paid
 * down — the same shape as G13, and for the same reason: a mechanical fix across
 * thirty-seven files is more than one pass can verify.
 *
 * The remedy for any one of them is one line:
 *     - run: scripts/assert-app-trees-present.sh
 *
 * Usage:  node scripts/check-submodule-scan-guards.mjs [--self-test]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '.github/workflows'
const BASELINE = 'scripts/.submodule-scan-guards-baseline'

const APP = /(crm7|business-suite-unified|conduit|braden|throughput|R80\.4)[ /]/
const SCAN = /scripts\/(audit|check)-[a-z0-9.-]+\.(sh|mjs|py)/
const GUARDED = /did not check out|Submodules did not|app tree|refusing to (scan|measure)|assert-app-trees-present/

/**
 * A workflow is AT RISK when it checks out submodules AND reads their trees.
 *
 * The app-path test runs against the `jobs:` section only. A path filter under
 * `on.push.paths` names the same directories and is not a scan of them — counting it
 * inflates the class by workflows that would never touch an app tree, and a baseline
 * you cannot defend is not a ratchet.
 */
/**
 * Strip whole-line comments before any test.
 *
 * Three workflows carry `submodules:` ONLY inside a comment explaining why they
 * deliberately do not fetch them ("No submodules: the diff is a parent-repo artefact").
 * Matching the token in prose ABOUT the token is a recurring defect in this estate's
 * grep gates — four instances in one day on 2026-08-26 — and here it would have put
 * three workflows into a class they are the documented counter-example to.
 */
export function stripComments(text) {
  return text
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('#'))
    .join('\n')
}
export function jobsOnly(text) {
  const m = text.match(/^jobs:/m)
  return m === null ? text : text.slice(m.index)
}
export function atRisk(raw) {
  const text = stripComments(raw)
  // `submodules: false` is a deliberate NON-fetch. Reading the key's presence rather
  // than its VALUE put three workflows in the class that opt out of it by name — and
  // a guard added to those would have failed on its first run and every run after,
  // which is the permanently-red gate this estate has shipped three times already.
  if (!/submodules:\s*'?"?(true|recursive)/.test(text)) return false
  const jobs = jobsOnly(text)
  return APP.test(jobs) || SCAN.test(jobs)
}
export function guarded(text) {
  return GUARDED.test(text)
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['no submodules -> not at risk', 'jobs:\n  a:\n    steps:\n      - run: scripts/audit-x.sh\n', false, null],
    ['submodules + scan -> at risk', 'submodules: recursive\nrun: scripts/audit-x.sh\n', true, false],
    ['submodules + app path -> at risk', 'jobs:\n  a:\n    submodules: recursive\n    run: grep -r x crm7/src\n', true, false],
    ['app path in TRIGGER only -> not at risk', 'on:\n  push:\n    paths:\n      - crm7/**\njobs:\n  a:\n    submodules: recursive\n    run: echo hi\n', false, null],
    ['at risk + guard -> guarded', 'submodules: recursive\nrun: scripts/audit-x.sh\nrun: scripts/assert-app-trees-present.sh\n', true, true],
    ['submodules: false -> not at risk', 'jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          submodules: false\n      - run: scripts/check-x.mjs\n', false, null],
    ['submodules named only in a COMMENT -> not at risk', 'jobs:\n  a:\n    steps:\n      # No submodules: the diff is a parent artefact\n      - uses: actions/checkout@v4\n        run: scripts/check-x.mjs\n', false, null],
    ['at risk + inline guard -> guarded', 'submodules: recursive\nrun: scripts/audit-x.sh\necho "Submodules did not check out"\n', true, true],
  ]
  let pass = 0
  for (const [name, text, wantRisk, wantGuard] of cases) {
    const r = atRisk(text)
    const g = wantGuard === null ? null : guarded(text)
    if (r === wantRisk && g === wantGuard) { pass++; console.log(`  ok    ${name}`) }
    else console.error(`  FAIL  ${name}: atRisk=${r} guarded=${g}`)
  }
  console.log(`check-submodule-scan-guards self-test: ${pass}/${cases.length} pass`)
  process.exit(pass === cases.length ? 0 : 1)
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
if (files.length === 0) {
  console.error('::error::no workflow files found — refusing to report a count over nothing')
  process.exit(1)
}

const unguarded = []
let scanners = 0
for (const f of files) {
  const text = readFileSync(join(DIR, f), 'utf8')
  if (!atRisk(text)) continue
  scanners++
  if (!guarded(text)) unguarded.push(f)
}

let base
try { base = Number(readFileSync(BASELINE, 'utf8').trim()) } catch { base = null }

const now = unguarded.length
if (base === null) {
  console.error(`no baseline — write ${now} to ${BASELINE} to arm the ratchet`)
  process.exit(1)
}
if (now > base) {
  console.error(`::error::unguarded submodule scanners ROSE ${base} -> ${now}.`)
  console.error('  Add one line to the new workflow:  - run: scripts/assert-app-trees-present.sh')
  for (const f of unguarded) console.error(`    ${f}`)
  process.exit(1)
}
if (now < base) {
  console.error(`unguarded submodule scanners FELL ${base} -> ${now}. Bank it:  echo ${now} > ${BASELINE}`)
  console.error('  A baseline above the true count re-permits the debt you just paid off.')
  process.exit(1)
}
// State the count EXAMINED, not only the count found. A guard whose clean pass says
// "0" is indistinguishable from a guard that read nothing — the exact class
// check-guard-self-reporting.mjs exists to catch, and this gate is in its registry.
console.log(
  `check-submodule-scan-guards: examined ${files.length} workflow(s), ` +
    `${scanners} scan submodule trees, ${scanners - now} guarded, ${now} unguarded ` +
    `(ratchet baseline ${base}).`,
)
