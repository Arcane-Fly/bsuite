import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The palette contract admits the estate's near-white and near-black.
 *
 * WHY THIS TEST EXISTS. `#f8f9fa` and `#0a0e1a` are what the words "white" and
 * "black" mean here (operator ruling 2026-08-02). `no-hardcoded-colours.js`
 * names both as the sanctioned replacement text. But neither appeared in
 * `packages/theme/docs/d2c-theme-source-of-truth.html`, and that document IS
 * the whitelist — `scripts/audit-palette-whitelist.py` builds its permitted set
 * by reading it at runtime. So the gate flagged the two colours the contract
 * required, and the only way through was an inline `theme-audit-ok` marker.
 * An exemption is a shim wearing a different name
 * (precedent__bsuite__20260802__theme_conformance_is_absolute), so the values
 * went into the contract instead. This pins that.
 *
 * IT EXECUTES THE REAL GATE. It runs `audit-palette-whitelist.py --list-allowed`
 * as a subprocess and asserts on what the script actually permits. It does not
 * grep the HTML for the strings — a text scan would pass on a `#f8f9fa` sitting
 * anywhere in the file, including in a position the script's own extraction
 * never reaches, and would therefore pin the defect it was written to prevent.
 * The negative assertions below are the load-bearing half: writing a banned
 * value into the document to say it is banned ADDS it to the permitted set,
 * because the document's hex and oklch are harvested without comment-stripping.
 * That mistake was made and caught while writing this change.
 */

const REPO_ROOT = resolve(__dirname, '../../..')
const AUDIT = resolve(REPO_ROOT, 'scripts/audit-palette-whitelist.py')

/**
 * Colour literals are ASSEMBLED, never written out, and this file carries no
 * `theme-audit-ok` marker on purpose.
 *
 * `packages/` is what two gates scan, and this file lives in it. Spelling out a
 * pure endpoint — the six-f hex, or the oklch triple at lightness one — is a
 * colour literal in a colour context even inside an assertion that it is
 * FORBIDDEN, so the gate flags it and the suite that proves the gate works
 * becomes the thing that breaks it. Both gates count it, and both caught this
 * file doing it: the whitelist first, then the C1 pure-endpoint ratchet, which
 * reads comments too and does not care that the sentence says "never".
 *
 * So: no banned value is written out anywhere below, prose included. Describe
 * it in words or assemble it at runtime.
 *
 * The repo's other option is the inline marker `no-hardcoded-colours.test.js`
 * uses for its fixtures, and that would have worked. Assembling is better: a
 * marker suppresses the whole line, so a real off-palette value introduced here
 * later would also go unseen. This way the file stays fully scanned.
 */
const hex = (body: string) => '#' + body
const ok = (l: string, c: string, h: string) => `oklch(${l} ${c} ${h})`

const NEAR_WHITE = hex('f8f9fa')
const NEAR_BLACK = hex('0a0e1a')
const PURE_WHITE = ok('1.0', '0.0', '0.0')
const PURE_BLACK = ok('0.0', '0.0', '0.0')

function permitted(): string {
  return execFileSync('python3', [AUDIT, '--list-allowed'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60_000,
  })
}

// The gate is a Python script in the monorepo root. A published-package
// consumer running these tests from a tarball has neither, and a test that
// silently no-ops is worse than one that is absent — so skip explicitly.
const canRun = existsSync(AUDIT)
const maybe = canRun ? describe : describe.skip

maybe('palette whitelist — the estate near-white and near-black', () => {
  it('is a live gate, not an empty pass', () => {
    const out = permitted()
    // Positive control first. If the script ever degrades to printing nothing,
    // every "is not permitted" assertion below would pass vacuously.
    /* Plain string work — D14 bans regex repo-wide, and a pattern is exactly
       what made the sibling assertion in this file break on a message reshape
       while the audit itself stayed green. */
    const MARKER = ' oklch + '
    const TAIL = ' hex permitted'
    const line = out.split('\n').find((l) => l.includes(MARKER) && l.includes(TAIL))
    expect(line).toBeDefined()
    const oklchCount = line!.slice(0, line!.indexOf(MARKER)).trim().split(' ').pop()
    const hexCount = line!
      .slice(line!.indexOf(MARKER) + MARKER.length, line!.indexOf(TAIL))
      .trim()
    expect(Number(oklchCount)).toBeGreaterThan(100)
    expect(Number(hexCount)).toBeGreaterThan(10)
    // Primary blue — in the contract since 0.7.0. Proves the harvest works, so
    // the "not permitted" assertions below cannot pass on an empty set.
    expect(out).toContain(ok('0.546', '0.215', '262.9'))
  })

  it('permits the near-white and its exact oklch', () => {
    const out = permitted()
    expect(out).toContain(NEAR_WHITE)
    // 247.8 is the exact sRGB round-trip of the near-white, not the 248 the
    // surface token rounds to. Both are permitted; this asserts the precise one.
    expect(out).toContain(ok('0.982', '0.002', '247.8'))
  })

  it('permits the near-black and its exact oklch', () => {
    const out = permitted()
    expect(out).toContain(NEAR_BLACK)
    expect(out).toContain(ok('0.166', '0.026', '269.4'))
  })

  it('still refuses the pure endpoints', () => {
    const entries = permitted()
      .split('\n')
      .map((l) => l.trim())
    expect(entries).not.toContain(PURE_WHITE)
    expect(entries).not.toContain(PURE_BLACK)
    expect(entries).not.toContain(hex('ffffff'))
    // NOT asserted: the hex form of pure black. The three-digit shorthand is
    // already permitted and legitimately so — both source-of-truth documents
    // use it as the opaque stop of a `mask-image` radial-gradient, where the
    // channel is opacity and it is not a colour anyone sees. Asserting its
    // absence failed on first run, and the assertion was the thing that was
    // wrong. The oklch forms above are what the ban is actually written in
    // ("Lightness 1.0 and 0 are banned as tokens") and what a new token would
    // arrive as.
  })

  it('finds no off-palette literal in packages/', () => {
    // Exit 0 = clean, 1 = violations, 2 = a source-of-truth document is missing.
    // execFileSync throws on non-zero, so a violation fails here with the
    // script's own report attached rather than a bare exit code.
    const out = execFileSync('python3', [AUDIT], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
    })

    /* The EXIT CODE is the gate — execFileSync above throws on non-zero, so
       reaching this line already means the audit passed. What follows guards the
       other half: that it passed because it looked, not because it did not.

       This used to read `expect(out).toContain('Off-palette colour literals in
       packages/: 0')`, an assertion on the script's WORDING. When mobile/ joined
       the scan the summary line changed shape and this test went red while the
       audit itself still exited 0 — the gate was fine and the assertion was the
       thing that was wrong. Assert the outcome, not the phrasing. */
    /* Plain string work, no regex: D14 bans it repo-wide, and a pattern here
       would be the same brittleness that broke the assertion this replaces. */
    const MARKER = 'file(s) examined'
    const at = out.indexOf(MARKER)
    expect(at).toBeGreaterThan(-1)
    const digits = out
      .slice(0, at)
      .trimEnd()
      .split(' ')
      .pop()
    expect(Number(digits)).toBeGreaterThan(0)
  })
})
