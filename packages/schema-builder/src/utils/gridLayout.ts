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
 * Default (never-arranged) placement for entity cards.
 *
 * WHY THIS IS NOT A ONE-LINER
 *
 * The previous inline version computed the row pitch from the CURRENT card's
 * own field count:
 *
 *   y = 100 + floor(i / 4) * (220 + fieldCount * 8)
 *
 * which is wrong twice. Cards sharing a row got DIFFERENT y values, so rows were
 * staggered rather than aligned; and the space below a row was decided by
 * whichever card happened to land at index `i` instead of by the TALLEST card in
 * that row — so a single wide-schema entity silently overlapped everything
 * beneath it. Measured live 2026-08-06 on a 44-entity canvas: 5 drag handles
 * were physically covered by another card, so those cards could not be grabbed
 * at all even once the drag filter was fixed.
 *
 * A card's height is driven by its field count (EntityNode renders one row per
 * field), so the row pitch has to come from `max(fieldCount)` across the row and
 * accumulate down the canvas.
 */

/** Height of one FieldRow (`h-7`) in px. */
export const FIELD_ROW_HEIGHT = 28;
/** Header + footer + padding on an EntityNode, independent of field count. */
export const CARD_CHROME_HEIGHT = 140;
/** Widest an EntityNode is expected to render; column pitch must clear it. */
export const CARD_MAX_WIDTH = 340;

export interface DefaultGridOptions {
  columns?: number;
  /** Left/top origin of the grid. */
  originX?: number;
  originY?: number;
  /** Space between columns, on top of CARD_MAX_WIDTH. */
  gutterX?: number;
  /** Space between rows, on top of the measured row height. */
  gutterY?: number;
}

export function estimateCardHeight(fieldCount: number): number {
  return CARD_CHROME_HEIGHT + Math.max(0, fieldCount) * FIELD_ROW_HEIGHT;
}

/**
 * Positions for cards that have never been arranged. Returns a map keyed by id
 * so callers can apply it per entity without depending on array order.
 */
export function computeDefaultGridPositions(
  entities: { id: string; fieldCount: number }[],
  options: DefaultGridOptions = {},
): Map<string, { x: number; y: number }> {
  const {
    columns = 4,
    originX = 100,
    originY = 100,
    gutterX = 60,
    gutterY = 80,
  } = options;

  const out = new Map<string, { x: number; y: number }>();
  if (entities.length === 0) return out;

  const colPitch = CARD_MAX_WIDTH + gutterX;
  let rowTop = originY;

  for (let start = 0; start < entities.length; start += columns) {
    const row = entities.slice(start, start + columns);
    // The row's pitch is set by its TALLEST member, not by any single card.
    const rowHeight = Math.max(
      ...row.map((e) => estimateCardHeight(e.fieldCount)),
    );
    row.forEach((entity, col) => {
      out.set(entity.id, { x: originX + col * colPitch, y: rowTop });
    });
    rowTop += rowHeight + gutterY;
  }

  return out;
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
