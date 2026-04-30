import type { SanitizeMode } from './types.js';

/**
 * OWASP-recommended leading characters that can cause a spreadsheet cell to
 * be interpreted as a formula. Only these six characters matter — adding more
 * (`|`, `%`, etc.) mangles legitimate values without improving security.
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */
const OWASP_FORMULA_LEADS = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Sanitise a single string value against CSV/XLSX formula injection.
 *
 * Callers should only invoke this for **string** values. Numbers, booleans,
 * Dates, and bigints are safe by construction and must pass through
 * un-sanitised so Excel/Sheets preserves their numeric semantics (sort, SUM,
 * etc.). Non-string values are returned as-is.
 */
export function sanitizeForFormula(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0) return value;
  const first = value.charAt(0);
  if (OWASP_FORMULA_LEADS.has(first)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Apply sanitisation conditionally based on mode. Returns the original value
 * unchanged when mode is `'off'`.
 */
export function applySanitize(value: unknown, mode: SanitizeMode): unknown {
  if (mode === 'off') return value;
  return sanitizeForFormula(value);
}
