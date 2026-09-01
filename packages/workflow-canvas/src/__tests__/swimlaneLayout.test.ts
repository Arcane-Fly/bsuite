/**
 * Swimlane parenting, and the proof that dagre is REUSED rather than
 * reimplemented.
 *
 * The spy in the first block is the whole point of the "add no dependency"
 * constraint: it asserts the layout goes through
 * `@bsuite/schema-builder/auto-layout`'s `computeDagreLayout`, so a future
 * change that quietly reimplements ranking here — and re-bundles dagre, or
 * worse, hand-rolls it — fails.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as schemaBuilderLayout from '@bsuite/schema-builder/auto-layout';
import { computeSwimlaneLayout } from '../utils/autoLayout.js';
import { SWIMLANE_HEADER_HEIGHT } from '../nodes/SwimlaneNode.js';
import type { WorkflowNode } from '../types.js';
import { APPRENTICE_LANES, apprenticeFragment } from './fixtures.js';

describe('the dagre call is the one schema-builder already ships', () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(schemaBuilderLayout, 'computeDagreLayout');
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('invokes computeDagreLayout exactly once per layout pass', () => {
    const { nodes, edges } = apprenticeFragment();
    computeSwimlaneLayout(nodes, edges);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('asks it for a LEFT-TO-RIGHT rank — process order runs across, lanes run down', () => {
    const { nodes, edges } = apprenticeFragment();
    computeSwimlaneLayout(nodes, edges);
    const options = spy.mock.calls[0]?.[2] as { rankdir?: string } | undefined;
    expect(options?.rankdir).toBe('LR');
  });

  it('hands it the MEMBERS only — a lane is not a rank', () => {
    const { nodes, edges } = apprenticeFragment();
    computeSwimlaneLayout(nodes, edges);
    const given = spy.mock.calls[0]?.[0] as WorkflowNode[];
    expect(given.some((n) => n.type === 'swimlane')).toBe(false);
    expect(given.length).toBe(nodes.filter((n) => n.type !== 'swimlane').length);
  });

  it('does not filter the loop edges out before handing them over', () => {
    const { nodes, edges } = apprenticeFragment();
    computeSwimlaneLayout(nodes, edges);
    const givenEdges = spy.mock.calls[0]?.[1] as { id: string }[];
    const ids = givenEdges.map((e) => e.id);
    // Dagre breaks cycles internally for ranking; it does not need the loops
    // removed, and removing them would change where every downstream node lands.
    expect(ids).toContain('e-loop-resend');
    expect(ids).toContain('e-loop-rehost');
  });
});

describe('swimlane parenting', () => {
  it('parents every member into the lane its data names', () => {
    const { nodes, edges } = apprenticeFragment();
    const { nodes: out } = computeSwimlaneLayout(nodes, edges);

    const members = out.filter((n) => n.type !== 'swimlane');
    expect(members.length).toBeGreaterThan(0);

    for (const m of members) {
      const laneId = (m.data as { laneId?: string }).laneId;
      expect(m.parentId, `${m.id} lost its parent`).toBe(`lane-${laneId}`);
      // `extent: 'parent'` is what stops a drag moving a step into a lane that
      // does not own it. Without it the picture and the data can disagree.
      expect(m.extent).toBe('parent');
    }
  });

  it('emits every lane BEFORE its children — xyflow requires that order', () => {
    const { nodes, edges } = apprenticeFragment();
    const { nodes: out } = computeSwimlaneLayout(nodes, edges);

    const indexOf = new Map(out.map((n, i) => [n.id, i]));
    for (const n of out) {
      if (!n.parentId) continue;
      expect(indexOf.get(n.parentId)).toBeLessThan(indexOf.get(n.id) as number);
    }
  });

  it('stacks the lanes in their declared order', () => {
    const { nodes, edges } = apprenticeFragment();
    const { nodes: out } = computeSwimlaneLayout(nodes, edges, {
      laneOrder: APPRENTICE_LANES,
      laneHeight: 200,
    });

    const lanes = out.filter((n) => n.type === 'swimlane');
    const gto = lanes.find((l) => l.id === 'lane-gto-labour-hire-team');
    const host = lanes.find((l) => l.id === 'lane-host-employer');
    const apprentice = lanes.find((l) => l.id === 'lane-apprentice');

    // laneOrder puts apprentice first, then gto, then host.
    expect(apprentice?.position.y).toBe(0);
    expect((gto?.position.y ?? 0) < (host?.position.y ?? 0)).toBe(true);
    expect(apprentice?.position.y).toBeLessThan(gto?.position.y ?? 0);
  });

  it('gives every lane the same width so the columns line up', () => {
    const { nodes, edges } = apprenticeFragment();
    const { nodes: out } = computeSwimlaneLayout(nodes, edges);
    const widths = new Set(out.filter((n) => n.type === 'swimlane').map((n) => n.width));
    expect(widths.size).toBe(1);
  });

  it('keeps every member clear of its lane header', () => {
    const { nodes, edges } = apprenticeFragment();
    const { nodes: out } = computeSwimlaneLayout(nodes, edges);
    for (const m of out.filter((n) => n.parentId)) {
      expect(m.position.y).toBeGreaterThanOrEqual(SWIMLANE_HEADER_HEIGHT);
    }
  });

  it('returns the lane y-offsets for a caller drawing its own rulers', () => {
    const { nodes, edges } = apprenticeFragment();
    const { laneOffsets } = computeSwimlaneLayout(nodes, edges, {
      laneOrder: APPRENTICE_LANES,
      laneHeight: 200,
    });
    expect(laneOffsets.get('apprentice')).toBe(0);
    expect(laneOffsets.size).toBe(3);
  });

  it('lays an unlaned node out freely rather than piling it on lane 0', () => {
    const { nodes, edges } = apprenticeFragment();
    const orphan: WorkflowNode = {
      id: 'orphan',
      type: 'step',
      position: { x: 0, y: 0 },
      data: { label: 'Not in any lane' },
    };
    const { nodes: out } = computeSwimlaneLayout([...nodes, orphan], edges);
    const laidOut = out.find((n) => n.id === 'orphan');
    expect(laidOut?.parentId).toBeUndefined();
    expect(laidOut?.extent).toBeUndefined();
  });

  it('does not overlap two members that share a lane and a rank', () => {
    // Two steps in one lane with no edge between them land in the same dagre
    // rank; without the stagger they would sit on top of each other.
    const lane: WorkflowNode = {
      id: 'lane-a',
      type: 'swimlane',
      position: { x: 0, y: 0 },
      data: { label: 'A', laneId: 'a', order: 0 },
    };
    const one: WorkflowNode = {
      id: 'one',
      type: 'step',
      position: { x: 0, y: 0 },
      data: { label: 'One', laneId: 'a' },
    };
    const two: WorkflowNode = {
      id: 'two',
      type: 'step',
      position: { x: 0, y: 0 },
      data: { label: 'Two', laneId: 'a' },
    };
    const { nodes: out } = computeSwimlaneLayout([lane, one, two], []);
    const a = out.find((n) => n.id === 'one');
    const b = out.find((n) => n.id === 'two');
    const sameSpot = a?.position.x === b?.position.x && a?.position.y === b?.position.y;
    expect(sameSpot).toBe(false);
  });

  it('returns an empty result for an empty graph rather than throwing', () => {
    const { nodes, laneOffsets } = computeSwimlaneLayout([], []);
    expect(nodes).toHaveLength(0);
    expect(laneOffsets.size).toBe(0);
  });
});
