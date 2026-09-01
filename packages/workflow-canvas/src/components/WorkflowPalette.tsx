/**
 * `WorkflowPalette` — how a node gets onto the canvas.
 *
 * IT READS THE REGISTRY, IT DOES NOT LIST KINDS. `registry.palette` is already
 * the ordered set of descriptors that declared `paletteVisible`, each carrying
 * its own label and one-line description. Hardcoding "step / decision /
 * handoff" here would mean a consumer that extends the registry — Phase 4's
 * Jodie-authored node is the expected first — gets a canvas that can hold its
 * node and a palette that cannot offer it. That divergence is exactly what the
 * open registry exists to prevent.
 *
 * CLICK PLACES; DRAG IS NOT REQUIRED. A palette that only works by drag is
 * unusable from a keyboard and awkward on a touch screen, and drag-and-drop
 * onto an xyflow surface needs the drop coordinate projected through the
 * viewport transform — which is a real feature, not a free one. Clicking places
 * the node in the middle of what the user is currently looking at, which is
 * where they were about to drag it anyway.
 *
 * A CONTAINER IS NOT IN THE PALETTE. Swimlanes declare `paletteVisible: false`
 * because a lane is the frame of the diagram rather than a step in it; adding
 * one mid-canvas would drop an empty 4720px band across the process.
 */

import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

import type { WorkflowController } from '../hooks/useWorkflowController.js';

export interface WorkflowPaletteProps {
  controller: WorkflowController;
  /** Which lane a newly-placed node joins, when the canvas has lanes. */
  activeLaneId?: string;
  className?: string;
  /** Told what was added, so a consumer can select it or announce it. */
  onNodeAdded?: (nodeId: string, kind: string) => void;
}

export function WorkflowPalette({
  controller,
  activeLaneId,
  className,
  onNodeAdded,
}: WorkflowPaletteProps) {
  const flow = useReactFlow();

  const place = useCallback(
    (kind: string) => {
      /**
       * The CENTRE OF THE VIEWPORT, not the origin.
       *
       * `{ x: 0, y: 0 }` is the graph origin, which after any pan at all is off
       * screen — the node would be added correctly, saved correctly, and appear
       * nowhere the user is looking. `screenToFlowPosition` projects a screen
       * point back through the current pan and zoom, so "the middle of what I
       * can see" is the same point in both coordinate systems.
       */
      const container = document.querySelector<HTMLElement>('.react-flow');
      const rect = container?.getBoundingClientRect();
      // With no mounted surface to measure — a unit test, or a palette rendered
      // before the canvas — the graph origin is the only honest answer, and it
      // is still a valid position rather than NaN.
      const position = rect
        ? flow.screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          })
        : { x: 0, y: 0 };

      const node = controller.addNode(kind, position, activeLaneId);
      onNodeAdded?.(node.id, kind);
    },
    [activeLaneId, controller, flow, onNodeAdded],
  );

  if (controller.isReadOnly) return null;

  return (
    <div
      className={
        className ??
        'pointer-events-auto absolute left-3 top-3 z-10 w-56 rounded-xl border border-border bg-card p-2 shadow-md dark:shadow-[var(--glow-card,none)]'
      }
      data-testid="workflow-palette"
    >
      <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Add to this workflow
      </p>
      <ul className="space-y-1">
        {controller.registry.palette.map((descriptor) => (
          <li key={descriptor.kind}>
            <button
              type="button"
              onClick={() => place(descriptor.kind)}
              className="w-full rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`workflow-palette-add-${descriptor.kind}`}
              data-node-kind={descriptor.kind}
            >
              <span className="block text-sm font-medium text-foreground">
                {descriptor.label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {descriptor.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
