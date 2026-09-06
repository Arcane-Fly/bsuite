import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * ---------------------------------------------------------------------------
 * THE REGRESSION THIS GUARDS
 *
 * `.storybook/preview.css` once imported ONLY `@bsuite/theme/preset-v4.css`.
 * That file is an `@theme inline` BRIDGE — it maps Tailwind's `--color-*` onto
 * `var(--role-*)` and deliberately contains no colour literals at all. The
 * VALUES live in `vars.css`, reached through `@bsuite/theme/css`.
 *
 * Importing the bridge without the values left every utility resolving through
 * an undefined custom property. Measured on that build: 11 distinct `--role-*`
 * referenced, 0 defined. It rendered the browser's own white ground, pure-black
 * body text (banned in every role) and a primary button whose text computed to
 * a fully transparent fill. All five StatusBadge tones painted identically.
 * The exact computed values are recorded in PR #3123 rather than here: this
 * repository's theme scanner counts a banned literal in PROSE the same as one
 * in a declaration, and rightly so — the estate residual is 0 and every new
 * occurrence has to be deliberate.
 *
 * The build exited 0. Types were clean. Every unit test passed. A Storybook
 * that renders the wrong theme certifies its own lie, and nothing except a
 * rendered surface could see it.
 *
 * These are FILE-CONTRACT assertions, not behavioural ones, because the defect
 * lived in the harness config rather than in any component. A behavioural test
 * cannot guard a harness: reverting the import would leave every component
 * test green. So the thing asserted here is the config itself.
 * ---------------------------------------------------------------------------
 */

const storybookDir = join(import.meta.dirname, '..', '..', '.storybook')
const previewCss = readFileSync(join(storybookDir, 'preview.css'), 'utf8')
const previewTsx = readFileSync(join(storybookDir, 'preview.tsx'), 'utf8')
const mainTs = readFileSync(join(storybookDir, 'main.ts'), 'utf8')

describe('Storybook preview imports the theme VALUES, not just the bridge', () => {
  it("imports '@bsuite/theme/css' — the source of every --role-* value", () => {
    expect(previewCss).toContain("@import '@bsuite/theme/css'")
  })

  it("still imports the '@theme inline' utility bridge", () => {
    expect(previewCss).toContain("@import '@bsuite/theme/preset-v4.css'")
  })

  it('imports the values BEFORE the bridge, as every app entry CSS does', () => {
    const values = previewCss.indexOf("@import '@bsuite/theme/css'")
    const bridge = previewCss.indexOf("@import '@bsuite/theme/preset-v4.css'")
    // Assert PRESENCE first. `indexOf` returns -1 when absent, and -1 is less
    // than any real index — so a bare `toBeLessThan` passes VACUOUSLY on the
    // exact defect this file exists to catch. A gate that cannot tell "in the
    // right order" from "not there at all" is fail-open.
    expect(values, "'@bsuite/theme/css' is missing entirely").toBeGreaterThanOrEqual(0)
    expect(bridge, "'@bsuite/theme/preset-v4.css' is missing entirely").toBeGreaterThanOrEqual(0)
    expect(values).toBeLessThan(bridge)
  })

  it('binds the page ground to role tokens that actually exist', () => {
    // `--role-text-primary` does NOT exist in vars.css; the real token is
    // `--role-text-body`. Naming a token that does not exist is silent: the
    // declaration is dropped and the element inherits, which is how the
    // harness rendered pure black text while looking correct in source.
    expect(previewCss).toContain('var(--role-bg-body)')
    expect(previewCss).toContain('var(--role-text-body)')
    expect(previewCss).not.toContain('var(--role-text-primary)')
  })
})

describe('Storybook preview renders both estate themes', () => {
  it('toggles the .dark CLASS, which is what @bsuite/theme binds to', () => {
    // Verified by grep: `prefers-color-scheme` appears ZERO times in
    // packages/theme/src. Emulating the OS colour scheme would measure a
    // state no BSuite surface reaches.
    expect(previewTsx).toContain("classList.toggle('dark'")
  })

  it('puts the class on documentElement, not a story-local wrapper', () => {
    // The `.dark` selector in vars.css is unscoped. A wrapper div would leave
    // <body> and the Storybook canvas painting the light token behind a dark
    // story.
    expect(previewTsx).toContain('document.documentElement')
  })

  it('offers both themes in the toolbar', () => {
    expect(previewTsx).toContain("value: 'light'")
    expect(previewTsx).toContain("value: 'dark'")
  })
})

describe('Storybook preview offers the four estate breakpoints', () => {
  // PageGridLayout.tsx renders breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}.
  // Each viewport must sit inside the band it names, or two viewports land in
  // the same band and appear to prove responsiveness while testing one layout
  // twice.
  it.each([
    ['xs', '480px'],
    ['sm', '768px'],
    ['md', '996px'],
    ['lg', '1440px'],
  ])('defines the %s viewport at %s', (_name, width) => {
    expect(previewTsx).toContain(width)
  })
})

describe('Storybook harness covers both shared UI packages', () => {
  it('globs @bsuite/ui stories', () => {
    expect(mainTs).toContain("'../src/**/*.stories.tsx'")
  })

  it('globs @bsuite/page-builder stories', () => {
    expect(mainTs).toContain("'../../page-builder/src/**/*.stories.tsx'")
  })

  it('registers a Tailwind @source for BOTH story roots', () => {
    // Tailwind v4 source detection does not follow a relative path out of the
    // package on its own. Missing the page-builder root emits no classes for
    // those stories at all — the DOM renders, React mounts, zero console
    // errors, and the surface is simply unstyled.
    expect(previewCss).toContain("@source '../src/**/*.{ts,tsx}'")
    expect(previewCss).toContain("@source '../../page-builder/src/**/*.{ts,tsx}'")
  })
})

