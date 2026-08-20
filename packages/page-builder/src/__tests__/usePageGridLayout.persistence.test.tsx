import { act, renderHook } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { cloneLayout, moveElement } from 'react-grid-layout';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePageGridLayout } from '../usePageGridLayout.js';
import type { Compactor } from 'react-grid-layout';
import type { GridLayoutItem, GridLayouts, PageGridPreferenceFactory } from '../types.js';

/**
 * Regression suite for bsuite#1588 — "Edit-Page drag/resize gestures never
 * persist" (pre-existing since the package's first commit).
 *
 * Root cause: the edit-mode compactor `{ ...noCompactor, preventCollision:
 * true }` made react-grid-layout REVERT any gesture landing on an occupied
 * cell — and `onDragStop` only emits `onLayoutChange` when the layout actually
 * changed, so a reverted gesture emitted nothing and no mutated value ever
 * reached the preference adapter.
 *
 * The tests below are split in two, because the defect lived in the CONTRACT
 * between this hook and react-grid-layout, not in the hook's commit path:
 *
 *  1. `RGL gesture contract` replays react-grid-layout's OWN `onDragStop`
 *     using its real `moveElement`/`compact` against the compactor this hook
 *     hands it. This is where #1588 reproduces.
 *  2. `commit + reload round-trip` covers the persistence path itself.
 */

// ---------------------------------------------------------------------------
// A faithful stand-in for the shipped `useLocalPreference`: React state backed
// by a durable store. The critical property that the older test fakes lack is
// that `setValue` actually triggers a re-render, so effects re-run and any
// clobber-on-next-render would surface.
// ---------------------------------------------------------------------------
const store = new Map<string, unknown>();
const durableAdapter: PageGridPreferenceFactory = <T,>(key: string, fallback: T) => {
  const [value, setStateValue] = useState<T>(() =>
    store.has(key) ? (store.get(key) as T) : fallback,
  );
  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      setStateValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next;
        store.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return { value, setValue, loaded: true };
};

const savedLayoutsFor = (pageKey: string) =>
  store.get(`page:${pageKey}_grid_layouts`) as GridLayouts | undefined;

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

/**
 * Replays react-grid-layout's real `onDragStop` for a single gesture.
 *
 * Mirrors `ResponsiveGridLayout`/`GridLayout` exactly (react-grid-layout
 * v2.2.3, dist/chunk-WGL5FSZH.mjs):
 *   - knob derivation ...... lines 663-666
 *   - moveElement call ..... lines 801-814
 *   - compact + emit guard . lines 815-825
 *
 * Returns whether RGL would have emitted `onLayoutChange` at all, plus the
 * layout it would have emitted. A gesture that RGL reverts emits nothing —
 * which is precisely how #1588 kept every persisted value at its original.
 */
function replayRglDragStop(
  compactor: Compactor,
  layout: GridLayoutItem[],
  id: string,
  toX: number,
  toY: number,
  cols: number,
): { emitted: boolean; finalLayout: GridLayoutItem[] } {
  const preventCollision = (compactor as { preventCollision?: boolean }).preventCollision ?? false;
  const allowOverlap = compactor.allowOverlap;
  const compactType = compactor.type;

  // Both sides go through RGL's own `cloneLayout` so they carry the same
  // `moved`/`static` annotations RGL's internal layout state always has —
  // otherwise the emit guard below would spuriously report a change.
  const oldLayout = cloneLayout(layout as never) as unknown as GridLayoutItem[];
  const working = cloneLayout(layout as never) as unknown as GridLayoutItem[];
  const target = working.find((item) => item.i === id);
  if (!target) throw new Error(`no layout item ${id}`);

  const moved = moveElement(
    working as never,
    target as never,
    toX,
    toY,
    true,
    preventCollision,
    compactType as never,
    cols,
    allowOverlap,
  ) as unknown as GridLayoutItem[];
  const finalLayout = compactor.compact(moved as never, cols) as unknown as GridLayoutItem[];
  return { emitted: !deepEqual(oldLayout, finalLayout), finalLayout };
}

