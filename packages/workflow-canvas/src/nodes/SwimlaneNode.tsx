/**
 * A swimlane — an xyflow PARENT NODE, not a background image.
 *
 * WHY A PARENT NODE
 *
 * The alternative (drawing lane bands behind the canvas and storing the lane
 * only as `data.laneId`) was rejected: nothing then keeps a step inside its
 * lane. Drag a card two lanes up and the picture says one party owns the work
 * while the data says another, with no error anywhere. As a real parent with
 * `extent: 'parent'` on its members, the lane is a constraint xyflow enforces
 * during the drag itself, and the graph cannot express a step that has drifted
 * out of the lane that owns it.
 *
 * It also survives the round trip for free: `parentId` and `extent` are native
 * xyflow node fields, so they land in `graph jsonb` with everything else and
 * come back as themselves.
 *
 * THE CARD IS DELIBERATELY NOT A CARD. A lane wraps other cards, so giving it
 * `bg-card` too would nest one card chrome inside another — the doubled-border
 * defect the estate has a ratchet for. It draws a hairline frame and a header
 * strip on the sunken ground instead.
 */

import type { NodeProps } from '@xyflow/react';
import { Users } from 'lucide-react';

import type { SwimlaneNodeData } from '../types.js';
import { readCommon } from './shared.js';

export const SWIMLANE_DEFAULT_SIZE = { width: 1600, height: 200 } as const;

/** Height of the lane's title strip. Members are laid out below it. */
export const SWIMLANE_HEADER_HEIGHT = 28;

export function swimlaneLaneId(data: unknown): string | undefined {
  const id = (data as Partial<SwimlaneNodeData> | undefined)?.laneId;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

export function SwimlaneNode({ data, selected }: NodeProps) {
  const { label } = readCommon(data);

  return (
    <div
      className={[
        'h-full w-full rounded-md border bg-muted/20',
        selected ? 'border-primary' : 'border-border',
      ].join(' ')}
      data-testid="workflow-node-swimlane"
      data-node-kind="swimlane"
      data-lane-id={swimlaneLaneId(data) ?? ''}
    >
      {/* No <WorkflowHandles>: a lane declares NO handles at all. Rule R5 in
          validation/connection.ts refuses any edge touching a container, and a
          port drawn here would be one the canvas always refuses. */}
      <div
        className="flex items-center gap-2 rounded-t-md border-b border-border bg-muted px-3"
        style={{ height: SWIMLANE_HEADER_HEIGHT }}
      >
        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {label}
        </p>
      </div>
    </div>
  );
}