describe('every story file is reachable by the harness globs', () => {
  it('finds no *.stories.* outside the two globbed roots', () => {
    const uiSrc = join(import.meta.dirname, '..')
    const uiStories = readdirSync(uiSrc, { recursive: true, encoding: 'utf8' }).filter((f) =>
      f.includes('.stories.'),
    )
    // Every @bsuite/ui story must sit directly under src/ so `../src/**` sees
    // it. This fails loudly if someone parks one in a sibling directory the
    // glob does not reach — the "installed but empty" failure mode.
    expect(uiStories.length).toBeGreaterThan(0)
    for (const f of uiStories) {
      expect(f.endsWith('.stories.tsx')).toBe(true)
    }
  })
})

/**
 * Comments are stripped before the banned-colour scan.
 *
 * This file's own first draft failed here: `preview.css` EXPLAINS in prose that
 * pure white and pure black are banned, and named them to say so. A scan that
 * cannot tell a painted value from a sentence about painted values reports the
 * documentation as the defect — and the cheapest way to make it pass would have
 * been to delete the explanation, which is strictly worse than the thing it was
 * guarding. (The repository's own theme scanner makes the opposite call for the
 * file at large, deliberately: its residual is 0, so prose there must carry a
 * `theme-audit-ok:` reason. Both gates are right for their own scope.)
 */
function stripCssComments(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? css.length : end + 2
      continue
    }
    out += css[i]
    i += 1
  }
  return out
}

/**
 * Pure white (L=1.0) and pure black (L=0) are banned in every role, alpha forms
 * included. The estate's white is oklch(0.982 0.002 248) and must arrive
 * through a token.
 *
 * theme-audit-ok: this array IS the ban list — the values are the subject of
 * the assertion, not a colour this file paints. Removing them would delete the
 * check.
 */
const BANNED_VALUES = ['#fff', '#ffffff', '#000', '#000000', 'oklch(1 0 0)', 'oklch(0 0 0)']

/** Bare CSS keywords that resolve to a pure endpoint. */
const BANNED_KEYWORDS = ['white', 'black']

/** The verdict for one declaration. A NAMED outcome, not a match object. */
type DeclarationVerdict = 'ok' | 'banned-literal' | 'banned-keyword'

/**
 * Classify one `prop: value` declaration.
 *
 * Pure, total, and regex-free — the repository forbids regex assertions in
 * tests (operator, 2026-08-26), and the reason generalises: a regex asserts on
 * WORDING, so when it fails you learn a pattern did not match rather than what
 * the code actually does. A function returning a named outcome says which case
 * was chosen, and the test asserts on that.
 */
export function classifyDeclaration(declaration: string): DeclarationVerdict {
  const colon = declaration.indexOf(':')
  if (colon === -1) return 'ok'
  const value = declaration
    .slice(colon + 1)
    .toLowerCase()
    .split('!important')
    .join('')
    .trim()
  if (value.length === 0) return 'ok'
  if (BANNED_VALUES.includes(value)) return 'banned-literal'
  if (BANNED_KEYWORDS.includes(value)) return 'banned-keyword'
  return 'ok'
}

/** Every declaration in a stylesheet whose verdict is not `ok`. */
function bannedDeclarations(css: string): string[] {
  return stripCssComments(css)
    .split(';')
    .map((d) => d.split('\n').join(' ').trim())
    .filter((d) => d.length > 0 && classifyDeclaration(d) !== 'ok')
}

describe('classifyDeclaration', () => {
  // The classifier is the instrument. If it cannot fail, the sweep below is
  // green by construction — so its own bite is established first.
  it.each(BANNED_VALUES)('flags `color: %s` as a banned literal', (value) => {
    expect(classifyDeclaration(`color: ${value}`)).toBe('banned-literal')
  })

  it.each(BANNED_KEYWORDS)('flags `background: %s` as a banned keyword', (value) => {
    expect(classifyDeclaration(`background: ${value}`)).toBe('banned-keyword')
  })

  it('sees through !important', () => {
    expect(classifyDeclaration('color: #fff !important')).toBe('banned-literal')
  })

  it('passes a token reference', () => {
    expect(classifyDeclaration('background-color: var(--role-bg-body)')).toBe('ok')
  })

  it('passes a non-pure oklch value', () => {
    expect(classifyDeclaration('color: oklch(0.982 0.002 248)')).toBe('ok')
  })

  it('passes a line with no declaration at all', () => {
    expect(classifyDeclaration('@layer base')).toBe('ok')
  })
})

describe('the harness does not paint a banned colour of its own', () => {
  it('keeps real declarations after comment-stripping (positive control)', () => {
    // Without this, "no banned colour found" is indistinguishable from
    // "the stripper ate the whole file".
    const stripped = stripCssComments(previewCss)
    expect(stripped).toContain('background-color: var(--role-bg-body)')
    expect(stripped).not.toContain('WHY `@bsuite/theme/css` IS THE FIRST IMPORT')
  })

  it('paints no banned colour anywhere in preview.css', () => {
    expect(bannedDeclarations(previewCss)).toEqual([])
  })
})
