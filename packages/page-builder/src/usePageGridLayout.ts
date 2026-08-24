import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { verticalCompactor } from 'react-grid-layout';
import {
  buildResponsiveLayouts,
  isCanonicalisableBreakpoint,
  isDerivedBreakpoint,
} from './buildResponsiveLayouts.js';
import { defaultPreferenceAdapter } from './preferences.js';
import { rescaleLayout } from './rescaleLayout.js';
import type {
  GridLayoutItem,
  GridLayouts,
  UsePageGridLayoutOptions,
  UsePageGridLayoutResult,
} from './types.js';

export const DEFAULT_EDITOR_EVENT_NAMES = [
  'bsuite-open-page-editor',
  'bsu-open-page-editor',
  'crm7-open-page-editor',
  'conduit-open-page-editor',
  'r80-open-page-editor',
] as const;

/**
 * Event name broadcast on `window` whenever any PageGridLayout transitions
 * its `isEditing` state. Launcher widgets (e.g. floating "Edit Page" FABs)
 * subscribe to this so they can hide themselves while the canvas editor is
 * already active — prevents the redundant-affordance UX issue where a
 * "Edit Page" button sits in the corner while the editor banner is visible
 * at the top. `detail.editing` is the new state; `detail.pageKey` lets
 * launchers scope by page if they handle multiple grids on one screen.
 */
export const PAGE_GRID_EDITING_EVENT = 'bsuite-page-grid-editing';

/**
 * Package-wide layout epoch, added to EVERY consumer's `layoutVersion`.
 *
 * When a default that governs all grids changes, a saved layout produced under
 * the old default has to be invalidated — and there is no way to reach ~330
 * call sites across six apps to hand-bump each one. crm7's `DraggableCardPage`
 * already solved this locally with its own `LAYOUT_EPOCH`; this is the same
 * lever one level down, so it also covers the raw `PageGridLayout` consumers
 * (Dashboard, Billing, GTO, Analytics, the throughput and braden pages) that
 * no app-level epoch can see.
 *
 * 0 -> 1000 (2026-08-13, D-75/D-76): two all-grids defaults changed in the same
 * release — `autoHeight` now defaults to true for raw consumers, and md/sm no
 * longer collapse to a full-width stack. Every stored layout predates both and
 * was additionally polluted with frozen derived breakpoints, so all of them
 * reset once to the corrected defaults.
 *
 * Per-page `layoutVersion` bumps keep working on top; this only moves the
 * floor.
 */
export const PACKAGE_LAYOUT_EPOCH = 1000;

/**
 * Default for `GridLayoutItem.autoHeight` when an item does not state one.
 *
 * D-76 ("cards render half cut off on page open"). `DraggableCardPage` has
 * defaulted this to true since the E5a flip, but a RAW `PageGridLayout`
 * consumer builds its layout array by hand and inherits nothing — the flag had
 * to be written on every item. Sixteen of the eighteen raw consumers across the
 * suite never did, so their cards were fixed at whatever seed `h` the author
 * guessed and clipped everything past it behind `overflow-auto`. That is not a
 * per-page authoring mistake repeated sixteen times; it is a default in the
 * wrong place. An item that genuinely owns its own scroll (a virtualized list)
 * opts out with an explicit `autoHeight: false`.
 */
const DEFAULT_ITEM_AUTO_HEIGHT = true;

export interface PageGridEditingEventDetail {
  pageKey: string;
  editing: boolean;
}

