/**
 * Dagre-based auto-layout for React Flow nodes.
 *
 * Reference: `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.6
 * item 3. Pinned config: `rankdir: 'LR'` (left-to-right), `ranker:
 * 'network-simplex'` (dagre default, minimises edge crossings), `nodesep: 60`
 * (vertical gap between sibling nodes in the same rank), `ranksep: 80`
 * (horizontal gap between successive ranks — tuned for our default entity-card
 * width of ~260 px so labels never overlap).
 *
 * Pure function with zero React deps so it is trivially unit-testable.
 */

import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

export interface AutoLayoutOptions {
  /** Direction of the layout. Defaults to 'LR' (left-to-right). */
  rankdir?: 'LR' | 'TB' | 'RL' | 'BT';
  /** Vertical gap between sibling nodes in the same rank. Default 60. */
  nodesep?: number;
  /** Horizontal gap between successive ranks. Default 80. */
  ranksep?: number;
  /** Fallback node width when React Flow hasn't measured the node yet. */
  nodeWidth?: number;
  /** Fallback node height when React Flow hasn't measured the node yet. */
  nodeHeight?: number;
}

/**
 * Run dagre against the given React Flow `nodes`/`edges` and return a new
 * `nodes` array with each node's `position` updated to the layout result.
 *
 * Dagre returns node coordinates as centres; React Flow wants the top-left
 * corner, so we subtract half-width/half-height to convert.
 *
 * Unrelated node properties (`id`, `type`, `data`, `width`, `height`, etc.) are
 * preserved. Nodes whose size is already known via `node.width` / `node.height`
 * use those dimensions for better layout quality; otherwise the fallback
 * `nodeWidth`/`nodeHeight` options are used.
 *
 * @returns a new array of nodes with updated `position` fields. Empty input
 * returns the input array as-is (short-circuit for performance + no-op
 * semantics).
 */
export function computeDagreLayout<
  NodeData extends Record<string, unknown> = Record<string, unknown>,
>(
  nodes: Node<NodeData>[],
  edges: Edge[],
  options: AutoLayoutOptions = {},
): Node<NodeData>[] {
  if (nodes.length === 0) return nodes;

  const {
    rankdir = 'LR',
    nodesep = 60,
    ranksep = 80,
    nodeWidth = 260,
    nodeHeight = 140,
  } = options;

  const graph = new dagre.graphlib.Graph({ compound: false });
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir, nodesep, ranksep, ranker: 'network-simplex' });

  for (const node of nodes) {
    const w = node.width ?? nodeWidth;
    const h = node.height ?? nodeHeight;
    graph.setNode(node.id, { width: w, height: h });
  }

  for (const edge of edges) {
    if (
      edge.source &&
      edge.target &&
      graph.hasNode(edge.source) &&
      graph.hasNode(edge.target)
    ) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const laidOut = graph.node(node.id);
    if (!laidOut) return node;
    const w = node.width ?? nodeWidth;
    const h = node.height ?? nodeHeight;
    return {
      ...node,
      position: {
        x: laidOut.x - w / 2,
        y: laidOut.y - h / 2,
      },
    };
  });
}
