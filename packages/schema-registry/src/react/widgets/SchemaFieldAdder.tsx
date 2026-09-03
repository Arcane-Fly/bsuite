'use client';
import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { SchemaFieldAdderPropsSchema } from '../../schemas/widgetProps.js';

type SchemaFieldAdderProps = z.infer<typeof SchemaFieldAdderPropsSchema>;

export interface SchemaFieldAdderWidgetProps {
  supabase: SupabaseClient;
  widgetProps: SchemaFieldAdderProps;
  /**
   * Fires after a successful field insert. Consumer can invalidate the TanStack
   * query key for `useFieldsForEntity(entity_id)` to trigger a re-render.
   */
  onFieldAdded?: (field: { name: string; type: string }) => void;
  /**
   * Feature flag. When false, the widget renders a disabled state + TODO note.
   * Defaults to `false` because the `add_tenant_field_definition` RPC is
   * scheduled for W1-C (separate DB-migration subagent). Enable after that
   * migration lands.
   */
  enabled?: boolean;
}

type FieldType = 'text' | 'number' | 'date' | 'link' | 'boolean' | 'enum';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  link: 'Link',
  boolean: 'Boolean',
  enum: 'Enum',
};

/**
 * SchemaFieldAdder — inline "+ Add field" control rendered next to a DataTable
 * or FormRenderer. Opens a small inline form (field name + type dropdown) and
 * dispatches to a Supabase RPC `add_tenant_field_definition`.
 *
 * @see W1-C migration — this widget is feature-flagged until the RPC ships.
 */
// TODO(W1-C): The `add_tenant_field_definition(entity_id, field_name,
// field_type, default_value)` RPC is scheduled for W1-C DB-migration subagent.
// Until that lands, this widget must be mounted with `enabled={false}` (the
// default) to avoid runtime errors. After the migration, flip the consumer's
// feature flag to true.
export function SchemaFieldAdderWidget({
  supabase,
  widgetProps,
  onFieldAdded,
  enabled = false,
}: SchemaFieldAdderWidgetProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>(widgetProps.allowed_types[0] ?? 'text');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!enabled) {
    return (
      <button
        type="button"
        disabled
        className="rounded-md border border-dashed border-border-interactive px-2 py-1 text-xs text-muted-foreground"
        title="Awaiting W1-C migration (add_tenant_field_definition RPC)"
      >
        {widgetProps.button_label} (disabled)
      </button>
    );
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (name.length === 0) {
      setErrorMsg('Field name required');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg(null);
    // Structured payload — matches the RPC signature in the spec:
    // add_tenant_field_definition(entity_id uuid, field_name text,
    //                             field_type text, default_value text)
    const { error } = await supabase.rpc('add_tenant_field_definition', {
      entity_id: widgetProps.entity_id,
      field_name: name,
      field_type: fieldType,
      default_value: null,
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('idle');
    setOpen(false);
    setName('');
    onFieldAdded?.({ name, type: fieldType });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-border-interactive px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
        data-widget="SchemaFieldAdder"
      >
        {widgetProps.button_label}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Field name"
        className="rounded-md border px-2 py-1 text-sm"
        aria-label="Field name"
      />
      <select
        value={fieldType}
        onChange={(e) => setFieldType(e.target.value as FieldType)}
        className="rounded-md border px-2 py-1 text-sm"
        aria-label="Field type"
      >
        {widgetProps.allowed_types.map((t) => (
          <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
      >
        {status === 'submitting' ? 'Saving…' : 'Add'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setErrorMsg(null); }}
        className="text-xs text-muted-foreground"
      >
        Cancel
      </button>
      {errorMsg != null && <p className="w-full text-xs text-destructive">{errorMsg}</p>}
    </form>
  );
}
