/**
 * `WorkflowCanvas` — the rendered surface.
 *
 * BORROWED, AND FROM WHERE
 *
 *  - The `ReactFlowProvider` wrapper is `RelationshipCanvas`'s pattern
 *    (`business-suite-unified/.../RelationshipCanvas.tsx:510-519`): the public
 *    export owns the provider so a consumer page never has to know this surface
 *    uses xyflow's internal store.
 *  - `XY_TOKEN_BINDINGS` + `colorMode` are `SchemaCanvas`'s pattern, and are
 *    IMPORTED from it (`@bsuite/schema-builder/xyflow`, added in 1.9.0) rather
 *    than copied. That object already had three copies across the estate
 *    (issue #2550); this canvas would have been the fourth. `colorMode` alone
 *    only swaps one library-owned literal for another; the `-props` custom
 *    properties are the documented override points and every value is a
 *    `--role-*` token, so both themes and any tenant branding follow.
 *  - The `absolute inset-0` inner div is `SchemaCanvas`'s too, and it is
 *    load-bearing: React Flow v12 spreads its own wrapper style over whatever
 *    `style` prop it is given and silently discards width/height/position/
 *    overflow/zIndex. The canvas can only be given a box from OUTSIDE it.
 *
 * NOT BORROWED, DELIBERATELY: `RelationshipCanvas`'s cycle rejection. See
 * `validation/connection.ts` — the process this canvas draws requires loops.
 */

import { XY_TOKEN_BINDINGS, useDocumentColorMode } from '@bsuite/schema-builder/xyflow';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect } from 'react';

import type { WorkflowController } from '../hooks/useWorkflowController.js';

export interface WorkflowCanvasProps {
  controller: WorkflowController;
  /** Rendered over the canvas — palette, toolbar, properties panel. */
  children?: React.ReactNode;
  /** Turn the drag/connect affordances off without a second component. */
  readOnly?: boolean;
  showMiniMap?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * A 41-edge process at the zoom `fitView` chooses for it is unreadable — the
 * same failure the schema canvas had at 44 entities, where cards rendered field
 * text at 5 device pixels. The opening fit stops at 0.75 and the Fit control,
 * which is a deliberate act, stays free to go all the way out.
 */
const OPENING_FIT = { padding: 0.15, maxZoom: 0.75, minZoom: 0.2 } as const;

function WorkflowCanvasInner({
  controller,
  children,
  readOnly = false,
  showMiniMap = true,
  className,
  'aria-label': ariaLabel = 'Workflow diagram',
}: WorkflowCanvasProps) {
  const colorMode = useDocumentColorMode();

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      controller.onViewportChange(viewport);
    },
    [controller],
  );

  // Undo/redo on the keyboard. Bound on the document rather than the canvas
  // because the user's focus is usually on a node, and a handler on the wrapper
  // would miss the keystroke whenever anything inside it had focus.
  useEffect(() => {
    if (readOnly) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      // Never steal undo from a field the user is typing in.
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) controller.redo();
      else controller.undo();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [controller, readOnly]);

  return (
    <div
      className={
        className ?? 'relative h-full min-h-[420px] w-full flex-1 bg-background'
      }
      data-testid="bsuite-workflow-canvas"
    >
      {/* See the header: React Flow overwrites sizing keys passed through its
          own `style` prop, so the box has to come from a div we own. */}
      <div className="absolute inset-0">
        <ReactFlow
          nodes={controller.nodes}
          edges={controller.edges}
          nodeTypes={controller.registry.nodeTypes}
          onNodesChange={readOnly ? undefined : controller.onNodesChange}
          onEdgesChange={readOnly ? undefined : controller.onEdgesChange}
          onConnect={readOnly ? undefined : controller.onConnect}
          isValidConnection={controller.isValidConnection}
          onMoveEnd={onMoveEnd}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable
          fitView
          fitViewOptions={OPENING_FIT}
          minZoom={0.05}
          maxZoom={2}
          nodeDragThreshold={8}
          // Default is Backspace ONLY, so the Delete key silently does nothing —
          // the same omission the schema canvas shipped with.
          deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
          colorMode={colorMode}
          aria-label={ariaLabel}
          proOptions={{ hideAttribution: true }}
          style={XY_TOKEN_BINDINGS}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
          {showMiniMap ? <MiniMap pannable zoomable /> : null}
        </ReactFlow>
      </div>
      {children}
    </div>
  );
}

/**
 * Public export. Owns its own `ReactFlowProvider` so a consumer page can drop it
 * anywhere without knowing about xyflow's store.
 */
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
