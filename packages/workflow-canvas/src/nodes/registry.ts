/**
 * THE GENERIC NODE-TYPE REGISTRY.
 *
 * `docs/plans/20260901-workflow-canvas-implementation-v1.00A.md` §1 item 1
 * records the gap this fills: there is no generic `nodeTypes` registry anywhere
 * in the estate. `packages/schema-builder/src/components/SchemaCanvas.tsx:76`
 * is `const nodeTypes = { entity: EntityNode }` and
 * `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx:234`
 * is `const nodeTypes = { entity: EntityNode, reference: ReferenceNode }` —
 * both correct for a schema diagram, both closed. A process canvas needs the
 * set to be OPEN, because the vocabulary grows (a delay node, a webhook node,
 * a Jodie-authored node in Phase 4) and forking the package for each one is how
 * four duplicated React Flow builders happened the first time.
 *
 * A descriptor answers four questions in one place, so they cannot drift:
 *
 *   what does it LOOK like   -> `component`
 *   what can it CONNECT to   -> `handles(data)`, read by both the card and
 *                               `isValidConnection`
 *   what does it MEAN        -> `dataSchema`, enforced on save
 *   how does it BEHAVE       -> `container`, `defaultSize`, `defaultData`
 *
 * The registry is immutable. `extend()` returns a NEW registry rather than
 * mutating this one, because `nodeTypes` must be referentially stable for the
 * life of a `<ReactFlow>` mount — xyflow re-creates every node component when
 * that object's identity changes, which loses selection, drag state and focus.
 */

import type { ComponentType } from 'react';
import type { NodeProps, NodeTypes } from '@xyflow/react';
import type { ZodType } from 'zod';

import {
  BUILT_IN_NODE_DATA_SCHEMAS,
  DecisionNodeDataSchema,
  HandoffNodeDataSchema,
  StepNodeDataSchema,
  SwimlaneNodeDataSchema,
  TerminatorNodeDataSchema,
} from '../schemas.js';
import type { WorkflowHandleSpec, WorkflowNode } from '../types.js';
import { DECISION_DEFAULT_SIZE, DecisionNode, decisionHandles } from './DecisionNode.js';
import { HANDOFF_DEFAULT_SIZE, HandoffNode } from './HandoffNode.js';
import { STEP_DEFAULT_SIZE, StepNode } from './StepNode.js';
import {
  SWIMLANE_DEFAULT_SIZE,
  SwimlaneNode,
} from './SwimlaneNode.js';
import {
  TERMINATOR_DEFAULT_SIZE,
  TerminatorNode,
  terminatorHandles,
} from './TerminatorNode.js';
import { SEQUENTIAL_HANDLES } from './handles.js';

export interface WorkflowNodeTypeDescriptor {
  /** The value that goes in `node.type`. Unique within a registry. */
  kind: string;
  /** Palette label, in the user's nouns. */
  label: string;
  /** One sentence explaining when to reach for it. */
  description: string;
  component: ComponentType<NodeProps>;
  /**
   * The handles this kind declares FOR THE GIVEN DATA. A function, not a list,
   * because a decision's ports follow its branch count and a terminator's
   * follow its start/end role.
   */
  handles: (data: unknown) => readonly WorkflowHandleSpec[];
  /**
   * True when this kind is an xyflow parent that other nodes sit inside. A
   * container declares no handles and refuses every edge (rule R5).
   */
  container: boolean;
  /** Offered in the node palette. A container is placed by the lane editor. */
  paletteVisible: boolean;
  defaultSize: { width: number; height: number };
  /** Seed data for a freshly-dropped node. Must satisfy `dataSchema`. */
  defaultData: () => Record<string, unknown>;
  /** Validates `node.data` on save. */
  dataSchema: ZodType;
}

export interface NodeDataValidation {
  ok: boolean;
  /** Human-readable reason, present only when `ok` is false. */
  reason?: string;
}

export interface WorkflowNodeTypeRegistry {
  /** Every registered kind, in registration order. */
  readonly kinds: readonly string[];
  /** Descriptors for the palette, in registration order. */
  readonly palette: readonly WorkflowNodeTypeDescriptor[];
  /**
   * The object handed straight to `<ReactFlow nodeTypes>`. Frozen and
   * referentially stable — see the header for why that matters.
   */
  readonly nodeTypes: NodeTypes;
  get(kind: string | undefined): WorkflowNodeTypeDescriptor | undefined;
  has(kind: string | undefined): boolean;
  /** Handles a node declares. Empty for an unknown kind — nothing may attach. */
  handlesFor(node: Pick<WorkflowNode, 'type' | 'data'>): readonly WorkflowHandleSpec[];
  /** Is this kind a swimlane-style container? */
  isContainer(kind: string | undefined): boolean;
  validateNodeData(kind: string | undefined, data: unknown): NodeDataValidation;
  /** A NEW registry with these descriptors added. Never mutates the receiver. */
  extend(extra: readonly WorkflowNodeTypeDescriptor[]): WorkflowNodeTypeRegistry;
}

