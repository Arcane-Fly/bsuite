/**
 * LEVEL OF DETAIL by zoom band.
 *
 * The canvas opened at scale 0.5 — React Flow's default `minZoom`, which
 * `fitView` could not go below — and drew every card in full detail at half
 * size. Field names rendered at 5.5 device px and field types at 5. The
 * operator reported the canvas as illegible and mis-transcribed one of the
 * on-card strings while doing so, which is about as direct a demonstration as
 * a defect report can give.
 *
 * `minZoom` is now 0.05 so Fit can actually fit, and these bands make the
 * zoomed-out view say less rather than say everything unreadably.
 *
 * Each band is asserted at BOTH sides of its threshold. A test that only ever
 * renders at zoom 1 would pass against a component with no level-of-detail
 * behaviour at all — which is precisely the state this replaces.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let mockZoom = 1;

vi.mock('@xyflow/react', () => ({
  Handle: (props: Record<string, unknown>) => (
    <div data-testid="mock-handle" {...props} />
  ),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  useStore: (selector: (s: { transform: [number, number, number] }) => unknown) =>
    selector({ transform: [0, 0, mockZoom] }),
}));

const { EntityNode } = await import('../components/EntityNode.js');

const FIELDS = [
  { id: 'contacts.id', name: 'id', type: 'uuid', isPrimary: true, isNullable: false },
  {
    id: 'contacts.email',
    name: 'email',
    type: 'text',
    isPrimary: false,
    isNullable: true,
  },
];

function renderAtZoom(zoom: number) {
  mockZoom = zoom;
  return render(
    <EntityNode
      id="contacts"
      type="entity"
      data={{
        label: 'Contacts',
        entity: {
          id: 'contacts',
          tenant_id: null,
          name: 'contacts_physical',
          label: 'Contacts',
          description: null,
          icon: null,
          app_scope: 'crm7',
          is_system: false,
          metadata: null,
          created_at: null,
          updated_at: null,
        },
        fields: FIELDS,
      }}
      selected={false}
      isConnectable
      positionAbsoluteX={0}
      positionAbsoluteY={0}
      dragging={false}
      dragHandle=".schema-node-drag-handle"
      zIndex={0}
      selectable
      deletable
      draggable
    />,
  );
}

describe('EntityNode level of detail', () => {
  it('draws full field rows at and above 0.7', () => {
    renderAtZoom(0.7);
    expect(screen.getByText('email')).toBeTruthy();
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('replaces field rows with a count below 0.7', () => {
    renderAtZoom(0.69);
    // The rows themselves are gone...
    expect(screen.queryByText('email')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    // ...but the card still answers "is there anything in here".
    expect(screen.getByText('2 fields')).toBeTruthy();
  });

  it('still shows the physical table name in the middle band', () => {
    renderAtZoom(0.5);
    expect(screen.getByText('contacts_physical')).toBeTruthy();
  });

  it('drops to label only below 0.35', () => {
    renderAtZoom(0.34);
    expect(screen.queryByText('contacts_physical')).toBeNull();
    expect(screen.queryByText('2 fields')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    // The entity name is the one thing worth the pixels at this scale.
    expect(screen.getByText('Contacts')).toBeTruthy();
  });

  it('keeps the label legible at every band', () => {
    for (const z of [0.05, 0.34, 0.35, 0.69, 0.7, 2]) {
      const { unmount } = renderAtZoom(z);
      expect(screen.getByText('Contacts')).toBeTruthy();
      unmount();
    }
  });

  it('singularises the field count', () => {
    mockZoom = 0.5;
    render(
      <EntityNode
        id="one"
        type="entity"
        data={{
          label: 'One',
          entity: {
            id: 'one',
            tenant_id: null,
            name: 'one_physical',
            label: 'One',
            description: null,
            icon: null,
            app_scope: 'crm7',
            is_system: false,
            metadata: null,
            created_at: null,
            updated_at: null,
          },
          fields: [FIELDS[0]],
        }}
        selected={false}
        isConnectable
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        dragging={false}
        dragHandle=".schema-node-drag-handle"
        zIndex={0}
        selectable
        deletable
        draggable
      />,
    );
    expect(screen.getByText('1 field')).toBeTruthy();
  });
});
