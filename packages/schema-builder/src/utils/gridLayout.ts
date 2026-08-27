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
  /** Space BETWEEN columns, on top of the widest card (default 60). */
  gutterX?: number;
  /** Space BETWEEN rows, on top of the tallest card in that row (default 80). */
  gutterY?: number;
}

/**
 * Card size for layout purposes.
 *
 * React Flow writes the rendered size onto `measured` once its ResizeObserver
 * has seen the node, so by the time a user can press Tidy the real numbers are
 * there. `estimateCardHeight(fields.length)` is the fallback for the frames
 * before that and for unit tests, and it is the same estimate
 * `computeDefaultGridPositions` uses — one model of how tall a card is, not
 * two that can drift.
 */
function cardSize(node: {
  measured?: { width?: number | null; height?: number | null };
  width?: number | null;
  height?: number | null;
  data?: unknown;
}): { width: number; height: number } {
  const fields = (node.data as { fields?: unknown[] } | undefined)?.fields;
  const fieldCount = Array.isArray(fields) ? fields.length : 0;
  return {
    width: node.measured?.width ?? node.width ?? CARD_MAX_WIDTH,
    height:
      node.measured?.height ?? node.height ?? estimateCardHeight(fieldCount),
  };
}

/**
 * Lay cards out in a grid that they actually FIT IN.
 *
 * WHY THIS IS NOT `(i % columns) * 320, floor(i / columns) * 220`.
 *
 * It was, and that is the whole of operator report D-6: "Selecting 'tidy' icon
 * just puts the schema cards into a column. Super un-usefull."
 *
 * MEASURED on crm.crm7.app 2026-08-27, at the canvas's opening zoom of 0.75
 * where field rows are still drawn: 44 cards sitting on the persisted output of
 * this function, on x = 0/320/640/960 and y = 0/220/440/880/1320 — and **69 of
 * the 946 card pairs physically overlapping**. Card heights ran from 603px to
 * 1275px against a 220px row pitch, and card width is 340px against a 320px
 * column pitch. Every row buried the row beneath it and every column clipped
 * its neighbour. Cards stacked five deep on a 220px pitch do not read as a
 * grid; they read as a column, which is exactly the word the operator used.
 *
 * WHY IT SURVIVED EVERY CHECK. Tidy ends with a `fitView`, which for 44 cards
 * settles at zoom 0.28 — below `LOD_FIELDS_VISIBLE` (0.7) in EntityNode, so the
 * cards collapse to header-only and stop overlapping. The damage is invisible
 * at the zoom Tidy leaves you at and appears the moment you zoom in far enough
 * to read anything. A screenshot taken straight after pressing Tidy shows a
 * clean grid. Measure at the OPENING zoom, not the fitted one.
 *
 * The fix is not new thinking: `computeDefaultGridPositions` below already
 * solves this exact problem, and its docblock already records the same bug
 * being measured on 2026-08-06. This function was added afterwards and repeated
 * the mistake the file was already documenting. A row's pitch comes from the
 * TALLEST card in that row; a column's pitch clears the WIDEST card anywhere,
 * so columns stay aligned down the whole canvas.
 *
 * `gapX`/`gapY` are gone rather than renamed. They meant PITCH — the distance
 * between origins — and the replacements mean GUTTER — the space left over.
 * Keeping the old names for the new meaning would silently change what every
 * existing caller's number does. Nothing outside this package could call it:
 * it is not re-exported from `utils/index.ts` or the package root.
 *
 * Same return contract as `computeDagreLayout`: a NEW nodes array with updated
 * `position` fields; unrelated properties preserved.
 */
export function computeGridLayout<NodeData extends Record<string, unknown> = Record<string, unknown>>(
  nodes: Node<NodeData>[],
  options: GridLayoutOptions = {},
): Node<NodeData>[] {
  if (nodes.length === 0) return nodes;
  const { columns = 4, gutterX = 60, gutterY = 80 } = options;
  const cols = Math.max(1, Math.floor(columns));

  const sizes = nodes.map((node) => cardSize(node));

  // One column pitch for the whole canvas, from the widest card anywhere, so
  // columns line up from the first row to the last instead of ragging inward
  // wherever a row happens to hold only narrow cards.
  const colPitch = Math.max(...sizes.map((s) => s.width)) + gutterX;

  // Row tops accumulate: each row starts below the tallest card in the row
  // above it, which is the one thing a fixed pitch can never know.
  const rowTops: number[] = [];
  let top = 0;
  for (let start = 0; start < nodes.length; start += cols) {
    rowTops.push(top);
    const rowHeights = sizes.slice(start, start + cols).map((s) => s.height);
    top += Math.max(...rowHeights) + gutterY;
  }

  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % cols) * colPitch,
      y: rowTops[Math.floor(i / cols)],
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
