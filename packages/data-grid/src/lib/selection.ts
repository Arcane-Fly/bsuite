/**
 * Cell-range selection maths — pure, no DOM/React. A selection is tracked
 * as an anchor (where the drag/shift-click started) + a focus (where the
 * pointer/keyboard currently is); this module normalizes that pair into an
 * ordered rectangle and answers containment/enumeration questions over it.
 */

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export function normalizeRange(anchor: CellPosition, focus: CellPosition): CellRange {
  return {
    startRow: Math.min(anchor.row, focus.row),
    endRow: Math.max(anchor.row, focus.row),
    startCol: Math.min(anchor.col, focus.col),
    endCol: Math.max(anchor.col, focus.col),
  };
}

export function clampRange(range: CellRange, maxRow: number, maxCol: number): CellRange {
  const clamp = (v: number, max: number): number => Math.max(0, Math.min(v, max));
  return {
    startRow: clamp(range.startRow, maxRow),
    endRow: clamp(range.endRow, maxRow),
    startCol: clamp(range.startCol, maxCol),
    endCol: clamp(range.endCol, maxCol),
  };
}

export function isCellInRange(pos: CellPosition, range: CellRange): boolean {
  return (
    pos.row >= range.startRow &&
    pos.row <= range.endRow &&
    pos.col >= range.startCol &&
    pos.col <= range.endCol
  );
}

export function rangeRowCount(range: CellRange): number {
  return range.endRow - range.startRow + 1;
}

export function rangeColCount(range: CellRange): number {
  return range.endCol - range.startCol + 1;
}

export function rangeToCells(range: CellRange): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let r = range.startRow; r <= range.endRow; r += 1) {
    for (let c = range.startCol; c <= range.endCol; c += 1) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export function rangesEqual(a: CellRange, b: CellRange): boolean {
  return (
    a.startRow === b.startRow &&
    a.endRow === b.endRow &&
    a.startCol === b.startCol &&
    a.endCol === b.endCol
  );
}

export function singleCellRange(pos: CellPosition): CellRange {
  return { startRow: pos.row, endRow: pos.row, startCol: pos.col, endCol: pos.col };
}

export function isSingleCell(range: CellRange): boolean {
  return range.startRow === range.endRow && range.startCol === range.endCol;
}
