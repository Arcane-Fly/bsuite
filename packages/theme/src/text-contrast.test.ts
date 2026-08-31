import { describe, expect, it } from 'vitest'

import { resolve as pathResolve } from 'node:path'

import {
  DARK,
  ROOT,
  SURFACES,
  contrast,
  declared,
  oklchToSrgb,
  over,
  resolve_,
  round2,
  sheet,
  type Rgb,
} from './contrast-instrument.js'

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
 *
 * SCOPE — BOTH stylesheets now, and it took a wrong answer to get here.
 *
 * This gate read `css/vars.css` only. `css/braden.css` — the Corporate entry point,
 * a standalone `--role-*` layer at a different hue — was out of scope, and the
 * instrument was hardcoded to vars.css, so there was no trusted way to measure it.
 *
 * The result on 2026-08-28: three throwaway readers written in one session, each
 * handling `var()` differently, each returning a different verdict for the same file
 * (4.16 / 3.33 / "all pass"), and one of those reaching a PR description before a
 * live-page measurement contradicted it. Corporate had SIX roles below 4.5:1 in light
 * and THREE in dark, and none of it was caught here because none of it was read here.
 *
 * `sheet(path)` in contrast-instrument.ts fixed the readability half. This block is
 * the other half: the Corporate palette is now asserted by the same cross product as
 * D2C, so it cannot drift back to being measured by whoever writes a reader that day.
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
 * THE CORPORATE PALETTE — same cross product, second stylesheet.
 *
 * `css/braden.css` is measured with `sheet()`, which is the same parser, the same
 * last-declaration-wins cascade and the same alias resolution this file already uses
 * for D2C. Both modes, because Corporate failed in BOTH — light darkened, dark
 * lightened, and a light-only sweep would have declared it done.
 */
