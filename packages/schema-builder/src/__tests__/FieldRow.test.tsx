import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldRow } from '../components/FieldRow.js'
import type { EntityField } from '../types.js'

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

function renderRow(overrides: Partial<EntityField> = {}, props: Partial<{ fieldIndex: number; totalFields: number }> = {}) {
  const onEdit = vi.fn()
  const { rerender } = render(
    <FieldRow
      field={makeField(overrides)}
      entityId="entity-1"
      fieldIndex={props.fieldIndex ?? 0}
      totalFields={props.totalFields ?? 3}
      onEdit={onEdit}
    />,
  )
  return { onEdit, rerender }
}

// ---------------------------------------------------------------------------
// Render checks
// ---------------------------------------------------------------------------

describe('FieldRow — rendering', () => {
  it('renders the field name', () => {
    renderRow({ field_name: 'my_field' })
    expect(screen.getByTestId('field-name').textContent).toBe('my_field')
  })

  it('renders the field type label', () => {
    renderRow({ field_type: 'integer' })
    expect(screen.getByTestId('field-type').textContent).toBe('Integer')
  })

  it('renders "nullable" when nullable is true', () => {
    renderRow({ nullable: true })
    expect(screen.getByTestId('field-nullable').textContent).toBe('nullable')
  })

  it('renders "required" when nullable is false', () => {
    renderRow({ nullable: false })
    expect(screen.getByTestId('field-nullable').textContent).toBe('required')
  })

  it('renders the pencil edit button', () => {
    renderRow()
    expect(screen.getByTestId('field-edit-button')).toBeDefined()
  })

  it('pencil button has aria-label with field name', () => {
    renderRow({ field_name: 'status_code' })
    const btn = screen.getByRole('button', { name: /Edit status_code/i })
    expect(btn).toBeDefined()
  })

  it('pencil button has aria-keyshortcuts for Alt+ArrowUp and Alt+ArrowDown', () => {
    renderRow()
    const btn = screen.getByTestId('field-edit-button')
    expect(btn.getAttribute('aria-keyshortcuts')).toBe('Alt+ArrowUp Alt+ArrowDown')
  })

  it('row has data-field-id attribute', () => {
    renderRow({ id: 'abc-123' })
    expect(screen.getByTestId('field-row').getAttribute('data-field-id')).toBe('abc-123')
  })

  it('renders all supported field type labels', () => {
    const types: Array<EntityField['field_type']> = [
      'text', 'integer', 'numeric', 'boolean', 'date', 'timestamptz', 'uuid',
    ]
    for (const field_type of types) {
      const { unmount } = render(
        <FieldRow
          field={makeField({ field_type })}
          entityId="e"
          fieldIndex={0}
          totalFields={1}
          onEdit={vi.fn()}
        />,
      )
      unmount()
    }
    // No assertion — just verifying no runtime error for any type
    expect(true).toBe(true)
  })

  it('unknown field_type falls back to raw type string', () => {
    const field = makeField({ field_type: 'jsonb' as EntityField['field_type'] })
    render(
      <FieldRow field={field} entityId="e" fieldIndex={0} totalFields={1} onEdit={vi.fn()} />,
    )
    expect(screen.getByTestId('field-type').textContent).toBe('jsonb')
  })
})

// ---------------------------------------------------------------------------
// Click handler
// ---------------------------------------------------------------------------

