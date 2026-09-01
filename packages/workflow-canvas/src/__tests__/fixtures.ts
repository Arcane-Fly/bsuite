/**
 * The apprentice-placement fragment every test works against.
 *
 * Taken from the real source —
 * `docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json`
 * — not invented, because the two things this package must get right (loops,
 * and a four-way branch) are properties of THAT process, and a fixture that
 * quietly drops them would let a broken implementation pass.
 *
 * It carries:
 *   - both documented rework loops
 *   - the four-way branch out of *Host accepted placement?*
 *   - three of the six lanes, with members parented into them
 */

import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../types.js';

/** The six lanes, exactly as the Lucidchart source names them. */
export const APPRENTICE_LANES = [
  'apprentice',
  'gto-labour-hire-team',
  'apprentice-connect-provider',
  'dewr-and-state-training-authority',
  'training-provider',
  'host-employer',
] as const;

export const APPRENTICE_LANE_LABELS: Record<(typeof APPRENTICE_LANES)[number], string> = {
  apprentice: 'Apprentice',
  'gto-labour-hire-team': 'GTO / Labour Hire Team',
  'apprentice-connect-provider': 'Apprentice Connect Provider',
  'dewr-and-state-training-authority': 'DEWR and State Training Authority',
  'training-provider': 'Training Provider',
  'host-employer': 'Host Employer',
};

function lane(laneId: string, order: number): WorkflowNode {
  return {
    id: `lane-${laneId}`,
    type: 'swimlane',
    position: { x: 0, y: order * 200 },
    data: {
      label: APPRENTICE_LANE_LABELS[laneId as (typeof APPRENTICE_LANES)[number]] ?? laneId,
      laneId,
      order,
    },
  };
}

function step(id: string, label: string, laneId: string): WorkflowNode {
  return {
    id,
    type: 'step',
    position: { x: 0, y: 0 },
    data: { label, laneId },
  };
}

function edge(id: string, source: string, target: string, label?: string): WorkflowEdge {
  return { id, source, target, ...(label ? { label } : {}) };
}

/**
 * An edge leaving a decision MUST name its branch handle.
 *
 * The branch labels are the decision's outputs, so an importer that dropped the
 * handle would be throwing away which answer leads where — and validation
 * refuses it (rule R3/R4) rather than guessing. Every other edge may leave its
 * handles unset and resolve to the node's primary port.
 */
function branchEdge(
  id: string,
  source: string,
  target: string,
  branchIndex: number,
  label: string,
): WorkflowEdge {
  return { id, source, target, sourceHandle: `branch:${branchIndex}`, label };
}

/**
 * A graph with BOTH apprentice loops in it.
 *
 *   create-placement -> send-esign -> host-accepted? -> change-rates -> send-esign
 *                                                   -> cancel-placement -> create-placement
 *
 * Two cycles of length 2 and 3. Any validator that refuses cycles refuses this
 * process.
 */
export function apprenticeFragment(): WorkflowGraph {
  const nodes: WorkflowNode[] = [
    lane('gto-labour-hire-team', 0),
    lane('host-employer', 1),
    lane('apprentice', 2),
    {
      id: 'start',
      type: 'terminator',
      position: { x: 0, y: 0 },
      data: { label: 'Start', role: 'start', laneId: 'gto-labour-hire-team' },
    },
    step('create-placement', 'Create or confirm host placement', 'gto-labour-hire-team'),
    step('send-esign', 'Send placement for CRM-triggered e-signing', 'gto-labour-hire-team'),
    {
      id: 'host-accepted',
      type: 'decision',
      position: { x: 0, y: 0 },
      data: {
        label: 'Host accepted placement?',
        laneId: 'host-employer',
        branches: [
          'Yes',
          'Change rates or placement',
          'Route for manual host approval',
          'Cancel placement',
        ],
      },
    },
    step(
      'change-rates',
      'Change rates or placement and resend for e-signing',
      'gto-labour-hire-team',
    ),
    step('cancel-placement', 'Cancel placement and seek a new host', 'gto-labour-hire-team'),
    step('link-placement', 'Link approved placement to apprentice record', 'gto-labour-hire-team'),
    step('accept-offer', 'Accept employment offer', 'apprentice'),
    {
      id: 'end',
      type: 'terminator',
      position: { x: 0, y: 0 },
      data: { label: 'End', role: 'end', laneId: 'apprentice' },
    },
  ];

  const edges: WorkflowEdge[] = [
    edge('e-start', 'start', 'create-placement'),
    edge('e-create-send', 'create-placement', 'send-esign'),
    edge('e-send-decision', 'send-esign', 'host-accepted'),
    branchEdge('e-yes', 'host-accepted', 'link-placement', 0, 'Yes'),
    branchEdge('e-change', 'host-accepted', 'change-rates', 1, 'Change rates or placement'),
    branchEdge('e-cancel', 'host-accepted', 'cancel-placement', 3, 'Cancel placement'),
    // ---- THE TWO LOOPS ----
    edge('e-loop-resend', 'change-rates', 'send-esign'),
    edge('e-loop-rehost', 'cancel-placement', 'create-placement'),
    // ----------------------
    edge('e-link-accept', 'link-placement', 'accept-offer'),
    edge('e-accept-end', 'accept-offer', 'end'),
  ];

  return { nodes, edges, viewport: { x: -120, y: 40, zoom: 0.75 } };
}
