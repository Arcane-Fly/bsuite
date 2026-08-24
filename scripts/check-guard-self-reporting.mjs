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
import { GUARDS, GUARD_FLOOR, validateRegistry } from './guard-registry.mjs'

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
  // ADDED 2026-08-17 (bsuite register V-10). `cases?` and `references?` were
  // already listed, but the stemmer below is ASYMMETRIC for nouns ending in
  // `e`: it strips the `es` suffix, so the list entry `cases?` stems to `cas`
  // while the estate's own house style `35 case(s)` stems to `case`, and the
  // two never meet. That is why `file(s)`, `scope(s)`, `slug(s)` and friends
  // all had to be added in paren form further up — same bug, worked around one
  // noun at a time. An honest guard printing "35 case(s) executed" was
  // classified as having "never stated a non-zero count of anything examined".
  //
  // Additive only, and deliberately so: this can only let the classifier
  // RECOGNISE more honest denominators. A guard that states nothing, or states
  // zero, still fails — `positiveCount` excludes a bare 0 independently.
  // The stemmer itself is left alone; correcting it would restem every noun in
  // this list at once and reclassify guards across seven repositories, which is
  // not a change to make as a side effect of an unrelated lane.
  'case\\(s\\)', 'reference\\(s\\)', 'directive\\(s\\)', 'issue\\(s\\)',
  'directives?', 'issues?', 'mentions?', 'keywords?',
]
// REGEX IS FORBIDDEN IN THIS ESTATE — hand-written scanners, AST walks, real
// tokenisers (Tier 2 doctrine). The first version of this classifier composed
// a `new RegExp` from the noun list above with nested quantifiers and
// alternation, which is exactly what that doctrine bans and exactly the shape
// the colour rule was rewritten AWAY from after its regex silently matched
// `#ffffff00` as safe. A guard-of-guards has to meet the bar it enforces, so
// the matching below is a token walk.
//
// Nouns are normalised to a bare stem once, at load, rather than carrying
// `?`/`(?:…)` inflection markers. `file(s)`, `files`, `file` and `FILE(S)` all
// reduce to `file`.
function stemNoun(word) {
  let w = word.toLowerCase()
  // Trailing punctuation a sentence can attach: "files," "files:" "files."
  while (w.length > 0 && ':,.;)'.includes(w[w.length - 1]) && !w.endsWith('(s)')) {
    w = w.slice(0, -1)
  }
  for (const suffix of ['(es)', '(s)', 'ies', 'es', 's']) {
    if (w.length > suffix.length && w.endsWith(suffix)) {
      return suffix === 'ies' ? `${w.slice(0, -3)}y` : w.slice(0, -suffix.length)
    }
  }
  return w
}

const NOUN_STEMS = new Set(
  DENOMINATOR_NOUNS
    // The list is authored with regex inflection markers; strip them to stems.
    .map((n) => n.replace('\\(s\\)', '').replace('\\(es\\)', ''))
    .map((n) => n.split('(')[0])
    .map((n) => (n.endsWith('?') ? n.slice(0, -1) : n))
    .map(stemNoun)
    .filter((n) => n !== ''),
)

/**
 * Is this token a positive integer count — "12", "1,204", "25/30", "(10"? Never "0".
 *
 * Leading punctuation is stripped because guards write counts inside brackets:
 * `self-test OK (10 cases)`. The regex this replaced used `\b`, which crossed
 * the `(` for free; a naive token walk does not, and dropping that case
 * silently reclassified a passing guard as silent — caught by diffing the full
 * classification against the pre-rewrite baseline rather than by reading the
 * code.
 */
function positiveCount(token) {
  let head = token.split('/')[0]
  let i = 0
  while (i < head.length && '([{"\''.includes(head[i])) i += 1
  head = head.slice(i)
  if (head.length === 0) return false
  if (head[0] < '1' || head[0] > '9') return false // excludes a bare 0 on purpose
  for (const ch of head) {
    if ((ch < '0' || ch > '9') && ch !== ',') return false
  }
  return true
}

