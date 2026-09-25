/**
 * A step nothing leads to must be named before publish, because the run
 * starts at the Start terminator and never visits it.
 *
 * Start is `terminatorRole`: `data.role === 'start'`. A label of "START"
 * does not make a terminator the entry. With no start, every node that has
 * no incoming edge is a root, so a lone step stays a valid workflow.
 */

import { describe, expect, it } from 'vitest';

import { findUnreachableNodes } from '../graphChecks.js';
import { findUnreachableNodes as exported } from '../index.js';
import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../types.js';

function node(
  id: string,
  type: string,
  data: Record<string, unknown>,
): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function edge(id: string, source: string, target: string, sourceHandle?: string): WorkflowEdge {
  return sourceHandle
    ? { id, source, target, sourceHandle }
    : { id, source, target };
}

function graph(nodes: WorkflowNode[], edges: WorkflowEdge[] = []): WorkflowGraph {
  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
}

const start = node('start', 'terminator', { label: 'START', role: 'start' });
const end = node('end', 'terminator', { label: 'END', role: 'end' });
const step1 = node('step1', 'step', {
  label: 'Notify internally',
  actionKey: 'notify_internal',
});

describe('findUnreachableNodes', () => {
  it('is exported from the package index', () => {
    expect(exported).toBe(findUnreachableNodes);
  });

  it('reports a step that Start never reaches', () => {
    const found = findUnreachableNodes(
      graph([start, end, step1], [edge('e-start-end', 'start', 'end')]),
    );

    expect(found.map((n) => n.id)).toEqual(['step1']);
    expect(found[0]?.data.actionKey).toBe('notify_internal');
  });

  it('reports nothing when Start reaches the step and End', () => {
    const found = findUnreachableNodes(
      graph(
        [start, step1, end],
        [edge('e-start-step', 'start', 'step1'), edge('e-step-end', 'step1', 'end')],
      ),
    );

    expect(found).toEqual([]);
  });

  it('reports nothing for a single step with no terminators and no edges', () => {
    const alone = node('only', 'step', { label: 'Do the work' });

    expect(findUnreachableNodes(graph([alone]))).toEqual([]);
  });

  it('never reports a swimlane, and still reports a step beside one', () => {
    const lane = node('lane-team', 'swimlane', { label: 'Team', laneId: 'team', order: 0 });

    expect(
      findUnreachableNodes(graph([start, end, lane], [edge('e-start-end', 'start', 'end')])),
    ).toEqual([]);

    const found = findUnreachableNodes(
      graph([start, end, lane, step1], [edge('e-start-end', 'start', 'end')]),
    );
    expect(found.map((n) => n.id)).toEqual(['step1']);
  });

  it('reports nothing when both decision branches reach End', () => {
    const decision = node('decision', 'decision', {
      label: 'Approved?',
      branches: ['Yes', 'No'],
    });
    const yes = node('yes-step', 'step', { label: 'Send the offer' });
    const no = node('no-step', 'step', { label: 'Tell the applicant' });

    const found = findUnreachableNodes(
      graph(
        [start, decision, yes, no, end],
        [
          edge('e-start', 'start', 'decision'),
          edge('e-yes', 'decision', 'yes-step', 'branch:0'),
          edge('e-no', 'decision', 'no-step', 'branch:1'),
          edge('e-yes-end', 'yes-step', 'end'),
          edge('e-no-end', 'no-step', 'end'),
        ],
      ),
    );

    expect(found).toEqual([]);
  });
});
