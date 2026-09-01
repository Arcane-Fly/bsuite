/**
 * LOOP-PERMISSIVE VALIDATION.
 *
 * The first describe block is the one that matters. `RelationshipCanvas` runs a
 * cycle-detecting DFS and REFUSES cycles; that is correct for foreign keys and
 * wrong for a business process. A test suite that only proved refusals would be
 * the bug, so the assertions below prove ACCEPTANCE first, against the two
 * loops the apprentice journey actually contains.
 */

import { describe, expect, it } from 'vitest';

import { workflowNodeTypeRegistry } from '../nodes/registry.js';
import { createIsValidConnection, validateConnection } from '../validation/connection.js';
import type { WorkflowEdge, WorkflowNode } from '../types.js';
import { apprenticeFragment } from './fixtures.js';

const registry = workflowNodeTypeRegistry;

function check(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
  connection: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  },
) {
  return validateConnection({
    connection: {
      sourceHandle: null,
      targetHandle: null,
      ...connection,
    },
    nodes,
    edges,
    registry,
  });
}

// ===========================================================================
// THE HEADLINE: A CYCLE IS ACCEPTED
// ===========================================================================

describe('cycles ARE accepted — the apprentice process requires them', () => {
  it('accepts the rework loop: change rates -> back to send for e-signing', () => {
    const { nodes, edges } = apprenticeFragment();
    // Drop the loop edge so we can re-create it as a fresh connection.
    const without = edges.filter((e) => e.id !== 'e-loop-resend');

    const verdict = check(nodes, without, {
      source: 'change-rates',
      target: 'send-esign',
      sourceHandle: 'loop-out',
      targetHandle: 'loop-in',
    });

    expect(verdict.ok).toBe(true);
    expect(verdict.code).toBeUndefined();
  });

  it('accepts the re-host loop: cancel placement -> back to create or confirm host placement', () => {
    const { nodes, edges } = apprenticeFragment();
    const without = edges.filter((e) => e.id !== 'e-loop-rehost');

    const verdict = check(nodes, without, {
      source: 'cancel-placement',
      target: 'create-placement',
      sourceHandle: 'loop-out',
      targetHandle: 'loop-in',
    });

    expect(verdict.ok).toBe(true);
  });

  it('accepts a TWO-node cycle, the tightest loop that is still meaningful', () => {
    const nodes: WorkflowNode[] = [
      { id: 'a', type: 'step', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'b', type: 'step', position: { x: 0, y: 0 }, data: { label: 'B' } },
    ];
    const edges: WorkflowEdge[] = [
      { id: 'a-b', source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'in' },
    ];

    // b -> a closes the cycle. A DFS-based validator refuses exactly this.
    const verdict = check(nodes, edges, {
      source: 'b',
      target: 'a',
      sourceHandle: 'loop-out',
      targetHandle: 'loop-in',
    });

    expect(verdict.ok).toBe(true);
  });

  it('accepts a long cycle back through a decision', () => {
    const { nodes, edges } = apprenticeFragment();
    // link-placement -> create-placement closes a 4-node loop through the
    // decision. Nothing about its length changes the answer.
    const verdict = check(nodes, edges, {
      source: 'link-placement',
      target: 'create-placement',
      sourceHandle: 'loop-out',
      targetHandle: 'loop-in',
    });
    expect(verdict.ok).toBe(true);
  });

  it('accepts every edge in the shipped apprentice fragment, loops included', () => {
    const { nodes, edges } = apprenticeFragment();
    // A non-zero denominator, stated before the verdict.
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) {
      const others = edges.filter((x) => x.id !== e.id);
      const verdict = check(nodes, others, {
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      });
      expect(verdict.ok, `${e.id}: ${verdict.reason ?? ''}`).toBe(true);
    }
  });
});

// ===========================================================================
// A FOUR-WAY BRANCH IS ACCEPTED
// ===========================================================================

describe('fan-out and fan-in are accepted', () => {
  it('accepts all four branches leaving *Host accepted placement?*', () => {
    const { nodes } = apprenticeFragment();
    const targets = ['link-placement', 'change-rates', 'cancel-placement', 'accept-offer'];
    const accumulated: WorkflowEdge[] = [];
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i] as string;
      const verdict = check(nodes, accumulated, {
        source: 'host-accepted',
        target,
        sourceHandle: `branch:${i}`,
        targetHandle: 'in',
      });
      expect(verdict.ok, `branch:${i} -> ${target}: ${verdict.reason ?? ''}`).toBe(true);
      accumulated.push({
        id: `e-${i}`,
        source: 'host-accepted',
        target,
        sourceHandle: `branch:${i}`,
        targetHandle: 'in',
      });
    }
  });

  it('accepts several edges arriving at one step (a join)', () => {
    const { nodes } = apprenticeFragment();
    const existing: WorkflowEdge[] = [
      {
        id: 'j1',
        source: 'change-rates',
        target: 'link-placement',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ];
    const verdict = check(nodes, existing, {
      source: 'cancel-placement',
      target: 'link-placement',
      sourceHandle: 'out',
      targetHandle: 'in',
    });
    expect(verdict.ok).toBe(true);
  });

  it('accepts an edge that CROSSES a swimlane — that is what a handoff is', () => {
    const { nodes, edges } = apprenticeFragment();
    // send-esign is in the GTO lane; host-accepted is in the host lane.
    const without = edges.filter((e) => e.id !== 'e-send-decision');
    expect(
      check(nodes, without, {
        source: 'send-esign',
        target: 'host-accepted',
        sourceHandle: 'out',
        targetHandle: 'in',
      }).ok,
    ).toBe(true);
  });
});

