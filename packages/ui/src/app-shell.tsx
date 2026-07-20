import { type ReactNode } from 'react'
import { cn } from './utils.js'
import { DotPattern, type DotPatternProps } from './dot-pattern.js'

/**
 * AppShell — the shared authenticated-app layout frame for the BSuite D2C apps
 * (theme 0.7.0 / bsuite Bug 1). It exists to bake, in ONE place, the two
 * shell contracts that every app was hand-rolling (and getting subtly wrong):
 *
 *  1. **Scroll safety** (crm7 Bug 1 — "sidebar footer/nav unreachable on short
 *     viewports"). The root is a bounded-height flex row (`h-svh`) that NEVER
 *     pairs `overflow-hidden` with a `position:fixed` sidebar descendant — that
 *     combination is the only thing that can clip a fixed sidebar box on
 *     rendering engines that don't honour the fixed-escapes-overflow spec.
 *     Instead the *content region* owns its own scroll (`min-h-0 flex-1
 *     overflow-auto`) and the header/footer are `shrink-0`, so nothing needs to
 *     be clipped by the root and every region stays reachable at any viewport
 *     height. Consumers pass a `position:fixed` sidebar (shadcn) OR an in-flow
 *     `<aside>` — both are safe because the shell root never clips.
 *
 *  2. **Background robustness** (BSU Bug 5 — "invisible dots"). The dot pattern
 *     is rendered ONCE as a `fixed inset-0 z-0` viewport layer, so it paints
 *     independently of any shell opacity or stacking context. The in-flow
 *     `-z-10` pattern several apps used silently disappeared whenever the shell
 *     root lost `isolate`; a fixed viewport layer cannot regress that way.
 *
 * Composition is `children`-based (no router/provider assumptions) so it drops
 * into a component wrapper (crm7/braden), a router element / `<Outlet>`
 * (BSU/throughput), a Next.js `layout.tsx` (conduit), or a view-state switch
 * (R80.3) without forcing a routing-model change. Sidebar / header / footer /
 * aside are OPTIONAL slots — braden and throughput pass none; crm7 passes a
 * shadcn sidebar + an AI `aside`.
 */
export interface AppShellProps {
  /** Main scrollable content. The ONLY region that scrolls; owns `overflow-auto`. */
  children: ReactNode
  /**
   * Sidebar slot — rendered as the first flex child, before the main column.
   * Consumer owns the implementation (shadcn `SidebarProvider`+`Sidebar`, a
   * custom `<aside>`, or `@bsuite/nav-core`). May be `position:fixed`; the
   * shell root never clips it. Omit for top-nav-only apps (braden/throughput).
   */
  sidebar?: ReactNode
  /** Header slot — pinned above the scroll region (`shrink-0`), never scrolls away. */
  header?: ReactNode
  /** Footer slot — pinned below the scroll region (`shrink-0`), always reachable. */
  footer?: ReactNode
  /**
   * Banner slot — rendered above the header inside the main column (demo /
   * system-notice bars). Also `shrink-0`.
   */
  banner?: ReactNode
  /**
   * Aside slot — an optional right-hand flex sibling of the main column
   * (e.g. crm7's AI assistant panel). Rendered after the main column so it
   * sits to its right; the consumer controls its width/visibility.
   */
  aside?: ReactNode
  /** Render the fixed viewport dot-pattern background. Default true; braden passes false. */
  showDotPattern?: boolean
  /** Props forwarded to the background `<DotPattern>` (size, colour, opacity). */
  dotPatternProps?: DotPatternProps
  /** Extra classes on the shell root (the `h-svh` flex row). */
  className?: string
  /** Extra classes on the scrollable content region. */
  contentClassName?: string
  /**
   * Inline style for the main column background — apps that use a transparent
   * shell + fixed background layer (crm7's `--bg-shell`) pass it here so the
   * dot pattern shows through. Omit for opaque shells.
   */
  mainStyle?: React.CSSProperties
}

export function AppShell({
  children,
  sidebar,
  header,
  footer,
  banner,
  aside,
  showDotPattern = true,
  dotPatternProps,
  className,
  contentClassName,
  mainStyle,
}: AppShellProps) {
  return (
    // Bounded-height flex row. `isolate` establishes a stacking context so app
    // content (z-10) always paints above the z-0 background. NO `overflow-hidden`
    // here — that is the crm7 Bug 1 root cause; the content region scrolls instead.
    <div className={cn('relative isolate flex h-svh w-full', className)}>
      {showDotPattern && (
        <div
          aria-hidden="true"
          data-slot="app-shell-background"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          <DotPattern {...dotPatternProps} />
        </div>
      )}

      {/* Sidebar slot — first flex child (may be position:fixed; never clipped). */}
      {sidebar}

      {/* Main column: bounded, scroll contained to the content region. */}
      <div
        data-slot="app-shell-main"
        className="relative z-10 flex min-w-0 flex-1 flex-col"
        style={mainStyle}
      >
        {banner ? <div className="shrink-0">{banner}</div> : null}
        {header ? <div className="shrink-0">{header}</div> : null}

        {/* The ONLY scroll region. `min-h-0` lets it shrink below content so the
            footer stays reachable at short viewport heights (Bug 1). */}
        <div
          data-slot="app-shell-content"
          className={cn('min-h-0 flex-1 overflow-auto', contentClassName)}
        >
          {children}
        </div>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>

      {/* Aside slot — optional right panel (e.g. AI), flex sibling of the column. */}
      {aside}
    </div>
  )
}
