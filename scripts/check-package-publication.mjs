#!/usr/bin/env node
/**
 * check-package-publication — a publish workflow that reports success while its package
 * does not exist on the registry is not a publish workflow. It is scenery.
 *
 * THE CASE THIS EXISTS FOR (bsuite#1908)
 * --------------------------------------
 *   Publish @bsuite/eslint-config   runs #7, #8, #9   ALL SUCCESS
 *   https://registry.npmjs.org/@bsuite/eslint-config  404
 *
 * The workflow was made honest in 2026-08-13: it probes the bare package name, finds a
 * definitive E404, and SKIPS with a `::notice::` explaining that the publish token can
 * push to existing packages but cannot CREATE one. That was the right call at the time —
 * the alternative was a permanently-red step, and a step that is always red is a step
 * everyone learns to scroll past.
 *
 * But a `::notice::` is not a signal. It is green. To anyone reading the Actions tab,
 * "Publish @bsuite/eslint-config — success" is indistinguishable from a working publish,
 * and has been for four months. @bsuite/tsconfig is in the same state and nobody had
 * counted it.
 *
 * WHAT CHANGES
 * ------------
 * Absence stops being SILENT. It becomes a declared, acknowledged state with an owner and
 * a reason, or it fails:
 *
 *   absent + acknowledged in the baseline   -> reported, not fatal
 *   absent + NOT acknowledged               -> FAIL. A package nobody decided to leave
 *                                              unpublished is an accident.
 *   acknowledged + now on the registry      -> FAIL. Stale entry; the list may only shrink.
 *   registry unreachable / non-404 error    -> FAIL CLOSED. "Could not check" is never
 *                                              "found nothing" — that conflation is the
 *                                              exact defect this gate is named after.
 *
 * It also checks the two halves match: a publishable package needs a publish workflow, and
 * a `private: true` package must not have one. A new package added without its workflow
 * publishes nothing and says nothing, which is how this class starts.
 *
 *   node scripts/check-package-publication.mjs
 *   node scripts/check-package-publication.mjs --self-test
 *   node scripts/check-package-publication.mjs --write-baseline
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

const PKG_DIR = 'packages'
const WF_DIR = '.github/workflows'
const BASELINE = 'scripts/unpublished-packages-baseline.json'
const REGISTRY = 'https://registry.npmjs.org'

/**
 * Pure. Given a package and what the registry said, decide.
 * `status` is the HTTP code, or null when the request itself failed.
 */
export function verdict({ name, status, acknowledged }) {
  if (status === null) {
    return { ok: false, kind: 'unreachable', message: `the registry could not be reached for ${name}. "Could not check" is never "found nothing" — failing closed.` }
  }
  if (status === 200) {
    if (acknowledged) {
      return { ok: false, kind: 'stale', message: `${BASELINE} lists ${name} as unpublished, but it is on the registry now. Remove the entry — this list may only shrink.` }
    }
    return { ok: true, kind: 'published', message: `${name} is on the registry` }
  }
  if (status === 404) {
    if (acknowledged) {
      return { ok: true, kind: 'acknowledged-absent', message: `${name} is not on the registry — acknowledged` }
    }
    return { ok: false, kind: 'unacknowledged-absent', message: `${name} does not exist on the registry, and nobody has recorded a decision to leave it unpublished. Its publish workflow reports SUCCESS regardless, which is indistinguishable from a working publish.` }
  }
  return { ok: false, kind: 'unexpected', message: `the registry answered ${status} for ${name}. Only 200 and 404 are conclusive; failing closed rather than guessing.` }
}

/** Pure. A publishable package needs a workflow; a private one must not have it. */
export function wiringVerdict({ name, dir, isPrivate, hasWorkflow }) {
  if (!isPrivate && !hasWorkflow) {
    return { ok: false, message: `${name} (packages/${dir}) is publishable but has no ${WF_DIR}/publish-${dir}.yml. It will never be published, and nothing will say so.` }
  }
  if (isPrivate && hasWorkflow) {
    return { ok: false, message: `${name} (packages/${dir}) is private: true but has ${WF_DIR}/publish-${dir}.yml. One of the two is wrong.` }
  }
  return { ok: true, message: '' }
}

