import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import {
  useTable,
  type ColumnDef,
  type RowData,
  type ColumnSizingState,
  type ExpandedState,
  type GroupingState,
  type SortingState,
} from '@tanstack/react-table';
import { gridFeatures, type GridFeatures } from './tableFeatures.js';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';

import { cn } from './cn.js';
import { ColumnHeaderCell } from './components/ColumnHeaderCell.js';
import { FillHandle } from './components/FillHandle.js';
import { GridCell } from './components/GridCell.js';
import { BooleanEditor, DateEditor, NumberEditor, SelectEditor, TextEditor } from './editors/index.js';
import { formatCellValue, parseCellValue } from './formatting.js';
import { buildCopyText, buildPasteEdits, expandSingleCellPasteToSelection } from './lib/clipboard.js';
import { computeFillDownExtent, computeFillRange, mapFillTargetToSource, type FillResult } from './lib/fill.js';
import { isPrintableEditTrigger, moveEnter, moveFocus, moveTab, type GridBounds } from './lib/keyboard.js';
import { isCellInRange, normalizeRange, rangeToCells, type CellPosition, type CellRange } from './lib/selection.js';
import type { LinkEdit } from './types.js';
import { UndoStack, type UndoEntry } from './lib/undo.js';
import type {
  CellEdit,
  CellEditorProps,
  DataGridColumn,
  DataGridErrorPhase,
  DataGridHandle,
  DataGridProps,
} from './types.js';

const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_HEADER_HEIGHT = 32;
const DEFAULT_COLUMN_WIDTH = 150;
const DEFAULT_MIN_COLUMN_WIDTH = 60;
const DEFAULT_UNDO_LIMIT = 200;

function overlayKey(rowId: string, columnId: string): string {
  return JSON.stringify([rowId, columnId]);
}

interface OptimisticCell {
  value: unknown;
  owner: symbol;
  pending: boolean;
}

interface EditVersion {
  value: unknown;
  previous?: EditVersion;
  failed: boolean;
  settled: Promise<void>;
  finish: () => void;
}
function versionValue(version: EditVersion): unknown {
  return version.failed && version.previous ? versionValue(version.previous) : version.value;
}

function editorFor<TRow>(column: DataGridColumn<TRow>): (props: CellEditorProps<TRow>) => ReactElement {
  if (column.renderEditor) return column.renderEditor as (props: CellEditorProps<TRow>) => ReactElement;
  switch (column.dataType) {
    case 'number':
      return NumberEditor as unknown as (props: CellEditorProps<TRow>) => ReactElement;
    case 'date':
      return DateEditor as unknown as (props: CellEditorProps<TRow>) => ReactElement;
    case 'boolean':
      return BooleanEditor as unknown as (props: CellEditorProps<TRow>) => ReactElement;
    case 'select':
      return SelectEditor as unknown as (props: CellEditorProps<TRow>) => ReactElement;
    default:
      return TextEditor as unknown as (props: CellEditorProps<TRow>) => ReactElement;
  }
}

