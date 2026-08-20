import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageGridLayout } from '../PageGridLayout.js';
import { computeAutoHeightRows } from '../autoHeight.js';
import type { GridLayouts, PageGridPreferenceFactory } from '../types.js';

/**
 * End-to-end integration of the measured auto-height pipeline
 * (quality-review IMPORTANT #4): real `PageGridLayout` + real
 * react-grid-layout, with only ResizeObserver + offsetWidth faked.
 *
 * ResizeObserver (GridItem measure div)
 *   -> onAutoHeightChange (per-widget rAF)
 *   -> handleAutoHeightChange (pending map, flush rAF)
 *   -> flushAutoHeightUpdates (ONE applyAutoHeightRows batch)
 *   -> activeLayouts merge
 *   -> react-grid-layout renders the measured pixel height.
 *
 * Covers the exact CRITICAL #1 regression: two autoHeight cards settling in
 * the SAME animation frame must BOTH keep their measured heights (the old
 * per-key loop over a stale closure kept only the last), and CRITICAL #2:
 * the whole pipeline must produce ZERO preference-adapter writes for a
 * viewer who never enters edit mode.
 */

// Grid geometry constants — must mirror PageGridLayout.tsx's
// DEFAULT_ROW_HEIGHT / DEFAULT_MARGIN / DEFAULT_CARD_CHROME_PX.
const ROW_HEIGHT = 32;
const MARGIN_Y = 6;
const CARD_CHROME = 2;

const expectedRows = (contentPx: number) =>
  computeAutoHeightRows({
    contentPx,
    cardChromePx: CARD_CHROME,
    rowHeightPx: ROW_HEIGHT,
    marginYPx: MARGIN_Y,
  });

// react-grid-layout's item pixel height for h rows.
const rowsToPx = (rows: number) => rows * ROW_HEIGHT + Math.max(0, rows - 1) * MARGIN_Y;

type ObserverEntry = { target: Element; cb: ResizeObserverCallback; instance: ResizeObserver };