export function createNodeTypeRegistry(
  descriptors: readonly WorkflowNodeTypeDescriptor[],
): WorkflowNodeTypeRegistry {
  const byKind = new Map<string, WorkflowNodeTypeDescriptor>();
  for (const d of descriptors) {
    if (byKind.has(d.kind)) {
      // Silently keeping one of two would give the canvas a node type whose
      // card and whose validation came from different descriptors.
      throw new Error(
        `Duplicate workflow node kind '${d.kind}' — a registry may declare each kind once.`,
      );
    }
    byKind.set(d.kind, d);
  }

  const nodeTypes: NodeTypes = Object.freeze(
    Object.fromEntries(descriptors.map((d) => [d.kind, d.component])),
  ) as NodeTypes;

  const ordered = Object.freeze([...descriptors]);

  const registry: WorkflowNodeTypeRegistry = {
    kinds: Object.freeze(descriptors.map((d) => d.kind)),
    palette: Object.freeze(descriptors.filter((d) => d.paletteVisible)),
    nodeTypes,
    get: (kind) => (kind === undefined ? undefined : byKind.get(kind)),
    has: (kind) => kind !== undefined && byKind.has(kind),
    handlesFor: (node) => {
      const d = node.type === undefined ? undefined : byKind.get(node.type);
      return d ? d.handles(node.data) : [];
    },
    isContainer: (kind) =>
      kind !== undefined && (byKind.get(kind)?.container ?? false),
    validateNodeData: (kind, data) => {
      const d = kind === undefined ? undefined : byKind.get(kind);
      if (!d) {
        return {
          ok: false,
          reason: `Unknown node kind '${String(kind)}' — it is not in this registry.`,
        };
      }
      const parsed = d.dataSchema.safeParse(data);
      return parsed.success
        ? { ok: true }
        : {
            ok: false,
            reason: parsed.error.issues
              .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
              .join('; '),
          };
    },
    extend: (extra) => createNodeTypeRegistry([...ordered, ...extra]),
  };

  return Object.freeze(registry);
}

// ---------------------------------------------------------------------------
// The built-in descriptors
// ---------------------------------------------------------------------------

export const STEP_DESCRIPTOR: WorkflowNodeTypeDescriptor = {
  kind: 'step',
  label: 'Step',
  description: 'Something a party does. The default building block.',
  component: StepNode,
  handles: () => SEQUENTIAL_HANDLES,
  container: false,
  paletteVisible: true,
  defaultSize: STEP_DEFAULT_SIZE,
  defaultData: () => ({ label: 'New step' }),
  dataSchema: StepNodeDataSchema,
};

export const DECISION_DESCRIPTOR: WorkflowNodeTypeDescriptor = {
  kind: 'decision',
  label: 'Decision',
  description: 'A question with two or more answers, each leaving by its own branch.',
  component: DecisionNode,
  handles: decisionHandles,
  container: false,
  paletteVisible: true,
  defaultSize: DECISION_DEFAULT_SIZE,
  defaultData: () => ({ label: 'New decision', branches: ['Yes', 'No'] }),
  dataSchema: DecisionNodeDataSchema,
};

export const TERMINATOR_DESCRIPTOR: WorkflowNodeTypeDescriptor = {
  kind: 'terminator',
  label: 'Start / End',
  description: 'Where the process begins or finishes. A start only sends; an end only receives.',
  component: TerminatorNode,
  handles: terminatorHandles,
  container: false,
  paletteVisible: true,
  defaultSize: TERMINATOR_DEFAULT_SIZE,
  defaultData: () => ({ label: 'End', role: 'end' }),
  dataSchema: TerminatorNodeDataSchema,
};

export const HANDOFF_DESCRIPTOR: WorkflowNodeTypeDescriptor = {
  kind: 'handoff',
  label: 'Handoff',
  description: 'Work passing to another party — the point where the lane changes.',
  component: HandoffNode,
  handles: () => SEQUENTIAL_HANDLES,
  container: false,
  paletteVisible: true,
  defaultSize: HANDOFF_DEFAULT_SIZE,
  defaultData: () => ({ label: 'New handoff' }),
  dataSchema: HandoffNodeDataSchema,
};

export const SWIMLANE_DESCRIPTOR: WorkflowNodeTypeDescriptor = {
  kind: 'swimlane',
  label: 'Swimlane',
  description: 'A party who owns the steps inside it. Steps cannot be dragged out of their lane.',
  component: SwimlaneNode,
  // A container declares NO handles. See SwimlaneNode's header.
  handles: () => [],
  container: true,
  // Lanes are added by the lane editor, not dropped from the step palette —
  // placing one is a decision about who is in the process, not about a step.
  paletteVisible: false,
  defaultSize: SWIMLANE_DEFAULT_SIZE,
  defaultData: () => ({ label: 'New lane', laneId: 'lane', order: 0 }),
  dataSchema: SwimlaneNodeDataSchema,
};

export const BUILT_IN_NODE_DESCRIPTORS: readonly WorkflowNodeTypeDescriptor[] = [
  TERMINATOR_DESCRIPTOR,
  STEP_DESCRIPTOR,
  DECISION_DESCRIPTOR,
  HANDOFF_DESCRIPTOR,
  SWIMLANE_DESCRIPTOR,
];

/** The default registry. Consumers that need more call `.extend()`. */
export const workflowNodeTypeRegistry: WorkflowNodeTypeRegistry =
  createNodeTypeRegistry(BUILT_IN_NODE_DESCRIPTORS);

export { BUILT_IN_NODE_DATA_SCHEMAS };
