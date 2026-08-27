import { describe, expect, it } from 'vitest'

import {
  DARK,
  ROOT,
  SURFACES,
  contrast,
  declared,
  over,
  resolve_,
  round2,
  type Rgb,
} from './contrast-instrument'

/**
 * WCAG 1.4.3 TEXT CONTRAST — the `-text` roles, measured on the backgrounds
 * they actually ship on.
 *
 * WHY THIS EXISTS. The estate had a gate for NON-TEXT contrast (borders, 3:1)
 * and none for TEXT. The `-text` tokens carry hand-recorded ratios in vars.css
 * and those ratios are correct, but they were taken against ONE tint alpha —
 * `/10` — and the estate ships three. Measured across the five apps:
 *
 *     tint /10  paired with a -text token ... 103 sites
 *     tint /15  ...                            28 sites
 *     tint /20  ...                            27 sites
 *
 * (Counted by grepping the five apps' .tsx for a `bg-<role>/<alpha>` and a
 * `text-<role>-text` in the same class string: 158 pairings in total.)
 *
 * A wash of a hue pulls the backdrop TOWARD the text, so a heavier wash is
 * strictly worse, and `/20` was never measured. That is the whole defect: not
 * bad arithmetic, a short list — the same failure mode the non-text gate was
 * written to end, repeated one axis over.
 *
 * WHAT IT MEASURES. The cross product of every declared `-text` role against
 * (a) all five surface roles and (b) its OWN hue's tint at each alpha in use,
 * in BOTH modes. A future author cannot pass it by measuring the comfortable
 * pairs, and cannot add a fourth alpha without adding it here.
 */

const FLOOR = 4.5 // WCAG 1.4.3 AA, normal-weight body text
const ALPHAS = [0.1, 0.15, 0.2] as const

/** Roles that have both a fill and an AA-safe `-text` rendering. */
const ROLES = ['primary', 'accent', 'success', 'warning', 'error', 'info', 'secondary'] as const

const MODES = [
  { name: 'light', scope: ROOT },
  { name: 'dark', scope: DARK },
] as const

describe('WCAG 1.4.3 — every -text role clears 4.5:1 on every surface', () => {
  for (const { name, scope } of MODES) {
    for (const role of ROLES) {
      const token = `role-${role}-text`
      if (!declared(token, scope)) continue
      for (const surface of SURFACES) {
        it(`${name}: --${token} vs --${surface}`, () => {
          const ratio = contrast(resolve_(token, scope), resolve_(surface, scope))
          expect(round2(ratio)).toBeGreaterThanOrEqual(FLOOR)
        })
      }
    }
  }
})

describe('WCAG 1.4.3 — every -text role clears 4.5:1 on its OWN tint', () => {
  for (const { name, scope } of MODES) {
    for (const role of ROLES) {
      const token = `role-${role}-text`
      if (!declared(token, scope) || !declared(`role-${role}`, scope)) continue
      const fg = resolve_(token, scope)
      const fill = resolve_(`role-${role}`, scope)
      for (const alpha of ALPHAS) {
        for (const surface of SURFACES) {
          // The CROSS PRODUCT, not the panel alone. Measuring the tint over one
          // surface is the mistake that produced this gate: a wash over a
          // DARKER surface is strictly worse in light mode, and the darkest
          // (--role-bg-sunken) is where all twelve original failures lived.
          const bg = over(fill, resolve_(surface, scope), alpha)
          it(`${name}: --${token} on bg-${role}/${alpha * 100} over --${surface}`, () => {
            expect(round2(contrast(fg, bg))).toBeGreaterThanOrEqual(FLOOR)
          })
        }
      }
    }
  }
})

/**
 * The stage ramp is a FILL ramp — six lightness steps at the primary hue,
 * for showing progression. vars.css states the rule plainly: "A saturated fill
 * colour is not a legible text colour; these are the text variants and are the
 * ONLY correct token for coloured type."
 *
 * The ramp has no `-text` variant and needs none: it is hue 262.9, which is the
 * primary hue, so `--role-primary-text` already IS its AA-safe text rendering.
 * This gate exists to keep a stage step from being used as type directly, which
 * is what `/ideas` did (`text-stage-4`, measured below).
 */
describe('the stage ramp crosses over between steps 4 and 5', () => {
  /**
   * Measured on the panel, and reproducing the table vars.css recorded by hand:
   *
   *            light   dark
   *   stage-1   1.52   11.49
   *   stage-2   1.93    9.02
   *   stage-3   2.55    6.84
   *   stage-4   3.48    5.01
   *   stage-5   4.85    3.59
   *   stage-6   6.86    2.54
   *
   * So a stage step is legible as type in exactly one mode, and which mode
   * flips at the same place in both directions. `text-stage-4` is 5.01:1 in
   * dark and 3.48:1 in light — it looks fine to whoever built it in dark mode
   * and fails for everyone in light. That is what /ideas shipped.
   *
   * The rule this pins: NEVER type in a stage colour. The ramp is hue 262.9,
   * which is the primary hue, so --role-primary-text already is its AA-safe
   * text rendering and clears the floor in BOTH modes.
   */
  const LEGIBLE_AS_TEXT = { light: [5, 6], dark: [1, 2, 3, 4] } as const
  for (const { name, scope } of MODES) {
    for (const step of [1, 2, 3, 4, 5, 6]) {
      const shouldClear = (LEGIBLE_AS_TEXT[name] as readonly number[]).includes(step)
      it(`${name}: --stage-${step} ${shouldClear ? 'clears' : 'is below'} the text floor`, () => {
        const ratio = contrast(resolve_(`stage-${step}`, scope), resolve_('role-bg-panel', scope))
        if (shouldClear) expect(ratio).toBeGreaterThanOrEqual(FLOOR)
        else expect(ratio).toBeLessThan(FLOOR)
      })
    }
  }
})

/**
 * THE INSTRUMENT IS THE SUSPECT. A gate that cannot come back red is not a
 * gate. This pair is known-bad and must stay known-bad.
 */
describe('positive control', () => {
  it('a stage step on its own wash fails, proving the gate can be red', () => {
    const fill = resolve_('stage-4', ROOT)
    const bg: Rgb = over(fill, resolve_('role-bg-panel', ROOT), 0.15)
    expect(contrast(fill, bg)).toBeLessThan(FLOOR)
  })

  it('a real -text token on the body surface passes, proving it is not red for everything', () => {
    expect(contrast(resolve_('role-primary-text', ROOT), resolve_('role-bg-body', ROOT)))
      .toBeGreaterThanOrEqual(FLOOR)
  })
})
