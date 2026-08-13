#!/usr/bin/env node
/**
 * check-guard-self-reporting.mjs — "LANE-WATCHER", the watcher of watchers.
 *
 * The class of bug this retires: a guard that PASSES WITHOUT HAVING EXAMINED
 * ANYTHING. This estate's most-repeated failure — four fresh instances found
 * in the 24 hours before this tool was written:
 *
 *   1. check-secret-naming.sh printed PASS having read none of the source it
 *      polices — an uninitialised submodule is an empty directory, which
 *      passes `[ -d "$sub" ]`.
 *   2. check-edge-function-slug-collisions.mjs fell open the same way on an
 *      uncloned submodule, and would have deployed one repo's function over
 *      another's.
 *   3. A live security probe passed while proving nothing, because it sent
 *      `{}` and every function rejects empty JSON with a 400 before reaching
 *      its auth check.
 *   4. crm7/scripts/lint-sql-migrations.mjs exited 0 with ZERO output when
 *      run with no arguments — and, this survey (2026-08-13) found, ALSO on
 *      its real `--duplicates-only` CI invocation, a different code path the
 *      earlier fix did not cover. Fixed alongside this tool; see that
 *      script's header.
 *
 * What this tool asserts, for every guard in scripts/guard-registry.mjs: a
 * clean-pass (exit 0) run's output states a NON-ZERO count of what it
 * examined — files scanned, entries verified, scopes checked. A guard that
 * exits 0 saying nothing, or saying nothing NUMERIC, fails this check.
 *
 * HOW CLASSIFICATION WORKS — EXECUTION, NEVER SOURCE
 * ---------------------------------------------------------------------------
 * This tool does not read any guard's source code to decide anything. It
 * RUNS the command declared in the registry and inspects only what that run
 * actually printed and exited with. Classifying guards by grepping their
 * source for words like "count" or "scanned" was tried and rejected while
 * scoping this tool — it reports "reports something" for any file containing
 * the word "count" in a comment, which is the identical textual-inspection
 * mistake the guards themselves keep making (see check-secret-naming.sh's
 * own header on `[ -d "$sub" ]`). Behaviour is the only evidence that counts
 * here.
 *
 * BOOTSTRAPPING — THIS WATCHER COULD ALSO PASS HAVING WATCHED NOTHING
 * ---------------------------------------------------------------------------
 * scripts/__fixtures__/silent-canary-guard.sh is a guard engineered to fail
 * this check: it exits 0 and prints nothing. It runs on every invocation of
 * this tool, unconditionally, never behind a flag. If it is ever NOT
 * classified as a self-reporting failure — because the fixture went missing,
 * because the classifier regressed, because someone "fixed" the fixture to
 * have output — this tool refuses to certify anything else and exits
 * non-zero with a BOOTSTRAP FAILURE message. A watcher that has not been
 * seen to fail is not a watcher.
 *
 * Usage:
 *   node scripts/check-guard-self-reporting.mjs
 *   node scripts/check-guard-self-reporting.mjs --json
 *
 * Exit codes:
 *   0 — canary caught, no new (non-tracked) self-reporting failures.
 *   1 — bootstrap failure, OR at least one guard not marked `knownSilent`
 *       failed self-reporting (a new regression), OR a registry entry
 *       could not be executed at all (bad path / bad interpreter — a
 *       registry bug, not a guard bug, but still something CI must not
 *       wave through silently).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUARDS } from './guard-registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const TIMEOUT_MS = 90_000

// ---------------------------------------------------------------------------
// Denominator extraction — the heart of the classifier.
//
// A clean-pass line "states a non-zero denominator" when it contains a
// positive integer immediately governed (within a few modifier words, e.g.
// "181 in-scope SECURITY DEFINER public function(s)") by a noun describing
// something that was examined. The noun list below is deliberately built
// FROM REAL OUTPUT this survey collected by running every guard in the
// registry (see each entry's `evidence` field) — not guessed in the
// abstract. Extend it when a new guard's honest, real "OK" line does not
// match; do not narrow it to make a specific guard look better.
//
// [1-9][0-9,]* excludes bare "0" on purpose: a guard that states "0 files
// scanned" has told the truth about examining nothing, which is exactly the
// failure this tool exists to catch, not a pass dressed up with a digit.
// ---------------------------------------------------------------------------
const DENOMINATOR_NOUNS = [
  'files?', 'entr(?:y|ies)', 'scopes?', 'submodules?', 'functions?', 'slugs?',
  'migrations?', 'polic(?:y|ies)', 'rules?', 'apps?', 'routes?', 'paths?',
  'lines?', 'match(?:es)?', 'records?', 'rows?', 'items?', 'components?',
  'pages?', 'assertions?', 'cases?', 'tests?', 'grants?', 'tables?',
  'columns?', 'references?', 'violations?', 'collisions?', 'checks?',
  'scans?', 'declarations?', 'signals?', 'hits?', 'digests?', 'symbols?',
  'endpoints?', 'imports?', 'exports?', 'directories?', 'dirs?', 'packages?',
  'workflows?', 'secrets?', 'keys?', 'schemas?', 'manifests?', 'pairs?',
  'fix(?:es)?', 'reads?', 'markers?', 'scope\\(s\\)', 'file\\(s\\)',
  'entry\\(s\\)', 'slug\\(s\\)', 'function\\(s\\)', 'collision\\(s\\)',
  'manifest\\(s\\)', 'lockfile\\(s\\)', 'pair\\(s\\)', 'fix\\(es\\)',
  'declaration\\(s\\)', 'scripts?', 'oklch', 'hex', 'colou?rs?', 'literals?',
]
const DENOMINATOR_RE = new RegExp(
  String.raw`\b([1-9][0-9,]*)(?:\s*/\s*[0-9]+)?(?:\s+[a-zA-Z][a-zA-Z()/_-]*){0,5}?\s+(?:${DENOMINATOR_NOUNS.join('|')})\b`,
  'i',
)

// For guards whose "examined nothing" case can be a LEGITIMATE zero (a
// diff-scoped forward gate on a PR that touches no relevant files): accept
// an explicit, referenced zero as evidence the diff computation itself ran,
// rather than requiring a positive count that would be dishonest to print.
const DIFF_CONTEXT_RE = /\b(?:no changed|0 changed|scanning changed)\b[\s\S]{0,160}?\b(?:vs\.?|against|compared to)\s+\S+/i

// Evidence is reported as the whole LINE the match was found on (trimmed),
// not the bare regex match — a match can legitimately stop at the first
// noun it recognises ("27 package" satisfies the pattern before reaching
// "manifest(s)"), and the full line is what a human reviewing this report
// actually wants to see.
function lineContaining(text, matchIndex) {
  const start = text.lastIndexOf('\n', matchIndex) + 1
  const end = text.indexOf('\n', matchIndex)
  return text.slice(start, end === -1 ? text.length : end).trim()
}

function classifyOutput(combinedOutput, { diffScoped }) {
  const trimmed = combinedOutput.trim()
  if (trimmed === '') return { ok: false, reason: 'exited 0 with zero output' }
  const denomMatch = combinedOutput.match(DENOMINATOR_RE)
  if (denomMatch) {
    return { ok: true, evidence: lineContaining(combinedOutput, denomMatch.index) }
  }
  if (diffScoped) {
    const diffMatch = combinedOutput.match(DIFF_CONTEXT_RE)
    if (diffMatch) {
      return { ok: true, evidence: lineContaining(combinedOutput, diffMatch.index) }
    }
  }
  return {
    ok: false,
    reason: 'exited 0 but never stated a non-zero count of anything examined',
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
function runGuard(guard) {
  const cwd = path.join(REPO_ROOT, guard.repo)
  const [cmd, ...args] = guard.command
  let result
  try {
    result = spawnSync(cmd, args, {
      cwd,
      encoding: 'utf8',
      timeout: guard.timeoutMs ?? TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (err) {
    return { executed: false, error: `spawn threw: ${err.message}` }
  }
  if (result.error) {
    return { executed: false, error: `spawn error: ${result.error.message}` }
  }
  if (result.signal) {
    return { executed: false, error: `killed by signal ${result.signal} (timeout or resource limit)` }
  }
  const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`
  return { executed: true, exitCode: result.status, output: combined }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const jsonMode = process.argv.includes('--json')

