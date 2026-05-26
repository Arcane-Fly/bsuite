import { ArrowDown, ArrowUp, Eye, EyeOff, Layers, LayoutGrid, Lock, Plus, RotateCcw, Save, Settings2, Unlock } from 'lucide-react';
import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Responsive, type ResizeHandleAxis } from 'react-grid-layout';
import { gridBounds, minMaxSize, minSize } from 'react-grid-layout/core';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { defaultPreferenceAdapter } from './preferences.js';
import { usePageGridLayout } from './usePageGridLayout.js';
import { cn } from './utils.js';
import type { GridLayouts, PageGridLayoutProps } from './types.js';

/**
 * Default resize bounds applied as a *global* constraint to ALL grid items.
 *
 * History
 * -------
 * - 0.2.x: maxH=16 (≈512px) — clipped data tables.
 * - 0.3.0: bumped to maxH=48 (≈1536px) — still a hard ceiling. Operators
 *   reported "the handle hits a wall before all my data fits" on tall
 *   data-table cards even after the bump.
 * - 0.4.0 (this version): **removed the global maxW and maxH ceilings
 *   entirely.** Width is bounded by `gridBounds` (the active column count)
 *   so no separate global `maxSize(...)` is needed; per-item
 *   `LayoutItem.maxW` / `maxH` is honoured via `minMaxSize`. Combined
 *   with the new internal scroll wrapper around `{content}` (see GridItem
 *   render below), cards now grow to their bounds and content scrolls
 *   inside. Per-item `maxH` on `LayoutItem` remains the right knob for
 *   "this widget shouldn't grow past N rows".
 */
const DEFAULT_RESIZE_BOUNDS = { minW: 2, minH: 1 } as const;
const DEFAULT_RESIZE_HANDLES: readonly ResizeHandleAxis[] = ['se'];
const DEFAULT_ADD_ENTITY_WIDGET_EVENT_NAMES = ['bsu-add-entity-widget', 'crm7-add-entity-widget'] as const;

/**
 * Custom resize handle for react-grid-layout v2.
 *
 * Why this exists (resize bug fix, 2026-05-12)
 * --------------------------------------------
 * react-grid-layout v2 dropped the auto-rendered `.react-resizable-handle`
 * element that v1 appended to every resizable item. With v2, items still
 * get the `react-resizable` CSS class (so the existing override CSS targets
 * the right element) but no handle DOM is created unless the consumer
 * supplies `resizeConfig.handleComponent`.
 *
 * Symptom: operator reported "I can drag but I can't make the cards bigger"
 * across 5+ apps and 50+ flagged occurrences. Live DOM inspection on
 * crm.crm7.app/reports confirmed `react-grid-item` had `.react-resizable`
 * class but 0 `.react-resizable-handle` children — handles literally
 * weren't in the DOM, so the carefully-tuned override CSS in
 * `react-grid-layout-overrides.css` had nothing to style.
 *
 * Fix: provide a `forwardRef` handle component that renders a span with
 * the exact class names the override CSS targets (`react-resizable-handle`
 * + `react-resizable-handle-<axis>`). data-no-drag prevents the parent
 * drag handler from intercepting pointer-down on the handle.
 */
const RGLResizeHandle = React.forwardRef<HTMLSpanElement, { axis?: ResizeHandleAxis } & React.HTMLAttributes<HTMLSpanElement>>(
  function RGLResizeHandle({ axis = 'se', className: injectedClassName, ...rest }, ref) {
    return (
      <span
        ref={ref}
        data-no-drag
        className={`react-resizable-handle react-resizable-handle-${axis}${injectedClassName ? ' ' + injectedClassName : ''}`}
        {...rest}
      />
    );
  },
);

