/**
 * useOnClickOutside
 *
 * Dismisses an open dropdown/menu/popover when the user clicks (or taps)
 * outside of its container, or presses Escape.
 *
 * Why not a full-screen backdrop `<div>`? A `fixed inset-0` backdrop only
 * reliably covers the whole viewport when none of its ancestors establish a
 * new containing block for fixed-position descendants. `backdrop-filter`,
 * `filter`, `transform`, and `will-change: transform` on an ancestor all do
 * exactly that — and BSuite's glass-panel header chrome
 * (`backdropFilter: blur(...)`) is one of them. A backdrop nested inside such
 * an ancestor silently shrinks to that ancestor's box instead of the full
 * page, so clicks on the rest of the page never reach it and the menu never
 * closes. This is what broke click-outside dismissal for crm7's header
 * tenant switchers (operator report, 2026-07-17) — see crm7's
 * `TenantSwitcher.tsx` / `UserTenantSwitcher.tsx` / `CRM7Header.tsx`, the
 * hook this one is promoted from.
 *
 * A `document`-level pointerdown listener sidesteps the problem entirely:
 * JS event listeners are not affected by CSS stacking contexts or
 * containing-block quirks, so this works regardless of what ancestors do.
 *
 * This is the canonical, shared version — promoted here so every consumer
 * app (and every `@bsuite/*` package that depends on `@bsuite/ui`) gets one
 * implementation instead of a fresh hand-rolled copy per app. crm7 carries
 * its own pre-existing copy at `src/hooks/useClickOutside.ts`; that one is
 * already correct and untouched by this promotion — a future consolidation
 * onto this shared copy is a reasonable low-risk follow-up, not a bug fix.
 *
 * Usage:
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   useOnClickOutside(containerRef, () => setIsOpen(false), isOpen);
 *
 *   return (
 *     <div ref={containerRef} className="relative">
 *       <button onClick={() => setIsOpen((o) => !o)}>...</button>
 *       {isOpen && <div className="absolute ...">...menu...</div>}
 *     </div>
 *   );
 */
import { useEffect, type RefObject } from 'react'

export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    // Only attach listeners while the menu is actually open — avoids
    // unnecessary global listeners on every page.
    if (!enabled) return

    const handlePointerDown = (event: PointerEvent) => {
      const container = ref.current
      if (!container) return
      if (event.target instanceof Node && container.contains(event.target)) {
        // Click landed inside the container (trigger button or menu body) —
        // let the component's own click handlers deal with it.
        return
      }
      handler()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler()
    }

    // `pointerdown` fires before `click`, so the menu is already closed by
    // the time a click on an element behind it fires — clicking "through"
    // to another control outside the menu both closes the menu AND performs
    // that control's own action, matching standard menu/popover UX.
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, handler, enabled])
}
