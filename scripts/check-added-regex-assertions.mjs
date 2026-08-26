#!/usr/bin/env node
/**
 * DID THIS DIFF ADD A REGEX ASSERTION?
 *
 * Operator, 2026-08-26: "Regex is forbidden for being brittle."
 *
 *   expect(t.title).not.toMatch(/invitation sent/i)
 *
 * Brittle in BOTH directions, and the second is the dangerous one: reword the
 * COPY and a correct implementation fails; reword the FAILURE message and the
 * assertion stops matching and PASSES while the code still misbehaves.
 *
 * WHY THE DIFF AND NOT A COUNT. Two earlier designs measured a total — first
 * against a committed baseline, then against the merge-base — and both were wrong
 * for the same reason: the scan walks SUBMODULE trees, which move when a gitlink
 * advances, so the number changes for reasons unrelated to the PR. The baseline
 * version fired twice on its own PR in opposite directions. The merge-base version
 * could not even run, because a historical gitlink often names a submodule commit
 * that no longer exists on the remote ("not our ref").
 *
 * The question was never "how many are there". It is "did THIS change add one",
 * and the diff answers that directly, needs no checkout, and cannot drift.
 *
 * Reads a unified diff on stdin.
 */
const MATCHERS = ['toMatch', 'toThrow', 'toThrowError', 'stringMatching', 'toHaveBeenCalledWith']
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/

/** A single ADDED line, already comment-stripped, carrying `matcher(/…/)`. */
export function addsRegexAssertion(line) {
  // A line that is entirely a comment is prose, not an assertion. Counting it
  // makes the file that DOCUMENTS the fix read as a violation — that happened to
  // three separate greps on 2026-08-26.
  const t = line.trim()
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false
  const code = t.split('//')[0]
  for (const m of MATCHERS) {
    let from = 0
    for (;;) {
      const at = code.indexOf(`${m}(`, from)
      if (at === -1) break
      from = at + m.length + 1
      let j = from
      while (j < code.length && code[j] === ' ') j += 1
      if (code[j] === '/') return true
    }
  }
  return false
}

export function scanDiff(diff) {
  const hits = []
  let file = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) { file = line.slice(6); continue }
    if (!file || !TEST_FILE.test(file)) continue
    if (!line.startsWith('+') || line.startsWith('+++')) continue
    if (addsRegexAssertion(line.slice(1))) hits.push({ file, line: line.slice(1).trim() })
  }
  return hits
}

import { fileURLToPath } from 'node:url'
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  const hits = scanDiff(Buffer.concat(chunks).toString('utf8'))
  if (hits.length === 0) {
    console.log('no regex assertions added by this diff')
    process.exit(0)
  }
  console.error(`::error::this diff ADDS ${hits.length} regex assertion(s). Assert the OUTCOME, not the wording — return a named outcome from a pure function and assert which one was chosen. Regex is forbidden (operator, 2026-08-26).`)
  for (const h of hits) console.error(`  ${h.file}\n    ${h.line}`)
  process.exit(1)
}