type GridItemProps = {
  id: string;
  content: React.ReactNode;
  isEditing: boolean;
  label: string;
  onHide: (id: string) => void;
  /**
   * Injected children — react-grid-layout v2 + react-resizable wrap each item
   * with `cloneElement(child, { children: [origChildren, ...resizeHandles] })`.
   * For the cloned `children` to actually mount in the DOM, our component
   * MUST render `{children}` somewhere. Without this, the handle silently
   * drops — bottom-right resize is invisible. Place this at the OUTER level
   * (sibling of the inner wrapper) so the .react-resizable-handle CSS
   * positioning targets `.react-grid-item` correctly.
   * Resize-bug fix, 2026-05-12 (operator-flagged 50+ times).
   */
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'content'>;

const GridItem = React.memo(React.forwardRef<HTMLDivElement, GridItemProps>(function GridItem({
  id,
  content,
  isEditing,
  label,
  onHide,
  children: injectedChildren,
  className: injectedClassName,
  style: injectedStyle,
  ...rest
}, ref) {
    // DnD root-cause fix (2026-05-07): react-draggable@4 (used internally by
    // react-grid-layout@2) checks the drag handle via
    // `matchesSelectorAndParentsTo(target, handle, baseNode)` — it walks UP
    // the ancestor chain from the click target. The previous implementation
    // rendered `.drag-handle` as a SIBLING of the card content, so clicks on
    // any visible card content never matched (ancestors are: card-content →
    // .rounded-3xl → .h-full.w-full.relative → .relative.group; none carry
    // the class). Drag silently failed.
    //
    // Fix: put `.drag-handle` on the outer container. Now any click inside
    // the GridItem has it as an ancestor → drag fires. Interactive elements
    // (buttons, inputs, textarea, select, links, [data-no-drag]) are still
    // protected via the `cancel` selector below in the <Responsive> render.
    const outerClass = cn(
      'relative group',
      isEditing && 'drag-handle cursor-move',
      injectedClassName
    );
    return (
      <div ref={ref} className={outerClass} style={injectedStyle} {...rest}>
        <div className="h-full w-full relative">
          {isEditing && (
            <div className="absolute inset-0 z-10 pointer-events-none rounded-3xl border-2 border-transparent group-hover:border-primary/50 transition-colors bg-black/5" />
          )}
          {isEditing && (
            <div className="absolute top-2 left-2 z-30 flex items-center gap-1 pointer-events-none">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md opacity-80 font-medium bg-muted text-muted-foreground">
                {label}
              </span>
            </div>
          )}
          {isEditing && (
            <button
              className="absolute top-2 right-2 z-30 h-6 w-6 rounded-full flex items-center justify-center bg-destructive/80 hover:bg-destructive text-white shadow transition-colors"
              data-no-drag
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onHide(id);
              }}
              title={`Hide ${label}`}
              aria-label={`Hide ${label}`}
            >
              <EyeOff className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <div
            className="h-full w-full rounded-3xl transition-all flex flex-col bg-card shadow-sm"
            style={{ contain: 'paint' }}
          >
            {/*
             * Internal scroll container so card content adapts to whatever
             * pixel size the user resizes the grid item to. `min-h-0` is
             * critical — without it, flex children inherit `min-height: auto`
             * and refuse to shrink below their content size, defeating the
             * scroll. Pair with `flex-1` so the wrapper claims all remaining
             * vertical space inside the card chrome.
             *
             * Consumer card bodies should NOT apply their own `overflow:hidden`
             * on a direct child of `{content}` or the scroll will be intercepted
             * before reaching this container. Internal layout containers in
             * `{content}` that need their own scroll regions (e.g. tab panels,
             * data tables) should use `flex-1 min-h-0 overflow-auto` themselves
             * — those nested scroll containers compose cleanly with this one
             * because pointer/wheel events bubble up only when the inner one
             * is at its scroll edge.
             */}
            <div className="flex-1 min-h-0 overflow-auto">
              {content}
            </div>
          </div>
        </div>
        {/*
         * Injected by react-resizable's cloneElement when this item is a child
         * of <Resizable>. Becomes the .react-resizable-handle-se span (or whatever
         * RGLResizeHandle renders). Positioned absolute at bottom-right via
         * react-grid-layout-overrides.css — MUST be a child of .react-grid-item
         * (this outer div), not the inner wrapper, so the CSS targets the right
         * positioning origin.
         */}
        {injectedChildren}
      </div>
    );
  }));

export function PageGridLayout({
  pageKey,
  defaultLayouts,
  defaultCols,
  layoutVersion,
  canEditPage,
  editorEventNames,
  preferenceAdapter,
  widgets,
  widgetMeta,
  className,
  // Resize default flipped 2026-05-12: rgl v2 dropped auto-handle rendering
  // (see RGLResizeHandle above). Previously this defaulted false; consumer
  // adapters then defaulted it back to true. With v2's handle gap fixed,
  // the safe default is true so any consumer who forgets to set it still
  // gets a usable canvas. Opt out per-page with isResizable={false}.
  isResizable = true,
  resizeHandles = DEFAULT_RESIZE_HANDLES,
  addEntityWidgetEventNames = DEFAULT_ADD_ENTITY_WIDGET_EVENT_NAMES,
  createEntityWidget,
  onRegisterEntityWidget,
}: PageGridLayoutProps) {
  const {
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
    resetConfirmOpen,
    setResetConfirmOpen,
    containerRef,
    containerWidth,
  } = usePageGridLayout({
    pageKey,
    defaultLayouts,
    defaultCols,
    layoutVersion,
    canEditPage,
    editorEventNames,
    preferenceAdapter,
  });

  const resizeEnabled = isEditing && isResizable;
  const resizeConstraints = useMemo(
    () => [
      // `gridBounds` caps width at the active column count, so we don't need
      // a global maxSize(...). Width and height are unbounded by default;
      // consumers cap individual widgets via LayoutItem.maxW / maxH which
      // `minMaxSize` reads per-item.
      gridBounds,
      minMaxSize,
      minSize(DEFAULT_RESIZE_BOUNDS.minW, DEFAULT_RESIZE_BOUNDS.minH),
    ],
    [],
  );

  const [extraWidgetConfigs, setExtraWidgetConfigs] = useState<Record<string, { entityType: string; label?: string }>>({});
  const { value: layerNames, setValue: setLayerNames } = (preferenceAdapter ?? defaultPreferenceAdapter)<Record<string, string>>(
    `page:${pageKey}_grid_layer_names`,
    {},
  );
  const { value: hiddenLayerIds, setValue: setHiddenLayerIds } = (preferenceAdapter ?? defaultPreferenceAdapter)<Record<string, boolean>>(
    `page:${pageKey}_grid_hidden_layers`,
    {},
  );
  const extraWidgets = useMemo(() => {
    const rendered: Record<string, React.ReactNode> = {};
    if (!createEntityWidget) return rendered;
    for (const [widgetId, config] of Object.entries(extraWidgetConfigs)) {
      rendered[widgetId] = createEntityWidget({
        widgetId,
        entityType: config.entityType,
        label: config.label,
        isEditing,
      });
    }
    return rendered;
  }, [createEntityWidget, extraWidgetConfigs, isEditing]);

  const allWidgets = useMemo(() => ({ ...widgets, ...extraWidgets }), [widgets, extraWidgets]);
  const renderableWidgetKeys = useMemo(
    () => new Set(Object.keys(allWidgets).filter((key) => allWidgets[key] !== null && allWidgets[key] !== undefined)),
    [allWidgets],
  );
  const activeLayouts = useMemo(() => {
    const filtered: GridLayouts = { lg: [] };
    for (const bp in currentLayouts) {
      filtered[bp] = (currentLayouts[bp] ?? []).filter((item) => renderableWidgetKeys.has(item.i) && !hiddenLayerIds[item.i]);
    }
    return filtered;
  }, [currentLayouts, hiddenLayerIds, renderableWidgetKeys]);

  const hideLayer = (layerId: string) => {
    setHiddenLayerIds((previous) => ({ ...previous, [layerId]: true }));
  };

  const showLayer = (layerId: string, defaultSize?: { w?: number; h?: number; minW?: number; minH?: number }) => {
    setHiddenLayerIds((previous) => {
      if (!previous[layerId]) return previous;
      const { [layerId]: _removed, ...rest } = previous;
      return rest;
    });
    const existsInLayouts = Object.values(currentLayouts).some((items) => (items ?? []).some((item) => item.i === layerId));
    if (!existsInLayouts) {
      addWidget(layerId, defaultSize);
    }
  };

  useEffect(() => {
    if (!createEntityWidget || typeof window === 'undefined') return;
    const handleAddEntityWidget = (event: Event) => {
      const detail = (event as CustomEvent<{ entityType: string; label?: string }>).detail;
      if (!detail?.entityType) return;

      const widgetId = `entity:${detail.entityType}`;
      const alreadyInLayout = activeLayouts.lg?.some((item) => item.i === widgetId);
      if (alreadyInLayout) {
        startTransition(() => setIsEditing(true));
        return;
      }

      onRegisterEntityWidget?.({ widgetId, entityType: detail.entityType, label: detail.label });
      setExtraWidgetConfigs((previous) => ({
        ...previous,
        [widgetId]: { entityType: detail.entityType, label: detail.label },
      }));
      addWidget(widgetId, { w: 6, h: 8, minW: 3, minH: 4 });
      startTransition(() => setIsEditing(true));
    };
    for (const eventName of addEntityWidgetEventNames) {
      window.addEventListener(eventName, handleAddEntityWidget);
    }
    return () => {
      for (const eventName of addEntityWidgetEventNames) {
        window.removeEventListener(eventName, handleAddEntityWidget);
      }
    };
  }, [
    activeLayouts.lg,
    addEntityWidgetEventNames,
    addWidget,
    createEntityWidget,
    onRegisterEntityWidget,
    setIsEditing,
  ]);

  const visibleKeys = useMemo(() => new Set((activeLayouts.lg ?? []).map((item) => item.i)), [activeLayouts.lg]);
  const hiddenWidgetKeys = useMemo(
    () => [...renderableWidgetKeys].filter((key) => !visibleKeys.has(key)),
    [renderableWidgetKeys, visibleKeys],
  );
  const layerItems = useMemo(
    () =>
      (activeLayouts.lg ?? []).map((item, index, layers) => {
        const fallbackLabel = widgetMeta?.[item.i]?.label ?? item.i;
        return {
          id: item.i,
          label: layerNames[item.i] || fallbackLabel,
          locked: Boolean(item.static || item.isDraggable === false || item.isResizable === false),
          canMoveUp: index > 0,
          canMoveDown: index < layers.length - 1,
        };
      }),
    [activeLayouts.lg, layerNames, widgetMeta],
  );

  const handleLayerRename = (layerId: string, value: string) => {
    const trimmed = value.trim();
    setLayerNames((previous) => {
      if (trimmed.length === 0) {
        if (!(layerId in previous)) return previous;
        const { [layerId]: _removed, ...rest } = previous;
        return rest;
      }
      if (previous[layerId] === trimmed) return previous;
      return { ...previous, [layerId]: trimmed };
    });
  };

  // Reset-confirmation dialog: full ARIA APG dialog-modal pattern.
  // - Escape key closes the dialog.
  // - Tab / Shift+Tab are trapped within the two dialog buttons (cancel ↔ confirm).
  // - Initial focus moves to the Cancel button (safe default for destructive actions).
  // - Focus returns to the invoking element when the dialog closes.
  const resetCancelButtonRef = useRef<HTMLButtonElement>(null);
  const resetConfirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!resetConfirmOpen || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setResetConfirmOpen(false);
        return;
      }
      if (event.key === 'Tab') {
        const cancel = resetCancelButtonRef.current;
        const confirm = resetConfirmButtonRef.current;
        if (!cancel || !confirm) return;
        if (event.shiftKey) {
          if (document.activeElement === cancel) {
            event.preventDefault();
            confirm.focus();
          }
        } else {
          if (document.activeElement === confirm) {
            event.preventDefault();
            cancel.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetConfirmOpen, setResetConfirmOpen]);

  useEffect(() => {
    if (!resetConfirmOpen || typeof document === 'undefined') return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    resetCancelButtonRef.current?.focus();
    return () => {
      previousActiveElement?.focus?.();
    };
  }, [resetConfirmOpen]);

  return (
    <div className={className}>
      {isEditing && (
        <div
          className={cn(
            // Sticky overlay banner — sits at the top of the scroll container
            // without pushing the form down. `top-0` anchors to the nearest
            // scrolling ancestor; `z-30` keeps it above grid items but below
            // app-level overlays (toaster, dialogs are z-50+).
            'sticky top-0 z-30 flex flex-col gap-3 p-4 rounded-xl shadow-lg border-2 mb-4',
            // Subtle translucent background so the form behind it stays
            // partially visible — mitigates Issue 2 (banner consuming
            // vertical space). `bg-card/95` + `backdrop-blur` keeps text
            // legible while showing form context behind the banner.
            'bg-card/95 supports-[backdrop-filter]:bg-card/80 backdrop-blur border-primary',
          )}
          role="region"
          aria-label="Canvas editor controls"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center animate-pulse bg-primary/10">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  Canvas Editor Active
                </h3>
                <span className="text-sm text-muted-foreground">
                  Drag anywhere on a card to move it. Resize with the bottom-right handle.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={() => startTransition(() => setIsEditing(false))}
            >
              <Save className="h-4 w-4 mr-2" />
              Save &amp; Exit
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm shrink-0 text-muted-foreground">Columns:</span>
              <input
                type="range"
                min={1}
                max={24}
                value={layoutCols}
                onChange={(event) => handleColumnChange(Number(event.target.value))}
                className="w-24 cursor-pointer accent-primary"
                aria-label="Column count"
              />
              <span className="text-sm font-mono w-5 text-center tabular-nums">{layoutCols}</span>
            </div>

            <div className="flex items-center gap-1" role="group" aria-label="Column presets">
              {[1, 2, 3, 4, 6, 12].map((columnCount) => (
                <button
                  type="button"
                  key={columnCount}
                  onClick={() => handleColumnChange(columnCount)}
                  data-active={layoutCols === columnCount || undefined}
                  aria-pressed={layoutCols === columnCount}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium transition-colors border',
                    'bg-muted text-muted-foreground border-border',
                    'hover:bg-muted/80 hover:text-foreground',
                    'data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:border-primary',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  )}
                >
                  {columnCount}
                </button>
              ))}
            </div>

            {hiddenWidgetKeys.length > 0 && (
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm shrink-0 text-muted-foreground">Add widget:</span>
                <div className="flex flex-wrap gap-1">
                  {hiddenWidgetKeys.map((key) => {
                    const meta = widgetMeta?.[key];
                    const Icon = meta?.icon;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => showLayer(key, meta?.defaultSize)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors',
                          'bg-muted text-muted-foreground border-border',
                          'hover:bg-muted/80 hover:text-foreground hover:border-primary/60',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        )}
                        >
                          <Plus className="h-3 w-3" />
                          {Icon && <Icon className="h-3 w-3" />}
                          {layerNames[key] || meta?.label || key}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {layerItems.length > 0 && (
              <div className="basis-full rounded-md border border-border bg-background/80 p-2">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  Layers
                </div>
                <div className="flex flex-col gap-1">
                  {layerItems.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1"
                    >
                      <input
                        type="text"
                        value={layer.label}
                        onChange={(event) => handleLayerRename(layer.id, event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                        aria-label={`Rename ${layer.label}`}
                      />
                      <button
                        type="button"
                        onClick={() => moveWidget(layer.id, 'up')}
                        disabled={!layer.canMoveUp}
                        aria-label={`Move ${layer.label} up`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(layer.id, 'down')}
                        disabled={!layer.canMoveDown}
                        aria-label={`Move ${layer.label} down`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setWidgetLocked(layer.id, !layer.locked)}
                        aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.label}`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => hideLayer(layer.id)}
                        aria-label={`Hide ${layer.label}`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCompact}
              className={cn(
                'ml-auto inline-flex items-center rounded-md border border-border px-2 py-1 text-sm transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              )}
            >
              <Layers className="h-4 w-4 mr-1" />
              Compact Layout
            </button>

            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className={cn(
                'inline-flex items-center rounded-md border border-border px-2 py-1 text-sm transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              )}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-grid-reset-title"
          aria-describedby="page-grid-reset-description"
        >
          <div className="max-w-md rounded-lg bg-card p-5 shadow-lg border border-border">
            <h2 id="page-grid-reset-title" className="text-lg font-semibold">Reset page layout?</h2>
            <p id="page-grid-reset-description" className="mt-2 text-sm text-muted-foreground">
              This will discard your current layout and restore all widgets to their default positions.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                ref={resetCancelButtonRef}
                onClick={() => setResetConfirmOpen(false)}
                className={cn(
                  'inline-flex items-center rounded-md border border-border px-3 py-2 text-sm transition-colors',
                  'bg-card text-foreground hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                ref={resetConfirmButtonRef}
                onClick={() => {
                  handleReset();
                  setResetConfirmOpen(false);
                }}
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'bg-destructive text-white shadow hover:bg-destructive/90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-1',
                )}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef as React.Ref<HTMLDivElement>}
        className={isEditing ? 'min-h-[200px]' : ''}
        style={{ backgroundColor: isEditing ? 'rgb(0 0 0 / 0.03)' : 'transparent' }}
        data-page-grid-editing={isEditing || undefined}
      >
        <div style={{ opacity: containerWidth > 0 ? 1 : 0 }} aria-busy={containerWidth <= 0}>
          <Responsive
            width={Math.max(containerWidth, 1)}
            className="layout"
            layouts={activeLayouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            rowHeight={32}
            onLayoutChange={onLayoutChange}
            dragConfig={{
              enabled: isEditing,
              handle: '.drag-handle',
              bounded: false,
              cancel:
                '.react-resizable-handle, button, input, textarea, select, [contenteditable="true"], [data-no-drag], a[href], [role="button"], [role="combobox"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"], [role="slider"], [role="textbox"]',
            }}
            resizeConfig={{
              enabled: resizeEnabled,
              handles: resizeHandles,
              // Required for v2 — see RGLResizeHandle comment above.
              handleComponent: (axis, ref) => (
                <RGLResizeHandle axis={axis} ref={ref as React.Ref<HTMLSpanElement>} />
              ),
            }}
            constraints={resizeEnabled ? resizeConstraints : undefined}
            compactor={activeCompactor}
            cols={activeCols}
            margin={[6, 6]}
          >
            {activeLayouts.lg.map((layoutItem) => {
              const content = allWidgets[layoutItem.i];
              if (content === undefined || content === null) return null;
              return (
                <GridItem
                  key={layoutItem.i}
                  id={layoutItem.i}
                  content={content}
                  isEditing={isEditing}
                  label={layerNames[layoutItem.i] || widgetMeta?.[layoutItem.i]?.label || layoutItem.i}
                  onHide={hideLayer}
                />
              );
            })}
          </Responsive>
        </div>
      </div>
    </div>
  );
}
