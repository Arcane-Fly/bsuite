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
  /**
   * True once the user has resized this item with the SE handle.
   *
   * The floor above says "never discard a height the user chose". Until this
   * flag existed the code could not tell a chosen height from an AUTHORED
   * SEED, so it defended both — and a seed is the common case, because every
   * page ships one and most cards are never resized. `max(saved, measured)`
   * then pinned each card at whatever its author guessed, permanently, and
   * auto-height could only ever grow.
   *
   * Measured in a signed-in browser on crm7 `/dashboard`, 2026-08-20:
   * 1,143px of dead space across 7 cards, every allocation equal to its seed
   * `h` rather than to its content. `recentActivity` seeds `h: 13` (488px)
   * and paints 173px — 315px dead, 8.3 row units. `Math.ceil` can waste at
   * most ONE row unit, so rounding was never a candidate cause.
   *
   * Set by `stripAutoHeightRows` at the moment it identifies a deliberate
   * resize — the one place that already distinguishes a real gesture from a
   * measurement echo. Absent (legacy layouts, seeds) means the measured
   * height wins outright.
   */
  hUserSet?: boolean;
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
  /**
   * Value used for `GridLayoutItem.autoHeight` on any item that does not state
   * one. Defaults to `true` — cards grow to fit their content rather than
   * clipping it behind an inner scrollbar (D-76). Pass `false` for a surface
   * whose items own their own scroll (a virtualized list); an individual item
   * can always opt out with an explicit `autoHeight: false`.
   */
  defaultAutoHeight?: boolean;
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
  /**
   * The caller's tenant (Wave 4 / W4-3 — see {@link PageGridLayoutProps.tenantId}).
   * Threaded through so the entity-list widget is scoped to the caller's
   * tenant by default instead of each consumer inventing (or forgetting)
   * its own plumbing — a platform developer and an ordinary tenant user
   * previously saw identical `entityType`/`label` from this callback with
   * no way to tell whose rows they were about to render.
   */
  tenantId?: string | null;
}

// ─── Relationship-field widget kind (Wave 4) ───────────────────────────────
//
// The entity-list widget above renders a table of every row of an entity —
// it writes nothing. A relationship field is a second, distinct widget kind:
// a typeahead over a single entity that writes ONE foreign key on the record
// being edited. See docs/plans/20260810-people-organisations-onboarding-
// design-v1.00D.md §4 for the motivating incident (choosing "Client" through
// the canvas produced a list of every organisation, because a list was the
// only widget kind that existed).

/**
 * A single option a {@link RelationshipField} can offer — the row a user
 * picks to write as the foreign key value. `id` is what gets written;
 * `label` (and optional `secondaryLabel`) is what gets displayed.
 */
export interface RelationshipFieldOption {
  id: string;
  label: string;
  secondaryLabel?: string;
}

/**
 * Detail carried by the `crm7-add-relationship-widget` / `bsu-add-relationship-widget`
 * events — mirrors {@link EntityWidgetDetail} for the entity-list kind.
 * Unlike a list (which only needs an entity type to render a table), a
 * relationship field writes a single foreign key, so it must name BOTH
 * sides: the host record's entity type and FK column, and the entity type
 * the FK targets.
 */
export interface RelationshipWidgetDetail {
  /** Entity type of the record being edited — the host row the FK lives on. */
  hostEntityType: string;
  /** FK column on the host record this widget writes when a value is picked. */
  fkColumn: string;
  /** Entity type the FK points at — drives the typeahead's search. */
  targetEntityType: string;
  label?: string;
}

export interface RelationshipWidgetFactoryOptions extends RelationshipWidgetDetail {
  widgetId: string;
  isEditing: boolean;
  /** The caller's tenant — see {@link PageGridLayoutProps.tenantId}. */
  tenantId?: string | null;
}

/**
 * One entry in the relationship catalogue: proof that a host entity's FK
 * column genuinely points at a target entity, and is therefore safe to
 * offer as a relationship field. Consumers build this array from a live
 * schema source — in crm7, the `report_catalog_joins` table, filtered to
 * `cardinality = 'many_to_one'` and `is_active = true` — never from
 * inference. `@bsuite/page-builder` itself has no notion of a database and
 * cannot verify writability on its own; see {@link isRelationshipWritable}.
 */
export interface RelationshipCatalogEntry {
  hostEntityType: string;
  fkColumn: string;
  targetEntityType: string;
}

export type RelationshipCatalog = readonly RelationshipCatalogEntry[];

export interface PageGridLayoutProps extends UsePageGridLayoutOptions {
  widgets: Record<string, React.ReactNode>;
  widgetMeta?: Record<string, WidgetMeta>;
  className?: string;
  isResizable?: boolean;
  resizeHandles?: readonly ResizeHandleAxis[];
  /**
   * The signed-in caller's tenant. Threaded into every widget-factory call
   * (`createEntityWidget`, `createRelationshipWidget`) as `tenantId` so
   * both widget kinds are scoped to the caller's tenant BY DEFAULT — the
   * shared layer hands the scope down explicitly rather than leaving each
   * consumer to invent (or omit) its own plumbing (W4-3).
   */
  tenantId?: string | null;
  addEntityWidgetEventNames?: readonly string[];
  createEntityWidget?: (options: EntityWidgetFactoryOptions) => React.ReactNode;
  onRegisterEntityWidget?: (options: EntityWidgetDetail & { widgetId: string }) => void;
  /**
   * Schema facts describing which relationships are actually writable
   * (W4-2). A relationship field is only ever added when its
   * `{hostEntityType, fkColumn, targetEntityType}` triple appears here —
   * consumers build this from a live catalogue, never from inference.
   * Omitting this prop refuses every relationship field (fail closed): no
   * catalogue means nothing has been proven writable.
   */
  relationshipCatalog?: RelationshipCatalog;
  addRelationshipWidgetEventNames?: readonly string[];
  createRelationshipWidget?: (options: RelationshipWidgetFactoryOptions) => React.ReactNode;
  onRegisterRelationshipWidget?: (options: RelationshipWidgetDetail & { widgetId: string }) => void;
  /**
   * Called when an `add-relationship-widget` event names a relationship
   * that is not present in `relationshipCatalog` — the widget is refused;
   * this is the hook for surfacing why (e.g. a toast) without
   * `@bsuite/page-builder` owning any UI copy.
   */
  onRelationshipWidgetRejected?: (detail: RelationshipWidgetDetail) => void;
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
  /**
   * Wire to `<Responsive onBreakpointChange>`. The hook needs to know which
   * breakpoint react-grid-layout is rendering so a gesture is written back to
   * the breakpoint that owns it — see `canonicaliseLayoutForPersist`. Without
   * this the hook assumes `lg`, and every edit made at a narrower container
   * width lands in a derived breakpoint that is then discarded (D-75).
   */
  handleBreakpointChange: (breakpoint: string) => void;
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
