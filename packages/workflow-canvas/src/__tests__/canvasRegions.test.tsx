/**
 * Reserved regions, not overlay chrome.
 *
 * Concat / tailwind-merge cannot reserve diagram space, so Fit View and
 * START→END clicks still hit the palette. These tests pin the structure that
 * does: palette/toolbar/inspector are siblings of the flow pane, not children
 * of it, and the layout contracts at a measured container width of 800px.
 */
import { Fragment, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COMPACT_MAX_WIDTH_PX,
  layoutFromWidth,
  partitionWorkflowChrome,
} from '../components/canvasRegions.js';

const captured: { nodes: unknown[] }[] = [];

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@xyflow/react');
  return {
    ...actual,
    ReactFlow: (props: {
      nodes: unknown[];
      children?: ReactNode;
      onPaneClick?: () => void;
    }) => {
      captured.push({ nodes: props.nodes });
      return (
        <div className="react-flow" data-testid="rf" onClick={props.onPaneClick}>
          {props.children as never}
        </div>
      );
    },
    MiniMap: () => <div data-testid="rf-minimap" />,
    Controls: () => <div data-testid="rf-controls" />,
    Background: () => null,
    Panel: ({ children }: { children?: unknown }) => <div>{children as never}</div>,
  };
});
vi.mock('@bsuite/schema-builder/xyflow', () => ({
  XY_TOKEN_BINDINGS: {},
  useDocumentColorMode: () => 'light',
}));

const { WorkflowCanvas } = await import('../components/WorkflowCanvas.js');
const { WorkflowPalette } = await import('../components/WorkflowPalette.js');
const { WorkflowToolbar } = await import('../components/WorkflowToolbar.js');
const { WorkflowInspector } = await import('../components/WorkflowInspector.js');

function Toolbar() {
  return <div data-testid="workflow-toolbar">toolbar</div>;
}
Toolbar.workflowRegion = 'toolbar' as const;
function Palette() {
  return <div data-testid="workflow-palette">palette</div>;
}
Palette.workflowRegion = 'palette' as const;
function Inspector() {
  return <div data-testid="workflow-inspector">inspector</div>;
}
Inspector.workflowRegion = 'inspector' as const;

const STEP = {
  id: 'step-1',
  type: 'step',
  position: { x: 40, y: 40 },
  style: { width: 220, height: 80 },
  data: { label: 'Accept offer' },
};

function controllerStub() {
  return {
    nodes: [STEP],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    registry: {
      nodeTypes: {},
      palette: [
        { kind: 'step', label: 'Step', description: 'A step' },
        { kind: 'handoff', label: 'Handoff', description: 'Hand off' },
      ],
      get: () => undefined,
    },
    isValidConnection: () => true,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onViewportChange: vi.fn(),
    isReadOnly: false,
    isDirty: false,
    isSaving: false,
    canUndo: false,
    canRedo: false,
    undo: vi.fn(),
    redo: vi.fn(),
    autoLayout: vi.fn(),
    addNode: vi.fn(() => STEP),
    definition: null,
    draft: null,
    isPlatformTemplate: false,
  } as never;
}

function mockContainerWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      return {
        width,
        height: 420,
        top: 0,
        left: 0,
        bottom: 420,
        right: width,
        x: 0,
        y: 0,
        toJSON() {},
      };
    },
  });
  class RO {
    cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe() {
      this.cb(
        [{ contentRect: { width, height: 420 } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;
}

describe('partitionWorkflowChrome', () => {
  it('sorts tagged components and flattens Fragments', () => {
    const children = (
      <>
        <Toolbar />
        <Fragment>
          <Palette />
          <Inspector />
        </Fragment>
        <span data-testid="bridge">bridge</span>
      </>
    );
    const parts = partitionWorkflowChrome(children);
    expect(parts.toolbar).toHaveLength(1);
    expect(parts.palette).toHaveLength(1);
    expect(parts.inspector).toHaveLength(1);
    expect(parts.rest).toHaveLength(1);
  });

  it('honours a data-workflow-region prop on a raw element (post-publish banner)', () => {
    const banner = (
      <div data-workflow-region="toolbar" data-testid="published-banner">
        Published
      </div>
    );
    const parts = partitionWorkflowChrome(banner);
    expect(parts.toolbar).toHaveLength(1);
    expect(parts.rest).toHaveLength(0);
  });
});

describe('layoutFromWidth', () => {
  it('is compact below 800px of canvas, regions at 0 (unmeasured) and at 1220/1440 canvas widths', () => {
    expect(layoutFromWidth(0)).toBe('regions');
    expect(layoutFromWidth(700)).toBe('compact');
    expect(layoutFromWidth(COMPACT_MAX_WIDTH_PX - 1)).toBe('compact');
    expect(layoutFromWidth(COMPACT_MAX_WIDTH_PX)).toBe('regions');
    expect(layoutFromWidth(884)).toBe('regions');
    expect(layoutFromWidth(1184)).toBe('regions');
  });
});

describe('WorkflowCanvas reserved regions', () => {
  beforeEach(() => {
    captured.length = 0;
    mockContainerWidth(1184);
  });

  afterEach(() => {
    mockContainerWidth(0);
  });

  it('places palette and inspector outside the flow pane so they cannot steal START→END hits', () => {
    render(
      <WorkflowCanvas controller={controllerStub()}>
        <Toolbar />
        <Palette />
        <Inspector />
      </WorkflowCanvas>,
    );

    const canvas = screen.getByTestId('bsuite-workflow-canvas');
    const diagram = screen.getByTestId('workflow-region-diagram');
    const paletteRegion = screen.getByTestId('workflow-region-palette');
    const inspectorRegion = screen.getByTestId('workflow-region-inspector');
    const flow = screen.getByTestId('rf');

    expect(diagram.contains(flow)).toBe(true);
    expect(diagram.contains(paletteRegion)).toBe(false);
    expect(diagram.contains(inspectorRegion)).toBe(false);
    expect(canvas.getAttribute('data-layout')).toBe('regions');
    expect(paletteRegion.classList.contains('w-56')).toBe(true);
    expect(paletteRegion.classList.contains('p-2')).toBe(false);
    expect(inspectorRegion.classList.contains('w-72')).toBe(true);
    expect(inspectorRegion.classList.contains('p-2')).toBe(false);
  });

  it('contracts to a chip-row palette at a 1024-expanded canvas width (~700px)', () => {
    mockContainerWidth(700);
    render(
      <WorkflowCanvas controller={controllerStub()}>
        <Toolbar />
        <WorkflowPalette controller={controllerStub()} />
        <Inspector />
      </WorkflowCanvas>,
    );

    const canvas = screen.getByTestId('bsuite-workflow-canvas');
    expect(canvas.getAttribute('data-layout')).toBe('compact');
    const paletteRegion = screen.getByTestId('workflow-region-palette');
    const diagram = screen.getByTestId('workflow-region-diagram');
    expect(diagram.contains(paletteRegion)).toBe(false);
    expect(paletteRegion.classList.contains('w-56')).toBe(false);
    const add = screen.getByTestId('workflow-palette-add-step');
    expect(add.classList.contains('border-border-interactive')).toBe(true);
    expect(add.classList.contains('border-border')).toBe(false);
  });

  it('still keeps real chrome surfaces when the live adapter className is passed through', () => {
    render(
      <WorkflowCanvas controller={controllerStub()}>
        <WorkflowToolbar controller={controllerStub()} className="absolute left-2 top-2 z-10" />
        <WorkflowPalette controller={controllerStub()} className="absolute left-2 top-14 z-10" />
        <WorkflowInspector
          controller={controllerStub()}
          selectedNodeId="step-1"
          className="absolute right-2 top-2 z-10"
        />
      </WorkflowCanvas>,
    );

    expect(screen.getByTestId('workflow-palette').classList.contains('bg-card')).toBe(true);
    expect(screen.getByTestId('workflow-palette').classList.contains('w-full')).toBe(true);
    expect(screen.getByTestId('workflow-palette').classList.contains('w-56')).toBe(false);
    expect(
      screen.getByTestId('workflow-palette-add-step').classList.contains('hover:border-border-interactive'),
    ).toBe(true);
    expect(screen.getByTestId('workflow-palette-add-step').classList.contains('border-border')).toBe(
      false,
    );
    expect(screen.getByTestId('workflow-toolbar').className).toContain('flex');
    expect(screen.getByTestId('workflow-inspector').className).toContain('bg-card');
    expect(screen.getByTestId('workflow-region-diagram').contains(screen.getByTestId('workflow-palette'))).toBe(
      false,
    );
  });

  it('does not nest the same fixed width inside a padded region (crm7#2604 SEND_BACK)', () => {
    render(
      <WorkflowCanvas controller={controllerStub()}>
        <WorkflowToolbar controller={controllerStub()} />
        <WorkflowPalette controller={controllerStub()} />
        <WorkflowInspector controller={controllerStub()} selectedNodeId="step-1" />
      </WorkflowCanvas>,
    );

    const paletteRegion = screen.getByTestId('workflow-region-palette');
    const palette = screen.getByTestId('workflow-palette');
    const inspectorRegion = screen.getByTestId('workflow-region-inspector');
    const inspector = screen.getByTestId('workflow-inspector');

    expect(paletteRegion.classList.contains('w-56')).toBe(true);
    expect(paletteRegion.classList.contains('p-2')).toBe(false);
    expect(palette.classList.contains('w-full')).toBe(true);
    expect(palette.classList.contains('w-56')).toBe(false);
    expect(palette.classList.contains('bg-card')).toBe(true);
    expect(palette.classList.contains('p-2')).toBe(true);
    expect(
      screen.getByTestId('workflow-palette-add-step').classList.contains('hover:border-border-interactive'),
    ).toBe(true);
    expect(screen.getByTestId('workflow-palette-add-step').classList.contains('border-border')).toBe(
      false,
    );

    expect(inspectorRegion.classList.contains('w-72')).toBe(true);
    expect(inspectorRegion.classList.contains('p-2')).toBe(false);
    expect(inspector.classList.contains('w-full')).toBe(true);
    expect(inspector.classList.contains('w-72')).toBe(false);
    expect(inspector.classList.contains('bg-card')).toBe(true);
  });

  it('collapses the inspector slot when nothing is selected', () => {
    render(
      <WorkflowCanvas controller={controllerStub()}>
        <WorkflowInspector controller={controllerStub()} selectedNodeId={null} />
      </WorkflowCanvas>,
    );
    expect(screen.queryByTestId('workflow-inspector')).toBeNull();
    expect(screen.getByTestId('workflow-region-inspector').className).toContain('empty:hidden');
  });

  it('clears selection on pane click so the inspector can unmount', () => {
    const onNodesChange = vi.fn();
    render(
      <WorkflowCanvas
        controller={
          {
            nodes: [{ ...STEP, selected: true }],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            registry: { nodeTypes: {}, palette: [], get: () => undefined },
            isValidConnection: () => true,
            onNodesChange,
            onEdgesChange: vi.fn(),
            onConnect: vi.fn(),
            onViewportChange: vi.fn(),
            undo: vi.fn(),
            redo: vi.fn(),
          } as never
        }
      />,
    );
    screen.getByTestId('rf').click();
    expect(onNodesChange).toHaveBeenCalledWith([
      { type: 'select', id: 'step-1', selected: false },
    ]);
  });
});