describe('WCAG 1.4.3 — the CORPORATE palette clears 4.5:1 on its own tints too', () => {
  const B = sheet(pathResolve(__dirname, 'css/braden.css'))
  const CORP = ['primary', 'accent', 'warning', 'success', 'info', 'error'] as const
  for (const [name, scope] of [['light', B.root], ['dark', B.blocks('.dark')]] as const) {
    for (const role of CORP) {
      it(`${name}: --role-${role}-text on every surface and its own tint`, () => {
        const t = B.resolve(`role-${role}-text`, scope)
        const fill = B.resolve(`role-${role}`, scope)
        const worst = Math.min(
          ...SURFACES.flatMap((s) => {
            const bg = B.resolve(s, scope)
            const alphas: number[] = [1, ...ALPHAS]
            return alphas.map((a) => contrast(t, a === 1 ? bg : over(fill, bg, a)))
          }),
        )
        expect(round2(worst)).toBeGreaterThanOrEqual(FLOOR)
      })
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
 * NEUTRAL TEXT ON A COLOURED WASH — the pairing no block above can express.
 *
 * Every block above pairs a role with ITS OWN tint: `--role-primary-text` on
 * `bg-primary/15`. The DOM does not do that. A grid cell washed `bg-primary/15`
 * holds a name in `--role-text-body` and a slug in `--role-text-muted` — NEUTRAL
 * type on a COLOURED wash. `text-body`/`text-secondary`/`text-muted` appear in no
 * list in this file, so no amount of adding alphas would ever have reached them.
 *
 * FOUND ON PRODUCTION, not here. crm.crm7.app/reports, 2026-08-30, light, <=1024px:
 * `--role-text-muted` in the selected frozen cell measured 4.05:1. The token was
 * 4.92:1 on the plain body background with a hand-written "OK AA normal" beside it —
 * true for the case someone measured, silent about this one. The wash did not break
 * the token; it spent headroom the token never had. Dark was 6.69:1 and passed, so a
 * dark-only sweep saw nothing.
 *
 * WHY ONLY THE PRIMARY WASHES ARE ASSERTED. Counted across the five apps and the
 * packages (grep of `bg-<role>/<alpha>` in .tsx/.ts):
 *
 *     bg-primary/10  195      bg-destructive/10 179      bg-muted/50  122
 *     bg-muted/30     86      bg-primary/20      59      bg-warning/10 55
 *     bg-muted/40     48      bg-primary/15      41      bg-success/10 30
 *
 * The primary washes at /10../20 are the ones PROVEN to host neutral text: that is
 * the grid's own selected-cell styling (GridCell.tsx, `bg-primary/10` unfrozen and
 * `bg-primary/15` frozen), measured above on a live page.
 *
 * The rest is NOT asserted, and this is a KNOWN GAP rather than a pass:
 *   - The SEMANTIC washes (destructive/warning/success/info) are used mostly by
 *     alerts and badges whose type is the matching `-text` role, already covered by
 *     the "own tint" block. Whether any of them hosts neutral text is UNMEASURED.
 *   - The HEAVY washes (>=/30, including bg-muted/50 at 122 sites) cannot host
 *     neutral text AT ALL: `bg-secondary/50` over `--role-bg-sunken` tops out at
 *     3.26:1 in light even when muted is set equal to secondary. There is no token
 *     value that fixes those — they need on-fill text, or they carry no type. Do not
 *     "fix" them by darkening this token; it cannot reach them.
 *
 * Asserting the full cross product instead would force light muted to L=0.44 against
 * secondary at L=0.38 and collapse two tiers of a deliberate six-tier scale, and
 * would still be red on the heavy washes forever. A permanently red gate is an
 * unread gate.
 *
 * `-subtle` and `-disabled` are excluded ON PURPOSE: vars.css declares them 3.52:1
 * (large only) and 2.21:1 (icon cue required) — below the floor by design.
 */
const NEUTRAL_TEXT = ['text-body', 'text-secondary', 'text-muted'] as const
const WASHES = [0.1, 0.15, 0.2] as const

describe('WCAG 1.4.3 — neutral text clears 4.5:1 on every primary wash', () => {
  for (const { name, scope } of MODES) {
    for (const neutral of NEUTRAL_TEXT) {
      const token = `role-${neutral}`
      if (!declared(token, scope)) continue
      it(`${name}: --${token} on bg-primary/<10,15,20> over every surface`, () => {
        const fg = resolve_(token, scope)
        const fill = resolve_('role-primary', scope)
        const worst = Math.min(
          ...SURFACES.flatMap((s) => WASHES.map((a) => contrast(fg, over(fill, resolve_(s, scope), a)))),
        )
        expect(round2(worst)).toBeGreaterThanOrEqual(FLOOR)
      })
    }
  }
})

describe('WCAG 1.4.3 — CORPORATE neutral text on every primary wash', () => {
  const B = sheet(pathResolve(__dirname, 'css/braden.css'))
  for (const [name, scope] of [['light', B.root], ['dark', B.blocks('.dark')]] as const) {
    for (const neutral of NEUTRAL_TEXT) {
      it(`${name}: --role-${neutral} on every corporate primary wash`, () => {
        const fg = B.resolve(`role-${neutral}`, scope)
        const fill = B.resolve('role-primary', scope)
        const worst = Math.min(
          ...SURFACES.flatMap((s) => WASHES.map((a) => contrast(fg, over(fill, B.resolve(s, scope), a)))),
        )
        expect(round2(worst)).toBeGreaterThanOrEqual(FLOOR)
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

  /**
   * The value --light-text-muted carried until 2026-08-30. It must stay BELOW the
   * floor on a primary wash, because that is the failure the block above was added
   * to catch: if this ever passes, the instrument has stopped being able to see it.
   */
  it('the pre-2026-08-30 muted token still fails on a primary tint', () => {
    const wasMuted = oklchToSrgb(0.52, 0.018, 260)
    const bg = over(resolve_('role-primary', ROOT), resolve_('role-bg-body', ROOT), 0.15)
    expect(round2(contrast(wasMuted, bg))).toBeLessThan(FLOOR)
  })
})