describe('PageGridLayout auto-height integration (ResizeObserver -> flush -> render)', () => {
  let observers: ObserverEntry[] = [];
  let originalRO: typeof globalThis.ResizeObserver;
  let originalOffsetWidth: PropertyDescriptor | undefined;

  beforeEach(() => {
    observers = [];
    originalRO = globalThis.ResizeObserver;
    originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

    // Desktop-width container so react-grid-layout resolves the lg breakpoint.
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return 1200;
      },
    });

    class FakeRO implements ResizeObserver {
      private cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(target: Element): void {
        observers.push({ target, cb: this.cb, instance: this });
      }
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      FakeRO as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      originalRO;
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    } else {
      // @ts-expect-error - remove the test-only override
      delete HTMLElement.prototype.offsetWidth;
    }
  });

  /** The measure observer for a card is the one whose target contains that
   * card's content and nothing else — the page container observer contains
   * every card, so require exclusivity. */
  function measureObserverFor(ownTestId: string, otherTestId: string): ObserverEntry {
    const own = screen.getByTestId(ownTestId);
    const other = screen.getByTestId(otherTestId);
    const entry = observers.find(
      ({ target }) => target.contains(own) && !target.contains(other),
    );
    if (!entry) throw new Error(`no measure observer found for ${ownTestId}`);
    return entry;
  }

  function fireContentHeight(entry: ObserverEntry, heightPx: number) {
    entry.cb(
      [
        {
          target: entry.target,
          contentRect: {
            width: 500,
            height: heightPx,
            top: 0,
            left: 0,
            bottom: heightPx,
            right: 500,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        },
      ],
      entry.instance,
    );
  }

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  function gridItemFor(testId: string): HTMLElement {
    const item = screen.getByTestId(testId).closest<HTMLElement>('.react-grid-item');
    if (!item) throw new Error(`no .react-grid-item ancestor for ${testId}`);
    return item;
  }

  const defaultLayouts: GridLayouts = {
    lg: [
      { i: 'card2', x: 0, y: 0, w: 6, h: 6, autoHeight: true },
      { i: 'card3', x: 6, y: 0, w: 6, h: 6, autoHeight: true },
    ],
  };

  const widgets = {
    card2: <div data-testid="card2-content">Tabs card</div>,
    card3: <div data-testid="card3-content">Entity linker</div>,
  };

  it('two autoHeight cards settling in the SAME frame BOTH render their measured heights (CRITICAL #1)', async () => {
    await act(async () => {
      render(
        <PageGridLayout
          pageKey="autoheight-integration"
          defaultLayouts={defaultLayouts}
          widgets={widgets}
        />,
      );
    });

    const card2Observer = measureObserverFor('card2-content', 'card3-content');
    const card3Observer = measureObserverFor('card3-content', 'card2-content');

    const card2ContentPx = 800;
    const card3ContentPx = 240;

    await act(async () => {
      // Both observers fire in the same frame — the mount-settle scenario on
      // /people/:id (card2 tabs + card3 entity linker).
      fireContentHeight(card2Observer, card2ContentPx);
      fireContentHeight(card3Observer, card3ContentPx);
      // Frame 1: per-widget measure rAFs -> pending map + flush scheduled.
      // Frame 2: flush -> one applyAutoHeightRows batch -> re-render.
      await nextFrame();
      await nextFrame();
    });

    const card2Rows = expectedRows(card2ContentPx);
    const card3Rows = expectedRows(card3ContentPx);
    expect(card2Rows).not.toBe(card3Rows); // meaningful multi-widget scenario

    expect(gridItemFor('card2-content').style.height).toBe(`${rowsToPx(card2Rows)}px`);
    expect(gridItemFor('card3-content').style.height).toBe(`${rowsToPx(card3Rows)}px`);
  });

  // ── Resize is a capability, not a trade-off ──────────────────────────────
  //
  // `autoHeight` used to force `isResizable: false` and overwrite `h` with the
  // measured height. Together those removed card resizing from every page whose
  // cards use the default, and would have discarded any height a user set.
  //
  // Resizable cards are operator-mandated (Braden, 2026-07-31: "no ruling has
  // ever had my authority to suppress resizing"). autoHeight is now a FLOOR:
  // content can never be clipped, and a deliberately-set larger height sticks.
  it('autoHeight does NOT disable resize handles', async () => {
    await act(async () => {
      render(
        <PageGridLayout
          pageKey="autoheight-resize-enabled"
          defaultLayouts={defaultLayouts}
          widgets={widgets}
          canEditPage
        />,
      );
    });

    // Edit mode is hook state, not a prop — entered via the same event the
    // real editor toolbar dispatches.
    await act(async () => {
      window.dispatchEvent(new CustomEvent('bsuite-open-page-editor'));
    });

    const observer = measureObserverFor('card2-content', 'card3-content');
    await act(async () => {
      fireContentHeight(observer, 240);
      await nextFrame();
      await nextFrame();
    });

    // react-grid-layout marks a non-resizable item by omitting the handles.
    const item = gridItemFor('card2-content');
    expect(item.className).not.toContain('react-resizable-hide');
    expect(item.querySelector('.react-resizable-handle')).not.toBeNull();
  });

  // 0.6.0 removed the render-layer override but did NOT heal what 0.5.2 had
  // already written into saved layouts. RGL honours an explicit per-item
  // boolean over the grid default, so every existing user stayed stuck.
  // Verified in a real browser before writing this: the saved preference held
  // `"isResizable":false` on all 6 cards.
  it('heals a PERSISTED isResizable:false on an autoHeight item', async () => {
    const poisoned: GridLayouts = {
      lg: [
        { i: 'card2', x: 0, y: 0, w: 6, h: 6, autoHeight: true, isResizable: false },
        { i: 'card3', x: 6, y: 0, w: 6, h: 6, autoHeight: true, isResizable: false },
      ],
    };

    await act(async () => {
      render(
        <PageGridLayout
          pageKey="autoheight-heal-persisted"
          defaultLayouts={poisoned}
          widgets={widgets}
          canEditPage
        />,
      );
    });
    await act(async () => {
      window.dispatchEvent(new CustomEvent('bsuite-open-page-editor'));
    });

    const observer = measureObserverFor('card2-content', 'card3-content');
    await act(async () => {
      fireContentHeight(observer, 240);
      await nextFrame();
      await nextFrame();
    });

    const item = gridItemFor('card2-content');
    expect(item.className).not.toContain('react-resizable-hide');
  });

  it('a user-set height LARGER than the measured content is preserved, not stomped', async () => {
    // h = 20 rows, MARKED `hUserSet` — the user dragged the SE handle to it.
    // Content measures far smaller. The old code replaced `h` with the measured
    // value on every re-measure, so a user who enlarged a card watched it snap
    // back.
    //
    // Until 2026-08-20 this fixture carried no marker, so what it actually
    // proved was that ANY saved height survives — a seed included. The test's
    // own comment called the value "seeded" while its name called it
    // "user-set", which is the conflation the render layer then acted on. See
    // the sibling test below for the case that separates them.
    const tallLayouts: GridLayouts = {
      lg: [
        { i: 'card2', x: 0, y: 0, w: 6, h: 20, autoHeight: true, hUserSet: true },
        { i: 'card3', x: 6, y: 0, w: 6, h: 6, autoHeight: true },
      ],
    };

    await act(async () => {
      render(
        <PageGridLayout
          pageKey="autoheight-user-height-kept"
          defaultLayouts={tallLayouts}
          widgets={widgets}
        />,
      );
    });

    const observer = measureObserverFor('card2-content', 'card3-content');
    const smallContentPx = 120;
    await act(async () => {
      fireContentHeight(observer, smallContentPx);
      await nextFrame();
      await nextFrame();
    });

    const measuredRows = expectedRows(smallContentPx);
    expect(measuredRows).toBeLessThan(20); // the scenario is only meaningful if so
    expect(gridItemFor('card2-content').style.height).toBe(`${rowsToPx(20)}px`);
  });

  it('an AUTHORED SEED larger than the content shrinks to the content', async () => {
    // The same shape as the test above with the marker removed — which is the
    // whole point. An author's seed is a guess made before any content existed;
    // it carries no user intent, so it has no claim to be preserved.
    //
    // This is the case that reached production. Measured signed-in on crm7
    // /dashboard 2026-08-20: 1,143px of dead space across 7 cards, every
    // allocation equal to its seed `h` rather than its content.
    // `recentActivity` seeds 13 rows (488px) and paints 173px — 315px dead.
    // `Math.ceil` over-allocates by at most one row unit (38px), so rounding
    // could never account for it; only a floor that never lowers can.
    const seededTall: GridLayouts = {
      lg: [
        { i: 'card2', x: 0, y: 0, w: 6, h: 20, autoHeight: true },
        { i: 'card3', x: 6, y: 0, w: 6, h: 6, autoHeight: true },
      ],
    };

    await act(async () => {
      render(
        <PageGridLayout
          pageKey="autoheight-seed-is-not-a-choice"
          defaultLayouts={seededTall}
          widgets={widgets}
        />,
      );
    });

    const observer = measureObserverFor('card2-content', 'card3-content');
    const smallContentPx = 120;
    await act(async () => {
      fireContentHeight(observer, smallContentPx);
      await nextFrame();
      await nextFrame();
    });

    const measuredRows = expectedRows(smallContentPx);
    expect(measuredRows).toBeLessThan(20); // the scenario is only meaningful if so
    expect(gridItemFor('card2-content').style.height).toBe(`${rowsToPx(measuredRows)}px`);
  });

  it('a viewer re-measuring (tab switches) produces ZERO preference-adapter writes (CRITICAL #2)', async () => {
    const store = new Map<string, unknown>();
    const state = { writes: 0 };
    const countingAdapter: PageGridPreferenceFactory = (key, fallback) => {
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

    await act(async () => {
      render(
        <PageGridLayout
          pageKey="autoheight-viewer-writes"
          defaultLayouts={defaultLayouts}
          widgets={widgets}
          preferenceAdapter={countingAdapter}
        />,
      );
      // Let the one-time layoutVersion seeding settle before baselining.
      await nextFrame();
    });
    const writesAfterMount = state.writes;

    const card2Observer = measureObserverFor('card2-content', 'card3-content');

    // Simulate a read-only viewer flipping through tabs inside card2: each
    // switch re-measures at a different content height.
    for (const px of [800, 320, 1100]) {
      await act(async () => {
        fireContentHeight(card2Observer, px);
        await nextFrame();
        await nextFrame();
      });
    }

    // Heights rendered (last measurement wins visually)…
    expect(gridItemFor('card2-content').style.height).toBe(
      `${rowsToPx(expectedRows(1100))}px`,
    );
    // …but NOT ONE write reached the preference adapter.
    expect(state.writes).toBe(writesAfterMount);
  });
});
