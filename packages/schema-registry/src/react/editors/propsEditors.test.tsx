import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTablePropsEditor } from './DataTablePropsEditor.js';
import { StatGridPropsEditor } from './StatGridPropsEditor.js';
import { EntitySelectorPropsEditor } from './EntitySelectorPropsEditor.js';
import { CardPropsEditor } from './CardPropsEditor.js';
import { FormRendererPropsEditor } from './FormRendererPropsEditor.js';
import {
  DataTablePropsSchema,
  StatGridPropsSchema,
  EntitySelectorPropsSchema,
  CardPropsSchema,
  FormRendererPropsSchema,
} from '../../schemas/widgetProps.js';

describe('PropsEditor components', () => {
  it('DataTablePropsEditor renders and emits Zod-valid onChange', () => {
    const onChange = vi.fn();
    const initial = { type: 'DataTable' as const, entity: 'contacts', columns: ['id', 'name'], page_size: 25 };
    const { container } = render(<DataTablePropsEditor props={initial} onChange={onChange} />);
    const entityInput = container.querySelector('#dt-entity') as HTMLInputElement;
    fireEvent.change(entityInput, { target: { value: 'companies' } });
    expect(onChange).toHaveBeenCalled();
    const emitted = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(emitted.entity).toBe('companies');
    // Zod validates the emitted value
    expect(DataTablePropsSchema.safeParse(emitted).success).toBe(true);
  });

  it('StatGridPropsEditor emits Zod-valid onChange', () => {
    const onChange = vi.fn();
    const initial = { type: 'StatGrid' as const, entity: 'deals', metric: 'count' as const };
    const { container } = render(<StatGridPropsEditor props={initial} onChange={onChange} />);
    const entityInput = container.querySelector('#sg-entity') as HTMLInputElement;
    fireEvent.change(entityInput, { target: { value: 'leads' } });
    const emitted = onChange.mock.calls[0][0];
    expect(emitted.entity).toBe('leads');
    expect(StatGridPropsSchema.safeParse(emitted).success).toBe(true);
  });

  it('EntitySelectorPropsEditor surfaces Zod error for system-column target_field', () => {
    const onChange = vi.fn();
    const initial = {
      type: 'EntitySelector' as const,
      entity: 'contacts',
      display_field: 'name',
      target_field: 'contact_id',
    };
    const { container } = render(<EntitySelectorPropsEditor props={initial} onChange={onChange} />);
    const targetInput = container.querySelector('#es-target-field') as HTMLInputElement;
    fireEvent.change(targetInput, { target: { value: 'tenant_id' } });
    // Editor emits regardless; consumer layer surfaces validation errors inline.
    const emitted = onChange.mock.calls[0][0];
    // Re-parse to confirm Zod flags it
    expect(EntitySelectorPropsSchema.safeParse(emitted).success).toBe(false);
  });

  it('CardPropsEditor toggles collapsible', () => {
    const onChange = vi.fn();
    const initial = { type: 'Card' as const, title: 'Dashboard', collapsible: false };
    const { container } = render(<CardPropsEditor props={initial} onChange={onChange} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    const emitted = onChange.mock.calls[0][0];
    expect(emitted.collapsible).toBe(true);
    expect(CardPropsSchema.safeParse(emitted).success).toBe(true);
  });

  it('FormRendererPropsEditor parses comma-separated fields', () => {
    const onChange = vi.fn();
    const initial = {
      type: 'FormRenderer' as const,
      entity: 'tickets',
      fields: ['title'],
      submit_label: 'Save',
    };
    const { container } = render(<FormRendererPropsEditor props={initial} onChange={onChange} />);
    const fieldsInput = container.querySelector('#fr-fields') as HTMLInputElement;
    fireEvent.change(fieldsInput, { target: { value: 'title, body, priority' } });
    const emitted = onChange.mock.calls[0][0];
    expect(emitted.fields).toEqual(['title', 'body', 'priority']);
    expect(FormRendererPropsSchema.safeParse(emitted).success).toBe(true);
  });

  it('never throws when rendering an invalid props shape', () => {
    const onChange = vi.fn();
    expect(() => {
      render(
        <DataTablePropsEditor
          // @ts-expect-error -- intentionally invalid to test resilience
          props={{ entity: '' }}
          onChange={onChange}
        />
      );
    }).not.toThrow();
  });
});
