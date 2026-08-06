import type { ColumnDataType } from './types.js';

/** Type-aware default display/copy formatting. A column's `formatValue`
 * override always wins; this is the fallback so a column with no override
 * still copies sensible TSV text. */
export function formatCellValue(value: unknown, dataType: ColumnDataType | undefined): string {
  if (value == null) return '';
  switch (dataType) {
    case 'boolean':
      return value ? 'TRUE' : 'FALSE';
    case 'number':
      return typeof value === 'number' ? String(value) : String(value);
    default:
      return String(value);
  }
}

/** Type-aware default parsing for typed/pasted text. A column's
 * `parseValue` override always wins. */
export function parseCellValue(raw: string, dataType: ColumnDataType | undefined): unknown {
  switch (dataType) {
    case 'boolean': {
      const normalized = raw.trim().toUpperCase();
      if (normalized === 'TRUE' || normalized === '1' || normalized === 'YES') return true;
      if (normalized === 'FALSE' || normalized === '0' || normalized === 'NO' || normalized === '') return false;
      return Boolean(normalized);
    }
    case 'number': {
      if (raw.trim() === '') return null;
      const num = Number(raw);
      return Number.isNaN(num) ? raw : num;
    }
    default:
      return raw;
  }
}
