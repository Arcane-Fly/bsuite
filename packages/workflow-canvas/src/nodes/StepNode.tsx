/**
 * A plain process step — the rectangle in the Lucidchart source, and 32 of the
 * apprentice journey's 38 non-lane shapes.
 *
 * Colour comes entirely from role tokens (`bg-card`, `border-border`,
 * `text-foreground`, …). The estate's colour gate scans `packages/`, and a
 * literal here would fail it — correctly, because the same card renders under
 * D2C Neon Electric and Corporate branding and must follow whichever is loaded.
 */

import type { NodeProps } from '@xyflow/react';
import { useStore } from '@xyflow/react';
import { Square } from 'lucide-react';

import type { StepNodeData } from '../types.js';
import { SEQUENTIAL_HANDLES, WorkflowHandles } from './handles.js';
import { LOD_DETAIL_VISIBLE, cardShellClass, readCommon } from './shared.js';

export const STEP_DEFAULT_SIZE = { width: 220, height: 88 } as const;

export function StepNode({ data, selected }: NodeProps) {
  const zoom = useStore((s) => s.transform[2]);
  const detail = zoom >= LOD_DETAIL_VISIBLE;
  const { label, description } = readCommon(data);
  const actionKey = (data as Partial<StepNodeData>).actionKey;

  return (
    <div
      className={cardShellClass(selected, 'rounded-lg')}
      style={{ minWidth: STEP_DEFAULT_SIZE.width }}
      data-testid="workflow-node-step"
      data-node-kind="step"
    >
      <WorkflowHandles specs={SEQUENTIAL_HANDLES} visible={detail} />
      <div className="flex items-start gap-2 p-3">
        <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">{label}</p>
          {detail && description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {detail && actionKey ? (
        <div className="border-t border-border px-3 py-1 font-mono text-[10px] text-muted-foreground">
          {actionKey}
        </div>
      ) : null}
    </div>
  );
}
