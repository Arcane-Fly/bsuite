import { act, renderHook } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { rescaleLayout } from '../rescaleLayout.js';
import { usePageGridLayout } from '../usePageGridLayout.js';
import type { GridLayouts, PageGridPreferenceFactory } from '../types.js';

/**
 * Changing the column count must not destroy the authored layout.
 *
 * WHAT HAPPENED. `handleColumnChange` rescaled the stored layout and wrote it
 * back, and an effect did the same on every render where `baseCols !==
 * layoutCols`. Both are lossy at the narrow end: every item clamps to the
 * one-column minimum and the row-packer puts one per row, so the arrangement no
 * longer exists to come back to. Driving the deployed dashboard through
 * 11 -> 4 -> 8 -> 2 -> 11 flattened a three-across layout into a single stacked
 * column, permanently, with no undo.
 *
 * The fix makes the column control a VIEW: `currentLayouts` already derives the
 * display at `layoutCols` from the authored layout at `baseCols`, so storage can
 * be left alone until the user actually edits.
 */

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

const saved = (pageKey: string) => store.get(`page:${pageKey}_grid_layouts`) as GridLayouts | undefined;

/** A real three-across-then-two-across arrangement, the shape that was lost. */
const authored: GridLayouts = {
  lg: [
    { i: 'a', x: 0, y: 0, w: 4, h: 8 },
    { i: 'b', x: 4, y: 0, w: 3, h: 8 },
    { i: 'c', x: 7, y: 0, w: 4, h: 8 },
    { i: 'd', x: 0, y: 8, w: 6, h: 7 },
    { i: 'e', x: 6, y: 8, w: 5, h: 7 },
  ],
};
const shape = (l?: GridLayouts) =>
  (l?.lg ?? []).map((i) => [i.i, i.x, i.y, i.w, i.h].join(':')).join(' | ');

describe('rescaleLayout is lossy on its own — which is why storage must not go through it', () => {
  it('an 11 -> 2 -> 11 round trip does NOT restore the arrangement', () => {
    const narrow = rescaleLayout(authored, 11, 2);
    const back = rescaleLayout(narrow, 2, 11);
    expect(shape(back)).not.toBe(shape(authored));
    // every item ends up the same width in one column — the specific damage
    expect(new Set((back.lg ?? []).map((i) => i.w)).size).toBe(1);
    expect(new Set((back.lg ?? []).map((i) => i.x))).toEqual(new Set([0]));
  });

  it('is lossless only where nothing had to be clamped', () => {
    const wide = rescaleLayout(authored, 11, 22);
    expect(shape(rescaleLayout(wide, 22, 11))).toBe(shape(authored));
  });
});

describe('handleColumnChange', () => {
  beforeEach(() => {
    store.clear();
    store.set('page:dash_grid_layouts', structuredClone(authored));
  });

  it('writes NOTHING to storage', () => {
    const before = shape(saved('dash'));
    const { result } = renderHook(() =>
      usePageGridLayout({ pageKey: 'dash', defaultLayouts: authored, preferenceAdapter: durableAdapter }),
    );
    act(() => result.current.handleColumnChange(2));
    expect(shape(saved('dash'))).toBe(before);
    act(() => result.current.handleColumnChange(4));
    expect(shape(saved('dash'))).toBe(before);
  });

  it('survives the exact sequence that flattened the dashboard, 11 -> 4 -> 8 -> 2 -> 11', () => {
    const before = shape(saved('dash'));
    const { result } = renderHook(() =>
      usePageGridLayout({ pageKey: 'dash', defaultLayouts: authored, preferenceAdapter: durableAdapter }),
    );
    for (const cols of [4, 8, 2, 11]) act(() => result.current.handleColumnChange(cols));
    expect(shape(saved('dash'))).toBe(before);
  });

  it('still CHANGES what is displayed — a no-op control would also pass the tests above', () => {
    const { result } = renderHook(() =>
      usePageGridLayout({ pageKey: 'dash', defaultLayouts: authored, preferenceAdapter: durableAdapter }),
    );
    const wideWidths = (result.current.currentLayouts.lg ?? []).map((i) => i.w);
    act(() => result.current.handleColumnChange(2));
    const narrowWidths = (result.current.currentLayouts.lg ?? []).map((i) => i.w);
    expect(narrowWidths).not.toEqual(wideWidths);
    expect(Math.max(...narrowWidths)).toBeLessThanOrEqual(2);
  });
});

