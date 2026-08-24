'use client'
/**
 * AppSwitcher — Cross-app navigation dropdown, shared by all BSuite apps.
 *
 * Each consuming project passes its app list as props (resolving env vars locally).
 * This component has no dependency on import.meta.env or process.env.
 *
 * Usage (Vite project):
 *   const apps = [
 *     { key: 'bsu', name: 'Business Suite', shortName: 'BSU', icon: Grid3X3,
 *       url: import.meta.env.VITE_BSU_URL || 'https://suite.crm7.app',
 *       description: 'Portal & dashboard' },
 *   ]
 *   <AppSwitcher apps={apps} currentApp="r8" />
 */

import { ChevronDown as ChevronDownRaw } from 'lucide-react'
import { type ElementType, useEffect, useRef, useState } from 'react'
import { isBSuiteAppKey } from './apps.js'
import { buildAppLaunchUrl, buildLaunchUrl } from './launchUrl.js'
import type { IconComponent } from './types.js'

// Cast through unknown to dodge React 18 vs 19 @types/react conflicts —
// lucide-react ships React 19 types in newer versions while this package
// keeps React 18 in devDeps to be compatible with braden's React 18
// consumer. Same pattern as IconComponent in ./types.ts.
const ChevronDown = ChevronDownRaw as unknown as ElementType

export interface AppEntry {
  key: string
  name: string
  shortName: string
  /**
   * Icon component — structurally typed (see `./types.ts::IconComponent`) so
   * it works across React 18 and React 19 `@types/react` versions. Using
   * React's `ElementType` directly binds to whichever `@types/react` this
   * package was built with, breaking consumers on the other version
   * (conduit is on React 19, braden is on React 18).
   */
  icon: IconComponent
  url: string
  description: string
  current?: boolean
}

export interface AppSwitcherProps {
  apps: AppEntry[]
  currentApp?: string
  className?: string
}

/**
 * Cross-app href for one row. Known apps get their own landing path; an app
 * this package does not know keeps the generic `/dashboard` default, because
 * guessing a stranger's routes is exactly the mistake this map exists to undo.
 */
function launchHref(app: AppEntry): string {
  return isBSuiteAppKey(app.key)
    ? buildAppLaunchUrl(app.key, app.url)
    : buildLaunchUrl(app.url)
}

export function AppSwitcher({ apps, currentApp, className = '' }: AppSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = apps.find((a) => a.key === currentApp) ?? apps[0]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
      >
        {current && <current.icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="hidden sm:inline">{current?.shortName ?? 'Apps'}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover shadow-lg"
        >
          <div className="p-1">
            {apps.map((app) => (
              <a
                key={app.key}
                /* Cross-app handoff (2026-05-27): route through the
                   destination's /auth/login so the user lands authenticated.
                   Bare app.url strands the user on the destination's
                   logged-out marketing page because per-app storageKey
                   isolation means the destination origin has no session
                   token under its own key. The `app.key === currentApp`
                   case still uses bare app.url because that's a same-origin
                   click — the user is already in that app's localStorage.

                   buildAppLaunchUrl, not buildLaunchUrl (2026-08-24): the
                   generic helper defaults every destination to /dashboard, a
                   path only bsu and crm7 serve. This menu's R8 row therefore
                   landed on R80.4's not-found page after a SUCCESSFUL sign-in,
                   and its throughput and braden rows were silently bounced to
                   those apps' public home pages. The key is right here — use
                   it, and let the destination declare where it opens. */
                href={app.key === currentApp ? app.url : launchHref(app)}
                data-app-key={app.key}
                role="menuitem"
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                  app.key === currentApp ? 'bg-accent/50 font-medium' : ''
                }`}
                aria-current={app.key === currentApp ? 'page' : undefined}
              >
                <app.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{app.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{app.description}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
