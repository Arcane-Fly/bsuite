import { describe, expect, it } from 'vitest';
import { buildResponsiveLayouts } from '../buildResponsiveLayouts.js';
import type { GridLayouts } from '../types.js';

describe('buildResponsiveLayouts', () => {
  it('auto-stacks an lg-only input into single-column layouts at sm/xs/xxs', () => {
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
    expect(out.md).toBe(lgOnly.lg);

    for (const bp of ['sm', 'xs', 'xxs'] as const) {
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
    expect(out.sm?.[0].w).toBe(6);
    expect(out.xs?.[0].w).toBe(6);
    expect(out.xxs?.[0].w).toBe(6);
  });

  it('clamps minW to the new column count when stacking', () => {
    const lgOnly: GridLayouts = {
      lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4, minW: 4 }],
    };

    const out = buildResponsiveLayouts(lgOnly, { cols: 2 });
    expect(out.sm?.[0]).toMatchObject({ w: 2, minW: 2 });
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
    expect(out.sm?.map((i) => i.i)).toEqual([
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
});
