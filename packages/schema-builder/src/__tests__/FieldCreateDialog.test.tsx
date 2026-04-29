import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldCreateDialog } from '../components/FieldCreateDialog.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(props: Partial<React.ComponentProps<typeof FieldCreateDialog>> = {}) {
  const onOpenChange = vi.fn()
  const onSubmit     = vi.fn().mockResolvedValue(undefined)
  render(
    <FieldCreateDialog
      entityId="entity-1"
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

describe('FieldCreateDialog — visibility', () => {
  it('renders when open is true', () => {
    renderDialog({ open: true })
    expect(screen.getByTestId('field-create-dialog')).toBeDefined()
  })

  it('renders nothing when open is false', () => {
    renderDialog({ open: false })
    expect(screen.queryByTestId('field-create-dialog')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

describe('FieldCreateDialog — form fields', () => {
  it('renders a field name input', () => {
    renderDialog()
    expect(screen.getByTestId('field-name-input')).toBeDefined()
  })

  it('renders a field type selector', () => {
    renderDialog()
    expect(screen.getByTestId('field-type-select')).toBeDefined()
  })

  it('renders a nullable checkbox', () => {
    renderDialog()
    expect(screen.getByTestId('field-nullable-checkbox')).toBeDefined()
  })

  it('nullable checkbox is checked by default', () => {
    renderDialog()
    const cb = screen.getByTestId('field-nullable-checkbox') as HTMLInputElement
    expect(cb.checked).toBe(true)
  })

  it('field type select defaults to "text"', () => {
    renderDialog()
    const sel = screen.getByTestId('field-type-select') as HTMLSelectElement
    expect(sel.value).toBe('text')
  })

  it('renders all seven field type options', () => {
    renderDialog()
    const sel = screen.getByTestId('field-type-select') as HTMLSelectElement
    expect(sel.options.length).toBe(7)
  })

  it('has a Save submit button', () => {
    renderDialog()
    expect(screen.getByTestId('field-create-submit').textContent).toBe('Save')
  })

  it('has a Cancel button', () => {
    renderDialog()
    expect(screen.getByTestId('field-create-cancel')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('FieldCreateDialog — validation', () => {
  it('shows error when field name is empty on submit', async () => {
    renderDialog()
    fireEvent.click(screen.getByTestId('field-create-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('field-name-error')).toBeDefined()
    })
  })

  it('shows error when field name contains uppercase letters', async () => {
    renderDialog()
    fireEvent.change(screen.getByTestId('field-name-input'), { target: { value: 'MyField' } })
    fireEvent.click(screen.getByTestId('field-create-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('field-name-error')).toBeDefined()
    })
  })

  it('shows error when field name starts with a digit', async () => {
    renderDialog()
    fireEvent.change(screen.getByTestId('field-name-input'), { target: { value: '1field' } })
    fireEvent.click(screen.getByTestId('field-create-submit'))
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

describe('FieldCreateDialog — submission', () => {
  it('calls onSubmit with correct payload on valid submit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderDialog()

    await user.type(screen.getByTestId('field-name-input'), 'my_custom_field')
    fireEvent.click(screen.getByTestId('field-create-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        entity_id:  'entity-1',
        field_name: 'my_custom_field',
        field_type: 'text',
        nullable:   true,
      })
    })
  })

  it('calls onSubmit with selected field type', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderDialog()

    await user.type(screen.getByTestId('field-name-input'), 'count_field')
    fireEvent.change(screen.getByTestId('field-type-select'), { target: { value: 'integer' } })
    fireEvent.click(screen.getByTestId('field-create-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ field_type: 'integer' }),
      )
    })
  })

  it('calls onSubmit with nullable=false when checkbox unchecked', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderDialog()

    await user.type(screen.getByTestId('field-name-input'), 'required_field')
    fireEvent.click(screen.getByTestId('field-nullable-checkbox'))  // uncheck
    fireEvent.click(screen.getByTestId('field-create-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ nullable: false }),
      )
    })
  })

  it('calls onOpenChange(false) after successful submit', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    await user.type(screen.getByTestId('field-name-input'), 'valid_name')
    fireEvent.click(screen.getByTestId('field-create-submit'))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('does not call onSubmit when field name is invalid', async () => {
    const { onSubmit } = renderDialog()
    fireEvent.click(screen.getByTestId('field-create-submit'))
    await waitFor(() => expect(screen.getByTestId('field-name-error')).toBeDefined())
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe('FieldCreateDialog — cancel', () => {
  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const { onOpenChange } = renderDialog()
    fireEvent.click(screen.getByTestId('field-create-cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not call onSubmit when Cancel is clicked', () => {
    const { onSubmit } = renderDialog()
    fireEvent.click(screen.getByTestId('field-create-cancel'))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// ARIA
// ---------------------------------------------------------------------------

describe('FieldCreateDialog — ARIA', () => {
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
    expect(screen.getByRole('heading', { name: /Add Field/i })).toBeDefined()
  })
})
