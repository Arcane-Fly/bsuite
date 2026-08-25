import React, { useCallback, useState } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import type { GridLayouts, PageGridPreferenceFactory } from '../types.js';

/**
 * WHAT THIS FILE CAN AND CANNOT PROVE — stated, because the gap is the whole story.
 *
 * This bug shipped THREE TIMES (1.0.4, 1.0.5, 1.0.6) with a full green suite. Every
 * test drove the HOOK — `handleColumnChange`, `onLayoutChange` — with no grid
 * attached, so none of them ever instantiated the object doing the writing:
 * react-grid-layout, emitting after its own reflow and compaction.
 *
 * The obvious remedy is an integration test that clicks the real control. It cannot
 * live here: `PageGridLayout` renders NO editor chrome of its own — no "Edit page"
 * affordance, no column presets, not one button. Measured, not assumed: rendering it
 * with `canEditPage` produces zero `<button>` elements. That chrome belongs to the
 * host (crm7's `pageGridLayoutAdapter` and its page-editor launcher), so the full
 * path is only reachable in an app, or on a deploy.
 *
 * So this file proves the one thing it honestly can — that merely rendering and
 * re-rendering the grid writes nothing — and the round trip is verified against
 * `d.crm.crm7.app` on a VARIED layout, which is the check that caught all three
 * previous attempts. A uniform layout round-trips even when the code is broken, so
 * it must be varied or it proves nothing.
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

const authored: GridLayouts = {
  lg: [
    { i: 'a', x: 0, y: 0, w: 4, h: 8 },
    { i: 'b', x: 4, y: 0, w: 4, h: 8 },
    { i: 'c', x: 8, y: 0, w: 4, h: 8 },
    { i: 'd', x: 0, y: 8, w: 7, h: 7 },
    { i: 'e', x: 7, y: 8, w: 5, h: 7 },
  ],
};
const widgets = Object.fromEntries(
  (authored.lg ?? []).map((i) => [i.i, <div key={i.i}>{i.i} content</div>]),
);
const saved = () => store.get('page:cols_grid_layouts') as GridLayouts | undefined;
const shape = (l?: GridLayouts) =>
  (l?.lg ?? []).map((i) => `${i.i}:${i.x}:${i.y}:${i.w}`).join(' | ');

describe('rendering the grid does not rewrite the stored layout', () => {
  beforeEach(() => {
    store.clear();
    store.set('page:cols_grid_layouts', structuredClone(authored));
  });

  const mount = (props: Record<string, unknown> = {}) =>
    render(
      <PageGridLayout
        pageKey="cols"
        defaultLayouts={authored}
        widgets={widgets}
        preferenceAdapter={durableAdapter}
        isResizable
        {...props}
      />,
    );

  it('the fixture is VARIED — a uniform layout would prove nothing', () => {
    expect(new Set((saved()?.lg ?? []).map((i) => i.w)).size).toBeGreaterThan(1);
  });

  it('a plain render writes nothing', async () => {
    const before = shape(saved());
    await act(async () => { mount(); });
    expect(shape(saved())).toBe(before);
  });

  it('entering edit mode writes nothing', async () => {
    const before = shape(saved());
    await act(async () => { mount({ canEditPage: true }); });
    expect(shape(saved())).toBe(before);
  });

  it('a re-render writes nothing', async () => {
    const before = shape(saved());
    let view!: ReturnType<typeof mount>;
    await act(async () => { view = mount({ canEditPage: true }); });
    await act(async () => { view.rerender(
      <PageGridLayout
        pageKey="cols"
        defaultLayouts={authored}
        widgets={widgets}
        preferenceAdapter={durableAdapter}
        isResizable
        canEditPage
      />,
    ); });
    expect(shape(saved())).toBe(before);
  });

  it('renders no editor chrome of its own — which is WHY the round trip is not testable here', () => {
    const view = mount({ canEditPage: true });
    expect(view.container.querySelectorAll('button').length).toBe(0);
    expect(view.container.querySelector('[aria-label*="Edit page" i]')).toBeNull();
  });
});
