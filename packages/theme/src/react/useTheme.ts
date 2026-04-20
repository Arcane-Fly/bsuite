import { useContext } from 'react'
import type { ThemeContextValue } from '../index'
import { ThemeContext } from './ThemeProvider'

/**
 * Hook to read + update the current theme.
 *
 * Must be called inside a tree that has a `<ThemeProvider>` mounted —
 * throws an explanatory error otherwise (catches the "component rendered
 * outside provider" footgun at dev time).
 *
 * @example
 *   const { theme, resolvedTheme, isDark, setTheme } = useTheme()
 *   return (
 *     <button onClick={() => setTheme(isDark ? 'light' : 'dark')}>
 *       {isDark ? 'Switch to light' : 'Switch to dark'}
 *     </button>
 *   )
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error(
      '@bsuite/theme: useTheme() called outside <ThemeProvider>. ' +
        'Wrap your app (typically in main.tsx or app/layout.tsx) with ' +
        "<ThemeProvider> from '@bsuite/theme/react'.",
    )
  }
  return ctx
}
