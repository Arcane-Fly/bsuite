import type { CellValue, CoerceOptions, Row, SanitizeMode } from './types.js';
import { applySanitize } from './sanitize.js';

const DEFAULT_COERCE: Required<CoerceOptions> = {
  dateFormat: 'iso',
  booleanLabels: { true: 'true', false: 'false' },
};

/**
 * Coerce a single cell value to a string-or-number-or-empty representation
 * suitable for writing to CSV/XLSX/JSON output. This is the single canonical
 * coercion pipeline — every export path in this package runs values through
 * it so behaviour is identical across formats.
 *
 * Rules:
 *   - `null` / `undefined`                   → `''`
 *   - `number` (finite)                      → passthrough (preserves XLSX numeric semantics)
 *   - `number` (NaN / ±Infinity)             → `''`
 *   - `boolean`                              → configured labels
 *   - `Date`                                 → ISO or locale string
 *   - `bigint`                               → `String(v)` (JSON.stringify throws on bigint)
 *   - `string`                               → passthrough (sanitised upstream if enabled)
 *   - anything else (function, symbol, etc.) → throws TypeError with the key hint
 */
export function coerceCell(
  value: CellValue,
  options?: CoerceOptions,
  keyHint?: string,
): string | number {
  const opts = {
    ...DEFAULT_COERCE,
    ...options,
    booleanLabels: { ...DEFAULT_COERCE.booleanLabels, ...(options?.booleanLabels ?? {}) },
  };

  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') {
    return value ? opts.booleanLabels.true : opts.booleanLabels.false;
  }
  if (typeof value === 'bigint') return value.toString(10);
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return opts.dateFormat === 'locale' ? value.toLocaleString() : value.toISOString();
  }

  // Unreachable under the CellValue type, but guard at runtime for callers
  // passing loose `Record<string, unknown>` via `as Row`.
  const keySuffix = keyHint ? ` (key: ${keyHint})` : '';
  throw new TypeError(
    `@bsuite/data-export: cannot coerce value of type ${typeof value}${keySuffix}. ` +
      `Supported types: string, number, boolean, bigint, Date, null, undefined.`,
  );
}

/**
 * Derive an ordered header list from an array of rows. Preserves insertion
 * order of keys as first encountered. Used when the caller doesn't pass an
 * explicit `headers` option.
 */
export function unionHeaders(rows: readonly Row[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
  }
  return ordered;
}

/**
 * Convert a row of `CellValue`s into a same-shaped record of strings/numbers,
 * applying coercion and optional formula-injection sanitisation. Missing keys
 * relative to `headers` become empty strings so column counts stay stable.
 */
export function prepareRow(
  row: Row,
  headers: readonly string[],
  sanitize: SanitizeMode,
  coerce?: CoerceOptions,
): Array<string | number> {
  return headers.map((header) => {
    const raw = row[header] as CellValue;
    const coerced = coerceCell(raw, coerce, header);
    // Only strings are vulnerable to formula injection — preserve numeric type
    // for native Excel aggregation.
    if (typeof coerced === 'string') {
      return applySanitize(coerced, sanitize) as string;
    }
    return coerced;
  });
}
