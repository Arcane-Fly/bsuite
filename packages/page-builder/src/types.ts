import type React from 'react';
import type { Compactor, LayoutItem, ResizeHandleAxis } from 'react-grid-layout';

export interface GridLayoutItem extends LayoutItem {
  /**
   * When true, this item's height is driven by its own measured content
   * height rather than manual resize (blueprint amendment A1). `GridItem`
   * mounts a `ResizeObserver` on an unconstrained content wrapper and
   * reports the computed row count upward via `computeAutoHeightRows`;
   * `PageGridLayout` force-sets `isResizable: false` for any item with
   * `autoHeight: true` (see the `activeLayouts` memo) so callers don't need
   * to remember to set both fields.
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
   * Patches a single widget's `h`/`minH` (all breakpoints) to `rows`. Used
   * by the auto-height mechanism (blueprint amendment A1) to snap an
   * `autoHeight` item's saved layout to its measured content size. No-op
   * when the widget already matches (diff-guarded) so it never causes an
   * unnecessary preference-adapter write.
   */
  setWidgetAutoHeightRows: (widgetKey: string, rows: number) => void;
  resetConfirmOpen: boolean;
  setResetConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canEditPage: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  containerWidth: number;
}
