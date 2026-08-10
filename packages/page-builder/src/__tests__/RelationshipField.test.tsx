import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelationshipField } from '../RelationshipField.js';
import type { RelationshipFieldOption } from '../types.js';

const OPTIONS: RelationshipFieldOption[] = [
  { id: 'client-1', label: 'ADCO Constructions Pty Ltd', secondaryLabel: 'Construction' },
  { id: 'client-2', label: 'Builden Construction Pty Ltd', secondaryLabel: 'Construction' },
];

function renderField(overrides: Partial<React.ComponentProps<typeof RelationshipField>> = {}) {
  const onChange = vi.fn();
  const onInvalidEntry = vi.fn();
  const search = vi.fn(async (_query: string, _tenantId: string | null | undefined) => OPTIONS);
  const utils = render(
    <RelationshipField
      value={null}
      label="Client"
      search={search}
      onChange={onChange}
      onInvalidEntry={onInvalidEntry}
      debounceMs={0}
      {...overrides}
    />,
  );
  return { ...utils, onChange, onInvalidEntry, search };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RelationshipField — W4-1 validation contract (ClientSelector-equivalent)', () => {
  it('writes the FK on selection: picking a resolved option calls onChange with that option', async () => {
    const { onChange } = renderField();
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ADCO' } });

    const option = await screen.findByText('ADCO Constructions Pty Ltd');
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(OPTIONS[0]);
    expect((input as HTMLInputElement).value).toBe('ADCO Constructions Pty Ltd');
  });

  it('refuses a typed name that does not resolve to a real row — onChange is never called', async () => {
    const { onChange, onInvalidEntry } = renderField();
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'A Company That Does Not Exist' } });

    // Let the (0ms) debounced search resolve so we know the refusal isn't
    // just "search hasn't returned yet" — the returned options don't match
    // what was typed, so nothing became selectable.
    await waitFor(() => expect(screen.queryByText('ADCO Constructions Pty Ltd')).toBeTruthy());

    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(onInvalidEntry).toHaveBeenCalledWith('A Company That Does Not Exist');
    // Reverted — no value was ever committed, so it reverts to empty, never
    // to the free-text the user typed.
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('refuses an edit that types away from a previously committed value, reverting to it', async () => {
    const { onChange, onInvalidEntry } = renderField({
      value: 'client-1',
      initialOption: OPTIONS[0],
    });
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('ADCO Constructions Pty Ltd');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ADCO Constructions Pty Ltd but edited' } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(onInvalidEntry).toHaveBeenCalledWith('ADCO Constructions Pty Ltd but edited');
    expect(input.value).toBe('ADCO Constructions Pty Ltd');
  });

  it('does not refuse when the query still exactly matches the committed option on blur', async () => {
    const { onChange, onInvalidEntry } = renderField({
      value: 'client-1',
      initialOption: OPTIONS[0],
    });
    const input = screen.getByRole('combobox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(onInvalidEntry).not.toHaveBeenCalled();
    expect(input.value).toBe('ADCO Constructions Pty Ltd');
  });

  it('explicit clear writes null — the one path that may commit an empty value', async () => {
    const { onChange } = renderField({ value: 'client-1', initialOption: OPTIONS[0] });

    const clearButton = screen.getByRole('button', { name: 'Clear selection' });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});

describe('RelationshipField — tenant scoping (W4-1)', () => {
  it('passes the tenantId prop through to every search call', async () => {
    const { search } = renderField({ tenantId: 'tenant-abc' });
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ADCO' } });

    await waitFor(() => expect(search).toHaveBeenCalled());
    for (const call of search.mock.calls) {
      expect(call[1]).toBe('tenant-abc');
    }
  });

  it('passes tenantId through to resolveOption when hydrating an externally-set value', async () => {
    const resolveOption = vi.fn(async (id: string, _tenantId: string | null | undefined) => ({
      id,
      label: 'Resolved Co',
    }));
    renderField({
      value: 'client-9',
      tenantId: 'tenant-xyz',
      resolveOption,
    });

    await waitFor(() => expect(resolveOption).toHaveBeenCalledWith('client-9', 'tenant-xyz'));
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('Resolved Co'));
  });

  it('does not scope search to any tenant when tenantId is omitted — passes undefined, not a guessed value', async () => {
    const { search } = renderField();
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ADCO' } });

    await waitFor(() => expect(search).toHaveBeenCalled());
    expect(search.mock.calls[0]?.[1]).toBeUndefined();
  });
});
