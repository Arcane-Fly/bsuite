/**
 * Grid fallback layout for the schema canvas.
 *
 * Dagre's network-simplex lays DISCONNECTED graphs (no relations between
 * entities — the common fresh-tenant case) as one long vertical column, which
 * reads as "tidy just stacks cards". When there are no edges (or every node is
 * its own component), a simple fixed-column grid is the honest tidy.
 *
 * Same return contract as computeDagreLayout: a NEW nodes array with updated
 * `position` fields; unrelated properties preserved.
 */
import type { Node } from '@xyflow/react';

export interface GridLayoutOptions {
  /** Columns in the grid (default 4). */
  columns?: number;
  /** Horizontal gap between cards (default 320). */
  gapX?: number;
  /** Vertical gap between cards (default 220). */
  gapY?: number;
}

export function computeGridLayout<NodeData extends Record<string, unknown> = Record<string, unknown>>(
  nodes: Node<NodeData>[],
  options: GridLayoutOptions = {},
): Node<NodeData>[] {
  if (nodes.length === 0) return nodes;
  const { columns = 4, gapX = 320, gapY = 220 } = options;
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % columns) * gapX,
      y: Math.floor(i / columns) * gapY,
    },
  }));
}

/**
 * True when the graph is effectively disconnected for layout purposes — dagre
 * would produce a single-column stack that reads as broken. Heuristic: no
 * edges at all, or every node is its own weak component.
 */
export function isDisconnectedGraph<NodeData extends Record<string, unknown> = Record<string, unknown>>(
  nodes: Node<NodeData>[],
  edges: { source: string; target: string }[],
): boolean {
  if (nodes.length === 0) return true;
  if (edges.length === 0) return true;
  // Union-find over edges to count components.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) ?? r;
    return r;
  };
  const unite = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const n of nodes) parent.set(n.id, n.id);
  for (const e of edges) {
    if (parent.has(e.source) && parent.has(e.target)) unite(e.source, e.target);
  }
  const roots = new Set(nodes.map((n) => find(n.id)));
  // More than half the nodes are isolated components → column-stack territory.
  return roots.size > Math.max(1, Math.ceil(nodes.length / 2));
}
