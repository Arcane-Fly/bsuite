/**
 * CONNECTION VALIDATION — LOOP-PERMISSIVE BY DESIGN.
 *
 * ============================================================================
 * THE ONE RULE THAT MATTERS MOST: CYCLES ARE ACCEPTED.
 * ============================================================================
 *
 * `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx`
 * runs a real cycle-detecting DFS (`wouldCreateCycle`, exported from that file)
 * and REFUSES any connection that would close one. That is correct there: those
 * edges are foreign keys, and a FK cycle is a schema that cannot be inserted
 * into without deferred constraints.
 *
 * It is WRONG here, and not marginally. The apprentice placement process the
 * canvas exists to draw REQUIRES loops, and the Lucidchart source
 * (`docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json`)
 * contains two of them by name:
 *
 *   "Change rates or placement and resend for e-signing"
 *        -> back to "Send placement for CRM-triggered e-signing"
 *   "Cancel placement and seek a new host"
 *        -> back to "Create or confirm host placement"
 *
 * Both are rework loops — the ordinary shape of any real business process that
 * can be sent back for correction. A canvas that refuses them cannot draw the
 * thing it was built to draw. So `wouldCreateCycle` is NOT called from this
 * module, and `loopPermissiveConnectionTest` in
 * `__tests__/connectionValidation.test.ts` asserts a cycle IS accepted. A test
 * that only proved rejection would be the bug, not the coverage.
 *
 * ============================================================================
 * WHAT IS STILL REFUSED, AND WHY EACH ONE IS NOT A LOOP QUESTION
 * ============================================================================
 *
 * R1  INCOMPLETE. No source, or no target. Nothing to attach.
 *
 * R2  SELF-LOOP (`source === target`). A step that flows straight back into
 *     itself, with no other node in between, cannot change any state between
 *     iterations — it is an infinite loop with no exit condition and no
 *     meaning in a process diagram. Note the boundary carefully: a TWO-node
 *     cycle A -> B -> A is ACCEPTED. Both apprentice loops are of that kind.
 *
 * R3  WRONG END OF A TERMINATOR. A `start` terminator declares only a source
 *     handle; an `end` only a target. So an edge INTO a start, or OUT of an
 *     end, has no handle to attach to and is refused. Enforced through the
 *     registry's declared handle set rather than as a special case, so a
 *     caller that fabricates a handle id gets the same refusal as a drag.
 *
 * R4  HANDLE-KIND MISMATCH. A source handle may only meet a target handle of
 *     the same `kind`, and a source may not meet a source. One kind (`flow`)
 *     exists today; the axis is named now so a later data/parameter edge is
 *     refused by this same code rather than by a bolt-on.
 *
 * R5  AN EDGE TOUCHING A CONTAINER. A swimlane groups steps; it is not itself
 *     a step. Edges attach to the work inside the lane. A lane declares no
 *     handles at all, so this is belt and braces over R3's mechanism.
 *
 * R6  DUPLICATE. The same (source, sourceHandle) -> (target, targetHandle)
 *     already exists. A second copy renders exactly on top of the first, so
 *     the user's drag appears to do nothing while quietly growing the graph.
 *     Not a loop rule: A -> B -> A adds two DISTINCT edges and passes.
 *
 * NOT REFUSED, EXPLICITLY:
 *   - cycles of any length >= 2 (the headline; see above)
 *   - several edges leaving one decision (the apprentice process's *Host
 *     accepted placement?* branches FOUR ways)
 *   - several edges arriving at one step (a join)
 *   - an edge crossing swimlanes — that is what a handoff IS, and treating a
 *     lane change as an error would refuse most of the diagram
 */

import type { Connection, Edge } from '@xyflow/react';

import type { WorkflowHandleSpec, WorkflowNode } from '../types.js';
import type { WorkflowNodeTypeRegistry } from '../nodes/registry.js';

/** Every refusal this module can return. Stable strings — the UI maps them to copy. */
export type ConnectionRefusalCode =
  | 'incomplete'
  | 'self-loop'
  | 'unknown-node'
  | 'unknown-handle'
  | 'wrong-handle-role'
  | 'handle-kind-mismatch'
  | 'container-node'
  | 'duplicate-edge';

export interface ConnectionVerdict {
  ok: boolean;
  code?: ConnectionRefusalCode;
  /** Sentence shown to the user. Present on every refusal. */
  reason?: string;
}

const ACCEPTED: ConnectionVerdict = { ok: true };

function refuse(code: ConnectionRefusalCode, reason: string): ConnectionVerdict {
  return { ok: false, code, reason };
}

export interface ValidateConnectionArgs {
  connection: Connection | Edge;
  nodes: readonly WorkflowNode[];
  edges: readonly Edge[];
  registry: WorkflowNodeTypeRegistry;
}

