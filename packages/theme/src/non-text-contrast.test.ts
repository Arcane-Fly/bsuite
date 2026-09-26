import { resolve as pathResolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DARK,
  ROOT,
  SURFACES,
  contrast,
  oklchToSrgb,
  resolve_,
  round2,
  sheet,
} from './contrast-instrument.js'

/**
 * WCAG 1.4.11 NON-TEXT CONTRAST — the border roles, measured, not asserted.
 *
 * WHY THIS EXISTS. `--role-border` shipped at 1.12:1 against the panel it sits
 * on. The operator did not report it as "low contrast"; he reported an
 * "unstyled button" (bsuite#1958), because at 1.12:1 the boundary is simply not
 * there. Every existing gate was green: the value is on-palette, it resolves to
 * the token it should, the class binds correctly. Nothing in the suite asked
 * the one question that mattered — CAN YOU SEE THE EDGE.
 *
 * WHY IT PARSES THE STYLESHEET INSTEAD OF LISTING NUMBERS. The dark
 * `--role-border-strong` carried two hand-recorded ratios in a comment (3.36:1
 * and 3.61:1). Both were correct. Both were also against only two of the five
 * dark surface roles, and against the third — `--role-bg-input`, the lightest
 * dark surface and the one an interactive boundary actually sits on — the same
 * value measured 2.99:1. A short surface list, not bad arithmetic. So this file
 * reads the LIVE values out of vars.css and takes the CROSS PRODUCT of every
 * border role against every surface role in each mode. A future author cannot
 * pass it by measuring the pairs that happen to be comfortable.
 *
 * SCOPE. D2C only (`css/vars.css`). `css/braden.css` is a standalone Corporate
 * entry point with its own `--role-*` layer and NO shadcn bridge, and both of
 * its border roles are currently below 3:1 — that is a live finding, but the
 * Corporate values are generated from the Corporate source-of-truth document
 * and are an operator call to change, not this file's to assert.
 */

const FLOOR = 3.0

describe('contrast pipeline self-test', () => {
  /**
   * THE INSTRUMENT IS THE SUSPECT. Before trusting any ratio below, reproduce
   * two figures this repo recorded independently, in vars.css's own comment on
   * the dark `--role-border-strong`, before this test existed. If the pipeline
   * drifts, these break first and the failures below become meaningless rather
   * than misleading.
   */
  it('reproduces the two dark border-strong ratios vars.css recorded by hand', () => {
    const legacyStrong = oklchToSrgb(0.52, 0.02, 248) // the pre-TH-5 dark value
    expect(round2(contrast(legacyStrong, resolve_('role-bg-panel', DARK)))).toBe(3.36)
    expect(round2(contrast(legacyStrong, resolve_('role-bg-sunken', DARK)))).toBe(3.61)
  })

  it('reproduces the filed TH-5 defect figure of 1.12:1', () => {
    const legacyBorder = oklchToSrgb(0.942, 0.005, 247.9) // --light-border
    expect(round2(contrast(legacyBorder, resolve_('role-bg-panel', ROOT)))).toBe(1.12)
  })

  it('rejects a pair it should reject', () => {
    // Positive control on the FAILING direction: a decorative hairline against
    // its own surface must not clear the floor, or the assertions below would
    // pass no matter what value shipped.
    expect(contrast(resolve_('role-border', ROOT), resolve_('role-bg-panel', ROOT))).toBeLessThan(FLOOR)
  })
})

describe('WCAG 1.4.11 — --role-border-interactive clears 3:1 on every surface', () => {
  for (const [mode, scope] of [
    ['light', ROOT],
    ['dark', DARK],
  ] as const) {
    for (const surface of SURFACES) {
      it(`${mode}: vs --${surface}`, () => {
        const ratio = contrast(resolve_('role-border-interactive', scope), resolve_(surface, scope))
        expect(
          ratio,
          `--role-border-interactive measures ${round2(ratio)}:1 against --${surface} in ${mode} mode; ` +
            'WCAG 1.4.11 requires 3:1 for the boundary that identifies a UI component.',
        ).toBeGreaterThanOrEqual(FLOOR)
      })
    }
  }
})

describe('WCAG 1.4.11 — dark --role-border-strong clears 3:1 on every surface', () => {
  /**
   * `border-strong` is used across ~50 files in crm7, conduit, BSU and
   * throughput precisely WHERE a plain hairline was not enough — i.e. as a
   * component boundary. It carries the same duty and, until TH-5, it had been
   * measured against two of the five dark surfaces and so missed a 2.99:1 pair
   * on `--role-bg-input`.
   */
  for (const surface of SURFACES) {
    it(`dark: vs --${surface}`, () => {
      const ratio = contrast(resolve_('role-border-strong', DARK), resolve_(surface, DARK))
      expect(
        ratio,
        `dark --role-border-strong measures ${round2(ratio)}:1 against --${surface}.`,
      ).toBeGreaterThanOrEqual(FLOOR)
    })
  }
})

