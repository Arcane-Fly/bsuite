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

  describe('setWidgetAutoHeightRows (blueprint amendment A1)', () => {
    it('patches h and minH for the target widget across every breakpoint', () => {
      const store = new Map<string, unknown>();
      const statefulPreferenceAdapter: PageGridPreferenceFactory = (key, fallback) => {
        type T = typeof fallback;
        const current = (store.has(key) ? store.get(key) : fallback) as T;
        return {
          value: current,
          setValue: (next) => {
            const previous = (store.has(key) ? store.get(key) : fallback) as T;
            const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
            store.set(key, resolved);
          },
          loaded: true,
        };
      };

      const layouts: GridLayouts = {
        lg: [
          { i: 'a', x: 0, y: 0, w: 6, h: 4 },
          { i: 'b', x: 6, y: 0, w: 6, h: 4 },
        ],
      };

      const { result, rerender } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-test',
          defaultLayouts: layouts,
          preferenceAdapter: statefulPreferenceAdapter,
        }),
      );

      act(() => {
        result.current.setWidgetAutoHeightRows('a', 9);
      });
      rerender();

      const lg = result.current.currentLayouts.lg ?? [];
      expect(lg.find((item) => item.i === 'a')).toMatchObject({ h: 9, minH: 9 });
      // Untouched sibling widget is unaffected.
      expect(lg.find((item) => item.i === 'b')).toMatchObject({ h: 4 });
    });

    it('is a no-op when the widget already matches (diff-guarded, no adapter write)', () => {
      const store = new Map<string, unknown>();
      let writes = 0;
      const countingAdapter: PageGridPreferenceFactory = (key, fallback) => {
        type T = typeof fallback;
        const current = (store.has(key) ? store.get(key) : fallback) as T;
        return {
          value: current,
          setValue: (next) => {
            writes += 1;
            const previous = (store.has(key) ? store.get(key) : fallback) as T;
            const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
            store.set(key, resolved);
          },
          loaded: true,
        };
      };

      const layouts: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 9, minH: 9 }] };
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-noop-test',
          defaultLayouts: layouts,
          preferenceAdapter: countingAdapter,
        }),
      );

      const writesBefore = writes;
      act(() => {
        result.current.setWidgetAutoHeightRows('a', 9);
      });
      expect(writes).toBe(writesBefore);
    });
  });

  describe('editor-event-listener close/open contract (blueprint amendment A3)', () => {
    it('opens (setIsEditing(true)) on a bare {page} dispatch — existing behaviour, unchanged', () => {
      const layouts: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4 }] };
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: '/people/:id',
          defaultLayouts: layouts,
          preferenceAdapter: noopPreferenceAdapter,
        }),
      );

      expect(result.current.isEditing).toBe(false);
      act(() => {
        window.dispatchEvent(
          new CustomEvent('crm7-open-page-editor', { detail: { page: '/people/:id' } }),
        );
      });
      expect(result.current.isEditing).toBe(true);
    });

    it('closes (setIsEditing(false)) when the same event carries an explicit editing: false', () => {
      const layouts: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4 }] };
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: '/people/:id',
          defaultLayouts: layouts,
          preferenceAdapter: noopPreferenceAdapter,
        }),
      );

      act(() => {
        result.current.setIsEditing(true);
      });
      expect(result.current.isEditing).toBe(true);

      act(() => {
        window.dispatchEvent(
          new CustomEvent('crm7-open-page-editor', {
            detail: { page: '/people/:id', editing: false },
          }),
        );
      });
      expect(result.current.isEditing).toBe(false);
    });

    it('ignores a close dispatch scoped to a different pageKey', () => {
      const layouts: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4 }] };
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: '/people/:id',
          defaultLayouts: layouts,
          preferenceAdapter: noopPreferenceAdapter,
        }),
      );

      act(() => {
        result.current.setIsEditing(true);
      });

      act(() => {
        window.dispatchEvent(
          new CustomEvent('crm7-open-page-editor', {
            detail: { page: '/clients/:id', editing: false },
          }),
        );
      });
      // Different pageKey — this instance must not be affected.
      expect(result.current.isEditing).toBe(true);
    });
  });
});
