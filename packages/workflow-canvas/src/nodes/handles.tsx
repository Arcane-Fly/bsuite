/**
 * ONE renderer for every node kind's handles, driven by the SAME
 * `WorkflowHandleSpec[]` the registry hands to `isValidConnection`.
 *
 * WHY THIS IS SHARED AND NOT PER-COMPONENT
 *
 * Validation refuses a connection whose handle it cannot find (rules R3/R4 in
 * `validation/connection.ts`). If a card DREW a handle the registry did not
 * DECLARE, the user would be offered a port that silently refuses every drop —
 * an inert control, which this estate has shipped before and does not get to
 * ship again. Drawing and deciding therefore read the same list, so the two
 * cannot disagree.
 */

import { Handle, Position } from '@xyflow/react';

import type { WorkflowHandleSide, WorkflowHandleSpec } from '../types.js';

const SIDE_TO_POSITION: Record<WorkflowHandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

/**
 * Handles are `!border-*`/`!bg-*` because @xyflow/react's own stylesheet sets
 * `.react-flow__handle { background: … ; border: … }` at equal specificity and
 * wins on source order. Every value is a role token — the estate's colour gate
 * scans `packages/` and a literal here would fail it, correctly.
 */
const HANDLE_CLASS =
  '!h-3 !w-3 !rounded-full !border-2 !border-border !bg-card transition-colors hover:!border-primary';

const LOOP_HANDLE_CLASS =
  '!h-3 !w-3 !rounded-full !border-2 !border-dashed !border-border !bg-card transition-colors hover:!border-primary';

function offsetStyle(spec: WorkflowHandleSpec): React.CSSProperties | undefined {
  if (spec.offsetPercent === undefined) return undefined;
  const pct = `${spec.offsetPercent}%`;
  return spec.side === 'left' || spec.side === 'right'
    ? { top: pct }
    : { left: pct };
}

export interface WorkflowHandlesProps {
  specs: readonly WorkflowHandleSpec[];
  /**
   * Hidden below this zoom, matching the card's own level-of-detail bands. A
   * 12px dot at 0.3 zoom is 3.6 device pixels of clutter that cannot be
   * grabbed; drawing less is the answer to a crowded diagram.
   */
  visible?: boolean;
}

export function WorkflowHandles({ specs, visible = true }: WorkflowHandlesProps) {
  if (!visible) return null;
  return (
    <>
      {specs.map((spec) => (
        <Handle
          key={`${spec.role}:${spec.id}`}
          id={spec.id}
          type={spec.role}
          position={SIDE_TO_POSITION[spec.side]}
          className={spec.loop ? LOOP_HANDLE_CLASS : HANDLE_CLASS}
          style={offsetStyle(spec)}
          aria-label={
            spec.label ??
            (spec.role === 'source' ? 'Outgoing connection' : 'Incoming connection')
          }
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// The handle sets the built-in kinds declare
// ---------------------------------------------------------------------------

/** Sequence-flow entry, on the leading edge for a left-to-right layout. */
export const FLOW_IN: WorkflowHandleSpec = {
  id: 'in',
  role: 'target',
  kind: 'flow',
  side: 'left',
  label: 'Incoming step',
};

/** Sequence-flow exit. */
export const FLOW_OUT: WorkflowHandleSpec = {
  id: 'out',
  role: 'source',
  kind: 'flow',
  side: 'right',
  label: 'Next step',
};

/** Receives a loop-back edge from a LATER node. See `WorkflowHandleSpec.loop`. */
export const LOOP_IN: WorkflowHandleSpec = {
  id: 'loop-in',
  role: 'target',
  kind: 'flow',
  side: 'top',
  loop: true,
  label: 'Loop back to this step',
};

/** Sends a loop-back edge to an EARLIER node. */
export const LOOP_OUT: WorkflowHandleSpec = {
  id: 'loop-out',
  role: 'source',
  kind: 'flow',
  side: 'bottom',
  loop: true,
  label: 'Loop back to an earlier step',
};

/** The full set a plain step (or handoff) carries. */
export const SEQUENTIAL_HANDLES: readonly WorkflowHandleSpec[] = [
  FLOW_IN,
  FLOW_OUT,
  LOOP_IN,
  LOOP_OUT,
];

/**
 * A decision's outputs, one per branch, distributed down the right edge so a
 * four-way branch stays grabbable. `branch:<index>` is the handle id and the
 * index is stable for the life of the branch list — renaming a branch keeps its
 * edges, reordering the list does not.
 */
export function decisionBranchHandles(
  branches: readonly string[],
): WorkflowHandleSpec[] {
  const n = Math.max(branches.length, 1);
  return branches.map((label, i) => ({
    id: `branch:${i}`,
    role: 'source' as const,
    kind: 'flow' as const,
    side: 'right' as const,
    // Evenly spaced midpoints: 1 branch -> 50%, 2 -> 25/75, 4 -> 12.5/…/87.5.
    offsetPercent: ((i + 0.5) / n) * 100,
    label,
  }));
}
