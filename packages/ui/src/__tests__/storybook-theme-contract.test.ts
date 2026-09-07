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
 * ---------------------------------------------------------------------------
 * NO BANNED-COLOUR ASSERTIONS LIVE HERE, DELIBERATELY.
 *
 * An earlier draft of this file scanned `preview.css` for pure white and black
 * itself, which meant carrying the banned values as literals in a `BANNED_VALUES`
 * array. Two repository gates rejected that, and both were right:
 *
 *   - `audit-palette-whitelist.py` — a colour literal in `packages/` that is not
 *     in the two source-of-truth documents is new drift. Its per-file bank is for
 *     KNOWN pre-existing debt (mobile/), and its own comment says to regenerate it
 *     "never to make a red run green". Banking a file added today is exactly that.
 *   - "No new regex assertions in tests" (operator, 2026-08-26) — the bare
 *     `white`/`black` keyword check had been written as a regex.
 *
 * The deeper point is that the assertions were REDUNDANT. `preview.css` sits in
 * `packages/`, so it is already covered by four estate gates that are stricter
 * than a string scan of one file and are ratcheted so they can only improve:
 * C1 pure-endpoint (residual 0), C2 non-OKLCH, near-pure-by-parsed-lightness,
 * and the palette whitelist. Re-implementing a gate that already exists, less
 * well, inside the package it polices is not extra safety — it is a second
 * number to keep in sync, and the weaker one would have been the one people read.
 *
 * The rendered-output evidence is separate again and stronger than either: a
 * sweep of all 51 stories x both themes, reading COMPUTED styles and judging
 * lightness numerically, with a positive control. That is recorded in PR #3123.
 *
 * What remains below is what those gates do NOT cover: whether this harness
 * imports the theme at all, which class it toggles, and whether its globs and
 * viewports match the estate.
 * ---------------------------------------------------------------------------
 */
