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
import { useCallback, useEffect, useMemo } from 'react';

import type { WorkflowController } from '../hooks/useWorkflowController.js';
import type { WorkflowNode } from '../types.js';

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

  /**
   * Persist the camera ONLY when a person moved it.
   *
   * `OnMoveEnd` is typed `(event: MouseEvent | TouchEvent | null, viewport)`,
   * and the `null` is not incidental — it is how xyflow marks a PROGRAMMATIC
   * move. `fitView` fires one on mount, so without this guard merely OPENING a
   * workflow would schedule a write of the fitted viewport: a database write on
   * every page load, by every viewer, last-one-wins on a shared draft, for a
   * camera position nobody chose.
   */
  const onMoveEnd = useCallback(
    (event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      if (event === null) return;
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

  const renderNodes = useMemo(() => withRenderDimensions(controller.nodes), [controller.nodes]);

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
          nodes={renderNodes}
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
/**
 * SIZE FOR THE MINIMAP, WITHOUT CHANGING WHAT GETS SAVED.
 *
 * xyflow decides whether a node is drawable from `width` / `initialWidth` /
 * `measured` and NEVER from `style.width`:
 *
 *   nodeHasDimensions = (n) =>
 *     (n.measured?.width ?? n.width ?? n.initialWidth) !== undefined && ...
 *
 * The canvas itself is fine either way, because the DOM element is sized by the
 * style. The MINIMAP is not: it reads `internals.userNode` rather than the DOM
 * and silently skips every node failing that check. Measured on production
 * 2026-09-02 — the minimap was present, `showMiniMap` was on, and it drew ZERO
 * rects against a 42-node graph. An empty minimap reads as broken rather than
 * absent, and it is the only way to navigate a diagram 4720px wide.
 *
 * Applied HERE, at the render boundary, and deliberately not in the controller's
 * `nodes`. Those are the nodes that get PERSISTED: `WorkflowNodeSchema` is a
 * loose object, so width/height added there would survive serialisation and
 * quietly change the stored graph shape on the next autosave. The stored graph
 * keeps carrying size in `style`, exactly as the seed writes it; only the
 * rendered node gains the two numbers xyflow needs.
 */
function withRenderDimensions(nodes: WorkflowNode[]): WorkflowNode[] {
  let changed = false;
  const out = nodes.map((node) => {
    if (typeof node.width === 'number' && typeof node.height === 'number') return node;
    const style = node.style as { width?: unknown; height?: unknown } | undefined;
    const width = typeof style?.width === 'number' ? style.width : undefined;
    const height = typeof style?.height === 'number' ? style.height : undefined;
    if (width === undefined || height === undefined) return node;
    changed = true;
    return { ...node, width, height };
  });
  // Referential stability matters: a new array every render makes xyflow
  // reconcile the whole graph, which loses selection and drag state.
  return changed ? out : nodes;
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
