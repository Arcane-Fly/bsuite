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
  it('derives a single-column stack at xxs only, from an lg-only defaultLayouts', () => {
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

    // D-75: sm mirrors lg — react-grid-layout resolves its breakpoint from the
    // CONTAINER width, so sm is where most real desktop sessions land once the
    // app shell's sidebar is subtracted. Collapsing it to a full-width stack
    // made the columns slider inert on exactly those sessions.
    expect(layouts.sm).toHaveLength(3);
    expect(layouts.sm.map((item) => item.w)).toEqual(lgOnly.lg.map((item) => item.w));

    // ...and xs too, from 2026-08-26. The 2026-08-13 fix stopped at sm, but a
    // 1024px laptop with the sidebar open presents a 664px CONTAINER, which
    // resolves to xs — measured on production, sidebar collapsed vs expanded
    // at one viewport as a two-way control.
    expect(layouts.xs).toHaveLength(3);
    expect(layouts.xs.map((item) => item.w)).toEqual(lgOnly.lg.map((item) => item.w));

    for (const bp of ['xxs'] as const) {
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

  it('keeps a consumer-supplied sm layout intact while still deriving xxs', () => {
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
    // xs mirrors lg now, so it keeps the two-up arrangement.
    expect(out.xs?.[1]).toMatchObject({ x: 6, w: 6 });
    expect(out.xxs?.every((item) => item.x === 0 && item.w === 12)).toBe(true);
  });

  // ── D-75 / D-76 regressions (operator directive 2026-08-13) ─────────────
  describe('breakpoint canonicalisation on persist (D-75)', () => {
    function makeStatefulAdapter() {
      const store = new Map<string, unknown>();
      const adapter: PageGridPreferenceFactory = (key, fallback) => {
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
      return { adapter, store };
    }

    /**
     * `onLayoutChange` commits on a TRAILING requestAnimationFrame so a burst
     * of ~60Hz resize ticks coalesces into one adapter write. Nothing is stored
     * until that frame runs, so a test that asserts immediately reads the
     * pre-gesture value and passes or fails for the wrong reason.
     */
    async function flushLayoutCommit() {
      await act(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
    }

    const lgOnly: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
    };

    it('persists ONLY lg, never the derived breakpoints react-grid-layout echoes back', async () => {
      const { adapter, store } = makeStatefulAdapter();
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'persist-lg-only',
          defaultLayouts: lgOnly,
          preferenceAdapter: adapter,
        }),
      );

      act(() => result.current.setIsEditing(true));

      // react-grid-layout hands back EVERY breakpoint on every gesture. Before
      // this fix all five were written straight through, which made the derived
      // ones "consumer-supplied" and froze them against later changes to lg and
      // to the columns slider.
      const echo: GridLayouts = {
        lg: [{ i: 'a', x: 0, y: 0, w: 4, h: 4 }, { i: 'b', x: 4, y: 0, w: 8, h: 4 }],
        md: [{ i: 'a', x: 0, y: 0, w: 4, h: 4 }, { i: 'b', x: 4, y: 0, w: 8, h: 4 }],
        sm: [{ i: 'a', x: 0, y: 0, w: 12, h: 4 }, { i: 'b', x: 0, y: 4, w: 12, h: 4 }],
        xs: [{ i: 'a', x: 0, y: 0, w: 12, h: 4 }, { i: 'b', x: 0, y: 4, w: 12, h: 4 }],
        xxs: [{ i: 'a', x: 0, y: 0, w: 12, h: 4 }, { i: 'b', x: 0, y: 4, w: 12, h: 4 }],
      };
      act(() => result.current.onLayoutChange(null, echo));
      await flushLayoutCommit();

      const saved = store.get('page:persist-lg-only_grid_layouts') as GridLayouts;
      expect(Object.keys(saved)).toEqual(['lg']);
      expect(saved.lg.map((item) => item.w)).toEqual([4, 8]);
    });

    it('folds a gesture made at md back onto lg so the arrangement follows the user', async () => {
      const { adapter, store } = makeStatefulAdapter();
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'persist-from-md',
          defaultLayouts: lgOnly,
          preferenceAdapter: adapter,
        }),
      );

      act(() => result.current.setIsEditing(true));
      act(() => result.current.handleBreakpointChange('md'));

      // lg carries the PRE-gesture values; md carries the gesture. Reading lg
      // verbatim (the old behaviour) discarded the edit for anyone whose
      // container later resolved to lg.
      act(() =>
        result.current.onLayoutChange(null, {
          lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 4 }, { i: 'b', x: 6, y: 0, w: 6, h: 4 }],
          md: [{ i: 'a', x: 0, y: 0, w: 2, h: 9 }, { i: 'b', x: 2, y: 0, w: 10, h: 4 }],
        } as GridLayouts),
      );
      await flushLayoutCommit();

      const saved = store.get('page:persist-from-md_grid_layouts') as GridLayouts;
      expect(saved.lg.map((item) => item.w)).toEqual([2, 10]);
    });

    it('refuses to write a gesture made at a stacked phone breakpoint', async () => {
      const { adapter, store } = makeStatefulAdapter();
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'persist-from-xs',
          defaultLayouts: lgOnly,
          preferenceAdapter: adapter,
        }),
      );

      act(() => result.current.setIsEditing(true));
      act(() => result.current.handleBreakpointChange('xxs'));
      const before = JSON.stringify(store.get('page:persist-from-xs_grid_layouts'));

      act(() =>
        result.current.onLayoutChange(null, {
          lg: lgOnly.lg,
          xxs: [{ i: 'b', x: 0, y: 0, w: 12, h: 4 }, { i: 'a', x: 0, y: 4, w: 12, h: 4 }],
        } as GridLayouts),
      );
      await flushLayoutCommit();

      // A phone (xxs, < 480px container) renders a full-width stack, so the
      // gesture carries only a vertical order. Writing it to lg would flatten a
      // multi-column desktop arrangement the user cannot even see there. xs is
      // NO LONGER such a breakpoint — it mirrors lg and is canonicalisable.
      expect(JSON.stringify(store.get('page:persist-from-xs_grid_layouts'))).toBe(before);
    });

    it('drops derived breakpoints already frozen into a stored layout', () => {
      const { adapter, store } = makeStatefulAdapter();
      // Exactly the shape every existing user has stored: lg plus four frozen
      // derived breakpoints, sm stretched to full width at the old 12 columns.
      store.set('page:heal-stored_grid_layouts', {
        lg: [{ i: 'a', x: 0, y: 0, w: 3, h: 4 }, { i: 'b', x: 3, y: 0, w: 3, h: 4 }],
        md: [{ i: 'a', x: 0, y: 0, w: 3, h: 4 }, { i: 'b', x: 3, y: 0, w: 3, h: 4 }],
        sm: [{ i: 'a', x: 0, y: 0, w: 12, h: 4 }, { i: 'b', x: 0, y: 4, w: 12, h: 4 }],
        xs: [{ i: 'a', x: 0, y: 0, w: 12, h: 4 }, { i: 'b', x: 0, y: 4, w: 12, h: 4 }],
        xxs: [{ i: 'a', x: 0, y: 0, w: 12, h: 4 }, { i: 'b', x: 0, y: 4, w: 12, h: 4 }],
      });
      store.set('page:heal-stored_grid_cols', 6);
      store.set('page:heal-stored_grid_base_cols', 6);

      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'heal-stored',
          defaultLayouts: lgOnly,
          preferenceAdapter: adapter,
        }),
      );

      // sm is re-derived from lg instead of returning the frozen full-width
      // stack, so the user's 3-wide cards survive at the breakpoint they are
      // actually rendered at.
      const out = result.current.currentLayouts;
      expect(out.sm.map((item) => item.w)).toEqual([3, 3]);
      expect(out.lg.map((item) => item.w)).toEqual([3, 3]);
    });
  });

  describe('autoHeight default for raw consumers (D-76)', () => {
    it('defaults autoHeight to true on items that do not state one', () => {
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-default',
          // A raw PageGridLayout consumer's hand-written layout array. Sixteen
          // of the eighteen across the suite look exactly like this.
          defaultLayouts: { lg: [{ i: 'panel', x: 0, y: 0, w: 12, h: 6 }] },
          preferenceAdapter: noopPreferenceAdapter,
        }),
      );
      expect(result.current.currentLayouts.lg[0].autoHeight).toBe(true);
    });

    it('honours an explicit per-item opt-out', () => {
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-optout',
          defaultLayouts: { lg: [{ i: 'virtualized', x: 0, y: 0, w: 12, h: 6, autoHeight: false }] },
          preferenceAdapter: noopPreferenceAdapter,
        }),
      );
      expect(result.current.currentLayouts.lg[0].autoHeight).toBe(false);
    });

    it('honours a page-level defaultAutoHeight={false}', () => {
      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-page-optout',
          defaultLayouts: { lg: [{ i: 'panel', x: 0, y: 0, w: 12, h: 6 }] },
          preferenceAdapter: noopPreferenceAdapter,
          defaultAutoHeight: false,
        }),
      );
      expect(result.current.currentLayouts.lg[0].autoHeight).toBe(false);
    });
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

      // In the real pipeline, an autoHeight item's `h` can only show up as
      // 27 in what react-grid-layout renders (and therefore echoes back)
      // because `applyAutoHeightRows` recorded a 27-row measurement first —
      // that's the ONLY path that produces the `activeLayouts` merge
      // (`h = max(saved, measured)`) this test is simulating. Record it
      // before simulating the echo, or the hook (correctly, post-crm7#744)
      // has no way to tell this apart from a genuine user resize to 27.
      act(() => {
        result.current.applyAutoHeightRows({ card2: 27 });
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

    // crm7#744 — a genuine user resize (no matching measurement recorded)
    // must NOT be mistaken for a measurement echo and must survive the
    // commit. This is the exact defect: the pre-fix `stripAutoHeightRows`
    // stripped ANY `h` that differed from the seed on an autoHeight item,
    // with no way to tell a real drag apart from a measured floor bump.
    it('onLayoutChange persists a genuine user resize on an autoHeight item (no measurement recorded for that value)', async () => {
      const { adapter, store } = makeCountingAdapter();
      const layouts: GridLayouts = {
        lg: [{ i: 'card2', x: 0, y: 0, w: 6, h: 6, minH: 2, autoHeight: true }],
      };

      const { result } = renderHook(() =>
        usePageGridLayout({
          pageKey: 'autoheight-genuine-resize-test',
          defaultLayouts: layouts,
          preferenceAdapter: adapter,
        }),
      );

      act(() => {
        result.current.setIsEditing(true);
      });

      // No `applyAutoHeightRows` call — content was already measured at (or
      // below) the seed height. The user drags the SE handle to grow the
      // card to 20 rows. react-grid-layout echoes that dragged value.
      const echoed: GridLayouts = {
        lg: [{ i: 'card2', x: 0, y: 0, w: 6, h: 20, minH: 2 }],
      };

      await act(async () => {
        result.current.onLayoutChange([], echoed);
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      });

      const saved = store.get('page:autoheight-genuine-resize-test_grid_layouts') as GridLayouts;
      const savedCard2 = saved.lg.find((item) => item.i === 'card2');
      expect(savedCard2).toMatchObject({ h: 20, autoHeight: true });
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
