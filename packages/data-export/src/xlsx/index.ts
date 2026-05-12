import type {
  CoerceOptions,
  HeaderStyle,
  Row,
  SanitizeMode,
  SheetSpec,
} from '../types.js';
import { prepareRow, unionHeaders } from '../coerce.js';

// Back-compat re-export: `HeaderStyle` and `SheetSpec` are the single-
// source-of-truth in `../types.ts` (so package-internal modules and tests
// can import them from either path without risking a circular), but callers
// that already import them from `@bsuite/data-export/xlsx` keep working.
//
// Note: `export type { X } from '...'` is a *pure* re-export and does NOT
// bring `X` into local module scope — that's why `HeaderStyle` also needs
// to appear in the `import type` above (used by `applyHeaderStyle`'s
// parameter type).
export type { HeaderStyle, SheetSpec } from '../types.js';

// Types are imported statically (zero runtime cost — TS-only) while the
// implementation module is loaded lazily via dynamic `import()` inside each
// function so consumers who never call these functions pay no bundle cost.
import type * as XLSXType from '@e965/xlsx';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Keys that can pollute `Object.prototype` when set on a plain object via
 * `obj[key] = value`. Silently stripped from parsed rows.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ─── Types ───────────────────────────────────────────────────────────────

/** Subset of cell style we write: bold/colour font + solid fill. */
interface XlsxCellStyle {
  font?: { bold?: boolean; color?: { rgb: string } };
  fill?: { patternType: 'solid'; fgColor: { rgb: string } };
}

/**
 * WorkSheet augmented with the `!views` freeze-pane property.
 * `!views` is a valid OOXML worksheet property honoured by @e965/xlsx's
 * writer but absent from its public TypeScript surface (as of v0.20.x).
 */
type WorkSheetWithViews = XLSXType.WorkSheet & {
  '!views'?: Array<{ state: 'frozen'; ySplit: number; xSplit: number }>;
};

export interface ToXlsxOptions {
  sanitize?: SanitizeMode;
  coerce?: CoerceOptions;
  properties?: {
    title?: string;
    author?: string;
    createdDate?: Date;
  };
}

export interface ParseXlsxSheet {
  name: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

// ─── Lazy loader ─────────────────────────────────────────────────────────

let xlsxModulePromise: Promise<typeof XLSXType> | undefined;

/**
 * Lazily load `@e965/xlsx` exactly once per process. The returned promise is
 * cached so subsequent calls don't re-incur the module-evaluation cost.
 *
 * Using a dynamic import here (not a static one at module top-level) is what
 * gives consumers the "pay only if you call" bundle guarantee: bundlers emit
 * `@e965/xlsx` as a separate chunk that never loads until `toXlsx`/`parseXlsx`
 * actually runs.
 */
async function loadXlsx(): Promise<typeof XLSXType> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('@e965/xlsx').then(
      (mod) => mod as unknown as typeof XLSXType,
    );
  }
  return xlsxModulePromise;
}

function applyHeaderStyle(
  XLSX: typeof XLSXType,
  ws: XLSXType.WorkSheet,
  headerCount: number,
  style: HeaderStyle,
): void {
  if (headerCount === 0) return;
  const cellStyle: XlsxCellStyle = {};
  if (style.bold || style.fontColor) {
    const font: NonNullable<XlsxCellStyle['font']> = {};
    if (style.bold) font.bold = true;
    if (style.fontColor) font.color = { rgb: style.fontColor };
    cellStyle.font = font;
  }
  if (style.fillColor) {
    cellStyle.fill = { patternType: 'solid', fgColor: { rgb: style.fillColor } };
  }
  if (Object.keys(cellStyle).length === 0) return;
  for (let c = 0; c < headerCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr] as { s?: XlsxCellStyle } | undefined;
    if (cell) cell.s = cellStyle;
  }
}

// ─── Write ───────────────────────────────────────────────────────────────

/**
 * Serialise one or more sheets to XLSX bytes.
 *
 * Returns `Uint8Array` (not `ArrayBuffer`) because every consumer ultimately
 * wants to wrap it in a `Blob` or write to disk, and `Uint8Array` is accepted
 * by both without further copying.
 */