describe('the grid reflow that a column change causes is not a user gesture', () => {
  beforeEach(() => {
    store.clear();
    store.set('page:dash_grid_layouts', structuredClone(authored));
  });

  /**
   * THE DEFECT THE FIRST FIX MISSED, AND THE DEPLOYED APP CAUGHT.
   *
   * Removing the writes from `handleColumnChange` was not enough. react-grid-layout
   * REFLOWS when the column count changes and emits `onLayoutChange` with the
   * rescaled display — which `commitLayout` then wrote straight over the authored
   * layout. The unit tests passed because they call the handler directly with no
   * grid attached. Driving `d.crm.crm7.app` is what found it: the persisted widths
   * still marched 2,2,2 -> 4,4,4 -> 1,1,1 with the handler already inert.
   */
  /* The commit path is onLayoutChange -> trailing rAF -> commitLayout. Without
   * awaiting that frame BOTH tests below pass vacuously, because nothing has been
   * written yet either way — which would make the suppression test unfalsifiable.
   * The gesture test is the control that proves the frame really flushes. */
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

  it('does not persist the layout react-grid-layout emits after a column change', async () => {
    const before = shape(saved('dash'));
    const { result } = renderHook(() =>
      usePageGridLayout({ pageKey: 'dash', defaultLayouts: authored, preferenceAdapter: durableAdapter }),
    );
    act(() => result.current.setIsEditing?.(true));
    act(() => result.current.handleColumnChange(4));
    // exactly what the grid emits after reflowing: the layout it just rendered
    // false = no pointer gesture produced this. That is what the grid reports for
    // a reflow, and it is the only thing that distinguishes one.
    act(() => result.current.onLayoutChange(null, result.current.currentLayouts, false));
    await act(async () => { await nextFrame(); });
    expect(shape(saved('dash'))).toBe(before);
  });

  it('STILL persists a real gesture — a suppression that swallowed those would be worse', async () => {
    const before = shape(saved('dash'));
    const { result } = renderHook(() =>
      usePageGridLayout({ pageKey: 'dash', defaultLayouts: authored, preferenceAdapter: durableAdapter }),
    );
    act(() => result.current.setIsEditing?.(true));
    const moved = {
      ...result.current.currentLayouts,
      lg: (result.current.currentLayouts.lg ?? []).map((i) =>
        i.i === 'a' ? { ...i, y: i.y + 5 } : i,
      ),
    };
    act(() => result.current.onLayoutChange(null, moved, true));
    await act(async () => { await nextFrame(); });
    expect(shape(saved('dash'))).not.toBe(before);
  });
});

describe('an auto-height card re-measuring is not a resize gesture', () => {
  const autoAuthored: GridLayouts = {
    lg: [
      { i: 'a', x: 0, y: 0, w: 4, h: 8, autoHeight: true },
      { i: 'b', x: 4, y: 0, w: 3, h: 8, autoHeight: true },
      { i: 'c', x: 7, y: 0, w: 4, h: 8, autoHeight: true },
    ],
  };
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

  beforeEach(() => {
    store.clear();
    store.set('page:dash_grid_layouts', structuredClone(autoAuthored));
  });

  const mount = () =>
    renderHook(() =>
      usePageGridLayout({ pageKey: 'dash', defaultLayouts: autoAuthored, preferenceAdapter: durableAdapter }),
    );

  /**
   * THE DEFECT 1.0.5 STILL HAD, and the third one this bug produced.
   *
   * Narrow an auto-height card and its content rewraps taller, so the
   * ResizeObserver emits a new `h`. That emission differs from what was rendered,
   * so a shape comparison calls it a gesture — and commits the RESCALED WIDTHS
   * riding along with it. Authored w=4,3,4 came back w=1,1,1 after nothing but a
   * height re-measure.
   */
  it('a height-only re-measure after a column change persists NOTHING', async () => {
    const before = shape(saved('dash'));
    const { result } = mount();
    act(() => result.current.setIsEditing?.(true));
    act(() => result.current.handleColumnChange(4));
    const remeasured = {
      ...result.current.currentLayouts,
      lg: (result.current.currentLayouts.lg ?? []).map((i, n) => (n === 0 ? { ...i, h: i.h + 3 } : i)),
    };
    act(() => result.current.onLayoutChange(null, remeasured, false));
    await act(async () => { await nextFrame(); });
    expect(shape(saved('dash'))).toBe(before);
  });

  /** The control. Suppressing a real resize would reopen crm7#744. */
  it('the SAME emission WITH a gesture does persist', async () => {
    const before = shape(saved('dash'));
    const { result } = mount();
    act(() => result.current.setIsEditing?.(true));
    act(() => result.current.handleColumnChange(4));
    const dragged = {
      ...result.current.currentLayouts,
      lg: (result.current.currentLayouts.lg ?? []).map((i, n) => (n === 0 ? { ...i, h: i.h + 3 } : i)),
    };
    act(() => result.current.onLayoutChange(null, dragged, true));
    await act(async () => { await nextFrame(); });
    expect(shape(saved('dash'))).not.toBe(before);
  });

  /**
   * A NON-GESTURE NEVER COMMITS, however different the layout looks.
   *
   * This test asserted the opposite until 1.0.7, and that assumption is exactly
   * what kept the bug alive: react-grid-layout COMPACTS after a reflow, so its
   * emission legitimately differs in x/y/w from what we rendered. Treating "it
   * looks different" as "the user did it" is what wrote the rescaled arrangement
   * over the authored one, three releases running.
   */
  it('a width change reported as a non-gesture does NOT commit', async () => {
    const before = shape(saved('dash'));
    const { result } = mount();
    act(() => result.current.setIsEditing?.(true));
    const widened = {
      ...result.current.currentLayouts,
      lg: (result.current.currentLayouts.lg ?? []).map((i) => (i.i === 'b' ? { ...i, w: i.w + 1 } : i)),
    };
    act(() => result.current.onLayoutChange(null, widened, false));
    await act(async () => { await nextFrame(); });
    expect(shape(saved('dash'))).toBe(before);

    // ...and the SAME emission, reported as a gesture, does commit.
    act(() => result.current.onLayoutChange(null, widened, true));
    await act(async () => { await nextFrame(); });
    expect(shape(saved('dash'))).not.toBe(before);
  });
});
