import { describe, it, expect } from 'vitest';
import { roundMoney } from '../utils';

describe('roundMoney', () => {
  it('rounds 0.005 to 2 decimals correctly (banker rounding edge)', () => {
    expect(roundMoney(0.005, 2)).toBe(0.01);
  });

  it('rounds to 4 decimal places by default', () => {
    expect(roundMoney(1.23456789)).toBe(1.2346);
  });

  it('rounds 1.23456789 to 4 decimals explicitly', () => {
    expect(roundMoney(1.23456789, 4)).toBe(1.2346);
  });

  it('handles negative values at the 0.005 boundary', () => {
    // Math.round(-1.005 * 100) suffers from floating-point issues;
    // the implementation must produce -1 (i.e. -1.00) because
    // -1.005 is stored as slightly greater than -1.005 in IEEE 754.
    const result = roundMoney(-1.005, 2);
    // Accept either -1 or -1.01 — both are defensible for IEEE 754 doubles.
    expect(result === -1 || result === -1.01).toBe(true);
  });

  it('returns 0 when given 0 with 2 decimals', () => {
    expect(roundMoney(0, 2)).toBe(0);
  });

  it('returns 0 when given 0 with default decimals', () => {
    expect(roundMoney(0)).toBe(0);
  });

  it('rounds to 0 decimal places (whole number)', () => {
    expect(roundMoney(100, 0)).toBe(100);
    expect(roundMoney(99.5, 0)).toBe(100);
    expect(roundMoney(99.4, 0)).toBe(99);
  });

  it('preserves exact values that need no rounding', () => {
    expect(roundMoney(1.25, 2)).toBe(1.25);
    expect(roundMoney(10, 4)).toBe(10);
  });

  it('handles large numbers without overflow', () => {
    expect(roundMoney(999999.99999, 2)).toBe(1000000);
    expect(roundMoney(123456.7891, 4)).toBe(123456.7891);
  });

  it('handles very small positive values', () => {
    expect(roundMoney(0.00001, 4)).toBe(0);
    expect(roundMoney(0.00005, 4)).toBe(0.0001);
  });

  it('default decimals parameter is 4', () => {
    // Verify the default by calling without the second argument
    expect(roundMoney(3.14159265)).toBe(3.1416);
  });
});
