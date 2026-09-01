/**
 * Shared types for `@bsuite/workflow-canvas`.
 *
 * TWO CONTRACTS LIVE HERE AND THEY ARE DELIBERATELY SEPARATE.
 *
 * 1. THE GRAPH CONTRACT — what goes in `workflow_definition_versions.graph`.
 *    It is xyflow's NATIVE `{ nodes, edges, viewport }` shape, unchanged. No
 *    bespoke envelope, no id remapping, no `{ steps: [...] }` translation
 *    layer. `crm7/src/lib/workflows/workflow-engine.ts` runs a FLAT ARRAY of
 *    steps; a graph has branches and loops, and every previous attempt to make
 *    one shape serve both produced a lossy translation in the middle. The
 *    canvas persists what React Flow hands it, and the Phase 3 execution
 *    bridge reads the graph — it does not get a pre-flattened array.
 *
 * 2. THE TABLE CONTRACT — the row shapes of `workflow_definitions` and
 *    `workflow_definition_versions`. This package does NOT create those tables.
 *    The `workflow_definitions` migration owns them (Phase 1, authored in
 *    parallel). Every column named below is one that migration declares; if a
 *    name here and a name there disagree, the migration wins and this file is
 *    the thing that must change.
 *
 *    VERSION COLLISION — the plan reserves `20261102000000` for that file, and
 *    that version is ALREADY TAKEN on `development` by
 *    `20261102000000_training_contracts_training_plan_fk.sql` (merged as #2896
 *    on 2026-09-01, after the plan was written). `schema_migrations` is keyed on
 *    VERSION ALONE across eight applier scopes, so a colliding version is
 *    SILENTLY SKIPPED — the migration reports success twice and applies nothing.
 *    The workflow migration must take a later version.
 *
 * See `docs/plans/20260901-workflow-canvas-implementation-v1.00A.md` §3 Phase 1.
 */

import type { Edge, Node, Viewport } from '@xyflow/react';

// ---------------------------------------------------------------------------
// Node kinds
// ---------------------------------------------------------------------------

/**
 * The process vocabulary. `docs/plans/20260901-...-v1.00A.md` §1 item 1 records
 * that no generic node-type registry exists anywhere in the estate — both
 * shipped canvases (`SchemaCanvas`, `RelationshipCanvas`) hardcode ENTITY
 * nodes, which is the correct shape for a schema diagram and the wrong one for
 * a process. These five are the built-in kinds; the registry is open, so a
 * consumer can add its own without forking the package.
 */
export const WORKFLOW_NODE_KINDS = [
  'step',
  'decision',
  'terminator',
  'handoff',
  'swimlane',
] as const;

export type WorkflowNodeKind = (typeof WORKFLOW_NODE_KINDS)[number];

/**
 * A terminator is either the entry or the exit of the process, and WHICH ONE
 * decides its handle set — see `validation/connection.ts` rule R3. A `start`
 * has no target handle and an `end` has no source handle, so "an edge into a
 * terminator's output" is refused structurally rather than by a special case.
 */
export type TerminatorRole = 'start' | 'end';

// ---------------------------------------------------------------------------
// Handle contract
// ---------------------------------------------------------------------------

/**
 * Handles carry a KIND, and only same-kind handles may be joined (rule R4).
 *
 * Today there is one kind, `flow`. It exists as a named axis rather than an
 * implicit "everything connects to everything" so that the day a data/parameter
 * edge is added (Phase 4's Jodie-authored workflows are the likely first
 * caller) the refusal is already written and enforced by the same code path,
 * instead of being bolted on afterwards against a canvas full of live graphs.
 */
export type WorkflowHandleKind = 'flow';

/** Which edge of the card a handle sits on. Mirrors xyflow's `Position`. */
export type WorkflowHandleSide = 'left' | 'right' | 'top' | 'bottom';

