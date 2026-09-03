#!/usr/bin/env node
/**
 * Put the cross-scope collision verdict WHERE THE MERGE BUTTON IS.
 *
 * WHY THIS EXISTS
 * ---------------
 * `check-migration-collisions-across-open-prs.mjs` is correct and has been ignored,
 * because being correct in a scheduled run's log is not the same as being able to stop
 * anything.
 *
 * 2026-09-03, measured: run 33755776728 at 12:32:12Z failed with
 *
 *     VERSION 20261119000000 is claimed by 2 different open PRs:
 *         crm7#2377 (fix/notifications-user-insert)
 *         business-suite-unified#1121 (feat/a-recruiter-can-book-on-a-colleagues-calendar)
 *     Renumber the newer migration to an unused timestamp BEFORE either PR merges.
 *
 * crm7#2377 merged at 12:53Z. Twenty-one minutes later. The gate had named both PRs,
 * named the version, predicted the exact failure and prescribed the exact remedy — and a
 * scheduled failure appears on no PR, blocks no merge and notifies nobody.
 *
 * The structural reason it cannot be an app-repo `pull_request` check instead: all three
 * collision gates live in the parent, and an app-repo PR raises no parent event. Nor can
 * the check simply be copied into the six apps — measured 2026-09-03, none of the six
 * holds a cross-repo credential (only the parent has BSUITE_CROSS_REPO_PAT), so an app
 * workflow cannot see its siblings. The parent already CAN see everything; what it was
 * missing was a way to speak into the app's PR. A commit status is that way.
 *
 * WHAT IT DOES
 * ------------
 * For every open PR that carries a migration, posts a commit status on its head SHA in
 * its OWN repository:
 *
 *   failure — this PR shares a migration version with another open PR (named)
 *   success — no other open PR claims any version this branch carries
 *
 * `success` on the clean ones is not decoration: a required check that is only ever
 * posted on failure never arrives for a healthy PR, so the PR blocks forever and someone
 * removes the requirement. The context must be posted on every PR it judges.
 *
 *   node scripts/post-migration-collision-status.mjs collisions.json
 *   node scripts/post-migration-collision-status.mjs --self-test
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export const CONTEXT = 'migration-collision/cross-scope'
const OWNER = 'GaryOcean428'

/** Build the status body for one PR record. Pure, so it can be tested without a network. */
export function statusFor(pr, collisions, runUrl) {
  if (!pr.colliding) {
    return {
      state: 'success',
      context: CONTEXT,
      target_url: runUrl,
      description: 'No other open PR claims a migration version on this branch.',
    }
  }
  const mine = new Set(pr.versions)
  const hits = []
  for (const c of collisions) {
    if (!mine.has(c.version)) continue
    const others = c.claimants.filter((x) => !(x.scope === pr.scope && x.pr === pr.pr))
    for (const o of others) hits.push(`${c.version} with ${o.scope}#${o.pr}`)
  }
  // A status description is truncated by GitHub at 140 characters. Say the most
  // actionable thing FIRST — the version and one sibling — so a truncated line is still
  // enough to act on, and leave the full list to the run log.
  const head = hits.length ? hits[0] : 'a version claimed by another open PR'
  const more = hits.length > 1 ? ` (+${hits.length - 1} more)` : ''
  return {
    state: 'failure',
    context: CONTEXT,
    target_url: runUrl,
    description: `Shares ${head}${more}. Renumber before either merges.`.slice(0, 140),
  }
}

/**
 * The clearing status for a PR the scan no longer judges — one that ADDS NO
 * migration under the fixed, base...head-scoped scan
 * (check-migration-collisions-across-open-prs.mjs's own FOLLOW header,
 * 2026-09-04). Such a PR gets no FRESH verdict from this run — nothing about
 * it changed the scan's opinion, because the scan has no opinion on it — but
 * it may be sitting under a STALE status this exact context posted before
 * the whole-tree bug was fixed, and a stale failure that nothing ever
 * overwrites blocks the PR forever. Pure, so it is testable without a
 * network call.
 */
export function clearanceFor(runUrl) {
  return {
    state: 'success',
    context: CONTEXT,
    target_url: runUrl,
    description: 'This branch adds no migration — a prior status on this context was stale and is cleared.',
  }
}

