import Papa from 'papaparse';
import type { CoerceOptions, InputRow, Row, SanitizeMode } from '../types.js';
import { prepareRow, unionHeaders } from '../coerce.js';

// ─── Stringify ───────────────────────────────────────────────────────────

export interface ToCsvOptions {
  /**
   * Explicit header order. Defaults to the union of keys across all rows
   * (first-seen order). Use this to pin column order or exclude keys.
   */
  headers?: readonly string[];
  /**
   * OWASP CSV-injection guard. Default `'strict'`.
   */
  sanitize?: SanitizeMode;
  /**
   * Prepend a UTF-8 BOM so Excel on Windows auto-detects the encoding and
   * renders accented characters correctly. Default `true`.
   */
  bom?: boolean;
  /** Field separator. Default `','`. */
  delimiter?: string;
  /** Line terminator. Default `'\r\n'` for maximum Excel compatibility. */
  newline?: string;
  /** Value coercion options. */
  coerce?: CoerceOptions;
}

const UTF8_BOM = '\ufeff';
const CSV_MIME = 'text/csv;charset=utf-8;';

/**
 * Keys that can pollute `Object.prototype` when set on a plain object via
 * `obj[key] = value`. Silently stripped from parsed rows.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Serialise rows to a CSV string.
 *
 * - Empty input → returns an empty string (or BOM-only string if `bom=true`).
 * - Column order: `options.headers` > union of first-seen keys across rows.
 * - Numbers and booleans are written without quoting when safe; strings are
 *   RFC-4180 quoted by papaparse as needed.
 */
export function toCsv(rows: readonly InputRow[], options: ToCsvOptions = {}): string {
  const sanitize: SanitizeMode = options.sanitize ?? 'strict';
  const bom = options.bom ?? true;
  const delimiter = options.delimiter ?? ',';
  const newline = options.newline ?? '\r\n';

  if (rows.length === 0) return bom ? UTF8_BOM : '';

  // Internal pipeline operates on the narrow `Row` type. The cast is safe
  // because `prepareRow` performs runtime coercion on every value (Date →
  // string, null → '', bigint → number, React/functions/Symbols → String()).
  const internalRows = rows as readonly Row[];
  const headers = (options.headers ?? unionHeaders(internalRows)).slice();
  const dataRows = internalRows.map((row: Row): Array<string | number> =>
    prepareRow(row, headers, sanitize, options.coerce),
  );

  const csv = Papa.unparse([headers.slice(), ...dataRows], {
    delimiter,
    newline,
    quotes: false, // papaparse auto-quotes values containing delimiter/newline/quote
    header: false,
  });

  return bom ? `${UTF8_BOM}${csv}` : csv;
}

/**
 * Serialise rows to a Blob ready for `downloadBlob` or `URL.createObjectURL`.
 */
export function toCsvBlob(rows: readonly InputRow[], options: ToCsvOptions = {}): Blob {
  const text = toCsv(rows, options);
  return new Blob([text], { type: CSV_MIME });
}

// ─── Parse ───────────────────────────────────────────────────────────────

export interface ParseCsvError {
  row: number;
  message: string;
  /**
   * Papaparse error category: one of `'Quotes' | 'Delimiter' | 'FieldMismatch' | 'Abort'`.
   * Surfaced so consumers can filter on severity/type.
   */
  type?: string;
}

export interface ParseCsvResult {
  headers: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  totalRows: number;
  errors: ParseCsvError[];
}

export interface ParseCsvOptions {
  /**
   * Convert numeric-looking / boolean-looking strings to their typed values.
   * Default `false` — opt-in because it's lossy (e.g. `"00123"` → `123`
   * loses leading zeros, zip codes break). Enable only when the caller is
   * certain the source data is canonical.
   */
  dynamicTyping?: boolean;
  /** Field separator. Auto-detected by papaparse when omitted. */
  delimiter?: string;
  /** Normalise header names (e.g. trim, snake-case). */
  transformHeader?: (header: string) => string;
  /** Skip rows that are entirely empty. Default `true`. */
  skipEmptyLines?: boolean;
}

export type ParseCsvInput = string | Blob | File | ArrayBuffer | Uint8Array;

/**
 * Parse CSV from a string, Blob, File, ArrayBuffer, or Uint8Array.
 *
 * Returns a uniform `ParseCsvResult` regardless of input type. Errors are
 * collected non-fatally and surfaced in `result.errors` — callers decide
 * whether to fail the import or continue with valid rows.
 *
 * Prototype-pollution keys (`__proto__`, `constructor`, `prototype`) are
 * silently stripped from every parsed row.
 */
export async function parseCsv(
  input: ParseCsvInput,
  options: ParseCsvOptions = {},
): Promise<ParseCsvResult> {
  const text = await toText(input);

  const papaOptions: Papa.ParseConfig = {
    header: true,
    skipEmptyLines: options.skipEmptyLines ?? true,
    dynamicTyping: options.dynamicTyping ?? false,
    transformHeader: options.transformHeader ?? ((h: string) => h.trim()),
  };
  if (options.delimiter !== undefined) papaOptions.delimiter = options.delimiter;

  const result = Papa.parse<Record<string, string | number | boolean | null>>(
    text,
    papaOptions,
  );

  const errors: ParseCsvError[] = result.errors.map((err) => {
    const out: ParseCsvError = {
      row: err.row ?? -1,
      message: err.message,
    };
    if (err.type) out.type = err.type;
    return out;
  });

  const rows = result.data.map((row) => stripForbiddenKeys(row));

  return {
    headers: (result.meta.fields ?? []).filter((h) => !FORBIDDEN_KEYS.has(h)),
    rows,
    totalRows: rows.length,
    errors,
  };
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

async function toText(input: ParseCsvInput): Promise<string> {
  if (typeof input === 'string') return input;
  // Blob / File both expose .text() — duck-type because `instanceof Blob`
  // can fail across realms (vitest jsdom ≠ node global).
  const maybeBlob = input as { text?: () => Promise<string> };
  if (typeof maybeBlob.text === 'function') {
    return maybeBlob.text();
  }
  // ArrayBuffer / Uint8Array / any BufferSource: decode as UTF-8.
  return new TextDecoder('utf-8').decode(input as BufferSource);
}
