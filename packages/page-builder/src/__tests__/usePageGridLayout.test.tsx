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

  describe('applyAutoHeightRows (derived in-memory auto-height — quality-review redesign)', () => {
    function makeCountingAdapter() {
      const store = new Map<string, unknown>();
      const state = { writes: 0 };
      const adapter: PageGridPreferenceFactory = (key, fallback) => {
        type T = typeof fallback;
        const current = (store.has(key) ? store.get(key) : fallback) as T;
        return {
          value: current,
          setValue: (next) => {
            state.writes += 1;
            const previous = (store.has(key) ? store.get(key) : fallback) as T;
            const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
            store.set(key, resolved);
          },
          loaded: true,
        };
      };
      return { adapter, store, state };
    }

    it('applies a multi-widget batch in ONE update — both widgets survive (no last-writer-wins)', () => {
      const layouts: GridLayouts = {
        lg: [
          { i: 'card2', x: 0, y: 0, w: 6, h: 20, autoHeight: true },
          { i: 'card3', x: 6, y: 0, w: 6, h: 6, autoHeight: true },
        ],
      };

      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-batch-test',
          defaultLayouts: layouts,
          preferenceAdapter: noopPreferenceAdapter,
        }),
      );

      // The exact CRITICAL #1 scenario: two cards settle in the same flush.
      act(() => {
        result.current.applyAutoHeightRows({ card2: 27, card3: 9 });
      });

      expect(result.current.autoHeightRows).toEqual({ card2: 27, card3: 9 });
    });

    it('is diff-guarded: re-applying identical rows keeps the same map identity (no re-render churn)', () => {
      const layouts: GridLayouts = {
        lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 6, autoHeight: true }],
      };
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-identity-test',
          defaultLayouts: layouts,
          preferenceAdapter: noopPreferenceAdapter,
        }),
      );

      act(() => {
        result.current.applyAutoHeightRows({ a: 9 });
      });
      const firstMap = result.current.autoHeightRows;

      act(() => {
        result.current.applyAutoHeightRows({ a: 9 });
      });
      expect(result.current.autoHeightRows).toBe(firstMap);
    });

    it('NEVER writes to the preference adapter — a viewer switching tabs produces zero storage writes (CRITICAL #2)', () => {
      const { adapter, state } = makeCountingAdapter();
      const layouts: GridLayouts = {
        lg: [{ i: 'card2', x: 0, y: 0, w: 6, h: 20, autoHeight: true }],
      };

      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-zero-writes-test',
          defaultLayouts: layouts,
          preferenceAdapter: adapter,
        }),
      );

      // Mount writes (layoutVersion seeding) are expected; measurement
      // writes are NOT. Capture the baseline after mount.
      const writesAfterMount = state.writes;

      // Simulate a read-only viewer flipping Radix tabs inside the card:
      // each switch unmounts/remounts panel content, the ResizeObserver
      // fires, and a new measured row count arrives.
      act(() => {
        result.current.applyAutoHeightRows({ card2: 27 });
      });
      act(() => {
        result.current.applyAutoHeightRows({ card2: 14 });
      });
      act(() => {
        result.current.applyAutoHeightRows({ card2: 31 });
      });

      expect(result.current.autoHeightRows).toEqual({ card2: 31 });
      expect(state.writes).toBe(writesAfterMount);
    });

    it('onLayoutChange strips measured h/minH for autoHeight items (and preserves the flag) before persisting', async () => {
      const { adapter, store } = makeCountingAdapter();
      const layouts: GridLayouts = {
        lg: [
          { i: 'card2', x: 0, y: 0, w: 6, h: 20, minH: 2, autoHeight: true },
          { i: 'plain', x: 6, y: 0, w: 6, h: 4 },
        ],
      };

      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-strip-test',
          defaultLayouts: layouts,
          preferenceAdapter: adapter,
        }),
      );

      act(() => {
        result.current.setIsEditing(true);
      });

      // react-grid-layout echoes back the RENDERED layout — which carries the
      // MEASURED h (27) for the autoHeight item, and drops custom props like
      // `autoHeight`. Simulate the user having dragged `plain` below card2.
      const echoed: GridLayouts = {
        lg: [
          { i: 'card2', x: 0, y: 0, w: 6, h: 27, minH: 27 },
          { i: 'plain', x: 0, y: 27, w: 6, h: 4 },
        ],
      };

      await act(async () => {
        result.current.onLayoutChange([], echoed);
        // The persist commit rides a trailing rAF.
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      });

      const saved = store.get('page:autoheight-strip-test_grid_layouts') as GridLayouts;
      expect(saved).toBeTruthy();
      const savedCard2 = saved.lg.find((item) => item.i === 'card2');
      const savedPlain = saved.lg.find((item) => item.i === 'plain');
      // Measured height stripped back to the seed; flag restored.
      expect(savedCard2).toMatchObject({ h: 20, minH: 2, autoHeight: true });
      // User-driven position change on the non-autoHeight item persists.
      expect(savedPlain).toMatchObject({ x: 0, y: 27, h: 4 });
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
