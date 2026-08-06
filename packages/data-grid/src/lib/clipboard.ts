import { parseTsv, serializeTsv } from './tsv.js';
import type { CellPosition, CellRange } from './selection.js';
import { rangeColCount, rangeRowCount, rangeToCells } from './selection.js';

export interface ClipboardBounds {
  maxRow: number;
  maxCol: number;
}

/** Build the TSV text for a copy of `range`, using `getCellText` to render
 * each cell's display value. Row-major, matching how a real spreadsheet
 * serializes a selection. */
export function buildCopyText(range: CellRange, getCellText: (pos: CellPosition) => string): string {
  const rows: string[][] = [];
  for (let r = range.startRow; r <= range.endRow; r += 1) {
    const row: string[] = [];
    for (let c = range.startCol; c <= range.endCol; c += 1) {
      row.push(getCellText({ row: r, col: c }));
    }
    rows.push(row);
  }
  return serializeTsv(rows);
}

export interface PasteEdit {
  row: number;
  col: number;
  value: string;
}

/**
 * Parse pasted TSV text anchored at `anchor`, clipped to the grid bounds.
 * A paste that would run off the bottom/right edge of the grid is
 * truncated rather than throwing — matches Excel/Sheets, which silently
 * drop the overflow instead of erroring or resizing the sheet.
 */
export function buildPasteEdits(tsvText: string, anchor: CellPosition, bounds: ClipboardBounds): PasteEdit[] {
  const grid = parseTsv(tsvText);
  const edits: PasteEdit[] = [];
  for (let r = 0; r < grid.length; r += 1) {
    const targetRow = anchor.row + r;
    if (targetRow < 0 || targetRow > bounds.maxRow) continue;
    const rowValues = grid[r];
    for (let c = 0; c < rowValues.length; c += 1) {
      const targetCol = anchor.col + c;
      if (targetCol < 0 || targetCol > bounds.maxCol) continue;
      edits.push({ row: targetRow, col: targetCol, value: rowValues[c] });
    }
  }
  return edits;
}

/**
 * Excel/Sheets semantics: pasting a SINGLE copied cell onto a multi-cell
 * selection repeats that value across the whole selection, rather than only
 * landing on the anchor cell.
 */
export function expandSingleCellPasteToSelection(
  edits: PasteEdit[],
  selection: CellRange | undefined,
): PasteEdit[] {
  if (!selection || edits.length !== 1) return edits;
  if (rangeRowCount(selection) <= 1 && rangeColCount(selection) <= 1) return edits;
  const { value } = edits[0];
  return rangeToCells(selection).map((pos) => ({ row: pos.row, col: pos.col, value }));
}
