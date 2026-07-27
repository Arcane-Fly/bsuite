import { describe, expect, it } from 'vitest';
import { computeGridLayout, isDisconnectedGraph } from '../utils/gridLayout.js';

const n = (id: string) => ({ id, position: { x: 0, y: 0 }, data: {} }) as never;

describe('computeGridLayout', () => {
  it('lays nodes in fixed columns instead of a single column', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map(n);
    const laid = computeGridLayout(nodes, { columns: 3, gapX: 100, gapY: 50 });
    // Row 0: a,b,c at x=0,100,200 — NOT all same x (the column-stack bug)
    expect(laid[0].position).toEqual({ x: 0, y: 0 });
    expect(laid[1].position).toEqual({ x: 100, y: 0 });
    expect(laid[2].position).toEqual({ x: 200, y: 0 });
    // Row 1
    expect(laid[3].position).toEqual({ x: 0, y: 50 });
    expect(laid[5].position).toEqual({ x: 200, y: 50 });
    const xs = new Set(laid.map((x) => x.position.x));
    expect(xs.size).toBeGreaterThan(1);
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
