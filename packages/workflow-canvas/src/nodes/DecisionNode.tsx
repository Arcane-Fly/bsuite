/**
 * A decision — the diamond in the Lucidchart source.
 *
 * Rendered as a card with a rotated-square glyph rather than as an actual
 * rotated node. A CSS-rotated node breaks xyflow's handle hit-testing (the
 * handle inherits the transform, the pointer maths does not) and makes the
 * label unreadable at any branch count above two. The apprentice process's
 * widest decision — *Host accepted placement?* — has FOUR branches, all of
 * which need a grabbable port and a readable name.
 */

import type { NodeProps } from '@xyflow/react';
import { useStore } from '@xyflow/react';
import { Diamond } from 'lucide-react';

import type { DecisionNodeData } from '../types.js';
import type { WorkflowHandleSpec } from '../types.js';
import {
  FLOW_IN,
  LOOP_IN,
  LOOP_OUT,
  WorkflowHandles,
  decisionBranchHandles,
} from './handles.js';
import { LOD_DETAIL_VISIBLE, cardShellClass, readCommon } from './shared.js';

export const DECISION_DEFAULT_SIZE = { width: 240, height: 120 } as const;

/** Branch labels, defensively read — a corrupted row must not blank the card. */
export function decisionBranches(data: unknown): string[] {
  const raw = (data as Partial<DecisionNodeData> | undefined)?.branches;
  if (!Array.isArray(raw)) return ['Yes', 'No'];
  const clean = raw.filter((b): b is string => typeof b === 'string' && b.length > 0);
  return clean.length >= 2 ? clean : ['Yes', 'No'];
}

/**
 * A decision's handles vary WITH ITS DATA, which is why the registry takes a
 * function rather than a static list: adding a fifth branch must add a fifth
 * port, and validation must know about it in the same render.
 */
export function decisionHandles(data: unknown): WorkflowHandleSpec[] {
  return [FLOW_IN, LOOP_IN, LOOP_OUT, ...decisionBranchHandles(decisionBranches(data))];
}

export function DecisionNode({ data, selected }: NodeProps) {
  const zoom = useStore((s) => s.transform[2]);
  const detail = zoom >= LOD_DETAIL_VISIBLE;
  const { label } = readCommon(data);
  const branches = decisionBranches(data);

  return (
    <div
      className={cardShellClass(selected, 'rounded-lg')}
      style={{ minWidth: DECISION_DEFAULT_SIZE.width }}
      data-testid="workflow-node-decision"
      data-node-kind="decision"
    >
      <WorkflowHandles specs={decisionHandles(data)} visible={detail} />
      <div className="flex items-start gap-2 p-3">
        <Diamond className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{label}</p>
      </div>
      {detail ? (
        <ul className="border-t border-border" aria-label={`${label} branches`}>
          {branches.map((branch, i) => (
            <li
              key={`branch:${i}`}
              // Each row lines up with its handle, which is offset to the
              // midpoint of an equal share of the right edge.
              className="flex items-center justify-end gap-2 px-3 py-1 text-[11px] text-muted-foreground"
            >
              {branch}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
