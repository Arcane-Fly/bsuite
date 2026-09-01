/**
 * Swimlane-aware auto-layout.
 *
 * ============================================================================
 * NO NEW DEPENDENCY. THE DAGRE CALL IS REUSED, NOT REWRITTEN.
 * ============================================================================
 *
 * `computeDagreLayout` is imported from `@bsuite/schema-builder/auto-layout` —
 * a subpath added in schema-builder 1.9.0 precisely so this import does not
 * also drag in `exportCanvasToPng`'s `html-to-image`, which the wider `/utils`
 * barrel exports and no bundler can be trusted to shake out of a package that
 * cannot declare `sideEffects: false`. That
 * package already depends on `@dagrejs/dagre` and every consumer of this canvas
 * (crm7, BSU, conduit, R80.3) already ships it — verified inlined in the
 * `SchemaBuilder-SKPN9sqo.js` chunk. Bundle size is an explicit operator
 * constraint ("hopefully it doesnt take up more space since its already a big
 * app"), so this package declares ZERO runtime dependencies and calls the
 * dagre that is already paid for.
 *
 * ============================================================================
 * WHY DAGRE IS ONLY ASKED FOR THE X AXIS
 * ============================================================================
 *
 * `computeDagreLayout` builds its graph with `compound: false`, so it has no
 * notion of a parent — hand it swimlane nodes and it lays them out as peers of
 * the steps inside them. That is not a defect to work around; a swimlane
 * diagram genuinely wants TWO DIFFERENT layout authorities:
 *
 *   the X axis  is PROCESS ORDER, and dagre's rank assignment is exactly that
 *   the Y axis  is OWNERSHIP, and it is not negotiable — a step belongs to the
 *               party that performs it, and no layout algorithm gets a vote
 *
 * So dagre runs over the member nodes with `rankdir: 'LR'`, its x-coordinates
 * are kept, and y comes from the node's lane. Nodes that land in the same lane
 * at the same rank are staggered downwards inside that lane so they do not
 * overlap.
 *
 * Dagre handles cyclic input on its own — it breaks cycles internally for rank
 * assignment and restores the edges afterwards — so the loops this canvas
 * exists to permit need no special handling here. That is worth stating because
 * it is the usual reason a layout pass smuggles in a cycle check.
 */

import { computeDagreLayout } from '@bsuite/schema-builder/auto-layout';
import type { Edge, Node } from '@xyflow/react';

import { SWIMLANE_HEADER_HEIGHT } from '../nodes/SwimlaneNode.js';
import type { WorkflowNode } from '../types.js';

export interface SwimlaneLayoutOptions {
  /**
   * Lane ids top to bottom. A lane node absent from this list keeps its own
   * `data.order`; a member whose `laneId` matches no lane is laid out free.
   */
  laneOrder?: readonly string[];
  /** Height of each lane band. Default 200. */
  laneHeight?: number;
  /** Horizontal gap between successive ranks, passed through to dagre. Default 96. */
  ranksep?: number;
  /** Vertical gap dagre keeps between same-rank siblings. Default 48. */
  nodesep?: number;
  /** Fallback member width when React Flow has not measured the node. Default 220. */
  nodeWidth?: number;
  /** Fallback member height. Default 88. */
  nodeHeight?: number;
  /** Left/right padding inside a lane. Default 32. */
  lanePaddingX?: number;
  /** Which node types are lane containers. Defaults to `['swimlane']`. */
  containerKinds?: readonly string[];
}

