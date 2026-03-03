'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/**
 * Theme toggle button for Conduit.
 * Uses next-themes `useTheme()` hook -- the ThemeProvider is
 * configured in providers/ThemeProvider.tsx with attribute="class".
 *
 * Cycles through: dark -> light -> system -> dark
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch -- render placeholder until mounted
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        className="rounded-lg p-2 text-muted-foreground"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('system')
    else setTheme('dark')
  }

  const icon =
    theme === 'system' ? (
      <Monitor className="h-4 w-4" aria-hidden="true" />
    ) : resolvedTheme === 'dark' ? (
      <Moon className="h-4 w-4" aria-hidden="true" />
    ) : (
      <Sun className="h-4 w-4" aria-hidden="true" />
    )

  const label =
    theme === 'system'
      ? 'System theme'
      : theme === 'dark'
        ? 'Dark mode'
        : 'Light mode'

  return (
    <button
      onClick={cycleTheme}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={`Toggle theme (currently ${label})`}
      title={label}
    >
      {icon}
    </button>
  )
}
