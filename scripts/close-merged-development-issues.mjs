#!/usr/bin/env node
/**
 * scripts/close-merged-development-issues.mjs
 *
 * Close the issues that a merged `development` pull request said it closed.
 *
 * THE DEFECT THIS REPAIRS (register V-10)
 * ---------------------------------------------------------------------------
 * GitHub auto-closes a referenced issue ONLY when the pull request merges into
 * the repository's DEFAULT branch. All seven repositories in this estate
 * default to `main`; every pull request targets `development`. So every
 * `Closes #N` / `Fixes #N` / `Resolves #N` ever written here has been inert,
 * and authors keep writing them believing they work. Fifteen fixed-and-open
 * issues were closed by hand on 2026-08-17 — a backlog, not a fix. This script
 * is the fix.
 *
 * WHY NOT THE OTHER TWO OPTIONS
 * ---------------------------------------------------------------------------
 * (b) Change the default branch to `development`. Rejected: `main` IS
 *     production here. Vercel builds each submodule from ITS OWN main, the
 *     migration applier runs on main only, and promotion-gate.yml keys off the
 *     main/development distinction. Flipping the default to make one GitHub
 *     convenience work would move the branch every deployment tool treats as
 *     production. A wrong-shaped fix in the highest-blast-radius setting there
 *     is.
 *
 * (c) Fail the PR when a closing keyword targets `development`. Rejected: it
 *     punishes the author for writing exactly the right thing, teaches the
 *     estate a private dialect that breaks the moment a PR does go to `main`,
 *     and still leaves a human to do the closing by hand every time — which is
 *     the manual step that produced the backlog in the first place.
 *
 * (a), implemented here, preserves what authors already write and what every
 * external tool already understands.
 *
 * SAFETY RULES, ALL LOAD-BEARING
 * ---------------------------------------------------------------------------
 * 1. ONLY A GENUINE MERGE. A pull request can close without merging. Only
 *    `merged_at != null` is acted on; a closed-unmerged PR is skipped by name.
 * 2. AUDITABLE. Every closure gets a comment naming the merge SHA and the PR
 *    before the state change, so the closure can be traced from the issue
 *    alone. Comment first, then close: if the API call fails between the two,
 *    the issue is left OPEN with an explanation rather than closed silently.
 * 3. NEVER RE-CLOSE. The comment carries a machine marker. If a marker for
 *    this same PR is already on the issue, a human reopened it deliberately
 *    after the closer acted, and the closer does not argue.
 * 4. NEVER REACH ACROSS REPOSITORIES. Cross-repo references are reported for
 *    manual action, never closed. A merge in one repository is not consent to
 *    mutate another.
 * 5. NEVER CLOSE A PULL REQUEST. `/issues/{n}` also serves PRs; anything with
 *    a `pull_request` field is skipped.
 * 6. NEVER REPORT A SCOPE IT COULD NOT READ AS CLEAN. An unreadable repository
 *    exits non-zero naming the scope. This estate has produced false zeroes in
 *    both directions; a survey that silently skipped two of seven repos and
 *    printed "0 to close" is exactly that failure.
 * 7. SELF-DISABLING. If a repository's default branch already equals the base
 *    branch, GitHub's native mechanism applies and this script stands down for
 *    that scope rather than racing it.
 *
 * Environment:
 *   GITHUB_TOKEN              (required) repo+issues write for every scope
 *   CLOSER_SCOPES             comma-separated owner/repo (default: the estate)
 *   CLOSER_BASE_BRANCH        default 'development'
 *   CLOSER_LOOKBACK_HOURS     default '48'
 *   CLOSER_MAX_PAGES          default '10' (100 PRs per page). Raise this to
 *                             survey a window wider than the most recent 1000
 *                             closed pull requests in a scope. A window the cap
 *                             cannot cover is reported UNREADABLE, never clean.
 *   CLOSER_DRY_RUN            '1' to report without mutating
 *   GITHUB_STEP_SUMMARY       optional; a job summary is appended when set
 *
 * Exit codes: 0 ok · 1 one or more scopes unreadable / closures failed ·
 *             2 harness error (no token, no scopes, bad config).
 */

import fs from 'node:fs'
import { parseClosingKeywords } from './parse-closing-keywords.mjs'

const API = 'https://api.github.com'

/** The estate. Kept here rather than derived so a missing repo is visible. */
const DEFAULT_SCOPES = [
  'GaryOcean428/bsuite',
  'GaryOcean428/crm7',
  'GaryOcean428/business-suite-unified',
  'GaryOcean428/conduit',
  'GaryOcean428/braden',
  'GaryOcean428/throughput',
  'GaryOcean428/R80.4',
]

