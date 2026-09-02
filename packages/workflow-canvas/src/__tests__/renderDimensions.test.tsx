/**
 * THE MINIMAP COULD NOT SIZE A SINGLE NODE, AND SAID NOTHING.
 *
 * xyflow decides whether a node is drawable from `width` / `initialWidth` /
 * `measured`, never from `style.width`. The canvas is unaffected — the DOM
 * element is sized by the style — but the MINIMAP reads `internals.userNode`
 * rather than the DOM, so it skipped every node. Measured on production
 * 2026-09-02: minimap present, `showMiniMap` on, and ZERO rects against a
 * 42-node graph. An empty minimap reads as broken rather than absent, and it is
 * the only way to navigate a diagram 4720px wide.
 *
 * This defect was found, fixed and then RE-INTRODUCED in one day: the fix lived
 * in crm7's local canvas, and adopting this package deleted that file. The QA
 * that followed recorded `minimap: true` — presence, not content — so nothing
 * caught the regression. Hence the second test below: it asserts the rects can
 * be sized, not that a minimap exists.
 *
 * The third test is the constraint that shaped WHERE the fix went.
 * `WorkflowNodeSchema` is a loose object, so width/height added to the
 * controller's nodes would survive serialisation and change the stored graph on
 * the next autosave. The hoist therefore happens at the render boundary, and the
 * graph the controller holds must stay byte-identical.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const captured: { nodes: { id: string; width?: number; height?: number; style?: unknown }[] }[] = [];

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@xyflow/react');
  return {
    ...actual,
    ReactFlow: (props: { nodes: { id: string; width?: number; height?: number }[] }) => {
      captured.push({ nodes: props.nodes });
      return <div data-testid="rf" />;
    },
    MiniMap: () => null,
    Controls: () => null,
    Background: () => null,
    Panel: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  };
});
vi.mock('@bsuite/schema-builder/xyflow', () => ({
  XY_TOKEN_BINDINGS: {},
  useDocumentColorMode: () => 'light',
}));

const { WorkflowCanvas } = await import('../components/WorkflowCanvas.js');

/** Sized only in `style`, exactly as the seed generator writes it. */
const NODES = [
  { id: 'lane', type: 'swimlane', position: { x: 0, y: 0 }, style: { width: 4720, height: 160 }, data: { label: 'Apprentice' } },
  { id: 'step', type: 'step', parentId: 'lane', position: { x: 40, y: 40 }, style: { width: 220, height: 80 }, data: { label: 'Accept offer' } },
  { id: 'bare', type: 'step', parentId: 'lane', position: { x: 300, y: 40 }, data: { label: 'No size at all' } },
];

function controllerStub() {
  return {
    nodes: NODES,
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    registry: { nodeTypes: {} },
    isValidConnection: () => true,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onViewportChange: vi.fn(),
  } as never;
}

describe('render dimensions', () => {
  it('gives xyflow the width and height it actually reads', () => {
    captured.length = 0;
    render(<WorkflowCanvas controller={controllerStub()} readOnly />);
    const nodes = captured[0]?.nodes ?? [];
    const step = nodes.find((n) => n.id === 'step');
    const lane = nodes.find((n) => n.id === 'lane');
    expect(step?.width).toBe(220);
    expect(step?.height).toBe(80);
    expect(lane?.width).toBe(4720);
  });

  it('leaves a node with no usable size alone rather than inventing one', () => {
    captured.length = 0;
    render(<WorkflowCanvas controller={controllerStub()} readOnly />);
    const bare = (captured[0]?.nodes ?? []).find((n) => n.id === 'bare');
    expect(bare?.width).toBeUndefined();
  });

  /*
   * The constraint that decided WHERE the fix lives. If the hoist happened in the
   * controller, these two numbers would ride along into the next autosave and
   * change the stored graph shape — silently, because the node schema is loose
   * and would accept them.
   */
  it('does not mutate the graph the controller holds, which is what gets persisted', () => {
    captured.length = 0;
    const controller = controllerStub() as unknown as { nodes: typeof NODES };
    const before = JSON.stringify(controller.nodes);
    render(<WorkflowCanvas controller={controller as never} readOnly />);
    expect(JSON.stringify(controller.nodes)).toBe(before);
    expect(controller.nodes.some((n) => 'width' in n)).toBe(false);
  });
});
