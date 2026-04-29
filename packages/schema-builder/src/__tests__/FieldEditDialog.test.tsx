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

// ---------------------------------------------------------------------------
// Phase 3B: physical rename disclosure + confirmation modal
// ---------------------------------------------------------------------------

describe('FieldEditDialog — Phase 3B physical rename', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hides the physical disclosure when field_name is unchanged', () => {
    const onPreviewRename = vi.fn();
    setup({ onPreviewRename });
    // No name change — disclosure must not be rendered.
    expect(
      screen.queryByText(/Also rename the underlying Postgres column/i),
    ).toBeNull();
  });

  it('hides the physical disclosure when onPreviewRename is not wired', () => {
    // Change the name but don't provide onPreviewRename.
    const { getByLabelText } = setup();
    fireEvent.change(getByLabelText('Field Name'), {
      target: { value: 'primary_email' },
    });
    expect(
      screen.queryByText(/Also rename the underlying Postgres column/i),
    ).toBeNull();
  });

  it('shows the physical disclosure when name changes and onPreviewRename is provided', async () => {
    const onPreviewRename = vi.fn().mockResolvedValue({
      would_execute: 'ALTER TABLE contacts RENAME COLUMN email_address TO primary_email',
      affected_views: [],
      affected_policies: [],
    });
    setup({ onPreviewRename });
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'primary_email' },
    });
    expect(
      screen.getByText(/Also rename the underlying Postgres column/i),
    ).toBeInTheDocument();
  });

  it('does not call onPreviewRename when physical checkbox is unchecked', async () => {
    const onSave = vi.fn();
    const onPreviewRename = vi.fn().mockResolvedValue({
      would_execute: 'ALTER TABLE contacts RENAME COLUMN email_address TO primary_email',
      affected_views: [],
      affected_policies: [],
    });
    render(
      <FieldEditDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        field={baseField}
        existingFieldNames={['email_address']}
        onSave={onSave}
        onDelete={vi.fn()}
        onPreviewRename={onPreviewRename}
      />,
    );
    // Change name but do NOT check the physical checkbox.
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'primary_email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    // Metadata-only save should fire directly without calling the preview RPC.
    expect(onPreviewRename).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ field_name: 'primary_email' }),
    );
    // physical flag should NOT be set for metadata-only saves.
    const callArg = (onSave as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.physical).toBeUndefined();
  });

  it('calls onPreviewRename and shows the confirmation modal when physical is checked', async () => {
    const dryRunResult = {
      would_execute: 'ALTER TABLE contacts RENAME COLUMN email_address TO primary_email',
      affected_views: ['v_contact_emails'],
      affected_policies: ['contacts_tenant_select'],
    };
    const onPreviewRename = vi.fn().mockResolvedValue(dryRunResult);
    render(
      <FieldEditDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        field={baseField}
        existingFieldNames={['email_address']}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onPreviewRename={onPreviewRename}
      />,
    );

    // Change the name.
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'primary_email' },
    });

    // Open the disclosure and check the physical checkbox.
    const summary = screen.getByText(/Also rename the underlying Postgres column/i);
    fireEvent.click(summary);
    const physicalCheckbox = screen.getByLabelText(
      /Execute.*ALTER TABLE.*RENAME COLUMN.*on save/i,
    );
    fireEvent.click(physicalCheckbox);

    // Click Save — should trigger the preview RPC.
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    // Wait for the async preview to resolve and the confirmation dialog to appear.
    await screen.findByText('Confirm column rename');
    expect(onPreviewRename).toHaveBeenCalledWith('primary_email');

    // Proposed SQL is shown.
    expect(
      screen.getByText('ALTER TABLE contacts RENAME COLUMN email_address TO primary_email'),
    ).toBeInTheDocument();

    // Affected views and policies are shown.
    expect(screen.getByText('v_contact_emails')).toBeInTheDocument();
    expect(screen.getByText('contacts_tenant_select')).toBeInTheDocument();
  });

  it('calls onSave with physical:true when the user confirms the rename', async () => {
    const dryRunResult = {
      would_execute: 'ALTER TABLE contacts RENAME COLUMN email_address TO primary_email',
      affected_views: [],
      affected_policies: [],
    };
    const onPreviewRename = vi.fn().mockResolvedValue(dryRunResult);
    const onSave = vi.fn();
    render(
      <FieldEditDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        field={baseField}
        existingFieldNames={['email_address']}
        onSave={onSave}
        onDelete={vi.fn()}
        onPreviewRename={onPreviewRename}
      />,
    );

    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'primary_email' },
    });

    const summary = screen.getByText(/Also rename the underlying Postgres column/i);
    fireEvent.click(summary);
    fireEvent.click(
      screen.getByLabelText(/Execute.*ALTER TABLE.*RENAME COLUMN.*on save/i),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    // Wait for confirmation modal.
    await screen.findByText('Confirm column rename');

    // Confirm the rename.
    fireEvent.click(screen.getByRole('button', { name: 'Rename Column' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        field_name: 'primary_email',
        physical: true,
      }),
    );
  });

  it('does NOT call onSave when the user cancels the confirmation modal', async () => {
    const dryRunResult = {
      would_execute: 'ALTER TABLE contacts RENAME COLUMN email_address TO primary_email',
      affected_views: [],
      affected_policies: [],
    };
    const onPreviewRename = vi.fn().mockResolvedValue(dryRunResult);
    const onSave = vi.fn();
    render(
      <FieldEditDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        field={baseField}
        existingFieldNames={['email_address']}
        onSave={onSave}
        onDelete={vi.fn()}
        onPreviewRename={onPreviewRename}
      />,
    );

    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'primary_email' },
    });

    const summary = screen.getByText(/Also rename the underlying Postgres column/i);
    fireEvent.click(summary);
    fireEvent.click(
      screen.getByLabelText(/Execute.*ALTER TABLE.*RENAME COLUMN.*on save/i),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    // Wait for confirmation modal.
    await screen.findByText('Confirm column rename');

    // Cancel the rename.
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    // The confirmation modal's Cancel button is the last one.
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows an error in the disclosure when onPreviewRename rejects', async () => {
    const onPreviewRename = vi
      .fn()
      .mockRejectedValue(new Error('Permission denied'));
    render(
      <FieldEditDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        field={baseField}
        existingFieldNames={['email_address']}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onPreviewRename={onPreviewRename}
      />,
    );

    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'primary_email' },
    });

    const summary = screen.getByText(/Also rename the underlying Postgres column/i);
    fireEvent.click(summary);
    fireEvent.click(
      screen.getByLabelText(/Execute.*ALTER TABLE.*RENAME COLUMN.*on save/i),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    // Wait for the error to appear in the disclosure.
    await screen.findByText('Permission denied');
    // Confirmation modal should NOT appear.
    expect(screen.queryByText('Confirm column rename')).toBeNull();
  });
});
