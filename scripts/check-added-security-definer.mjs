#!/usr/bin/env node
/**
 * DID THIS DIFF ADD A SECURITY DEFINER FUNCTION WITHOUT JUSTIFYING IT?
 *
 * A SECURITY DEFINER function runs with the DEFINER's privileges, so it is the
 * one place in the schema where a caller's own RLS does not apply. That is often
 * exactly right — an RLS helper called from a policy USING clause would be
 * useless as INVOKER — and occasionally an IDOR waiting to be found.
 *
 * The estate already decided how to tell those apart. Phase 2.1A/2.1B annotated
 * every SECURITY DEFINER function with `@SD-JUSTIFICATION`, `@SD-CATEGORY` and
 * `@SD-AUDIT`, and Phase 2.3 then revoked public EXECUTE on the categories that
 * did not need it (see supabase/migrations/README.md).
 *
 * MEASURED 2026-08-26 against production: 137 SECURITY DEFINER functions are
 * executable by `authenticated`. 62 carry the annotation. 75 do not — they were
 * added after Phase 2.1 and nothing asked them to justify themselves. All 7
 * `anon`-executable ones are also unannotated.
 *
 * This gate does not fix those 75. It stops them becoming 76, which is the only
 * move available when a backlog is larger than any one change should touch.
 *
 * WHY THE DIFF, NOT A COUNT. A total measured across submodule trees moves
 * whenever a gitlink advances, so a count-based gate blames a PR for changes it
 * did not make. That mistake was made twice today on the regex ratchet before it
 * was corrected. The question is "did THIS change add one", and the diff answers
 * it directly.
 *
 * Reads a unified diff on stdin.
 */
/** `/* … *​/` spanning lines; named so the strip reads as intent, not noise. */
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g

const ANNOTATIONS = ['@SD-JUSTIFICATION']

/**
 * Added lines only, grouped per file, then scanned for a CREATE ... FUNCTION
 * carrying SECURITY DEFINER. The justification must appear in the SAME added
 * block — an annotation elsewhere in the file may belong to a different function.
 */