describe('LIGHT --role-border-strong is a known gap — ratcheted, not pinned', () => {
  /**
   * NOT FIXED HERE, AND THIS IS NOT A DEFERRAL DRESSED AS A RATCHET.
   *
   * Measured 2026-08-17, light `--role-border-strong` oklch(0.880 0.008 250):
   *   vs --role-bg-panel 1.35:1   vs --role-bg-surface 1.36:1
   *   vs --role-bg-input 1.29:1   vs --role-bg-body    1.28:1
   *   vs --role-bg-sunken 1.20:1  <- worst
   *
   * Reaching 3:1 against the lightest light surface requires L <= 0.656 — the
   * value would go from a pale hairline (#d4d8dd) to a legible mid grey. That
   * is a visible design change on ~50 files in four apps, and "how heavy should
   * a light-mode emphasis border look" is a taste call the operator owns, not
   * an arithmetic one this lane can settle.
   *
   * What this lane CAN do is stop it drifting the wrong way. The floor below is
   * the measured worst case; a change that darkens the token passes, a change
   * that lightens it fails. When the operator rules, replace this with the same
   * 3:1 loop the dark block uses above.
   */
  const RATCHET = 1.19 // measured worst case is 1.1961; the floor is set just under it

  it('has not got lighter than the 2026-08-17 measurement', () => {
    const worst = Math.min(
      ...SURFACES.map((s) => contrast(resolve_('role-border-strong', ROOT), resolve_(s, ROOT))),
    )
    expect(
      worst,
      `light --role-border-strong worst-case is now ${round2(worst)}:1, below the ${RATCHET}:1 ` +
        'recorded on 2026-08-17. It was already under the WCAG 1.4.11 floor; it must not go further.',
    ).toBeGreaterThanOrEqual(RATCHET)
  })

  it('is still below the 3:1 floor, so the ratchet above is still the right gate', () => {
    // If this ever fails, the gap closed: delete this describe block and add
    // `role-border-strong`/light to the 3:1 loop instead of leaving a ratchet
    // that no longer measures anything.
    const worst = Math.min(
      ...SURFACES.map((s) => contrast(resolve_('role-border-strong', ROOT), resolve_(s, ROOT))),
    )
    expect(worst).toBeLessThan(FLOOR)
  })
})

describe('the shadcn bridge points at the interactive role', () => {
  /**
   * The token existing is not the fix — TH-8 is the standing example of an
   * artifact with zero call sites reading as progress. `--input` is what
   * `border-input` resolves through on every Input, Select, Textarea and the
   * Button `outline` variant, so this is the binding that makes the value real.
   */
  it('--input resolves to --role-border-interactive', () => {
    expect(ROOT).toMatch(/--input:\s*var\(--role-border-interactive\)/)
  })

  it('--border deliberately stays on the decorative hairline', () => {
    // Separating two filled surfaces is not a component boundary; widening
    // this one too would put a 4:1 line around every card in the estate.
    expect(ROOT).toMatch(/--border:\s*var\(--role-border\)/)
  })
})

/**
 * THE CORPORATE ENTRY POINT DECLARES THE INTERACTIVE ROLE TOO.
 *
 * The scope note above leaves Corporate's existing border values to the operator.
 * This block does not assert on them. It asserts only that `css/braden.css`
 * DECLARES `--role-border-interactive` and that it clears 3:1 on every Corporate
 * surface. braden imports `preset-v4.css`, so `border-border-interactive`
 * compiles there whether or not the role exists. When it did not, the edge fell
 * back to currentColor: near-black fields (15.77:1 light, 16.26:1 dark) on
 * d.braden /contact after braden#646 adopted the utility (bsuite#1958).
 */
describe('WCAG 1.4.11 — Corporate --role-border-interactive is declared and clears 3:1', () => {
  const B = sheet(pathResolve(__dirname, 'css/braden.css'))
  for (const [mode, scope] of [
    ['light', B.root],
    ['dark', B.blocks('.dark')],
  ] as const) {
    for (const surface of SURFACES) {
      it(`${mode}: vs --${surface}`, () => {
        const ratio = contrast(B.resolve('role-border-interactive', scope), B.resolve(surface, scope))
        expect(
          ratio,
          `Corporate --role-border-interactive measures ${round2(ratio)}:1 against --${surface} in ${mode} mode`,
        ).toBeGreaterThanOrEqual(FLOOR)
      })
    }
  }
})
