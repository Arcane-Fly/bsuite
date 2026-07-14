import { describe, expect, it } from 'vitest';
import { computeAutoHeightRows } from '../autoHeight.js';

// TDD-first per blueprint amendment A1: these tests are written before
// `autoHeight.ts` exists (red), then `autoHeight.ts` is implemented to make
// them pass (green). See PageGridLayout.tsx's GridItem ResizeObserver for
// how this pure function is used in the live auto-height mechanism.

describe('computeAutoHeightRows', () => {
  it('converts a measured content pixel height into the minimum whole row count that fits it', () => {
    // rowHeight=32, marginY=6 -> row unit = 38px. (300 + 2) / 38 = 7.947... -> ceil 8.
    const rows = computeAutoHeightRows({
      contentPx: 300,
      cardChromePx: 2,
      rowHeightPx: 32,
      marginYPx: 6,
    });
    expect(rows).toBe(8);
  });

  it('uses ceil (never floor/round) so content is never clipped by a partial row', () => {
    const exact = computeAutoHeightRows({
      contentPx: 378, // (378 + 2) / 38 = 10 exactly
      cardChromePx: 2,
      rowHeightPx: 32,
      marginYPx: 6,
    });
    const onePixelOver = computeAutoHeightRows({
      contentPx: 379, // (379 + 2) / 38 = 10.026... -> must round UP to 11, not down to 10
      cardChromePx: 2,
      rowHeightPx: 32,
      marginYPx: 6,
    });
    expect(exact).toBe(10);
    expect(onePixelOver).toBe(11);
  });

  it('never returns fewer rows than the minRows floor', () => {
    const rows = computeAutoHeightRows({
      contentPx: 1,
      cardChromePx: 0,
      rowHeightPx: 32,
      marginYPx: 6,
      minRows: 4,
    });
    expect(rows).toBe(4);
  });

  it('defaults minRows to 1 when omitted, even for zero measured content', () => {
    const rows = computeAutoHeightRows({ contentPx: 0, cardChromePx: 0, rowHeightPx: 32, marginYPx: 6 });
    expect(rows).toBe(1);
  });

  it('is idempotent (a fixed point): recomputing from the same measured content height yields the same row count', () => {
    const options = { contentPx: 452, cardChromePx: 2, rowHeightPx: 32, marginYPx: 6 } as const;
    const first = computeAutoHeightRows(options);
    const second = computeAutoHeightRows(options);
    const third = computeAutoHeightRows({ ...options });
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('guards against a non-positive row unit (rowHeight + marginY <= 0) instead of dividing by zero', () => {
    const rows = computeAutoHeightRows({
      contentPx: 500,
      cardChromePx: 0,
      rowHeightPx: 0,
      marginYPx: 0,
      minRows: 2,
    });
    expect(rows).toBe(2);
    expect(Number.isFinite(rows)).toBe(true);
  });
});
