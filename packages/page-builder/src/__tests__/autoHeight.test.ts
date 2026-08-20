import { describe, expect, it } from 'vitest';
import { computeAutoHeightRows } from '../autoHeight.js';

/**
 * These tests assert the OUTCOME, not the arithmetic.
 *
 * The previous suite checked the division — "(300 + 2) / 38 -> ceil 8" — and
 * never asked whether 8 rows actually buy enough pixels. They do not: 8 rows is
 * 298px for 302px of content. Three of the five tests encoded a clipping case
 * as the expected answer, which is how the defect survived a month with a green
 * suite.
 *
 * Everything below is measured against react-grid-layout's own allocation
 * formula, so a test can only pass if the content genuinely fits.
 */

/** Exactly what react-grid-layout allocates: `calcGridItemPosition`. */
function rglHeightPx(rows: number, rowHeightPx: number, marginYPx: number): number {
  return rows * rowHeightPx + Math.max(0, rows - 1) * marginYPx;
}

const GRID = { rowHeightPx: 32, marginYPx: 6 } as const;

function allocatedFor(contentPx: number, cardChromePx = 2) {
  const rows = computeAutoHeightRows({ contentPx, cardChromePx, ...GRID });
  return { rows, px: rglHeightPx(rows, GRID.rowHeightPx, GRID.marginYPx), needed: contentPx + cardChromePx };
}

describe('computeAutoHeightRows', () => {
  it('allocates enough real pixels for the content — the property that matters', () => {
    const { rows, px, needed } = allocatedFor(300);
    expect(px, `${rows} rows is ${px}px, content needs ${needed}px`).toBeGreaterThanOrEqual(needed);
  });

  it('THE PRODUCTION CASE: a 36px button is never given a 32px card', () => {
    // crm7 /clients/create at 1366x768, measured 2026-08-20. The Create/Cancel
    // row came out 32px around a 36px button with overflow-hidden, so the button
    // was clipped and unclickable. Pre-fix this returns 1 row / 32px.
    const { rows, px } = allocatedFor(36);
    expect(px).toBeGreaterThanOrEqual(38);
    expect(rows).toBeGreaterThan(1);
  });

  it('fits EVERY content height from 0 to 400px — no clipping band anywhere', () => {
    // The old form clipped whenever the needed height landed 1..marginY pixels
    // above a row boundary: 6 of every 38 heights, about one card in six. A
    // sweep is the only honest way to show that band is gone.
    const clipped: string[] = [];
    for (let contentPx = 0; contentPx <= 400; contentPx++) {
      const { rows, px, needed } = allocatedFor(contentPx);
      if (px < needed) clipped.push(`content ${contentPx}px -> ${rows} rows = ${px}px (needs ${needed}px)`);
    }
    expect(clipped, `${clipped.length} content heights are clipped:\n${clipped.slice(0, 8).join('\n')}`).toEqual([]);
  });

  it('does not over-allocate: one row fewer would NOT fit', () => {
    // Ceiling must be tight. If n-1 rows would also have fitted, we are wasting
    // a row of empty card on every widget, which is its own visual defect.
    for (const contentPx of [10, 30, 36, 100, 250, 377, 400]) {
      const { rows, needed } = allocatedFor(contentPx);
      if (rows <= 1) continue;
      const oneFewer = rglHeightPx(rows - 1, GRID.rowHeightPx, GRID.marginYPx);
      expect(oneFewer, `content ${contentPx}px: ${rows - 1} rows (${oneFewer}px) would have fitted ${needed}px`).toBeLessThan(needed);
    }
  });

  it('never returns fewer rows than the minRows floor', () => {
    expect(computeAutoHeightRows({ contentPx: 1, cardChromePx: 0, minRows: 4, ...GRID })).toBe(4);
  });

  it('defaults minRows to 1 when omitted, even for zero measured content', () => {
    expect(computeAutoHeightRows({ contentPx: 0, cardChromePx: 0, ...GRID })).toBe(1);
  });

  it('is idempotent — the same measured content always yields the same row count', () => {
    const options = { contentPx: 452, cardChromePx: 2, ...GRID } as const;
    const first = computeAutoHeightRows(options);
    expect(computeAutoHeightRows(options)).toBe(first);
    expect(computeAutoHeightRows({ ...options })).toBe(first);
  });

  it('returns the floor rather than dividing by zero on a degenerate grid', () => {
    expect(computeAutoHeightRows({ contentPx: 500, cardChromePx: 2, rowHeightPx: 0, marginYPx: 0 })).toBe(1);
  });
});
