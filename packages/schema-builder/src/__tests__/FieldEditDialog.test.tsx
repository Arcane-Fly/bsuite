/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { FieldEditDialog } from '../components/FieldEditDialog.js';
import type { TenantFieldDefinition } from '../types.js';

// jsdom only partially implements <dialog>; polyfill showModal/close so the
// component's imperative open/close useEffect doesn't throw. Matches the
// FieldCreateDialog test setup.
beforeAll(() => {
  if (typeof HTMLDialogElement !== 'undefined') {
    if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
      HTMLDialogElement.prototype.showModal = function (
        this: HTMLDialogElement,
      ) {
        this.open = true;
      };
    }
    if (typeof HTMLDialogElement.prototype.close !== 'function') {
      HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.open = false;
      };
    }
  }
});

const baseField: TenantFieldDefinition = {
  id: 'field-1',
  tenant_id: 'tenant-a',
  entity_id: 'entity-a',
  entity_type: 'contacts',
  field_name: 'email_address',
  field_type: 'email',
  label: 'Email Address',
  placeholder: 'jane@example.com',
  is_required: true,
  options: null,
  sort_order: 3,
  is_active: true,
  scope: null,
  is_system: false,
  is_locked: false,
  created_at: null,
  updated_at: null,
};

function setup(
  propsOverride: Partial<Parameters<typeof FieldEditDialog>[0]> = {},
  fieldOverride: Partial<TenantFieldDefinition> = {},
) {
  const onSave = vi.fn();
  const onDelete = vi.fn();
  const onOpenChange = vi.fn();
  const field = { ...baseField, ...fieldOverride };
  const utils = render(
    <FieldEditDialog
      open={true}
      onOpenChange={onOpenChange}
      entityLabel="Contacts"
      entityName="contacts"
      field={field}
      existingFieldNames={['email_address']}
      onSave={onSave}
      onDelete={onDelete}
      {...propsOverride}
    />,
  );
  return { ...utils, onSave, onDelete, onOpenChange, field };
}

describe('FieldEditDialog', () => {
  afterEach(() => {
    // If an individual test stubbed window.confirm, restore it so the next
    // test doesn't inherit the mock.
    vi.restoreAllMocks();
  });

  it('renders the dialog header with the entity label and name', () => {
    setup();
    expect(
      screen.getByRole('heading', { name: /Edit Field in Contacts/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('contacts')).toBeInTheDocument();
  });

  it('pre-populates every field from the `field` prop', () => {
    setup();
    expect(
      (screen.getByLabelText('Field Name') as HTMLInputElement).value,
    ).toBe('email_address');
    expect(
      (screen.getByLabelText('Field Type') as HTMLSelectElement).value,
    ).toBe('email');
    expect(
      (screen.getByLabelText('Display Label') as HTMLInputElement).value,
    ).toBe('Email Address');
    expect(
      (screen.getByLabelText('Placeholder (optional)') as HTMLInputElement)
        .value,
    ).toBe('jane@example.com');
    expect(
      (screen.getByLabelText('Required field') as HTMLInputElement).checked,
    ).toBe(true);
  });

  it('renders nothing when `field` is null', () => {
    const onSave = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <FieldEditDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        field={null}
        onSave={onSave}
        onDelete={onDelete}
      />,
    );
    // When field is null the component returns null entirely.
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('disables Save when name is cleared', () => {
    setup();
    const input = screen.getByLabelText('Field Name');
    fireEvent.change(input, { target: { value: '' } });
    const submit = screen.getByRole('button', { name: 'Save Changes' });
    expect(submit).toBeDisabled();
  });

  it('disables Save when name is less than 2 characters', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'a' },
    });
    expect(
      screen.getByRole('button', { name: 'Save Changes' }),
    ).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /at least 2 characters/i,
    );
  });

  it('disables Save when name fails snake_case (leading digit)', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: '9bad' },
    });
    expect(
      screen.getByRole('button', { name: 'Save Changes' }),
    ).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/snake_case/i);
  });

  it('disables Save when name conflicts with a different existing field', () => {
    setup({
      existingFieldNames: ['email_address', 'phone_number'],
    });
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'phone_number' },
    });
    expect(
      screen.getByRole('button', { name: 'Save Changes' }),
    ).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it("does not flag a conflict against the field's own current name", () => {
    // The uniqueness check must exclude the current row so the user can
    // submit the form without renaming.
    setup();
    expect(
      screen.getByRole('button', { name: 'Save Changes' }),
    ).toBeEnabled();
  });

  it('fires onSave with the correct payload when submitted', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText('Display Label'), {
      target: { value: 'Primary Email' },
    });
    fireEvent.change(screen.getByLabelText('Field Type'), {
      target: { value: 'text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      field_name: 'email_address',
      field_type: 'text',
      label: 'Primary Email',
      placeholder: 'jane@example.com',
      is_required: true,
    });
  });

  it('does not call onSave when form is submitted with an invalid name', () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'a' }, // too short
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const { onOpenChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onDelete when the user confirms the delete prompt', () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Delete Field/i }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onDelete when the user cancels the confirm prompt', () => {
    window.confirm = vi.fn().mockReturnValue(false);
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Delete Field/i }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('re-seeds the form when the `field` prop changes to a different field', () => {
    const { rerender } = setup();
    // Dirty an input — then rerender with a different field.
    fireEvent.change(screen.getByLabelText('Display Label'), {
      target: { value: 'Dirty Draft' },
    });
    rerender(
      <FieldEditDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        field={{
          ...baseField,
          id: 'field-2',
          field_name: 'phone_number',
          field_type: 'phone',
          label: 'Phone Number',
          placeholder: null,
          is_required: false,
        }}
        existingFieldNames={['email_address', 'phone_number']}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      (screen.getByLabelText('Field Name') as HTMLInputElement).value,
    ).toBe('phone_number');
    expect(
      (screen.getByLabelText('Display Label') as HTMLInputElement).value,
    ).toBe('Phone Number');
    expect(
      (screen.getByLabelText('Required field') as HTMLInputElement).checked,
    ).toBe(false);
  });
});