const canaryEntry = GUARDS.find((g) => g.mode === 'canary')
if (!canaryEntry) {
  console.error(
    'guard-self-reporting: BOOTSTRAP FAILURE — no `canary` entry in guard-registry.mjs. ' +
      'This watcher has no way to prove it can still fail, so it refuses to certify anything.',
  )
  process.exit(1)
}
const canaryFile = path.join(REPO_ROOT, canaryEntry.repo, canaryEntry.command[1])
if (!fs.existsSync(canaryFile)) {
  console.error(
    `guard-self-reporting: BOOTSTRAP FAILURE — canary fixture missing at ${canaryFile}. ` +
      'A watcher that cannot find its own positive control cannot be trusted to have found ' +
      'anything else either. Restore scripts/__fixtures__/silent-canary-guard.sh.',
  )
  process.exit(1)
}
const canaryRun = runGuard(canaryEntry)
if (!canaryRun.executed) {
  console.error(
    `guard-self-reporting: BOOTSTRAP FAILURE — could not even execute the canary (${canaryRun.error}).`,
  )
  process.exit(1)
}
const canaryVerdict =
  canaryRun.exitCode === 0
    ? classifyOutput(canaryRun.output, { diffScoped: false })
    : { ok: false, reason: `unexpectedly exited ${canaryRun.exitCode}` }
