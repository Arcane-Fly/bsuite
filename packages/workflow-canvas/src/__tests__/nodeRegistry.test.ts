/**
 * The node-type registry — the thing that genuinely did not exist.
 *
 * These assert the four properties the rest of the package leans on: the built
 * -in vocabulary is present, `nodeTypes` is the object React Flow can be handed
 * and is stable, handle sets follow the node's DATA, and the registry is open
 * without being mutable.
 */

import { describe, expect, it } from 'vitest';

import {
  BUILT_IN_NODE_DESCRIPTORS,
  DuplicateNodeKindError,
  createNodeTypeRegistry,
  workflowNodeTypeRegistry,
} from '../nodes/registry.js';
import type { WorkflowNodeTypeDescriptor } from '../nodes/registry.js';
import { StepNode } from '../nodes/StepNode.js';
import { StepNodeDataSchema } from '../schemas.js';
import { WORKFLOW_NODE_KINDS } from '../types.js';

describe('workflowNodeTypeRegistry — the built-in vocabulary', () => {
  it('registers every declared kind, and nothing else', () => {
    // A non-zero denominator before any per-item verdict.
    expect(BUILT_IN_NODE_DESCRIPTORS.length).toBe(WORKFLOW_NODE_KINDS.length);
    expect([...workflowNodeTypeRegistry.kinds].sort()).toEqual(
      [...WORKFLOW_NODE_KINDS].sort(),
    );
  });

  it('exposes the process vocabulary the apprentice journey needs', () => {
    for (const kind of ['step', 'decision', 'terminator', 'handoff', 'swimlane']) {
      expect(workflowNodeTypeRegistry.has(kind)).toBe(true);
    }
  });

  it('hands React Flow a nodeTypes object keyed by kind', () => {
    const nodeTypes = workflowNodeTypeRegistry.nodeTypes;
    expect(Object.keys(nodeTypes).sort()).toEqual([...WORKFLOW_NODE_KINDS].sort());
    expect(nodeTypes.step).toBe(StepNode);
  });

  it('keeps nodeTypes referentially stable — xyflow remounts every node if it changes', () => {
    expect(workflowNodeTypeRegistry.nodeTypes).toBe(workflowNodeTypeRegistry.nodeTypes);
    expect(Object.isFrozen(workflowNodeTypeRegistry.nodeTypes)).toBe(true);
  });

  it('marks the swimlane, and only the swimlane, as a container', () => {
    expect(workflowNodeTypeRegistry.isContainer('swimlane')).toBe(true);
    for (const kind of ['step', 'decision', 'terminator', 'handoff']) {
      expect(workflowNodeTypeRegistry.isContainer(kind)).toBe(false);
    }
  });

  it('keeps the swimlane out of the step palette', () => {
    expect(workflowNodeTypeRegistry.palette.map((d) => d.kind)).not.toContain('swimlane');
    expect(workflowNodeTypeRegistry.palette.map((d) => d.kind)).toContain('step');
  });
});

describe('handlesFor — handles follow the node DATA, not just its kind', () => {
  it('gives a decision one source handle per branch', () => {
    const two = workflowNodeTypeRegistry.handlesFor({
      type: 'decision',
      data: { label: 'Q', branches: ['Yes', 'No'] },
    });
    const four = workflowNodeTypeRegistry.handlesFor({
      type: 'decision',
      data: {
        label: 'Host accepted placement?',
        branches: ['Yes', 'Change rates', 'Manual approval', 'Cancel'],
      },
    });
    expect(two.filter((h) => h.id.startsWith('branch:'))).toHaveLength(2);
    // The apprentice process's widest decision. A fixed yes/no pair could not
    // draw it.
    expect(four.filter((h) => h.id.startsWith('branch:'))).toHaveLength(4);
  });

  it('gives a START terminator an outgoing handle and NO incoming one', () => {
    const specs = workflowNodeTypeRegistry.handlesFor({
      type: 'terminator',
      data: { label: 'Start', role: 'start' },
    });
    expect(specs.map((s) => s.role)).toEqual(['source']);
  });

  it('gives an END terminator an incoming handle and NO outgoing one', () => {
    const specs = workflowNodeTypeRegistry.handlesFor({
      type: 'terminator',
      data: { label: 'End', role: 'end' },
    });
    expect(specs.map((s) => s.role)).toEqual(['target']);
  });

  it('gives a swimlane no handles at all', () => {
    expect(
      workflowNodeTypeRegistry.handlesFor({
        type: 'swimlane',
        data: { label: 'Apprentice', laneId: 'apprentice', order: 0 },
      }),
    ).toHaveLength(0);
  });

  it('gives an unknown kind no handles, so nothing can attach to it', () => {
    expect(
      workflowNodeTypeRegistry.handlesFor({ type: 'not-a-kind', data: {} }),
    ).toHaveLength(0);
  });

  it('gives a step a loop-in and a loop-out — loops are a first-class affordance', () => {
    const specs = workflowNodeTypeRegistry.handlesFor({
      type: 'step',
      data: { label: 'Send placement for e-signing' },
    });
    expect(specs.filter((s) => s.loop).map((s) => s.id).sort()).toEqual([
      'loop-in',
      'loop-out',
    ]);
  });
});

describe('validateNodeData', () => {
  it('accepts data that satisfies the kind schema', () => {
    expect(
      workflowNodeTypeRegistry.validateNodeData('step', { label: 'Do the thing' }).ok,
    ).toBe(true);
  });

  it('rejects a decision with fewer than two branches — that is a step', () => {
    const v = workflowNodeTypeRegistry.validateNodeData('decision', {
      label: 'Q',
      branches: ['Yes'],
    });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('branches');
  });

  it('rejects an unknown kind by name', () => {
    const v = workflowNodeTypeRegistry.validateNodeData('webhook', { label: 'x' });
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('webhook');
  });
});

describe('the registry is OPEN but not mutable', () => {
  const delayDescriptor: WorkflowNodeTypeDescriptor = {
    kind: 'delay',
    label: 'Delay',
    description: 'Wait before continuing.',
    component: StepNode,
    handles: () => [],
    container: false,
    paletteVisible: true,
    defaultSize: { width: 180, height: 72 },
    defaultData: () => ({ label: 'Wait' }),
    dataSchema: StepNodeDataSchema,
  };

  it('extend() returns a NEW registry carrying the extra kind', () => {
    const extended = workflowNodeTypeRegistry.extend([delayDescriptor]);
    expect(extended.has('delay')).toBe(true);
    expect(extended.has('step')).toBe(true);
    expect(extended).not.toBe(workflowNodeTypeRegistry);
  });

  it('extend() leaves the original registry untouched', () => {
    workflowNodeTypeRegistry.extend([delayDescriptor]);
    expect(workflowNodeTypeRegistry.has('delay')).toBe(false);
    expect(workflowNodeTypeRegistry.kinds).toHaveLength(WORKFLOW_NODE_KINDS.length);
  });

  it('refuses a duplicate kind rather than silently keeping one of the two', () => {
    // Asserts the OUTCOME, not the wording (operator ruling 2026-08-26): the
    // named error type and the `kind` it carries, so rewording the message
    // cannot quietly change what this test proves.
    let thrown: unknown;
    try {
      createNodeTypeRegistry([
        ...BUILT_IN_NODE_DESCRIPTORS,
        { ...delayDescriptor, kind: 'step' },
      ]);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(DuplicateNodeKindError);
    expect((thrown as DuplicateNodeKindError).kind).toBe('step');
    expect((thrown as DuplicateNodeKindError).code).toBe('duplicate-node-kind');
  });
});