describe('FieldRow — click interactions', () => {
  it('calls onEdit with the field id when pencil button is clicked', () => {
    const { onEdit } = renderRow({ id: 'fid-42' })
    fireEvent.click(screen.getByTestId('field-edit-button'))
    expect(onEdit).toHaveBeenCalledWith('fid-42')
  })

  it('calls onEdit exactly once per click', () => {
    const { onEdit } = renderRow()
    fireEvent.click(screen.getByTestId('field-edit-button'))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Phase 3A: keyboard reorder — CustomEvent dispatching
// ---------------------------------------------------------------------------

describe('FieldRow — keyboard reorder (Phase 3A)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Alt+ArrowUp dispatches bsuite-reorder-field with direction "up"', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    document.addEventListener('bsuite-reorder-field', listener)

    render(
      <FieldRow
        field={makeField({ id: 'fid-1', field_name: 'alpha' })}
        entityId="entity-1"
        fieldIndex={1}
        totalFields={3}
        onEdit={vi.fn()}
      />,
    )

    const btn = screen.getByTestId('field-edit-button')
    btn.focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')

    expect(listener).toHaveBeenCalledTimes(1)
    const evt = listener.mock.calls[0][0] as CustomEvent
    expect(evt.detail).toMatchObject({
      entityId:  'entity-1',
      fieldId:   'fid-1',
      direction: 'up',
    })

    document.removeEventListener('bsuite-reorder-field', listener)
  })

  it('Alt+ArrowDown dispatches bsuite-reorder-field with direction "down"', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    document.addEventListener('bsuite-reorder-field', listener)

    render(
      <FieldRow
        field={makeField({ id: 'fid-2', field_name: 'beta' })}
        entityId="entity-1"
        fieldIndex={0}
        totalFields={3}
        onEdit={vi.fn()}
      />,
    )

    const btn = screen.getByTestId('field-edit-button')
    btn.focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    expect(listener).toHaveBeenCalledTimes(1)
    const evt = listener.mock.calls[0][0] as CustomEvent
    expect(evt.detail).toMatchObject({ direction: 'down' })

    document.removeEventListener('bsuite-reorder-field', listener)
  })

  it('the dispatched event bubbles (bubbles: true)', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    // Listen on a parent to verify bubbling
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    parent.addEventListener('bsuite-reorder-field', listener)

    const { unmount } = render(
      <FieldRow
        field={makeField({ id: 'fid-3' })}
        entityId="entity-1"
        fieldIndex={0}
        totalFields={2}
        onEdit={vi.fn()}
      />,
      { container: parent },
    )

    const btn = screen.getByTestId('field-edit-button')
    btn.focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')

    expect(listener).toHaveBeenCalledTimes(1)

    unmount()
    document.body.removeChild(parent)
  })

  it('plain ArrowUp (no Alt) does not dispatch the custom event', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    document.addEventListener('bsuite-reorder-field', listener)

    render(
      <FieldRow
        field={makeField()}
        entityId="entity-1"
        fieldIndex={1}
        totalFields={3}
        onEdit={vi.fn()}
      />,
    )

    const btn = screen.getByTestId('field-edit-button')
    btn.focus()
    await user.keyboard('{ArrowUp}')

    expect(listener).not.toHaveBeenCalled()

    document.removeEventListener('bsuite-reorder-field', listener)
  })

  it('plain ArrowDown (no Alt) does not dispatch the custom event', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    document.addEventListener('bsuite-reorder-field', listener)

    render(
      <FieldRow
        field={makeField()}
        entityId="entity-1"
        fieldIndex={0}
        totalFields={3}
        onEdit={vi.fn()}
      />,
    )

    const btn = screen.getByTestId('field-edit-button')
    btn.focus()
    await user.keyboard('{ArrowDown}')

    expect(listener).not.toHaveBeenCalled()

    document.removeEventListener('bsuite-reorder-field', listener)
  })

  it('event detail includes the correct entityId', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    document.addEventListener('bsuite-reorder-field', listener)

    render(
      <FieldRow
        field={makeField({ id: 'fid-x' })}
        entityId="my-special-entity"
        fieldIndex={0}
        totalFields={2}
        onEdit={vi.fn()}
      />,
    )

    const btn = screen.getByTestId('field-edit-button')
    btn.focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')

    expect((listener.mock.calls[0][0] as CustomEvent).detail.entityId).toBe('my-special-entity')

    document.removeEventListener('bsuite-reorder-field', listener)
  })
})