if (canaryVerdict.ok) {
  console.error(
    'guard-self-reporting: BOOTSTRAP FAILURE — the deliberately silent canary ' +
      '(scripts/__fixtures__/silent-canary-guard.sh) was classified as a PASS. ' +
      'The watcher has stopped being able to tell a silent guard from a real one. ' +
      'Nothing below this line can be trusted; fix the classifier before reading further.',
  )
  process.exit(1)
}

// Canary correctly caught. Proceed to the real registry.
const results = []
for (const guard of GUARDS) {
  if (guard.mode === 'canary') continue

  if (guard.mode === 'skip') {
    results.push({ guard, status: 'SKIPPED' })
    continue
  }

  const run = runGuard(guard)
  if (!run.executed) {
    results.push({ guard, status: 'COULD_NOT_EXECUTE', detail: run.error })
    continue
  }

  if (run.exitCode !== 0) {
    // Out of scope by design: this tool targets false PASSES specifically.
    // A non-zero exit means the guard found something (or refused, per its
    // own CANNOT-REPORT-style contract) — informative, but not the bug
    // class under test. Still note total silence on a non-zero exit as a
    // secondary observation; it is a related but different defect.
    results.push({
      guard,
      status: 'NOT_EVALUATED',
      exitCode: run.exitCode,
      emptyOutput: run.output.trim() === '',
    })
    continue
  }

  const verdict = classifyOutput(run.output, { diffScoped: !!guard.diffScoped })
  if (verdict.ok) {
    if (guard.knownSilent) {
      results.push({ guard, status: 'STALE_KNOWN_SILENT', evidence: verdict.evidence })
    } else {
      results.push({ guard, status: 'PASS', evidence: verdict.evidence })
    }
  } else if (guard.knownSilent) {
    results.push({ guard, status: 'KNOWN_FAILURE', reason: verdict.reason, sample: run.output.slice(0, 300) })
  } else {
    results.push({ guard, status: 'FAIL', reason: verdict.reason, sample: run.output.slice(0, 300) })
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const counts = results.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1
  return acc
}, {})
const total = GUARDS.length // includes the canary
const executed = results.filter((r) => r.status === 'PASS' || r.status === 'KNOWN_FAILURE' || r.status === 'FAIL' || r.status === 'STALE_KNOWN_SILENT').length

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        totalEnumerated: total,
        executed,
        counts,
        canary: { ok: true, note: 'silent canary correctly flagged' },
        results: results.map((r) => ({
          id: r.guard.id,
          label: r.guard.label,
          repo: r.guard.repo,
          status: r.status,
          evidence: r.evidence,
          reason: r.reason,
          skipReason: r.guard.skipReason,
        })),
      },
      null,
      2,
    ),
  )
} else {
  console.log('guard-self-reporting (LANE-WATCHER): canary correctly caught (silent-fixture flagged).\n')

  const section = (title, items, fmt) => {
    if (items.length === 0) return
    console.log(`${title} (${items.length})`)
    for (const r of items) console.log(fmt(r))
    console.log('')
  }

  section('PASS — states a non-zero denominator', results.filter((r) => r.status === 'PASS'),
    (r) => `  ok    ${r.guard.id}\n        ${r.evidence}`)

  section('FAIL — new self-reporting regression (not previously tracked)', results.filter((r) => r.status === 'FAIL'),
    (r) => `  FAIL  ${r.guard.id} — ${r.reason}\n        sample: ${JSON.stringify(r.sample)}`)

  section('KNOWN_FAILURE — tracked, pre-existing gap (see guard-registry.mjs knownSilentReason)', results.filter((r) => r.status === 'KNOWN_FAILURE'),
    (r) => `  known ${r.guard.id} — ${r.reason}\n        ${r.guard.knownSilentReason}`)

  section('STALE_KNOWN_SILENT — marked knownSilent but now passes; remove the flag in guard-registry.mjs', results.filter((r) => r.status === 'STALE_KNOWN_SILENT'),
    (r) => `  stale ${r.guard.id}\n        now: ${r.evidence}`)

  section('NOT_EVALUATED — guard found real findings on this tree (exit != 0); out of scope for this check', results.filter((r) => r.status === 'NOT_EVALUATED'),
    (r) => `  n/a   ${r.guard.id} — exit ${r.exitCode}${r.emptyOutput ? ' (AND empty output — worth a look separately)' : ''}`)

  section('COULD_NOT_EXECUTE — registry/environment problem, not a guard verdict', results.filter((r) => r.status === 'COULD_NOT_EXECUTE'),
    (r) => `  ERR   ${r.guard.id} — ${r.detail}`)

  section('SKIPPED — declared un-runnable in this context (see guard-registry.mjs skipReason)', results.filter((r) => r.status === 'SKIPPED'),
    (r) => `  skip  ${r.guard.id} — ${r.guard.skipReason}`)

  console.log(
    `guard-self-reporting: ${total} guard(s) enumerated (incl. canary), ${executed} executed and classified, ` +
      `${counts.PASS ?? 0} pass, ${counts.FAIL ?? 0} new failure(s), ${counts.KNOWN_FAILURE ?? 0} tracked known-failure(s), ` +
      `${counts.STALE_KNOWN_SILENT ?? 0} stale known-silent entr(y/ies), ${counts.NOT_EVALUATED ?? 0} not evaluated (real findings), ` +
      `${counts.COULD_NOT_EXECUTE ?? 0} could not execute, ${counts.SKIPPED ?? 0} skipped.`,
  )
}

const hardFail = (counts.FAIL ?? 0) > 0 || (counts.COULD_NOT_EXECUTE ?? 0) > 0
if (hardFail) {
  if (!jsonMode) {
    console.error(
      '\nguard-self-reporting: FAIL — new self-reporting regression(s) and/or registry entries ' +
        'that could not be executed. See sections above.',
    )
  }
  process.exit(1)
}

if (!jsonMode) console.log('\nguard-self-reporting: PASS')
process.exit(0)
