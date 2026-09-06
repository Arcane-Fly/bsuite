import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { LayoutGrid, Plus, Save, X } from 'lucide-react';
import { PageGridLayout } from './PageGridLayout.js';
import { useLocalPreference } from './preferences.js';
import type {
  GridLayouts,
  PageGridPreferenceAdapter,
  PageGridPreferenceFactory,
  WidgetMeta,
} from './types.js';

/**
 * Widget configuration accepted by {@link PageEditorLauncher}.
 *
 * A widget is a single renderable card on the canvas — its `key` matches the
 * `i` field of a {@link GridLayouts} item, and `content` is the React node
 * rendered inside the card body.
 */
export interface WidgetConfig {
  /** Unique key — must match the `i` field of the corresponding layout item. */
  key: string;
  /** React node rendered inside the card. */
  content: ReactNode;
  /** Optional metadata (label, icon, default size) for the editor banner. */
  meta?: WidgetMeta;
}

export interface PageEditorLauncherProps {
  /** The page identifier — used as the `pageKey` for the grid layout persistence. */
  pageId: string;
  /** The tenant identifier — passed through to the consumer's add-widget handler. */
  tenantId: string;
  /** The current set of widgets to render on the canvas. */
  widgets: WidgetConfig[];
  /** Called when the user adds a widget from the palette. */
  onAddWidget: (widget: WidgetConfig) => void;
  /** Called when the user removes a widget from the canvas. */
  onRemoveWidget: (widgetKey: string) => void;
  /** Called with the final layout when the user clicks Save. */
  onSave: (layout: GridLayouts) => void;
  /** Called when the user clicks Cancel or closes the editor. */
  onClose: () => void;
  /** Default layouts for the grid. If omitted, a single empty `lg` layout is used. */
  defaultLayouts?: GridLayouts;
}

/**
 * PageEditorLauncher — framework-agnostic page layout editor.
 *
 * Extracted from crm7's `PageEditorLauncher` (crm7/src/components/platform/
 * PageEditorLauncher.tsx) into the shared `@bsuite/page-builder` package so
 * any consumer app (conduit, BSU, R80) can mount a full drag-and-drop page
 * editor without reimplementing the WidgetPalette drawer, canvas grid, or
 * save/cancel toolbar.
 *
 * Unlike the crm7 original, this component is **headless** with respect to
 * auth/permissions/routing — the consumer app gates mount via its own
 * auth/permission checks and passes the authorised `tenantId`/`pageId`.
 * All crm7-specific imports (supabase client, `useAuth`, `usePermissions`,
 * `useLocation`/wouter, `getCustomPageBySlug`, crm7 stores) have been removed.
 *
 * The editor renders:
 * 1. A **WidgetPalette drawer** (right-side slide-over) for adding widgets.
 * 2. A **canvas grid** (`PageGridLayout` with `canEditPage=true`) for
 *    drag-and-drop arrangement.
 * 3. A **save/cancel toolbar** at the top for committing or discarding changes.
 *
 * @example
 * ```tsx
 * {editMode && (
 *   <PageEditorLauncher
 *     pageId={`custom-page:${page.id}`}
 *     tenantId={tenantId ?? ''}
 *     widgets={widgets}
 *     onAddWidget={handleAddWidget}
 *     onRemoveWidget={handleRemoveWidget}
 *     onSave={handleSaveLayout}
 *     onClose={() => setEditMode(false)}
 *   />
 * )}
 * ```
 */
