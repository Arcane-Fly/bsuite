import { describe, expect, it } from 'vitest';

import {
  CARD_MAX_WIDTH,
  computeDefaultGridPositions,
  estimateCardHeight,
} from '../utils/gridLayout.js';

/**
 * Guards the never-arranged canvas against cards covering each other.
 *
 * The previous inline layout derived each row's pitch from the CURRENT card's
 * own field count, so cards in one row were staggered and a single wide-schema
 * entity overlapped everything beneath it. On the live 44-entity canvas that
 * left 5 drag handles physically covered by another card — unclickable, which
 * looks identical to the drag being broken.
 *
 * Overlap is a geometric property, so this asserts it geometrically: build the
 * real boxes and check every pair. A test that merely asserted "y increases"
 * would have passed against the broken version.
 */

type Box = { id: string; x: number; y: number; w: number; h: number };

function boxesFor(entities: { id: string; fieldCount: number }[]): Box[] {
  const pos = computeDefaultGridPositions(entities);
  return entities.map((e) => {
    const p = pos.get(e.id);
    if (!p) throw new Error(`no position for ${e.id}`);
    return {
      id: e.id,
      x: p.x,
      y: p.y,
      // Worst case: a card as wide as the layout allows for.
      w: CARD_MAX_WIDTH,
      h: estimateCardHeight(e.fieldCount),
    };
  });
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

function collidingPairs(boxes: Box[]): string[] {
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j])) hits.push(`${boxes[i].id} ∩ ${boxes[j].id}`);
    }
  }
  return hits;
}

describe('default grid placement', () => {
  it('never overlaps two cards, even with wildly uneven field counts', () => {
    // The shape that broke it: one enormous entity sharing a row with small ones.
    const entities = [
      { id: 'contact', fieldCount: 6 },
      { id: 'lead', fieldCount: 4 },
      { id: 'client', fieldCount: 40 }, // the tall one
      { id: 'apprentice', fieldCount: 5 },
      { id: 'employer', fieldCount: 7 },
      { id: 'placement', fieldCount: 12 },
      { id: 'project', fieldCount: 3 },
      { id: 'task', fieldCount: 9 },
    ];
    expect(collidingPairs(boxesFor(entities))).toEqual([]);
  });

  it('holds at the real canvas size (44 entities, varied schemas)', () => {
    const entities = Array.from({ length: 44 }, (_, i) => ({
      id: `e${i}`,
      // Deterministic spread including several very tall cards.
      fieldCount: [3, 5, 8, 12, 20, 35, 4, 6][i % 8],
    }));
    expect(collidingPairs(boxesFor(entities))).toEqual([]);
  });

  it('aligns every card in a row to the same y', () => {
    const entities = Array.from({ length: 8 }, (_, i) => ({
      id: `e${i}`,
      fieldCount: i * 5, // each card in the row a different height
    }));
    const pos = computeDefaultGridPositions(entities, { columns: 4 });
    const rowOneY = [0, 1, 2, 3].map((i) => pos.get(`e${i}`)!.y);
    const rowTwoY = [4, 5, 6, 7].map((i) => pos.get(`e${i}`)!.y);
    expect(new Set(rowOneY).size).toBe(1);
    expect(new Set(rowTwoY).size).toBe(1);
    expect(rowTwoY[0]).toBeGreaterThan(rowOneY[0]);
  });

  it('leaves room below the TALLEST card in a row, not an arbitrary one', () => {
    // Tall card last in its row — the ordering the old code got wrong, because
    // it read the field count of whichever index it happened to be on.
    const entities = [
      { id: 'a', fieldCount: 2 },
      { id: 'b', fieldCount: 2 },
      { id: 'c', fieldCount: 2 },
      { id: 'tall', fieldCount: 50 },
      { id: 'next', fieldCount: 2 },
    ];
    const pos = computeDefaultGridPositions(entities, { columns: 4 });
    const tallBottom = pos.get('tall')!.y + estimateCardHeight(50);
    expect(pos.get('next')!.y).toBeGreaterThanOrEqual(tallBottom);
  });

  it('returns an empty map for no entities rather than throwing', () => {
    expect(computeDefaultGridPositions([]).size).toBe(0);
  });
});
