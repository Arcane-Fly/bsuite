import type { CellPosition, CellRange } from './selection.js';
import { isCellInRange, rangeColCount, rangeRowCount, rangeToCells } from './selection.js';

export type FillDirection = 'down' | 'up' | 'left' | 'right' | 'none';

export interface FillResult {
  /** The full range after the fill (source ∪ newly-filled cells). */
  range: CellRange;
  direction: FillDirection;
  /** Cells newly covered by the fill — excludes the original source range. */
  filledCells: CellPosition[];
}

/**
 * Excel's fill handle only ever extends along ONE axis, even when the
 * pointer moves diagonally — it picks whichever direction moved furthest
 * past the source range's edge. Dragging back inside the source range (or
 * not past any edge) is a no-op.
 */
export function computeFillRange(source: CellRange, dragTo: CellPosition): FillResult {
  const allCandidates: Array<{ dir: FillDirection; amount: number }> = [
    { dir: 'down', amount: dragTo.row - source.endRow },
    { dir: 'up', amount: source.startRow - dragTo.row },
    { dir: 'right', amount: dragTo.col - source.endCol },
    { dir: 'left', amount: source.startCol - dragTo.col },
  ];
  const candidates = allCandidates.filter((c) => c.amount > 0);

  if (candidates.length === 0) {
    return { range: source, direction: 'none', filledCells: [] };
  }

  candidates.sort((a, b) => b.amount - a.amount);
  const winner = candidates[0];

  let range: CellRange;
  switch (winner.dir) {
    case 'down':
      range = { ...source, endRow: source.endRow + winner.amount };
      break;
    case 'up':
      range = { ...source, startRow: source.startRow - winner.amount };
      break;
    case 'right':
      range = { ...source, endCol: source.endCol + winner.amount };
      break;
    case 'left':
      range = { ...source, startCol: source.startCol - winner.amount };
      break;
    default:
      range = source;
  }

  const filledCells = rangeToCells(range).filter((cell) => !isCellInRange(cell, source));
  return { range, direction: winner.dir, filledCells };
}

function wrapIndex(offset: number, period: number): number {
  return ((offset % period) + period) % period;
}

/**
 * Maps a newly-filled cell back to the source cell whose value it should
 * copy, cycling through the source range's rows (for vertical fills) or
 * columns (for horizontal fills) — the same "repeat the pattern" behaviour
 * Excel uses for a plain (non-series) fill.
 */
export function mapFillTargetToSource(
  target: CellPosition,
  source: CellRange,
  direction: FillDirection,
): CellPosition {
  if (direction === 'none') return target;

  if (direction === 'down' || direction === 'up') {
    const rowCount = rangeRowCount(source);
    const rowOffset = wrapIndex(target.row - source.startRow, rowCount);
    return { row: source.startRow + rowOffset, col: target.col };
  }

  const colCount = rangeColCount(source);
  const colOffset = wrapIndex(target.col - source.startCol, colCount);
  return { row: target.row, col: source.startCol + colOffset };
}

/**
 * Double-click-fill-down: Excel extends the fill down to match the extent of
 * contiguous data in an adjacent column. `adjacentColHasValue` answers "does
 * the adjacent column have a non-empty value at this row" for each row
 * below `startRow`; the extent stops at the first gap or `maxRow`.
 */
export function computeFillDownExtent(params: {
  startRow: number;
  maxRow: number;
  adjacentColHasValue: (row: number) => boolean;
}): number {
  const { startRow, maxRow, adjacentColHasValue } = params;
  let row = startRow;
  while (row + 1 <= maxRow && adjacentColHasValue(row + 1)) {
    row += 1;
  }
  return row;
}
