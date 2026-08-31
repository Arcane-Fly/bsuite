import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { Header } from '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';
import type { GridFeatures } from '../tableFeatures';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../cn.js';

export interface ColumnHeaderCellProps<TRow extends RowData> {
  header: Header<GridFeatures, TRow, unknown>;
  style: CSSProperties;
  frozen?: boolean;
  className?: string;
}

/**
 * WCAG 1.4.3 — the drag handle is CONTENT TEXT on a functional control, so it
 * carries the 4.5:1 normal-text floor, not the 3:1 large-text one.
 *
 * It used to be `text-text-subtle`, which @bsuite/theme's own source documents as
 * AA-large-only against the measured table in `src/css/vars.css`:
 *
 *     --light-text-subtle   3.52:1   AA large only (3:1)  —  FAILS AA normal
 *     --dark-text-subtle    4.14:1   AA large only        —  FAILS AA normal
 *     --light-text-muted    4.92:1   AA normal
 *     --dark-text-muted     6.69:1   AA normal
 *
 * The cell renders at `text-xs`, so the glyph is normal-size text by WCAG's
 * definition, and the handle is the only pointer affordance for reordering a
 * column — it is not decoration. `text-muted` is the lowest tier that clears
 * 4.5:1 in BOTH themes, so it is the smallest change that is actually correct.
 * Hover stays `text-secondary`, so reaching for it still brightens.
 *
 * The two remaining `text-subtle` uses in this monorepo are both
 * `placeholder:text-text-subtle` in @bsuite/schema-builder. Those are left alone
 * deliberately: the token's declared purpose IS placeholders (the dark scale says
 * so inline), and whether placeholder text must clear 4.5:1 is a brand decision
 * about the token, not a defect in a consumer of it.
 */
const DRAG_HANDLE_CLASS =
  'cursor-grab touch-none text-text-muted hover:text-text-secondary active:cursor-grabbing';

/**
 * A single sticky-header cell: sort-on-click label, a drag handle wired to
 * @dnd-kit/sortable for column reorder (the monorepo already depends on
 * @dnd-kit via packages/page-builder — reused here rather than adding a
 * second DnD implementation), and a resize handle wired to react-table's
 * own built-in column-resize API (plain pointer events under the hood,
 * no extra dependency).
 */
export function ColumnHeaderCell<TRow extends RowData>(props: ColumnHeaderCellProps<TRow>): React.ReactElement {
  const { header, style, frozen, className } = props;
  const column = header.column;
  const sortDirection = column.getIsSorted();
  const canSort = column.getCanSort();

  const sortable = useSortable({ id: column.id, disabled: frozen });
  const dragStyle: CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  const resizeHandler = header.getResizeHandler();
  const stopPropagation = (e: ReactPointerEvent): void => e.stopPropagation();

  return (
    <div
      ref={frozen ? undefined : sortable.setNodeRef}
      role="columnheader"
      aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'}
      style={{ ...style, ...(frozen ? {} : dragStyle) }}
      className={cn(
        'group relative flex select-none items-center gap-1 border-r border-border bg-card px-2 text-xs font-medium text-text-secondary',
        sortable.isDragging && 'z-30 opacity-70',
        className,
      )}
    >
      {!frozen && (
        <button
          type="button"
          aria-label={`Reorder column ${header.isPlaceholder ? '' : String(column.columnDef.header)}`}
          className={DRAG_HANDLE_CLASS}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          ⠿
        </button>
      )}
      <button
        type="button"
        disabled={!canSort}
        onClick={() => column.toggleSorting(undefined, false)}
        className="min-w-0 flex-1 truncate text-left disabled:cursor-default"
        title={typeof column.columnDef.header === 'string' ? column.columnDef.header : undefined}
      >
        {typeof column.columnDef.header === 'string' ? column.columnDef.header : header.id}
      </button>
      {sortDirection === 'asc' && <span aria-hidden>▲</span>}
      {sortDirection === 'desc' && <span aria-hidden>▼</span>}
      {!header.isPlaceholder && (
        <div
          onPointerDown={(e) => {
            stopPropagation(e);
            resizeHandler(e);
          }}
          onDoubleClick={() => column.resetSize()}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none bg-transparent hover:bg-primary/40 data-[resizing=true]:bg-primary"
          data-resizing={column.getIsResizing()}
        />
      )}
    </div>
  );
}
