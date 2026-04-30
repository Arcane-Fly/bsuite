import { describe, it, expect } from 'vitest';
import { sanitizeForFormula, applySanitize } from '../sanitize.js';

describe('sanitizeForFormula', () => {
  it.each([
    ['=SUM(A1:A10)', "'=SUM(A1:A10)"],
    ['+1+1', "'+1+1"],
    ['-DDE_EXPLOIT', "'-DDE_EXPLOIT"],
    ['@cmd', "'@cmd"],
    ['\tleading-tab', "'\tleading-tab"],
    ['\rleading-cr', "'\rleading-cr"],
  ])('guards OWASP leading char %j', (input, expected) => {
    expect(sanitizeForFormula(input)).toBe(expected);
  });

  it.each(['|pipe', '%percent', '#hash', '$100', '(paren)', 'safe-value', '  spaces'])(
    'passes through non-OWASP leading char %j',
    (input) => {
      expect(sanitizeForFormula(input)).toBe(input);
    },
  );

  it('leaves empty strings alone', () => {
    expect(sanitizeForFormula('')).toBe('');
  });

  it.each([
    [42, 42],
    [true, true],
    [false, false],
    [null, null],
    [undefined, undefined],
  ])('leaves non-string value %j untouched', (input, expected) => {
    expect(sanitizeForFormula(input)).toBe(expected);
  });

  // BigInt cannot be serialised by vitest's test-name formatter, so we test it
  // in a standalone case rather than via it.each.
  it('leaves bigint values untouched', () => {
    const big = 123n;
    expect(sanitizeForFormula(big)).toBe(big);
    expect(sanitizeForFormula(9007199254740993n)).toBe(9007199254740993n);
    expect(sanitizeForFormula(-1n)).toBe(-1n);
  });

  it('leaves Date objects untouched', () => {
    const d = new Date('2026-04-28');
    expect(sanitizeForFormula(d)).toBe(d);
  });

  it('only guards the FIRST character (mid-string = is safe)', () => {
    expect(sanitizeForFormula('a=b')).toBe('a=b');
    expect(sanitizeForFormula('1+1=2')).toBe('1+1=2');
  });
});

describe('applySanitize', () => {
  it('strict mode sanitises', () => {
    expect(applySanitize('=evil', 'strict')).toBe("'=evil");
  });

  it('off mode leaves value untouched', () => {
    expect(applySanitize('=evil', 'off')).toBe('=evil');
  });

  it('off mode preserves negative currency string', () => {
    expect(applySanitize('-$100.00', 'off')).toBe('-$100.00');
  });

  it('strict mode guards negative currency string', () => {
    expect(applySanitize('-$100.00', 'strict')).toBe("'-$100.00");
  });
});
