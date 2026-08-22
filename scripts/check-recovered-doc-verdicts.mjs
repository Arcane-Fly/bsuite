#!/usr/bin/env node
/**
 * scripts/check-recovered-doc-verdicts.mjs
 *
 * Every document in `docs/recovered/` must carry a VERDICT BANNER on its own
 * face, and the number that do not may only ever shrink.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `docs/recovered/` is authoritative by operator RULING 1.2 ("read
 * Dev/bsuite/docs/recovery/* before proposing anything") and simultaneously
 * untrusted by RULING 1.3 (each document must be verdicted against code before
 * it is believed). Both are true at once, and the reconciliation lives in
 * `00-READ-THIS-FIRST-corpus-health.md`.
 *
 * That reconciliation has a hole an agent walks straight through: **the warning
 * is in a different file from the trap.** `00-READ-THIS-FIRST` says, correctly,
 * that `20260304-crm7-document-lifecycle-implementation-plan-v1.00F.md` is 2,342
 * lines of instructions for a vendor rejected the same day it was written. But
 * an agent that greps for `document_signatories`, or opens the longest file in
 * the directory, or follows a link from another document, lands INSIDE the trap
 * having never seen the warning. The plan reads as an authoritative, extremely
 * detailed spec, because that is exactly what it is — for a decision that was
 * reversed before the ink dried.
 *
 * Time makes it worse, and this is the general shape, not one bad file: a
 * reversal is written into a NEW document, nobody marks the old one dead, and
 * the dead one is *older* (so it sorts first) and *more detailed* (because the
 * detail was written before the reversal made it worthless).
 *
 * A banner on the document's own face is the only version of the warning that
 * cannot be bypassed by how the reader arrived.
 *
 * ---------------------------------------------------------------------------
 * WHY A RATCHET AND NOT A HARD GATE
 * ---------------------------------------------------------------------------
 * 25 dated documents in this directory still need a verdict against code, and
 * verdicting one honestly means reading code, not skimming prose. A gate that
 * fails all 25 on day one is permanently red, and a permanently red gate gets
 * switched off — which is how the colour rule was disarmed the first time.
 *
 * So: the ceiling is the measured count today, it may only be LOWERED, and a
 * NEW unverdicted document fails immediately. Same idiom as the colour waiver
 * ledger and check-secret-naming.sh's allowlist.
 *
 * ---------------------------------------------------------------------------
 * WHAT COUNTS AS A BANNER
 * ---------------------------------------------------------------------------
 * A blockquote heading in the first BANNER_WINDOW lines whose text contains the
 * word VERDICT. Deliberately shape-based rather than a keyword anywhere in the
 * file: prose mentioning "verdict" halfway down is not a banner, and a reader
 * who opens the file must see it without scrolling.
 *
 * Usage: node scripts/check-recovered-doc-verdicts.mjs
 *        node scripts/check-recovered-doc-verdicts.mjs --list   (names them)
 *        node scripts/check-recovered-doc-verdicts.mjs --self-test
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = 'docs/recovered'
const BANNER_WINDOW = 6

/**
 * Documents that are not subject to the rule, each for a stated reason. This is
 * a list of THREE, not a pattern — a pattern would silently absorb the next
 * unverdicted file that happened to match it.
 */
const NOT_SUBJECT = new Map([
  ['00-READ-THIS-FIRST-corpus-health.md', 'the corpus-health note IS the verdict apparatus'],
  ['README.md', 'directory index, not a recovered document'],
])

/**
 * The ceiling. MEASURED on 2026-08-17 after bannering the document-lifecycle
 * chain (4 documents: the Adobe Sign implementation plan, its design spec, the
 * research document carrying the reversal, and the shipped successor).
 *
 * IT MAY ONLY GO DOWN. Lower it in the same commit that banners a document.
 * Raising it requires an operator ruling, because raising it means a document
 * was added to an authoritative directory without a verdict.
 */
// ZERO, as of 2026-08-22 — all 33 are verdicted. The ratchet's own instruction is to lower
// the ceiling in the commit that banners a document, and this is the commit that banners
// the last eight. At 0 the gate stops being a ratchet and becomes absolute: a new document
// arriving in this authoritative-but-untrusted directory without a verdict fails
// immediately, with no headroom to absorb it.
const MAX_UNVERDICTED = 0

