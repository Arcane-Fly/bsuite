import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { cn } from '../cn.js';
import type { CellEditorProps, DataGridColumn } from '../types.js';

export interface GridCellProps<TRow> {
  style: CSSProperties;
  column: DataGridColumn<TRow>;
  row: TRow;
  rowIndex: number;
  value: unknown;
  isSelected: boolean;
  isActive: boolean;
  isEditing: boolean;
  editSeedChar?: string;
  frozen?: boolean;
  content: ReactNode;
  Editor: (props: CellEditorProps<TRow>) => ReactNode;
  onCommit: (nextValue: unknown) => void;
  onCancel: () => void;
  onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onMouseEnter: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
}

/** One data cell — either the read-only rendered value, or (when
 * `isEditing`) the column's typed inline editor. */
export function GridCell<TRow>(props: GridCellProps<TRow>): React.ReactElement {
  const {
    style,
    column,
    row,
    rowIndex,
    value,
    isSelected,
    isActive,
    isEditing,
    editSeedChar,
    frozen,
    content,
    Editor,
    onCommit,
    onCancel,
    onMouseDown,
    onMouseEnter,
    onDoubleClick,
  } = props;

  return (
    <div
      role="gridcell"
      aria-selected={isSelected}
      style={style}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onDoubleClick={onDoubleClick}
      className={cn(
        'flex items-center overflow-hidden border-r border-b border-border text-sm text-foreground',
        frozen ? 'sticky left-0 z-10 bg-card font-medium' : 'bg-background',
        isSelected && !frozen && 'bg-primary/10',
        isSelected && frozen && 'bg-primary/15',
        isActive && 'ring-2 ring-inset ring-primary',
        column.dataType === 'number' && !isEditing && 'justify-end',
      )}
    >
      {isEditing ? (
        <Editor
          value={value}
          row={row}
          rowIndex={rowIndex}
          column={column}
          initialInputChar={editSeedChar}
          onCommit={onCommit}
          onCancel={onCancel}
        />
      ) : (
        <div className={cn('w-full truncate px-2', column.dataType === 'number' && 'text-right')}>{content}</div>
      )}
    </div>
  );
}
