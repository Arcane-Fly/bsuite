// @vitest-environment jsdom
/**
 * Both theme signals must move together.
 *
 * `applyTheme` used to write only the `light` / `dark` CLASS. Each app's pre-React
 * FOUC script writes the class AND `data-theme`, so the two agreed exactly until
 * this provider mounted and moved one of them.
 *
 * Measured live on d.crm.crm7.app, 2026-08-22:
 *
 *     <html class="notranslate light" data-theme="dark">
 *
 * crm7's tailwind.config.js declares `darkMode: ['class', '[data-theme="dark"]']`,
 * where the custom selector REPLACES `.dark` — so every `dark:` utility keyed on
 * `data-theme` while the colour custom properties keyed on the class. Light tokens
 * and dark utilities, at the same time, on every page.
 *
 * These tests exist because that divergence is invisible: nothing errors, and the
 * page looks nearly right. It surfaced as cards rendering flat.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme } from './ThemeProvider.js'

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
  })

  it('sets the dark class AND data-theme=dark', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('sets the light class AND data-theme=light', () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('CLEARS a stale data-theme when switching — the exact live defect', () => {
    // Reproduce the boot sequence: FOUC script writes both as dark, then the
    // provider resolves light. Before the fix data-theme stayed "dark" forever.
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')

    applyTheme('light')

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('never leaves the class and the attribute disagreeing, over repeated toggles', () => {
    for (const t of ['dark', 'light', 'light', 'dark', 'light'] as const) {
      applyTheme(t)
      const cls = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      expect(document.documentElement.getAttribute('data-theme')).toBe(cls)
    }
  })
})