/** Character offset of the Nth whitespace-delimited token. */
function tokenOffsets(text) {
  const out = []
  let i = 0
  while (i < text.length) {
    while (i < text.length && /* whitespace */ ' \t\n\r'.includes(text[i])) i += 1
    if (i >= text.length) break
    const start = i
    while (i < text.length && !' \t\n\r'.includes(text[i])) i += 1
    out.push({ text: text.slice(start, i), index: start })
  }
  return out
}

/**
 * Find a positive integer governed by a denominator noun within the next few
 * tokens — "181 in-scope SECURITY DEFINER public function(s)".
 *
 * The 6-token window is the same span the old pattern allowed and exists for
 * exactly that shape: modifiers sit between the number and the noun.
 */
function findDenominator(text) {
  const tokens = tokenOffsets(text)
  for (let i = 0; i < tokens.length; i += 1) {
    if (!positiveCount(tokens[i].text)) continue
    const limit = Math.min(tokens.length, i + 7)
    for (let j = i + 1; j < limit; j += 1) {
      if (NOUN_STEMS.has(stemNoun(tokens[j].text))) return tokens[i].index
    }
  }
  return -1
}

// For guards whose "examined nothing" case can be a LEGITIMATE zero (a
// diff-scoped forward gate on a PR that touches no relevant files): accept
// an explicit, referenced zero as evidence the diff computation itself ran,
// rather than requiring a positive count that would be dishonest to print.
const DIFF_PHRASES = ['no changed', '0 changed', 'scanning changed']
const DIFF_CONNECTIVES = ['vs.', 'vs ', 'against ', 'compared to ']

/** A diff-scoped guard must name what it diffed AGAINST, within ~160 chars. */
function findDiffContext(text) {
  const hay = text.toLowerCase()
  for (const phrase of DIFF_PHRASES) {
    let from = 0
    for (;;) {
      const at = hay.indexOf(phrase, from)
      if (at === -1) break
      const window = hay.slice(at, at + 160 + phrase.length)
      for (const conn of DIFF_CONNECTIVES) {
        const cAt = window.indexOf(conn)
        // Require a non-space token AFTER the connective — "against" alone is
        // not a reference, "against origin/main" is.
        if (cAt !== -1 && window.slice(cAt + conn.length).trim() !== '') return at
      }
      from = at + 1
    }
  }
  return -1
}

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

/**
 * THE LAUNDERED WAIVER — a guard that SKIPPED is reported as one that PASSED.
 *
 * Broadcast by the R80.4 lane on 2026-08-22 and it applies to every lane, so it is
 * checked here rather than fixed once: `dod.mjs` marked a self-waived benchmark
 * `pass: true, waived: true`, the roll-up filtered on `!x.pass`, and the waived rows
 * fell on the floor. Twenty-one awards printed CLEAN while two of eighteen benchmarks
 * had measured NOTHING. It survived five days because the PER-SUBJECT report was honest
 * — it printed WAIVE — and the AGGREGATE is the line anyone actually quotes.
 *
 * That defect passes the denominator check above untouched: the guard still states a
 * positive count of things examined. What it does not state is how many it DECLINED to
 * examine. So the count is true and the impression is false.
 *
 * Their three-question test, applied here to every guard in the estate at once:
 *   1. does the output have a skip / waive / N/A path?
 *   2. does that path reach the same exit code as a real pass?  (it did — we are in
 *      the exit-0 branch)
 *   3. does the summary distinguish them?
 *
 * Only 3 needs measuring, and it is measurable: if the output names a waiver, some line
 * must also carry a COUNT of them. Make the absent measurement louder than the pass
 * count, because it is the surprising fact.
 */
// A WAIVER WORD MUST STAND ALONE. `\b` matches inside a hyphenated compound, so
// `below-floor-excluded` — the NAME of a self-test case — read as a waiver claim, and
// check-schema-lag was reported for laundering a waiver it does not have. Two of the
// four findings on this rule's first run were that; the other two counted their skips
// with the number AFTER the noun. Every one of the four was this rule's own bug.
const WAIVER_WORDS = /(?<![A-Za-z0-9-])(skip|skips|skipped|skipping|waive|waived|waiver|waivers|not applicable|n\/a|excluded|exempt|exempted|unevaluable)(?![A-Za-z0-9-])/i;
const WAIVER_NOUNS = new Set(['skip', 'skips', 'skipped', 'waiver', 'waivers', 'waived', 'exempt', 'exempted', 'exemption', 'exemptions', 'excluded', 'unevaluable', 'unknown']);

