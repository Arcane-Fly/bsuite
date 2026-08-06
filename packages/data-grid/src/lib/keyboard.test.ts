import { describe, expect, it } from 'vitest';
import { isPrintableEditTrigger, moveEnter, moveFocus, moveTab } from './keyboard.js';

const bounds = { minRow: 0, maxRow: 4, minCol: 0, maxCol: 3 };

describe('moveFocus — plain arrows', () => {
  it('moves one cell per arrow', () => {
    expect(moveFocus({ row: 1, col: 1 }, 'ArrowDown', bounds)).toEqual({ row: 2, col: 1 });
    expect(moveFocus({ row: 1, col: 1 }, 'ArrowUp', bounds)).toEqual({ row: 0, col: 1 });
    expect(moveFocus({ row: 1, col: 1 }, 'ArrowLeft', bounds)).toEqual({ row: 1, col: 0 });
    expect(moveFocus({ row: 1, col: 1 }, 'ArrowRight', bounds)).toEqual({ row: 1, col: 2 });
  });

  it('clamps at the grid edge instead of leaving bounds', () => {
    expect(moveFocus({ row: 0, col: 0 }, 'ArrowUp', bounds)).toEqual({ row: 0, col: 0 });
    expect(moveFocus({ row: 4, col: 3 }, 'ArrowDown', bounds)).toEqual({ row: 4, col: 3 });
    expect(moveFocus({ row: 4, col: 3 }, 'ArrowRight', bounds)).toEqual({ row: 4, col: 3 });
  });
});

describe('moveFocus — Ctrl/Cmd+Arrow data-edge jump', () => {
  it('jumps to the grid edge when isEmpty is not supplied', () => {
    expect(moveFocus({ row: 0, col: 0 }, 'ArrowDown', bounds, { ctrlOrCmd: true })).toEqual({
      row: 4,
      col: 0,
    });
  });

  it('jumps over a run of empty cells to the first non-empty cell', () => {
    // data at rows 0(current), 3; rows 1,2 empty
    const dataRows = new Set([0, 3]);
    const isEmpty = (pos: { row: number; col: number }): boolean => !dataRows.has(pos.row);
    const result = moveFocus({ row: 0, col: 0 }, 'ArrowDown', bounds, { ctrlOrCmd: true, isEmpty });
    expect(result).toEqual({ row: 3, col: 0 });
  });

  it('jumps to the last cell of a contiguous data run before a gap', () => {
    // data at rows 0,1,2 (contiguous from current), gap at row 3
    const dataRows = new Set([0, 1, 2]);
    const isEmpty = (pos: { row: number; col: number }): boolean => !dataRows.has(pos.row);
    const result = moveFocus({ row: 0, col: 0 }, 'ArrowDown', bounds, { ctrlOrCmd: true, isEmpty });
    expect(result).toEqual({ row: 2, col: 0 });
  });

  it('jumps to the grid edge when the whole run to the edge is non-empty', () => {
    const isEmpty = (): boolean => false;
    const result = moveFocus({ row: 0, col: 0 }, 'ArrowDown', bounds, { ctrlOrCmd: true, isEmpty });
    expect(result).toEqual({ row: 4, col: 0 });
  });

  it('stays put when already at the bound', () => {
    const result = moveFocus({ row: 4, col: 0 }, 'ArrowDown', bounds, { ctrlOrCmd: true });
    expect(result).toEqual({ row: 4, col: 0 });
  });
});

describe('moveTab', () => {
  it('moves right, wrapping to the next row at the last column', () => {
    expect(moveTab({ row: 0, col: 2 }, bounds, false)).toEqual({ row: 0, col: 3 });
    expect(moveTab({ row: 0, col: 3 }, bounds, false)).toEqual({ row: 1, col: 0 });
  });

  it('stays put at the very last cell', () => {
    expect(moveTab({ row: 4, col: 3 }, bounds, false)).toEqual({ row: 4, col: 3 });
  });

  it('shift+tab moves left, wrapping to the previous row at the first column', () => {
    expect(moveTab({ row: 1, col: 1 }, bounds, true)).toEqual({ row: 1, col: 0 });
    expect(moveTab({ row: 1, col: 0 }, bounds, true)).toEqual({ row: 0, col: 3 });
  });

  it('stays put at the very first cell on shift+tab', () => {
    expect(moveTab({ row: 0, col: 0 }, bounds, true)).toEqual({ row: 0, col: 0 });
  });
});

describe('moveEnter', () => {
  it('moves down a row, clamped', () => {
    expect(moveEnter({ row: 1, col: 2 }, bounds, false)).toEqual({ row: 2, col: 2 });
    expect(moveEnter({ row: 4, col: 2 }, bounds, false)).toEqual({ row: 4, col: 2 });
  });

  it('shift+enter moves up a row, clamped', () => {
    expect(moveEnter({ row: 1, col: 2 }, bounds, true)).toEqual({ row: 0, col: 2 });
    expect(moveEnter({ row: 0, col: 2 }, bounds, true)).toEqual({ row: 0, col: 2 });
  });
});

describe('isPrintableEditTrigger', () => {
  it('is true for a bare printable character', () => {
    expect(isPrintableEditTrigger({ key: 'a' })).toBe(true);
    expect(isPrintableEditTrigger({ key: '5' })).toBe(true);
  });

  it('is false for modified keys and multi-char key names', () => {
    expect(isPrintableEditTrigger({ key: 'a', ctrlKey: true })).toBe(false);
    expect(isPrintableEditTrigger({ key: 'a', metaKey: true })).toBe(false);
    expect(isPrintableEditTrigger({ key: 'a', altKey: true })).toBe(false);
    expect(isPrintableEditTrigger({ key: 'Enter' })).toBe(false);
    expect(isPrintableEditTrigger({ key: 'Shift' })).toBe(false);
  });
});
