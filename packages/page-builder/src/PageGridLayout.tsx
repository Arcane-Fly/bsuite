import { Eye, EyeOff, Layers, LayoutGrid, Plus, RotateCcw, Save, Settings2 } from 'lucide-react';
import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { Responsive, type ResizeHandleAxis } from 'react-grid-layout';
import { gridBounds, maxSize, minMaxSize, minSize } from 'react-grid-layout/core';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { usePageGridLayout } from './usePageGridLayout.js';
import { cn } from './utils.js';
import type { GridLayouts, PageGridLayoutProps } from './types.js';

const DEFAULT_RESIZE_BOUNDS = { minW: 2, minH: 1, maxW: 12, maxH: 16 } as const;
const DEFAULT_RESIZE_HANDLES: readonly ResizeHandleAxis[] = ['se'];
const DEFAULT_ADD_ENTITY_WIDGET_EVENT_NAMES = ['bsu-add-entity-widget', 'crm7-add-entity-widget'] as const;

type GridItemProps = {
  id: string;
  content: React.ReactNode;
  isEditing: boolean;
  label: string;
  onRemove: (id: string) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'content'>;

const GridItem = React.memo(React.forwardRef<HTMLDivElement, GridItemProps>(function GridItem({
  id,
  content,
  isEditing,
  label,
  onRemove,
  className: injectedClassName,
  style: injectedStyle,
  ...rest
}, ref) {
    return (
      <div ref={ref} className={cn('relative group', injectedClassName)} style={injectedStyle} {...rest}>
        <div className="h-full w-full relative">
          {isEditing && <div className="drag-handle absolute inset-0 z-20 cursor-move bg-transparent" />}
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
              onClick={(event) => {
                event.stopPropagation();
                onRemove(id);
              }}
              title={`Hide ${label}`}
              aria-label={`Hide ${label}`}
            >
              <EyeOff className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <div
            className="h-full w-full rounded-3xl transition-all flex flex-col"
            style={{
              background: 'var(--bg-panel, var(--background, var(--card, #fff)))',
              boxShadow: 'var(--shadow-shell-glow, 0 1px 3px rgb(0 0 0 / 0.1))',
              contain: 'paint',
            }}
          >
            {content}
          </div>
        </div>
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
  isResizable = false,
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
    removeWidget,
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
      gridBounds,
      minMaxSize,
      minSize(DEFAULT_RESIZE_BOUNDS.minW, DEFAULT_RESIZE_BOUNDS.minH),
      maxSize(DEFAULT_RESIZE_BOUNDS.maxW, DEFAULT_RESIZE_BOUNDS.maxH),
    ],
    [],
  );

  const [extraWidgetConfigs, setExtraWidgetConfigs] = useState<Record<string, { entityType: string; label?: string }>>({});
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
      filtered[bp] = (currentLayouts[bp] ?? []).filter((item) => renderableWidgetKeys.has(item.i));
    }
    return filtered;
  }, [currentLayouts, renderableWidgetKeys]);

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

  return (
    <div className={className}>
      {isEditing && (
        <div
          className="flex flex-col gap-3 p-4 rounded-xl shadow-lg border-2 mb-4"
          style={{ backgroundColor: 'var(--bg-panel, var(--card, #fff))', borderColor: 'var(--accent-primary, var(--primary, #2563eb))' }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center animate-pulse"
                style={{ backgroundColor: 'var(--bg-shell-accent, rgb(37 99 235 / 0.1))' }}
              >
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg" style={{ color: 'var(--text-heading, var(--foreground, #111827))' }}>
                  Canvas Editor Active
                </h3>
                <span className="text-sm" style={{ color: 'var(--text-secondary, var(--muted-foreground, #6b7280))' }}>
                  Drag anywhere on a card to move it. Resize with the bottom-right handle.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground shadow"
              onClick={() => startTransition(() => setIsEditing(false))}
            >
              <Save className="h-4 w-4 mr-2" />
              Save &amp; Exit
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-shell, var(--border, #e5e7eb))' }}>
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
                  className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: layoutCols === columnCount ? 'var(--accent-primary, var(--primary, #2563eb))' : 'var(--bg-tertiary, var(--muted, #f3f4f6))',
                    color: layoutCols === columnCount ? '#fff' : 'var(--text-secondary, var(--muted-foreground, #6b7280))',
                    border: '1px solid var(--border-shell, var(--border, #e5e7eb))',
                  }}
                  aria-pressed={layoutCols === columnCount}
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
                        onClick={() => addWidget(key, meta?.defaultSize)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors hover:border-primary/60 bg-muted text-muted-foreground"
                      >
                        <Plus className="h-3 w-3" />
                        {Icon && <Icon className="h-3 w-3" />}
                        {meta?.label ?? key}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="button" onClick={handleCompact} className="ml-auto inline-flex items-center rounded-md border px-2 py-1 text-sm text-muted-foreground">
              <Layers className="h-4 w-4 mr-1" />
              Compact Layout
            </button>

            <button type="button" onClick={() => setResetConfirmOpen(true)} className="inline-flex items-center rounded-md border px-2 py-1 text-sm text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="page-grid-reset-title">
          <div className="max-w-md rounded-lg bg-card p-5 shadow-lg border">
            <h2 id="page-grid-reset-title" className="text-lg font-semibold">Reset page layout?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will discard your current layout and restore all widgets to their default positions.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => setResetConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => {
                  handleReset();
                  setResetConfirmOpen(false);
                }}
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
      >
        <div style={{ opacity: containerWidth > 0 ? 1 : 0 }} aria-busy={containerWidth <= 0}>
          <Responsive
            width={Math.max(containerWidth, 1)}
            className="layout"
            layouts={activeLayouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            rowHeight={32}
            onLayoutChange={onLayoutChange}
            dragConfig={{ enabled: isEditing, handle: '.drag-handle', bounded: false, cancel: '.react-resizable-handle' }}
            resizeConfig={{ enabled: resizeEnabled, handles: resizeHandles }}
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
                  label={widgetMeta?.[layoutItem.i]?.label ?? layoutItem.i}
                  onRemove={removeWidget}
                />
              );
            })}
          </Responsive>
        </div>
      </div>
    </div>
  );
}
