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
import { buildResponsiveLayouts } from './buildResponsiveLayouts.js';
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
}: UsePageGridLayoutOptions): UsePageGridLayoutResult {
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
    if ((savedLayoutVersion ?? 0) < layoutVersion) {
      startTransition(() => {
        setSavedLayout(defaultLayouts);
        setLayoutCols(defaultCols);
        setBaseCols(defaultCols);
        setSavedLayoutVersion(layoutVersion);
      });
    }
  }, [
    defaultCols,
    defaultLayouts,
    layoutVersion,
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
    const saved = savedLayout as Record<string, GridLayoutItem[]>;
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
    return changed ? (merged as GridLayouts) : savedLayout;
  }, [savedLayout, defaultLayouts]);

  const currentLayouts = useMemo(() => {
    const rescaled =
      baseCols !== layoutCols ? rescaleLayout(rawLayouts, baseCols, layoutCols) : rawLayouts;
    return buildResponsiveLayouts(rescaled, { cols: layoutCols });
  }, [rawLayouts, baseCols, layoutCols]);

  useEffect(() => {
    if (baseCols !== layoutCols) {
      const rescaled = rescaleLayout(rawLayouts, baseCols, layoutCols);
      setSavedLayout(rescaled);
      setBaseCols(layoutCols);
    }
  }, [baseCols, layoutCols, rawLayouts, setBaseCols, setSavedLayout]);

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
   * Strips DERIVED measured heights out of a layout before it reaches the
   * preference adapter. react-grid-layout is rendered with `autoHeightRows`
   * merged over the saved layout (see `applyAutoHeightRows`), so the layouts
   * it echoes back through `onLayoutChange` carry the MEASURED `h` for
   * autoHeight items — persisting that verbatim would smuggle measured
   * heights into user_preferences through the drag/resize path and drop the
   * `autoHeight` flag (react-grid-layout does not round-trip custom item
   * props). Restore `h`/`minH`/`autoHeight` from the un-merged base layout;
   * user-driven `x`/`y`/`w` (and `h` for non-autoHeight items) pass through
   * untouched. Reads the base via a ref so the trailing-rAF commit below
   * never closes over a stale snapshot.
   */
  const currentLayoutsForStripRef = useRef<GridLayouts | null>(null);
  const stripAutoHeightRows = useCallback((layouts: GridLayouts): GridLayouts => {
    const base = currentLayoutsForStripRef.current;
    if (!base) return layouts;
    const result: GridLayouts = { lg: [] };
    for (const bp of Object.keys(layouts)) {
      const baseItems = base[bp] ?? base.lg ?? [];
      const baseByKey = new Map(baseItems.map((item) => [item.i, item]));
      result[bp] = (layouts[bp] ?? []).map((item) => {
        const baseItem = baseByKey.get(item.i);
        if (!baseItem?.autoHeight) return item;
        return { ...item, autoHeight: true, h: baseItem.h, minH: baseItem.minH };
      });
    }
    return result;
  }, []);

  useEffect(() => {
    currentLayoutsForStripRef.current = currentLayouts;
  }, [currentLayouts]);

  const onLayoutChange = useCallback(
    (_layout: unknown, layouts: unknown) => {
      if (!isEditing) return;
      pendingLayoutRef.current = layouts as GridLayouts;
      if (layoutCommitFrameRef.current !== null) return;
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        setSavedLayout(stripAutoHeightRows(layouts as GridLayouts));
        return;
      }
      // Trailing rAF — lets a burst of resize ticks coalesce into one commit.
      layoutCommitFrameRef.current = window.requestAnimationFrame(() => {
        layoutCommitFrameRef.current = null;
        const pending = pendingLayoutRef.current;
        if (pending) {
          pendingLayoutRef.current = null;
          setSavedLayout(stripAutoHeightRows(pending));
        }
      });
    },
    [isEditing, setSavedLayout, stripAutoHeightRows],
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

  const handleColumnChange = useCallback(
    (newCols: number) => {
      const rescaled = rescaleLayout(currentLayouts, layoutCols, newCols);
      setSavedLayout(rescaled);
      setLayoutCols(newCols);
      setBaseCols(newCols);
    },
    [currentLayouts, layoutCols, setBaseCols, setLayoutCols, setSavedLayout],
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
    startTransition(() => setSavedLayout({ ...currentLayouts, lg: result }));
  }, [currentLayouts, setSavedLayout]);

  const handleReset = useCallback(() => {
    startTransition(() => {
      setSavedLayout(defaultLayouts);
      setLayoutCols(defaultCols);
      setBaseCols(defaultCols);
    });
  }, [defaultCols, defaultLayouts, setBaseCols, setLayoutCols, setSavedLayout]);

  const addWidget = useCallback(
    (widgetKey: string, initialSize?: Partial<Pick<GridLayoutItem, 'w' | 'h' | 'minW' | 'minH'>>) => {
      const bps = Object.keys(currentLayouts);
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
      const updated: GridLayouts = { lg: [] };
      for (const bp of bps) {
        updated[bp] = [...(currentLayouts[bp] ?? []), newItem];
      }
      startTransition(() => setSavedLayout(updated));
    },
    [currentLayouts, layoutCols, setSavedLayout],
  );

  const moveWidget = useCallback(
    (widgetKey: string, direction: 'up' | 'down') => {
      const updated: GridLayouts = { lg: [] };
      for (const bp of Object.keys(currentLayouts)) {
        const items = [...(currentLayouts[bp] ?? [])];
        const index = items.findIndex((item) => item.i === widgetKey);
        if (index === -1) {
          updated[bp] = items;
          continue;
        }
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= items.length) {
          updated[bp] = items;
          continue;
        }
        const moved = items[index];
        const withoutMoved = [...items.slice(0, index), ...items.slice(index + 1)];
        const nextItems = [
          ...withoutMoved.slice(0, targetIndex),
          moved,
          ...withoutMoved.slice(targetIndex),
        ];
        updated[bp] = nextItems;
      }
      startTransition(() => setSavedLayout(updated));
    },
    [currentLayouts, setSavedLayout],
  );

  const setWidgetLocked = useCallback(
    (widgetKey: string, locked: boolean) => {
      const updated: GridLayouts = { lg: [] };
      for (const bp of Object.keys(currentLayouts)) {
        updated[bp] = (currentLayouts[bp] ?? []).map((item) => {
          if (item.i !== widgetKey) return item;
          return {
            ...item,
            static: locked,
            isDraggable: !locked,
            isResizable: !locked,
          };
        });
      }
      startTransition(() => setSavedLayout(updated));
    },
    [currentLayouts, setSavedLayout],
  );

  const removeWidget = useCallback(
    (widgetKey: string) => {
      const updated: GridLayouts = { lg: [] };
      for (const bp of Object.keys(currentLayouts)) {
        updated[bp] = (currentLayouts[bp] ?? []).filter((item) => item.i !== widgetKey);
      }
      startTransition(() => setSavedLayout(updated));
    },
    [currentLayouts, setSavedLayout],
  );

  /**
   * Measured auto-height overrides (widgetKey -> rows). DERIVED, in-memory-
   * only state (quality-review design ruling, 2026-07-14):
   *
   * - Applied for ALL viewers — the map is merged over the saved layout when
   *   producing the layouts handed to react-grid-layout (see
   *   `PageGridLayout`'s `activeLayouts` memo), so read-only users get
   *   full-height cards too.
   * - NEVER persisted — not even while editing. Measurements re-derive on
   *   every mount; writing them to the preference adapter would be redundant
   *   AND would turn mere viewing (e.g. Radix tab switches inside a card,
   *   which unmount/remount panel content and fire the ResizeObserver) into
   *   storage upserts for any authenticated viewer.
   * - Updated FUNCTIONALLY in one combined state update per flush, so two
   *   cards settling in the same animation frame can never last-writer-wins
   *   each other through a stale closure.
   */
  const [autoHeightRows, setAutoHeightRows] = useState<Record<string, number>>({});
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
