/**
 * Variance test: the public `toCsv` / `toXlsx` / `SheetSpec.rows` surface
 * must accept `Record<string, unknown>[]` directly, because that is what
 * every consumer app ships (Supabase results, analytics rows, saved
 * calculation rows, etc.).
 *
 * This test exists because v0.1.1 used the narrow internal `Row` shape
 * (`Record<string, CellValue>`) as the public parameter type, which broke
 * crm7 + BSU typechecks with TS2345 on `Record<string, unknown>[]`.
 * Widening to `InputRow` (= `Record<string, unknown>`) restored those
 * call sites. The assertions below are functional (output must be
 * sensible) AND structural (the lines below would not compile if the
 * signatures ever narrow again).
 */

import { describe, it, expect } from 'vitest';
import { toCsv } from '../csv/index.js';
import { toXlsx } from '../xlsx/index.js';
import type { InputRow, SheetSpec } from '../types.js';

describe('InputRow variance (public signatures accept Record<string, unknown>[])', () => {
  it('toCsv accepts Record<string, unknown>[] without a cast', () => {
    // This call would fail to compile under 0.1.1 — the declaration below
    // is intentionally `Record<string, unknown>` (not `Row`).
    const rows: Array<Record<string, unknown>> = [
      { App: 'CRM7', Sessions: 42, Name: 'Alice' },
      { App: 'Conduit', Sessions: 17, Name: 'Bob' },
    ];
    const csv = toCsv(rows);
    expect(csv).toContain('App');
    expect(csv).toContain('CRM7');
    expect(csv).toContain('Bob');
    expect(csv).toContain('42');
  });

  it('toCsv accepts rows whose values include non-CellValue types at compile time', () => {
    // The whole point of widening to `unknown`: consumers assembling rows
    // from multiple sources (Supabase joins, computed fields, etc.) get a
    // `Record<string, unknown>` at the type level. This test pins that no
    // cast is needed — it compiles, and the sensible values round-trip.
    const rows: Array<Record<string, unknown>> = [
      { name: 'test', n: 123, b: true, nil: null },
      { name: 'other', n: 456, b: false, nil: null },
    ];
    const csv = toCsv(rows);
    expect(typeof csv).toBe('string');
    expect(csv).toContain('test');
    expect(csv).toContain('123');
    expect(csv).toContain('other');
    expect(csv).toContain('456');
  });

  it('SheetSpec.rows accepts Record<string, unknown>[] without a cast', async () => {
    const rows: Array<Record<string, unknown>> = [
      { id: 1, label: 'Alpha' },
      { id: 2, label: 'Beta' },
    ];
    const spec: SheetSpec = {
      name: 'Test',
      rows,
      headers: ['id', 'label'],
    };
    const bytes = await toXlsx(spec);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('InputRow is structurally identical to Record<string, unknown>', () => {
    // Type-level equality check — compiler will reject this assignment
    // if the public shape ever drifts from Record<string, unknown>.
    const a: InputRow = { any: 'value', n: 1, b: true, nil: null };
    const b: Record<string, unknown> = a;
    const c: InputRow = b;
    expect(c.any).toBe('value');
    expect(c.n).toBe(1);
    expect(c.b).toBe(true);
    expect(c.nil).toBeNull();
  });
});
