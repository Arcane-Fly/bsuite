import { describe, expect, it } from 'vitest';
import {
  buildResponsiveLayouts,
  isCanonicalisableBreakpoint,
  isDerivedBreakpoint,
} from '../buildResponsiveLayouts.js';
import type { GridLayouts } from '../types.js';

describe('buildResponsiveLayouts', () => {
  it('auto-stacks an lg-only input into single-column layouts at xs/xxs only', () => {
    const lgOnly: GridLayouts = {
      lg: [
        { i: 'kpi-a', x: 0, y: 0, w: 3, h: 4 },
        { i: 'kpi-b', x: 3, y: 0, w: 3, h: 4 },
        { i: 'kpi-c', x: 6, y: 0, w: 3, h: 4 },
        { i: 'panel', x: 0, y: 4, w: 12, h: 8 },
      ],
    };

    const out = buildResponsiveLayouts(lgOnly, { cols: 12 });

    expect(out.lg).toBe(lgOnly.lg);
    // D-75: md and sm MIRROR lg. react-grid-layout picks its breakpoint from
    // the container width, so a laptop with a sidebar renders at sm/md — the
    // breakpoints that used to collapse to a full-width stack regardless of
    // the column count the user had chosen.
    expect(out.md).toBe(lgOnly.lg);
    expect(out.sm).toBe(lgOnly.lg);

    for (const bp of ['xs', 'xxs'] as const) {
      const stack = out[bp];
      expect(stack).toBeDefined();
      expect(stack).toHaveLength(4);
      for (const item of stack) {
        expect(item.x).toBe(0);
        expect(item.w).toBe(12);
      }
      const ys = stack.map((i) => i.y);
      expect(ys).toEqual([0, 4, 8, 12]);
      expect(stack.map((i) => i.i)).toEqual(['kpi-a', 'kpi-b', 'kpi-c', 'panel']);
    }
  });

  it('preserves consumer-supplied per-breakpoint layouts', () => {
    const custom: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
      sm: [
        { i: 'a', x: 0, y: 0, w: 3, h: 4 },
        { i: 'b', x: 3, y: 0, w: 3, h: 4 },
      ],
    };

    const out = buildResponsiveLayouts(custom, { cols: 12 });

    expect(out.sm).toBe(custom.sm);
    expect(out.xs?.[0]).toMatchObject({ x: 0, w: 12 });
    expect(out.xxs?.[0]).toMatchObject({ x: 0, w: 12 });
  });

  it('uses the provided cols value for stacked widths', () => {
    const lgOnly: GridLayouts = {
      lg: [{ i: 'a', x: 0, y: 0, w: 3, h: 4 }],
    };

    const out = buildResponsiveLayouts(lgOnly, { cols: 6 });
    expect(out.xs?.[0].w).toBe(6);
    expect(out.xxs?.[0].w).toBe(6);
    // sm mirrors lg, so it keeps the authored width rather than stretching.
    expect(out.sm?.[0].w).toBe(3);
  });

  it('clamps minW to the new column count when stacking', () => {
    const lgOnly: GridLayouts = {
      lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4, minW: 4 }],
    };

    const out = buildResponsiveLayouts(lgOnly, { cols: 2 });
    expect(out.xs?.[0]).toMatchObject({ w: 2, minW: 2 });
  });

  it('orders the stack by row then column from the source lg', () => {
    const lgOnly: GridLayouts = {
      lg: [
        { i: 'second-row-right', x: 6, y: 4, w: 6, h: 4 },
        { i: 'second-row-left', x: 0, y: 4, w: 6, h: 4 },
        { i: 'first-row-right', x: 6, y: 0, w: 6, h: 4 },
        { i: 'first-row-left', x: 0, y: 0, w: 6, h: 4 },
      ],
    };

    const out = buildResponsiveLayouts(lgOnly, { cols: 12 });
    expect(out.xs?.map((i) => i.i)).toEqual([
      'first-row-left',
      'first-row-right',
      'second-row-left',
      'second-row-right',
    ]);
  });

  it('treats md as a mirror of lg when not supplied', () => {
    const lgOnly: GridLayouts = {
      lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4 }],
    };

    const out = buildResponsiveLayouts(lgOnly);
    expect(out.md).toBe(lgOnly.lg);
  });

  it('preserves a consumer-supplied md layout', () => {
    const custom: GridLayouts = {
      lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4 }],
      md: [{ i: 'a', x: 0, y: 0, w: 10, h: 4 }],
    };

    const out = buildResponsiveLayouts(custom);
    expect(out.md).toBe(custom.md);
  });

  // ── D-75 regression guards ───────────────────────────────────────────────
  //
  // The defect was not that stacking existed, it was WHERE it applied. Below a
  // 1200px container — which is where most real desktop sessions land once the
  // app shell's sidebar is subtracted — every card was stretched to `w: cols`,
  // so the columns slider had no visible effect and a card already at the grid
  // bound could not be widened.

  it('honours a 3-column choice at sm rather than stretching cards full width', () => {
    const lgOnly: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 1, h: 4 },
        { i: 'b', x: 1, y: 0, w: 1, h: 4 },
        { i: 'c', x: 2, y: 0, w: 1, h: 4 },
      ],
    };

    const out = buildResponsiveLayouts(lgOnly, { cols: 3 });

    for (const bp of ['md', 'sm'] as const) {
      expect(out[bp]?.map((item) => item.w)).toEqual([1, 1, 1]);
      expect(out[bp]?.map((item) => item.x)).toEqual([0, 1, 2]);
    }
    // Genuine phone widths still stack, which is what that code was for.
    expect(out.xs?.map((item) => item.w)).toEqual([3, 3, 3]);
    expect(out.xs?.map((item) => item.x)).toEqual([0, 0, 0]);
  });

  it('classifies every derived breakpoint, and only those, as derived', () => {
    expect(isDerivedBreakpoint('lg')).toBe(false);
    for (const bp of ['md', 'sm', 'xs', 'xxs']) {
      expect(isDerivedBreakpoint(bp)).toBe(true);
    }
    // A consumer-invented breakpoint is never derived — it must survive a
    // persist round-trip rather than being silently dropped.
    expect(isDerivedBreakpoint('xxl')).toBe(false);
  });

  it('canonicalises a gesture only from breakpoints that share lg column basis', () => {
    for (const bp of ['lg', 'md', 'sm']) {
      expect(isCanonicalisableBreakpoint(bp)).toBe(true);
    }
    // xs/xxs render a full-width stack, so a gesture there carries only a
    // vertical order and would flatten a multi-column desktop arrangement.
    for (const bp of ['xs', 'xxs']) {
      expect(isCanonicalisableBreakpoint(bp)).toBe(false);
    }
  });
});