/**
 * YAML FRONTMATTER IS NOT PART OF THE WINDOW.
 *
 * The window exists so the banner is the first thing a reader sees. Frontmatter does not
 * compete with that — a markdown renderer hides it entirely, and a reader who opens the
 * raw file reads past four metadata lines without effort. But it DOES consume the window.
 *
 * Classifying the 18 frozen documents with `kind: record` on 2026-08-22 pushed every one
 * of their banners past line 6, and this gate went from 25 bannered to 7 in a single
 * commit. Nothing had been removed. Two correct changes disagreed because one of them
 * measured position instead of visibility.
 */
function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  return end === -1 ? text : text.slice(end + 4).replace(/^\n+/, '');
}

function hasVerdictBanner(text) {
  const lines = stripFrontmatter(text).split('\n').slice(0, BANNER_WINDOW)
  for (const line of lines) {
    const t = line.trim()
    if (!t.startsWith('>')) continue
    const inner = t.replace(/^>+\s*/, '')
    if (!inner.startsWith('#')) continue
    if (inner.toUpperCase().includes('VERDICT')) return true
  }
  return false
}

function main() {
  const list = process.argv.includes('--list')
  const selfTest = process.argv.includes('--self-test')

  const dirAbs = join(REPO_ROOT, DIR)
  if (!existsSync(dirAbs)) {
    console.error(`FAIL: ${DIR} does not exist. Nothing was examined — this is not a pass.`)
    process.exit(1)
  }

  const all = readdirSync(dirAbs).filter((f) => f.endsWith('.md'))
  if (all.length === 0) {
    console.error(`FAIL: ${DIR} contains 0 markdown files. An empty scan is not a clean scan.`)
    process.exit(1)
  }

  const subject = all.filter((f) => !NOT_SUBJECT.has(f))
  const bannered = []
  const unverdicted = []

  for (const f of subject) {
    let text
    try {
      text = readFileSync(join(dirAbs, f), 'utf8')
    } catch (e) {
      console.error(`FAIL: could not read ${DIR}/${f} — ${e.message}`)
      process.exit(1)
    }
    // --self-test blinds the detector, to prove the count is produced by the
    // scan and not by a constant. A guard that reports the same number with its
    // detector removed is measuring nothing.
    if (!selfTest && hasVerdictBanner(text)) bannered.push(f)
    else unverdicted.push(f)
  }

  // ---- HEAD LINE: a non-zero count of what was examined, first --------------
  console.log(
    `${subject.length} files examined in ${DIR} — ` +
      `${bannered.length} carry a verdict banner, ${unverdicted.length} do not ` +
      `(ceiling ${MAX_UNVERDICTED}). ${NOT_SUBJECT.size} files not subject to the rule.`,
  )
  console.log(
    `A banner is a blockquote heading containing "VERDICT" in the first ${BANNER_WINDOW} lines — ` +
      `visible to a reader who arrives by grep, by link, or by opening the longest file.`,
  )

  if (list || unverdicted.length > MAX_UNVERDICTED) {
    console.log('')
    console.log('Still needing a verdict against code:')
    for (const f of unverdicted) console.log(`  - ${DIR}/${f}`)
  }

  if (selfTest) {
    console.log('')
    if (bannered.length === 0 && unverdicted.length === subject.length) {
      console.log(
        `SELF-TEST PASS: with the detector blinded, all ${subject.length} files report as ` +
          `unverdicted (${unverdicted.length} > ceiling ${MAX_UNVERDICTED}), so the guard FAILS. ` +
          `The count comes from the scan.`,
      )
      process.exit(1)
    }
    console.error('SELF-TEST FAIL: blinding the detector did not change the verdict.')
    process.exit(1)
  }

  if (unverdicted.length > MAX_UNVERDICTED) {
    console.error('')
    console.error(
      `FAIL: ${unverdicted.length} unverdicted documents, ceiling is ${MAX_UNVERDICTED}.`,
    )
    console.error(
      `A document in ${DIR} is authoritative by RULING 1.2 and untrusted by RULING 1.3 at the`,
    )
    console.error(
      `same time. Without a banner on its own face, an agent that arrives by grep or by link`,
    )
    console.error(
      `never sees the corpus-health warning — which is how 2,342 lines of instructions for a`,
    )
    console.error(`rejected vendor stayed readable as a spec for five months.`)
    process.exit(1)
  }

  console.log('')
  console.log(
    `PASS: ${unverdicted.length} unverdicted, at or below the ceiling of ${MAX_UNVERDICTED}. ` +
      `Lower the ceiling in the same commit that banners a document.`,
  )
}

main()