/**
 * Find the handle a connection names on a node.
 *
 * A NULL/absent handle id means "this node's default port for that role" —
 * xyflow omits the id when a node declares exactly one, and a graph IMPORTED
 * from a source that has no concept of ports (the Lucidchart apprentice
 * journey, for one) has none on any edge.
 *
 * Resolution, in order:
 *   1. an exact id match, when one was given
 *   2. the sole handle of that role
 *   3. the sole NON-LOOP handle of that role
 *
 * Step 3 is not a convenience, it is the fix for a real refusal. Every ordinary
 * node declares TWO target handles — `in` and `loop-in` — because loops are a
 * first-class affordance here, so step 2 alone was ambiguous for every step on
 * the canvas and refused every handle-less edge with "that step has no incoming
 * connection point", which was false. `loop-*` is a PRESENTATIONAL variant (it
 * routes the edge under the row); the primary port is the default, and that is
 * what an edge with no opinion gets.
 *
 * A decision deliberately does NOT resolve: its outputs are `branch:0..n`, all
 * non-loop, so an edge leaving one must say WHICH branch. Picking a branch on
 * the user's behalf would be inventing process semantics.
 */
function resolveHandle(
  specs: readonly WorkflowHandleSpec[],
  handleId: string | null | undefined,
  role: 'source' | 'target',
): WorkflowHandleSpec | undefined {
  if (handleId !== null && handleId !== undefined && handleId !== '') {
    return specs.find((s) => s.id === handleId);
  }
  const ofRole = specs.filter((s) => s.role === role);
  if (ofRole.length === 1) return ofRole[0];
  const primary = ofRole.filter((s) => !s.loop);
  return primary.length === 1 ? primary[0] : undefined;
}

/**
 * The full verdict, with a reason. `isValidConnection` below is the boolean
 * xyflow wants; this is what the UI shows when it needs to say WHY a drop was
 * refused rather than just dropping it on the floor.
 */
export function validateConnection({
  connection,
  nodes,
  edges,
  registry,
}: ValidateConnectionArgs): ConnectionVerdict {
  const { source, target, sourceHandle, targetHandle } = connection;

  // R1
  if (!source || !target) {
    return refuse('incomplete', 'A connection needs both a start and an end.');
  }

  // R2 — and ONLY the single-node case. See the header.
  if (source === target) {
    return refuse(
      'self-loop',
      'A step cannot loop straight back into itself. Route the loop through at least one other step.',
    );
  }

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  if (!sourceNode || !targetNode) {
    return refuse('unknown-node', 'One end of this connection is not on the canvas.');
  }

  // R5 — checked before handles so the message names the real problem.
  if (registry.isContainer(sourceNode.type) || registry.isContainer(targetNode.type)) {
    return refuse(
      'container-node',
      'A swimlane groups steps; connect the steps inside it instead.',
    );
  }

  const sourceSpecs = registry.handlesFor(sourceNode);
  const targetSpecs = registry.handlesFor(targetNode);

  const sourceSpec = resolveHandle(sourceSpecs, sourceHandle, 'source');
  const targetSpec = resolveHandle(targetSpecs, targetHandle, 'target');

  // R3 — a start terminator has no target handle, an end has no source, so
  // this is where "an edge into a terminator's output" actually dies.
  if (!sourceSpec) {
    return refuse(
      'unknown-handle',
      'That step has no outgoing connection point — an end marker only receives.',
    );
  }
  if (!targetSpec) {
    return refuse(
      'unknown-handle',
      'That step has no incoming connection point — a start marker only sends.',
    );
  }

  // R4a — roles must be opposite.
  if (sourceSpec.role !== 'source') {
    return refuse('wrong-handle-role', 'A connection must leave from an outgoing point.');
  }
  if (targetSpec.role !== 'target') {
    return refuse('wrong-handle-role', 'A connection must arrive at an incoming point.');
  }

  // R4b — kinds must match.
  if (sourceSpec.kind !== targetSpec.kind) {
    return refuse(
      'handle-kind-mismatch',
      `A ${sourceSpec.kind} connection point cannot join a ${targetSpec.kind} one.`,
    );
  }

  // R6 — same pair of handles already joined. Compare NORMALISED handle ids so
  // an explicit id and the implicit "only handle" spelling of the same port are
  // recognised as the same edge; otherwise a second identical edge would slip
  // through and render on top of the first.
  const already = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      (resolveHandle(sourceSpecs, e.sourceHandle, 'source')?.id ?? null) === sourceSpec.id &&
      (resolveHandle(targetSpecs, e.targetHandle, 'target')?.id ?? null) === targetSpec.id,
  );
  if (already) {
    return refuse('duplicate-edge', 'These two points are already connected.');
  }

  // Everything else — cycles very much included — is allowed.
  return ACCEPTED;
}

/**
 * The `isValidConnection` prop for `<ReactFlow>`. Boolean only, because that is
 * what the library takes; call `validateConnection` when a reason is needed.
 */
export function createIsValidConnection(args: {
  nodes: readonly WorkflowNode[];
  edges: readonly Edge[];
  registry: WorkflowNodeTypeRegistry;
}): (connection: Connection | Edge) => boolean {
  return (connection) => validateConnection({ ...args, connection }).ok;
}
