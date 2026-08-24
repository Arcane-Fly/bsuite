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
