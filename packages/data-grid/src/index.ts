/**
 * @bsuite/data-grid — main entry.
 *
 * A virtualized, spreadsheet-feel data grid: row + column virtualization
 * (@tanstack/react-virtual), sorting/column order/sizing
 * (@tanstack/react-table), cell-range selection, keyboard grid navigation,
 * a TSV clipboard round-trip, a fill handle, and an undo/redo stack.
 *
 * FIRST CONSUMER, 2026-08-29: crm7 `/hr/disciplinary` (crm7#2205) — a read-and-open
 * listing, 8 columns, `onRowClick` into the case record. It is the only one; the
 * remaining ~155 crm7 tables are still hand-rolled, and `EnhancedDataTable` (43 pages)
 * is NOT a one-edit conversion — its cell renderers read TanStack's `row.original`,
 * which is not this package's `row`. See
 * `docs/20260829-enhanceddatatable-is-not-a-one-edit-conversion-v1.00W.md`.
 *
 * Import the pure logic (TSV, selection maths, fill maths, undo stack,
 * keyboard maths, clipboard glue) independently via `@bsuite/data-grid/lib`
 * if a host only needs the non-React pieces.
 */
export { DataGrid } from './DataGrid.js';
export {
  TextEditor,
  NumberEditor,
  DateEditor,
  BooleanEditor,
  SelectEditor,
} from './editors/index.js';
export { formatCellValue, parseCellValue } from './formatting.js';
export { cn } from './cn.js';

export type {
  ColumnDataType,
  SelectOption,
  CellEditorProps,
  CellRendererProps,
  DataGridColumn,
  CellEdit,
  CellEditFailure,
  CellEditResult,
  DataGridErrorPhase,
  DataGridError,
  DataGridHandle,
  DataGridProps,
} from './types.js';

export type { CellPosition, CellRange } from './lib/selection.js';
export { DataGridToolbar, ROW_HEIGHTS, rowHeightNameFor } from './components/DataGridToolbar.js';
export type { DataGridToolbarProps, RowHeightName } from './components/DataGridToolbar.js';
export type { LinkEdit } from './types.js';
