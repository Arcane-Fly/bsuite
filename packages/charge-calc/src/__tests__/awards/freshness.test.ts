import { describe, it, expect } from 'vitest';
import { getFinancialYear, checkRateFreshness } from '../../awards/freshness';

describe('getFinancialYear()', () => {
  it('returns 2024 for 2024-06-30 (last day of FY2024)', () => {
    expect(getFinancialYear(new Date('2024-06-30'))).toBe(2024);
  });

  it('returns 2025 for 2024-07-01 (first day of FY2025)', () => {
    expect(getFinancialYear(new Date('2024-07-01'))).toBe(2025);
  });

  it('returns 2025 for 2025-01-15 (mid FY2025)', () => {
    expect(getFinancialYear(new Date('2025-01-15'))).toBe(2025);
  });

  it('returns 2026 for 2025-07-01 (first day of FY2026)', () => {
    expect(getFinancialYear(new Date('2025-07-01'))).toBe(2026);
  });

  it('returns a number when called with no arguments (default param)', () => {
    const result = getFinancialYear();
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(2020);
  });
});

describe('checkRateFreshness()', () => {
  it('returns not stale for a rate 14 days old in the same FY', () => {
    const result = checkRateFreshness('2024-07-01', new Date('2024-07-15'));
    expect(result.isStale).toBe(false);
    expect(result.warningMessage).toBeNull();
  });

  it('returns stale for a rate 62 days old', () => {
    const result = checkRateFreshness('2024-07-01', new Date('2024-09-01'));
    expect(result.isStale).toBe(true);
    expect(result.warningMessage).not.toBeNull();
  });

  it('returns stale when rate is from a different FY', () => {
    // 2024-06-01 is FY2024, 2024-07-15 is FY2025
    const result = checkRateFreshness('2024-06-01', new Date('2024-07-15'));
    expect(result.isStale).toBe(true);
    expect(result.warningMessage).not.toBeNull();
  });

  it('returns not stale for a rate only 1 day old in the same FY', () => {
    const result = checkRateFreshness('2024-07-01', new Date('2024-07-02'));
    expect(result.isStale).toBe(false);
    expect(result.warningMessage).toBeNull();
  });

  it('includes FY info in warning when stale due to FY mismatch', () => {
    const result = checkRateFreshness('2024-06-01', new Date('2024-07-15'));
    expect(result.warningMessage).toContain('FY2024');
    expect(result.warningMessage).toContain('FY2025');
  });

  it('includes day count in warning when stale due to age', () => {
    const result = checkRateFreshness('2024-07-01', new Date('2024-09-01'));
    expect(result.warningMessage).toContain('days ago');
    expect(result.warningMessage).toContain('62');
  });

  it('sets lastUpdated to the parsed rate date', () => {
    const result = checkRateFreshness('2024-07-01', new Date('2024-07-15'));
    expect(result.lastUpdated).toBeInstanceOf(Date);
    expect(result.lastUpdated?.toISOString()).toContain('2024-07-01');
  });

  it('sets currentFY and rateFY correctly', () => {
    const result = checkRateFreshness('2024-06-01', new Date('2024-07-15'));
    expect(result.rateFY).toBe(2024);
    expect(result.currentFY).toBe(2025);
  });

  it('prioritises FY mismatch warning over day-count warning', () => {
    // Rate from FY2024 assessed in FY2025 and also >30 days old
    const result = checkRateFreshness('2024-06-01', new Date('2024-08-15'));
    expect(result.isStale).toBe(true);
    expect(result.warningMessage).toContain('FY2024');
    expect(result.warningMessage).toContain('FY2025');
    // Should not contain the day-count style warning
    expect(result.warningMessage).not.toContain('days ago');
  });
});
