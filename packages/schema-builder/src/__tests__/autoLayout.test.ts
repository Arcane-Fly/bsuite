import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';

import { computeDagreLayout } from '../utils/autoLayout.js';

type TestData = { label: string };
type TestNode = Node<TestData>;

function mkNode(id: string, label = id): TestNode {
  return {
    id,
    type: 'entity',
    position: { x: 0, y: 0 },
    data: { label },
  };
}

describe('computeDagreLayout', () => {
  it('returns empty array for empty nodes', () => {
    expect(computeDagreLayout<TestData>([], [])).toEqual([]);
  });

  it('returns a single node with a numeric position set', () => {
    const out = computeDagreLayout([mkNode('a')], []);
    expect(out).toHaveLength(1);
    expect(typeof out[0].position.x).toBe('number');
    expect(typeof out[0].position.y).toBe('number');
    expect(Number.isFinite(out[0].position.x)).toBe(true);
    expect(Number.isFinite(out[0].position.y)).toBe(true);
  });

  it('flows left-to-right in LR mode (target.x > source.x)', () => {
    const nodes = [mkNode('a'), mkNode('b')];
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const out = computeDagreLayout(nodes, edges);
    const a = out.find((n) => n.id === 'a');
    const b = out.find((n) => n.id === 'b');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(b!.position.x).toBeGreaterThan(a!.position.x);
  });

  it('assigns positions to disconnected nodes without crashing', () => {
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c')];
    const out = computeDagreLayout(nodes, []);
    expect(out).toHaveLength(3);
    for (const n of out) {
      expect(typeof n.position.x).toBe('number');
      expect(typeof n.position.y).toBe('number');
    }
  });

  it('preserves unrelated node properties (id, type, data)', () => {
    const original = mkNode('abc', 'My Label');
    const out = computeDagreLayout([original], []);
    expect(out[0].id).toBe('abc');
    expect(out[0].type).toBe('entity');
    expect(out[0].data).toEqual({ label: 'My Label' });
  });

  it('respects custom nodeWidth option (wider nodes → larger gaps)', () => {
    const nodes = [mkNode('a'), mkNode('b')];
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }];
    const defaultOut = computeDagreLayout(nodes, edges);
    const wideOut = computeDagreLayout(nodes, edges, {
      nodeWidth: 500,
      nodeHeight: 140,
    });

    const defaultGap =
      defaultOut.find((n) => n.id === 'b')!.position.x -
      defaultOut.find((n) => n.id === 'a')!.position.x;
    const wideGap =
      wideOut.find((n) => n.id === 'b')!.position.x -
      wideOut.find((n) => n.id === 'a')!.position.x;

    expect(wideGap).toBeGreaterThan(defaultGap);
  });

  it('ignores edges referencing unknown node IDs', () => {
    const nodes = [mkNode('a'), mkNode('b')];
    const edges: Edge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'ghost' },
      { id: 'e3', source: 'ghost', target: 'b' },
    ];
    // Should not crash, and should still lay out a→b correctly
    const out = computeDagreLayout(nodes, edges);
    const a = out.find((n) => n.id === 'a');
    const b = out.find((n) => n.id === 'b');
    expect(b!.position.x).toBeGreaterThan(a!.position.x);
  });
});