const MARKER_PREFIX = '<!-- bsuite-development-merge-closer:v1'

const token = process.env.GITHUB_TOKEN ?? ''
const baseBranch = process.env.CLOSER_BASE_BRANCH || 'development'
const lookbackHours = Number.parseInt(process.env.CLOSER_LOOKBACK_HOURS || '48', 10)
const dryRun = process.env.CLOSER_DRY_RUN === '1'
const maxPages = Number.parseInt(process.env.CLOSER_MAX_PAGES || '10', 10)
const scopes = (process.env.CLOSER_SCOPES || DEFAULT_SCOPES.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

function die(message) {
  console.error(`close-merged-development-issues: ${message}`)
  process.exit(2)
}

if (token === '') die('GITHUB_TOKEN is not set. Refusing to run blind.')
if (scopes.length === 0) die('CLOSER_SCOPES resolved to nothing.')
if (!Number.isFinite(lookbackHours) || lookbackHours <= 0) {
  die(`CLOSER_LOOKBACK_HOURS must be a positive integer, got "${process.env.CLOSER_LOOKBACK_HOURS}"`)
}
if (!Number.isFinite(maxPages) || maxPages <= 0) {
  die(`CLOSER_MAX_PAGES must be a positive integer, got "${process.env.CLOSER_MAX_PAGES}"`)
}

// ---------------------------------------------------------------------------
// Minimal GitHub client
// ---------------------------------------------------------------------------

async function gh(path, init = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'bsuite-development-merge-closer',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 400)}`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

// ---------------------------------------------------------------------------
// Report accumulators
// ---------------------------------------------------------------------------

const report = {
  scopesRequested: scopes.length,
  scopesSurveyed: 0,
  scopesStoodDown: [],
  scopesUnreadable: [],
  pullRequestsExamined: 0,
  pullRequestsMerged: 0,
  directivesFound: 0,
  issuesClosed: [],
  issuesSkipped: [],
  crossRepo: [],
  ignoredMentions: 0,
  writeReady: [],
  errors: [],
}

// Buffered, NOT printed as it goes: the head line carries the derived counts
// and must be the first thing in the log (LANE-WATCHER truncates before a
// trailing summary, and so does every human skimming a CI run).
const lines = []
const say = (s) => { lines.push(s) }

// ---------------------------------------------------------------------------
// Per-issue handling
// ---------------------------------------------------------------------------

async function handleIssue(owner, repo, number, pr) {
  const ref = `${owner}/${repo}#${number}`
  let issue
  try {
    issue = await gh(`/repos/${owner}/${repo}/issues/${number}`)
  } catch (e) {
    if (e.status === 404) {
      report.issuesSkipped.push({ ref, reason: 'not-found' })
      return
    }
    throw e
  }

  // Rule 5 — /issues/{n} also serves pull requests.
  if (issue.pull_request) {
    report.issuesSkipped.push({ ref, reason: 'reference-is-a-pull-request' })
    return
  }
  if (issue.state !== 'open') {
    report.issuesSkipped.push({ ref, reason: 'already-closed' })
    return
  }

  // Rule 3 — never re-close something a human reopened after we closed it.
  const marker = `${MARKER_PREFIX} pr=${pr.number} -->`
  const comments = await gh(
    `/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`,
  )
  if (comments.some((c) => typeof c.body === 'string' && c.body.includes(marker))) {
    report.issuesSkipped.push({ ref, reason: 'reopened-after-a-previous-closure' })
    return
  }

  if (dryRun) {
    report.issuesClosed.push({ ref, pr: pr.number, sha: pr.merge_commit_sha, dryRun: true })
    return
  }

  // Rule 2 — comment BEFORE closing, so a half-failure leaves the issue open
  // with an explanation rather than closed with none.
  const body =
    `${marker}\n` +
    `Closed automatically on the merge of ${owner}/${repo}#${pr.number} ` +
    `(\`${pr.merge_commit_sha}\`) into \`${baseBranch}\`.\n\n` +
    `The pull request body said **${pr.matchedKeyword} #${number}**. GitHub only ` +
    `auto-closes on a merge to the default branch (\`${pr.defaultBranch}\`), so that ` +
    `keyword did nothing on its own — ` +
    `[\`.github/workflows/development-merge-issue-closer.yml\`]` +
    `(https://github.com/GaryOcean428/bsuite/blob/main/.github/workflows/development-merge-issue-closer.yml) ` +
    `honours it instead.\n\n` +
    `If this was closed in error, reopen it — the closer records this comment and ` +
    `will not close it again for the same pull request.`

  await gh(`/repos/${owner}/${repo}/issues/${number}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  await gh(`/repos/${owner}/${repo}/issues/${number}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  })
  report.issuesClosed.push({ ref, pr: pr.number, sha: pr.merge_commit_sha, dryRun: false })
}

