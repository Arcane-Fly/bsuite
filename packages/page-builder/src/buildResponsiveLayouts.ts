import type { GridLayoutItem, GridLayouts } from './types.js';

export const RESPONSIVE_BREAKPOINTS = ['lg', 'md', 'sm', 'xs', 'xxs'] as const;
export type ResponsiveBreakpoint = (typeof RESPONSIVE_BREAKPOINTS)[number];

export interface BuildResponsiveLayoutsOptions {
  cols?: number;
}

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
 * (lg, md, sm, xs, xxs). Missing smaller breakpoints (sm/xs/xxs) are derived
 * from `lg` as a single-column vertical stack so that consumer-supplied
 * lg-only layouts no longer squash on phone viewports. Missing `md` is
 * mirrored from `lg`. Consumer-supplied breakpoints are preserved verbatim.
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
    if (bp === 'md') {
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
