import { describe, expect, it } from 'vitest';
import {
  clampRange,
  isCellInRange,
  isSingleCell,
  normalizeRange,
  rangeColCount,
  rangeRowCount,
  rangeToCells,
  rangesEqual,
  singleCellRange,
} from './selection.js';

describe('normalizeRange', () => {
  it('is a no-op when anchor precedes focus', () => {
    expect(normalizeRange({ row: 1, col: 1 }, { row: 3, col: 4 })).toEqual({
      startRow: 1,
      endRow: 3,
      startCol: 1,
      endCol: 4,
    });
  });

  it('swaps when focus precedes anchor (dragging up-left)', () => {
    expect(normalizeRange({ row: 5, col: 5 }, { row: 2, col: 1 })).toEqual({
      startRow: 2,
      endRow: 5,
      startCol: 1,
      endCol: 5,
    });
  });

  it('handles mixed row/col ordering independently', () => {
    expect(normalizeRange({ row: 5, col: 1 }, { row: 1, col: 5 })).toEqual({
      startRow: 1,
      endRow: 5,
      startCol: 1,
      endCol: 5,
    });
  });

  it('collapses to a single cell when anchor equals focus', () => {
    expect(normalizeRange({ row: 2, col: 3 }, { row: 2, col: 3 })).toEqual({
      startRow: 2,
      endRow: 2,
      startCol: 3,
      endCol: 3,
    });
  });
});

describe('clampRange', () => {
  it('clamps a range that overshoots the grid bounds', () => {
    expect(clampRange({ startRow: -2, endRow: 50, startCol: -1, endCol: 20 }, 9, 4)).toEqual({
      startRow: 0,
      endRow: 9,
      startCol: 0,
      endCol: 4,
    });
  });

  it('leaves an in-bounds range untouched', () => {
    const range = { startRow: 1, endRow: 2, startCol: 1, endCol: 2 };
    expect(clampRange(range, 9, 9)).toEqual(range);
  });
});

describe('isCellInRange', () => {
  const range = { startRow: 1, endRow: 3, startCol: 1, endCol: 3 };

  it('is true on all four corners (inclusive bounds)', () => {
    expect(isCellInRange({ row: 1, col: 1 }, range)).toBe(true);
    expect(isCellInRange({ row: 1, col: 3 }, range)).toBe(true);
    expect(isCellInRange({ row: 3, col: 1 }, range)).toBe(true);
    expect(isCellInRange({ row: 3, col: 3 }, range)).toBe(true);
  });

  it('is false just outside every edge', () => {
    expect(isCellInRange({ row: 0, col: 2 }, range)).toBe(false);
    expect(isCellInRange({ row: 4, col: 2 }, range)).toBe(false);
    expect(isCellInRange({ row: 2, col: 0 }, range)).toBe(false);
    expect(isCellInRange({ row: 2, col: 4 }, range)).toBe(false);
  });
});

describe('rangeRowCount / rangeColCount / rangeToCells', () => {
  it('counts rows and columns inclusively', () => {
    const range = { startRow: 2, endRow: 5, startCol: 0, endCol: 2 };
    expect(rangeRowCount(range)).toBe(4);
    expect(rangeColCount(range)).toBe(3);
  });

  it('enumerates every cell in row-major order', () => {
    const range = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 };
    expect(rangeToCells(range)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
  });

  it('matches rowCount * colCount for a larger range', () => {
    const range = { startRow: 3, endRow: 12, startCol: 1, endCol: 6 };
    expect(rangeToCells(range)).toHaveLength(rangeRowCount(range) * rangeColCount(range));
  });
});

describe('rangesEqual / singleCellRange / isSingleCell', () => {
  it('singleCellRange collapses a position to a 1x1 range', () => {
    expect(singleCellRange({ row: 4, col: 7 })).toEqual({
      startRow: 4,
      endRow: 4,
      startCol: 7,
      endCol: 7,
    });
  });

  it('isSingleCell is true only for 1x1 ranges', () => {
    expect(isSingleCell(singleCellRange({ row: 0, col: 0 }))).toBe(true);
    expect(isSingleCell({ startRow: 0, endRow: 1, startCol: 0, endCol: 0 })).toBe(false);
  });

  it('rangesEqual compares structurally', () => {
    const a = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 };
    const b = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 };
    const c = { startRow: 0, endRow: 2, startCol: 0, endCol: 1 };
    expect(rangesEqual(a, b)).toBe(true);
    expect(rangesEqual(a, c)).toBe(false);
  });
});
