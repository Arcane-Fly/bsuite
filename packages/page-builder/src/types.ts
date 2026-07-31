import type React from 'react';
import type { Compactor, LayoutItem, ResizeHandleAxis } from 'react-grid-layout';

export interface GridLayoutItem extends LayoutItem {
  /**
   * When true, this item's measured content height acts as a FLOOR on its
   * height — it is not a substitute for manual resize. `GridItem` mounts a
   * `ResizeObserver` on an unconstrained content wrapper and reports the
   * computed row count upward via `computeAutoHeightRows`; `PageGridLayout`
   * then applies it as `minH` (never clip content) while keeping `h` at
   * `max(saved, measured)` (never discard a height the user chose).
   *
   * `autoHeight` does NOT disable resizing. It previously force-set
   * `isResizable: false`, which removed card resizing from every page using
   * the default — corrected 2026-07-31; resizable cards are an
   * operator-mandated capability. See the `activeLayouts` memo.
   */
  autoHeight?: boolean;
}

export interface GridLayouts {
  lg: GridLayoutItem[];
  [key: string]: GridLayoutItem[];
}

export interface PageGridPreferenceAdapter<T> {
  value: T;
  setValue: (value: T | ((previous: T) => T)) => void;
  loaded: boolean;
}

export type PageGridPreferenceFactory = <T>(
  key: string,
  fallback: T
) => PageGridPreferenceAdapter<T>;

export interface UsePageGridLayoutOptions {
  pageKey: string;
  defaultLayouts: GridLayouts;
  defaultCols?: number;
  layoutVersion?: number;
  canEditPage?: boolean;
  editorEventNames?: readonly string[];
  preferenceAdapter?: PageGridPreferenceFactory;
}

export interface WidgetMeta {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultSize?: { w?: number; h?: number; minW?: number; minH?: number };
}

export interface EntityWidgetDetail {
  entityType: string;
  label?: string;
}

export interface EntityWidgetFactoryOptions extends EntityWidgetDetail {
  widgetId: string;
  isEditing: boolean;
}

export interface PageGridLayoutProps extends UsePageGridLayoutOptions {
  widgets: Record<string, React.ReactNode>;
  widgetMeta?: Record<string, WidgetMeta>;
  className?: string;
  isResizable?: boolean;
  resizeHandles?: readonly ResizeHandleAxis[];
  addEntityWidgetEventNames?: readonly string[];
  createEntityWidget?: (options: EntityWidgetFactoryOptions) => React.ReactNode;
  onRegisterEntityWidget?: (options: EntityWidgetDetail & { widgetId: string }) => void;
}

export interface UsePageGridLayoutResult {
  currentLayouts: GridLayouts;
  layoutCols: number;
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  activeCols: Record<string, number>;
  activeCompactor: Compactor;
  onLayoutChange: (_layout: unknown, layouts: unknown) => void;
  handleColumnChange: (newCols: number) => void;
  handleCompact: () => void;
  handleReset: () => void;
  addWidget: (
    widgetKey: string,
    initialSize?: Partial<Pick<GridLayoutItem, 'w' | 'h' | 'minW' | 'minH'>>
  ) => void;
  moveWidget: (widgetKey: string, direction: 'up' | 'down') => void;
  setWidgetLocked: (widgetKey: string, locked: boolean) => void;
  removeWidget: (widgetKey: string) => void;
  /**
   * Applies a batch of measured auto-height row counts (widgetKey -> rows)
   * in a SINGLE functional state update. Measured heights are DERIVED,
   * in-memory-only state: they are merged over the saved layout when
   * producing the layouts handed to react-grid-layout (so every viewer
   * renders full-height cards) and are NEVER written to the preference
   * adapter — measurements re-derive on every mount, so persisting them
   * would be redundant and would cause storage writes from mere viewing
   * (e.g. switching tabs inside a card). Diff-guarded: returns the previous
   * map identity when nothing changed, so no re-render occurs.
   */
  applyAutoHeightRows: (rowsByWidget: Record<string, number>) => void;
  /** Current measured auto-height overrides (widgetKey -> rows). In-memory
   * only; see `applyAutoHeightRows`. */
  autoHeightRows: Record<string, number>;
  resetConfirmOpen: boolean;
  setResetConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canEditPage: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  containerWidth: number;
}
