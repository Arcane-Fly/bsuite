import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { noCompactor, verticalCompactor } from 'react-grid-layout';
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
  const [isEditing, setIsEditing] = useState(false);
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

  const activeCompactor = useMemo(
    () => (isEditing ? { ...noCompactor, preventCollision: true } : verticalCompactor),
    [isEditing],
  );

  const onLayoutChange = useCallback(
    (_layout: unknown, layouts: unknown) => {
      if (isEditing) setSavedLayout(layouts as GridLayouts);
    },
    [isEditing, setSavedLayout],
  );

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

  useEffect(() => {
    if (!canEditPage || typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ page?: string; ack?: () => void }>).detail;
      if (!detail?.page || detail.page === pageKey) {
        detail?.ack?.();
        setIsEditing(true);
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
  }, [canEditPage, editorEventNames, pageKey]);

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
    resetConfirmOpen,
    setResetConfirmOpen,
    canEditPage,
    containerRef,
    containerWidth,
  };
}
