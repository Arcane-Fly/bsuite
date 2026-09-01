/**
 * Start / End — the stadium shape in the Lucidchart source.
 *
 * THE HANDLE SET IS THE RULE. A `start` declares a source handle and NO target;
 * an `end` declares a target and NO source. That is how "an edge into a
 * terminator's output" gets refused (`validation/connection.ts` rule R3) —
 * structurally, by there being no such port to grab, and again in validation
 * because a handle id that is not in the declared set cannot resolve. Writing it
 * as a special case in `isValidConnection` would have left the port drawn and
 * draggable, which is an inert control.
 */

import type { NodeProps } from '@xyflow/react';
import { CircleDot, Flag } from 'lucide-react';

import type { TerminatorNodeData, WorkflowHandleSpec } from '../types.js';
import { FLOW_IN, FLOW_OUT, WorkflowHandles } from './handles.js';
import { cardShellClass, readCommon } from './shared.js';

export const TERMINATOR_DEFAULT_SIZE = { width: 160, height: 56 } as const;

export function terminatorRole(data: unknown): 'start' | 'end' {
  return (data as Partial<TerminatorNodeData> | undefined)?.role === 'start'
    ? 'start'
    : 'end';
}

export function terminatorHandles(data: unknown): WorkflowHandleSpec[] {
  return terminatorRole(data) === 'start' ? [FLOW_OUT] : [FLOW_IN];
}

export function TerminatorNode({ data, selected }: NodeProps) {
  const role = terminatorRole(data);
  const { label } = readCommon(data);
  const Icon = role === 'start' ? CircleDot : Flag;

  return (
    <div
      className={cardShellClass(selected, 'rounded-full')}
      style={{ minWidth: TERMINATOR_DEFAULT_SIZE.width }}
      data-testid="workflow-node-terminator"
      data-node-kind="terminator"
      data-terminator-role={role}
    >
      {/* Never hidden by the level-of-detail band: a terminator carries at most
          one handle, and losing it is losing the only way to attach the graph's
          entry or exit. */}
      <WorkflowHandles specs={terminatorHandles(data)} />
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="truncate text-sm font-semibold uppercase tracking-wide text-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}