export function usePageGridLayout({
  pageKey,
  defaultLayouts,
  defaultCols = 12,
  layoutVersion = 1,
  canEditPage = true,
  editorEventNames = DEFAULT_EDITOR_EVENT_NAMES,
  preferenceAdapter = defaultPreferenceAdapter,
  defaultAutoHeight,
}: UsePageGridLayoutOptions): UsePageGridLayoutResult {
  const effectiveLayoutVersion = layoutVersion + PACKAGE_LAYOUT_EPOCH;
  const containerRef = useRef<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isEditing, setIsEditingState] = useState(false);
  const setIsEditing = useCallback(
    (next: boolean | ((previous: boolean) => boolean)) => {
      setIsEditingState((previous) => {
        const resolved = typeof next === 'function' ? next(previous) : next;
        if (resolved !== previous && typeof window !== 'undefined') {
          // Broadcast to FAB launchers so they can hide while the editor is open.
          window.dispatchEvent(
            new CustomEvent<PageGridEditingEventDetail>(PAGE_GRID_EDITING_EVENT, {
              detail: { pageKey, editing: resolved },
            }),
          );
        }
        return resolved;
      });
    },
    [pageKey],
  );
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.offsetWidth);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const width = entry.contentRect.width;
          setContainerWidth((previous) => (width === previous ? previous : width));
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    const onResize = () => setContainerWidth(el.offsetWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { value: savedLayoutVersion, setValue: setSavedLayoutVersion, loaded: versionLoaded } =
    preferenceAdapter<number>(`page:${pageKey}_grid_version`, 0);
  const { value: savedLayout, setValue: setSavedLayout, loaded: layoutLoaded } =
    preferenceAdapter<GridLayouts>(`page:${pageKey}_grid_layouts`, defaultLayouts);
  const { value: savedLayoutCols, setValue: setLayoutCols } =
    preferenceAdapter<number>(`page:${pageKey}_grid_cols`, defaultCols);
  const { value: savedBaseCols, setValue: setBaseCols } =
    preferenceAdapter<number>(`page:${pageKey}_grid_base_cols`, defaultCols);

  const prefsLoaded = layoutLoaded && versionLoaded;

  useEffect(() => {
    if (!prefsLoaded) return;
    if ((savedLayoutVersion ?? 0) < effectiveLayoutVersion) {
      startTransition(() => {
        setSavedLayout(defaultLayouts);
        setLayoutCols(defaultCols);
        setBaseCols(defaultCols);
        setSavedLayoutVersion(effectiveLayoutVersion);
      });
    }
  }, [
    defaultCols,
    defaultLayouts,
    effectiveLayoutVersion,
    prefsLoaded,
    savedLayoutVersion,
    setBaseCols,
    setLayoutCols,
    setSavedLayout,
    setSavedLayoutVersion,
  ]);

  const layoutCols = Math.max(1, savedLayoutCols ?? defaultCols);
  const baseCols = Math.max(1, savedBaseCols ?? defaultCols);

  const rawLayouts = useMemo(() => {
    if (Object.keys(savedLayout || {}).length === 0) return defaultLayouts;
    // Drop DERIVED breakpoints out of a stored layout before anything reads it.
    //
    // Until 0.8.0 react-grid-layout's `onLayoutChange` echo persisted md/sm/xs/
    // xxs alongside lg. `buildResponsiveLayouts` then treated them as
    // consumer-supplied and preserved them verbatim, so a layout derived once —
    // at whatever column count happened to be active that day — outlived every
    // later change to `lg` and to the columns slider (D-75). Every user who has
    // ever dragged a card on any page has that pollution stored, so the fix has
    // to heal on read rather than wait for a layoutVersion bump; `lg` (the only
    // breakpoint that was ever authoritative) is preserved untouched, so nobody
    // loses the arrangement they made.
    const stored = savedLayout as Record<string, GridLayoutItem[]>;
    const saved: Record<string, GridLayoutItem[]> = {};
    for (const bp of Object.keys(stored)) {
      if (isDerivedBreakpoint(bp)) continue;
      saved[bp] = stored[bp];
    }
    if (!saved.lg) saved.lg = stored.lg ?? defaultLayouts.lg ?? [];
    let changed = false;
    const merged: Record<string, GridLayoutItem[]> = {};
    for (const bp of Object.keys(saved)) {
      const savedItems = saved[bp] ?? [];
      const savedKeys = new Set(savedItems.map((item) => item.i));
      const bpDefaults = (defaultLayouts as Record<string, GridLayoutItem[]>)[bp] ?? defaultLayouts.lg;
      const missingItems = bpDefaults.filter((item) => !savedKeys.has(item.i));
      if (missingItems.length > 0) {
        const maxY = savedItems.reduce((max, item) => Math.max(max, item.y + item.h), 0);
        const offsetItems = missingItems.map((item, index) => ({ ...item, y: maxY + index * item.h }));
        merged[bp] = [...savedItems, ...offsetItems];
        changed = true;
      } else {
        merged[bp] = savedItems;
      }
    }
    // `merged` is always returned (never the raw `savedLayout`) because the
    // derived-breakpoint filter above may have removed keys even when no
    // default item was missing — handing back `savedLayout` would smuggle the
    // stale derived breakpoints straight past the heal.
    void changed;
    return merged as GridLayouts;
  }, [savedLayout, defaultLayouts]);

  const currentLayouts = useMemo(() => {
    const rescaled =
      baseCols !== layoutCols ? rescaleLayout(rawLayouts, baseCols, layoutCols) : rawLayouts;
    const responsive = buildResponsiveLayouts(rescaled, { cols: layoutCols });
    // Resolve the autoHeight default HERE rather than at the render layer, so
    // `stripAutoHeightRows` (which reads this object through
    // `currentLayoutsForStripRef`) and `PageGridLayout`'s `activeLayouts` agree
    // on which items are auto-height. They disagreed once before and the
    // measured height leaked into storage.
    const resolvedAutoHeight = defaultAutoHeight ?? DEFAULT_ITEM_AUTO_HEIGHT;
    const resolved: GridLayouts = { lg: [] };
    for (const bp of Object.keys(responsive)) {
      resolved[bp] = (responsive[bp] ?? []).map((item) =>
        item.autoHeight === undefined ? { ...item, autoHeight: resolvedAutoHeight } : item,
      );
    }
    return resolved;
  }, [rawLayouts, baseCols, layoutCols, defaultAutoHeight]);

  /*
   * THERE IS DELIBERATELY NO EFFECT HERE.
   *
   * This used to rescale the stored layout to the new column count and write it
   * back, which made a column change DESTRUCTIVE and unrecoverable. Measured on
   * `rescaleLayout` directly: an 11 -> 2 -> 11 round trip takes
   *
   *   a(w4 @x0) b(w3 @x4) c(w4 @x7) / d(w6 @x0) e(w5 @x6)
   *
   * to five items of w6 stacked one per row at x0. Everything narrows to the
   * one-column minimum on the way down, the row-packer puts one item per row,
   * and coming back up cannot recover an arrangement that no longer exists.
   * That is what flattened the operator's dashboard.
   *
   * `currentLayouts` above already derives the DISPLAY at `layoutCols` from the
   * authored layout at `baseCols`. Leaving storage alone makes the column
   * control a view, and the round trip exact.
   */

  const activeCols = useMemo(
    () => ({ lg: layoutCols, md: layoutCols, sm: layoutCols, xs: layoutCols, xxs: layoutCols }),
    [layoutCols],
  );

  /**
   * The compactor handed to react-grid-layout — the SAME one in edit mode and
   * view mode (bsuite#1588).
   *
   * Why this is NOT `{ ...noCompactor, preventCollision: true }` while editing
   * -------------------------------------------------------------------------
   * That was the original edit-mode config, present since this package's first
   * commit, and it silently made drag/resize gestures unable to persist for
   * any layout with adjacent cards. react-grid-layout derives three knobs
   * straight off the compactor object:
   *
   *   preventCollision = compactor.preventCollision ?? false   // was true
   *   allowOverlap     = compactor.allowOverlap                // false
   *   compactType      = compactor.type                        // was null
   *
   * and feeds them to `moveElement`, whose colliding-move branch is:
   *
   *   if (hasCollisions && preventCollision) {
   *     l.x = oldX; l.y = oldY; l.moved = false; return layout;   // full revert
   *   }
   *
   * With `compactType: null` there is NO compaction to displace the colliding
   * neighbour, so the only outcome for a gesture landing on an occupied cell
   * is a total revert. `onDragStop` then guards its emit with
   * `if (oldLayout && !deepEqual(oldLayout, finalLayout)) onLayoutChange(...)`
   * — a reverted gesture emits NOTHING, so the persisted layout could never
   * change. Resize is rejected by the same lever (`if (preventCollision &&
   * !allowOverlap)` restores the old w/h/x/y). The card still tracked the
   * cursor because react-draggable/react-resizable transform the DOM node
   * directly, independent of whether RGL accepted the move — which is why the
   * gesture looked live while nothing ever saved.
   *
   * In a full-width stack (every card `w: cols` — the dominant archetype on
   * /dashboard and /people/:id) EVERY reorder target is occupied, so EVERY
   * gesture reverted.
   *
   * Why `verticalCompactor` in BOTH modes rather than another combination
   * --------------------------------------------------------------------
   * View mode always compacted vertically. An edit-mode compactor that allows
   * free/overlapping placement therefore produces a layout the viewer
   * immediately re-compacts away — the editor/viewer mismatch meant "free
   * placement" was never deliverable, and Save & Exit re-compacted regardless.
   * One compactor for both modes makes what the user arranges exactly what
   * they get, lets `moveElement` displace neighbours (so reordering a stack
   * works at all), and removes a spurious `onLayoutChange` that RGL fired on
   * every edit-mode toggle purely because `compactType` changed — that echo
   * carried the pre-gesture layout and was the only write reaching storage.
   */
  const activeCompactor = verticalCompactor;

  /**
   * Throttled layout-change handler.
   *
   * `react-grid-layout` fires `onLayoutChange` on **every** drag/resize tick
   * (≈60Hz). The previous implementation called `setSavedLayout` directly,
   * which delegates to a preference adapter — in apps like crm7 that adapter
   * writes to localStorage and/or queues a Supabase upsert per call. Operators
   * reported 6–7s INP blocks on resize gestures (long-task warnings on
   * `.react-resizable-handle-se` and `.react-grid-layout`).
   *
   * Fix: capture the latest layout in a ref each tick (cheap, no React work)
   * and only commit to the preference adapter on a trailing rAF tick. This
   * cuts adapter calls from ~60/sec to ~1/sec during a typical drag while
   * still persisting the final position when the gesture ends. The component
   * still receives `activeLayouts` from `savedLayout` synchronously, so the
   * grid keeps following the cursor visually.
   */
  const pendingLayoutRef = useRef<GridLayouts | null>(null);
  const layoutCommitFrameRef = useRef<number | null>(null);

  /**
   * Strips a DERIVED measured height out of a layout before it reaches the
   * preference adapter — but only when the incoming `h` is nothing more than
   * an ECHO of the render-layer merge, not a real user gesture.
   *
   * react-grid-layout is rendered with `autoHeightRows` merged over the saved
   * layout (see `applyAutoHeightRows` / `activeLayouts` in
   * `PageGridLayout.tsx`: `h = hUserSet ? max(saved, measured) : measured`),
   * so the layouts it
   * echoes back through `onLayoutChange` carry that MERGED `h` for every
   * autoHeight item, on every commit — including commits that never touched
   * this particular item (e.g. a re-measurement of a sibling card, or a
   * column-count change, while mid-edit). Persisting that verbatim would
   * smuggle a measured height into user_preferences and drop the
   * `autoHeight` flag (react-grid-layout does not round-trip custom item
   * props).
   *
   * crm7#744 (2026-07-31): the previous version of this function restored
   * `h`/`minH` from the un-merged base layout UNCONDITIONALLY for every
   * autoHeight item, on every call — which discarded a genuine SE-handle
   * resize just as thoroughly as it discarded a measurement echo, because
   * both arrive as "an `h` that differs from the base." Confirmed in a real
   * signed-in browser: width (never touched by this function) persisted
   * correctly across a resize; height always snapped back to its pre-drag
   * value, deterministically, regardless of drag distance.
   *
   * Fix: only treat the incoming `h` as an echo — and revert it — when it
   * exactly equals what react-grid-layout was actually RENDERED with
   * (`max(baseItem.h, measuredRows)`). Anything else is a deliberate user
   * resize (larger OR smaller) and must persist, still floored by the
   * measured content height so nothing can clip. `x`/`y`/`w` (and `h` for
   * non-autoHeight items) pass through untouched either way.
   *
   * Reads both the base layout and the measured rows via refs so the
   * trailing-rAF commit below never closes over a stale snapshot, and so
   * this callback's identity stays stable across every ResizeObserver tick
   * (avoids recreating `onLayoutChange` — and therefore the `<Responsive>`
   * prop identity react-grid-layout sees — on every measurement).
   */
  const currentLayoutsForStripRef = useRef<GridLayouts | null>(null);
  const autoHeightRowsForStripRef = useRef<Record<string, number>>({});
  const stripAutoHeightRows = useCallback((layouts: GridLayouts): GridLayouts => {
    const base = currentLayoutsForStripRef.current;
    if (!base) return layouts;
    const measured = autoHeightRowsForStripRef.current;
    const result: GridLayouts = { lg: [] };
    for (const bp of Object.keys(layouts)) {
      const baseItems = base[bp] ?? base.lg ?? [];
      const baseByKey = new Map(baseItems.map((item) => [item.i, item]));
      result[bp] = (layouts[bp] ?? []).map((item) => {
        const baseItem = baseByKey.get(item.i);
        if (!baseItem?.autoHeight) return item;

        const measuredRows = measured[item.i];
        // MUST mirror `activeLayouts` in PageGridLayout.tsx exactly, including
        // its `hUserSet` test. This predicts what the grid was RENDERED with;
        // predict a floor it was not rendered with and every measurement echo
        // reads as a deliberate resize and persists — which is the crm7#744
        // failure with its sign reversed.
        const renderedFloorH =
          measuredRows === undefined
            ? baseItem.h
            : baseItem.hUserSet
              ? Math.max(baseItem.h ?? 0, measuredRows)
              : measuredRows;
        if (item.h === renderedFloorH) {
          // Echo of the render-layer merge (or genuinely unchanged) — not a
          // user gesture on THIS item. Restore the un-merged base so a
          // measured bump never persists. `hUserSet` is carried over by hand
          // for the same reason `autoHeight` is: react-grid-layout does not
          // round-trip custom item props, so anything not restored here is
          // silently dropped on the next commit.
          return {
            ...item,
            autoHeight: true,
            h: baseItem.h,
            minH: baseItem.minH,
            ...(baseItem.hUserSet ? { hUserSet: true } : {}),
          };
        }
        // A deliberate resize (bigger or smaller than the base) — keep it,
        // still floored by the measured content height. This is the only
        // moment in the system where a height is known to be a CHOICE rather
        // than an authored seed, so it is where that fact gets recorded.
        return {
          ...item,
          autoHeight: true,
          hUserSet: true,
          h: measuredRows === undefined ? item.h : Math.max(item.h, measuredRows),
          minH: measuredRows ?? baseItem.minH,
        };
      });
    }
    return result;
  }, []);

  useEffect(() => {
    currentLayoutsForStripRef.current = currentLayouts;
  }, [currentLayouts]);

  /**
   * The breakpoint react-grid-layout is currently rendering, tracked so a
   * gesture can be written back to the breakpoint that OWNS it.
   *
   * Seeded to `lg` and corrected by `<Responsive onBreakpointChange>`, which
   * fires on mount once the container width is known.
   */
  const activeBreakpointRef = useRef<string>('lg');
  const handleBreakpointChange = useCallback((breakpoint: string) => {
    activeBreakpointRef.current = breakpoint;
  }, []);

  /**
   * Reduce react-grid-layout's all-breakpoints echo down to the ONE breakpoint
   * that is authoritative — `lg` — or refuse the write.
   *
   * Two defects this closes, both reported as D-75:
   *
   * 1. **The derived breakpoints froze.** RGL echoes every breakpoint on every
   *    gesture. Persisting them made them consumer-supplied, so
   *    `buildResponsiveLayouts` stopped deriving them and the columns slider
   *    (which rescales `lg`) could no longer reach the breakpoint actually on
   *    screen. Below a 1200px container — i.e. most real desktop sessions once
   *    the sidebar is subtracted — moving the slider changed nothing at all.
   *
   * 2. **An edit made at `md`/`sm` was invisible at `lg`.** The gesture landed
   *    in `layouts.md`; `layouts.lg` kept its old values; the same user on a
   *    wider monitor saw their arrangement revert. `md` and `sm` render the
   *    same array against the same column count as `lg`, so folding the
   *    gesture onto `lg` is lossless and makes one arrangement follow the user
   *    across every window size.
   *
   * `xs`/`xxs` return `null` (no write). Those breakpoints render a full-width
   * stack, so a gesture there carries only a vertical order; applying it to
   * `lg` would flatten a multi-column desktop arrangement that the user cannot
   * even see on that device. Refusing the write is the conservative half of
   * the trade: a phone visit can no longer destroy the desktop layout, at the
   * cost of phone-only reordering not persisting. Stated in the PR, not hidden.
   */
  const canonicaliseLayoutForPersist = useCallback((layouts: GridLayouts): GridLayouts | null => {
    const breakpoint = activeBreakpointRef.current;
    if (!isCanonicalisableBreakpoint(breakpoint)) return null;
    const items = layouts[breakpoint] ?? layouts.lg;
    if (!items) return null;
    const next: GridLayouts = { lg: items };
    // Preserve any breakpoint a CONSUMER supplied deliberately (never a
    // derived one) so an opt-out layout is not silently discarded.
    for (const bp of Object.keys(layouts)) {
      if (bp === 'lg' || isDerivedBreakpoint(bp)) continue;
      next[bp] = layouts[bp] ?? [];
    }
    return next;
  }, []);

  /**
   * Persist a layout the USER authored, and re-base the column count to the one
   * they authored it at.
   *
   * Re-basing belongs here and ONLY here. A column-count change is a view
   * operation and must not touch storage — see `handleColumnChange`. An edit is
   * the one moment the stored arrangement and the stored column count are known
   * to agree, so it is the one moment `baseCols` may move.
   */
  const commitLayout = useCallback(
    (layouts: GridLayouts) => {
      const canonical = canonicaliseLayoutForPersist(layouts);
      if (!canonical) return;
      setSavedLayout(stripAutoHeightRows(canonical));
      setBaseCols(layoutCols);
    },
    [canonicaliseLayoutForPersist, layoutCols, setBaseCols, setSavedLayout, stripAutoHeightRows],
  );


  const onLayoutChange = useCallback(
    (_layout: unknown, layouts: unknown) => {
      if (!isEditing) return;
      pendingLayoutRef.current = layouts as GridLayouts;
      if (layoutCommitFrameRef.current !== null) return;
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        commitLayout(layouts as GridLayouts);
        return;
      }
      // Trailing rAF — lets a burst of resize ticks coalesce into one commit.
      layoutCommitFrameRef.current = window.requestAnimationFrame(() => {
        layoutCommitFrameRef.current = null;
        const pending = pendingLayoutRef.current;
        if (pending) {
          pendingLayoutRef.current = null;
          commitLayout(pending);
        }
      });
    },
    [commitLayout, isEditing],
  );

  useEffect(() => {
    return () => {
      if (
        layoutCommitFrameRef.current !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(layoutCommitFrameRef.current);
      }
    };
  }, []);

  /**
   * Change how many columns the canvas is DISPLAYED at.
   *
   * This writes nothing to storage. `currentLayouts` rescales the authored
   * layout for display on every render, so switching 11 -> 2 -> 11 returns the
   * user to exactly what they authored. The previous version persisted the
   * rescale, which destroyed the arrangement at the narrow end and offered no
   * undo. Storage moves only when the user actually edits — see `commitLayout`.
   */
  const handleColumnChange = useCallback(
    (newCols: number) => {
      setLayoutCols(newCols);
    },
    [setLayoutCols],
  );

  /**
   * Build the object handed to the preference adapter from a new `lg` array.
   *
   * Only `lg` and consumer-supplied breakpoints are stored; md/sm/xs/xxs are
   * re-derived on every render. Before 0.8.0 every mutator below spread
   * `currentLayouts` (which contains the derived breakpoints) into its write,
   * which re-froze them one gesture after `rawLayouts` had healed them.
   */
  const layoutsWithLg = useCallback(
    (items: GridLayoutItem[]): GridLayouts => {
      const next: GridLayouts = { lg: items };
      for (const bp of Object.keys(currentLayouts)) {
        if (bp === 'lg' || isDerivedBreakpoint(bp)) continue;
        next[bp] = currentLayouts[bp] ?? [];
      }
      return next;
    },
    [currentLayouts],
  );
  /** Persist a bare `lg` item list from a mutator, re-basing the same way. */
  const commitItems = useCallback(
    (items: GridLayoutItem[]) => {
      setSavedLayout(layoutsWithLg(items));
      setBaseCols(layoutCols);
    },
    [layoutCols, layoutsWithLg, setBaseCols, setSavedLayout],
  );

  const handleCompact = useCallback(() => {
    if (!currentLayouts.lg) return;
    const sorted = [...currentLayouts.lg].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
    const placed: typeof sorted = [];
    const result = sorted.map((item) => {
      let newY = 0;
      for (const placedItem of placed) {
        const overlapsHorizontally = item.x < placedItem.x + placedItem.w && item.x + item.w > placedItem.x;
        if (overlapsHorizontally) newY = Math.max(newY, placedItem.y + placedItem.h);
      }
      const compacted = { ...item, y: newY };
      placed.push(compacted);
      return compacted;
    });
    startTransition(() => commitItems(result));
  }, [currentLayouts, commitItems]);

  const handleReset = useCallback(() => {
    startTransition(() => {
      setSavedLayout(defaultLayouts);
      setLayoutCols(defaultCols);
      setBaseCols(defaultCols);
    });
  }, [defaultCols, defaultLayouts, setBaseCols, setLayoutCols, setSavedLayout]);

  const addWidget = useCallback(
    (widgetKey: string, initialSize?: Partial<Pick<GridLayoutItem, 'w' | 'h' | 'minW' | 'minH'>>) => {
      const maxY = (currentLayouts.lg ?? []).reduce((max, item) => Math.max(max, item.y + item.h), 0);
      const newItem: GridLayoutItem = {
        i: widgetKey,
        x: 0,
        y: maxY,
        w: initialSize?.w ?? Math.min(6, layoutCols),
        h: initialSize?.h ?? 8,
        minW: initialSize?.minW,
        minH: initialSize?.minH,
      };
      startTransition(() => commitItems([...(currentLayouts.lg ?? []), newItem]));
    },
    [currentLayouts, layoutCols, layoutsWithLg, setSavedLayout],
  );

  const moveWidget = useCallback(
    (widgetKey: string, direction: 'up' | 'down') => {
      const items = [...(currentLayouts.lg ?? [])];
      const index = items.findIndex((item) => item.i === widgetKey);
      if (index === -1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      const moved = items[index];
      const withoutMoved = [...items.slice(0, index), ...items.slice(index + 1)];
      const nextItems = [
        ...withoutMoved.slice(0, targetIndex),
        moved,
        ...withoutMoved.slice(targetIndex),
      ];
      startTransition(() => commitItems(nextItems));
    },
    [currentLayouts, layoutsWithLg, setSavedLayout],
  );

  const setWidgetLocked = useCallback(
    (widgetKey: string, locked: boolean) => {
      const nextItems = (currentLayouts.lg ?? []).map((item) => {
        if (item.i !== widgetKey) return item;
        return {
          ...item,
          static: locked,
          isDraggable: !locked,
          isResizable: !locked,
        };
      });
      startTransition(() => commitItems(nextItems));
    },
    [currentLayouts, layoutsWithLg, setSavedLayout],
  );

  const removeWidget = useCallback(
    (widgetKey: string) => {
      const nextItems = (currentLayouts.lg ?? []).filter((item) => item.i !== widgetKey);
      startTransition(() => commitItems(nextItems));
    },
    [currentLayouts, layoutsWithLg, setSavedLayout],
  );

  /**
   * Measured auto-height overrides (widgetKey -> rows). DERIVED, in-memory-
   * only state (quality-review design ruling, 2026-07-14):
   *
   * - Applied for ALL viewers — the map is merged over the saved layout when
   *   producing the layouts handed to react-grid-layout (see
   *   `PageGridLayout`'s `activeLayouts` memo), so read-only users get
   *   full-height cards too.
   * - NEVER persisted from passive viewing. Measurements re-derive on every
   *   mount; writing them to the preference adapter on their own would be
   *   redundant AND would turn mere viewing (e.g. Radix tab switches inside a
   *   card, which unmount/remount panel content and fire the ResizeObserver)
   *   into storage upserts for any authenticated viewer — see the CRITICAL #2
   *   integration test. The one exception (crm7#744) is `minH` on a card the
   *   user is ACTIVELY, deliberately resizing right now: `stripAutoHeightRows`
   *   floors that card's persisted `minH` to the live measured value so the
   *   floor invariant survives the same commit as the resize, which is a
   *   user-driven write, not a passive one.
   * - Updated FUNCTIONALLY in one combined state update per flush, so two
   *   cards settling in the same animation frame can never last-writer-wins
   *   each other through a stale closure.
   */
  const [autoHeightRows, setAutoHeightRows] = useState<Record<string, number>>({});
  useEffect(() => {
    autoHeightRowsForStripRef.current = autoHeightRows;
  }, [autoHeightRows]);
  const applyAutoHeightRows = useCallback((rowsByWidget: Record<string, number>) => {
    setAutoHeightRows((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const [widgetKey, rows] of Object.entries(rowsByWidget)) {
        if (next[widgetKey] !== rows) {
          next[widgetKey] = rows;
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, []);

  useEffect(() => {
    if (!canEditPage || typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (
        event as CustomEvent<{ page?: string; ack?: () => void; editing?: boolean }>
      ).detail;
      if (!detail?.page || detail.page === pageKey) {
        detail?.ack?.();
        // `detail.editing` defaults to `true` when omitted — every existing
        // dispatcher across all 6 apps only ever sent `{ page, path }` to
        // OPEN the editor, so this preserves 100% backward compatibility.
        // An explicit `editing: false` lets a launcher force-close a grid
        // instance that's still mounted after an in-route navigation (e.g.
        // wouter's `/people/:id` not remounting between different ids) —
        // see crm7's `PageEditorLauncher.tsx` navigation-close effect
        // (blueprint amendment A3). Reuses this exact event channel rather
        // than introducing a second one.
        setIsEditing(detail?.editing ?? true);
      }
    };
    for (const eventName of editorEventNames) {
      window.addEventListener(eventName, handler as EventListener);
    }
    return () => {
      for (const eventName of editorEventNames) {
        window.removeEventListener(eventName, handler as EventListener);
      }
    };
  }, [canEditPage, editorEventNames, pageKey, setIsEditing]);

  return {
    currentLayouts,
    layoutCols,
    isEditing,
    setIsEditing,
    activeCols,
    activeCompactor,
    onLayoutChange,
    handleColumnChange,
    handleBreakpointChange,
    handleCompact,
    handleReset,
    addWidget,
    moveWidget,
    setWidgetLocked,
    removeWidget,
    applyAutoHeightRows,
    autoHeightRows,
    resetConfirmOpen,
    setResetConfirmOpen,
    canEditPage,
    containerRef,
    containerWidth,
  };
}
