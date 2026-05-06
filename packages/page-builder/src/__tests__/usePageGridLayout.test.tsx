import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageGridLayout } from '../usePageGridLayout.js';
import type { GridLayouts, PageGridPreferenceFactory } from '../types.js';

const noopPreferenceAdapter: PageGridPreferenceFactory = (_key, fallback) => ({
  value: fallback,
  setValue: () => {},
  loaded: true,
});

describe('usePageGridLayout', () => {
  it('derives single-column stacks for sm/xs/xxs from an lg-only defaultLayouts', () => {
    const lgOnly: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 3, h: 4 },
        { i: 'b', x: 3, y: 0, w: 3, h: 4 },
        { i: 'c', x: 6, y: 0, w: 6, h: 8 },
      ],
    };

    const { result } = renderHook(() =>
      usePageGridLayout({
        pageKey: 'narrow-test',
        defaultLayouts: lgOnly,
        preferenceAdapter: noopPreferenceAdapter,
      }),
    );

    const layouts = result.current.currentLayouts;
    expect(layouts.lg).toHaveLength(3);
    expect(layouts.md).toHaveLength(3);

    for (const bp of ['sm', 'xs', 'xxs'] as const) {
      const stacked = layouts[bp];
      expect(stacked).toHaveLength(3);
      for (const item of stacked) {
        expect(item.x).toBe(0);
        expect(item.w).toBe(12);
      }
      expect(stacked.map((item) => item.y)).toEqual([0, 4, 8]);
    }
  });

  it('allows handleColumnChange(1) to collapse to a single-column layout', () => {
    const store = new Map<string, unknown>();
    const statefulPreferenceAdapter: PageGridPreferenceFactory = (key, fallback) => {
      type T = typeof fallback;
      const current = (store.has(key) ? store.get(key) : fallback) as T;
      return {
        value: current,
        setValue: (next) => {
          const previous = (store.has(key) ? store.get(key) : fallback) as T;
          const resolved =
            typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
          store.set(key, resolved);
        },
        loaded: true,
      };
    };

    const lgOnly: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
    };

    const { result, rerender } = renderHook(() =>
      usePageGridLayout({
        pageKey: 'single-col-test',
        defaultLayouts: lgOnly,
        preferenceAdapter: statefulPreferenceAdapter,
      }),
    );

    // Default starts at 12 cols.
    expect(result.current.layoutCols).toBe(12);

    act(() => {
      result.current.handleColumnChange(1);
    });
    rerender();

    expect(result.current.layoutCols).toBe(1);
    const lg = result.current.currentLayouts.lg ?? [];
    expect(lg).toHaveLength(2);
    for (const item of lg) {
      expect(item.x).toBe(0);
      expect(item.w).toBe(1);
    }
  });

  it('keeps a consumer-supplied sm layout intact while still deriving xs/xxs', () => {
    const layouts: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
      sm: [
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
    };

    const { result } = renderHook(() =>
      usePageGridLayout({
        pageKey: 'mixed-test',
        defaultLayouts: layouts,
        preferenceAdapter: noopPreferenceAdapter,
      }),
    );

    const out = result.current.currentLayouts;
    expect(out.sm?.[1]).toMatchObject({ x: 6, w: 6 });
    expect(out.xs?.every((item) => item.x === 0 && item.w === 12)).toBe(true);
    expect(out.xxs?.every((item) => item.x === 0 && item.w === 12)).toBe(true);
  });
});
