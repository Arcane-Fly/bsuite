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
  it('explains system entities, connector handles, and add-to-page behavior', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
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

    const addButton = screen.getByRole('button', { name: /add to page/i });
    expect(addButton).toHaveAttribute('title', expect.stringContaining('custom page layout'));
    addButton.click();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bsuite-add-entity-widget' }),
    );
  });
});
