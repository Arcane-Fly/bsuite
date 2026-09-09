import type { ReactNode } from 'react';
import type { CellPosition, CellRange } from './lib/selection.js';
import type { RowData } from '@tanstack/react-table';

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
  /**
   * This cell is a LINK to another record, not a value typed into this row.
   *
   * Operator, 2026-08-28: "it was always meant to be applied to a cell. e.g.
   * link a host to a placement it comes from linking and selecting the hosts
   * record i dont type the same host name everytime. this is the oneshot
   * policy."
   *
   * The estate's one-shot doctrine gives every entity exactly one owning
   * surface for create/edit. A linked cell stores a REFERENCE; the text on
   * screen is derived from the referenced record. Two consequences follow, and
   * the grid enforces both rather than documenting them:
   *
   *  1. TYPING FILTERS, IT DOES NOT ENTER. The editor is a searchable picker:
   *     you type to narrow the list of records — operator, 2026-08-28: "you
   *     can type it to filter though" — and only a SELECTED record commits. An
   *     arbitrary string is refused, so a host name cannot be mistyped into a
   *     row and two rows cannot hold different spellings of the same host.
   *
   *  2. A TYPO IS FIXED ONCE, AT SOURCE, AND EVERY ROW FOLLOWS. Not because
   *     the grid propagates anything — because there is only one copy. Three
   *     placements showing the same host all change when the host record
   *     changes, and no code in this package is involved.
   *
   * Fill-down IS allowed here and copies the REFERENCE, which is the ordinary
   * "point these three placements at the same host" gesture. What it can never
   * do is copy a string.
   *
   * `renderEditor` IS REQUIRED alongside this, and the grid refuses to edit the
   * cell without it. The editor is the APP'S OWN entity selector — the same
   * component the placement form uses to choose a host, with the same
   * select-and-add-new behaviour (operator, 2026-08-28: "same as selecting a
   * host record when entering the host on a placement form. same principle.
   * select, add new."). crm7 ships 31 of these plus quick-create dialogs.
   *
   * This package deliberately does NOT implement a picker of its own. A second
   * picker would be a second create/edit surface for the same entity, which is
   * the one-shot violation this whole mechanism exists to prevent — and the
   * failure mode if it were optional is the worst one available: the cell
   * would silently fall back to a TEXT INPUT, and the first person to type a
   * host name would reintroduce exactly the divergence the link prevents.
   */
  link?: {
    /** The owning entity, for the audit trail and the host's dispatch. */
    entity: string;
    /** Which record this row currently points at. `null` = unlinked. */
    refId: (row: TRow) => string | null;
  };
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

/**
 * A row was pointed at a different record.
 *
 * This is a re-LINK, never a rename: the referenced record's own fields are
 * edited on the surface that owns it, which is what makes one fix reach every
 * row without this package doing anything.
 */
export interface LinkEdit<TRow = unknown> {
  entity: string;
  columnId: string;
  rowIndex: number;
  row: TRow;
  previousRefId: string | null;
  refId: string | null;
}

export interface CellEdit<TRow = unknown> {
  /** Always supplied by DataGrid; optional for backwards-compatible host-created edits. */
  rowId?: string;
  rowIndex: number;
  columnId: string;
  previousValue: unknown;
  value: unknown;
  row: TRow;
}

export interface CellEditFailure {
  rowId: string;
  columnId: string;
  status: 'failed';
  message?: string;
}

/** Omitted cells succeeded. A void result preserves the original all-success contract. */
export interface CellEditResult {
  failures: readonly CellEditFailure[];
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

/**
 * `TRow` is constrained to TanStack v9's `RowData` (`Record<string, any> |
 * Array<any>`). v9 requires row data to be a record or an array — a bare
 * `unknown` row can no longer be fed to a table. Every consumer already passes
 * row objects, so this narrows the type to what was always actually used.
 */
export interface DataGridProps<TRow extends RowData = RowData> {
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
  onCellsEdited: (edits: CellEdit<TRow>[]) => void | CellEditResult | Promise<void | CellEditResult>;
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
   * Group rows by this column id, or `null` for a flat grid.
   *
   * EXISTS BECAUSE the report surfaces cannot convert without it. crm7's
   * `ReportTable` lets a reader choose a groupBy column and PERSISTS it as a view
   * preference; converting that page to a grid with no grouping would have deleted
   * a feature people use, which is a regression wearing a migration's clothes.
   *
   * Controlled by the host so the choice can be persisted. Grouping is a VIEW,
   * not a mutation: `onRowClick` still receives the original record and the
   * original data index, so a grouped grid opens the same record a flat one does.
   */
  /**
   * Seed and observe the sort, so a host can PERSIST it.
   *
   * EXISTS BECAUSE crm7's `ReportTable` saves the reader's chosen sort as a view
   * preference. The grid's own sort is internal state, so converting that surface
   * without this would have dropped the saved sort on every reload — the list
   * still renders, the sort silently is not the one they chose, and nothing
   * fails. That is the regression shape this package keeps having to design out.
   *
   * Uncontrolled when omitted: the grid keeps its own sort, exactly as before.
   */
  /**
   * Accessible name for the grid.
   *
   * The grid renders `role="grid"`, and a grid with no accessible name is
   * announced as an unnamed table — a screen-reader user lands in a mesh of
   * cells with nothing saying what they are looking at. Every render site was
   * missing one, because there was no way to supply it.
   */
  /**
   * Seed and observe the COLUMN ORDER, so a host can persist it.
   *
   * The grid holds its own order for drag-to-reorder. Without this a saved
   * column order is dropped on reload — the grid renders, the columns are
   * simply not in the order the reader arranged them, and nothing fails. Same
   * shape as the sort gap `sortBy` closed.
   *
   * Uncontrolled when omitted.
   */
  columnOrder?: string[] | null;
  onColumnOrderChange?: (next: string[]) => void;
  ariaLabel?: string;
  sortBy?: { id: string; desc: boolean }[] | null;
  onSortByChange?: (next: { id: string; desc: boolean }[]) => void;
  groupBy?: string | null;
  /** Fires when the reader collapses or expands a group. */
  onGroupExpandedChange?: (expanded: Record<string, boolean>) => void;
  /** Initial collapsed/expanded state per group id. Absent means all expanded. */
  groupExpanded?: Record<string, boolean>;
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
   * A row was pointed at a different record. REQUIRED if any column declares
   * `link` — a grid that lets you re-link and then drops the write is worse
   * than one that refuses the edit, because the screen shows the new host and
   * the database keeps the old one.
   */
  onLinkEdit?: (edit: LinkEdit<TRow>) => void | Promise<void>;
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
