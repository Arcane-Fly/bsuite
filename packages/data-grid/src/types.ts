import type { ReactNode } from 'react';
import type { CellPosition, CellRange } from './lib/selection.js';

/**
 * Column value type — drives which built-in inline editor renders and how
 * values serialize to/from the TSV clipboard (see lib/clipboard.ts and
 * lib/tsv.ts). `renderEditor` is the escape hatch for anything this set
 * doesn't cover (e.g. an FK-lookup editor) — deliberately NOT implemented
 * in this package; a host wires its own via `renderEditor`.
 */
export type ColumnDataType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface CellEditorProps<TRow = unknown> {
  value: unknown;
  row: TRow;
  rowIndex: number;
  column: DataGridColumn<TRow>;
  /** Set when editing was triggered by typing a printable character over a
   * focused (non-editing) cell — Excel/Sheets semantics: the typed
   * character replaces the previous value rather than appending to it. */
  initialInputChar?: string;
  onCommit: (nextValue: unknown) => void;
  onCancel: () => void;
}

export interface CellRendererProps<TRow = unknown> {
  value: unknown;
  row: TRow;
  rowIndex: number;
  column: DataGridColumn<TRow>;
}

export interface DataGridColumn<TRow = unknown> {
  /** Stable column identifier — used for column order, sizing, TSV column
   * position, and edit callbacks. */
  id: string;
  header: string;
  accessor: (row: TRow) => unknown;
  dataType?: ColumnDataType;
  /** Options for dataType: 'select'. Ignored otherwise. */
  options?: SelectOption[];
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  /** Default true. Set false for a computed/read-only column. */
  editable?: boolean;
  /** Escape hatch for a fully custom inline editor (e.g. an FK-lookup
   * picker). Not implemented in this package by design. */
  renderEditor?: (props: CellEditorProps<TRow>) => ReactNode;
  renderCell?: (props: CellRendererProps<TRow>) => ReactNode;
  /** Render/copy formatting. Defaults are type-aware (see formatCellValue). */
  formatValue?: (value: unknown, row: TRow) => string;
  /** Parse pasted/typed text back into a typed value. Defaults are
   * type-aware (see parseCellValue). */
  parseValue?: (raw: string, row: TRow) => unknown;
}

export interface CellEdit<TRow = unknown> {
  rowIndex: number;
  columnId: string;
  previousValue: unknown;
  value: unknown;
  row: TRow;
}

export type DataGridErrorPhase = 'edit' | 'paste' | 'fill' | 'clear' | 'undo' | 'redo' | 'clipboard';

/**
 * Reported on ANY failed mutation. `onError` is a REQUIRED prop (see
 * DataGridProps) — the single most common defect class across this estate
 * is a mutation that fails silently and reads as "nothing happened" (a
 * failed Supabase write, a stale RLS policy, a network blip). A grid that
 * quietly reverts an edit without telling the host reproduces exactly that
 * defect at the UI's most interactive surface. Making this required forces
 * every integration to decide — even if the decision is "toast it" — instead
 * of forgetting to.
 */
export interface DataGridError<TRow = unknown> {
  message: string;
  cause?: unknown;
  phase: DataGridErrorPhase;
  edits: CellEdit<TRow>[];
}

export interface DataGridHandle {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getSelection: () => CellRange | null;
  getFocusedCell: () => CellPosition | null;
  copySelection: () => Promise<void>;
}

export interface DataGridProps<TRow = unknown> {
  columns: DataGridColumn<TRow>[];
  data: TRow[];
  /** Stable row id extractor, used for React keys and edit bookkeeping.
   * Defaults to row index if omitted. */
  getRowId?: (row: TRow, index: number) => string;
  /**
   * Batch cell-edit callback — called for every commit (typed edit, paste,
   * fill, clear, undo, redo). May be sync or return a Promise; a rejected
   * Promise (or thrown error) is reported via `onError` and the optimistic
   * value is reverted. Required — a grid nobody can persist edits through
   * is a display, not a grid, and making it optional invites exactly the
   * "edited, nothing happened" gap this package exists to close.
   */
  onCellsEdited: (edits: CellEdit<TRow>[]) => void | Promise<void>;
  /** REQUIRED — see DataGridError doc comment. */
  onError: (error: DataGridError<TRow>) => void;
  /** Freeze the first column (sticky left, excluded from reorder). Default true. */
  frozenFirstColumn?: boolean;
  rowHeight?: number;
  headerHeight?: number;
  /** Height of the scroll viewport. Accepts any CSS length. Default '100%'. */
  height?: string | number;
  className?: string;
  /** Max entries retained in the undo stack. Default 200. */
  undoLimit?: number;
  emptyState?: ReactNode;
  /**
   * Open the record behind a row.
   *
   * Operator, 2026-08-28: "each row clickable and live". A listing whose rows
   * do not open the record is a report, not a list — the reader has to go find
   * the thing they were just looking at.
   *
   * Fires on a plain single click on a NON-editing cell. It deliberately does
   * NOT fire while a cell is being edited, nor on a range-select drag, nor on
   * a modified click (ctrl/cmd/shift) — those already mean "select cells", and
   * stealing them would break the spreadsheet behaviour this grid exists for.
   */
  onRowClick?: (row: TRow, index: number) => void;
  /**
   * Which columns are shown, by column id. Absent id = visible.
   *
   * Controlled when `onColumnVisibilityChange` is supplied, so a page can
   * persist the reader's choice; uncontrolled otherwise.
   */
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (next: Record<string, boolean>) => void;
  /**
   * Free-text filter across every visible column's FORMATTED value.
   *
   * Formatted, not raw: the reader filters what they can see. A date shown as
   * `23/08/2026` must match "23/08", which its ISO storage value would not.
   */
  globalFilter?: string;
  /**
   * Row height in px. Supply `onRowHeightChange` to let the reader adjust it.
   *
   * Operator, 2026-08-28: "row height adjustible so nothing vertically
   * truncated". A fixed 32px row silently clips a cell whose content wraps,
   * and the reader has no way to see what was cut.
   */
  onRowHeightChange?: (next: number) => void;
}