export interface WorkflowHandleSpec {
  /** Stable handle id. Must be unique within a node. */
  id: string;
  /** Which end of an edge this handle can be. */
  role: 'source' | 'target';
  kind: WorkflowHandleKind;
  /** Which side of the card it sits on. */
  side: WorkflowHandleSide;
  /**
   * Position along that side, 0–100. Absent means centred. A four-way decision
   * distributes its branch handles down the right edge with this.
   */
  offsetPercent?: number;
  /** Human label — rendered beside a decision's branch handles. */
  label?: string;
  /**
   * True for the pair that exists SO THAT LOOPS READ AS LOOPS (`loop-in` on the
   * top edge, `loop-out` on the bottom). A rework edge drawn out of the same
   * right-hand handle as forward progress crosses the whole diagram and looks
   * like a mistake; routing it under the row is what makes "change rates and
   * resend for e-signing" legible as the loop it is. Purely presentational —
   * validation treats it as any other `flow` handle.
   */
  loop?: boolean;
}

// ---------------------------------------------------------------------------
// Node data payloads
// ---------------------------------------------------------------------------

/** Fields every workflow node carries, whatever its kind. */
export type WorkflowNodeCommonData = {
  /** The label the user reads on the card. */
  label: string;
  /** Optional longer prose shown in the properties panel. */
  description?: string;
  /**
   * The swimlane this node belongs to, by lane id. Redundant with xyflow's
   * `parentId` BY DESIGN: `parentId` is the rendering relationship and can be
   * absent while a graph is being laid out, whereas `laneId` is the process
   * FACT — who owns this step — and is what the execution bridge and Jodie
   * read. `computeSwimlaneLayout` derives `parentId` from `laneId`, never the
   * other way round.
   */
  laneId?: string;
};

export type StepNodeData = WorkflowNodeCommonData & {
  /**
   * Free-form marker for the Phase 3 execution bridge — e.g. `'send_esign'`.
   * Deliberately a string and not an enum: the action vocabulary is owned by
   * conduit's `r7-automation-processor`, not by the canvas, and duplicating an
   * enum here would give the estate two lists that drift.
   */
  actionKey?: string;
};

export type DecisionNodeData = WorkflowNodeCommonData & {
  /**
   * The branch labels, in order. Each becomes one source handle
   * (`branch:0`, `branch:1`, …). The apprentice process has a FOUR-way branch
   * out of *Host accepted placement?*, so this is a list, not a yes/no pair.
   */
  branches: string[];
};

export type TerminatorNodeData = WorkflowNodeCommonData & {
  role: TerminatorRole;
};

export type HandoffNodeData = WorkflowNodeCommonData & {
  /** Lane id the work passes TO. Rendered on the card so a cross-lane hop is legible. */
  toLaneId?: string;
};

export type SwimlaneNodeData = WorkflowNodeCommonData & {
  /** Stable lane id that member nodes reference via `laneId`. */
  laneId: string;
  /** Display order, top to bottom. */
  order: number;
};

// ---------------------------------------------------------------------------
// xyflow node/edge aliases
// ---------------------------------------------------------------------------

export type WorkflowNodeData =
  | StepNodeData
  | DecisionNodeData
  | TerminatorNodeData
  | HandoffNodeData
  | SwimlaneNodeData;

/**
 * A node on the canvas. `Node<T>` is xyflow's own generic — the data is ours,
 * the envelope is theirs, which is what keeps the round-trip lossless.
 *
 * The node-TYPE parameter is deliberately left at its default. Passing `string`
 * makes xyflow's `type` field REQUIRED, and it is not: React Flow renders a
 * typeless node with its own default component, and the registry is open, so
 * this package must be able to hold a node whose kind it has never heard of.
 */
export type WorkflowNode = Node<Record<string, unknown>>;

export type WorkflowEdge = Edge;

/**
 * EXACTLY what lands in `workflow_definition_versions.graph`.
 *
 * `viewport` is persisted so reopening a workflow returns the reader to where
 * they were rather than to a fresh `fitView` — a 41-edge process diagram looks
 * like a different document at a different pan.
 */
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;
}

/** The empty graph a brand-new draft starts from. */
export function emptyWorkflowGraph(): WorkflowGraph {
  return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
}

// ---------------------------------------------------------------------------
// Table contract — owned by the `workflow_definitions` migration (see header)
// ---------------------------------------------------------------------------

export type WorkflowVersionStatus = 'draft' | 'published' | 'archived';

