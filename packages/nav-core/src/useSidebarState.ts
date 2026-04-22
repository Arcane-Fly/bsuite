import { useCallback, useEffect, useState } from 'react'

/**
 * Options for `useSidebarState`.
 */
export interface UseSidebarStateOptions {
  /**
   * localStorage key used to persist the desktop `collapsed` preference.
   * Each app should use a distinct key (e.g. `bsu-sidebar-collapsed`,
   * `r80-sidebar-collapsed`) so apps sharing a domain don't clobber
   * each other.
   */
  storageKey: string
  /**
   * Initial collapsed state when no localStorage entry exists.
   * Defaults to `false` (expanded).
   */
  initialCollapsed?: boolean
}

/**
 * Shape returned by `useSidebarState`.
 */
export interface SidebarState {
  /** Desktop sidebar collapsed (icon-only) vs expanded (full width). */
  collapsed: boolean
  /** Mobile drawer open/closed. Independent of `collapsed`. */
  mobileOpen: boolean
  /** Toggle desktop collapsed state + persist to localStorage. */
  toggleCollapse: () => void
  /** Set desktop collapsed state directly + persist. */
  setCollapsed: (next: boolean) => void
  /** Toggle mobile drawer. */
  toggleMobile: () => void
  /** Force-close mobile drawer. */
  closeMobile: () => void
}

/**
 * Sidebar state hook used by every BSuite app's app-shell sidebar.
 *
 * Handles the two pieces of UX state that every sidebar needs:
 *
 * 1. **Desktop collapsed** — persisted across page loads per app via
 *    localStorage. Keeps the user's last choice when they reload.
 * 2. **Mobile drawer open/closed** — NOT persisted. Each page-load
 *    starts with the drawer closed, opened only by the hamburger
 *    trigger.
 *
 * Also wires `Escape` → `closeMobile()` at the document level, which
 * every app does manually otherwise.
 *
 * This hook intentionally does NOT render any UI. Pair it with
 * `<MobileSidebarDrawer>` for the mobile chrome, and render your own
 * desktop `<aside>` using the `collapsed` + `toggleCollapse` values.
 *
 * @example
 * const state = useSidebarState({ storageKey: 'bsu-sidebar-collapsed' })
 * return (
 *   <>
 *     <button onClick={state.toggleMobile} aria-label="Open menu">☰</button>
 *     <MobileSidebarDrawer open={state.mobileOpen} onClose={state.closeMobile}>
 *       <MyAppNav />
 *     </MobileSidebarDrawer>
 *     <aside className={state.collapsed ? 'w-16' : 'w-64'}>
 *       <MyAppNav />
 *     </aside>
 *   </>
 * )
 */
export function useSidebarState(options: UseSidebarStateOptions): SidebarState {
  const { storageKey, initialCollapsed = false } = options

  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return initialCollapsed
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw === 'true') return true
      if (raw === 'false') return false
      return initialCollapsed
    } catch {
      return initialCollapsed
    }
  })

  const [mobileOpen, setMobileOpen] = useState(false)

  const setCollapsed = useCallback(
    (next: boolean) => {
      setCollapsedState(next)
      try {
        localStorage.setItem(storageKey, String(next))
      } catch {
        // storage unavailable — state still flips in-memory
      }
    },
    [storageKey],
  )

  const toggleCollapse = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, String(next))
      } catch { /* storage unavailable */ }
      return next
    })
  }, [storageKey])

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  // Document-level Escape → close mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return { collapsed, mobileOpen, toggleCollapse, setCollapsed, toggleMobile, closeMobile }
}
