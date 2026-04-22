/**
 * @bsuite/theme — root export
 *
 * Shared types + constants for the BSuite D2C Neon Electric theme.
 *
 * Most consumers want one of the subpath exports:
 *
 *   import '@bsuite/theme/css'                          // CSS vars + utilities
 *   import { ThemeProvider, useTheme } from '@bsuite/theme/react'
 *   import { getThemeInitScript } from '@bsuite/theme/ssr'
 *   // + either require('@bsuite/theme/tailwind-preset') (TW v3)
 *   //   or @import '@bsuite/theme/preset-v4.css'       (TW v4)
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/**
 * localStorage key used to persist the user's theme preference.
 * Namespaced to avoid collision with apps that already store a plain
 * 'theme' key.
 */
export const THEME_STORAGE_KEY = 'bsuite_theme'

export interface ThemeContextValue {
  /** The user's stored preference ('light' | 'dark' | 'system'). */
  theme: ThemeMode
  /**
   * The effective theme after resolving `'system'` — always `'light'` or
   * `'dark'`. Use this to conditionally render light/dark variants.
   */
  resolvedTheme: ResolvedTheme
  /** Shorthand: resolvedTheme === 'dark'. */
  isDark: boolean
  /** Update the theme. Persists to localStorage and applies the class. */
  setTheme: (mode: ThemeMode) => void
}

/** Branding constants re-exported for consumers that don't use /react subpath */
export { BRANDING_STORAGE_KEY, BRANDING_OVERRIDE_FLAG } from './react/BrandingProvider'
export type { TenantBranding } from './react/BrandingProvider'