/**
 * RECONCILED AGAINST THE MIGRATION, 2026-09-01 (Phase 2).
 *
 * The header above says the migration wins whenever a name here disagrees with
 * it. Three names did, and each was a runtime PostgREST 400 rather than a
 * cosmetic drift:
 *
 *  - `label` DOES NOT EXIST. `workflow_definitions` declares `name`. The
 *    service ordered its list by `label`, the rename mutation SET `label`, and
 *    `createWorkflowDefinition` inserted it, so listing, renaming and creating
 *    a workflow each returned `42703 column workflow_definitions.label does not
 *    exist`. The column is `name`, and `name` is what this file now declares.
 *  - `tenant_id` IS NULLABLE. A NULL is a PLATFORM TEMPLATE — the shared
 *    starting point every tenant can copy, and the entire subject of Phase 2's
 *    "Duplicate to my tenant". Typing it `string` made the templates
 *    unrepresentable, and the list query's `.eq('tenant_id', …)` then hid every
 *    one of them, so the feature had nothing to act on.
 *  - `key`, `app_scope` and `is_system` were MISSING here and `key` is NOT NULL
 *    with no default, so any insert built from this type violated it.
 *
 * `published_at` is the one addition in the other direction: the merged seed
 * (`supabase/seeds/20260901_apprentice_placement_workflow_seed.sql`) INSERTs it
 * and `publishVersion()` SETs it, and 20261103000000 never created it — so the
 * seed and every publish would have failed. Added by migration
 * 20261105000000_workflow_definition_versions_published_at.sql rather than by
 * editing a merged file, because a migration already merged may have been
 * applied somewhere and editing it in place would be silently skipped. (It was
 * authored at 20261104000000; that version was taken an hour later by
 * business-suite-unified#1085's execution bridge, in the same scope, and this
 * file moved. A census is a snapshot, not a reservation.)
 */
export interface WorkflowDefinitionRow {
  id: string;
  /**
   * NULL is a PLATFORM TEMPLATE, readable by every authenticated user and
   * writable only by a platform developer. Not an absent value — a meaningful
   * one, and the reason `listWorkflowDefinitions` cannot filter with `.eq`.
   */
  tenant_id: string | null;
  /**
   * Stable machine identifier — what an automation trigger names. Unique per
   * tenant and, because the constraint is `UNIQUE NULLS NOT DISTINCT`, unique
   * across platform templates too.
   */
  key: string;
  /** The display name. There is no `label` column; see the note above. */
  name: string;
  description: string | null;
  /** `'all'`, or an app slug such as `'crm7'`. Free text, deliberately. */
  app_scope: string;
  /** True for workflows the platform ships. Provenance, not permission. */
  is_system: boolean;
  /**
   * Consumers read the published graph ONLY through this pointer. A reader that
   * picks "the highest version number" gets whatever a half-finished draft has
   * in it; the pointer is what makes publish an atomic, reversible act.
   */
  current_published_version_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkflowDefinitionVersionRow {
  id: string;
  workflow_definition_id: string;
  /**
   * Its OWN tenant_id column, never a join-through to the parent. A join-through
   * RLS predicate is re-evaluated per row and cannot use the index, and the
   * estate has already shipped one policy that was open in exactly that shape.
   *
   * Nullable for the same reason as the parent's: a platform template's
   * versions carry NULL, and the composite FK is MATCH SIMPLE so the pair is
   * simply not checked when it contains one.
   */
  tenant_id: string | null;
  version: number;
  status: WorkflowVersionStatus;
  /** xyflow-native `{ nodes, edges, viewport }`. See the header. */
  graph: WorkflowGraph;
  /**
   * What starts this workflow — event name, schedule, or manual. Read by Phase
   * 3's execution bridge, which generalises conduit's r7_automation_queue
   * rather than growing a second queue. Inert until then.
   */
  trigger_config: Record<string, unknown> | null;
  /**
   * Prose grounding for Jodie (Phase 4). The six Lucidchart decision-rationale
   * notes go in here verbatim — they are the answers to "why does the process
   * do that", which no amount of graph topology encodes.
   */
  ai_context: Record<string, unknown> | null;
  created_by: string | null;
  published_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
}