function DataGridInner<TRow extends RowData>(props: DataGridProps<TRow>, ref: React.Ref<DataGridHandle>): ReactElement {
  const {
    columns,
    data,
    getRowId,
    onCellsEdited,
    onError,
    frozenFirstColumn = true,
    rowHeight = DEFAULT_ROW_HEIGHT,
    headerHeight = DEFAULT_HEADER_HEIGHT,
    height = '100%',
    className,
    undoLimit = DEFAULT_UNDO_LIMIT,
    emptyState,
    onRowClick,
    ariaLabel,
    columnOrder: columnOrderProp,
    onColumnOrderChange,
    sortBy,
    onSortByChange,
    groupBy = null,
    groupExpanded,
    onGroupExpandedChange,
    columnVisibility: columnVisibilityProp,
    onColumnVisibilityChange,
    globalFilter,
    onLinkEdit,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const columnConfigById = useMemo(() => new Map(columns.map((c) => [c.id, c] as const)), [columns]);

  const tableColumns = useMemo<ColumnDef<GridFeatures, TRow, unknown>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        header: col.header,
        accessorFn: (row: TRow) => col.accessor(row),
        enableSorting: col.sortable ?? true,
        size: col.width ?? DEFAULT_COLUMN_WIDTH,
        minSize: col.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH,
        maxSize: col.maxWidth,
      })),
    [columns],
  );

  const [sorting, setSorting] = useState<SortingState>(sortBy ?? []);

  /*
   * CONTROLLED WHEN GIVEN, uncontrolled when not. A host that persists the sort
   * seeds it here; a host that does not keeps the previous behaviour exactly.
   *
   * The effect syncs only when the prop actually differs, compared by VALUE.
   * Comparing by identity would re-seed on every render for any caller that
   * builds the array inline — which is most of them — and that would fight the
   * reader's own clicks on the header.
   */
  useEffect(() => {
    if (!sortBy) return;
    const same =
      sortBy.length === sorting.length &&
      sortBy.every((s2, i) => s2.id === sorting[i]?.id && s2.desc === sorting[i]?.desc);
    if (!same) setSorting(sortBy);
  }, [sortBy, sorting]);
  /*
   * Per-cell refusal messages, keyed exactly like the optimistic overlay.
   *
   * A grid that reverts a failed edit and reports it only through `onError` is
   * a SILENT revert from the reader's seat: they typed, the value went back,
   * and nothing on screen says why. This is what makes the refusal visible at
   * the cell it happened in.
   */
  const [refusals, setRefusals] = useState<Map<string, string>>(new Map());

  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => columnOrderProp ?? columns.map((c) => c.id),
  );

  /*
   * CONTROLLED WHEN GIVEN. Compared by VALUE, not identity: a caller that builds
   * the array inline — most of them — would otherwise re-seed on every render
   * and fight the reader's own drag.
   */
  useEffect(() => {
    if (!columnOrderProp) return;
    const same =
      columnOrderProp.length === columnOrder.length &&
      columnOrderProp.every((id, i) => id === columnOrder[i]);
    if (!same) setColumnOrder(columnOrderProp);
  }, [columnOrderProp, columnOrder]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  /*
   * Column visibility is CONTROLLED when the page supplies a change handler,
   * so the reader's choice can be persisted, and uncontrolled otherwise. The
   * uncontrolled copy still exists rather than being skipped: a grid that only
   * hides columns when its host bothers to wire persistence would be a
   * capability nobody gets by default.
   */
  const [ownColumnVisibility, setOwnColumnVisibility] = useState<Record<string, boolean>>({});
  const columnVisibility = columnVisibilityProp ?? ownColumnVisibility;
  const setColumnVisibility = useCallback(
    (next: Record<string, boolean>) => {
      if (onColumnVisibilityChange) onColumnVisibilityChange(next);
      else setOwnColumnVisibility(next);
    },
    [onColumnVisibilityChange],
  );

  // Keep columnOrder in sync if the `columns` prop's identity set changes
  // (columns added/removed) without discarding the user's chosen order.
  useEffect(() => {
    /*
     * When the HOST controls the order, this must not fight it. Without the
     * guard both effects run: the controlled one seeds the host's order, then
     * this one restores `prev` — and the host's order loses silently, which is
     * exactly how a saved column arrangement stops arriving.
     */
    if (columnOrderProp) return;
    setColumnOrder((prev) => {
      const ids = columns.map((c) => c.id);
      const idSet = new Set(ids);
      const kept = prev.filter((id) => idSet.has(id));
      const missing = ids.filter((id) => !kept.includes(id));
      const next = [...kept, ...missing];
      return next.length === prev.length && next.every((id, i) => id === prev[i]) ? prev : next;
    });
  }, [columns, columnOrderProp]);

  /*
   * Grouping is DERIVED from the prop, never held locally: the host owns the
   * choice so it can persist it. A local copy would silently diverge from the
   * saved view preference the moment the reader reloaded.
   */
  const grouping = useMemo<GroupingState>(() => (groupBy ? [groupBy] : []), [groupBy]);
  const [expanded, setExpanded] = useState<ExpandedState>(true);

  /*
   * Default is EXPANDED, and that is the deliberate choice. A grid that opens
   * with every group shut shows the reader a list of headings and none of their
   * data, which is a worse first screen than the flat grid it replaced.
   */
  useEffect(() => {
    setExpanded(groupExpanded && Object.keys(groupExpanded).length > 0 ? groupExpanded : true);
  }, [groupExpanded]);

  const table = useTable({
    features: gridFeatures,
    data,
    columns: tableColumns,
    state: { sorting, columnOrder, columnSizing, columnVisibility, globalFilter, grouping, expanded },
    /*
     * GROUPING MUST NOT REORDER A CONTROLLED COLUMN ORDER.
     *
     * TanStack's `groupedColumnMode` defaults to 'reorder', which hoists every
     * grouped column to the FRONT of the column order — silently overriding
     * whatever `columnOrder` the host passed. The host asked for an order; the
     * table quietly answered with a different one the moment a group was set.
     *
     * Measured 2026-08-30 on crm7's report viewer: a saved personal view with
     * columnOrder ['hours','employee_name'] and groupBy 'employee_name'
     * rendered headers ['Employee','Hours']. The saved order was reaching the
     * grid correctly — three package tests already prove controlled order is
     * honoured at mount, on a later render, and against the columns-sync
     * effect — and grouping undid it after all three.
     *
     * `false` keeps a grouped column exactly where the host put it. 'remove'
     * would drop it from the header row entirely, which is a different product
     * decision and not one a grouping toggle should make on the host's behalf.
     */
    groupedColumnMode: false,
    onExpandedChange: (updater) => {
      const next = typeof updater === 'function' ? updater(expanded) : updater;
      setExpanded(next);
      if (onGroupExpandedChange && typeof next === 'object') onGroupExpandedChange(next);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      onSortByChange?.(next.map((s2) => ({ id: s2.id, desc: s2.desc })));
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnOrder) : updater;
      setColumnOrder(next);
      onColumnOrderChange?.(next);
    },
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility(typeof updater === 'function' ? updater(columnVisibility) : updater),
    onGlobalFilterChange: () => {
      /* filter text is owned by the host; this exists so the table does not
         warn about an uncontrolled state field. */
    },
    /*
     * Filter the FORMATTED value, not the raw one.
     *
     * The reader filters what they can SEE. A date stored `2026-08-23` and
     * shown `23/08/2026` must match a search for "23/08" — matching the raw
     * value would silently return nothing for the string on screen.
     */
    globalFilterFn: (row, _columnId, value) => {
      const needle = String(value ?? '').toLowerCase();
      if (!needle) return true;
      return columns.some((col) => {
        if (columnVisibility[col.id] === false) return false;
        const raw = col.accessor(row.original);
        const shown = col.formatValue ? col.formatValue(raw, row.original) : formatCellValue(raw, col.dataType);
        return String(shown).toLowerCase().includes(needle);
      });
    },
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getRowId,
  });

  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const headerCells = table.getHeaderGroups()[0]?.headers ?? [];
  const frozenColumn = frozenFirstColumn ? visibleColumns[0] : undefined;
  const scrollableColumns = frozenFirstColumn ? visibleColumns.slice(1) : visibleColumns;
  const frozenWidth = frozenColumn ? frozenColumn.getSize() : 0;

  // ── Overlay: optimistic values layered over `data` until the host's own
  // re-render catches up, and reverted (with onError fired first) if the
  // host's onCellsEdited rejects. ──────────────────────────────────────
  const [overlay, setOverlay] = useState<Map<string, OptimisticCell>>(() => new Map());
  const cellOwners = useRef(new Map<string, symbol>());
  const versions = useRef(new Map<string, EditVersion>());
  const undoDependencies = useRef(new WeakMap<CellEdit<TRow>, EditVersion>());
  const historyOwners = useRef(new WeakMap<UndoEntry<CellEdit<TRow>[]>, symbol>());
  const rowIdentity = useCallback((row: TRow, index: number): string => getRowId?.(row, index) ?? String(index), [getRowId]);
  const rowsById = useMemo(() => new Map(data.map((row, index) => [rowIdentity(row, index), { row, index }])), [data, rowIdentity]);
  const currentRows = useRef(rowsById);
  currentRows.current = rowsById;
  // Release acknowledged successful overlays. Later refetches must remain authoritative.
  useEffect(() => {
    setOverlay((previous) => {
      let next = previous;
      for (const [key, cell] of previous) {
        const [rowId, columnId] = JSON.parse(key) as [string, string];
        const current = rowsById.get(rowId);
        const column = columnConfigById.get(columnId);
        if (!cell.pending && current && column && Object.is(column.accessor(current.row), cell.value)) {
          if (next === previous) next = new Map(previous);
          next.delete(key);
        }
      }
      return next;
    });
  }, [rowsById, columnConfigById, overlay]);
  const getEffectiveValue = useCallback(
    (rowIndex: number, columnId: string): unknown => {
      const key = overlayKey(rowIdentity(data[rowIndex], rowIndex), columnId);
      if (overlay.has(key)) return overlay.get(key)!.value;
      const column = columnConfigById.get(columnId);
      const row = data[rowIndex];
      return column && row ? column.accessor(row) : undefined;
    },
    [overlay, data, columnConfigById, rowIdentity],
  );

  // ── Selection: anchor (drag/shift-click origin) + focus (current cell). ─
  const [selection, setSelection] = useState<{ anchor: CellPosition; focus: CellPosition } | null>(
    rows.length > 0 && visibleColumns.length > 0 ? { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } } : null,
  );
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editSeedChar, setEditSeedChar] = useState<string | undefined>(undefined);
  const [fillPreview, setFillPreview] = useState<FillResult | null>(null);

  const isSelectingRef = useRef(false);
  const isFillDraggingRef = useRef(false);
  const fillSourceRef = useRef<CellRange | null>(null);

  const undoStackRef = useRef(new UndoStack<CellEdit<TRow>[]>(undoLimit));
  const historyEpoch = useRef(0);
  const traversalRunning = useRef(false);
  const traversalQueue = useRef<Array<{ epoch: number; run: () => Promise<void> }>>([]);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: scrollableColumns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => scrollableColumns[index]?.getSize() ?? DEFAULT_COLUMN_WIDTH,
    overscan: 4,
  });

  useEffect(() => {
    columnVirtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSizing]);

  const columnOffsets = useMemo(() => {
    let acc = 0;
    return scrollableColumns.map((col) => {
      const offset = acc;
      acc += col.getSize();
      return offset;
    });
  }, [scrollableColumns]);

  const totalScrollableWidth = columnOffsets.length > 0
    ? columnOffsets[columnOffsets.length - 1] + scrollableColumns[columnOffsets.length - 1].getSize()
    : 0;
  const totalWidth = frozenWidth + totalScrollableWidth;
  const totalHeight = headerHeight + rowVirtualizer.getTotalSize();

  const gridBounds: GridBounds = { minRow: 0, maxRow: Math.max(0, rows.length - 1), minCol: 0, maxCol: Math.max(0, visibleColumns.length - 1) };

  function cellRect(pos: CellPosition): { left: number; top: number; width: number; height: number } {
    const top = headerHeight + pos.row * rowHeight;
    if (frozenFirstColumn && pos.col === 0) {
      return { left: 0, top, width: frozenWidth, height: rowHeight };
    }
    const scrollIdx = pos.col - (frozenFirstColumn ? 1 : 0);
    const col = scrollableColumns[scrollIdx];
    const offset = columnOffsets[scrollIdx] ?? 0;
    return { left: frozenWidth + offset, top, width: col?.getSize() ?? DEFAULT_COLUMN_WIDTH, height: rowHeight };
  }

  function getCellPositionFromPoint(clientX: number, clientY: number): CellPosition | null {
    const el = scrollRef.current;
    if (!el || rows.length === 0 || visibleColumns.length === 0) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    const y = clientY - rect.top + el.scrollTop;
    const bodyY = y - headerHeight;
    if (bodyY < 0) return null;
    const rowIndex = Math.min(rows.length - 1, Math.max(0, Math.floor(bodyY / rowHeight)));

    let colIndex: number;
    if (frozenFirstColumn && x <= frozenWidth) {
      colIndex = 0;
    } else {
      const sx = x - frozenWidth;
      let idx = scrollableColumns.length - 1;
      for (let i = 0; i < columnOffsets.length; i += 1) {
        if (columnOffsets[i] > sx) {
          idx = i - 1;
          break;
        }
      }
      idx = Math.max(0, idx);
      colIndex = idx + (frozenFirstColumn ? 1 : 0);
    }
    return { row: rowIndex, col: Math.min(colIndex, visibleColumns.length - 1) };
  }

  function scrollCellIntoView(pos: CellPosition): void {
    rowVirtualizer.scrollToIndex(pos.row);
    const scrollIdx = pos.col - (frozenFirstColumn ? 1 : 0);
    if (scrollIdx >= 0) columnVirtualizer.scrollToIndex(scrollIdx);
  }

  // ── Mutation pipeline ---------------------------------------------------

  async function commitEdits(
    input: CellEdit<TRow>[],
    phase: DataGridErrorPhase,
    traversal?: { entry: UndoEntry<CellEdit<TRow>[]>; direction: 'undo' | 'redo' },
  ): Promise<void> {
    if (input.length === 0) return;
    if (!traversal) historyEpoch.current += 1;
    const owner = Symbol('cell mutation');
    let selected = input;
    // An undo must not persist a failed predecessor's draft while that predecessor
    // is still unresolved. Ordinary edits remain concurrent and optimistic.
    if (traversal) {
      const keyFor = (edit: CellEdit<TRow>) => overlayKey(edit.rowId ?? rowIdentity(edit.row, edit.rowIndex), edit.columnId);
      for (const edit of input) cellOwners.current.set(keyFor(edit), owner);
      historyOwners.current.set(traversal.entry, owner);
      await Promise.all(input.map((edit) => undoDependencies.current.get(edit)?.settled));
      selected = input.filter((edit) => cellOwners.current.get(keyFor(edit)) === owner);
      if (!selected.length) {
        undoStackRef.current.replace(traversal.entry);
        forceRender();
        return;
      }
    }
    const edits = selected.map((edit) => {
      const rowId = edit.rowId ?? rowIdentity(edit.row, edit.rowIndex);
      const current = currentRows.current.get(rowId);
      return { ...edit, rowId, rowIndex: current?.index ?? -1, row: current?.row ?? edit.row };
    });
    const keyOf = (edit: CellEdit<TRow>) => overlayKey(edit.rowId!, edit.columnId);
    const attemptVersions = edits.map((edit) => {
      const key = keyOf(edit);
      const latest = versions.current.get(key);
      const previous = latest && Object.is(versionValue(latest), edit.previousValue) ? latest : {
        value: edit.previousValue, failed: false, settled: Promise.resolve(), finish: () => {},
      };
      let finish!: () => void;
      const settled = new Promise<void>((resolve) => { finish = resolve; });
      const version: EditVersion = { value: edit.value, previous, failed: false, settled, finish };
      versions.current.set(key, version);
      cellOwners.current.set(key, owner);
      return version;
    });
    setOverlay((prev) => {
      const next = new Map(prev);
      for (const edit of edits) next.set(keyOf(edit), { value: edit.value, owner, pending: true });
      return next;
    });
    setRefusals((prev) => {
      const next = new Map(prev);
      for (const edit of edits) next.delete(keyOf(edit));
      return next;
    });
    const entry = traversal?.entry ?? {
      before: edits.map((e, index) => {
        const previous = attemptVersions[index].previous!;
        const inverse = { ...e, get value() { return versionValue(previous); }, previousValue: e.value };
        undoDependencies.current.set(inverse, previous);
        return inverse;
      }),
      after: edits,
    };
    if (!traversal) undoStackRef.current.push(entry);
    historyOwners.current.set(entry, owner);
    forceRender();
    const failures = new Map<string, string>();
    for (const edit of edits) {
      if (edit.rowIndex < 0) failures.set(keyOf(edit), 'This row is no longer available. Refresh before retrying.');
    }
    let cause: unknown;
    const available = edits.filter((edit) => edit.rowIndex >= 0);
    try {
      const result = available.length ? await onCellsEdited(available) : undefined;
      if (result) {
        const keys = new Set(available.map(keyOf));
        for (const failure of result.failures) {
          const key = overlayKey(failure.rowId, failure.columnId);
          if (!keys.has(key) || failures.has(key) || failure.status !== 'failed') {
            throw new Error('Invalid per-cell edit outcome. Refresh before retrying.');
          }
          failures.set(key, failure.message || 'Failed to save the edit.');
        }
      }
    } catch (err) {
      cause = err;
      const message = err instanceof Error ? err.message : 'Failed to save the edit.';
      for (const edit of available) failures.set(keyOf(edit), message);
    }
    edits.forEach((edit, index) => {
      const version = attemptVersions[index];
      version.failed = failures.has(keyOf(edit));
      if (version.failed) {
        // Collapse settled ancestry so repeated failures do not retain an unbounded chain.
        void version.previous!.settled.then(() => {
          version.value = versionValue(version.previous!);
          version.previous = undefined;
          version.finish();
        });
      } else {
        version.previous = undefined;
        version.finish();
      }
    });
    const owned = (edit: CellEdit<TRow>) => cellOwners.current.get(keyOf(edit)) === owner;
    const savedKeys = new Set(edits.filter((e) => (!traversal || owned(e)) && !failures.has(keyOf(e))).map(keyOf));
    const failedEdits = edits.filter((e) => owned(e) && failures.has(keyOf(e)));
    const failedKeys = new Set(failedEdits.map(keyOf));
    const subset = (keys: Set<string>): UndoEntry<CellEdit<TRow>[]> | undefined => keys.size ? {
      before: entry.before.filter((e) => keys.has(keyOf(e))),
      after: entry.after.filter((e) => keys.has(keyOf(e))),
    } : undefined;
    if (historyOwners.current.get(entry) === owner) {
      if (traversal) {
        undoStackRef.current.settle(entry, traversal.direction, subset(savedKeys), subset(failedKeys));
      } else {
        undoStackRef.current.replace(entry, subset(savedKeys));
      }
    }
    setOverlay((prev) => {
      const next = new Map(prev);
      for (const edit of edits) {
        const key = keyOf(edit);
        if (!owned(edit) || next.get(key)?.owner !== owner) continue;
        if (failures.has(key)) next.delete(key);
        else next.set(key, { value: edit.value, owner, pending: false });
      }
      return next;
    });
    setRefusals((prev) => {
      const next = new Map(prev);
      for (const edit of failedEdits) if (owned(edit)) next.set(keyOf(edit), failures.get(keyOf(edit))!);
      return next;
    });
    forceRender();
    // Each error contains only its failed cells; retry drafts belong to the host.
    for (const message of new Set(failedEdits.map((e) => failures.get(keyOf(e))!))) {
      onError({ message, cause, phase, edits: failedEdits.filter((e) => failures.get(keyOf(e)) === message) });
    }
  }

  function drainTraversals(): void {
    if (traversalRunning.current) return;
    const intent = traversalQueue.current.shift();
    if (!intent) return;
    if (intent.epoch !== historyEpoch.current) {
      drainTraversals();
      return;
    }
    traversalRunning.current = true;
    void intent.run().finally(() => {
      traversalRunning.current = false;
      drainTraversals();
    });
  }

  // Preserve the sequence of history operations. Overlay ownership can change
  // between normal edits, but two successful undos must each retain their redo.
  function enqueueTraversal(direction: 'undo' | 'redo'): void {
    traversalQueue.current.push({
      epoch: historyEpoch.current,
      run: async () => {
        const entry = undoStackRef.current.begin(direction);
        if (entry) await commitEdits(direction === 'undo' ? entry.before : entry.after, direction, {entry, direction});
      },
    });
    drainTraversals();
  }

  const handleUndo = (): void => enqueueTraversal('undo');
  const handleRedo = (): void => enqueueTraversal('redo');

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!selection) return;
    const range = normalizeRange(selection.anchor, selection.focus);
    const text = buildCopyText(range, (pos) => {
      const row = rows[pos.row];
      const column = visibleColumns[pos.col];
      if (!row || !column) return '';
      const config = columnConfigById.get(column.id);
      const value = getEffectiveValue(row.index, column.id);
      return config?.formatValue ? config.formatValue(value, data[row.index]) : formatCellValue(value, config?.dataType);
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      onError({ message: 'Could not write to the clipboard.', cause: err, phase: 'clipboard', edits: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, rows, visibleColumns, columnConfigById, getEffectiveValue, data, onError]);

  async function handleCut(): Promise<void> {
    await handleCopy();
    await handleClearSelection();
  }

  async function handleClearSelection(): Promise<void> {
    if (!selection) return;
    const range = normalizeRange(selection.anchor, selection.focus);
    const edits: CellEdit<TRow>[] = [];
    for (const pos of rangeToCells(range)) {
      const row = rows[pos.row];
      const column = visibleColumns[pos.col];
      if (!row || !column) continue;
      const config = columnConfigById.get(column.id);
      if (config?.editable === false) continue;
      const previousValue = getEffectiveValue(row.index, column.id);
      if (previousValue == null || previousValue === '') continue;
      edits.push({ rowIndex: row.index, columnId: column.id, previousValue, value: null, row: data[row.index] });
    }
    if (edits.length > 0) await commitEdits(edits, 'clear');
  }

  async function handlePaste(): Promise<void> {
    if (!selection) return;
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch (err) {
      onError({ message: 'Could not read from the clipboard.', cause: err, phase: 'clipboard', edits: [] });
      return;
    }
    const anchorPos: CellPosition = {
      row: Math.min(selection.anchor.row, selection.focus.row),
      col: Math.min(selection.anchor.col, selection.focus.col),
    };
    const rawEdits = buildPasteEdits(text, anchorPos, {
      maxRow: gridBounds.maxRow,
      maxCol: gridBounds.maxCol,
    });
    const currentSelection = normalizeRange(selection.anchor, selection.focus);
    const expanded = expandSingleCellPasteToSelection(rawEdits, currentSelection);

    const edits: CellEdit<TRow>[] = [];
    let maxRowSeen = anchorPos.row;
    let maxColSeen = anchorPos.col;
    for (const raw of expanded) {
      const row = rows[raw.row];
      const column = visibleColumns[raw.col];
      if (!row || !column) continue;
      const config = columnConfigById.get(column.id);
      if (config?.editable === false) continue;
      const parsed = config?.parseValue
        ? config.parseValue(raw.value, data[row.index])
        : parseCellValue(raw.value, config?.dataType);
      const previousValue = getEffectiveValue(row.index, column.id);
      edits.push({ rowIndex: row.index, columnId: column.id, previousValue, value: parsed, row: data[row.index] });
      maxRowSeen = Math.max(maxRowSeen, raw.row);
      maxColSeen = Math.max(maxColSeen, raw.col);
    }
    if (edits.length > 0) {
      await commitEdits(edits, 'paste');
      setSelection({ anchor: anchorPos, focus: { row: maxRowSeen, col: maxColSeen } });
    }
  }

  function applyFillResult(source: CellRange, result: FillResult): void {
    if (result.direction === 'none' || result.filledCells.length === 0) return;
    const edits: CellEdit<TRow>[] = [];
    for (const targetPos of result.filledCells) {
      const sourcePos = mapFillTargetToSource(targetPos, source, result.direction);
      const targetRow = rows[targetPos.row];
      const sourceRow = rows[sourcePos.row];
      const targetColumn = visibleColumns[targetPos.col];
      const sourceColumn = visibleColumns[sourcePos.col];
      if (!targetRow || !sourceRow || !targetColumn || !sourceColumn) continue;
      const config = columnConfigById.get(targetColumn.id);
      if (config?.editable === false) continue;
      const value = getEffectiveValue(sourceRow.index, sourceColumn.id);
      const previousValue = getEffectiveValue(targetRow.index, targetColumn.id);
      edits.push({ rowIndex: targetRow.index, columnId: targetColumn.id, previousValue, value, row: data[targetRow.index] });
    }
    if (edits.length > 0) {
      void commitEdits(edits, 'fill');
      setSelection({
        anchor: { row: result.range.startRow, col: result.range.startCol },
        focus: { row: result.range.endRow, col: result.range.endCol },
      });
    }
  }

  function handleFillDoubleClick(): void {
    if (!selection) return;
    const range = normalizeRange(selection.anchor, selection.focus);
    const adjacentColIndex = range.startCol > 0 ? range.startCol - 1 : range.endCol + 1;
    const adjacentColumn = visibleColumns[adjacentColIndex];
    if (!adjacentColumn) return;
    const extentRow = computeFillDownExtent({
      startRow: range.endRow,
      maxRow: gridBounds.maxRow,
      adjacentColHasValue: (r) => {
        const dataRow = rows[r]?.index;
        if (dataRow == null) return false;
        const val = getEffectiveValue(dataRow, adjacentColumn.id);
        return val != null && val !== '';
      },
    });
    if (extentRow <= range.endRow) return;
    const result = computeFillRange(range, { row: extentRow, col: range.endCol });
    applyFillResult(range, result);
  }

  // ── Global pointer listeners for drag-select and fill-drag. Registered
  // once; always dispatches through refs holding the LATEST closures so
  // there's no stale-state bug without re-subscribing on every render. ───
  const latestPointerMove = useRef<(e: PointerEvent) => void>(() => {});
  const latestPointerUp = useRef<(e: PointerEvent) => void>(() => {});

  latestPointerMove.current = (e: PointerEvent): void => {
    if (isSelectingRef.current) {
      const pos = getCellPositionFromPoint(e.clientX, e.clientY);
      if (pos) setSelection((prev) => (prev ? { anchor: prev.anchor, focus: pos } : prev));
    } else if (isFillDraggingRef.current && fillSourceRef.current) {
      const pos = getCellPositionFromPoint(e.clientX, e.clientY);
      if (pos) setFillPreview(computeFillRange(fillSourceRef.current, pos));
    }
  };

  latestPointerUp.current = (): void => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
    }
    if (isFillDraggingRef.current) {
      isFillDraggingRef.current = false;
      const source = fillSourceRef.current;
      fillSourceRef.current = null;
      if (source && fillPreview) applyFillResult(source, fillPreview);
      setFillPreview(null);
    }
  };

  useEffect(() => {
    const move = (e: PointerEvent): void => latestPointerMove.current(e);
    const up = (e: PointerEvent): void => latestPointerUp.current(e);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  // ── Cell interaction ------------------------------------------------

  /*
   * A linked column with no `renderEditor` must NEVER open a text editor.
   *
   * Falling back to free text is the single worst failure available here: the
   * cell looks editable, someone types a host name, and the row now holds a
   * string where every other row holds a reference — the exact divergence the
   * link exists to make unrepresentable. Refusing the edit is loud and
   * recoverable; a silent text box is neither.
   */
  function canEditColumn(columnId: string): boolean {
    const config = columnConfigById.get(columnId);
    if (!config) return false;
    /*
     * READ-ONLY BY DEFAULT. A column is editable only when it SAYS SO.
     *
     * Until 2.0.0 the test was `config.editable === false`, so a column that
     * simply did not mention `editable` was fully editable — typing, paste and
     * the fill handle all worked. Every list converted onto this grid became a
     * spreadsheet by omission, and nothing failed to announce it: the page
     * renders, the data is right, and a reader can quietly overwrite a record
     * from a screen that was only ever meant to display one.
     *
     * The estate has ~184 list surfaces still to convert. A default that has to
     * be remembered 184 times is a defect waiting on the one time it is not.
     * Measured before flipping: all 18 existing render sites already declare
     * `editable` on every column, so nothing depended on the old default.
     */
    if (config.editable !== true) return false;
    if (config.link && !config.renderEditor) {
      onError({
        message:
          `column "${columnId}" declares link entity "${config.link.entity}" but supplies no renderEditor. ` +
          'A linked cell must be edited through the app\'s own entity selector — the same one the form uses ' +
          '(select, or add new). Refusing rather than falling back to a text input, which would let a name be ' +
          'typed into one row while every other row holds a reference.',
        phase: 'edit',
        edits: [],
      });
      return false;
    }
    return true;
  }

  function beginEditing(pos: CellPosition, seedChar?: string): void {
    const column = visibleColumns[pos.col];
    if (!column) return;
    if (!canEditColumn(column.id)) return;
    setEditSeedChar(seedChar);
    setEditingCell(pos);
  }

  function handleEditorCommit(nextValue: unknown): void {
    const pos = editingCell;
    setEditingCell(null);
    setEditSeedChar(undefined);
    if (!pos) return;
    const row = rows[pos.row];
    const column = visibleColumns[pos.col];
    if (!row || !column) return;
    const previousValue = getEffectiveValue(row.index, column.id);
    if (Object.is(previousValue, nextValue)) return;

    /*
     * A LINKED cell stores a REFERENCE, so committing it re-points this row at
     * a different record. It never writes a name.
     *
     * The value arriving from the editor is a record id, because the editor
     * for a linked column is a picker over `options` and free text is refused.
     * That refusal is the whole one-shot mechanism: a host name cannot be
     * mistyped into a row, so two rows cannot hold different spellings of the
     * same host, and correcting the host's name is done once on the record
     * that owns it — every row follows because every row only ever held a
     * pointer.
     */
    const config = columnConfigById.get(column.id);
    if (config?.link) {
      void commitLinkEdit({
        entity: config.link.entity,
        columnId: column.id,
        rowIndex: row.index,
        row: data[row.index],
        previousRefId: config.link.refId(data[row.index]),
        refId: nextValue === null || nextValue === undefined ? null : String(nextValue),
      });
      return;
    }

    void commitEdits(
      [{ rowIndex: row.index, columnId: column.id, previousValue, value: nextValue, row: data[row.index] }],
      'edit',
    );
  }

  /*
   * Persist a re-link, optimistically showing it first.
   *
   * A single row changes, because a link lives on the row. The referenced
   * record is untouched — editing IT is the job of the surface that owns it,
   * which is exactly why one correction there reaches every row here without
   * this package propagating anything.
   */
  async function commitLinkEdit(edit: LinkEdit<TRow>): Promise<void> {
    const key = overlayKey(rowIdentity(edit.row, edit.rowIndex), edit.columnId);
    const owner = Symbol('link mutation');
    cellOwners.current.set(key, owner);
    setOverlay((prev) => {
      const next = new Map(prev);
      next.set(key, { value: edit.refId, owner, pending: true });
      return next;
    });
    try {
      if (!onLinkEdit) {
        throw new Error(
          `column "${edit.columnId}" declares link entity "${edit.entity}" but no onLinkEdit handler was supplied`,
        );
      }
      await onLinkEdit(edit);
      setOverlay((prev) => {
        if (cellOwners.current.get(key) !== owner || prev.get(key)?.owner !== owner) return prev;
        const next = new Map(prev);
        next.set(key, { value: edit.refId, owner, pending: false });
        return next;
      });
    } catch (err) {
      if (cellOwners.current.get(key) !== owner) return;
      setOverlay((prev) => {
        const next = new Map(prev);
        if (next.get(key)?.owner === owner) next.delete(key);
        return next;
      });
      onError({
        message: err instanceof Error ? err.message : String(err),
        cause: err,
        phase: 'edit',
        edits: [
          {
            rowIndex: edit.rowIndex,
            columnId: edit.columnId,
            previousValue: edit.previousRefId,
            value: edit.refId,
            row: edit.row,
          },
        ],
      });
    }
  }

  function handleEditorCancel(): void {
    setEditingCell(null);
    setEditSeedChar(undefined);
  }

  function handleCellMouseDown(pos: CellPosition, e: ReactMouseEvent<HTMLDivElement>): void {
    if (e.button !== 0) return;
    // The active editor owns its own uncommitted text in local state and
    // commits it on blur (see TextEditor/NumberEditor/etc). A plain <div>
    // cell doesn't steal focus on mousedown, so the editor's <input> would
    // otherwise stay focused while the selection moves under it — blur it
    // explicitly so its onBlur commit fires before we move on.
    if (editingCell && (editingCell.row !== pos.row || editingCell.col !== pos.col)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    if (e.shiftKey && selection) {
      setSelection({ anchor: selection.anchor, focus: pos });
    } else {
      setSelection({ anchor: pos, focus: pos });
      isSelectingRef.current = true;
    }
  }

  function handleCellMouseEnter(pos: CellPosition): void {
    if (isSelectingRef.current) {
      setSelection((prev) => (prev ? { anchor: prev.anchor, focus: pos } : prev));
    }
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (editingCell) return; // the active editor owns its own key handling

    if (!selection) return;
    const focusCell = selection.focus;
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    const isEmptyCell = (pos: CellPosition): boolean => {
      const dataRow = rows[pos.row]?.index;
      const column = visibleColumns[pos.col];
      if (dataRow == null || !column) return true;
      const val = getEffectiveValue(dataRow, column.id);
      return val == null || val === '';
    };

    if (ctrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (ctrlOrCmd && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      handleRedo();
      return;
    }
    if (ctrlOrCmd && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      void handleCopy();
      return;
    }
    if (ctrlOrCmd && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      void handleCut();
      return;
    }
    if (ctrlOrCmd && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      void handlePaste();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = moveFocus(focusCell, e.key, gridBounds, { ctrlOrCmd, isEmpty: isEmptyCell });
      setSelection(e.shiftKey ? { anchor: selection.anchor, focus: next } : { anchor: next, focus: next });
      scrollCellIntoView(next);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const next = moveTab(focusCell, gridBounds, e.shiftKey);
      setSelection({ anchor: next, focus: next });
      scrollCellIntoView(next);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const next = moveEnter(focusCell, gridBounds, e.shiftKey);
      setSelection({ anchor: next, focus: next });
      scrollCellIntoView(next);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      void handleClearSelection();
      return;
    }

    if (isPrintableEditTrigger(e)) {
      // We're taking over this keystroke to seed the new editor's value
      // (see TextEditor's `initialInputChar`) — prevent the default so
      // nothing else (browser find-as-you-type, a testing harness's own
      // input simulation) also acts on the same keypress.
      e.preventDefault();
      beginEditing(focusCell, e.key);
    }
  }

  function handleColumnDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex <= 0 || newIndex <= 0) return prev; // the frozen column (index 0) never moves
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useImperativeHandle(
    ref,
    () => ({
      undo: handleUndo,
      redo: handleRedo,
      canUndo: () => undoStackRef.current.canUndo(),
      canRedo: () => undoStackRef.current.canRedo(),
      getSelection: () => (selection ? normalizeRange(selection.anchor, selection.focus) : null),
      getFocusedCell: () => (selection ? selection.focus : null),
      copySelection: handleCopy,
    }),
    [handleUndo, handleRedo, selection, handleCopy],
  );

  const normalizedSelection = selection ? normalizeRange(selection.anchor, selection.focus) : null;
  const previewRange = fillPreview && fillPreview.direction !== 'none' ? fillPreview.range : null;

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  const style: CSSProperties = { height };

  if (rows.length === 0 && emptyState) {
    return (
      <div className={cn('flex items-center justify-center rounded-md border border-border bg-background', className)} style={style}>
        {emptyState}
      </div>
    );
  }

  return (
    <DndContext sensors={dndSensors} onDragEnd={handleColumnDragEnd}>
      <div
        ref={scrollRef}
        /*
         * `grid` PROMISES an interactive, editable widget; `table` is a static
         * one. Since 2.0.0 a column is read-only unless it says otherwise, so a
         * grid with nothing editable was announcing an interaction the reader
         * does not have — a screen reader offers cell-edit affordances that go
         * nowhere.
         *
         * The role now follows the truth: editable anywhere -> grid, otherwise
         * table.
         */
        role={columns.some((c) => c.editable === true) ? 'grid' : 'table'}
        aria-label={ariaLabel}
        aria-rowcount={rows.length}
        aria-colcount={visibleColumns.length}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative overflow-auto rounded-md border border-border bg-background outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className,
        )}
        style={style}
      >
        <div style={{ position: 'relative', height: totalHeight, width: Math.max(totalWidth, 1) }}>
          {/* Sticky header */}
          <div
            role="row"
            className="sticky top-0 z-20 flex border-b border-border bg-card"
            style={{ height: headerHeight, width: totalWidth }}
          >
            <SortableContext items={scrollableColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {frozenColumn && (() => {
                const frozenHeader = headerCells.find((h) => h.column.id === frozenColumn.id);
                return frozenHeader ? (
                  <ColumnHeaderCell
                    header={frozenHeader}
                    frozen
                    style={{ position: 'sticky', left: 0, zIndex: 30, width: frozenWidth, height: headerHeight }}
                  />
                ) : null;
              })()}
              {virtualColumns.map((vc) => {
                const column = scrollableColumns[vc.index];
                const header = headerCells.find((h) => h.column.id === column.id);
                if (!header) return null;
                return (
                  <ColumnHeaderCell
                    key={column.id}
                    header={header}
                    style={{
                      position: 'absolute',
                      left: frozenWidth + vc.start,
                      top: 0,
                      width: vc.size,
                      height: headerHeight,
                    }}
                  />
                );
              })}
            </SortableContext>
          </div>

          {/* Body rows */}
          {virtualRows.map((vr) => {
            const row = rows[vr.index];
            const rowTop = headerHeight + vr.start;

            /*
             * A GROUP HEADER is a different thing from a row of data, and drawing it
             * as one is how a grouped grid becomes unreadable: the heading lines up
             * under the first column, every other column is blank, and a heading is
             * indistinguishable from an empty record.
             *
             * So it spans the full width, carries its own count, and is NOT clickable
             * as a record — there is no record behind it.
             */
            if (row.getIsGrouped()) {
              const groupColumn = columns.find((c) => c.id === row.groupingColumnId);
              const rawValue = row.getGroupingValue(String(row.groupingColumnId));
              const shown = groupColumn?.formatValue
                ? groupColumn.formatValue(rawValue, row.original)
                : formatCellValue(rawValue, groupColumn?.dataType);
              const isExpanded = row.getIsExpanded();
              const label = String(shown ?? '') || '(none)';
              return (
                <div
                  key={row.id}
                  role="row"
                  aria-expanded={isExpanded}
                  className="absolute left-0 z-10 flex items-center gap-2 border-b border-border bg-muted/60 px-3 text-sm font-medium"
                  style={{ top: rowTop, width: totalWidth, height: vr.size }}
                >
                  <button
                    type="button"
                    onClick={row.getToggleExpandedHandler()}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
                  >
                    <span aria-hidden className="text-xs">{isExpanded ? '\u25be' : '\u25b8'}</span>
                  </button>
                  <span className="truncate">
                    {groupColumn?.header ? `${groupColumn.header}: ` : ''}
                    {label}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {row.subRows.length} {row.subRows.length === 1 ? 'row' : 'rows'}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={row.id}
                role="row"
                /*
                 * The REAL record id, published for cell-to-cell navigation and for
                 * anything outside the grid that needs to address a row.
                 *
                 * `getRowId` is the caller's resolver precisely so this is never an array
                 * index: an index LOOKS like an identifier, addresses the wrong record the
                 * moment the data is sorted, grouped or filtered, and gives no sign it has
                 * done so.
                 *
                 * Group headers deliberately do NOT carry one — there is no record behind
                 * a heading.
                 */
                data-row-id={getRowId ? getRowId(row.original, row.index) : String(row.index)}
                className={cn('absolute left-0 flex', onRowClick && 'cursor-pointer hover:bg-muted/40')}
                style={{ top: rowTop, width: totalWidth, height: vr.size }}
                /*
                 * A row opens its record, WITHOUT stealing the spreadsheet's
                 * own click behaviour.
                 *
                 * Skipped when: a cell is being edited (the click is going to
                 * an input), the click carries a modifier (ctrl/cmd/shift
                 * already mean "extend the selection"), or the reader has
                 * dragged out a multi-cell range (they were selecting, not
                 * navigating). Without those guards this handler would fire on
                 * every range-select and make the grid unusable as a grid.
                 */
                onClick={(event) => {
                  if (!onRowClick) return;
                  if (editingCell) return;
                  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                  if (normalizedSelection) {
                    const multiCell =
                      normalizedSelection.startRow !== normalizedSelection.endRow ||
                      normalizedSelection.startCol !== normalizedSelection.endCol;
                    if (multiCell) return;
                  }
                  onRowClick(row.original, row.index);
                }}
                onKeyDown={(event) => {
                  // Keyboard parity: a row you can click is a row you can open
                  // from the keyboard. Enter is already the grid's "edit" key
                  // on an editable cell, so this only fires when nothing is
                  // being edited.
                  if (!onRowClick || editingCell) return;
                  if (event.key === 'Enter' && !event.shiftKey) onRowClick(row.original, row.index);
                }}
              >
                {frozenColumn && (
                  <GridCellRenderer
                    gridRow={vr.index}
                    gridCol={0}
                    frozen
                    style={{ position: 'sticky', left: 0, zIndex: 10, width: frozenWidth, height: vr.size }}
                    column={columnConfigById.get(frozenColumn.id)!}
                    row={row.original}
                    refusal={refusals.get(overlayKey(row.id, frozenColumn.id))}
                    rowId={getRowId ? getRowId(row.original, row.index) : String(row.index)}
                    editable={canEditColumn(frozenColumn.id)}
                    rowIndex={row.index}
                    value={getEffectiveValue(row.index, frozenColumn.id)}
                    isSelected={Boolean(normalizedSelection && isCellInRange({ row: vr.index, col: 0 }, normalizedSelection))}
                    isActive={Boolean(selection && selection.focus.row === vr.index && selection.focus.col === 0)}
                    isEditing={Boolean(editingCell && editingCell.row === vr.index && editingCell.col === 0)}
                    editSeedChar={editSeedChar}
                    onCommit={handleEditorCommit}
                    onCancel={handleEditorCancel}
                    onMouseDown={(e) => handleCellMouseDown({ row: vr.index, col: 0 }, e)}
                    onMouseEnter={() => handleCellMouseEnter({ row: vr.index, col: 0 })}
                    onDoubleClick={() => beginEditing({ row: vr.index, col: 0 })}
                  />
                )}
                {virtualColumns.map((vc) => {
                  const column = scrollableColumns[vc.index];
                  const gridCol = vc.index + (frozenFirstColumn ? 1 : 0);
                  const config = columnConfigById.get(column.id);
                  if (!config) return null;
                  return (
                    <GridCellRenderer
                      key={column.id}
                      gridRow={vr.index}
                      gridCol={gridCol}
                      style={{ position: 'absolute', left: frozenWidth + vc.start, top: 0, width: vc.size, height: vr.size }}
                      column={config}
                      row={row.original}
                      refusal={refusals.get(overlayKey(row.id, config.id))}
                    rowId={getRowId ? getRowId(row.original, row.index) : String(row.index)}
                    editable={canEditColumn(config.id)}
                    rowIndex={row.index}
                      value={getEffectiveValue(row.index, column.id)}
                      isSelected={Boolean(normalizedSelection && isCellInRange({ row: vr.index, col: gridCol }, normalizedSelection))}
                      isActive={Boolean(selection && selection.focus.row === vr.index && selection.focus.col === gridCol)}
                      isEditing={Boolean(editingCell && editingCell.row === vr.index && editingCell.col === gridCol)}
                      editSeedChar={editSeedChar}
                      onCommit={handleEditorCommit}
                      onCancel={handleEditorCancel}
                      onMouseDown={(e) => handleCellMouseDown({ row: vr.index, col: gridCol }, e)}
                      onMouseEnter={() => handleCellMouseEnter({ row: vr.index, col: gridCol })}
                      onDoubleClick={() => beginEditing({ row: vr.index, col: gridCol })}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Selection border overlay + fill handle */}
          {normalizedSelection && !editingCell && (
            <SelectionOverlay
              range={previewRange ?? normalizedSelection}
              isPreview={Boolean(previewRange)}
              cellRect={cellRect}
              onFillPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                isFillDraggingRef.current = true;
                fillSourceRef.current = normalizedSelection;
              }}
              onFillDoubleClick={handleFillDoubleClick}
            />
          )}
        </div>
      </div>
    </DndContext>
  );
}

interface GridCellRendererProps<TRow> {
  gridRow: number;
  gridCol: number;
  frozen?: boolean;
  style: CSSProperties;
  column: DataGridColumn<TRow>;
  row: TRow;
  rowIndex: number;
  value: unknown;
  isSelected: boolean;
  isActive: boolean;
  isEditing: boolean;
  editSeedChar?: string;
  /** Refusal message for this cell, if its last edit was rejected. */
  refusal?: string;
  rowId?: string;
  editable?: boolean;
  onCommit: (nextValue: unknown) => void;
  onCancel: () => void;
  onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onMouseEnter: () => void;
  onDoubleClick: () => void;
}

function GridCellRenderer<TRow>(cellProps: GridCellRendererProps<TRow>): ReactElement {
  const { column, row, rowIndex, value, ...rest } = cellProps;
  const Editor = editorFor(column);
  const content = column.renderCell
    ? column.renderCell({ value, row, rowIndex, column })
    : column.dataType === 'boolean'
      ? (
          <input type="checkbox" checked={Boolean(value)} readOnly disabled className="h-4 w-4 accent-primary disabled:opacity-100" />
        )
      : column.formatValue
        ? column.formatValue(value, row)
        : formatCellValue(value, column.dataType);

  return (
    <GridCell
      {...rest}
      column={column}
      row={row}
      rowIndex={rowIndex}
      value={value}
      content={content}
      Editor={Editor}
    />
  );
}

interface SelectionOverlayProps {
  range: CellRange;
  isPreview: boolean;
  cellRect: (pos: CellPosition) => { left: number; top: number; width: number; height: number };
  onFillPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onFillDoubleClick: () => void;
}

function SelectionOverlay(props: SelectionOverlayProps): ReactElement {
  const { range, isPreview, cellRect, onFillPointerDown, onFillDoubleClick } = props;
  const topLeft = cellRect({ row: range.startRow, col: range.startCol });
  const bottomRight = cellRect({ row: range.endRow, col: range.endCol });
  const left = topLeft.left;
  const top = topLeft.top;
  const width = bottomRight.left + bottomRight.width - topLeft.left;
  const height = bottomRight.top + bottomRight.height - topLeft.top;

  return (
    <>
      <div
        aria-hidden
        className={cn('pointer-events-none absolute border-2 border-primary', isPreview && 'border-dashed opacity-70')}
        style={{ left, top, width, height, zIndex: 25 }}
      />
      {!isPreview && (
        <FillHandle
          left={left + width}
          top={top + height}
          onPointerDown={onFillPointerDown}
          onDoubleClick={onFillDoubleClick}
        />
      )}
    </>
  );
}

export const DataGrid = forwardRef(DataGridInner) as <TRow extends RowData>(
  props: DataGridProps<TRow> & { ref?: React.Ref<DataGridHandle> },
) => ReactElement;