/**
 * A PER-CASE RESULT LINE IS NOT A WAIVER CLAIM.
 *
 * `test-theme-audit-gates.sh` prints `ok  oklch(from …) is skipped (count=4, exit=1)` —
 * the NAME of a self-test case, describing what the gate was proven to do. Reading that
 * as "this run waived something" flagged two guards that waive nothing at all.
 *
 * R804's finding is explicitly about the AGGREGATE — "the line anyone actually quotes".
 * So the per-case lines come out before the test, and what remains is the summary prose
 * where a laundered waiver would actually mislead.
 */
const CASE_LINE = /^\s*(?:[-*]\s*)?(?:ok|OK|✓|✗|×|PASS|FAIL|SKIP|skip)\b/;
export function summaryProse(text) {
  return text.split('\n').filter((l) => !CASE_LINE.test(l)).join('\n');
}

export function waiverWithoutCount(raw) {
  const text = summaryProse(raw);
  if (!WAIVER_WORDS.test(text)) return false;
  const tokens = tokenOffsets(text);
  // TOKEN SHAPES A COUNT ACTUALLY TAKES. `positiveCount` deliberately rejects a bare
  // zero, which is right for a denominator and wrong here — "0 waived" is the most
  // honest possible statement. `sync-inline-eslint-rules` prints a whole WAIVER BUDGET
  // section reading `0/0 waived` per rule, and this rule reported that model citizen as
  // a launderer because it could not parse `0/0`. Accept the ratio and `count=N` forms.
  const isCount = (t) =>
    positiveCount(t) ||
    /^\d+[,.:;)]*$/.test(t) ||          // any bare integer, zero included
    /^\d+\/\d+[,.:;)]*$/.test(t) ||     // a ratio: 0/0, 16/18
    /^[a-z_]+[=:]\d+/i.test(t);         // count=4, total:12
  let sawCountedWaiver = false;
  let sawWaiverNoun = false;
  for (let i = 0; i < tokens.length; i += 1) {
    const w = tokens[i].text.toLowerCase().replace(/[^a-z/]/g, '');
    if (!WAIVER_NOUNS.has(w)) continue;
    sawWaiverNoun = true;
    // A COUNT MAY SIT ON EITHER SIDE OF ITS NOUN. English puts it before ("5 skipped")
    // and a report line puts it after ("skipped as HISTORICAL: 50"). The first version
    // looked forward only and called two honest guards dishonest.
    const lo = Math.max(0, i - 7), hi = Math.min(tokens.length, i + 8);
    for (let j = lo; j < hi; j += 1) {
      if (j !== i && isCount(tokens[j].text)) { sawCountedWaiver = true; break; }
    }
  }
  // ANY counted waiver mention makes the output honest — do NOT return on the first
  // UNcounted one. `sync-inline-eslint-rules` prints a section HEADER, "WAIVER BUDGET
  // (per rule — a waived copy is a submodule running a rule the monorepo did not
  // sanction):", and then the counts on the three lines beneath it. Returning at the
  // header reported a guard that publishes a whole waiver budget as one that hides
  // waivers, which is precisely backwards.
  //
  // R804's test is "does your top-line summary DISTINGUISH them?" — a budget section
  // distinguishes them. This is deliberately the forgiving reading: the cost of a false
  // FAIL is a blocked promotion on a guard telling the truth, and this rule has now
  // produced five of those against zero real finds.
  if (!sawWaiverNoun) return false;   // waiver LANGUAGE but no waiver NOUN
  return !sawCountedWaiver;
}
// KNOWN LIMIT, stated rather than papered over: adjacency cannot tell which noun a count
// belongs to. "6 apps scanned. Two were exempt." reads as counted, because `6` falls in
// the window around `exempt` — and a spelled-out "Two" is not a count this can see.
// Deliberately left as a false NEGATIVE. The other direction blocks a promotion on a
// guard that is telling the truth, and this rule's first run produced four of those.
// findDenominator carries the same ambiguity for the same reason.