/** Read the existing status for CONTEXT on one commit, or null if none exists. */
function existingStatus(scope, sha) {
  const raw = execFileSync(
    'gh',
    ['api', `repos/${OWNER}/${scope}/commits/${sha}/status`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const doc = JSON.parse(raw)
  const statuses = Array.isArray(doc.statuses) ? doc.statuses : []
  // The API returns every status ever posted for this SHA, newest first per
  // GitHub's own documented ordering — the first match for CONTEXT is the
  // current one shown in the PR's checks UI.
  return statuses.find((s) => s.context === CONTEXT) || null
}

function post(scope, sha, body) {
  const args = ['api', '--method', 'POST', `repos/${OWNER}/${scope}/statuses/${sha}`]
  for (const [k, v] of Object.entries(body)) args.push('-f', `${k}=${v}`)
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function selfTest() {
  let pass = 0
  let fail = 0
  const ok = (name, cond) => {
    if (cond) { pass++; console.log(`  ok   ${name}`) } else { fail++; console.error(`  FAIL ${name}`) }
  }
  const collisions = [
    { version: '20261119000000', claimants: [{ scope: 'crm7', pr: 2377 }, { scope: 'business-suite-unified', pr: 1121 }] },
  ]
  const colliding = { scope: 'crm7', pr: 2377, sha: 'a'.repeat(40), colliding: true, versions: ['20261119000000'] }
  const clean = { scope: 'conduit', pr: 680, sha: 'b'.repeat(40), colliding: false, versions: ['20260504010000'] }

  const s1 = statusFor(colliding, collisions, 'http://run')
  ok('a colliding PR gets state=failure', s1.state === 'failure')
  ok('it names the version', s1.description.includes('20261119000000'))
  ok('it names the OTHER PR, not itself', s1.description.includes('business-suite-unified#1121') && !s1.description.includes('crm7#2377'))

  const s2 = statusFor(clean, collisions, 'http://run')
  ok('a clean PR gets state=success', s2.state === 'success')
  ok('a clean PR is still POSTED, so a required check can arrive', s2.context === CONTEXT)

  // A required check that never arrives on a healthy PR blocks it forever.
  ok('both states use the same context', s1.context === s2.context)

  // Truncation: GitHub cuts at 140. The version must survive it.
  const many = {
    scope: 'braden', pr: 584, sha: 'c'.repeat(40), colliding: true,
    versions: ['20260504010000', '20261115000000'],
  }
  const bigCollisions = [
    { version: '20260504010000', claimants: [{ scope: 'braden', pr: 584 }, { scope: 'conduit', pr: 679 }, { scope: 'business-suite-unified', pr: 1115 }] },
    { version: '20261115000000', claimants: [{ scope: 'braden', pr: 584 }, { scope: 'crm7', pr: 2374 }] },
  ]
  const s3 = statusFor(many, bigCollisions, 'http://run')
  ok('description stays within GitHub\'s 140-char limit', s3.description.length <= 140)
  ok('the first named version survives truncation', s3.description.includes('20260504010000'))
  ok('it says how many more were elided', s3.description.includes('more'))

  // A PR whose version appears in NO collision must not be called colliding by accident.
  const mismatched = { scope: 'crm7', pr: 9999, sha: 'd'.repeat(40), colliding: true, versions: ['20990101000000'] }
  const s4 = statusFor(mismatched, collisions, 'http://run')
  ok('a colliding flag with no matching version still fails, with a generic reason',
    s4.state === 'failure' && s4.description.includes('another open PR'))

  const clear = clearanceFor('http://run')
  ok('a clearance for an out-of-scope PR is state=success', clear.state === 'success')
  ok('a clearance uses the SAME context — otherwise it clears nothing, it adds a second context', clear.context === CONTEXT)
  ok('a clearance says WHY, not just that it is fine', clear.description.toLowerCase().includes('stale'))

  console.log(`\npost-migration-collision-status: ${pass}/${pass + fail} self-test(s) passed`)
  return fail ? 1 : 0
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest())
  const file = process.argv[2]
  if (!file) {
    console.error('usage: post-migration-collision-status.mjs <collisions.json>')
    process.exit(2)
  }
  const runUrl = process.env.RUN_URL || ''
  const doc = JSON.parse(readFileSync(file, 'utf8'))
  let posted = 0
  let failed = 0
  for (const pr of doc.prs) {
    if (!pr.sha) {
      console.error(`::warning::${pr.scope}#${pr.pr} has no head SHA — cannot post a status`)
      failed++
      continue
    }
    const body = statusFor(pr, doc.collisions, runUrl)
    try {
      post(pr.scope, pr.sha, body)
      posted++
      console.log(`  ${body.state.padEnd(7)} ${pr.scope}#${pr.pr}  ${pr.sha.slice(0, 8)}`)
    } catch (err) {
      // One unpostable PR must not hide the others.
      failed++
      const msg = (err && err.message) || String(err)
      console.error(`::warning::could not post status to ${pr.scope}#${pr.pr}: ${msg.slice(0, 200)}`)
    }
  }

  // CLEAR STALE STATUSES on every PR the scan saw but did not judge this run —
  // one that adds no migration under the fixed, base...head-scoped scan. Such
  // a PR may be sitting under a FAILURE this exact context posted before the
  // whole-tree bug (2026-09-04) was fixed; nothing else will ever overwrite
  // it, since a PR that never gains a migration never gets a fresh verdict
  // again. Checked, not assumed: only a PR that ACTUALLY carries a non-success
  // CONTEXT status gets a clearing post — a PR with no status at all (the
  // common, growing case going forward) gets none, matching "a PR that adds
  // no migration receives no status" for every PR that was never wrongly
  // flagged in the first place.
  const judged = new Set((doc.prs || []).map((pr) => `${pr.scope}#${pr.pr}`))
  let cleared = 0
  for (const pr of doc.allOpenPrs || []) {
    const key = `${pr.scope}#${pr.pr}`
    if (judged.has(key) || !pr.sha) continue
    let existing
    try {
      existing = existingStatus(pr.scope, pr.sha)
    } catch (err) {
      const msg = (err && err.message) || String(err)
      console.error(`::warning::could not read existing status for ${key}: ${msg.slice(0, 200)}`)
      continue
    }
    if (!existing || existing.state === 'success') continue // nothing stale to clear
    try {
      post(pr.scope, pr.sha, clearanceFor(runUrl))
      cleared++
      console.log(`  cleared ${key}  ${pr.sha.slice(0, 8)}  (was ${existing.state})`)
    } catch (err) {
      const msg = (err && err.message) || String(err)
      console.error(`::warning::could not clear stale status on ${key}: ${msg.slice(0, 200)}`)
    }
  }
  console.log(`post-migration-collision-status: ${posted} posted, ${cleared} stale status(es) cleared, ${failed} could not be posted`)
  // Posting is reporting, not judging. The scan step owns the pass/fail verdict; this
  // step failing would mask a clean scan as a broken one.
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
