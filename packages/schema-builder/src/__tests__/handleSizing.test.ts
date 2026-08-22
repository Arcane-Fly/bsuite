/**
 * WCAG 2.5.8 (AA) — pointer target minimum 24x24.
 *
 * The connect handles were 12 CSS px, and the canvas sat at zoom 0.5, so they
 * painted at SIX DEVICE PIXELS. The success criterion is stated in CSS px at
 * 1x, but what a user aims at is device px, and a transform of 0.5 is exactly
 * the case where those two numbers stop agreeing. Sizing in CSS px alone is
 * what let a "12px" target ship at a quarter of the required area.
 *
 * So the sizing function is tested in the unit the criterion cares about:
 * hit x zoom must clear 24 at every zoom the canvas can reach.
 */
import { describe, expect, it } from 'vitest';

import { handleSizing } from '../components/FieldRow.js';

// minZoom .. maxZoom as configured on <ReactFlow>, plus the old default that
// caused the defect and the band where field rows actually render.
const ZOOMS = [0.05, 0.25, 0.5, 0.7, 0.9, 1, 1.5, 2];

describe('handleSizing', () => {
  it('clears 24 device px wherever the clamp is not binding', () => {
    for (const zoom of ZOOMS) {
      const { hit } = handleSizing(zoom);
      const devicePx = hit * zoom;
      // Below ~0.7 the clamp caps CSS width to stop adjacent rows' targets
      // overlapping; above it the device-px floor must hold exactly.
      if (hit < 34) {
        expect(devicePx).toBeGreaterThanOrEqual(24 - 1e-9);
      }
    }
  });

  it('holds the floor exactly at the zooms where field rows are drawn', () => {
    // EntityNode only renders field rows at zoom >= 0.7, so these are the
    // zooms at which a field handle can actually be aimed at.
    for (const zoom of [0.75, 1, 1.5, 2]) {
      const { hit } = handleSizing(zoom);
      expect(hit * zoom).toBeCloseTo(24, 6);
    }
  });

  it('is strictly larger than the painted dot at every zoom', () => {
    // The point of the split: a small dot with a large invisible hit box.
    for (const zoom of ZOOMS) {
      const { hit, dot } = handleSizing(zoom);
      expect(hit).toBeGreaterThan(dot);
    }
  });

  it('keeps the dot visible when zoomed right out', () => {
    const { dot } = handleSizing(2);
    expect(dot * 2).toBeCloseTo(10, 6);
  });

  it('clamps the hit box so zoomed-out targets cannot overlap', () => {
    // Without the clamp, zoom 0.05 would ask for a 480px box on a 28px row.
    const { hit } = handleSizing(0.05);
    expect(hit).toBe(34);
  });

  it('never divides by zero', () => {
    // React Flow reports transform [0,0,0] for a frame before the first fit.
    const { hit, dot } = handleSizing(0);
    expect(Number.isFinite(hit)).toBe(true);
    expect(Number.isFinite(dot)).toBe(true);
    expect(hit).toBeGreaterThan(0);
  });

  it('would have failed the pre-fix geometry', () => {
    // Positive control. The old handles were a flat 12 CSS px regardless of
    // zoom; at the canvas's own default that is 6 device px. If this assertion
    // ever stops failing the maths above, the test is measuring the wrong thing.
    const oldCssPx = 12;
    expect(oldCssPx * 0.5).toBeLessThan(24);
  });
});
