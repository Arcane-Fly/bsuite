import { ReactFlowProvider } from '@xyflow/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EntityNode, type EntityNodeData } from './EntityNode.js';

function renderNode(data: EntityNodeData) {
  return render(
    <ReactFlowProvider>
      <EntityNode
        id={data.entity.id}
        type="entity"
        data={data}
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
      />
    </ReactFlowProvider>,
  );
}

describe('EntityNode', () => {
  it('explains system entities and connector handles', () => {
    renderNode({
      label: 'Contacts',
      entity: {
        id: 'contacts',
        tenant_id: null,
        name: 'contacts',
        label: 'Contacts',
        description: null,
        icon: null,
        app_scope: 'crm7',
        is_system: true,
        metadata: null,
        created_at: null,
        updated_at: null,
      },
      fields: [],
    });

    expect(screen.getByLabelText('System entity')).toHaveAttribute(
      'title',
      expect.stringContaining('built-in'),
    );
    expect(screen.getByText('No custom fields yet')).toBeTruthy();
    expect(screen.getAllByTitle(/relationship/i).length).toBeGreaterThanOrEqual(2);

  });

  it('offers no "Add to Page" control while nothing listens for it', () => {
    // The button dispatched `bsuite-add-entity-widget`, for which there is no
    // addEventListener anywhere in this package or in any of the six consumer
    // apps. The old test asserted the dispatch fired — which was true, and
    // proved nothing about whether anything received it. A green test sat over
    // a dead control.
    //
    // Assert the absence instead, so re-adding the button without a listener
    // turns this red. Delete this test when a listener genuinely exists.
    renderNode({
      label: 'Contacts',
      entity: {
        id: 'contacts',
        tenant_id: null,
        name: 'contacts',
        label: 'Contacts',
        description: null,
        icon: null,
        app_scope: 'crm7',
        is_system: true,
        metadata: null,
        created_at: null,
        updated_at: null,
      },
      fields: [],
    });
    expect(screen.queryByRole('button', { name: /add to page/i })).toBeNull();
  });

  it('does not repeat the connect instruction on every card', () => {
    // It was rendered once per card — 44 copies of one sentence, at 5 device px
    // where none of them could be read. It belongs on the toolbar, once.
    renderNode({
      label: 'Contacts',
      entity: {
        id: 'contacts',
        tenant_id: null,
        name: 'contacts',
        label: 'Contacts',
        description: null,
        icon: null,
        app_scope: 'crm7',
        is_system: false,
        metadata: null,
        created_at: null,
        updated_at: null,
      },
      fields: [],
    });
    expect(screen.queryByText(/drag blue dots/i)).toBeNull();
  });
});