export async function toXlsx(
  sheets: SheetSpec | readonly SheetSpec[],
  options: ToXlsxOptions = {},
): Promise<Uint8Array> {
  const XLSX = await loadXlsx();
  const sheetArray: readonly SheetSpec[] = Array.isArray(sheets)
    ? (sheets as readonly SheetSpec[])
    : [sheets as SheetSpec];

  if (sheetArray.length === 0) {
    throw new Error('@bsuite/data-export: toXlsx requires at least one sheet');
  }

  const sanitize: SanitizeMode = options.sanitize ?? 'strict';
  const wb = XLSX.utils.book_new();

  if (options.properties) {
    wb.Props = {
      ...(options.properties.title ? { Title: options.properties.title } : {}),
      ...(options.properties.author ? { Author: options.properties.author } : {}),
      ...(options.properties.createdDate
        ? { CreatedDate: options.properties.createdDate }
        : {}),
    };
  }

  for (const sheet of sheetArray) {
    // The public `SheetSpec.rows` type is `readonly InputRow[]`
    // (`Record<string, unknown>`) so consumers can pass their domain rows
    // without a cast. The internal coerce pipeline operates on the narrow
    // `Row` type — this cast is safe because `prepareRow` performs runtime
    // coercion on every value (Date → string, null → '', bigint → number,
    // non-CellValue → `String(v)`). Mirrors the same pattern used in
    // `csv/index.ts`.
    const internalRows = sheet.rows as readonly Row[];
    const headers = (sheet.headers ?? unionHeaders(internalRows)).slice();
    const aoa: Array<Array<string | number>> = [
      headers.slice(),
      ...internalRows.map(
        (row: Row): Array<string | number> =>
          prepareRow(row, headers, sanitize, options.coerce),
      ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    if (sheet.columnWidths && sheet.columnWidths.length > 0) {
      ws['!cols'] = sheet.columnWidths.map((wch: number) => ({ wch }));
    }

    if (sheet.headerStyle) {
      applyHeaderStyle(XLSX, ws, headers.length, sheet.headerStyle);
    }

    if (sheet.freezeHeader) {
      (ws as WorkSheetWithViews)['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];
    }

    // Excel sheet names max 31 chars, and must not contain : \ / ? * [ ]
    const safeName = sheet.name.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buffer as ArrayBuffer);
}

/**
 * Convenience: serialise sheets to a Blob ready for download.
 */
export async function toXlsxBlob(
  sheets: SheetSpec | readonly SheetSpec[],
  options: ToXlsxOptions = {},
): Promise<Blob> {
  const bytes = await toXlsx(sheets, options);
  const blobBytes = new Uint8Array(bytes.byteLength);
  blobBytes.set(bytes);
  return new Blob([blobBytes], { type: XLSX_MIME });
}

// ─── Read ────────────────────────────────────────────────────────────────

export interface ParseXlsxOptions {
  /** Only parse the first sheet. Default `false` (parse all). */
  firstSheetOnly?: boolean;
  /**
   * Default value for empty cells. Default `null`. Pass `''` for spreadsheet
   * semantics where blank = empty string.
   */
  emptyValue?: unknown;
}

/**
 * Parse one or more sheets from an XLSX workbook.
 *
 * Returns an array of `ParseXlsxSheet` in workbook order. Each sheet's
 * `headers` is derived from the first row; `rows` is an array of
 * objects keyed by those headers.
 *
 * Prototype-pollution keys (`__proto__`, `constructor`, `prototype`) are
 * silently stripped from every parsed row.
 */
export async function parseXlsx(
  input: ArrayBuffer | Blob | File | Uint8Array,
  options: ParseXlsxOptions = {},
): Promise<ParseXlsxSheet[]> {
  const XLSX = await loadXlsx();
  const buffer = await toArrayBuffer(input);
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetNames = options.firstSheetOnly
    ? workbook.SheetNames.slice(0, 1)
    : workbook.SheetNames;

  const emptyValue = options.emptyValue ?? null;

  return sheetNames.map((name: string): ParseXlsxSheet => {
    const worksheet = workbook.Sheets[name];
    if (!worksheet) {
      return { name, headers: [], rows: [] };
    }
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: emptyValue,
    });
    const rows = rawRows.map((row) => stripForbiddenKeys(row));
    const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];
    return { name, headers, rows };
  });
}

function stripForbiddenKeys<T extends Record<string, unknown>>(row: T): T {
  let hasForbidden = false;
  for (const k of FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      hasForbidden = true;
      break;
    }
  }
  if (!hasForbidden) return row;
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (!FORBIDDEN_KEYS.has(key)) clean[key] = row[key];
  }
  return clean as T;
}

async function toArrayBuffer(
  input: ArrayBuffer | Blob | File | Uint8Array,
): Promise<ArrayBuffer> {
  // Uint8Array / views: copy into a fresh ArrayBuffer so we don't leak the
  // backing buffer if it's part of a larger allocation.
  if (input instanceof Uint8Array) {
    return input.slice().buffer as ArrayBuffer;
  }
  // Blob / File both expose .arrayBuffer() — duck-type because `instanceof
  // Blob` can fail across realms (e.g. vitest's jsdom vs Node).
  const maybeBlob = input as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof maybeBlob.arrayBuffer === 'function') {
    return maybeBlob.arrayBuffer();
  }
  // Assume plain ArrayBuffer otherwise.
  return input as ArrayBuffer;
}
