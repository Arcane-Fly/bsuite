import { describe, it, expect } from 'vitest';
import { detectFormat } from '../detect.js';

describe('detectFormat', () => {
  it.each([
    ['report.csv', 'csv'],
    ['report.xlsx', 'xlsx'],
    ['report.xls', 'xlsx'],
    ['data.json', 'json'],
    ['NESTED/PATH/file.CSV', 'csv'],
    ['UPPER.XLSX', 'xlsx'],
  ])('detects %j → %s', (name, expected) => {
    expect(detectFormat(name)).toBe(expected);
  });

  it('detects from a File object', () => {
    const file = new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' });
    expect(detectFormat(file)).toBe('csv');
  });

  it('throws for unknown extension', () => {
    expect(() => detectFormat('data.txt')).toThrow(/unsupported file extension ".txt"/);
  });

  it('throws for no extension', () => {
    expect(() => detectFormat('README')).toThrow(/unsupported file extension/);
  });

  it('handles multiple dots (uses last segment)', () => {
    expect(detectFormat('archive.2026.csv')).toBe('csv');
  });
});
