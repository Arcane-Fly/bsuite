/**
 * TIDY MUST NOT PUT CARDS ON TOP OF EACH OTHER.
 *
 * Operator report D-6: "Selecting 'tidy' icon just puts the schema cards into a
 * column. Super un-usefull."
 *
 * MEASURED on crm.crm7.app 2026-08-27, signed in, 1440x900, at the canvas's
 * opening zoom of 0.75 (the band where EntityNode still draws field rows): 44
 * cards sitting on the persisted output of `computeGridLayout`, at
 * x = 0/320/640/960 and y = 0/220/440/880/1320, with **69 of the 946 card pairs
 * physically overlapping**. Card heights ran 603-1275px against a 220px row
 * pitch; card width is 340px against a 320px column pitch.
 *
 * The previous test in this file asserted the exact pitch numbers that caused
 * that — `{ columns: 3, gapX: 100, gapY: 50 }`, on nodes given no size at all,
 * with the assertions written as equalities against 0/100/200. It was named for
 * the bug it was meant to prevent ("instead of a single column") and it passed
 * for the whole time the canvas was unusable, because a layout of zero-sized
 * nodes cannot overlap and a pitch assertion cannot notice that a card is
 * taller than its row. Assert the OUTCOME — no two cards share space — and the
 * next person to retune the gutters is free to do so.
 */
import { describe, expect, it } from 'vitest';
import {
  CARD_MAX_WIDTH,
  computeGridLayout,
  estimateCardHeight,
  isDisconnectedGraph,
} from '../utils/gridLayout.js';

const n = (id: string) => ({ id, position: { x: 0, y: 0 }, data: {} }) as never;

/**
 * A node the way SchemaCanvas builds one: `data.fields` is what decides how
 * tall the card renders, because EntityNode draws one `h-7` row per field.
 */
const card = (id: string, fieldCount: number) =>
  ({
    id,
    position: { x: 0, y: 0 },
    data: { fields: Array.from({ length: fieldCount }, (_, i) => ({ id: `${id}-${i}` })) },
  }) as never;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlappingPairs(boxes: Box[]): number {
  let count = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      ) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Field counts of the 44 entities on the tenant the operator reported against,
 * read off the live canvas rather than invented, so this exercises the real
 * spread of card heights (a 5-field lookup table next to a 40-field placement
 * record) rather than a uniform set that any pitch would survive.
 */
const PRODUCTION_FIELD_COUNTS = [
  40, 28, 25, 25, 25, 25, 22, 21, 20, 20, 19, 18, 18, 17, 17, 16, 16, 15, 15,
  14, 14, 13, 13, 12, 12, 12, 11, 11, 10, 10, 10, 9, 9, 8, 8, 8, 7, 7, 6, 6, 5,
  5, 4, 3,
];

describe('computeGridLayout', () => {
  it('never places two cards on top of each other — the D-6 defect', () => {
    const nodes = PRODUCTION_FIELD_COUNTS.map((count, i) => card(`e${i}`, count));
    const laid = computeGridLayout(nodes);

    const boxes: Box[] = laid.map((node, i) => ({
      x: node.position.x,
      y: node.position.y,
      w: CARD_MAX_WIDTH,
      h: estimateCardHeight(PRODUCTION_FIELD_COUNTS[i]),
    }));

    expect(overlappingPairs(boxes)).toBe(0);
  });

  it('uses each row\'s tallest card to decide where the next row starts', () => {
    // Row 0 holds a 40-field monster; row 1 must clear it, not a fixed pitch.
    const nodes = [card('tall', 40), card('a', 2), card('b', 2), card('c', 2), card('next', 2)];
    const laid = computeGridLayout(nodes, { columns: 4 });

    const tallBottom = laid[0].position.y + estimateCardHeight(40);
    expect(laid[4].position.y).toBeGreaterThanOrEqual(tallBottom);
  });

  it('leaves clear air between neighbouring columns', () => {
    const nodes = [card('a', 3), card('b', 3)];
    const laid = computeGridLayout(nodes, { columns: 2 });
    expect(laid[1].position.x).toBeGreaterThanOrEqual(
      laid[0].position.x + CARD_MAX_WIDTH,
    );
  });

  it('lays nodes in columns rather than one stack', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => card(id, 4));
    const laid = computeGridLayout(nodes, { columns: 3 });
    expect(new Set(laid.map((x) => x.position.x)).size).toBe(3);
    expect(new Set(laid.map((x) => x.position.y)).size).toBe(2);
  });

  it('prefers React Flow\'s measured size over the field-count estimate', () => {
    // A card whose rendered height is far larger than its field count suggests
    // — a long description, a wrapped label. The estimate would under-reserve.
    const nodes = [
      { id: 'a', position: { x: 0, y: 0 }, data: { fields: [] }, measured: { width: 340, height: 900 } },
      { id: 'b', position: { x: 0, y: 0 }, data: { fields: [] }, measured: { width: 340, height: 100 } },
    ] as never as Parameters<typeof computeGridLayout>[0];
    const laid = computeGridLayout(nodes, { columns: 1 });
    expect(laid[1].position.y).toBeGreaterThanOrEqual(900);
  });

  it('returns input for empty nodes', () => {
    expect(computeGridLayout([])).toEqual([]);
  });
});

describe('isDisconnectedGraph', () => {
  it('true with no edges', () => {
    expect(isDisconnectedGraph([n('a'), n('b')], [])).toBe(true);
  });
  it('false when nodes are connected', () => {
    expect(isDisconnectedGraph([n('a'), n('b')], [{ source: 'a', target: 'b' }])).toBe(false);
  });
  it('true when most nodes are isolated components', () => {
    const nodes = ['a', 'b', 'c', 'd'].map(n);
    const edges = [{ source: 'a', target: 'b' }];
    expect(isDisconnectedGraph(nodes, edges)).toBe(true);
  });
  it('false when one component dominates', () => {
    const nodes = ['a', 'b', 'c', 'd'].map(n);
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'd' },
    ];
    expect(isDisconnectedGraph(nodes, edges)).toBe(false);
  });
});
