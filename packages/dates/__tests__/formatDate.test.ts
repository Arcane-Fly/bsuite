import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_LOCALE,
  dateFormatToLocale,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatRelative,
  formatTime,
  localeToDateFormat,
  parseIsoDate,
} from '../src/formatDate.js';

describe('defaults', () => {
  it('defaults to en-AU + au preference', () => {
    expect(DEFAULT_LOCALE).toBe('en-AU');
    expect(DEFAULT_DATE_FORMAT).toBe('au');
  });
});

describe('dateFormatToLocale / localeToDateFormat', () => {
  it('maps au → en-AU and us → en-US', () => {
    expect(dateFormatToLocale('au')).toBe('en-AU');
    expect(dateFormatToLocale('us')).toBe('en-US');
  });

  it('round-trips', () => {
    expect(localeToDateFormat('en-AU')).toBe('au');
    expect(localeToDateFormat('en-US')).toBe('us');
  });
});

describe('parseIsoDate', () => {
  it('parses YYYY-MM-DD', () => {
    const d = parseIsoDate('2026-03-25');
    expect(d).toBeInstanceOf(Date);
    // YYYY-MM-DD is interpreted as UTC midnight by `new Date`
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(2); // March = 2
    expect(d?.getUTCDate()).toBe(25);
  });

  it('parses full ISO 8601 with time + offset', () => {
    const d = parseIsoDate('2026-03-25T14:30:00+11:00');
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe('2026-03-25T03:30:00.000Z');
  });

  it('returns null for invalid string', () => {
    expect(parseIsoDate('not-a-date')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseIsoDate('')).toBeNull();
  });
});

describe('formatDate', () => {
  // Use a UTC-anchored date so the formatted output is stable across CI/local
  // timezones. `Date.UTC(2026, 2, 25, 12)` is mid-day UTC on 25 March 2026 —
  // safely on the 25th in both AU and US wall-clock.
  const sample = new Date(Date.UTC(2026, 2, 25, 12, 0, 0));

  it('formats DD/MM/YYYY for en-AU', () => {
    expect(formatDate(sample, 'en-AU')).toBe('25/03/2026');
  });

  it('formats MM/DD/YYYY for en-US', () => {
    expect(formatDate(sample, 'en-US')).toBe('03/25/2026');
  });

  it('defaults to en-AU when locale omitted', () => {
    expect(formatDate(sample)).toBe('25/03/2026');
  });

  it('accepts a number (ms timestamp)', () => {
    expect(formatDate(sample.getTime(), 'en-AU')).toBe('25/03/2026');
  });

  it('accepts a YYYY-MM-DD string', () => {
    expect(formatDate('2026-03-25', 'en-AU')).toBe('25/03/2026');
  });

  it('returns em-dash for invalid input', () => {
    expect(formatDate('not-a-date', 'en-AU')).toBe('—');
    expect(formatDate(new Date('garbage'), 'en-AU')).toBe('—');
  });

  it('handles AU autumn DST boundary (Apr 1 2026)', () => {
    // DST in Sydney ends 5 April 2026 — Apr 1 sits inside DST. The format
    // output is independent of TZ since we use 2-digit day/month/year.
    const aprilFirst = new Date(Date.UTC(2026, 3, 1, 12, 0, 0));
    expect(formatDate(aprilFirst, 'en-AU')).toBe('01/04/2026');
  });

  it('handles AU spring DST boundary (Oct 1 2026)', () => {
    // DST in Sydney starts 4 October 2026 — Oct 1 is just before.
    const octoberFirst = new Date(Date.UTC(2026, 9, 1, 12, 0, 0));
    expect(formatDate(octoberFirst, 'en-AU')).toBe('01/10/2026');
  });
});

describe('formatDateTime', () => {
  const sample = new Date(Date.UTC(2026, 2, 25, 3, 30, 0));

  it('uses 24-hour time for en-AU', () => {
    const out = formatDateTime(sample, 'en-AU');
    // Should contain "25/03/2026" and no AM/PM marker
    expect(out).toMatch(/25\/03\/2026/);
    expect(out).not.toMatch(/AM|PM/i);
  });

  it('uses 12-hour time for en-US', () => {
    const out = formatDateTime(sample, 'en-US');
    expect(out).toMatch(/03\/25\/2026/);
    expect(out).toMatch(/AM|PM/i);
  });

  it('returns em-dash for invalid input', () => {
    expect(formatDateTime('garbage', 'en-AU')).toBe('—');
  });
});

describe('formatTime', () => {
  const sample = new Date(Date.UTC(2026, 2, 25, 14, 30, 0));

  it('formats 24-hour for en-AU', () => {
    const out = formatTime(sample, 'en-AU');
    expect(out).not.toMatch(/AM|PM/i);
  });

  it('formats 12-hour for en-US', () => {
    const out = formatTime(sample, 'en-US');
    expect(out).toMatch(/AM|PM/i);
  });

  it('returns em-dash for invalid input', () => {
    expect(formatTime('garbage', 'en-AU')).toBe('—');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-03-25T12:00:00Z');

  it('formats past minutes', () => {
    const past = new Date(now.getTime() - 5 * 60_000);
    const out = formatRelative(past, 'en-AU', now);
    expect(out).toMatch(/5/);
    expect(out.toLowerCase()).toMatch(/ago|minute/);
  });

  it('formats future hours', () => {
    const future = new Date(now.getTime() + 2 * 60 * 60_000);
    const out = formatRelative(future, 'en-AU', now);
    expect(out).toMatch(/2/);
    expect(out.toLowerCase()).toMatch(/in|hour/);
  });

  it('formats past days', () => {
    const past = new Date(now.getTime() - 3 * 24 * 60 * 60_000);
    const out = formatRelative(past, 'en-AU', now);
    expect(out).toMatch(/3/);
    expect(out.toLowerCase()).toMatch(/day|ago/);
  });

  it('formats years', () => {
    const past = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60_000);
    const out = formatRelative(past, 'en-AU', now);
    expect(out).toMatch(/2/);
    expect(out.toLowerCase()).toMatch(/year|ago/);
  });

  it('returns em-dash for invalid input', () => {
    expect(formatRelative('garbage', 'en-AU', now)).toBe('—');
  });
});

describe('formatDateRange', () => {
  it('collapses to a single date when start === end', () => {
    const d = new Date(Date.UTC(2026, 2, 25, 12));
    expect(formatDateRange(d, d, 'en-AU')).toBe('25/03/2026');
  });

  it('formats within-year ranges', () => {
    const start = new Date(Date.UTC(2026, 0, 1, 12));
    const end = new Date(Date.UTC(2026, 11, 31, 12));
    const out = formatDateRange(start, end, 'en-AU');
    // Should mention 2026 once (within-year collapse via formatRange)
    expect(out).toMatch(/2026/);
  });

  it('falls back to two full dates across years', () => {
    const start = new Date(Date.UTC(2025, 11, 25, 12));
    const end = new Date(Date.UTC(2026, 0, 5, 12));
    const out = formatDateRange(start, end, 'en-AU');
    expect(out).toMatch(/2025/);
    expect(out).toMatch(/2026/);
  });

  it('returns em-dash for invalid endpoints', () => {
    expect(formatDateRange('garbage', '2026-03-25', 'en-AU')).toBe('—');
  });
});
