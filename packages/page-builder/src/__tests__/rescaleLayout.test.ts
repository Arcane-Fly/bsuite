import { describe, expect, it } from 'vitest';
import { rescaleLayout } from '../rescaleLayout.js';
import type { GridLayouts } from '../types.js';

describe('rescaleLayout', () => {
  it('keeps layouts unchanged when column count is unchanged', () => {
    const layouts: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 2 }] };
    expect(rescaleLayout(layouts, 12, 12)).toBe(layouts);
  });

  it('rescales widths and wraps overflowing row items', () => {
    const layouts: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 3, h: 2, minW: 2 },
        { i: 'b', x: 3, y: 0, w: 3, h: 2, minW: 2 },
        { i: 'c', x: 6, y: 0, w: 3, h: 2, minW: 2 },
        { i: 'd', x: 9, y: 0, w: 3, h: 2, minW: 2 },
      ],
    };

    const result = rescaleLayout(layouts, 12, 3).lg;
    expect(result.map((item) => item.x)).toEqual([0, 1, 2, 0]);
    expect(result[3]?.y).toBeGreaterThan(result[0]?.y ?? 0);
    expect(result.every((item) => item.w <= 3)).toBe(true);
  });
});