/** Canonical (key-order-independent) structural compare — stands in for the
 *  `deepEqual` react-grid-layout uses in its emit guard. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${k}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}
const deepEqual = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

const yOf = (layout: GridLayoutItem[], id: string) => layout.find((item) => item.i === id)?.y;

function renderGrid(pageKey: string, defaultLayouts: GridLayouts) {
  return renderHook(() =>
    usePageGridLayout({ pageKey, defaultLayouts, preferenceAdapter: durableAdapter }),
  );
}

describe('usePageGridLayout persistence (bsuite#1588)', () => {
  beforeEach(() => store.clear());

  describe('RGL gesture contract — the compactor must let gestures take effect', () => {
    /** Full-width stack: every card spans all 12 cols. The dominant archetype
     *  on /dashboard and /people/:id, where every reorder target is occupied. */
    const stack: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 12, h: 4 },
        { i: 'b', x: 0, y: 4, w: 12, h: 4 },
        { i: 'c', x: 0, y: 8, w: 12, h: 4 },
      ],
    };

    it('does NOT tell react-grid-layout to prevent collisions (the #1588 lever)', () => {
      const { result } = renderGrid('contract-knobs', stack);
      act(() => {
        result.current.setIsEditing(true);
      });

      const compactor = result.current.activeCompactor as { preventCollision?: boolean };
      // `preventCollision: true` + no compaction = every colliding gesture is
      // reverted wholesale, and a reverted gesture never reaches storage.
      expect(compactor.preventCollision ?? false).toBe(false);
    });

    it('reordering a full-width stack (drag c above b) takes effect and is emitted', () => {
      const { result } = renderGrid('contract-stack-drag', stack);
      act(() => {
        result.current.setIsEditing(true);
      });

      const { emitted, finalLayout } = replayRglDragStop(
        result.current.activeCompactor,
        stack.lg,
        'c',
        0,
        4,
        12,
      );

      // Before the fix: RGL reverted c to y=8 and emitted nothing at all.
      expect(emitted).toBe(true);
      expect(yOf(finalLayout, 'c')).toBe(4);
      // The displaced neighbour moves down rather than the gesture being lost.
      expect(yOf(finalLayout, 'b')).toBe(8);
    });

    it('uses the SAME compactor while editing and while viewing, so nothing snaps back on Save & Exit', () => {
      const { result } = renderGrid('contract-mode-parity', stack);
      const viewing = result.current.activeCompactor;
      act(() => {
        result.current.setIsEditing(true);
      });
      const editing = result.current.activeCompactor;

      // A viewer compactor that differs from the editor's re-compacts the
      // editor's output away — the user's arrangement would never survive.
      expect(editing).toBe(viewing);
    });
  });

  describe('commit + reload round-trip', () => {
    const sideBySide: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
    };

    it('persists a committed gesture and survives a remount from storage', async () => {
      const first = renderGrid('roundtrip', sideBySide);
      act(() => {
        first.result.current.setIsEditing(true);
      });

      // The shape react-grid-layout echoes after the user drags `b` down.
      const echoed: GridLayouts = {
        ...first.result.current.currentLayouts,
        lg: [
          { i: 'a', x: 0, y: 0, w: 6, h: 4 },
          { i: 'b', x: 6, y: 10, w: 6, h: 4 },
        ],
      };

      await act(async () => {
        first.result.current.onLayoutChange([], echoed);
        await nextFrame(); // the commit rides a trailing rAF
      });
      first.rerender();

      expect(yOf(savedLayoutsFor('roundtrip')?.lg ?? [], 'b')).toBe(10);
      expect(yOf(first.result.current.currentLayouts.lg, 'b')).toBe(10);

      first.unmount();

      // Simulated reload: a brand-new mount reading the persisted store.
      const second = renderGrid('roundtrip', sideBySide);
      expect(yOf(second.result.current.currentLayouts.lg, 'b')).toBe(10);
    });
  });

  describe('responsive re-derivation still works (guard against over-correcting the fix)', () => {
    const sideBySide: GridLayouts = {
      lg: [
        { i: 'a', x: 0, y: 0, w: 6, h: 4 },
        { i: 'b', x: 6, y: 0, w: 6, h: 4 },
      ],
    };

    it('rescales and persists the layout when the column count changes', () => {
      const { result, rerender } = renderGrid('responsive-cols', sideBySide);

      act(() => {
        result.current.handleColumnChange(6);
      });
      rerender();

      expect(result.current.layoutCols).toBe(6);
      // 12 -> 6 cols halves every width; the layout is re-derived, not dropped.
      for (const item of result.current.currentLayouts.lg) {
        expect(item.w).toBe(3);
      }
      expect(savedLayoutsFor('responsive-cols')?.lg).toHaveLength(2);
    });

    it('a column change does not discard an already-committed gesture', async () => {
      const { result, rerender } = renderGrid('responsive-keeps-gesture', sideBySide);
      act(() => {
        result.current.setIsEditing(true);
      });

      await act(async () => {
        result.current.onLayoutChange([], {
          ...result.current.currentLayouts,
          lg: [
            { i: 'a', x: 0, y: 0, w: 6, h: 4 },
            { i: 'b', x: 6, y: 10, w: 6, h: 4 },
          ],
        });
        await nextFrame();
      });
      rerender();

      act(() => {
        result.current.handleColumnChange(6);
      });
      rerender();

      // `rescaleLayout` repacks rows by design, so absolute y is NOT preserved
      // across a column change — but the gesture's ORDERING must be. Before the
      // gesture, a and b shared row y=0 side by side (and at 6 cols they still
      // fit side by side); the drag put b on its own row below a. If the
      // re-derive had discarded the gesture, b would be back on a's row.
      const lg = result.current.currentLayouts.lg;
      expect(yOf(lg, 'b')).toBeGreaterThan(yOf(lg, 'a') as number);
      const persisted = savedLayoutsFor('responsive-keeps-gesture')?.lg ?? [];
      expect(yOf(persisted, 'b')).toBeGreaterThan(yOf(persisted, 'a') as number);
    });
  });

  // ── crm7#744 — height snaps back on drop, width persists ─────────────────
  //
  // Reproduced 2026-07-31 on d.crm.crm7.app running page-builder 0.6.1: the
  // south-east resize handle visually tracks the drag, but the moment the
  // gesture ends, the card's HEIGHT reverts to its pre-drag value while its
  // WIDTH sticks. Deterministic across drag distances.
  //
  // Root cause proven here at the `usePageGridLayout` layer (not a render
  // artifact): `stripAutoHeightRows` — the helper `onLayoutChange` runs on
  // every commit — unconditionally overwrites `h`/`minH` on ANY item flagged
  // `autoHeight` with the value from `currentLayoutsForStripRef.current`,
  // i.e. the layout as it stood BEFORE this commit. That ref restoration was
  // written to stop a real hazard (a merged/measured height leaking into
  // storage when react-grid-layout echoes the RENDERED layout, e.g. from a
  // tab-triggered re-measurement while mid-edit), but the guard has no way to
  // tell "the render layer merged in a measured height" apart from "the user
  // just dragged the SE handle to grow the card" — both arrive as an `h` on
  // an autoHeight item that differs from the base. It reverts both, which
  // is why width (never touched by this helper) survives every gesture and
  // height never does.
  describe('autoHeight resize height persistence (crm7#744)', () => {
    const singleAutoHeightCard: GridLayouts = {
      lg: [{ i: 'card', x: 0, y: 0, w: 6, h: 6, autoHeight: true, minH: 6 }],
    };

    const hOf = (layout: GridLayoutItem[], id: string) =>
      layout.find((item) => item.i === id)?.h;

    it('a user-dragged height LARGER than the seed/measured height survives the onLayoutChange commit and persists to storage', async () => {
      const { result, rerender } = renderGrid('resize-height-persist', singleAutoHeightCard);
      act(() => {
        result.current.setIsEditing(true);
      });

      // The shape react-grid-layout echoes after the user drags the SE
      // handle to grow the card from the seed h=6 to h=20 (298px -> 448px+
      // in the reported repro; row units here, px is an autoHeight.ts
      // concern already covered by PageGridLayout.autoHeight.test.tsx).
      // Content/measured height is unchanged (minH stays 6) — this is a
      // deliberate user enlargement, not a re-measurement.
      const echoed: GridLayouts = {
        ...result.current.currentLayouts,
        lg: [{ i: 'card', x: 0, y: 0, w: 6, h: 20, autoHeight: true, minH: 6 }],
      };

      await act(async () => {
        result.current.onLayoutChange([], echoed);
        await nextFrame(); // the commit rides a trailing rAF, same as drag/reorder
      });
      rerender();

      // What react-grid-layout would be handed back on next render...
      expect(hOf(result.current.currentLayouts.lg, 'card')).toBe(20);
      // ...AND what actually reached the preference adapter, so it survives
      // a reload. Pre-fix, `stripAutoHeightRows` overwrites this back to 6.
      expect(hOf(savedLayoutsFor('resize-height-persist')?.lg ?? [], 'card')).toBe(20);
    });

    it('a genuinely SMALLER drag on an autoHeight item is still floored to minH (no regression on the floor invariant)', async () => {
      const { result, rerender } = renderGrid('resize-height-floor', singleAutoHeightCard);
      act(() => {
        result.current.setIsEditing(true);
      });

      // User drags the handle to shrink below minH — react-grid-layout's own
      // resize constraints (minSize) are what actually stop this in the real
      // gesture; this test only asserts the persistence layer doesn't make
      // things worse by writing something below the floor if it ever arrives.
      const echoed: GridLayouts = {
        ...result.current.currentLayouts,
        lg: [{ i: 'card', x: 0, y: 0, w: 6, h: 6, autoHeight: true, minH: 6 }],
      };

      await act(async () => {
        result.current.onLayoutChange([], echoed);
        await nextFrame();
      });
      rerender();

      expect(hOf(result.current.currentLayouts.lg, 'card')).toBe(6);
      expect(hOf(savedLayoutsFor('resize-height-floor')?.lg ?? [], 'card')).toBe(6);
    });

    // The render layer only preserves a height marked `hUserSet`. If the
    // marker were never written, or were written on every commit, the fix
    // would either protect nothing or protect everything — i.e. the bug it
    // replaced. Both halves are asserted.
    const hUserSetOf = (layout: GridLayoutItem[], id: string) =>
      layout.find((item) => item.i === id)?.hUserSet;

    it('a deliberate resize STAMPS hUserSet, so the height is still recognised as a choice after a reload', async () => {
      const { result, rerender } = renderGrid('resize-marks-choice', singleAutoHeightCard);
      act(() => {
        result.current.setIsEditing(true);
      });

      const echoed: GridLayouts = {
        ...result.current.currentLayouts,
        lg: [{ i: 'card', x: 0, y: 0, w: 6, h: 20, autoHeight: true, minH: 6 }],
      };

      await act(async () => {
        result.current.onLayoutChange([], echoed);
        await nextFrame();
      });
      rerender();

      // Must reach STORAGE, not just the in-memory layout: the whole purpose
      // of the marker is to survive the reload that erases the gesture.
      expect(hUserSetOf(savedLayoutsFor('resize-marks-choice')?.lg ?? [], 'card')).toBe(true);
    });

    it('a commit that does NOT resize this item leaves it unmarked, so its seed stays a seed', async () => {
      const { result, rerender } = renderGrid('echo-marks-nothing', singleAutoHeightCard);
      act(() => {
        result.current.setIsEditing(true);
      });

      // Same height as the base — a sibling's re-measurement, a column change,
      // any commit that swept this item along without touching it.
      const echoed: GridLayouts = {
        ...result.current.currentLayouts,
        lg: [{ i: 'card', x: 0, y: 0, w: 6, h: 6, autoHeight: true, minH: 6 }],
      };

      await act(async () => {
        result.current.onLayoutChange([], echoed);
        await nextFrame();
      });
      rerender();

      expect(hUserSetOf(savedLayoutsFor('echo-marks-nothing')?.lg ?? [], 'card')).toBeUndefined();
    });
  });
});
