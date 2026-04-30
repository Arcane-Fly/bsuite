import { describe, it, expect } from 'vitest';
import { coerceCell, unionHeaders, prepareRow } from '../coerce.js';

describe('coerceCell', () => {
  it('returns empty string for null', () => {
    expect(coerceCell(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(coerceCell(undefined)).toBe('');
  });

  it('passes strings through unchanged', () => {
    expect(coerceCell('hello')).toBe('hello');
    expect(coerceCell('')).toBe('');
  });

  it('passes finite numbers through as numbers (preserves Excel numeric semantics)', () => {
    expect(coerceCell(42)).toBe(42);
    expect(coerceCell(-3.14)).toBe(-3.14);
    expect(coerceCell(0)).toBe(0);
  });

  it('returns empty string for NaN / +Infinity / -Infinity', () => {
    expect(coerceCell(Number.NaN)).toBe('');
    expect(coerceCell(Number.POSITIVE_INFINITY)).toBe('');
    expect(coerceCell(Number.NEGATIVE_INFINITY)).toBe('');
  });

  it('coerces booleans with default labels', () => {
    expect(coerceCell(true)).toBe('true');
    expect(coerceCell(false)).toBe('false');
  });

  it('coerces booleans with custom labels', () => {
    expect(coerceCell(true, { booleanLabels: { true: 'Yes', false: 'No' } })).toBe('Yes');
    expect(coerceCell(false, { booleanLabels: { true: 'Yes', false: 'No' } })).toBe('No');
  });

  it('coerces bigint to decimal string', () => {
    expect(coerceCell(9007199254740993n)).toBe('9007199254740993');
    expect(coerceCell(-1n)).toBe('-1');
  });

  it('coerces Date to ISO by default', () => {
    const d = new Date('2026-04-28T10:00:00.000Z');
    expect(coerceCell(d)).toBe('2026-04-28T10:00:00.000Z');
  });

  it('coerces Date to locale when requested', () => {
    const d = new Date('2026-04-28T10:00:00.000Z');
    expect(coerceCell(d, { dateFormat: 'locale' })).toBe(d.toLocaleString());
  });

  it('returns empty for invalid Date', () => {
    expect(coerceCell(new Date('not-a-date'))).toBe('');
  });

  it('throws TypeError for function values with key hint', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => coerceCell((() => 1) as any, undefined, 'callback')).toThrow(
      /cannot coerce value of type function \(key: callback\)/,
    );
  });

  it('throws TypeError for symbol values', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => coerceCell(Symbol('s') as any)).toThrow(TypeError);
  });

  it('throws TypeError for plain objects', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => coerceCell({ nested: true } as any)).toThrow(TypeError);
  });
});

describe('unionHeaders', () => {
  it('returns empty for empty input', () => {
    expect(unionHeaders([])).toEqual([]);
  });

  it('returns keys of single row in insertion order', () => {
    expect(unionHeaders([{ b: 1, a: 2, c: 3 }])).toEqual(['b', 'a', 'c']);
  });

  it('unions keys across rows preserving first-seen order', () => {
    const rows = [
      { name: 'Ada', age: 30 },
      { age: 25, city: 'Perth' },
      { name: 'Grace', country: 'AU' },
    ];
    expect(unionHeaders(rows)).toEqual(['name', 'age', 'city', 'country']);
  });
});

describe('prepareRow', () => {
  it('maps values in header order', () => {
    const row = { a: 1, b: 'two', c: true };
    const out = prepareRow(row, ['c', 'a', 'b'], 'strict');
    expect(out).toEqual(['true', 1, 'two']);
  });

  it('fills missing keys with empty string', () => {
    const out = prepareRow({ a: 1 }, ['a', 'b', 'c'], 'strict');
    expect(out).toEqual([1, '', '']);
  });

  it('sanitises string cells when mode is strict', () => {
    const out = prepareRow({ evil: '=SUM(A1)' }, ['evil'], 'strict');
    expect(out).toEqual(["'=SUM(A1)"]);
  });

  it('does not sanitise when mode is off', () => {
    const out = prepareRow({ evil: '=SUM(A1)' }, ['evil'], 'off');
    expect(out).toEqual(['=SUM(A1)']);
  });

  it('preserves numeric type through pipeline', () => {
    const out = prepareRow({ n: 42 }, ['n'], 'strict');
    expect(out).toEqual([42]);
    expect(typeof out[0]).toBe('number');
  });
});