// ---------------------------------------------------------------------------
// Per-scope survey
// ---------------------------------------------------------------------------

async function surveyScope(scope) {
  const slash = scope.indexOf('/')
  if (slash <= 0) {
    report.scopesUnreadable.push({ scope, reason: 'not owner/repo' })
    return
  }
  const owner = scope.slice(0, slash)
  const repo = scope.slice(slash + 1)

  let meta
  try {
    meta = await gh(`/repos/${owner}/${repo}`)
  } catch (e) {
    // Rule 6 — an unreadable scope is never a clean scope.
    report.scopesUnreadable.push({ scope, reason: e.message })
    return
  }

  // Rule 7 — stand down where GitHub's own mechanism already applies.
  if (meta.default_branch === baseBranch) {
    report.scopesStoodDown.push(scope)
    say(
      `  ${scope}: default branch IS \`${baseBranch}\` — GitHub auto-closes natively here. ` +
        'Standing down.',
    )
    return
  }

  // RULE 8 — WRITE-READINESS IS ASSERTED EVERY RUN, NOT DISCOVERED ON THE FIRST
  // CLOSURE.
  //
  // The estate-wide sweep runs from GaryOcean428/bsuite with
  // BSUITE_CROSS_REPO_PAT, and the six submodule scopes are reached with that
  // one credential. READ access is proven every hour by the survey itself.
  // WRITE access was not proven by anything: between this closer being built
  // and 2026-08-31 it closed zero issues, because all 133 closing directives
  // ever written in the estate referenced issues that were already closed. A
  // credential that can read six repositories and write to none would have
  // looked exactly like a healthy run for as long as no directive appeared —
  // and then failed on the one that mattered, after the issue had already been
  // left open.
  //
  // So the readiness is checked here, before any directive is looked for, and
  // reported whether or not one is found. `has_issues === false` means a
  // directive in this scope can NEVER be honoured; `permissions.push === false`
  // means this credential cannot mutate the scope at all. Both are recorded as
  // unreadable, which is what makes the run exit non-zero.
  //
  // Deliberately NOT a hard failure on anything softer than those two. GitHub
  // reports `permissions` as the authenticated identity's role, which a
  // fine-grained token can under- or over-state; a gate that goes red on an
  // ambiguity is a gate nobody reads (see the estate's permanently-red-gate
  // ruling). Ambiguity is logged and left to a human.
  const perms = meta.permissions ?? {}
  const permsSeen = Object.keys(perms).filter((k) => perms[k] === true).join(',') || 'none-reported'
  if (meta.has_issues === false) {
    report.scopesUnreadable.push({
      scope,
      reason:
        'issues are DISABLED on this repository — a closing directive here can ' +
        'never be honoured, so this scope must not be reported as clean.',
    })
    return
  }
  if (perms.push === false) {
    report.scopesUnreadable.push({
      scope,
      reason:
        `this credential has read but NOT write on the scope (permissions: ${permsSeen}). ` +
        'It would survey cleanly and then fail on the first genuine directive. ' +
        'Grant the token issues:write here, or drop the scope from CLOSER_SCOPES.',
    })
    return
  }
  report.writeReady.push({ scope, permissions: permsSeen })

  const cutoff = Date.now() - lookbackHours * 3600_000
  let page = 1
  const merged = []
  for (;;) {
    const prs = await gh(
      `/repos/${owner}/${repo}/pulls?state=closed&base=${encodeURIComponent(baseBranch)}` +
        `&sort=updated&direction=desc&per_page=100&page=${page}`,
    )
    if (prs.length === 0) break
    report.pullRequestsExamined += prs.length
    let allOlder = true
    for (const pr of prs) {
      const updated = Date.parse(pr.updated_at)
      if (updated >= cutoff) allOlder = false
      // Rule 1 — a merge, not merely a close.
      if (!pr.merged_at) continue
      if (Date.parse(pr.merged_at) < cutoff) continue
      merged.push(pr)
    }
    if (allOlder) break
    if (page >= maxPages) {
      // Rule 6 again: a paging cap that stops early has NOT surveyed the
      // window it was asked for, and must not be reported as if it had.
      report.scopesUnreadable.push({
        scope,
        reason:
          `paging cap reached (${maxPages} page(s) / ${maxPages * 100} pull requests) ` +
          `before exhausting a ${lookbackHours}h window — the survey is TRUNCATED, ` +
          `not clean. Lower CLOSER_LOOKBACK_HOURS or raise CLOSER_MAX_PAGES.`,
      })
      break
    }
    page += 1
  }
  report.pullRequestsMerged += merged.length
  report.scopesSurveyed += 1

  say(
    `  ${scope}: default \`${meta.default_branch}\`, write-ready (${permsSeen}), ` +
      `${merged.length} pull request(s) merged into \`${baseBranch}\` in the last ` +
      `${lookbackHours}h.`,
  )

  for (const pr of merged) {
    const parsed = parseClosingKeywords(pr.body, { owner, repo })
    report.ignoredMentions += parsed.ignored.length

    for (const ig of parsed.ignored) {
      say(
        `    ${scope}#${pr.number}: IGNORED "${ig.keyword} #${ig.references[0]?.number}" ` +
          `— ${ig.reason} at line ${ig.line}`,
      )
    }
    for (const x of parsed.crossRepo) {
      report.crossRepo.push({ from: `${scope}#${pr.number}`, ref: `${x.owner}/${x.repo}#${x.number}` })
    }
    if (parsed.sameRepo.length === 0) continue

    report.directivesFound += parsed.sameRepo.length
    const keyword = parsed.directives[0]?.keyword ?? 'closes'
    for (const number of parsed.sameRepo) {
      try {
        await handleIssue(owner, repo, number, {
          number: pr.number,
          merge_commit_sha: pr.merge_commit_sha,
          matchedKeyword: keyword,
          defaultBranch: meta.default_branch,
        })
      } catch (e) {
        report.errors.push(`${scope}#${number} via PR ${pr.number}: ${e.message}`)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

for (const scope of scopes) {
  // One scope throwing (rate limit, transient 5xx) must not abandon the other
  // six silently. It is recorded as unreadable, which makes the run exit
  // non-zero — a survey that skipped a repository has not surveyed the estate.
  try {
    await surveyScope(scope)
  } catch (e) {
    report.scopesUnreadable.push({ scope, reason: `aborted mid-survey: ${e.message}` })
  }
}

const headline =
  `close-merged-development-issues: ${report.scopesRequested} scope(s) requested, ` +
  `${report.scopesSurveyed} surveyed, ${report.scopesStoodDown.length} stood down, ` +
  `${report.scopesUnreadable.length} unreadable; ` +
  `${report.pullRequestsExamined} pull request(s) examined, ` +
  `${report.pullRequestsMerged} merged into \`${baseBranch}\` in the last ${lookbackHours}h; ` +
  `${report.writeReady.length} scope(s) write-ready; ` +
  `${report.directivesFound} closing directive(s) found, ` +
  `${report.ignoredMentions} mention(s) deliberately ignored, ` +
  `${report.issuesClosed.length} issue(s) closed${dryRun ? ' (DRY RUN — nothing mutated)' : ''}.`

console.log(headline)
console.log('')
for (const l of lines) console.log(l)

for (const s of report.issuesClosed) {
  console.log(`  CLOSED  ${s.ref} — merge ${s.sha?.slice(0, 12)} (PR #${s.pr})${s.dryRun ? ' [dry-run]' : ''}`)
}
for (const s of report.issuesSkipped) console.log(`  skip    ${s.ref} — ${s.reason}`)
for (const x of report.crossRepo) {
  console.log(`  MANUAL  ${x.ref} referenced from ${x.from} — cross-repo, not closed here`)
}
for (const u of report.scopesUnreadable) console.log(`::error::UNREADABLE ${u.scope} — ${u.reason}`)
for (const e of report.errors) console.log(`::error::${e}`)

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [
    '### Development-merge issue closer',
    '',
    headline,
    '',
    ...(report.issuesClosed.length
      ? ['| Issue | Merge SHA | PR |', '|---|---|---|',
         ...report.issuesClosed.map((s) => `| ${s.ref} | \`${s.sha?.slice(0, 12)}\` | #${s.pr} |`)]
      : ['No issues required closing.']),
    ...(report.crossRepo.length
      ? ['', '**Cross-repo references — close these by hand:**',
         ...report.crossRepo.map((x) => `- ${x.ref} (from ${x.from})`)]
      : []),
  ].join('\n')
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`)
}

if (report.scopesUnreadable.length > 0 || report.errors.length > 0) {
  console.log(
    '\nFAILED: a scope could not be read, or a closure errored. This run has NOT ' +
      'surveyed the estate and its zero counts mean nothing for the scopes above.',
  )
  process.exit(1)
}
