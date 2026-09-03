/*
 * DataGridToolbar — the reader's controls for a list.
 *
 * The grid gained filtering, column visibility and an adjustable row height as
 * PROPS. Props are not a capability: a reader cannot pass a prop. Precedent
 * 20260824__zero_consumer_is_not_done — "a package, token, hook, RPC,
 * component, column or endpoint shipping with ZERO CONSUMERS is NOT done" —
 * so the controls ship with the surface that reaches them.
 *
 * WHY A SEPARATE COMPONENT rather than baked into DataGrid: a page already
 * owns a header, and several already have their own search box. Forcing a
 * second toolbar inside the grid would put two search inputs on the same
 * screen. This one is opt-in and composable, and a page that already has a
 * filter can wire `globalFilter` straight to its own input instead.
 *
 * Every control is CONTROLLED. The page owns the state, so it can persist the
 * reader's choice per user and per surface — which is what "on users
 * preference" requires. An uncontrolled toolbar would reset on every reload
 * and be a demo rather than a preference.
 */
import { useId, useState, type ReactNode } from 'react';
import { cn } from '../cn.js';
import type { DataGridColumn } from '../types.js';

/**
 * Row heights, named for what the reader is trying to do rather than in px.
 *
 * "Nothing vertically truncated" is the operator's requirement, and it is a
 * property of the CONTENT, not a number — a cell holding a wrapped address
 * needs a taller row than one holding a date. Naming the steps lets the reader
 * pick by intent; the px values are an implementation detail they never see.
 */
export const ROW_HEIGHTS = {
  compact: 32,
  comfortable: 48,
  tall: 72,
  'extra tall': 112,
} as const;

export type RowHeightName = keyof typeof ROW_HEIGHTS;

export function rowHeightNameFor(px: number): RowHeightName {
  const entries = Object.entries(ROW_HEIGHTS) as [RowHeightName, number][];
  // Nearest named step, so a persisted value from an older release still maps.
  return entries.reduce((best, [name, value]) =>
    Math.abs(value - px) < Math.abs(ROW_HEIGHTS[best] - px) ? name : best,
  entries[0][0]);
}

export interface DataGridToolbarProps<TRow> {
  columns: DataGridColumn<TRow>[];
  /** Free-text filter. Matches the FORMATTED value of visible columns. */
  filter: string;
  onFilterChange: (next: string) => void;
  /** Column id -> shown. Absent id = shown. */
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (next: Record<string, boolean>) => void;
  rowHeight: number;
  onRowHeightChange: (next: number) => void;
  /** Row count AFTER filtering, so the reader can see the filter working. */
  visibleRowCount?: number;
  totalRowCount?: number;
  /** Anything the page wants on the same line — a "New" button, usually. */
  children?: ReactNode;
  className?: string;
}

export function DataGridToolbar<TRow>({
  columns,
  filter,
  onFilterChange,
  columnVisibility,
  onColumnVisibilityChange,
  rowHeight,
  onRowHeightChange,
  visibleRowCount,
  totalRowCount,
  children,
  className,
}: DataGridToolbarProps<TRow>) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const filterId = useId();
  const panelId = useId();

  const hiddenCount = columns.filter((c) => columnVisibility[c.id] === false).length;
  const filtering = filter.trim().length > 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2 pb-2', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={filterId} className="sr-only">
          Filter rows
        </label>
        <input
          id={filterId}
          type="search"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter…"
          className="h-8 w-48 rounded-md border border-border-interactive bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {/*
         * Say what the filter DID. A filter that silently removes rows leaves
         * the reader unable to tell "no matches" from "no data" — the same
         * class of defect as a gate that cannot distinguish clean from
         * never-looked-at.
         */}
        {filtering && visibleRowCount !== undefined && totalRowCount !== undefined && (
          <output className="text-sm text-muted-foreground" aria-live="polite">
            {visibleRowCount} of {totalRowCount}
          </output>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-expanded={columnsOpen}
          aria-controls={panelId}
          onClick={() => setColumnsOpen((o) => !o)}
          className="h-8 rounded-md border border-border-interactive px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Name what is hidden, not just "Columns" — otherwise a reader who
              hid a column has no cue that the list is showing them less than
              it has. */}
          {hiddenCount > 0 ? `Columns (${hiddenCount} hidden)` : 'Columns'}
        </button>
        {columnsOpen && (
          <div
            id={panelId}
            role="group"
            aria-label="Choose columns"
            className="absolute z-50 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-border bg-card p-2 shadow-lg"
          >
            {columns.map((col) => {
              const shown = columnVisibility[col.id] !== false;
              const isLast = shown && columns.filter((c) => columnVisibility[c.id] !== false).length === 1;
              return (
                <label
                  key={col.id}
                  className={cn(
                    'flex items-center gap-2 rounded px-1 py-1 text-sm',
                    isLast ? 'opacity-50' : 'cursor-pointer hover:bg-muted',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={shown}
                    /*
                     * The last visible column cannot be hidden. An empty grid
                     * is not a preference, it is a dead end the reader has to
                     * guess their way out of.
                     *
                     * GUARDED TWICE, deliberately. `disabled` is a UI hint,
                     * not an enforcement: a click dispatched around it — by a
                     * test, a script, or a browser quirk — still reached this
                     * handler and produced `{host: false, started: false}`,
                     * hiding every column. Measured, not theorised: that is
                     * exactly how the first version of this failed its own
                     * test. The state change is refused where the state is
                     * actually written.
                     */
                    disabled={isLast}
                    onChange={(e) => {
                      if (isLast && !e.target.checked) return;
                      onColumnVisibilityChange({ ...columnVisibility, [col.id]: e.target.checked });
                    }}
                  />
                  <span>{col.header}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <label className="flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground">Rows</span>
        <select
          value={rowHeightNameFor(rowHeight)}
          onChange={(e) => onRowHeightChange(ROW_HEIGHTS[e.target.value as RowHeightName])}
          aria-label="Row height"
          className="h-8 rounded-md border border-border-interactive bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {(Object.keys(ROW_HEIGHTS) as RowHeightName[]).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      {children}
    </div>
  );
}
