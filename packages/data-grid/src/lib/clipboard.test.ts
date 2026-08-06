import { describe, expect, it } from 'vitest';
import { buildCopyText, buildPasteEdits, expandSingleCellPasteToSelection } from './clipboard.js';

describe('buildCopyText', () => {
  it('serializes a range in row-major TSV order', () => {
    const grid: Record<string, string> = {
      '0,0': 'a', '0,1': 'b',
      '1,0': 'c', '1,1': 'd',
    };
    const range = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 };
    const text = buildCopyText(range, (pos) => grid[`${pos.row},${pos.col}`]);
    expect(text).toBe('a\tb\nc\td');
  });
});

describe('buildPasteEdits', () => {
  it('maps parsed TSV rows/cols onto grid coordinates from the anchor', () => {
    const edits = buildPasteEdits('a\tb\nc\td', { row: 2, col: 3 }, { maxRow: 20, maxCol: 20 });
    expect(edits).toEqual([
      { row: 2, col: 3, value: 'a' },
      { row: 2, col: 4, value: 'b' },
      { row: 3, col: 3, value: 'c' },
      { row: 3, col: 4, value: 'd' },
    ]);
  });

  it('clips edits that would fall outside the grid bounds', () => {
    const edits = buildPasteEdits('a\tb\tc\nd\te\tf', { row: 4, col: 4 }, { maxRow: 5, maxCol: 5 });
    // rows 4,5 both in bounds (maxRow 5); cols 4,5,6 -> 6 clipped (maxCol 5)
    expect(edits).toEqual([
      { row: 4, col: 4, value: 'a' },
      { row: 4, col: 5, value: 'b' },
      { row: 5, col: 4, value: 'd' },
      { row: 5, col: 5, value: 'e' },
    ]);
  });

  it('drops rows entirely past maxRow', () => {
    const edits = buildPasteEdits('a\nb\nc', { row: 4, col: 0 }, { maxRow: 5, maxCol: 5 });
    expect(edits).toEqual([
      { row: 4, col: 0, value: 'a' },
      { row: 5, col: 0, value: 'b' },
    ]);
  });

  it('round-trips a copy back through a paste at the same anchor', () => {
    const source: Record<string, string> = {
      '0,0': 'x1', '0,1': 'has\ttab',
      '1,0': 'has"quote', '1,1': 'plain',
    };
    const range = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 };
    const text = buildCopyText(range, (pos) => source[`${pos.row},${pos.col}`]);
    const edits = buildPasteEdits(text, { row: 0, col: 0 }, { maxRow: 10, maxCol: 10 });
    const byKey = new Map(edits.map((e) => [`${e.row},${e.col}`, e.value]));
    expect(byKey.get('0,0')).toBe('x1');
    expect(byKey.get('0,1')).toBe('has\ttab');
    expect(byKey.get('1,0')).toBe('has"quote');
    expect(byKey.get('1,1')).toBe('plain');
  });
});

describe('expandSingleCellPasteToSelection', () => {
  it('repeats a single pasted value across a multi-cell selection', () => {
    const edits = [{ row: 0, col: 0, value: 'X' }];
    const selection = { startRow: 0, endRow: 1, startCol: 0, endCol: 1 };
    const expanded = expandSingleCellPasteToSelection(edits, selection);
    expect(expanded).toEqual([
      { row: 0, col: 0, value: 'X' },
      { row: 0, col: 1, value: 'X' },
      { row: 1, col: 0, value: 'X' },
      { row: 1, col: 1, value: 'X' },
    ]);
  });

  it('leaves a single-cell paste onto a single-cell selection unchanged', () => {
    const edits = [{ row: 2, col: 2, value: 'X' }];
    const selection = { startRow: 2, endRow: 2, startCol: 2, endCol: 2 };
    expect(expandSingleCellPasteToSelection(edits, selection)).toEqual(edits);
  });

  it('leaves a multi-cell paste unchanged regardless of selection', () => {
    const edits = [
      { row: 0, col: 0, value: 'a' },
      { row: 0, col: 1, value: 'b' },
    ];
    const selection = { startRow: 0, endRow: 3, startCol: 0, endCol: 3 };
    expect(expandSingleCellPasteToSelection(edits, selection)).toEqual(edits);
  });

  it('leaves edits unchanged when there is no active selection', () => {
    const edits = [{ row: 0, col: 0, value: 'X' }];
    expect(expandSingleCellPasteToSelection(edits, undefined)).toEqual(edits);
  });
});
