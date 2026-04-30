/**
 * Core types for @bsuite/data-export.
 *
 * The `CellValue` and `Row` types intentionally constrain input to serialisable
 * primitives + Date. Callers must coerce application-specific types (e.g.
 * ReactElement, functions, Symbols) before passing rows in — the package will
 * reject non-serialisable inputs with a clear error rather than silently
 * producing garbage cells.
 */

export type CellValue =
  | string
  | number
  | boolean
  | bigint
  | Date
  | null
  | undefined;

/**
 * Canonical internal row shape. Values must be one of `CellValue`. Used by
 * the coerce/stringify pipeline after runtime normalisation.
 */
export type Row = Record<string, CellValue>;

/**
 * Public input-row shape accepted by `toCsv`, `toXlsx`, and `SheetSpec.rows`.
 *
 * Widened from the internal canonical `Row` (`Record<string, CellValue>`) so
 * consumers can pass their existing `Record<string, unknown>[]` shapes
 * (e.g. Supabase query results, analytics rows, saved-calculation rows)
 * without a cast. Non-serialisable values (functions, Symbols, React
 * elements, etc.) are coerced to a string representation at runtime via
 * `prepareRow` — never written as live cells.
 *
 * Prefer this as the parameter type for all public API functions.
 */
export type InputRow = Record<string, unknown>;

/**
 * Optional header-row styling applied to the first row of an XLSX sheet.
 *
 * Colour values are hex RGB strings **without** the leading `#` (e.g.
 * `'FFFFFF'` for white, `'0284C7'` for sky-600). This matches the
 * underlying `@e965/xlsx` cell-style format.
 *
 * Re-exported from `@bsuite/data-export/xlsx` for back-compat.
 */
export interface HeaderStyle {
  /** Bold font. */
  bold?: boolean;
  /** Cell background fill (hex RGB, no `#`). */
  fillColor?: string;
  /** Font colour (hex RGB, no `#`). */
  fontColor?: string;
}

/**
 * Specification for a single sheet inside an XLSX workbook.
 *
 * Defined here (not in `xlsx/index.ts`) so the test suite and other
 * package-internal modules can reference it without creating a circular
 * dependency between `types.ts` and the xlsx entry point. Also re-exported
 * from `@bsuite/data-export/xlsx` and from the main barrel for back-compat.
 */
export interface SheetSpec {
  /** Sheet tab name (max 31 chars per Excel). Will be truncated silently. */
  name: string;
  /**
   * Row data. Keys that aren't in `headers` are ignored. Accepts the wide
   * public `InputRow` shape (`Record<string, unknown>`) so consumer rows
   * from Supabase queries, analytics, etc. can be passed without casts —
   * values are coerced at runtime by `prepareRow`.
   */
  rows: readonly InputRow[];
  /**
   * Explicit column order. Defaults to union of keys across this sheet's rows.
   */
  headers?: readonly string[];
  /**
   * Optional per-column widths (in Excel "wch" units — roughly character count).
   * Must match `headers` length when both are provided.
   */
  columnWidths?: readonly number[];
  /**
   * Optional header-row styling (bold, fill colour, font colour). Supports
   * the crm7 F17 compliance pattern (white bold text on coloured fill).
   */
  headerStyle?: HeaderStyle;
  /**
   * Freeze the header row so it stays visible while scrolling. Writes
   * `ws['!views'] = [{ state: 'frozen', ySplit: 1 }]`.
   */
  freezeHeader?: boolean;
}

/**
 * Controls OWASP-style formula-injection guarding on string cells.
 *
 * - `'strict'` (default): prefix any string starting with `=`, `+`, `-`, `@`,
 *   `\t` (0x09), or `\r` (0x0D) with a single quote. Recommended whenever
 *   exported data may originate from untrusted input (user-entered fields,
 *   scraped data, etc.).
 * - `'off'`: leave strings untouched. Safe only when every row cell is
 *   derived from trusted numeric/boolean sources (e.g. R80.3 calculator
 *   outputs that pre-format currency like `-$100` and must remain textual).
 */
export type SanitizeMode = 'strict' | 'off';

export interface CoerceOptions {
  /**
   * How `Date` values are serialised when written to text formats.
   * Default `'iso'` → `toISOString()`. `'locale'` uses `toLocaleString()`.
   */
  dateFormat?: 'iso' | 'locale';
  /**
   * Labels used for boolean coercion. Default `{ true: 'true', false: 'false' }`.
   */
  booleanLabels?: { true: string; false: string };
}
