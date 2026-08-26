import type { GridLayoutItem, GridLayouts } from './types.js';

export const RESPONSIVE_BREAKPOINTS = ['lg', 'md', 'sm', 'xs', 'xxs'] as const;
export type ResponsiveBreakpoint = (typeof RESPONSIVE_BREAKPOINTS)[number];

/**
 * Breakpoints whose layout MIRRORS `lg` verbatim.
 *
 * D-75 root cause (operator directive 2026-08-13: "columns available to move
 * cards into do not respect the columns slider").
 * ---------------------------------------------------------------------------
 * react-grid-layout picks its breakpoint from the **container** width, not the
 * viewport — `<Responsive width={containerWidth}>` in `PageGridLayout`. Inside
 * an app shell with a sidebar and page padding, a 1280px laptop presents a
 * container around 950px and a 1440px desktop around 1100px. Both land BELOW
 * the `md: 996` / `lg: 1200` thresholds, so the great majority of real desktop
 * sessions render at `sm` or `md`, not `lg`.
 *
 * `sm` used to be derived by `stackToSingleColumn`, which sets `w: cols` on
 * every item — one card per row at full width, whatever the column count. So
 * on an ordinary laptop the columns slider changed `activeCols` while every
 * card stayed stretched across all of them: the control provably did nothing,
 * and the SE resize handle could not widen a card that was already at the grid
 * bound nor narrow one whose `minW` had been clamped up to `cols`.
 *
 * `md` and `sm` therefore mirror `lg`. So does `xs`, as of 2026-08-26 — the
 * 2026-08-13 fix stopped ONE BREAKPOINT SHORT of the sessions D-75 was reported
 * from, and the operator kept reporting it.
 *
 * MEASURED on production crm.crm7.app/dashboard, signed in, with a positive
 * control in both directions at a SINGLE viewport (1024x1000) where the only
 * variable is the sidebar:
 *
 *   sidebar expanded  -> container 664px -> `xs` -> the columns control was
 *                        INERT: presets 2/4/12 each produced the identical
 *                        single-column layout.
 *   sidebar collapsed -> container 872px -> `sm` -> the control ACTED: three
 *                        presets, three distinct layouts.
 *
 * Same page, same viewport, same control. And in the inert case the control
 * stayed fully interactive — it accepted the click and updated its own
 * `aria-pressed`/`data-active` while nothing on screen moved.
 *
 * `xs` spans a 480-768px container. At 664px a two-column arrangement is ~330px
 * a side, which is not the "unreadable sliver" the stacking rule was written to
 * prevent; that rationale was about phones, and a 1024px laptop with a sidebar
 * open is not a phone. Only `xxs` (< 480px container) genuinely is, so only
 * `xxs` still stacks.
 */
export const MIRRORED_BREAKPOINTS = ['md', 'sm', 'xs'] as const;

/**
 * Breakpoints derived as a single full-width stack — narrow enough that a
 * multi-column arrangement genuinely cannot be read. Below a 480px container
 * even two columns are ~230px a side before margins, which is the sliver case.
 */
export const STACKED_BREAKPOINTS = ['xxs'] as const;

/**
 * Every breakpoint this module DERIVES from `lg`.
 *
 * A derived breakpoint is a render-time projection, never a stored fact. It
 * must not reach the preference adapter: react-grid-layout echoes ALL
 * breakpoints back through `onLayoutChange` on every gesture, so persisting
 * them verbatim froze the derivation — a layout derived once at 12 columns was
 * then "consumer-supplied" forever and stopped tracking `lg`. See
 * `canonicaliseLayoutForPersist` in `usePageGridLayout.ts`.
 */
export const DERIVED_BREAKPOINTS: readonly ResponsiveBreakpoint[] = [
  ...MIRRORED_BREAKPOINTS,
  ...STACKED_BREAKPOINTS,
];

export function isDerivedBreakpoint(breakpoint: string): boolean {
  return (DERIVED_BREAKPOINTS as readonly string[]).includes(breakpoint);
}

/**
 * True when a gesture at `breakpoint` can be written straight back onto `lg`.
 *
 * `lg`, `md` and `sm` all render the same array against the same column count,
 * so an edit made at any of them is expressible in `lg` with no loss. `xs` and
 * `xxs` render a full-width stack, where an edit carries only a vertical order
 * and would flatten a multi-column desktop arrangement if applied to `lg`.
 */
export function isCanonicalisableBreakpoint(breakpoint: string): boolean {
  return breakpoint === 'lg' || (MIRRORED_BREAKPOINTS as readonly string[]).includes(breakpoint);
}

export interface BuildResponsiveLayoutsOptions {
  cols?: number;
}

/**
 * Stack items into one full-width column, preserving reading order.
 *
 * `w: cols` is deliberate at the breakpoint this is used for (`xxs`): the
 * container is narrower than 480px, so a card occupies the whole grid whatever
 * the column count. Do NOT reach for this at wider breakpoints — that was D-75,
 * twice: once for `md`/`sm` in August 2026, and again for `xs`, which is where
 * a 1024px laptop with an open sidebar actually lands.
 */
function stackToSingleColumn(items: GridLayoutItem[], cols: number): GridLayoutItem[] {
  const sorted = [...items].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
  let nextY = 0;
  return sorted.map((item) => {
    const stacked: GridLayoutItem = {
      ...item,
      x: 0,
      y: nextY,
      w: cols,
      ...(item.minW !== undefined && { minW: Math.min(item.minW, cols) }),
    };
    nextY += item.h;
    return stacked;
  });
}

/**
 * Ensure a GridLayouts object has entries for all responsive breakpoints
 * (lg, md, sm, xs, xxs).
 *
 * - `md`, `sm` and `xs` mirror `lg` so the user's chosen column arrangement
 *   survives every desktop, laptop and tablet container width (see
 *   {@link MIRRORED_BREAKPOINTS}).
 * - `xxs` is derived as a single-column stack so a phone viewport never
 *   squashes cards into unreadable slivers.
 * - Consumer-supplied breakpoints are preserved verbatim. Supplying one opts
 *   that breakpoint OUT of tracking `lg`, including out of the columns slider —
 *   prefer not to.
 */
export function buildResponsiveLayouts(
  layouts: GridLayouts,
  { cols = 12 }: BuildResponsiveLayoutsOptions = {},
): GridLayouts {
  const lg = layouts.lg ?? [];
  const result: GridLayouts = { lg };

  for (const bp of RESPONSIVE_BREAKPOINTS) {
    if (bp === 'lg') continue;
    const supplied = (layouts as Record<string, GridLayoutItem[] | undefined>)[bp];
    if (supplied) {
      result[bp] = supplied;
      continue;
    }
    if ((MIRRORED_BREAKPOINTS as readonly string[]).includes(bp)) {
      result[bp] = lg;
      continue;
    }
    result[bp] = stackToSingleColumn(lg, cols);
  }

  for (const bp of Object.keys(layouts)) {
    if (!(bp in result)) {
      result[bp] = (layouts as Record<string, GridLayoutItem[]>)[bp];
    }
  }

  return result;
}
