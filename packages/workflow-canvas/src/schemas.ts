/**
 * Zod schemas for the persisted workflow graph, plus the serialise /
 * deserialise pair that must round-trip WITHOUT TRANSLATION.
 *
 * WHY THESE ARE LOOSE OBJECTS, NOT STRICT ONES
 *
 * `workflow_definition_versions.graph` holds xyflow's NATIVE
 * `{ nodes, edges, viewport }`. xyflow owns that envelope and adds fields to it
 * across minor versions — `measured`, `handles`, `initialWidth`, `parentId`,
 * `extent`, `zIndex`, `ariaLabel` have all arrived that way. A strict schema
 * would validate a graph today and REJECT the same graph after a routine
 * `@xyflow/react` bump, and a lenient-but-stripping schema is worse still: it
 * parses clean and silently drops the field, so the defect surfaces as a node
 * that lost its parent lane, not as an error.
 *
 * So the schemas assert the fields the canvas DEPENDS on (`id`, `position`,
 * `source`/`target`) and pass everything else through byte-for-byte. That is
 * what makes `deserialiseGraph(serialiseGraph(g))` deep-equal `g` — the
 * property `graphRoundTrip.test.ts` asserts, and the reason the Phase 3
 * execution bridge can read the graph rather than a flattened summary of it.
 *
 * Honours the May plan's red-team amendment #20 (`docs/plans/
 * 20260510-universal-canvas-capability-implementation-v1.00F.md` §3.5): every
 * node config passes Zod validation on serialise AND deserialise, and malformed
 * input is rejected at parse time rather than reaching the canvas.
 */

import { z } from 'zod';

import { WORKFLOW_NODE_KINDS } from './types.js';
import type { WorkflowGraph } from './types.js';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const XYPositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

/**
 * The saved camera. `zoom` is bounded to the same range `<ReactFlow>` is given
 * (`minZoom` 0.05 / `maxZoom` 2) so a corrupted row cannot reopen the canvas at
 * a zoom the user has no control to escape from.
 */
export const ViewportSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().finite().min(0.01).max(8),
});

export const WorkflowNodeKindSchema = z.enum(WORKFLOW_NODE_KINDS);

// ---------------------------------------------------------------------------
// Node data payloads — one schema per built-in kind
// ---------------------------------------------------------------------------

const CommonNodeDataFields = {
  label: z.string().min(1).max(240),
  description: z.string().max(4000).optional(),
  laneId: z.string().min(1).optional(),
};

export const StepNodeDataSchema = z.looseObject({
  ...CommonNodeDataFields,
  actionKey: z.string().min(1).max(120).optional(),
  /**
   * Free-form (see `types.ts` `StepNodeData.action`) — validated only as an
   * object, not against a per-kind shape, because the vocabulary is owned by
   * the processor and this package must round-trip a kind it has never heard
   * of rather than reject it.
   */
  action: z.record(z.string(), z.unknown()).optional(),
});

export const DecisionNodeDataSchema = z.looseObject({
  ...CommonNodeDataFields,
  /**
   * At least two branches, because a one-way decision is a step. Capped at
   * eight: the apprentice process's widest is the FOUR-way out of *Host
   * accepted placement?*, and past eight the card stops being readable and the
   * answer is a second decision, not a taller node.
   */
  branches: z.array(z.string().min(1).max(120)).min(2).max(8),
});

export const TerminatorNodeDataSchema = z.looseObject({
  ...CommonNodeDataFields,
  role: z.enum(['start', 'end']),
});

export const HandoffNodeDataSchema = z.looseObject({
  ...CommonNodeDataFields,
  toLaneId: z.string().min(1).optional(),
});

export const SwimlaneNodeDataSchema = z.looseObject({
  ...CommonNodeDataFields,
  laneId: z.string().min(1),
  order: z.number().int().min(0),
});

/** Every built-in kind's data schema, keyed by kind. Consumed by the registry. */
export const BUILT_IN_NODE_DATA_SCHEMAS = {
  step: StepNodeDataSchema,
  decision: DecisionNodeDataSchema,
  terminator: TerminatorNodeDataSchema,
  handoff: HandoffNodeDataSchema,
  swimlane: SwimlaneNodeDataSchema,
} as const;

// ---------------------------------------------------------------------------
// The graph envelope
// ---------------------------------------------------------------------------

/**
 * One node as xyflow stores it. `type` is a bare string rather than the
 * built-in enum ON PURPOSE — the node-type registry is open (see
 * `nodes/registry.ts`), so a consumer's own kind must survive a save/load
 * cycle even though this package has never heard of it. Kind-specific data
 * validation happens in the registry, where the kind's schema is known.
 */
export const WorkflowNodeSchema = z.looseObject({
  id: z.string().min(1),
  position: XYPositionSchema,
  data: z.looseObject({}),
  type: z.string().min(1).optional(),
  parentId: z.string().min(1).optional(),
  extent: z.union([z.literal('parent'), z.array(z.array(z.number()))]).optional(),
});

export const WorkflowEdgeSchema = z.looseObject({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().min(1).optional(),
  label: z.string().optional(),
});

export const WorkflowGraphSchema = z.looseObject({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  viewport: ViewportSchema,
});

export type WorkflowGraphJson = z.infer<typeof WorkflowGraphSchema>;

// ---------------------------------------------------------------------------
// Round trip
// ---------------------------------------------------------------------------

/**
 * Validate a live canvas graph on its way to `graph jsonb`.
 *
 * Returns a PLAIN JSON object, not a string: the column is `jsonb` and
 * supabase-js serialises it, so stringifying here would store a JSON string
 * inside a JSON column and every reader would have to double-parse.
 *
 * @throws {z.ZodError} when a node or edge is malformed — deliberately, at the
 * point of save, rather than writing a graph that cannot be reopened.
 */
export function serialiseGraph(graph: WorkflowGraph): WorkflowGraphJson {
  return WorkflowGraphSchema.parse(graph);
}

/**
 * The inverse. Accepts whatever came back from `graph jsonb` and hands the
 * canvas something `<ReactFlow>` can mount directly.
 *
 * A NULL or absent graph is NOT an error — a definition row can exist before
 * its first draft has any content — so it resolves to the empty graph. Anything
 * present but malformed throws, because a half-parsed graph renders as a canvas
 * that has quietly lost nodes, which is the failure mode that hides.
 */
export function deserialiseGraph(raw: unknown): WorkflowGraph {
  if (raw === null || raw === undefined) {
    return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
  }
  return WorkflowGraphSchema.parse(raw) as unknown as WorkflowGraph;
}
