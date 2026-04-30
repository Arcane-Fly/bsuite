import { describe, it, expect } from 'vitest';
import { toCsv, toCsvBlob, parseCsv } from './index.js';

const BOM = '\ufeff';

describe('toCsv', () => {
  it('prepends UTF-8 BOM by default', () => {
    const csv = toCsv([{ a: 1 }]);
    expect(csv.startsWith(BOM)).toBe(true);
  });

  it('omits BOM when bom=false', () => {
    const csv = toCsv([{ a: 1 }], { bom: false });
    expect(csv.startsWith(BOM)).toBe(false);
  });

  it('returns BOM-only for empty rows with bom=true', () => {
    expect(toCsv([])).toBe(BOM);
  });

  it('returns empty string for empty rows with bom=false', () => {
    expect(toCsv([], { bom: false })).toBe('');
  });

  it('writes headers in union-of-keys order by default', () => {
    const csv = toCsv([{ a: 1, b: 2 }, { c: 3 }], { bom: false });
    expect(csv.split(/\r?\n/)[0]).toBe('a,b,c');
  });

  it('writes headers in explicit order when provided', () => {
    const csv = toCsv([{ a: 1, b: 2, c: 3 }], { bom: false, headers: ['c', 'a'] });
    const lines = csv.split(/\r?\n/);
    expect(lines[0]).toBe('c,a');
    expect(lines[1]).toBe('3,1');
  });

  it('escapes values containing delimiter, quote, or newline', () => {
    const csv = toCsv(
      [{ a: 'has, comma', b: 'has "quote"', c: 'has\nnewline' }],
      { bom: false },
    );
    expect(csv).toContain('"has, comma"');
    expect(csv).toContain('"has ""quote"""');
    expect(csv).toContain('"has\nnewline"');
  });

  it('sanitises formula-leading strings by default', () => {
    const csv = toCsv([{ formula: '=HYPERLINK("evil")' }], { bom: false });
    expect(csv).toContain("'=HYPERLINK");
  });

  it('skips sanitisation when sanitize=off', () => {
    const csv = toCsv([{ v: '-100' }], { bom: false, sanitize: 'off' });
    expect(csv).toContain('-100');
    expect(csv).not.toContain("'-100");
  });

  it('uses CRLF line endings by default', () => {
    const csv = toCsv([{ a: 1 }, { a: 2 }], { bom: false });
    expect(csv).toContain('\r\n');
  });

  it('honours custom newline', () => {
    const csv = toCsv([{ a: 1 }, { a: 2 }], { bom: false, newline: '\n' });
    expect(csv).not.toContain('\r\n');
    expect(csv.split('\n')).toHaveLength(3); // header + 2 rows, no trailing newline
  });

  it('honours custom delimiter', () => {
    const csv = toCsv([{ a: 1, b: 2 }], { bom: false, delimiter: ';' });
    expect(csv.split(/\r?\n/)[0]).toBe('a;b');
  });

  it('coerces Date, null, boolean, bigint consistently', () => {
    const csv = toCsv(
      [
        {
          when: new Date('2026-04-28T00:00:00.000Z'),
          empty: null,
          flag: true,
          big: 9007199254740993n,
        },
      ],
      { bom: false },
    );
    const [header, data] = csv.split(/\r?\n/);
    expect(header).toBe('when,empty,flag,big');
    expect(data).toBe('2026-04-28T00:00:00.000Z,,true,9007199254740993');
  });
});

describe('toCsvBlob', () => {
  it('returns a Blob with csv MIME type', () => {
    const blob = toCsvBlob([{ a: 1 }]);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('parseCsv', () => {
  it('parses a simple CSV string', async () => {
    const result = await parseCsv('a,b\n1,2\n3,4');
    expect(result.headers).toEqual(['a', 'b']);
    expect(result.rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
    expect(result.totalRows).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('does NOT apply dynamic typing by default (preserves leading zeros)', async () => {
    const result = await parseCsv('zip\n00123');
    expect(result.rows[0]!.zip).toBe('00123');
  });

  it('applies dynamic typing when opted in', async () => {
    const result = await parseCsv('n\n42', { dynamicTyping: true });
    expect(result.rows[0]!.n).toBe(42);
  });

  it('trims header whitespace by default', async () => {
    const result = await parseCsv('  name  , age \nAda,30');
    expect(result.headers).toEqual(['name', 'age']);
  });

  it('honours custom header transform', async () => {
    const result = await parseCsv('Name,Age\nAda,30', {
      transformHeader: (h) => h.toLowerCase(),
    });
    expect(result.headers).toEqual(['name', 'age']);
  });

  it('skips empty lines by default', async () => {
    const result = await parseCsv('a\n1\n\n2\n');
    expect(result.totalRows).toBe(2);
  });

  it('parses from a Blob', async () => {
    const blob = new Blob(['a,b\n1,2'], { type: 'text/csv' });
    const result = await parseCsv(blob);
    expect(result.rows).toEqual([{ a: '1', b: '2' }]);
  });

  it('parses from an ArrayBuffer', async () => {
    const bytes = new TextEncoder().encode('a\n1');
    // Copy into a fresh ArrayBuffer so the slice is independent of the view.
    const ab = bytes.slice().buffer as ArrayBuffer;
    const result = await parseCsv(ab);
    expect(result.rows).toEqual([{ a: '1' }]);
  });
});

describe('CSV round-trip', () => {
  it('preserves data through toCsv → parseCsv', async () => {
    const original = [
      { name: 'Ada Lovelace', role: 'Mathematician', year: 1815 },
      { name: 'Grace Hopper', role: 'Admiral', year: 1906 },
    ];
    const csv = toCsv(original, { bom: false });
    const parsed = await parseCsv(csv, { dynamicTyping: true });
    expect(parsed.rows).toEqual(original);
  });
});

describe('parseCsv prototype-pollution guard', () => {
  it('strips __proto__, constructor, prototype keys from parsed rows', async () => {
    const csv = 'name,__proto__,constructor,prototype\nAda,evil,evil,evil';
    const result = await parseCsv(csv);
    expect(result.rows[0]).toEqual({ name: 'Ada' });
    expect(result.headers).toEqual(['name']);
    // Object.prototype is untouched
    expect(({} as Record<string, unknown>)['evil']).toBeUndefined();
  });

  it('strips forbidden keys from the headers list', async () => {
    const csv = '__proto__,safe\nevil,ok';
    const result = await parseCsv(csv);
    expect(result.headers).toEqual(['safe']);
  });
});

describe('parseCsv input variants', () => {
  it('parses from Uint8Array', async () => {
    const bytes = new TextEncoder().encode('a,b\n1,2');
    const result = await parseCsv(bytes);
    expect(result.rows).toEqual([{ a: '1', b: '2' }]);
  });
});
