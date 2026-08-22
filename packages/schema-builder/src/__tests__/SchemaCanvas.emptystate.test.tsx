/**
 * THE EMPTY STATE MUST NOT BE A DEAD END.
 *
 * Measured live on a zero-entity tenant: the canvas rendered "No entities yet /
 * Create your first entity to start building the schema." and offered no
 * control that could create one. `role="toolbar"` was suppressed because
 * `showToolbar` required `localNodes.length > 0`, and the only path to the
 * create panel was `openCreateEntity()` on an imperative handle that crm7 never
 * attached a ref to.
 *
 * So the screen instructed an action it made impossible, and every automated
 * check was green: the copy existed, the `role="status"` was correct, the
 * handle was implemented and unit-tested. Nothing asked whether a user could
 * actually do the thing the screen told them to do.
 *
 * The button now lives in the empty state itself rather than on the handle,
 * specifically so it cannot be switched off by a consumer forgetting to wire a
 * ref. These tests pin that: the control exists, and it is reachable WITHOUT
 * any ref being passed.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => ({
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-reactflow">{children}</div>
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

/** A controller with NOTHING in it — the state the tenant was actually in. */
function emptyController() {
  return {
    entities: [],
    relations: [],
    fields: {},
    layout: new Map<string, { x: number; y: number }>(),
    isPlatformDeveloper: false,
    isLoading: false,
    loadError: null,
    createEntity: rejects,
    updateEntity: rejects,
    deleteEntity: rejects,
    updateEntityPosition: rejects,
    createRelation: rejects,
    updateRelation: rejects,
    deleteRelation: rejects,
    createField: rejects,
    updateField: rejects,
    deleteField: rejects,
    reorderFields: rejects,
    renameField: rejects,
  } as unknown as Parameters<typeof SchemaCanvas>[0]['controller'];
}

function renderEmpty() {
  // Deliberately NO ref. That is the crm7 configuration that produced the dead
  // end, so it is the configuration the test must cover.
  return render(
    <SchemaCanvas
      controller={emptyController()}
      tenantId="t1"
      appScope="crm7"
      onError={noop}
    />,
  );
}

describe('SchemaCanvas empty state', () => {
  it('still explains what the surface is for', () => {
    renderEmpty();
    expect(screen.getByText('No entities yet')).toBeTruthy();
  });

  it('offers a control that creates an entity, with no ref attached', () => {
    renderEmpty();
    const button = screen.getByRole('button', { name: /create entity/i });
    expect(button).toBeTruthy();
  });

  it('opens the create panel when that control is pressed', () => {
    renderEmpty();

    // Assert the BEFORE state first. The relationship dialog is always mounted
    // (it is a native <dialog> whose `open` prop is toggled), so a bare
    // `getByRole('dialog')` finds one whether or not the button did anything —
    // that assertion passes vacuously and was rejected here for exactly that
    // reason. The properties panel, by contrast, is conditionally rendered, so
    // its create-mode heading is a genuine observable.
    expect(screen.queryByRole('heading', { name: 'New Entity' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /create entity/i }));

    expect(screen.getByRole('heading', { name: 'New Entity' })).toBeTruthy();
    // The panel's own landmark label says which mode it opened in.
    expect(screen.getByRole('region', { name: 'Create New Entity' })).toBeTruthy();
  });

  it('gives the control a 44px touch target', () => {
    // WCAG 2.5.5. Every other control on this surface was 32px or smaller;
    // this one is the primary action of the whole screen.
    renderEmpty();
    const button = screen.getByRole('button', { name: /create entity/i });
    expect(button.className).toContain('h-11');
  });
});
