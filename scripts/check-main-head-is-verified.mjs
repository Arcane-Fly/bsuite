#!/usr/bin/env node
/**
 * Every production HEAD must be a VERIFIED commit.
 *
 * WHY THIS EXISTS. On 2026-08-27 a promotion merged, every check passed, and
 * `main` carried exactly the right tree — and production never moved. Vercel's
 * git integration is set to require verified commits, so it CANCELLED the
 * deployment before the build began.
 *
 * A cancelled deployment is not a failed one. There is no red build to find and
 * no build log to read, so every signal an agent normally checks stays green.
 *
 * The cause: `main` requires linear history via a RULESET (which is why
 * `allow_merge_commit` still reports `true` while merge-commit merges are
 * refused), so a promotion must merge by rebase or squash. GitHub's REBASE
 * merge REPLAYS your commits and rewrites them, and the replayed commits carry
 * no signature. Merge and squash are different: GitHub CREATES those commits
 * and signs them with its own key, so they come back verified.
 *
 *   Promote with --squash or --merge. NEVER --rebase, on any repo whose main
 *   requires verified commits.
 *
 * `git log --format=%G?` cannot answer this. It prints `E` ("cannot check") for
 * a GitHub-signed commit whose public key is not in the local keyring, and `N`
 * for a genuinely unsigned one. Both look wrong locally, so a local check
 * produces false alarms and false comfort in the same run. GitHub's API is the
 * only authority, which is why this gate calls it.
 *
 *   node scripts/check-main-head-is-verified.mjs                # every repo
 *   node scripts/check-main-head-is-verified.mjs --self-test
 *
 * Record: crm7/docs/20260827-rebase-merge-strips-signatures-v1.00F.md
 */

/** Repos whose production branch must carry a verified HEAD. */
export const REPOS = [
  'GaryOcean428/bsuite',
  'GaryOcean428/crm7',
  'GaryOcean428/business-suite-unified',
  'GaryOcean428/conduit',
  'GaryOcean428/braden',
  'GaryOcean428/throughput',
  'GaryOcean428/R80.4',
]

/**
 * Decide one repo's verdict from the API's verification object.
 *
 * Split from the fetch so it is testable without a network, and so the
 * "unknown" case is explicit: an ABSENT answer is not a passing one. A gate
 * that cannot tell "checked nothing" from "found nothing" is not a gate.
 */
export function classify(verification) {
  if (verification === null || verification === undefined) {
    return { verdict: 'UNKNOWN', why: 'no verification object came back — nothing was checked' }
  }
  if (verification.verified === true) {
    return { verdict: 'VERIFIED', why: verification.reason ?? 'valid' }
  }
  const reason = verification.reason ?? 'unknown'
  // The signature of the rebase-merge failure specifically, so the message
  // names the remedy rather than leaving the reader to rediscover it.
  const rebased = reason === 'unsigned'
  return {
    verdict: 'UNVERIFIED',
    why: rebased
      ? 'unsigned — the hallmark of a REBASE merge, which replays and rewrites your commits. Re-promote with --squash or --merge.'
      : `not verified (${reason})`,
  }
}

/** True when any repo's verdict must fail the run. */
export function shouldFail(results) {
  return results.some((r) => r.verdict !== 'VERIFIED')
}

async function headVerification(repo) {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const run = promisify(execFile)
  try {
    const { stdout } = await run('gh', [
      'api', `repos/${repo}/commits/main`, '--jq', '{sha: .sha, v: .commit.verification}',
    ], { maxBuffer: 1024 * 1024 })
    const parsed = JSON.parse(stdout)
    return { sha: parsed.sha, verification: parsed.v }
  } catch {
    return { sha: null, verification: null }
  }
}

function selfTest() {
  const cases = []
  const t = (name, got, want) => cases.push({ name, ok: got === want, got, want })

  t('a verified head passes', classify({ verified: true, reason: 'valid' }).verdict, 'VERIFIED')
  // POSITIVE CONTROL: the gate must FAIL something, or a green run proves nothing.
  t('an unsigned head fails', classify({ verified: false, reason: 'unsigned' }).verdict, 'UNVERIFIED')
  t('the unsigned message names the remedy',
    classify({ verified: false, reason: 'unsigned' }).why.includes('--squash'), true)
  t('some other unverified reason still fails',
    classify({ verified: false, reason: 'unknown_key' }).verdict, 'UNVERIFIED')
  // An ABSENT answer is not a passing one.
  t('a missing verification object is UNKNOWN, not a pass', classify(null).verdict, 'UNKNOWN')
  t('undefined is UNKNOWN too', classify(undefined).verdict, 'UNKNOWN')
  t('UNKNOWN fails the run', shouldFail([{ verdict: 'UNKNOWN' }]), true)
  t('UNVERIFIED fails the run', shouldFail([{ verdict: 'UNVERIFIED' }]), true)
  t('all verified passes', shouldFail([{ verdict: 'VERIFIED' }, { verdict: 'VERIFIED' }]), false)
  // NEGATIVE CONTROL: an empty result set is not a pass either at the call site —
  // main() refuses it separately, because "no repos examined" reads as green here.
  t('an empty set does not itself fail', shouldFail([]), false)

  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) {
    console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  }
  console.log(`\ncheck-main-head-is-verified: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length === 0 ? 0 : 1
}

async function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest())

  const results = []
  for (const repo of REPOS) {
    const { sha, verification } = await headVerification(repo)
    results.push({ repo, sha, ...classify(verification) })
  }

  // "Nothing examined" is not "nothing wrong".
  if (results.length === 0) {
    console.error('check-main-head-is-verified: examined ZERO repos. That is a broken run, not a clean one.')
    process.exit(2)
  }

  for (const r of results) {
    const mark = r.verdict === 'VERIFIED' ? 'ok  ' : '\x1b[31mFAIL\x1b[0m'
    console.log(`  ${mark} ${r.repo.padEnd(38)} ${(r.sha ?? '(no sha)').slice(0, 9)}  ${r.verdict}  ${r.why}`)
  }
  const failed = results.filter((r) => r.verdict !== 'VERIFIED')
  console.log(`\ncheck-main-head-is-verified: ${results.length} repo(s), ${failed.length} not verified`)
  if (failed.length) {
    console.log('\n  A cancelled deployment is not a failed one — there is no red build to find.')
    console.log('  Compare the LIVE commit against the merged one, and re-promote with --squash.')
  }
  process.exit(shouldFail(results) ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
