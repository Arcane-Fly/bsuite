'use client'
import React, { useEffect, useRef } from 'react'

export interface MobileSidebarDrawerProps {
  /** Open/closed state. Controlled by the caller (typically from `useSidebarState`). */
  open: boolean
  /** Called when the user dismisses via backdrop click or a nav click inside. */
  onClose: () => void
  /** Nav content rendered inside the sliding panel. */
  children: React.ReactNode
  /** Which edge the drawer slides from. Defaults to `left`. */
  side?: 'left' | 'right'
  /**
   * Extra classes for the sliding `<aside>` panel. Apps use this to
   * set their background / border / shadow tokens. Panel width
   * defaults to `w-64` (256 px) — override with `w-72` etc. here.
   */
  panelClassName?: string
  /**
   * Extra classes for the backdrop. Defaults to a translucent black
   * with blur. Override for brand-specific tints.
   */
  backdropClassName?: string
  /** ARIA label for the panel. Defaults to `Navigation`. */
  ariaLabel?: string
}

/**
 * Fixed-position mobile drawer — the second half of the BSuite app-shell
 * sidebar pattern. Pairs with `useSidebarState` for state.
 *
 * Behaviour encoded here (deliberately): backdrop click closes, click
 * inside the panel does NOT close (consumer can wire `onClose` on any
 * child link), focus returns to the trigger on close (via `previousFocus`),
 * body scroll-lock while open, and respects `prefers-reduced-motion`.
 *
 * Visible only below the `md` breakpoint (`md:hidden`) — desktop
 * sidebars render as a regular flex child in the app shell, which is
 * left entirely to the consumer.
 */
export function MobileSidebarDrawer({
  open,
  onClose,
  children,
  side = 'left',
  panelClassName = 'w-64',
  backdropClassName = 'bg-black/50 backdrop-blur-sm',
  ariaLabel = 'Navigation',
}: MobileSidebarDrawerProps) {
  const previousFocus = useRef<HTMLElement | null>(null)

  // Save the element that had focus before the drawer opened, so we
  // can restore it when the drawer closes. Matches native <dialog> UX.
  useEffect(() => {
    if (open) {
      previousFocus.current = (document.activeElement as HTMLElement | null) ?? null
    } else if (previousFocus.current) {
      // Defer so React has committed the drawer unmount first.
      const el = previousFocus.current
      previousFocus.current = null
      queueMicrotask(() => {
        try {
          el.focus()
        } catch { /* element detached */ }
      })
    }
  }, [open])

  // Body scroll-lock so background content doesn't scroll behind the
  // drawer. Removed on close / unmount.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const sideClass = side === 'left'
    ? (open ? 'left-0 translate-x-0' : 'left-0 -translate-x-full')
    : (open ? 'right-0 translate-x-0' : 'right-0 translate-x-full')

  return (
    <div
      className={`md:hidden ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop — z-[45] so it dims the app Header (typically z-40)
          but sits under the panel (z-50). */}
      <div
        className={`fixed inset-0 z-[45] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        } ${backdropClassName}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sliding panel. Uses `transform` so the animation is GPU-
          accelerated; `motion-reduce:transition-none` suppresses it
          for users who prefer reduced motion. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`fixed inset-y-0 z-50 flex flex-col overflow-y-auto transition-transform duration-200 ease-out motion-reduce:transition-none ${sideClass} ${panelClassName}`}
      >
        {children}
      </aside>
    </div>
  )
}
