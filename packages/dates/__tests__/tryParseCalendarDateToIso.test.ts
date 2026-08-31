import { describe, expect, it } from 'vitest';
import { tryParseCalendarDateToIso, parseIsoDate } from '../src/formatDate.js';

describe('tryParseCalendarDateToIso (bsuite#1610)', () => {
  it('accepts ISO yyyy-mm-dd', () => {
    expect(tryParseCalendarDateToIso('1990-05-15')).toBe('1990-05-15');
  });

  it('rejects invalid calendar dates', () => {
    expect(tryParseCalendarDateToIso('1990-02-31')).toBeNull();
  });

  it('parses AU dd/mm/yyyy', () => {
    expect(tryParseCalendarDateToIso('15/05/1990', 'au')).toBe('1990-05-15');
  });

  it('parseIsoDate never returns Invalid Date', () => {
    expect(parseIsoDate('not-a-date')).toBeNull();
    expect(parseIsoDate('1990-05-15')).toBeInstanceOf(Date);
  });
});
