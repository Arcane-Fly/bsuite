import type { CellPosition } from './selection.js';

export interface GridBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export interface MoveOptions {
  /** Ctrl (Windows/Linux) or Cmd (macOS) held — jump to the edge of a
   * contiguous data region instead of moving one cell. */
  ctrlOrCmd?: boolean;
  /** Predicate for "this cell has no value" — drives the Ctrl+Arrow jump.
   * Defaults to "never empty", which degrades Ctrl+Arrow to "jump to the
   * grid edge" when the host doesn't supply data-awareness. */
  isEmpty?: (pos: CellPosition) => boolean;
}

const DIRECTION: Record<ArrowKey, { dRow: number; dCol: number }> = {
  ArrowUp: { dRow: -1, dCol: 0 },
  ArrowDown: { dRow: 1, dCol: 0 },
  ArrowLeft: { dRow: 0, dCol: -1 },
  ArrowRight: { dRow: 0, dCol: 1 },
};

function inBounds(pos: CellPosition, bounds: GridBounds): boolean {
  return (
    pos.row >= bounds.minRow &&
    pos.row <= bounds.maxRow &&
    pos.col >= bounds.minCol &&
    pos.col <= bounds.maxCol
  );
}

function clampPosition(pos: CellPosition, bounds: GridBounds): CellPosition {
  return {
    row: Math.max(bounds.minRow, Math.min(pos.row, bounds.maxRow)),
    col: Math.max(bounds.minCol, Math.min(pos.col, bounds.maxCol)),
  };
}

/**
 * Plain arrow: move one cell, clamped to bounds.
 * Ctrl/Cmd+arrow: jump to the edge of contiguous data, Excel-style —
 *  - if the adjacent cell is empty, advance through empty cells and land on
 *    the first non-empty cell found (or the grid edge if there is none)
 *  - if the adjacent cell is non-empty, advance while cells stay non-empty
 *    and land on the last non-empty cell before a gap (or the grid edge)
 */
export function moveFocus(
  current: CellPosition,
  key: ArrowKey,
  bounds: GridBounds,
  options: MoveOptions = {},
): CellPosition {
  const { dRow, dCol } = DIRECTION[key];
  const isEmpty = options.isEmpty ?? ((): boolean => false);

  if (!options.ctrlOrCmd) {
    return clampPosition({ row: current.row + dRow, col: current.col + dCol }, bounds);
  }

  const next = { row: current.row + dRow, col: current.col + dCol };
  if (!inBounds(next, bounds)) return current;

  if (isEmpty(next)) {
    let pos = next;
    let forward = { row: pos.row + dRow, col: pos.col + dCol };
    while (inBounds(forward, bounds) && isEmpty(forward)) {
      pos = forward;
      forward = { row: pos.row + dRow, col: pos.col + dCol };
    }
    if (inBounds(forward, bounds) && !isEmpty(forward)) {
      pos = forward;
    }
    return pos;
  }

  let pos = next;
  for (;;) {
    const forward = { row: pos.row + dRow, col: pos.col + dCol };
    if (!inBounds(forward, bounds) || isEmpty(forward)) break;
    pos = forward;
  }
  return pos;
}

/** Tab moves right and wraps to the next row's first column; Shift+Tab
 * moves left and wraps to the previous row's last column. */
export function moveTab(current: CellPosition, bounds: GridBounds, shift: boolean): CellPosition {
  if (!shift) {
    if (current.col < bounds.maxCol) return { row: current.row, col: current.col + 1 };
    if (current.row < bounds.maxRow) return { row: current.row + 1, col: bounds.minCol };
    return current;
  }
  if (current.col > bounds.minCol) return { row: current.row, col: current.col - 1 };
  if (current.row > bounds.minRow) return { row: current.row - 1, col: bounds.maxCol };
  return current;
}

/** Enter moves down a row (same column); Shift+Enter moves up. */
export function moveEnter(current: CellPosition, bounds: GridBounds, shift: boolean): CellPosition {
  const delta = shift ? -1 : 1;
  return clampPosition({ row: current.row + delta, col: current.col }, bounds);
}

/** True for a single, non-modified printable character — the trigger for
 * "typing over a focused cell starts editing" (Excel/Sheets semantics). */
export function isPrintableEditTrigger(e: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.key.length === 1;
}
