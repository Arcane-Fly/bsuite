/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FieldCreateDialog } from '../components/FieldCreateDialog.js';

// jsdom only partially implements <dialog>; polyfill showModal/close so the
// component's imperative open/close useEffect doesn't throw. Safe no-op
// outside jsdom.
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

function setup(propsOverride: Partial<Parameters<typeof FieldCreateDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const utils = render(
    <FieldCreateDialog
      open={true}
      onOpenChange={onOpenChange}
      entityLabel="Contacts"
      entityName="contacts"
      existingFieldNames={[]}
      nextSortOrder={5}
      onConfirm={onConfirm}
      {...propsOverride}
    />,
  );
  return { ...utils, onConfirm, onOpenChange };
}

describe('FieldCreateDialog', () => {
  it('renders the dialog header with the entity label and name', () => {
    setup();
    expect(
      screen.getByRole('heading', { name: /Add Field to Contacts/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('contacts')).toBeInTheDocument();
  });

  it('normalizes field name input to snake_case on change', () => {
    setup();
    const input = screen.getByLabelText('Field Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'MyField!' } });
    expect(input.value).toBe('myfield_');
  });

  it('disables Create Field when name is empty', () => {
    setup();
    const submit = screen.getByRole('button', { name: 'Create Field' });
    expect(submit).toBeDisabled();
  });

  it('disables Create Field when name is less than 2 characters', () => {
    setup();
    const input = screen.getByLabelText('Field Name');
    fireEvent.change(input, { target: { value: 'a' } });
    const submit = screen.getByRole('button', { name: 'Create Field' });
    expect(submit).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /at least 2 characters/i,
    );
  });

  it('disables Create Field when name fails snake_case (leading digit)', () => {
    setup();
    const input = screen.getByLabelText('Field Name');
    // Digits are valid chars but must not lead.
    fireEvent.change(input, { target: { value: '9foo' } });
    const submit = screen.getByRole('button', { name: 'Create Field' });
    expect(submit).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/snake_case/i);
  });

  it('disables Create Field when name already exists on the entity', () => {
    setup({ existingFieldNames: ['email'] });
    const input = screen.getByLabelText('Field Name');
    fireEvent.change(input, { target: { value: 'email' } });
    const submit = screen.getByRole('button', { name: 'Create Field' });
    expect(submit).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
  });

  it('auto-fills the Display Label from the field name until the user edits it', () => {
    setup();
    const nameInput = screen.getByLabelText('Field Name') as HTMLInputElement;
    const labelInput = screen.getByLabelText(
      'Display Label',
    ) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'email_address' } });
    expect(labelInput.value).toBe('email_address');

    // User manually edits the label — subsequent name changes must not
    // overwrite the user's work.
    fireEvent.change(labelInput, { target: { value: 'Email Address' } });
    fireEvent.change(nameInput, { target: { value: 'contact_email' } });
    expect(labelInput.value).toBe('Email Address');
  });

  it('fires onConfirm with the correct payload when form is submitted', async () => {
    const { onConfirm } = setup({ nextSortOrder: 7 });
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'phone_number' },
    });
    fireEvent.change(screen.getByLabelText('Field Type'), {
      target: { value: 'phone' },
    });
    fireEvent.change(screen.getByLabelText('Placeholder (optional)'), {
      target: { value: '+61 ...' },
    });
    fireEvent.click(screen.getByLabelText('Required field'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Field' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith({
      field_name: 'phone_number',
      field_type: 'phone',
      label: 'phone_number',
      placeholder: '+61 ...',
      is_required: true,
      sort_order: 7,
    });
  });

  it('does not call onConfirm when form is submitted with invalid name', () => {
    const { onConfirm } = setup();
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'a' }, // too short
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Field' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const { onOpenChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets all form state when re-opened after close', () => {
    const { rerender } = setup();
    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'dirty_name' },
    });
    fireEvent.click(screen.getByLabelText('Required field'));

    // Close then reopen.
    rerender(
      <FieldCreateDialog
        open={false}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        existingFieldNames={[]}
        nextSortOrder={5}
        onConfirm={vi.fn()}
      />,
    );
    rerender(
      <FieldCreateDialog
        open={true}
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        existingFieldNames={[]}
        nextSortOrder={5}
        onConfirm={vi.fn()}
      />,
    );

    expect((screen.getByLabelText('Field Name') as HTMLInputElement).value).toBe(
      '',
    );
    expect(
      (screen.getByLabelText('Required field') as HTMLInputElement).checked,
    ).toBe(false);
  });
});
