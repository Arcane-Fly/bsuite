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
    for (let i = 0; i < parts.length; i += 1) {
      const part = (i > 0 ? trailingComments(parts[i - 1]) + '\n' : '') + parts[i]
      if (!/create\s+(?:or\s+replace\s+)?function/i.test(part)) continue
      if (!/security\s+definer/i.test(part)) continue
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