function selfTest() {
  let bad = 0
  const fail = (m) => { console.error(`  FAIL ${m}`); bad++ }
  const cases = [
    ['a published package passes', { name: 'a', status: 200, acknowledged: false }, true],
    ['an unacknowledged 404 FAILS — the whole point', { name: 'a', status: 404, acknowledged: false }, false],
    ['an acknowledged 404 passes', { name: 'a', status: 404, acknowledged: true }, true],
    ['a STALE acknowledgement FAILS', { name: 'a', status: 200, acknowledged: true }, false],
    ['an unreachable registry FAILS CLOSED', { name: 'a', status: null, acknowledged: true }, false],
    ['a 500 FAILS CLOSED, never read as absent', { name: 'a', status: 500, acknowledged: false }, false],
    ['a 429 FAILS CLOSED', { name: 'a', status: 429, acknowledged: true }, false],
  ]
  for (const [label, input, wantOk] of cases) {
    if (verdict(input).ok !== wantOk) fail(`${label}: wanted ok=${wantOk}`)
  }
  const wiring = [
    ['publishable with a workflow passes', { name: 'a', dir: 'a', isPrivate: false, hasWorkflow: true }, true],
    ['publishable with NO workflow fails', { name: 'a', dir: 'a', isPrivate: false, hasWorkflow: false }, false],
    ['private with no workflow passes', { name: 'a', dir: 'a', isPrivate: true, hasWorkflow: false }, true],
    ['private WITH a workflow fails', { name: 'a', dir: 'a', isPrivate: true, hasWorkflow: true }, false],
  ]
  for (const [label, input, wantOk] of wiring) {
    if (wiringVerdict(input).ok !== wantOk) fail(`${label}: wanted ok=${wantOk}`)
  }
  console.log(
    `check-package-publication --self-test: ${cases.length} registry verdicts (published, ` +
      `unacknowledged 404, acknowledged 404, a STALE acknowledgement, and three fail-closed ` +
      `cases — unreachable, 500 and 429, none of which may read as "absent") plus ` +
      `${wiring.length} workflow-wiring cases.`,
  )
  return bad
}

async function probe(name) {
  try {
    const res = await fetch(`${REGISTRY}/${name}`, { method: 'GET', redirect: 'follow' })
    return res.status
  } catch { return null }
}

async function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  if (selfTest() !== 0) { console.error('::error::checker failed its own self-test'); process.exit(1) }

  const dirs = readdirSync(PKG_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(`${PKG_DIR}/${e.name}/package.json`))
    .map((e) => e.name)

  const pkgs = []
  for (const dir of dirs) {
    let json
    try { json = JSON.parse(readFileSync(`${PKG_DIR}/${dir}/package.json`, 'utf8')) } catch { continue }
    if (!json.name) continue
    pkgs.push({
      dir, name: json.name,
      isPrivate: json.private === true,
      hasWorkflow: existsSync(`${WF_DIR}/publish-${dir}.yml`),
    })
  }

  // A ZERO denominator is "could not measure", never "nothing to measure".
  if (pkgs.length === 0) {
    console.error(`::error::0 packages found under ${PKG_DIR}/. That is "could not check", not a clean bill.`)
    process.exit(1)
  }

  let acknowledged = []
  try { acknowledged = JSON.parse(readFileSync(BASELINE, 'utf8')).unpublished ?? [] } catch { /* first run */ }
  const ackSet = new Set(acknowledged)

  const publishable = pkgs.filter((p) => !p.isPrivate)
  const results = []
  for (const p of publishable) {
    results.push({ p, v: verdict({ name: p.name, status: await probe(p.name), acknowledged: ackSet.has(p.name) }) })
  }

  if (process.argv.includes('--write-baseline')) {
    const absent = results.filter((r) => r.v.kind === 'unacknowledged-absent' || r.v.kind === 'acknowledged-absent').map((r) => r.p.name).sort()
    writeFileSync(BASELINE, JSON.stringify({
      _comment: [
        'Packages that are DELIBERATELY not on the npm registry. Being listed here downgrades',
        'a 404 from a hard failure to a reported exception. It does NOT make it fine.',
        '',
        'This list may only SHRINK. An unlisted package that 404s fails the gate, and a listed',
        'package that has since been published ALSO fails, so it cannot become a place absent',
        'packages go to be forgotten.',
        '',
        'Why these two are here: the publish token can push to an EXISTING package but cannot',
        'CREATE one — a 404 on PUT means authenticated-but-unauthorised. Creating them needs a',
        'token with create rights, or an npm Trusted Publisher configured per package. Both are',
        'operator actions. They also reach zero consumers (B-19), so whether they should exist',
        'at all is an open question, not a foregone one.',
      ],
      unpublished: absent,
    }, null, 2) + '\n')
    console.log(`wrote ${BASELINE} with ${absent.length} acknowledged package(s)`)
    return
  }

  const wiringProblems = pkgs.map((p) => wiringVerdict(p)).filter((w) => !w.ok)
  const failures = results.filter((r) => !r.v.ok)

  // HEAD LINE FIRST — the denominator before any verdict.
  console.log(
    `[package-publication] ${pkgs.length} package(s) examined; ${publishable.length} publishable; ` +
      `${results.filter((r) => r.v.kind === 'published').length} on the registry; ` +
      `${results.filter((r) => r.v.kind === 'acknowledged-absent').length} acknowledged absent; ` +
      `${failures.length} failing; ${wiringProblems.length} workflow-wiring problem(s).`,
  )
  for (const r of results) {
    if (r.v.kind === 'acknowledged-absent') console.log(`  known   ${r.v.message}`)
  }
  for (const r of failures) console.error(`::error::${r.v.message}`)
  for (const w of wiringProblems) console.error(`::error::${w.message}`)

  if (failures.length || wiringProblems.length) process.exit(1)
  console.log(`✓ every publishable package is on the registry or acknowledged absent.`)
}

main()
