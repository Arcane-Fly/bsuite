import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemeContextValue, type ThemeMode } from '../index.js'

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export interface ThemeProviderProps {
  children: ReactNode
  /** Initial theme if nothing is in localStorage yet. Default: 'system'. */
  defaultTheme?: ThemeMode
  /**
   * localStorage key override. Defaults to `THEME_STORAGE_KEY = 'bsuite_theme'`.
   * Only set this during migrations from a legacy key.
   */
  storageKey?: string
}

/**
 * Resolve a stored ThemeMode to the effective ResolvedTheme.
 *
 * In SSR / pre-hydration contexts (no `window`), returns 'dark' as a safe
 * default — matches what the inline FOUC-prevention script sets when there's
 * no stored preference.
 */
function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

/**
 * Write BOTH theme signals, because the estate reads both and they had different
 * owners.
 *
 * This function used to set only the `light` / `dark` CLASS. The pre-React FOUC
 * script in each app's index.html sets the class AND `data-theme`, so the two
 * agreed exactly until this provider mounted and moved one of them.
 *
 * Measured on d.crm.crm7.app 2026-08-22:
 *
 *     <html class="notranslate light" data-theme="dark">
 *
 * That is not cosmetic. crm7's tailwind.config.js declares
 * `darkMode: ['class', '[data-theme="dark"]']`, where the custom selector
 * REPLACES `.dark` — so every `dark:` utility keys on `data-theme`, while the
 * colour custom properties in theme.css key on the `.dark` class. Light tokens
 * active, dark utilities applying, at the same time.
 *
 * The visible symptom was every card rendering flat: `dark:shadow-card-glow`
 * applied in light mode, resolving `--glow-card` to its LIGHT value of `none`,
 * which set `--tw-shadow: none` and cancelled the light shadow underneath it.
 * Shadows are only where it showed. Every `dark:` utility in the app was affected.
 *
 * One writer, both signals, so they cannot drift again.
 */
export function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
  root.setAttribute('data-theme', resolved)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  // We use lazy init so the first render already has the correct theme when
  // running in the browser — combined with the pre-React FOUC script, this
  // means the class on <html> and the React state are in sync from mount.
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultTheme
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {
      // localStorage can throw in privacy modes; fall through to default
    }
    return defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme))

  // Apply + re-apply whenever theme changes or (for 'system') the OS
  // preference changes.
  useEffect(() => {
    const next = resolveTheme(theme)
    setResolvedTheme(next)
    applyTheme(next)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      const next: ResolvedTheme = mq.matches ? 'dark' : 'light'
      setResolvedTheme(next)
      applyTheme(next)
    }
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [theme])

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeState(mode)
      try {
        window.localStorage.setItem(storageKey, mode)
      } catch {
        // Ignore — localStorage not available
      }
    },
    [storageKey],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      isDark: resolvedTheme === 'dark',
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
