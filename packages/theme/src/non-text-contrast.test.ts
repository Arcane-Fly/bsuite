import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

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

const VARS = resolve(__dirname, 'css/vars.css')

/* ── OKLCH -> sRGB -> WCAG relative luminance ──────────────────────────────
 * Ottosson's OKLab matrices, then the sRGB transfer function, then WCAG 2.x
 * relative luminance. Identical pipeline to scripts/audit-legibility.mjs; the
 * self-test below pins it against values this repo has independently recorded.
 */
const DEG = Math.PI / 180

function oklchToSrgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos(H * DEG)
  const b = C * Math.sin(H * DEG)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((x) => {
    const enc = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055
    return Math.min(1, Math.max(0, enc))
  }) as [number, number, number]
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}

const round2 = (n: number) => Math.round(n * 100) / 100

/* ── Read the live token values out of the stylesheet ─────────────────────
 * Blocks, not the whole file: `:root` and `.dark` redefine the same names and
 * a whole-file scan would silently take whichever came last.
 */
/* Comments are stripped ONCE, up front. vars.css's prose quotes token values
 * constantly (including the pre-TH-5 numbers this file self-tests against), and
 * a scan that reads them would resolve a token to whatever a sentence mentioned. */
const CSS = readFileSync(VARS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Every top-level block whose selector list contains `selector`, concatenated
 * in source order.
 *
 * NOT the first one. vars.css declares `:root` twice and `.dark` twice — the
 * second pair is where the role aliases live. Taking `indexOf` gave the dark
 * border roles their LIGHT values and the suite reported light-mode ratios
 * under a dark-mode heading: every dark assertion was measuring the wrong
 * colour and three of them still passed, which is the worse half.
 */
function blocks(selector: string): string {
  const out: string[] = []
  const re = /([^{}]*)\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(CSS))) {
    const sel = m[1].trim()
    const open = m.index + m[0].length - 1
    let depth = 0
    let close = -1
    for (let i = open; i < CSS.length; i++) {
      if (CSS[i] === '{') depth++
      else if (CSS[i] === '}' && --depth === 0) {
        close = i
        break
      }
    }
    if (close === -1) throw new Error(`unterminated block for "${sel}"`)
    if (sel.split(',').some((s) => s.trim() === selector)) out.push(CSS.slice(open + 1, close))
    re.lastIndex = close
  }
  if (!out.length) throw new Error(`selector ${selector} not found in vars.css`)
  return out.join('\n')
}

const ROOT = blocks(':root')
const DARK = blocks('.dark')

/** Resolve `--name` inside a block, following at most one `var(--other)` hop. */
function resolve_(name: string, scope: string): [number, number, number] {
  const read = (n: string, where: string) => {
    // LAST declaration wins — the same cascade the browser applies, and the
    // reason a first-match read is not good enough here.
    const all = [...where.matchAll(new RegExp(`--${n}\\s*:\\s*([^;]+);`, 'g'))]
    return all.length ? all[all.length - 1][1].trim() : null
  }
  let value = read(name, scope) ?? read(name, ROOT)
  if (!value) throw new Error(`--${name} not declared`)
  const hop = value.match(/^var\(\s*--([a-z0-9-]+)\s*\)$/i)
  if (hop) value = read(hop[1], scope) ?? read(hop[1], ROOT) ?? ''
  const ok = value.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i)
  if (!ok) throw new Error(`--${name} does not resolve to a bare oklch triple: "${value}"`)
  return oklchToSrgb(Number(ok[1]), Number(ok[2]), Number(ok[3]))
}

const SURFACES = ['role-bg-body', 'role-bg-surface', 'role-bg-panel', 'role-bg-input', 'role-bg-sunken']
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
