#!/usr/bin/env node
/**
 * A PLAN MUST SAY WHETHER IT IS STILL THE PLAN.
 *
 * WHY THIS EXISTS
 *
 * `docs/plans/` holds 61 files. Measured 2026-09-02, **36 of them present as a
 * live board and are not one**: their filename carries a Working / Draft /
 * Active status letter, or they hold unchecked boxes, and nothing on their face
 * says the work has landed, and nothing has touched them since the last
 * promotion to production.
 *
 * So anyone — agent or person — opening that directory to find out what is
 * outstanding has 36 plausible answers and one correct one, and no marker
 * distinguishes them. That is not a documentation nicety. It is how an estate
 * rebuilds something that already exists: the plan describing the half-built
 * version reads exactly like the plan describing the work still to do.
 *
 * THE PRECEDENT IT ENFORCES ALREADY EXISTED. `STATUS.md` was banner-repaired on
 * 2026-08-17 with "⚠ HISTORICAL BOARD — do not plan from this file", and 18
 * files carry `authority: none` in their frontmatter. The repair was applied to
 * a file, not to the class. This gate applies it to the class.
 *
 * WHY A RATCHET AND NOT A RULE. 36 files cannot be judged in one change, and a
 * gate that fails on all of them from day one is a gate everyone learns to skip.
 * The count is banked; a NEW unmarked stale plan fails, and a bank that no
 * longer matches also fails, so this cannot become a place findings go to be
 * forgotten.
 *
 * WHAT IT DELIBERATELY DOES NOT COUNT
 *
 *   The R80.3 relocation blockquote. It appears in 20+ files and says nothing
 *   about whether the plan is current — treating it as a currency marker would
 *   have silently exempted half the directory.
 *
 *   Files whose status letter is F. Memory records F as the completion marker;
 *   an F file is not claiming to be live.
 *
 *   Files touched since the last merge to main. A plan someone is actively
 *   working is current by definition, whatever it says.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const DIR = 'docs/plans'
const BASELINE = 'scripts/plan-currency-baseline.json'

/**
 * Phrases that can only mean "this is not the current plan".
 *
 * DELIBERATELY NARROW. A first pass also accepted `complete`, `closed`,
 * `shipped`, `archived`, `obsolete` and `retired` as bare words, and the count
 * fell from 36 to 21 — because those words appear in the ordinary opening prose
 * of a plan that is very much live ("closes the gap", "complete the migration").
 * A gate that accepts a common word as a status marker fails OPEN, which is
 * worse than not having it: it reports a shrinking number while the class grows.
 *
 * Every phrase here is one a person only writes ABOUT the document itself.
 */
const CURRENCY_PHRASES = [
  'superseded',
  'historical',
  'not the authority',
  'do not plan from',
  'no longer the plan',
  'no longer current',
  'this document is closed',
  'this plan is closed',
  'work has landed',
  'prod-verified',
]

/**
 * The R80.3 note is in 20+ files and is about a PATH, not about currency.
 * Counting it would have exempted half the directory on a technicality.
 */
const NOT_A_CURRENCY_MARKER = 'R80.3'

export function statusLetter(filename) {
  const m = filename.match(/-v\d\.\d{2}([A-Z])\.md$/)
  return m ? m[1] : null
}

/** Does this read as a live board someone would work from? */
export function presentsAsLive(filename, body) {
  const letter = statusLetter(filename)
  if (letter === 'W' || letter === 'D' || letter === 'A') return true
  /*
   * An F file with unchecked boxes STILL counts, and that is deliberate. F is
   * the completion marker, so the filename says finished — and eleven unchecked
   * boxes on the page say otherwise. A reader believes the page, not the
   * suffix. Over-detecting is the right direction for this gate: the cost of a
   * false positive is one sentence added to a document, and the cost of a false
   * negative is somebody rebuilding what already exists.
   */
  return /^\s*[-*]\s*\[ \]/m.test(body)
}

/** Does it say, on its own face, that it is not the current plan? */
export function carriesCurrencyMarker(body) {
  // The machine-readable convention first — 18 files already use it.
  if (/^authority:\s*none\s*$/m.test(body.split('---')[1] ?? '')) return true
  const head = body.split('\n').slice(0, 30)
  for (const line of head) {
    if (line.includes(NOT_A_CURRENCY_MARKER)) continue
    const l = line.toLowerCase()
    if (CURRENCY_PHRASES.some((w) => l.includes(w))) return true
  }
  return false
}

function lastMainMergeIso() {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', 'origin/main'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function lastTouchedIso(path) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', path], { encoding: 'utf8' }).trim()
    return out || null
  } catch {
    return null
  }
}

export function scan() {
  const mainIso = lastMainMergeIso()
  const findings = []
  let live = 0
  for (const name of readdirSync(DIR).filter((f) => f.endsWith('.md')).sort()) {
    const path = `${DIR}/${name}`
    const body = readFileSync(path, 'utf8')
    if (!presentsAsLive(name, body)) continue
    live += 1
    if (carriesCurrencyMarker(body)) continue
    const touched = lastTouchedIso(path)
    // A plan someone is actively working is current whatever it says.
    if (mainIso && touched && touched >= mainIso) continue
    /*
     * ONE PROMOTION OF GRACE, MEASURED IN TIME AND NOT IN EVENTS.
     *
     * The rule above asks "was it touched since the last merge to main". A plan
     * that merges to DEVELOPMENT is, by construction, older than the next
     * promotion — so the first time main moves after a plan lands, that plan is
     * flagged, having had no opportunity to go stale.
     *
     * Measured 2026-09-04: main's last commit was 09:04:21 and three plans
     * merged at 08:47-08:55 were flagged, nine to seventeen minutes on the
     * wrong side. The two promotions before that were ten minutes apart, so
     * "since the last merge" cannot separate stale from new at all when
     * promotions run minutes apart — nothing is touched between two merges ten
     * minutes apart, stale or not.
     *
     * Staleness is a duration, so measure one. A plan committed within the last
     * day has not sat through anything yet. This narrows the gate rather than
     * widening it: everything it flagged before, it still flags a day later.
     */
    if (touched && Date.now() - Date.parse(touched) < 24 * 60 * 60 * 1000) continue
    findings.push(name)
  }
  return { findings, live, mainIso }
}

