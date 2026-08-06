import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

export interface FillHandleProps {
  left: number;
  top: number;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
}

/** The small square at the bottom-right of a selection — drag to fill a
 * range, double-click to fill down to the extent of adjacent data. */
export function FillHandle(props: FillHandleProps): React.ReactElement {
  const { left, top, onPointerDown, onDoubleClick } = props;
  const style: CSSProperties = {
    position: 'absolute',
    left: left - 4,
    top: top - 4,
    width: 8,
    height: 8,
    zIndex: 40,
  };
  return (
    <div
      role="button"
      aria-label="Fill handle — drag to fill, double-click to fill down"
      tabIndex={-1}
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className="cursor-crosshair rounded-[1px] border border-bg-body bg-primary"
    />
  );
}
