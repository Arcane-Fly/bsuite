/**
 * THE CANVAS MUST BE GIVEN A BOX, OR IT RENDERS NOTHING.
 *
 * Measured on the deployed app, 2026-08-26: `/settings/schema-builder` showed a
 * toolbar reading "45 entities" above an empty dotted grid. All 45 nodes were
 * in the DOM. `.react-flow` was **1184x0**.
 *
 * `@xyflow/react` v12's stylesheet sizes `.react-flow__container` but never
 * `.react-flow` itself, so the root is a block div whose children are all
 * absolutely positioned — with no height of its own it collapses to zero. The
 * component supplies `width/height: 100%` inline, but passing a `style` prop
 * REPLACES that, and this component passes one to bind the brand tokens. So
 * binding the palette silently removed the only sizing there was.
 *
 * Restoring `height: 100%` alone does not fix it either: it resolves against a
 * wrapper whose CSS height is `auto` (`flex-1` + `min-h-` give a USED height,
 * not a definite one) and computes back to zero. crm7's sibling pipeline-flow
 * canvas keeps the library defaults and was broken the same way.
 *
 * This test asserts the OUTCOME — the canvas is given a definite box — and not
 * the mechanism. `position: absolute` + `inset` is one way; an explicit pixel
 * or viewport height is another. Pinning the literal values would lock in
 * today's implementation and fail the next legitimate change, which is the
 * opposite of what this needs to protect.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  // FAITHFUL to @xyflow/react v12, which is the point. The library does:
  //
  //     const wrapperStyle = { width: '100%', height: '100%',
  //       overflow: 'hidden', position: 'relative', zIndex: 0 };
  //     <div style={{ ...style, ...wrapperStyle }} ... >
  //
  // wrapperStyle is spread AFTER the caller's style, so those five keys are
  // overwritten no matter what is passed. The previous mock spread only the
  // caller's style, which modelled a library that honours the prop — and that
  // is exactly why a green suite sat over a production canvas rendering at
  // zero height for as long as it did. Do NOT "simplify" this back.
  ReactFlow: ({ children, style, fitViewOptions, minZoom }: {
    children?: React.ReactNode; style?: React.CSSProperties;
    fitViewOptions?: { minZoom?: number; maxZoom?: number }; minZoom?: number;
  }) => (
    <div
      data-testid="mock-reactflow"
      style={{
        ...style,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 0,
      }}
      data-fit-min-zoom={fitViewOptions?.minZoom ?? ''}
      data-canvas-min-zoom={minZoom ?? ''}
    >
      {children}
    </div>
  ),
  Handle: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  addEdge: (_c: unknown, e: unknown[]) => e,
  applyEdgeChanges: (_c: unknown, e: unknown[]) => e,
  applyNodeChanges: (_c: unknown, n: unknown[]) => n,
  useStore: (selector: (s: { transform: [number, number, number] }) => unknown) =>
    selector({ transform: [0, 0, 1] }),
}));

const { SchemaCanvas } = await import('../components/SchemaCanvas.js');

const noop = () => {};
const rejects = () => Promise.reject(new Error('not used in this test'));

/** One entity, so the canvas renders rather than the empty state. */
function populatedController() {
  return {
    entities: [{ id: 'e1', name: 'widget', label: 'Widget', tenant_id: 't1' }],
    relations: [],
    fields: { e1: [] },
    layout: new Map([['e1', { x: 0, y: 0 }]]),
    isPlatformDeveloper: false,
    isLoading: false,
    loadError: null,
    createEntity: rejects, updateEntity: rejects, deleteEntity: rejects,
    updateEntityPosition: rejects, createRelation: rejects, updateRelation: rejects,
    deleteRelation: rejects, createField: rejects, updateField: rejects,
    deleteField: rejects, reorderFields: rejects, renameField: rejects,
  } as unknown as Parameters<typeof SchemaCanvas>[0]['controller'];
}

/**
 * Does this style give the element a height that does not depend on an
 * ancestor's percentage chain resolving? Either it is taken out of flow and
 * pinned to its containing block, or it states a height that is not a percentage.
 */
/** Keys @xyflow/react v12 overwrites unconditionally via its wrapperStyle spread. */
const KEYS_THE_LIBRARY_OVERWRITES = ['width', 'height', 'overflow', 'position', 'zIndex'];

/**
 * The canvas can only be sized from an element WE own. This walks up from the
 * React Flow root looking for an ancestor that is absolutely positioned and
 * pinned on all sides — which resolves against its containing block's USED
 * size and so cannot be defeated by the percentage-of-indefinite collapse.
 */
function pinnedAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const pinned =
      node.style.position === 'absolute' &&
      (node.style.inset !== '' || (node.style.top !== '' && node.style.bottom !== ''));
    // Tailwind classes do not produce computed styles in jsdom, so accept the
    // class form too — it is the same declaration, expressed in the estate's
    // own idiom.
    const pinnedByClass =
      node.classList.contains('absolute') && node.classList.contains('inset-0');
    if (pinned || pinnedByClass) return node;
    node = node.parentElement;
  }
  return null;
}

describe('SchemaCanvas sizing', () => {
  it('sizes the canvas from an ancestor WE own, not through the style prop', () => {
    render(
      <SchemaCanvas
        controller={populatedController()}
        tenantId="t1"
        appScope="crm7"
        onError={noop}
      />,
    );
    const flow = screen.getByTestId('mock-reactflow');
    // The outcome, not the mechanism: SOMETHING above the React Flow root has
    // to be pinned, because the root's own height is a percentage the library
    // forces and a percentage of an indefinite parent is zero.
    expect(pinnedAncestor(flow)).not.toBeNull();
  });

  it('passes no sizing key through the style prop, because they are discarded', () => {
    render(
      <SchemaCanvas
        controller={populatedController()}
        tenantId="t1"
        appScope="crm7"
        onError={noop}
      />,
    );
    // Reading the rendered element cannot prove this — the library overwrites
    // these keys, so a value passed and a value never passed look identical
    // downstream. Assert against the source of the binding instead.
    // `import.meta.url` is an http: URL under the jsdom environment, so resolve
    // from the package root instead — vitest runs with cwd at the package.
    const src = readFileSync(
      resolve(process.cwd(), 'src/components/SchemaCanvas.tsx'),
      'utf8',
    );
    const binding = src.slice(
      src.indexOf('const XY_TOKEN_BINDINGS = {'),
      src.indexOf('as React.CSSProperties'),
    );
    const declared = binding
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('/*'));
    for (const key of KEYS_THE_LIBRARY_OVERWRITES) {
      expect(
        declared.some((l) => new RegExp(`^\\s+${key}:`).test(l)),
        `XY_TOKEN_BINDINGS declares "${key}", which @xyflow/react overwrites — ` +
          'it will be silently dropped. Size the canvas from a div we own instead.',
      ).toBe(false);
    }
  });

  it('still binds the brand tokens it was passing before', () => {
    render(
      <SchemaCanvas
        controller={populatedController()}
        tenantId="t1"
        appScope="crm7"
        onError={noop}
      />,
    );
    const flow = screen.getByTestId('mock-reactflow');
    // The sizing fix must not have displaced the palette binding — the whole
    // reason a style prop is passed at all.
    expect(flow.style.getPropertyValue('--xy-minimap-background-color-props')).not.toBe('');
  });
});

/**
 * THE OPENING VIEW MUST BE LEGIBLE.
 *
 * `minZoom={0.05}` on the canvas exists so a user CAN zoom out to the whole
 * diagram. It was never meant to be where the page OPENS. Without a floor on
 * the initial fit, 44 entities drag the opening zoom down until field text
 * renders at 4.5-7 device pixels — the state the operator described as "so
 * confusing it was not functional".
 *
 * These assert the RELATIONSHIP, not the numbers. Any initial floor that keeps
 * text legible passes, and the canvas floor must stay lower so the deliberate
 * "Fit" overview is still reachable. Pinning 0.75 as a literal would be the
 * kind of test that locks in today's value and fails the next honest tuning.
 */
describe('SchemaCanvas opening zoom', () => {
  const renderPopulated = () =>
    render(
      <SchemaCanvas
        controller={populatedController()}
        tenantId="t1"
        appScope="crm7"
        onError={noop}
      />,
    )

  it('floors the INITIAL fit at a zoom where labels are still readable', () => {
    renderPopulated()
    const flow = screen.getByTestId('mock-reactflow')
    const fitMin = Number(flow.getAttribute('data-fit-min-zoom'))
    expect(Number.isFinite(fitMin)).toBe(true)
    // 0.5 is where the operator measured 4.5-7px text. The floor must be above it.
    expect(fitMin).toBeGreaterThan(0.5)
  })

  it('still lets the user zoom further out than the opening view', () => {
    renderPopulated()
    const flow = screen.getByTestId('mock-reactflow')
    const fitMin = Number(flow.getAttribute('data-fit-min-zoom'))
    const canvasMin = Number(flow.getAttribute('data-canvas-min-zoom'))
    // If these were equal, "Fit to see everything" would be unreachable.
    expect(canvasMin).toBeLessThan(fitMin)
  })
})
