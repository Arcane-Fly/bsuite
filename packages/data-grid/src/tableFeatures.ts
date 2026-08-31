/**
 * The TanStack Table v9 feature set this grid registers.
 *
 * v9 stopped bundling every feature into the table and made registration
 * explicit: a method only exists on a column/header/row if the feature that
 * owns it was registered here. That is why v9's first generic is `TFeatures`
 * and not the row type — the shape of a `Column` is now derived from this
 * object, so `typeof gridFeatures` has to travel with every public type.
 *
 * Registered deliberately rather than via `stockFeatures`: the kitchen-sink
 * export pulls in pagination, row selection and pinning that this grid does not
 * use, and the whole point of the v9 split is that you pay for what you
 * register. Each entry below is here because some state slice or method in
 * DataGrid.tsx needs it:
 *
 *   rowSortingFeature        `sorting` state, column.getIsSorted/toggleSorting
 *   columnOrderingFeature    `columnOrder` state (host-controlled, drag to reorder)
 *   columnSizingFeature      `columnSizing` state, column.resetSize
 *   columnResizingFeature    the drag interaction — v9 split sizing from resizing,
 *                            and `getResizeHandler`/`getIsResizing` live on THIS one
 *   columnVisibilityFeature  `columnVisibility` state
 *   globalFilteringFeature   `globalFilter` state + our formatted-value filterFn
 *   columnGroupingFeature    `grouping` state and groupedColumnMode
 *   rowExpandingFeature      `expanded` state for group rows
 *
 * Prerequisite features are declared BEFORE the row-model slot that depends on
 * them, which the v9 migration guide requires.
 */
import {
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createGroupedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowExpandingFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table';

export const gridFeatures = tableFeatures({
  rowSortingFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  // v9 enforces the prerequisite in the TYPE: globalFilteringFeature and
  // filteredRowModel both refuse to compile without columnFilteringFeature.
  columnFilteringFeature,
  globalFilteringFeature,
  columnGroupingFeature,
  rowExpandingFeature,
  // Row-model slots. The core row model is automatic in v9 and must NOT be
  // passed — `getCoreRowModel()` was removed, not renamed.
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
});

export type GridFeatures = typeof gridFeatures;
