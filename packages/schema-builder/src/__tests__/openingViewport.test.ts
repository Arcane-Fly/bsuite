/**
 * WHERE THE CANVAS OPENS.
 *
 * The control in this file is `getViewportForBounds` — the real function out of
 * the installed `@xyflow/react`, not a re-implementation of it. That matters:
 * a test whose "before" case is my own paraphrase of the library proves only
 * that I can paraphrase. Importing it means the failing side of every
 * assertion below is the code that is actually shipping today, and it will
 * keep being the code that is actually shipping after the next xyflow bump.
 *
 * The numbers are the ones measured on crm.crm7.app/settings/schema-builder on
 * 2026-08-27, signed in at 1440x900: container 1184x836, 44 entity cards whose
 * bounding box in flow coordinates is 1259 x 2471 at the origin, opening zoom
 * clamped to 0.75 by `fitViewOptions.minZoom`, resulting viewport translate
 * (122.875, -445.625) — with 14 of 44 cards rendered whole and the rest sliced
 * by the frame.
 */
import { getViewportForBounds } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import {
  boundsOfNodes,
  computeOpeningViewport,
} from '../utils/openingViewport.js';

/** The measured production case. */
const CONTAINER = { width: 1184, height: 836 };
const BOUNDS = { x: 0, y: 0, width: 1259, height: 2471 };
const FIT = { padding: 0.2, minZoom: 0.75, maxZoom: 1.2 };

describe('computeOpeningViewport', () => {
  it('does not push the top of the diagram off the top of the frame', () => {
    // CONTROL, and it must come back POSITIVE or this test proves nothing:
    // the library's own fit puts the content's top edge above the frame.
    const libraryFit = getViewportForBounds(
      BOUNDS,
      CONTAINER.width,
      CONTAINER.height,
      FIT.minZoom,
      FIT.maxZoom,
      FIT.padding,
    );
    expect(libraryFit.y).toBeLessThan(0);

    const opening = computeOpeningViewport(BOUNDS, CONTAINER, FIT);
    expect(opening).not.toBeNull();
    expect(opening!.y).toBeGreaterThanOrEqual(0);
  });

  it('changes only the anchor, never the zoom the legibility floor decided', () => {
    const libraryFit = getViewportForBounds(
      BOUNDS,
      CONTAINER.width,
      CONTAINER.height,
      FIT.minZoom,
      FIT.maxZoom,
      FIT.padding,
    );
    const opening = computeOpeningViewport(BOUNDS, CONTAINER, FIT);
    expect(opening!.zoom).toBeCloseTo(libraryFit.zoom, 10);
    expect(opening!.zoom).toBe(FIT.minZoom); // clamped, which is the whole case
  });

  it('centres an axis that fits, so a small schema is framed as before', () => {
    const small = { x: 0, y: 0, width: 400, height: 300 };
    const libraryFit = getViewportForBounds(
      small,
      CONTAINER.width,
      CONTAINER.height,
      FIT.minZoom,
      FIT.maxZoom,
      FIT.padding,
    );
    const opening = computeOpeningViewport(small, CONTAINER, FIT);
    // Both axes fit at this size, so we must agree with the library within the
    // rounding its integer padding introduces.
    expect(opening!.x).toBeCloseTo(libraryFit.x, 0);
    expect(opening!.y).toBeCloseTo(libraryFit.y, 0);
  });

  it('anchors only the overflowing axis', () => {
    // Tall and narrow: horizontal fits, vertical does not.
    const tall = { x: 0, y: 0, width: 400, height: 4000 };
    const opening = computeOpeningViewport(tall, CONTAINER, FIT)!;
    const centredX = CONTAINER.width / 2 - (tall.x + tall.width / 2) * opening.zoom;
    expect(opening.x).toBeCloseTo(centredX, 6);
    expect(opening.y).toBeGreaterThanOrEqual(0);
  });

  it('respects a bounding box that does not start at the origin', () => {
    const offset = { x: -900, y: -1200, width: 1259, height: 2471 };
    const opening = computeOpeningViewport(offset, CONTAINER, FIT)!;
    // Top of the content, projected into screen space, must be inside the frame.
    const contentTopOnScreen = offset.y * opening.zoom + opening.y;
    expect(contentTopOnScreen).toBeGreaterThanOrEqual(0);
  });

  it('declines rather than inventing a viewport it cannot compute', () => {
    expect(computeOpeningViewport(BOUNDS, { width: 0, height: 0 })).toBeNull();
    expect(
      computeOpeningViewport({ x: 0, y: 0, width: 0, height: 0 }, CONTAINER),
    ).toBeNull();
  });
});

describe('boundsOfNodes', () => {
  it('measures from React Flow\'s measured sizes', () => {
    const bounds = boundsOfNodes([
      { position: { x: 0, y: 0 }, measured: { width: 100, height: 50 } },
      { position: { x: 200, y: 300 }, measured: { width: 100, height: 50 } },
    ]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 300, height: 350 });
  });

  it('falls back to width/height before measurement arrives', () => {
    const bounds = boundsOfNodes([
      { position: { x: 10, y: 10 }, width: 40, height: 20 },
    ]);
    expect(bounds).toEqual({ x: 10, y: 10, width: 40, height: 20 });
  });

  it('skips unmeasured nodes instead of counting them as points at their origin', () => {
    // A zero-size node would otherwise drag the box out to meet it and frame a
    // diagram that is mostly empty canvas.
    const bounds = boundsOfNodes([
      { position: { x: 1000, y: 1000 }, measured: { width: 100, height: 50 } },
      { position: { x: 0, y: 0 } },
    ]);
    expect(bounds).toEqual({ x: 1000, y: 1000, width: 100, height: 50 });
  });

  it('returns null when nothing has been measured', () => {
    expect(boundsOfNodes([{ position: { x: 0, y: 0 } }])).toBeNull();
    expect(boundsOfNodes([])).toBeNull();
  });
});
