import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { Header } from '@tanstack/react-table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../cn.js';

export interface ColumnHeaderCellProps<TRow> {
  header: Header<TRow, unknown>;
  style: CSSProperties;
  frozen?: boolean;
  className?: string;
}

/**
 * A single sticky-header cell: sort-on-click label, a drag handle wired to
 * @dnd-kit/sortable for column reorder (the monorepo already depends on
 * @dnd-kit via packages/page-builder — reused here rather than adding a
 * second DnD implementation), and a resize handle wired to react-table's
 * own built-in column-resize API (plain pointer events under the hood,
 * no extra dependency).
 */
export function ColumnHeaderCell<TRow>(props: ColumnHeaderCellProps<TRow>): React.ReactElement {
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
          className="cursor-grab touch-none text-text-subtle hover:text-text-secondary active:cursor-grabbing"
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