/** Read a lane id off a node's data without trusting the shape. */
function laneIdOf(node: Node): string | undefined {
  const raw = (node.data as { laneId?: unknown } | undefined)?.laneId;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function laneOrderOf(node: Node): number {
  const raw = (node.data as { order?: unknown } | undefined)?.order;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : Number.MAX_SAFE_INTEGER;
}

export interface SwimlaneLayoutResult {
  nodes: WorkflowNode[];
  /** Lane id -> the y offset of that lane band, for callers drawing rulers. */
  laneOffsets: Map<string, number>;
}

/**
 * Lay the graph out into lanes.
 *
 * Returns a NEW node array. Lane containers come first, then their members —
 * xyflow requires a parent to appear before its children, and a graph that
 * violates that renders the child at the origin with a console warning rather
 * than failing loudly.
 */
export function computeSwimlaneLayout(
  nodes: readonly WorkflowNode[],
  edges: readonly Edge[],
  options: SwimlaneLayoutOptions = {},
): SwimlaneLayoutResult {
  const {
    laneHeight = 200,
    ranksep = 96,
    nodesep = 48,
    nodeWidth = 220,
    nodeHeight = 88,
    lanePaddingX = 32,
    containerKinds = ['swimlane'],
  } = options;

  const containerSet = new Set(containerKinds);
  const lanes = nodes.filter((n) => n.type !== undefined && containerSet.has(n.type));
  const members = nodes.filter((n) => !(n.type !== undefined && containerSet.has(n.type)));

  if (nodes.length === 0) {
    return { nodes: [], laneOffsets: new Map() };
  }

  // --- 1. dagre over the members, for the PROCESS-ORDER axis only ----------
  //
  // Edges are filtered to member<->member: an edge naming a lane would make
  // dagre rank the lane itself, and rule R5 refuses such an edge anyway, so one
  // arriving here is corrupt data rather than a case to honour.
  const memberIds = new Set(members.map((n) => n.id));
  const memberEdges = edges.filter(
    (e) => memberIds.has(e.source) && memberIds.has(e.target),
  );

  const ranked = computeDagreLayout(
    members as Node<Record<string, unknown>>[],
    memberEdges,
    { rankdir: 'LR', ranksep, nodesep, nodeWidth, nodeHeight },
  );

  // Normalise so the leftmost node sits at the lane's left padding rather than
  // at whatever negative coordinate dagre happened to produce.
  const minX = ranked.reduce(
    (acc, n) => Math.min(acc, n.position.x),
    Number.POSITIVE_INFINITY,
  );
  const shift = Number.isFinite(minX) ? lanePaddingX - minX : 0;

  // --- 2. lane bands, in order --------------------------------------------
  const explicitOrder = options.laneOrder;
  const orderedLanes = [...lanes].sort((a, b) => {
    if (explicitOrder) {
      const ai = explicitOrder.indexOf(laneIdOf(a) ?? '');
      const bi = explicitOrder.indexOf(laneIdOf(b) ?? '');
      // A lane the caller did not list sorts after every lane it did.
      const an = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bn = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      if (an !== bn) return an - bn;
    }
    return laneOrderOf(a) - laneOrderOf(b);
  });

  const laneOffsets = new Map<string, number>();
  orderedLanes.forEach((lane, index) => {
    const id = laneIdOf(lane);
    if (id) laneOffsets.set(id, index * laneHeight);
  });

  const laneNodeIdByLaneId = new Map<string, string>();
  for (const lane of orderedLanes) {
    const id = laneIdOf(lane);
    if (id) laneNodeIdByLaneId.set(id, lane.id);
  }

  // --- 3. place the members ------------------------------------------------
  //
  // Same lane + overlapping x band -> stagger down inside the lane. Tracked per
  // lane as a list of occupied [x, x+width] spans per row.
  const rowsByLane = new Map<string, { row: number; x: number; width: number }[]>();

  const laidOutMembers: WorkflowNode[] = ranked.map((node) => {
    const laneId = laneIdOf(node);
    const laneNodeId = laneId ? laneNodeIdByLaneId.get(laneId) : undefined;
    const x = node.position.x + shift;
    const width = node.width ?? nodeWidth;
    const height = node.height ?? nodeHeight;

    if (!laneId || !laneNodeId) {
      // No lane, or a lane id that names no lane node on the canvas. Keep
      // dagre's own y — dropping the node at 0 would pile every unlaned node on
      // top of the first lane's header.
      const { parentId: _dropped, extent: _dropped2, ...rest } = node as WorkflowNode;
      return { ...rest, position: { x, y: node.position.y } } as WorkflowNode;
    }

    const occupied = rowsByLane.get(laneId) ?? [];
    let row = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const clash = occupied.some(
        (o) => o.row === row && x < o.x + o.width + nodesep && o.x < x + width + nodesep,
      );
      if (!clash) break;
      row += 1;
    }
    occupied.push({ row, x, width });
    rowsByLane.set(laneId, occupied);

    // Positions of a parented node are RELATIVE to the parent, so the lane's
    // own y is deliberately not added here.
    const y = SWIMLANE_HEADER_HEIGHT + 12 + row * (height + nodesep);

    return {
      ...node,
      position: { x, y },
      parentId: laneNodeId,
      // The constraint that makes the lane mean something: xyflow refuses to
      // drag the node out of its parent's box.
      extent: 'parent',
    } as WorkflowNode;
  });

  // --- 4. size the lanes to their contents ---------------------------------
  const rightEdgeByLane = new Map<string, number>();
  for (const m of laidOutMembers) {
    const laneId = laneIdOf(m);
    if (!laneId) continue;
    const right = m.position.x + (m.width ?? nodeWidth);
    rightEdgeByLane.set(laneId, Math.max(rightEdgeByLane.get(laneId) ?? 0, right));
  }
  const widest = Math.max(
    ...[...rightEdgeByLane.values(), 0],
  );

  const laidOutLanes: WorkflowNode[] = orderedLanes.map((lane, index) => {
    const laneId = laneIdOf(lane);
    const rows = laneId ? rowsByLane.get(laneId) ?? [] : [];
    const rowCount = rows.reduce((acc, r) => Math.max(acc, r.row + 1), 1);
    return {
      ...lane,
      // Every lane gets the SAME width. Ragged lane ends read as missing
      // content rather than as an empty lane, and a swimlane chart is a table:
      // the columns line up or it stops being one.
      position: { x: 0, y: index * laneHeight },
      width: widest + lanePaddingX,
      height: Math.max(
        laneHeight,
        SWIMLANE_HEADER_HEIGHT + 12 + rowCount * (nodeHeight + nodesep),
      ),
      // A lane must not be draggable out from under its members, and it must
      // sit behind them.
      selectable: lane.selectable ?? true,
      zIndex: -1,
    } as WorkflowNode;
  });

  // Parents FIRST — see the doc comment.
  return { nodes: [...laidOutLanes, ...laidOutMembers], laneOffsets };
}
