import { describe, expect, it } from 'vitest';
import { needsQuoting, parseTsv, quoteCell, serializeTsv } from './tsv.js';

describe('needsQuoting', () => {
  it('is false for plain text', () => {
    expect(needsQuoting('hello world')).toBe(false);
    expect(needsQuoting('')).toBe(false);
    expect(needsQuoting('123.45')).toBe(false);
  });

  it('is true for tab, newline, CR, or quote', () => {
    expect(needsQuoting('a\tb')).toBe(true);
    expect(needsQuoting('a\nb')).toBe(true);
    expect(needsQuoting('a\rb')).toBe(true);
    expect(needsQuoting('a"b')).toBe(true);
  });
});

describe('quoteCell', () => {
  it('leaves plain cells bare', () => {
    expect(quoteCell('hello')).toBe('hello');
  });

  it('wraps and doubles quotes for a cell containing a quote', () => {
    expect(quoteCell('she said "hi"')).toBe('"she said ""hi"""');
  });

  it('wraps a cell containing a tab', () => {
    expect(quoteCell('a\tb')).toBe('"a\tb"');
  });
});

describe('serializeTsv', () => {
  it('joins cells with tabs and rows with newlines', () => {
    expect(serializeTsv([['a', 'b'], ['c', 'd']])).toBe('a\tb\nc\td');
  });

  it('quotes only cells that need it', () => {
    expect(serializeTsv([['plain', 'has\ttab'], ['has"quote', 'ok']])).toBe(
      'plain\t"has\ttab"\n"has""quote"\tok',
    );
  });

  it('preserves empty cells', () => {
    expect(serializeTsv([['a', '', 'c']])).toBe('a\t\tc');
  });
});

describe('parseTsv', () => {
  it('parses a simple grid', () => {
    expect(parseTsv('a\tb\nc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('parses a single empty cell from an empty string', () => {
    expect(parseTsv('')).toEqual([['']]);
  });

  it('accepts CRLF row separators (Excel on Windows)', () => {
    expect(parseTsv('a\tb\r\nc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('accepts bare CR row separators', () => {
    expect(parseTsv('a\tb\rc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('does not manufacture an extra empty row from a single trailing newline', () => {
    expect(parseTsv('a\tb\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('unescapes a doubled quote inside a quoted cell', () => {
    expect(parseTsv('"she said ""hi"""\tok')).toEqual([['she said "hi"', 'ok']]);
  });

  it('preserves an embedded tab inside a quoted cell', () => {
    expect(parseTsv('"a\tb"\tc')).toEqual([['a\tb', 'c']]);
  });

  it('preserves an embedded newline inside a quoted cell', () => {
    expect(parseTsv('"line1\nline2"\tc')).toEqual([['line1\nline2', 'c']]);
  });

  it('preserves empty cells including a trailing empty cell', () => {
    expect(parseTsv('a\t\tc\t')).toEqual([['a', '', 'c', '']]);
  });

  it('round-trips a grid containing tabs, newlines and quotes in every cell shape', () => {
    const grid = [
      ['plain', 'has\ttab', 'has\nnewline'],
      ['has"quote', '', 'trailing\t'],
    ];
    const tsv = serializeTsv(grid);
    expect(parseTsv(tsv)).toEqual(grid);
  });

  it('round-trips a large-ish rectangular grid', () => {
    const grid = Array.from({ length: 25 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => `r${r}c${c}`),
    );
    const tsv = serializeTsv(grid);
    expect(parseTsv(tsv)).toEqual(grid);
  });
});
