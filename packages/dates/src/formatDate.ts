/**
 * BSuite universal date/time formatters.
 *
 * Default locale: `en-AU` (Australian DD/MM/YYYY, 24-hour time).
 * Toggle: per-user master switch to `en-US` (American MM/DD/YYYY, 12-hour time).
 *
 * These wrappers around the platform `Intl.*` APIs exist so every BSuite app
 * renders dates consistently and respects the per-user preference without
 * each consumer reinventing format options.
 *
 * Phase F scaffold — see plan
 * `docs/plans/20260510-universal-canvas-capability-implementation-v1.00F.md`.
 */

/**
 * Locales supported by BSuite's per-user date-format master toggle.
 *
 * The wire-level preference is stored as `'au' | 'us'`
 * (column `user_preferences.date_format`); the BCP-47 locale tag is derived
 * via {@link dateFormatToLocale}.
 */
export type SupportedLocale = 'en-AU' | 'en-US';

/**
 * The stable, on-disk representation of a user's date-format preference.
 * Kept short and storage-friendly so it can be a plain text column or
 * Postgres enum without coupling to a BCP-47 string that may change later.
 */
export type DateFormatPreference = 'au' | 'us';

/** Default locale used when no per-user preference has been recorded. */
export const DEFAULT_LOCALE: SupportedLocale = 'en-AU';

/** Default preference used when no per-user preference has been recorded. */
export const DEFAULT_DATE_FORMAT: DateFormatPreference = 'au';

/** Map a {@link DateFormatPreference} to its BCP-47 locale tag. */
export function dateFormatToLocale(pref: DateFormatPreference): SupportedLocale {
  return pref === 'us' ? 'en-US' : 'en-AU';
}

/** Inverse of {@link dateFormatToLocale}. */
export function localeToDateFormat(locale: SupportedLocale): DateFormatPreference {
  return locale === 'en-US' ? 'us' : 'au';
}

/**
 * A value `formatDate` and friends can convert to a `Date` object.
 *
 * - `Date` — used as-is.
 * - `number` — interpreted as a millisecond Unix timestamp.
 * - `string` — parsed via {@link parseIsoDate} (accepts `YYYY-MM-DD` and full
 *   ISO 8601 strings). Anything else returns `null` / "Invalid Date".
 */
export type DateInput = Date | string | number;

function toDate(input: DateInput): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return parseIsoDate(input);
}

/**
 * Parse a `YYYY-MM-DD` or full ISO 8601 string into a `Date`.
 *
 * Returns `null` for any input that fails to parse to a valid `Date`.
 * This is intentionally permissive (the platform `new Date(string)` is the
 * canonical parser) but always returns `null` rather than `Invalid Date`,
 * which is easier to branch on in calling code.
 */
export function parseIsoDate(input: string): Date | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Format a date as `DD/MM/YYYY` (en-AU default) or `MM/DD/YYYY` (en-US).
 *
 * Returns the literal string `'—'` for inputs that cannot be parsed, so the
 * UI shows a typographic dash rather than `Invalid Date` or an empty cell.
 */

/**
 * Parse a calendar date string to ISO `YYYY-MM-DD`, or null.
 * Accepts already-ISO strings and rejects Invalid Date (bsuite#1610).
 * Prefer this over `new Date(s)` when feeding wage/age fields.
 */
export function tryParseCalendarDateToIso(input: string, preference: DateFormatPreference = DEFAULT_DATE_FORMAT): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const raw = input.trim();
  // ISO first
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const iso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const d = parseIsoDate(iso);
    if (!d) return null;
    // Verify UTC calendar components round-trip
    if (
      d.getUTCFullYear() !== Number(isoMatch[1]) ||
      d.getUTCMonth() + 1 !== Number(isoMatch[2]) ||
      d.getUTCDate() !== Number(isoMatch[3])
    ) {
      return null;
    }
    return iso;
  }
  const cleaned = raw.replace(/[^0-9/\-.]/g, '');
  const parts = cleaned.split(/[/\-.]/).filter(Boolean);
  if (parts.length !== 3) return null;
  let day: string, month: string, year: string;
  if (preference === 'us') {
    [month, day, year] = parts;
  } else {
    [day, month, year] = parts;
  }
  if (day.length === 1) day = `0${day}`;
  if (month.length === 1) month = `0${month}`;
  if (year.length === 2) year = `${Number(year) > 50 ? '19' : '20'}${year}`;
  if (year.length !== 4 || day.length !== 2 || month.length !== 2) return null;
  return tryParseCalendarDateToIso(`${year}-${month}-${day}`, preference);
}

export function formatDate(
  input: DateInput,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const date = toDate(input);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a date with a 24-hour (en-AU) or 12-hour (en-US) time component.
 *
 * Example en-AU: `25/03/2026, 14:30`.
 * Example en-US: `03/25/2026, 02:30 PM`.
 */
export function formatDateTime(
  input: DateInput,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const date = toDate(input);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en-US',
  }).format(date);
}

/**
 * Format the time portion only — 24-hour for en-AU, 12-hour for en-US.
 */
export function formatTime(
  input: DateInput,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const date = toDate(input);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en-US',
  }).format(date);
}

/**
 * Format a date relative to `now` (e.g. "3 days ago", "in 2 hours").
 *
 * Uses {@link Intl.RelativeTimeFormat} with the largest unit that's ≥ 1.
 * `now` is exposed so tests can pin the comparison point.
 */
export function formatRelative(
  input: DateInput,
  locale: SupportedLocale = DEFAULT_LOCALE,
  now: Date = new Date(),
): string {
  const date = toDate(input);
  if (!date) return '—';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const sign = Math.sign(diffMs) || 1;

  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  if (absMs < MIN) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (absMs < HOUR) return rtf.format(Math.round(diffMs / MIN), 'minute');
  if (absMs < DAY) return rtf.format(Math.round(diffMs / HOUR), 'hour');
  if (absMs < WEEK) return rtf.format(Math.round(diffMs / DAY), 'day');
  if (absMs < MONTH) return rtf.format(Math.round(diffMs / WEEK), 'week');
  if (absMs < YEAR) return rtf.format(Math.round(diffMs / MONTH), 'month');
  return rtf.format(sign * Math.floor(absMs / YEAR), 'year');
}

/**
 * Format a date range, collapsing shared components.
 *
 * Examples (en-AU):
 * - Same day:    `25/03/2026`
 * - Same month:  `1 – 5 March 2026`
 * - Same year:   `1 Jan – 31 Dec 2026`
 * - Spans years: `25/12/2025 – 5/01/2026`
 *
 * Uses {@link Intl.DateTimeFormat.formatRange} where available (all modern
 * runtimes used by BSuite — Node 20+, Vite browser targets — support it).
 */
export function formatDateRange(
  start: DateInput,
  end: DateInput,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return '—';

  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  const sameDay = sameMonth && s.getDate() === e.getDate();

  if (sameDay) return formatDate(s, locale);

  const fmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: sameMonth ? 'long' : 'short',
    year: sameYear ? 'numeric' : 'numeric',
  });

  // Use formatRange when both endpoints share a year — collapses redundant
  // year/month components automatically. Fall back to a manual join for the
  // cross-year case so we always render both years.
  if (sameYear && typeof fmt.formatRange === 'function') {
    return fmt.formatRange(s, e);
  }

  return `${formatDate(s, locale)} – ${formatDate(e, locale)}`;
}