function selfTest() {
  let bad = 0
  const fail = (m) => { console.error(`  FAIL ${m}`); bad += 1 }

  // Status letters
  if (statusLetter('20260814-x-v1.00D.md') !== 'D') fail('D status letter not read')
  if (statusLetter('20260814-x-v1.00F.md') !== 'F') fail('F status letter not read')
  if (statusLetter('README.md') !== null) fail('a file with no version suffix reported a letter')

  // Presents-as-live
  if (!presentsAsLive('x-v1.00F.md', '- [ ] a box'))
    fail('an F file with UNCHECKED boxes was not treated as live — the page outranks the suffix')
  if (presentsAsLive('x-v1.00F.md', 'all done, no boxes'))
    fail('a clean F file was treated as live')
  if (!presentsAsLive('x-v1.00W.md', 'no boxes here')) fail('a W file was not treated as live')
  if (!presentsAsLive('README.md', '- [ ] still to do')) fail('unchecked boxes did not make it live')
  if (presentsAsLive('README.md', '- [x] done')) fail('a checked box made a file look live')

  // The three HITs the measurement verified by hand.
  if (!carriesCurrencyMarker('# T\n> ⚠ HISTORICAL BOARD — do not plan from this file'))
    fail('the STATUS.md banner was not recognised')
  if (!carriesCurrencyMarker('# T\nIt is not the authority on whether those items are closed.'))
    fail('the "not the authority" banner was not recognised')
  if (!carriesCurrencyMarker('# T\nStatus: A (Approved — SHIPPED + signed-in prod-verified)'))
    fail('a shipped-and-verified status line was not recognised')

  // The machine-readable convention 18 files already use.
  if (!carriesCurrencyMarker('---\nkind: record\nauthority: none\nowner: bsuite\n---\n# T'))
    fail('authority: none was not recognised')

  // THE MISS THAT MATTERS. The R80.3 note is in 20+ files and says nothing about
  // currency; counting it would exempt half the directory.
  if (carriesCurrencyMarker('# T\n> Predates the R80.3 → R80.4 restructure (2026-08-06).'))
    fail('the R80.3 relocation note was counted as a currency marker')

  // A plain plan with no marker must NOT pass — the positive control. Without
  // it, every "pass" above is indistinguishable from a detector that finds nothing.
  if (carriesCurrencyMarker('# Some plan\n\nPhase 1 — do the thing.\n'))
    fail('a plan with no marker was treated as marked')

  console.log(
    'check-plan-currency-markers --self-test: 13 assertions — status letters, what counts as ' +
      'presenting-as-live including an F file whose boxes contradict its suffix, the three real banners the measurement verified by hand, the ' +
      'authority:none convention, the R80.3 note that must NOT count, and a positive control ' +
      'that an unmarked plan is still detected.',
  )
  return bad
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  if (selfTest() !== 0) { console.error('::error::checker failed its own self-test'); process.exit(1) }

  if (!existsSync(DIR)) {
    console.error(`::error::${DIR} does not exist — nothing was checked. That is "could not measure", not a pass.`)
    process.exit(1)
  }

  const { findings, live, mainIso } = scan()
  if (!mainIso) {
    console.error(
      '::error::could not read origin/main — every plan would look stale and the count would be ' +
        'meaningless. Fetch it first: git fetch origin main',
    )
    process.exit(1)
  }

  if (process.argv.includes('--write-baseline')) {
    writeFileSync(
      BASELINE,
      `${JSON.stringify(
        {
          _comment: [
            'Plans that present as a live board, carry no currency marker, and have not been',
            'touched since the last promotion to main. This list may only SHRINK.',
            'A NEW one fails the gate; an entry that has since been marked or updated ALSO fails,',
            'so it cannot become a place findings go to be forgotten.',
            'Regenerate deliberately with --write-baseline; never to make a red run green.',
          ],
          unmarked: findings,
        },
        null,
        2,
      )}\n`,
    )
    console.log(`wrote ${BASELINE} — ${findings.length} unmarked of ${live} that present as live`)
    process.exit(0)
  }

  const banked = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).unmarked ?? [] : []
  const known = new Set(banked)
  const now = new Set(findings)

  let failed = 0
  for (const f of findings) {
    if (known.has(f)) { console.log(`  known   ${f}`); continue }
    console.error(`::error::${f} presents as a live plan, carries no currency marker, and has not been touched since the last promotion. Say on its face whether it is still the plan — 'authority: none' in the frontmatter is the machine-readable way.`)
    failed += 1
  }
  for (const f of banked) {
    if (!now.has(f)) {
      console.error(`::error::${f} is banked as unmarked but no longer is. Lower the bank in the same commit that fixes it: --write-baseline`)
      failed += 1
    }
  }

  console.log(
    `check-plan-currency-markers: ${live} of ${readdirSync(DIR).filter((f) => f.endsWith('.md')).length} ` +
      `file(s) in ${DIR} present as a live board; ${findings.length} carry no currency marker and ` +
      `predate the last promotion (banked ${banked.length}).`,
  )
  if (failed > 0) process.exit(1)
  console.log('✓ no new unmarked stale plans.')
}

main()
