import { describe, it, expect } from 'vitest';
import { toXlsx, toXlsxBlob, parseXlsx } from './index.js';

describe('toXlsx', () => {
  it('writes a single sheet round-trip', async () => {
    const rows = [
      { name: 'Ada', age: 30 },
      { name: 'Grace', age: 35 },
    ];
    const bytes = await toXlsx({ name: 'People', rows });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(0);

    const parsed = await parseXlsx(bytes);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.name).toBe('People');
    expect(parsed[0]!.headers).toEqual(['name', 'age']);
    expect(parsed[0]!.rows).toEqual(rows);
  });

  it('writes multi-sheet workbook', async () => {
    const bytes = await toXlsx([
      { name: 'Sheet1', rows: [{ a: 1 }] },
      { name: 'Sheet2', rows: [{ b: 2 }] },
      { name: 'Sheet3', rows: [{ c: 3 }] },
    ]);
    const parsed = await parseXlsx(bytes);
    expect(parsed.map((s) => s.name)).toEqual(['Sheet1', 'Sheet2', 'Sheet3']);
    expect(parsed[0]!.rows).toEqual([{ a: 1 }]);
    expect(parsed[2]!.rows).toEqual([{ c: 3 }]);
  });

  it('throws when no sheets provided', async () => {
    await expect(toXlsx([])).rejects.toThrow(/at least one sheet/);
  });

  it('honours explicit header order', async () => {
    const bytes = await toXlsx({
      name: 'Ordered',
      rows: [{ a: 1, b: 2, c: 3 }],
      headers: ['c', 'a'],
    });
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.headers).toEqual(['c', 'a']);
    expect(parsed[0]!.rows[0]).toEqual({ c: 3, a: 1 });
  });

  it('sanitises formula-leading strings by default', async () => {
    const bytes = await toXlsx({
      name: 'Evil',
      rows: [{ payload: '=cmd|"calc"' }],
    });
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.rows[0]!.payload).toBe("'=cmd|\"calc\"");
  });

  it('skips sanitise when mode=off', async () => {
    const bytes = await toXlsx(
      { name: 'Trusted', rows: [{ v: '-100' }] },
      { sanitize: 'off' },
    );
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.rows[0]!.v).toBe('-100');
  });

  it('truncates sheet names longer than 31 chars', async () => {
    const longName = 'A'.repeat(50);
    const bytes = await toXlsx({ name: longName, rows: [{ x: 1 }] });
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.name).toHaveLength(31);
  });

  it('replaces illegal sheet-name chars', async () => {
    const bytes = await toXlsx({ name: 'bad:name/slash?star*', rows: [{ x: 1 }] });
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.name).toBe('bad_name_slash_star_');
  });

  it('preserves numeric type across round-trip', async () => {
    const bytes = await toXlsx({ name: 'Numbers', rows: [{ n: 42, x: 3.14 }] });
    const parsed = await parseXlsx(bytes);
    expect(typeof parsed[0]!.rows[0]!.n).toBe('number');
    expect(parsed[0]!.rows[0]!.n).toBe(42);
    expect(parsed[0]!.rows[0]!.x).toBe(3.14);
  });

  it('honours column widths', async () => {
    const bytes = await toXlsx({
      name: 'Widths',
      rows: [{ a: 1, b: 2 }],
      columnWidths: [10, 20],
    });
    // Round-trip verifies we didn't corrupt the file; we don't assert the
    // widths survived because some readers strip them.
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.rows).toEqual([{ a: 1, b: 2 }]);
  });

  it('honours headerStyle without corrupting the file', async () => {
    // Style persistence depends on the xlsx fork; we round-trip to prove the
    // workbook is still valid and the styling path doesn't throw.
    const bytes = await toXlsx({
      name: 'Styled',
      rows: [{ a: 1, b: 2 }],
      headerStyle: { bold: true, fillColor: '0284C7', fontColor: 'FFFFFF' },
    });
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.rows).toEqual([{ a: 1, b: 2 }]);
    expect(parsed[0]!.headers).toEqual(['a', 'b']);
  });

  it('honours freezeHeader without corrupting the file', async () => {
    const bytes = await toXlsx({
      name: 'Frozen',
      rows: [{ a: 1 }, { a: 2 }],
      freezeHeader: true,
    });
    const parsed = await parseXlsx(bytes);
    expect(parsed[0]!.rows).toHaveLength(2);
  });

  it('strips prototype-pollution keys on parse', async () => {
    // Build an xlsx via the library directly so we can inject a __proto__ header.
    const XLSX = await import('@e965/xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['safe', '__proto__', 'constructor', 'prototype'],
      ['ok', 'evil-a', 'evil-b', 'evil-c'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const parsed = await parseXlsx(new Uint8Array(buffer as ArrayBuffer));
    const row = parsed[0]!.rows[0]!;
    expect(row['safe']).toBe('ok');
    expect(row).not.toHaveProperty('__proto__');
    // Object.prototype is intact (no pollution)
    expect(({} as Record<string, unknown>)['evil-a']).toBeUndefined();
  });
});

describe('toXlsxBlob', () => {
  it('returns a Blob with xlsx MIME type', async () => {
    const blob = await toXlsxBlob({ name: 'X', rows: [{ a: 1 }] });
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('parseXlsx', () => {
  it('parses only first sheet when firstSheetOnly=true', async () => {
    const bytes = await toXlsx([
      { name: 'First', rows: [{ x: 1 }] },
      { name: 'Second', rows: [{ y: 2 }] },
    ]);
    const parsed = await parseXlsx(bytes, { firstSheetOnly: true });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.name).toBe('First');
  });

  it('accepts emptyValue option without error and returns rows', async () => {
    // xlsx writers may or may not persist empty-string cells; the contract
    // here is that the emptyValue option doesn't crash and rows are still
    // parseable. The exact substitution semantics depend on @e965/xlsx's
    // internal cell persistence.
    const bytes = await toXlsx({
      name: 'Sparse',
      rows: [
        { a: 1, b: 2 },
        { a: 3 },
      ],
      headers: ['a', 'b'],
    });
    const parsed = await parseXlsx(bytes, { emptyValue: '__MISSING__' });
    expect(parsed[0]!.rows).toHaveLength(2);
    expect(parsed[0]!.rows[0]!.a).toBe(1);
    expect(parsed[0]!.rows[1]!.a).toBe(3);
  });

  it('parses from Blob', async () => {
    const blob = await toXlsxBlob({ name: 'Blob', rows: [{ a: 1 }] });
    const parsed = await parseXlsx(blob);
    expect(parsed[0]!.rows).toEqual([{ a: 1 }]);
  });
});
