/**
 * SchemaCanvas tests — including Phase 3A ARIA live-region announcement tests.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { SchemaCanvas } from '../components/SchemaCanvas.js'
import type { EntityField, SchemaController } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<EntityField> = {}): EntityField {
  return {
    id:         'field-1',
    entity_id:  'entity-1',
    tenant_id:  'tenant-1',
    field_name: 'my_field',
    field_type: 'text',
    nullable:   true,
    sort_order: 10,
    created_at: '2026-05-04T00:00:00Z',
    ...overrides,
  }
}

function makeController(overrides: Partial<SchemaController> = {}): SchemaController {
  return {
    fields:        [],
    loading:       false,
    error:         null,
    loadFields:    vi.fn().mockResolvedValue(undefined),
    createField:   vi.fn().mockResolvedValue(undefined),
    updateField:   vi.fn().mockResolvedValue(undefined),
    deleteField:   vi.fn().mockResolvedValue(undefined),
    reorderFields: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderCanvas(
  controller: SchemaController,
  props: Partial<React.ComponentProps<typeof SchemaCanvas>> = {},
) {
  const onEditField = vi.fn()
  const onCreateField = vi.fn()
  render(
    <SchemaCanvas
      entityId="entity-1"
      controller={controller}
      onEditField={onEditField}
      onCreateField={onCreateField}
      {...props}
    />,
  )
  return { onEditField, onCreateField }
}

function dispatchReorderEvent(
  targetElement: HTMLElement,
  detail: { entityId: string; fieldId: string; direction: 'up' | 'down' },
) {
  targetElement.dispatchEvent(
    new CustomEvent('bsuite-reorder-field', { bubbles: true, detail }),
  )
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('SchemaCanvas — rendering', () => {
  it('renders the canvas container', () => {
    renderCanvas(makeController())
    expect(screen.getByTestId('schema-canvas')).toBeDefined()
  })

  it('renders empty message when no fields', () => {
    renderCanvas(makeController({ fields: [] }))
    expect(screen.getByTestId('empty-message')).toBeDefined()
  })

  it('renders a FieldRow for each field', () => {
    const controller = makeController({
      fields: [makeField({ id: 'f1' }), makeField({ id: 'f2' })],
    })
    renderCanvas(controller)
    expect(screen.getAllByTestId('field-row')).toHaveLength(2)
  })

  it('shows loading indicator while loading', () => {
    renderCanvas(makeController({ loading: true }))
    expect(screen.getByTestId('loading-indicator')).toBeDefined()
  })

  it('shows error message when error is set', () => {
    renderCanvas(makeController({ error: 'something went wrong' }))
    expect(screen.getByTestId('error-message').textContent).toBe('something went wrong')
  })

  it('renders the Add field button when onCreateField is provided', () => {
    renderCanvas(makeController())
    expect(screen.getByTestId('add-field-button')).toBeDefined()
  })

  it('does not render Add field button when onCreateField is not provided', () => {
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={makeController()}
        onEditField={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('add-field-button')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Phase 3A: ARIA live region
// ---------------------------------------------------------------------------

describe('SchemaCanvas — ARIA live region (Phase 3A)', () => {
  it('renders a role="status" aria-live="polite" region', () => {
    renderCanvas(makeController())
    const region = screen.getByTestId('reorder-announcement')
    expect(region.getAttribute('role')).toBe('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
  })

  it('announces "Moved {name} up" when a field moves up', async () => {
    const fields = [
      makeField({ id: 'f1', field_name: 'alpha', sort_order: 10 }),
      makeField({ id: 'f2', field_name: 'beta',  sort_order: 20 }),
    ]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'entity-1', fieldId: 'f2', direction: 'up' })
    })

    await waitFor(() => {
      const region = screen.getByTestId('reorder-announcement')
      expect(region.textContent).toBe('Moved beta up')
    })
  })

  it('announces "Moved {name} down" when a field moves down', async () => {
    const fields = [
      makeField({ id: 'f1', field_name: 'alpha', sort_order: 10 }),
      makeField({ id: 'f2', field_name: 'beta',  sort_order: 20 }),
    ]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'entity-1', fieldId: 'f1', direction: 'down' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('reorder-announcement').textContent).toBe('Moved alpha down')
    })
  })

  it('announces "Already at top" when moving first field up', async () => {
    const fields = [
      makeField({ id: 'f1', field_name: 'alpha', sort_order: 10 }),
      makeField({ id: 'f2', field_name: 'beta',  sort_order: 20 }),
    ]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'entity-1', fieldId: 'f1', direction: 'up' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('reorder-announcement').textContent).toBe('Already at top')
    })
  })

  it('announces "Already at bottom" when moving last field down', async () => {
    const fields = [
      makeField({ id: 'f1', field_name: 'alpha', sort_order: 10 }),
      makeField({ id: 'f2', field_name: 'beta',  sort_order: 20 }),
    ]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'entity-1', fieldId: 'f2', direction: 'down' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('reorder-announcement').textContent).toBe('Already at bottom')
    })
  })

  it('does not call reorderFields when field is already at top', async () => {
    const fields = [
      makeField({ id: 'f1', sort_order: 10 }),
      makeField({ id: 'f2', sort_order: 20 }),
    ]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'entity-1', fieldId: 'f1', direction: 'up' })
    })

    await waitFor(() => {
      expect(controller.reorderFields).not.toHaveBeenCalled()
    })
  })

  it('does not call reorderFields when field is already at bottom', async () => {
    const fields = [
      makeField({ id: 'f1', sort_order: 10 }),
      makeField({ id: 'f2', sort_order: 20 }),
    ]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'entity-1', fieldId: 'f2', direction: 'down' })
    })

    await waitFor(() => {
      expect(controller.reorderFields).not.toHaveBeenCalled()
    })
  })

  it('calls reorderFields with swapped field ids when moving up', async () => {
    const fields = [
      makeField({ id: 'f1', sort_order: 10 }),
      makeField({ id: 'f2', sort_order: 20 }),
      makeField({ id: 'f3', sort_order: 30 }),
    ]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'entity-1', fieldId: 'f2', direction: 'up' })
    })

    await waitFor(() => {
      expect(controller.reorderFields).toHaveBeenCalledWith('entity-1', ['f2', 'f1', 'f3'])
    })
  })

  it('ignores events for a different entityId', async () => {
    const fields = [makeField({ id: 'f1', sort_order: 10 }), makeField({ id: 'f2', sort_order: 20 })]
    const controller = makeController({ fields })
    render(
      <SchemaCanvas
        entityId="entity-1"
        controller={controller}
        onEditField={vi.fn()}
      />,
    )

    act(() => {
      dispatchReorderEvent(screen.getByTestId('schema-canvas'), { entityId: 'DIFFERENT-ENTITY', fieldId: 'f2', direction: 'up' })
    })

    await waitFor(() => {
      expect(controller.reorderFields).not.toHaveBeenCalled()
    })
  })
})
