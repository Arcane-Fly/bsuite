/**
 * A handoff — work passing from one party to another.
 *
 * The apprentice process crosses six lanes and hands off constantly: the GTO
 * lodges the training contract, DEWR notifies the State Training Authority, the
 * STA notifies the Training Provider. Those are not ordinary steps; the work
 * LEAVES the lane, and whoever is reading the diagram needs to see where it
 * went. Same handle set as a step — crossing a lane is normal traffic, not an
 * error, which is exactly the opposite of the FK canvas's assumption.
 */

import type { NodeProps } from '@xyflow/react';
import { useStore } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

import type { HandoffNodeData } from '../types.js';
import { SEQUENTIAL_HANDLES, WorkflowHandles } from './handles.js';
import { LOD_DETAIL_VISIBLE, cardShellClass, readCommon } from './shared.js';

export const HANDOFF_DEFAULT_SIZE = { width: 220, height: 88 } as const;

export function HandoffNode({ data, selected }: NodeProps) {
  const zoom = useStore((s) => s.transform[2]);
  const detail = zoom >= LOD_DETAIL_VISIBLE;
  const { label } = readCommon(data);
  const toLaneId = (data as Partial<HandoffNodeData>).toLaneId;

  return (
    <div
      className={cardShellClass(selected, 'rounded-lg border-dashed')}
      style={{ minWidth: HANDOFF_DEFAULT_SIZE.width }}
      data-testid="workflow-node-handoff"
      data-node-kind="handoff"
    >
      <WorkflowHandles specs={SEQUENTIAL_HANDLES} visible={detail} />
      <div className="flex items-start gap-2 p-3">
        <ArrowRightLeft
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary-text"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">{label}</p>
          {detail && toLaneId ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">to {toLaneId}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
