/**
 * FieldEditDialog test suite — referenced as the "test style reference" in
 * the Phase 3A issue.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldEditDialog } from '../components/FieldEditDialog.js'
import type { EntityField } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<EntityField> = {}): EntityField {
  return {
    id:         'field-1',
    entity_id:  'entity-1',
    tenant_id:  'tenant-1',
    field_name: 'existing_field',
    field_type: 'text',
    nullable:   true,
    sort_order: 10,
    created_at: '2026-05-04T00:00:00Z',
    ...overrides,
  }
}

function renderDialog(
  field: EntityField | null = makeField(),
  props: Partial<React.ComponentProps<typeof FieldEditDialog>> = {},
) {
  const onOpenChange = vi.fn()
  const onSubmit     = vi.fn().mockResolvedValue(undefined)
  render(
    <FieldEditDialog
      field={field}
      open={true}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onOpenChange, onSubmit }
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

describe('FieldEditDialog — visibility', () => {
  it('renders when open=true and field is provided', () => {
    renderDialog()
    expect(screen.getByTestId('field-edit-dialog')).toBeDefined()
  })

  it('renders nothing when open=false', () => {
    renderDialog(makeField(), { open: false })
    expect(screen.queryByTestId('field-edit-dialog')).toBeNull()
  })

  it('renders nothing when field is null', () => {
    renderDialog(null)
    expect(screen.queryByTestId('field-edit-dialog')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Pre-filled values
// ---------------------------------------------------------------------------

describe('FieldEditDialog — pre-filled form values', () => {
  it('pre-fills field name from the field prop', () => {
    renderDialog(makeField({ field_name: 'original_name' }))
    const input = screen.getByTestId('field-name-input') as HTMLInputElement
    expect(input.value).toBe('original_name')
  })

  it('pre-fills field type from the field prop', () => {
    renderDialog(makeField({ field_type: 'integer' }))
    const sel = screen.getByTestId('field-type-select') as HTMLSelectElement
    expect(sel.value).toBe('integer')
  })

  it('pre-fills nullable checkbox from the field prop (true)', () => {
    renderDialog(makeField({ nullable: true }))
    const cb = screen.getByTestId('field-nullable-checkbox') as HTMLInputElement
    expect(cb.checked).toBe(true)
  })

  it('pre-fills nullable checkbox from the field prop (false)', () => {
    renderDialog(makeField({ nullable: false }))
    const cb = screen.getByTestId('field-nullable-checkbox') as HTMLInputElement
    expect(cb.checked).toBe(false)
  })

  it('renders all seven field type options', () => {
    renderDialog()
    const sel = screen.getByTestId('field-type-select') as HTMLSelectElement
    expect(sel.options.length).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('FieldEditDialog — validation', () => {
  it('shows error when field name is cleared and form submitted', async () => {
    renderDialog()
    const input = screen.getByTestId('field-name-input')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('field-edit-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('field-name-error')).toBeDefined()
    })
  })

  it('shows error when field name contains uppercase letters', async () => {
    renderDialog()
    fireEvent.change(screen.getByTestId('field-name-input'), { target: { value: 'MyField' } })
    fireEvent.click(screen.getByTestId('field-edit-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('field-name-error')).toBeDefined()
    })
  })

  it('does not show validation error before submit', () => {
    renderDialog()
    expect(screen.queryByTestId('field-name-error')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

describe('FieldEditDialog — submission', () => {
  it('calls onSubmit with the field id and updated payload', async () => {
    const user = userEvent.setup()
    const field = makeField({ id: 'fid-99', field_name: 'old_name' })
    const { onSubmit } = renderDialog(field)

    const input = screen.getByTestId('field-name-input')
    await user.clear(input)
    await user.type(input, 'new_name')
    fireEvent.click(screen.getByTestId('field-edit-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('fid-99', {
        field_name: 'new_name',
        field_type: 'text',
        nullable:   true,
      })
    })
  })

  it('calls onOpenChange(false) after successful submit', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    const input = screen.getByTestId('field-name-input')
    await user.clear(input)
    await user.type(input, 'valid_name')
    fireEvent.click(screen.getByTestId('field-edit-submit'))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('does not call onSubmit when field name is invalid', async () => {
    const { onSubmit } = renderDialog()
    fireEvent.change(screen.getByTestId('field-name-input'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('field-edit-submit'))
    await waitFor(() => expect(screen.getByTestId('field-name-error')).toBeDefined())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits updated field type', async () => {
    const { onSubmit } = renderDialog(makeField({ field_name: 'valid_name' }))

    fireEvent.change(screen.getByTestId('field-type-select'), { target: { value: 'boolean' } })
    fireEvent.click(screen.getByTestId('field-edit-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ field_type: 'boolean' }),
      )
    })
  })

  it('submits updated nullable=false', async () => {
    const { onSubmit } = renderDialog(makeField({ nullable: true, field_name: 'valid_name' }))

    fireEvent.click(screen.getByTestId('field-nullable-checkbox')) // uncheck → false
    fireEvent.click(screen.getByTestId('field-edit-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ nullable: false }),
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe('FieldEditDialog — cancel', () => {
  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const { onOpenChange } = renderDialog()
    fireEvent.click(screen.getByTestId('field-edit-cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not call onSubmit when Cancel is clicked', () => {
    const { onSubmit } = renderDialog()
    fireEvent.click(screen.getByTestId('field-edit-cancel'))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// ARIA
// ---------------------------------------------------------------------------

describe('FieldEditDialog — ARIA', () => {
  it('has role="dialog"', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('has aria-modal="true"', () => {
    renderDialog()
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true')
  })

  it('dialog is labelled by a heading', () => {
    renderDialog()
    expect(screen.getByRole('heading', { name: /Edit Field/i })).toBeDefined()
  })
})