// ===========================================================================
// WHAT IS STILL REFUSED
// ===========================================================================

describe('refusals — each one for a reason that is not "it is a cycle"', () => {
  const { nodes, edges } = apprenticeFragment();

  it('R1 refuses an incomplete connection', () => {
    const verdict = validateConnection({
      // xyflow types `source` as a string, but the runtime hands over a partial
      // Connection mid-drag; the cast reproduces that rather than pretending it
      // cannot happen.
      connection: {
        source: null,
        target: 'send-esign',
        sourceHandle: null,
        targetHandle: null,
      } as unknown as Parameters<typeof validateConnection>[0]['connection'],
      nodes,
      edges,
      registry,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('incomplete');
  });

  it('R2 refuses a SELF-loop — and only the single-node case', () => {
    const verdict = check(nodes, edges, {
      source: 'send-esign',
      target: 'send-esign',
      sourceHandle: 'loop-out',
      targetHandle: 'loop-in',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('self-loop');
  });

  it('R3 refuses an edge INTO a start terminator — it has no incoming point', () => {
    const verdict = check(nodes, edges, {
      source: 'create-placement',
      target: 'start',
      sourceHandle: 'out',
      targetHandle: 'in',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('unknown-handle');
  });

  it('R3 refuses an edge OUT of an end terminator — it has no outgoing point', () => {
    const verdict = check(nodes, edges, {
      source: 'end',
      target: 'create-placement',
      sourceHandle: 'out',
      targetHandle: 'in',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('unknown-handle');
  });

  it('R4 refuses a source handle used as a target', () => {
    const verdict = check(nodes, edges, {
      source: 'create-placement',
      target: 'send-esign',
      sourceHandle: 'out',
      // 'out' is a SOURCE handle; using it as the arrival point is not a valid
      // edge even though both nodes and both ids exist.
      targetHandle: 'out',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('wrong-handle-role');
  });

  it('R5 refuses an edge touching a swimlane container', () => {
    const verdict = check(nodes, edges, {
      source: 'create-placement',
      target: 'lane-host-employer',
      sourceHandle: 'out',
      targetHandle: 'in',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('container-node');
  });

  it('R6 refuses an exact duplicate of an existing edge', () => {
    const withEdge: WorkflowEdge[] = [
      {
        id: 'dup',
        source: 'create-placement',
        target: 'send-esign',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ];
    const verdict = check(nodes, withEdge, {
      source: 'create-placement',
      target: 'send-esign',
      sourceHandle: 'out',
      targetHandle: 'in',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('duplicate-edge');
  });

  it('R6 does NOT refuse the reverse edge — which is exactly how a loop is built', () => {
    const withEdge: WorkflowEdge[] = [
      {
        id: 'fwd',
        source: 'create-placement',
        target: 'send-esign',
        sourceHandle: 'out',
        targetHandle: 'in',
      },
    ];
    const verdict = check(nodes, withEdge, {
      source: 'send-esign',
      target: 'create-placement',
      sourceHandle: 'loop-out',
      targetHandle: 'loop-in',
    });
    expect(verdict.ok).toBe(true);
  });

  it('refuses a connection naming a node that is not on the canvas', () => {
    const verdict = check(nodes, edges, {
      source: 'create-placement',
      target: 'ghost',
      sourceHandle: 'out',
      targetHandle: 'in',
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.code).toBe('unknown-node');
  });

  it('every refusal carries a sentence the UI can show', () => {
    const refusals = [
      check(nodes, edges, { source: 'send-esign', target: 'send-esign' }),
      check(nodes, edges, { source: 'create-placement', target: 'lane-apprentice' }),
      check(nodes, edges, { source: 'end', target: 'create-placement' }),
    ];
    expect(refusals).toHaveLength(3);
    for (const r of refusals) {
      expect(r.ok).toBe(false);
      expect(typeof r.reason).toBe('string');
      expect((r.reason ?? '').length).toBeGreaterThan(10);
    }
  });
});

describe('createIsValidConnection — the boolean xyflow is handed', () => {
  it('mirrors validateConnection, and still lets a loop through', () => {
    const { nodes, edges } = apprenticeFragment();
    const isValid = createIsValidConnection({ nodes, edges, registry });

    expect(
      isValid({
        source: 'link-placement',
        target: 'create-placement',
        sourceHandle: 'loop-out',
        targetHandle: 'loop-in',
      }),
    ).toBe(true);

    expect(
      isValid({
        source: 'send-esign',
        target: 'send-esign',
        sourceHandle: 'loop-out',
        targetHandle: 'loop-in',
      }),
    ).toBe(false);
  });
});
