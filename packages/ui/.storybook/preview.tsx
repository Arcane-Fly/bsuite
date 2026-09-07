import './preview.css'
import type { Decorator, Preview } from '@storybook/react-vite'
import { useEffect } from 'react'

/**
 * ---------------------------------------------------------------------------
 * THEME
 *
 * `@bsuite/theme` flips on a `.dark` CLASS, not `prefers-color-scheme` —
 * verified by grep: `prefers-color-scheme` appears ZERO times anywhere in
 * packages/theme/src. `vars.css` rebinds every `--role-*` inside a single
 * `.dark { … }` block, and `preset-v4.css` maps Tailwind's `--color-*` onto
 * those role tokens via `@theme inline`, so both layers follow the class.
 *
 * Emulating the OS colour scheme therefore proves NOTHING about these
 * components — it measures a state no BSuite surface ever reaches. The
 * decorator toggles the class on `documentElement`, which is exactly what
 * every app's theme provider does.
 *
 * The class goes on `<html>` rather than a wrapper div because the `.dark`
 * selector in vars.css is unscoped: a wrapper would leave `<body>` and the
 * Storybook canvas ground painting the light token behind a dark story.
 * ---------------------------------------------------------------------------
 */
const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as 'light' | 'dark') ?? 'light'

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    // `color-scheme` makes the browser paint native form controls, scrollbars
    // and the canvas gutter to match. Without it a dark story keeps a white
    // scrollbar and the ground behind an over-scroll flashes white.
    root.style.colorScheme = theme
    return () => {
      root.classList.remove('dark')
      root.style.colorScheme = ''
    }
  }, [theme])

  return <Story />
}

const preview: Preview = {
  decorators: [withTheme],

  globalTypes: {
    theme: {
      description: 'BSuite theme (toggles the .dark class @bsuite/theme binds to)',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: 'light',
  },

  parameters: {
    layout: 'centered',

    /*
     * Controls are the point of this harness. `expanded` shows the prop
     * description and default alongside each control, so a story is a
     * readable contract rather than a row of unlabelled inputs.
     *
     * `matchers` are deliberately NOT set for `color`: every colour in this
     * estate is a semantic token, never a literal, and offering a colour
     * picker invites exactly the hardcoded-hex defect `bsuite/no-hardcoded-colours`
     * exists to catch.
     */
    controls: {
      expanded: true,
      sort: 'requiredFirst',
    },

    /*
     * Backgrounds are bound to the real role tokens. `oklch(0.982 0.002 248)`
     * is the estate's white — pure white (L=1.0) and pure black (L=0) are
     * BANNED in every role, alpha forms included, so neither appears here.
     * The values are read from the token rather than retyped so this list
     * cannot drift away from vars.css.
     */
    backgrounds: {
      options: {
        body: { name: 'Body (--role-bg-body)', value: 'var(--role-bg-body)' },
        surface: { name: 'Surface (--role-bg-surface)', value: 'var(--role-bg-surface)' },
        panel: { name: 'Panel (--role-bg-panel)', value: 'var(--role-bg-panel)' },
        sunken: { name: 'Sunken (--role-bg-sunken)', value: 'var(--role-bg-sunken)' },
      },
    },

    /*
     * The four breakpoints are the estate's OWN grid thresholds, not Storybook's
     * generic phone/tablet presets:
     *
     *   PageGridLayout.tsx:1616 — breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
     *
     * Each viewport below sits just INSIDE the band it names, so switching
     * between them actually crosses a threshold the grid reacts to. A preset
     * chosen for a device name instead would land two viewports in the same
     * band and appear to prove responsiveness while testing one layout twice.
     */
    viewport: {
      options: {
        xs: { name: 'xs — 480 (grid xs band)', styles: { width: '480px', height: '900px' } },
        sm: { name: 'sm — 768 (grid sm band)', styles: { width: '768px', height: '900px' } },
        md: { name: 'md — 996 (grid md band)', styles: { width: '996px', height: '900px' } },
        lg: { name: 'lg — 1440 (grid lg band)', styles: { width: '1440px', height: '900px' } },
      },
    },
  },
}

export default preview
