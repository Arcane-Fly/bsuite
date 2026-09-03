'use client'
/**
 * UpdateAvailableBanner — "save your work, then refresh", and nothing else.
 *
 * It NEVER reloads on its own. The Refresh button is the only reload path, and
 * it asks first when a form is dirty (`useUnsavedChanges`).
 *
 * ---------------------------------------------------------------------------
 * WHY THESE COLOUR CLASSES AND NOT THE ONES THE APPS USE
 * ---------------------------------------------------------------------------
 * The four in-app `SystemNoticeBanner` copies paint `bg-info/10 border-info/30`
 * and `bg-warning/10 border-warning/30`. Those utilities do NOT exist in the
 * shared theme. Measured 2026-09-03 on packages/theme/src:
 *
 *     --color-info      declared in packages/theme/src  ->  0 hits
 *     --color-warning   declared in packages/theme/src  ->  0 hits
 *     --color-role-info / --color-role-warning          ->  preset-v4.css:99,101
 *
 * `--color-info` and `--color-warning` are declared privately by crm7
 * (src/index.css:216-222) and business-suite-unified, and by nobody else. A
 * shared component copying those class names renders with a TRANSPARENT tint and
 * an invisible border in conduit, braden, throughput and R80.4 — four of the six
 * apps — while passing every test, because a Tailwind class that generates no
 * rule is not an error anywhere.
 *
 * That is the same defect this package's own 0.8.0 release fixed in the sidebar
 * token files: "a custom property in :root registers no Tailwind v4 utility".
 * The classes below use only names `@bsuite/theme/preset-v4.css` generates, and
 * every one of the six apps imports that file.
 *
 * All six also already carry `@source ".../@bsuite/nav-core/dist"`, so these
 * classes are generated without any app-side CSS change.
 * ---------------------------------------------------------------------------
 */
import type { ReactElement } from 'react'

import type { AppUpdateControl, UseAppUpdateAvailableOptions } from './useAppUpdateAvailable.js'
import { useAppUpdateAvailable } from './useAppUpdateAvailable.js'
import { useUnsavedChanges } from './useUnsavedChanges.js'

/** The attribute the mount gate looks for. Do not rename it. */
export const UPDATE_BANNER_SLOT = 'update-available-banner'

const COPY = {
  /**
   * R2: the copy must not call the deployed build "newer". Vercel's Instant
   * Rollback moves the deployed commit BACKWARDS, and the tab is just as out of
   * date. The copy says what is true in both directions — the version changed —
   * and what to do about it.
   */
  normal: 'This app has been updated. Save your work, then refresh.',
  escalated: 'This tab is out of date and may stop working. Save your work, then refresh.',
} as const

const TONE = {
  info: 'bg-role-info/10 border-role-info/30 text-info-text',
  warning: 'bg-role-warning/10 border-role-warning/30 text-warning-text',
  critical: 'bg-destructive/10 border-destructive/30 text-error-text',
} as const

export interface UpdateAvailableBannerProps {
  /**
   * What Refresh does. Defaults to `window.location.reload()`.
   *
   * crm7 passes `purgeStaleAppCachesThenReload` so the reload does not come back
   * off a service worker holding the previous build's index.html.
   */
  onRefresh?: () => void
  /** Kill switch and severity, from the app's system-notice source. */
  control?: AppUpdateControl
  /** Single-line, tighter padding — for a shell with little vertical room. */
  compact?: boolean
  /** Extra classes on the banner element. */
  className?: string
  /** Hook options — url, intervalMs, onSignal, runningCommit, storage. */
  update?: Omit<UseAppUpdateAvailableOptions, 'control'>
}

/**
 * @example
 * <UpdateAvailableBanner
 *   control={updateNotice}
 *   onRefresh={purgeStaleAppCachesThenReload}
 *   update={{ runningCommit: __BUILD_COMMIT__ }}
 * />
 */
export function UpdateAvailableBanner({
  onRefresh,
  control,
  compact = false,
  className = '',
  update,
}: UpdateAvailableBannerProps): ReactElement | null {
  const state = useAppUpdateAvailable({ ...update, control })
  const { confirmLeave } = useUnsavedChanges()

  const isCritical = control?.severity === 'critical'
  const visible = (state.versionChanged || state.escalated) && (isCritical || !state.dismissed)
  if (!visible) return null

  const tone = isCritical ? 'critical' : state.escalated || control?.severity === 'warning' ? 'warning' : 'info'

  const handleRefresh = (): void => {
    // The whole point of the notice. A Refresh that silently discards a
    // half-filled timesheet is the defect this replaced, not the fix.
    if (!confirmLeave()) return
    if (onRefresh) onRefresh()
    else if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <div
      data-slot={UPDATE_BANNER_SLOT}
      role="status"
      aria-live="polite"
      className={[
        'flex flex-wrap items-center justify-between gap-3 border-b text-sm',
        compact ? 'px-3 py-1.5' : 'px-4 py-2',
        TONE[tone],
        className,
      ].filter(Boolean).join(' ')}
    >
      <span className="flex min-w-0 items-center gap-2">
        {/* Inline, currentColor, aria-hidden. nav-core lists lucide-react only as
            a devDependency, so importing an icon here would ship an undeclared
            runtime dependency to six apps. */}
        <svg
          className="size-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        <span>{state.escalated ? COPY.escalated : COPY.normal}</span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {/* No transition anywhere in this component: `prefers-reduced-motion` is
            respected by having no motion to reduce. */}
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-md border border-current px-3 py-1 font-medium hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Refresh
        </button>
        {!isCritical && (
          <button
            type="button"
            onClick={state.dismiss}
            aria-label="Dismiss update notice"
            className="rounded-md px-2 py-1 opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </span>
    </div>
  )
}
