import { describe, expect, it } from 'vitest';
import { computeFillDownExtent, computeFillRange, mapFillTargetToSource } from './fill.js';

describe('computeFillRange', () => {
  const source = { startRow: 2, endRow: 3, startCol: 1, endCol: 2 };

  it('extends down when dragged below the source', () => {
    const result = computeFillRange(source, { row: 6, col: 1 });
    expect(result.direction).toBe('down');
    expect(result.range).toEqual({ startRow: 2, endRow: 6, startCol: 1, endCol: 2 });
    expect(result.filledCells).toHaveLength(3 * 2); // rows 4,5,6 x 2 cols
  });

  it('extends right when the horizontal delta dominates', () => {
    const result = computeFillRange(source, { row: 3, col: 5 });
    expect(result.direction).toBe('right');
    expect(result.range).toEqual({ startRow: 2, endRow: 3, startCol: 1, endCol: 5 });
  });

  it('picks the dominant axis on a diagonal drag', () => {
    // down delta = 6-3 = 3, right delta = 3-2 = 1 -> down wins
    const result = computeFillRange(source, { row: 6, col: 3 });
    expect(result.direction).toBe('down');
  });

  it('extends up when dragged above the source', () => {
    const result = computeFillRange(source, { row: 0, col: 1 });
    expect(result.direction).toBe('up');
    expect(result.range).toEqual({ startRow: 0, endRow: 3, startCol: 1, endCol: 2 });
  });

  it('extends left when dragged left of the source', () => {
    const result = computeFillRange(source, { row: 2, col: 0 });
    expect(result.direction).toBe('left');
    expect(result.range).toEqual({ startRow: 2, endRow: 3, startCol: 0, endCol: 2 });
  });

  it('is a no-op when the drag stays inside the source range', () => {
    const result = computeFillRange(source, { row: 2, col: 2 });
    expect(result.direction).toBe('none');
    expect(result.filledCells).toEqual([]);
    expect(result.range).toEqual(source);
  });

  it('filledCells excludes the original source cells', () => {
    const result = computeFillRange(source, { row: 5, col: 1 });
    for (const cell of result.filledCells) {
      expect(cell.row).toBeGreaterThan(source.endRow);
    }
  });
});

describe('mapFillTargetToSource', () => {
  it('cycles a single-row source when filled down', () => {
    const source = { startRow: 0, endRow: 0, startCol: 0, endCol: 0 };
    expect(mapFillTargetToSource({ row: 3, col: 0 }, source, 'down')).toEqual({ row: 0, col: 0 });
  });

  it('cycles a 2-row source pattern when filled down 5 extra rows', () => {
    // source rows 0,1 (pattern length 2); target row 5 -> offset (5-0)%2 = 1 -> source row 1
    const source = { startRow: 0, endRow: 1, startCol: 0, endCol: 0 };
    expect(mapFillTargetToSource({ row: 5, col: 0 }, source, 'down')).toEqual({ row: 1, col: 0 });
    expect(mapFillTargetToSource({ row: 4, col: 0 }, source, 'down')).toEqual({ row: 0, col: 0 });
  });

  it('cycles correctly when filled upward', () => {
    // source rows 5,6; target row 2 -> offset wraps to a valid source row
    const source = { startRow: 5, endRow: 6, startCol: 0, endCol: 0 };
    const mapped = mapFillTargetToSource({ row: 2, col: 0 }, source, 'up');
    expect([5, 6]).toContain(mapped.row);
  });

  it('cycles a source column pattern when filled right', () => {
    const source = { startRow: 0, endRow: 0, startCol: 0, endCol: 1 };
    expect(mapFillTargetToSource({ row: 0, col: 4 }, source, 'right')).toEqual({ row: 0, col: 0 });
    expect(mapFillTargetToSource({ row: 0, col: 5 }, source, 'right')).toEqual({ row: 0, col: 1 });
  });

  it('is the identity for direction "none"', () => {
    const source = { startRow: 0, endRow: 0, startCol: 0, endCol: 0 };
    expect(mapFillTargetToSource({ row: 3, col: 3 }, source, 'none')).toEqual({ row: 3, col: 3 });
  });
});

describe('computeFillDownExtent', () => {
  it('extends to the last contiguous non-empty row in the adjacent column', () => {
    const data = new Set([1, 2, 3, 4]); // rows with data, contiguous from row 1
    const extent = computeFillDownExtent({
      startRow: 0,
      maxRow: 20,
      adjacentColHasValue: (row) => data.has(row),
    });
    expect(extent).toBe(4);
  });

  it('stops at the first gap', () => {
    const data = new Set([1, 2, 5, 6]); // gap at row 3
    const extent = computeFillDownExtent({
      startRow: 0,
      maxRow: 20,
      adjacentColHasValue: (row) => data.has(row),
    });
    expect(extent).toBe(2);
  });

  it('stops at maxRow when data extends beyond the grid', () => {
    const extent = computeFillDownExtent({
      startRow: 0,
      maxRow: 3,
      adjacentColHasValue: () => true,
    });
    expect(extent).toBe(3);
  });

  it('returns startRow unchanged when the adjacent column has no data', () => {
    const extent = computeFillDownExtent({
      startRow: 7,
      maxRow: 20,
      adjacentColHasValue: () => false,
    });
    expect(extent).toBe(7);
  });
});