export function PageEditorLauncher({
  pageId,
  tenantId,
  widgets,
  onAddWidget,
  onRemoveWidget,
  onSave,
  onClose,
  defaultLayouts,
}: PageEditorLauncherProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Track the latest layout in a ref so the Save handler can read it.
  // The grid's preference adapter writes to this ref via the custom factory
  // below, and Save reads from it — no localStorage coupling required.
  const layoutRef = useRef<GridLayouts>(defaultLayouts ?? { lg: [] });

  // Custom preference adapter factory: wraps `useLocalPreference` (so the
  // grid still persists to localStorage for the session) and also captures
  // the layout value in `layoutRef` whenever the `_grid_layouts` key changes.
  // This is the seam that lets `onSave` emit the final layout without
  // reaching into localStorage directly.
  const capturedAdapter = useCallback<PageGridPreferenceFactory>(
    (key, fallback) => {
      const adapter = useLocalPreference(key, fallback);
      // Track the layouts key so Save can read the ref.
      if (key.endsWith('_grid_layouts')) {
        const originalSetValue = adapter.setValue;
        const wrappedSetValue = useCallback(
          (next: typeof fallback | ((previous: typeof fallback) => typeof fallback)) => {
            originalSetValue((previous) => {
              const resolved =
                typeof next === 'function'
                  ? (next as (previous: typeof fallback) => typeof fallback)(previous)
                  : next;
              layoutRef.current = resolved as GridLayouts;
              return resolved;
            });
          },
          [originalSetValue],
        );
        // Also capture the initial value.
        layoutRef.current = adapter.value as GridLayouts;
        return { ...adapter, setValue: wrappedSetValue } as PageGridPreferenceAdapter<typeof fallback>;
      }
      return adapter;
    },
    [],
  );

  // Build the `widgets` record expected by PageGridLayout from the WidgetConfig[].
  const gridWidgets = useMemo(() => {
    const record: Record<string, ReactNode> = {};
    for (const w of widgets) {
      record[w.key] = w.content;
    }
    return record;
  }, [widgets]);

  // Build the `widgetMeta` record for the editor banner labels.
  const gridWidgetMeta = useMemo(() => {
    const record: Record<string, WidgetMeta> = {};
    for (const w of widgets) {
      if (w.meta) record[w.key] = w.meta;
    }
    return record;
  }, [widgets]);

  const handleSave = useCallback(() => {
    onSave(layoutRef.current);
    onClose();
  }, [onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // The palette calls this when the user picks a widget to add.
  const handlePaletteAdd = useCallback(
    (widgetType: string) => {
      // Delegate to the consumer's onAddWidget — the consumer knows how to
      // resolve a widget type string into a WidgetConfig (entity table,
      // built-in, custom, etc.). This is the framework-agnostic seam: crm7
      // resolved this via its widget registry + supabase; conduit resolves it
      // via its own widget catalogue.
      onAddWidget({
        key: widgetType,
        content: null,
        meta: { label: widgetType },
      });
      setPaletteOpen(false);
    },
    [onAddWidget],
  );

  // tenantId is passed through to onAddWidget via the consumer's handler;
  // reference it here to avoid an unused-variable lint at the call site.
  void tenantId;

  const effectiveDefaultLayouts = defaultLayouts ?? { lg: [] };

  return (
    <div className="relative isolate">
      {/* Save / Cancel toolbar — sticky at the top of the editor overlay */}
      <div
        className="sticky top-0 z-40 isolate flex flex-col gap-3 rounded-xl shadow-lg border-2 mb-4 p-4 bg-card/95 supports-[backdrop-filter]:bg-card/80 backdrop-blur border-primary"
        role="region"
        aria-label="Page editor toolbar"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full flex items-center justify-center bg-primary/10 h-10 w-10 animate-pulse">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">
                Page Editor
              </h3>
              <span className="text-sm text-muted-foreground">
                Drag cards to rearrange. Resize with the bottom-right handle.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border-interactive px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={() => setPaletteOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Widget
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border-interactive px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={handleSave}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Canvas grid — always in editing mode while the launcher is mounted */}
      <PageGridLayout
        pageKey={pageId}
        defaultLayouts={effectiveDefaultLayouts}
        canEditPage
        preferenceAdapter={capturedAdapter}
        widgets={gridWidgets}
        widgetMeta={gridWidgetMeta}
      />

      {/* WidgetPalette drawer — a simple right-side slide-over.
          This is a self-contained drawer using Tailwind transitions rather
          than depending on a consumer's Sheet/Drawer component, keeping the
          package framework-agnostic. The consumer's onAddWidget callback is
          the seam for resolving widget types into renderable content. */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-overlay/50"
            onClick={() => setPaletteOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="relative ml-auto h-full w-80 max-w-[85vw] flex flex-col bg-card border-l border-border shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
              <h2 className="text-base font-semibold">Add Widget</h2>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setPaletteOpen(false)}
                aria-label="Close widget palette"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {widgets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No widgets available. Add widgets via your app's widget
                  catalogue.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    Available Widgets
                  </p>
                  {widgets.map((w) => (
                    <div
                      key={w.key}
                      className="flex items-center justify-between rounded-md border bg-card p-3 hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-sm font-medium truncate">
                        {w.meta?.label ?? w.key}
                      </span>
                      <button
                        type="button"
                        className="ml-2 shrink-0 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
                        onClick={() => handlePaletteAdd(w.key)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Remove Widget
                </p>
                {widgets.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">
                    No widgets on the canvas to remove.
                  </p>
                ) : (
                  widgets.map((w) => (
                    <div
                      key={`remove-${w.key}`}
                      className="flex items-center justify-between rounded-md border bg-card p-3"
                    >
                      <span className="text-sm font-medium truncate">
                        {w.meta?.label ?? w.key}
                      </span>
                      <button
                        type="button"
                        className="ml-2 shrink-0 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                        onClick={() => onRemoveWidget(w.key)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}