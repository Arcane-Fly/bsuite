import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldCreateDialog } from './FieldCreateDialog.js';

describe('FieldCreateDialog', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('disables submit while async creation is pending and keeps dialog open on failure', async () => {
    let rejectCreate: ((err: Error) => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectCreate = reject;
        }),
    );

    render(
      <FieldCreateDialog
        open
        onOpenChange={vi.fn()}
        entityLabel="Contacts"
        entityName="contacts"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText('Field Name'), {
      target: { value: 'preferred_name' },
    });

    const submit = screen.getByRole('button', { name: /create field/i });
    fireEvent.click(submit);

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    rejectCreate?.(new Error('network failed'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create field/i })).not.toBeDisabled();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Add Field to Contacts')).toBeTruthy();
  });
});