function classifyOutput(combinedOutput, { diffScoped }) {
  const trimmed = combinedOutput.trim()
  if (trimmed === '') return { ok: false, reason: 'exited 0 with zero output' }
  const denomAt = findDenominator(combinedOutput)
  if (denomAt !== -1) {
    if (waiverWithoutCount(combinedOutput)) {
      return {
        ok: false,
        reason:
          'stated a count of what it examined, but names a skip/waive/exempt path ' +
          'without ever counting it — the laundered waiver (R80.4 broadcast 2026-08-22). ' +
          'A reader quotes the aggregate, not the per-subject lines.',
      }
    }
    return { ok: true, evidence: lineContaining(combinedOutput, denomAt) }
  }
  if (diffScoped) {
    const diffAt = findDiffContext(combinedOutput)
    if (diffAt !== -1) {
      return { ok: true, evidence: lineContaining(combinedOutput, diffAt) }
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

// STRUCTURAL INTEGRITY FIRST. A registry entry can be swallowed by a missing '},' +
// '{' — JavaScript keeps the last duplicate key and reports nothing — so this watcher
// would happily certify a run over a list one guard shorter than the file looks. That
// is exactly how `parent-setup-node-pnpm-guard` went unwatched. Check the shape of the
// list before drawing any conclusion from its contents.
// The SOURCE is passed, not just the parsed array. A merged entry is invisible to any
// check that only sees GUARDS, because by then the swallowed entry does not exist — and
// the count floor cannot help either when the floor was recorded from an already-reduced
// list, which is exactly how two guards stayed dark after the first one was repaired.
const registrySource = fs.readFileSync(path.join(__dirname, 'guard-registry.mjs'), 'utf8')
const registryProblems = validateRegistry(GUARDS, registrySource)
if (registryProblems.length > 0) {
  console.error(
    `guard-self-reporting: BOOTSTRAP FAILURE — guard-registry.mjs is structurally unsound ` +
      `(${GUARDS.length} entries exposed, floor ${GUARD_FLOOR}). A watcher cannot certify a ` +
      `registry it cannot trust:`,
  )
  for (const problem of registryProblems) console.error(`  - ${problem}`)
  process.exit(1)
}

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

// SECOND CANARY — a different defect needs a different control.
//
// The silent canary above proves the watcher can spot a guard that examined NOTHING.
// It cannot prove anything about a guard that examined MOST things and let the rest fall
// on the floor: that guard states a real count and sails through the denominator check.
// So the laundered-waiver rule gets its own positive control, or it is a rule nobody has
// ever seen fire.
const launderFixture = path.join(REPO_ROOT, 'scripts/__fixtures__/laundered-waiver-canary-guard.sh')
if (!fs.existsSync(launderFixture)) {
  console.error(
    `guard-self-reporting: BOOTSTRAP FAILURE — laundered-waiver canary missing at ${launderFixture}. ` +
      'The watcher cannot show that its waiver rule still fires, so it refuses to certify anything.',
  )
  process.exit(1)
}
const launderRun = runGuard({ repo: '.', command: ['bash', 'scripts/__fixtures__/laundered-waiver-canary-guard.sh'] })
const launderVerdict =
  launderRun.executed && launderRun.exitCode === 0
    ? classifyOutput(launderRun.output, { diffScoped: false })
    : { ok: true, reason: 'fixture did not run cleanly' }
if (launderVerdict.ok) {
  console.error(
    'guard-self-reporting: BOOTSTRAP FAILURE — the laundered-waiver canary ' +
      '(scripts/__fixtures__/laundered-waiver-canary-guard.sh) was classified as a PASS. ' +
      'It states a real count AND names a waiver it never counts, which is exactly the ' +
      'shape R80.4 broadcast on 2026-08-22. The waiver rule has stopped firing.',
  )
  process.exit(1)
}
console.log('guard-self-reporting (LANE-WATCHER): laundered-waiver canary correctly caught.')

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