export function scanDiff(diff) {
  const findings = []
  let file = null
  let added = []

  const flush = () => {
    if (!file || added.length === 0) return
    const text = added.join('\n')
    // Split BEFORE each CREATE so one file with several is judged per-function.
    const parts = text.split(/(?=create\s+(?:or\s+replace\s+)?function)/i)
    // The annotation is written ABOVE the CREATE, so splitting here orphans it in
    // the PRECEDING part. Carry each part's trailing comment lines forward, or a
    // correctly justified function reads as unjustified — caught by the
    // "one justified, one not" self-test, which returned 2 instead of 1.
    const trailingComments = (chunk) => {
      const out = []
      for (const l of chunk.split('\n').reverse()) {
        const t = l.trim()
        if (t === '') { out.push(l); continue }
        if (t.startsWith('--') || t.startsWith('/*') || t.startsWith('*')) { out.push(l); continue }
        break
      }
      return out.reverse().join('\n')
    }
    /*
     * THE PHRASE IN A COMMENT IS NOT A USE OF IT.
     *
     * `security definer` was matched against the raw added text, so a migration
     * that merely EXPLAINED why it did not need the construct was flagged as
     * using it. That happened on 2026-09-02 to a function whose comment read
     * "stated by omission of" the phrase — prose about it, indistinguishable
     * from it to a scanner reading lines.
     *
     * The ANNOTATIONS are still checked against the RAW text, deliberately,
     * because @SD-JUSTIFICATION lives in a comment by design. Only the
     * DETECTION reads code-only; the justification still reads everything.
     *
     * String literals are not stripped: the phrase inside a quoted string is
     * vanishingly rare, and over-flagging is the right direction for a
     * security gate to err in.
     */
    const codeOnly = (text) =>
      text
        .replace(BLOCK_COMMENT, ' ')
        .split('\n')
        .map((l) => {
          const i = l.indexOf('--')
          return i === -1 ? l : l.slice(0, i)
        })
        .join('\n')

    for (let i = 0; i < parts.length; i += 1) {
      const part = (i > 0 ? trailingComments(parts[i - 1]) + '\n' : '') + parts[i]
      if (!/create\s+(?:or\s+replace\s+)?function/i.test(codeOnly(part))) continue
      if (!/security\s+definer/i.test(codeOnly(part))) continue
      if (ANNOTATIONS.some((a) => part.includes(a))) continue
      const name = part.match(/function\s+([a-z0-9_."]+)\s*\(/i)?.[1] ?? '(unnamed)'
      findings.push({ file, name })
    }
    added = []
  }

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) { flush(); file = line.slice(6); continue }
    if (!file) continue
    if (line.startsWith('+') && !line.startsWith('+++')) added.push(line.slice(1))
  }
  flush()
  return findings
}

/**
 * SELF-TEST. The docblock above cites a "one justified, one not" self-test that
 * caught a real parsing bug — and no --self-test flag existed to run it. A gate
 * whose own header describes tests it cannot run is a gate nobody can prove
 * still detects, which is the shape of every finding in this estate's register.
 *
 * Run: node scripts/check-added-security-definer.mjs --self-test
 */
function selfTest() {
  let bad = 0
  const fail = (m) => { console.error(`  FAIL ${m}`); bad += 1 }
  const diff = (body) => `+++ b/supabase/migrations/x.sql\n${body.split('\n').map((l) => `+${l}`).join('\n')}\n`

  // POSITIVE CONTROL FIRST. If this stops detecting, every "pass" below is
  // meaningless — a gate that finds nothing is indistinguishable from a clean diff.
  {
    const hits = scanDiff(diff([
      'create or replace function public.thing() returns void',
      '  language plpgsql',
      '  security definer',
      'as $fn$ begin end $fn$;',
    ].join('\n')))
    if (hits.length !== 1) fail(`an unjustified SECURITY DEFINER function was not detected (got ${hits.length})`)
    if (hits[0]?.name !== 'public.thing') fail(`wrong function name: ${hits[0]?.name}`)
  }

  // An annotated one is allowed through — the annotations live in a comment by
  // design, so they are read from the RAW text, not the stripped text.
  {
    const hits = scanDiff(diff([
      '-- @SD-JUSTIFICATION: called from an RLS policy, useless as invoker',
      '-- @SD-CATEGORY: rls-helper',
      '-- @SD-AUDIT: 2026-09-02',
      'create or replace function public.helper() returns boolean',
      '  language sql',
      '  security definer',
      'as $fn$ select true $fn$;',
    ].join('\n')))
    if (hits.length !== 0) fail(`a justified function was flagged (got ${hits.length})`)
  }

  // THE CASE THAT MOTIVATED THE STRIP, 2026-09-02: a function that says in prose
  // why it does NOT use the construct was flagged as using it.
  {
    const hits = scanDiff(diff([
      '-- IT RUNS AS THE CALLER. Stated here rather than left to the default,',
      '-- and deliberately not SECURITY DEFINER, which would bypass the RLS.',
      'create or replace function public.safe() returns void',
      '  language plpgsql',
      '  security invoker',
      'as $fn$ begin end $fn$;',
    ].join('\n')))
    if (hits.length !== 0) fail(`a function EXPLAINING the construct in prose was flagged (got ${hits.length})`)
  }

  // A block comment mentioning it must not count either.
  {
    const hits = scanDiff(diff([
      '/* Not security definer — the caller\'s RLS is the whole point. */',
      'create or replace function public.safe2() returns void',
      '  language plpgsql security invoker as $fn$ begin end $fn$;',
    ].join('\n')))
    if (hits.length !== 0) fail(`a block comment mentioning the construct was flagged (got ${hits.length})`)
  }

  // And the strip must not hide a REAL one that happens to sit under a comment.
  {
    const hits = scanDiff(diff([
      '-- This one genuinely needs it.',
      'create or replace function public.real() returns void',
      '  language plpgsql',
      '  security definer',
      'as $fn$ begin end $fn$;',
    ].join('\n')))
    if (hits.length !== 1) fail(`the strip hid a REAL SECURITY DEFINER function (got ${hits.length})`)
  }

  console.log(
    'check-added-security-definer --self-test: 6 assertions — a positive control that an ' +
      'unjustified function IS detected, an annotated one passing, prose and block comments ' +
      'about the construct NOT counting as a use of it, and the comment strip not hiding a real one.',
  )
  return bad
}

if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)

import { fileURLToPath } from 'node:url'
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  const hits = scanDiff(Buffer.concat(chunks).toString('utf8'))
  if (hits.length === 0) {
    console.log('no unjustified SECURITY DEFINER function added by this diff')
    process.exit(0)
  }
  console.error(
    `::error::this diff adds ${hits.length} SECURITY DEFINER function(s) with no @SD-JUSTIFICATION. ` +
      'A SECURITY DEFINER function runs with the definer\'s privileges, so it must say why it needs to. ' +
      'Add @SD-JUSTIFICATION, @SD-CATEGORY and @SD-AUDIT above the body — see supabase/migrations/README.md (Phase 2.1A/2.1B).',
  )
  for (const h of hits) console.error(`  ${h.file}\n    ${h.name}`)
  process.exit(1)
}
