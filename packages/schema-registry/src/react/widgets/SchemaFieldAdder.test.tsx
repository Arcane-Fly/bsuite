import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SchemaFieldAdderWidget } from './SchemaFieldAdder';
import type { SupabaseClient } from '@supabase/supabase-js';

const baseProps = {
  type: 'SchemaFieldAdder' as const,
  widget_id: 'table-1',
  entity_id: '22222222-2222-2222-2222-222222222222',
  allowed_types: ['text', 'number', 'date', 'link', 'boolean', 'enum'] as Array<
    'text' | 'number' | 'date' | 'link' | 'boolean' | 'enum'
  >,
  button_label: '+ Add field',
};

describe('SchemaFieldAdderWidget', () => {
  it('renders disabled state when feature flag is off (default)', () => {
    const supabase = { rpc: vi.fn() } as unknown as SupabaseClient;
    render(<SchemaFieldAdderWidget supabase={supabase} widgetProps={baseProps} />);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.textContent).toContain('disabled');
  });

  it('opens form and dispatches RPC with correct payload', async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc: rpcSpy } as unknown as SupabaseClient;
    const onFieldAdded = vi.fn();

    render(
      <SchemaFieldAdderWidget
        supabase={supabase}
        widgetProps={baseProps}
        onFieldAdded={onFieldAdded}
        enabled={true}
      />
    );

    // Click the "+ Add field" button to open the form
    fireEvent.click(screen.getByText('+ Add field'));

    // Fill in the field name
    const nameInput = screen.getByLabelText('Field name');
    fireEvent.change(nameInput, { target: { value: 'nickname' } });

    // Change type
    const typeSelect = screen.getByLabelText('Field type');
    fireEvent.change(typeSelect, { target: { value: 'text' } });

    // Submit
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(rpcSpy).toHaveBeenCalledWith('add_tenant_field_definition', {
        entity_id: baseProps.entity_id,
        field_name: 'nickname',
        field_type: 'text',
        default_value: null,
      });
    });

    await waitFor(() => {
      expect(onFieldAdded).toHaveBeenCalledWith({ name: 'nickname', type: 'text' });
    });
  });

  it('shows error when RPC rejects', async () => {
    const rpcSpy = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });
    const supabase = { rpc: rpcSpy } as unknown as SupabaseClient;

    render(
      <SchemaFieldAdderWidget
        supabase={supabase}
        widgetProps={baseProps}
        enabled={true}
      />
    );

    fireEvent.click(screen.getByText('+ Add field'));
    fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('permission denied')).toBeTruthy();
    });
  });
});
