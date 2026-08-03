'use client';
import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
interface Props { supabase: SupabaseClient; entity: string; fields: string[]; submitLabel?: string; appScope: string; }
export function FormRendererWidget({ supabase, entity, fields, submitLabel = 'Submit', appScope }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    const { data: entityDef } = await supabase.from('tenant_entities').select('id').eq('name', entity).in('app_scope',[appScope,'all']).maybeSingle();
    if (!entityDef) { setStatus('error'); return; }
    const { error } = await supabase.from(entity).insert(values);
    setStatus(error ? 'error' : 'success');
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map(f => (
        <div key={f}>
          <label className="block text-sm font-medium" htmlFor={`field-${f}`}>{f}</label>
          <input id={`field-${f}`} className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm" value={values[f] ?? ''} onChange={e => setValues(v => ({ ...v, [f]: e.target.value }))} />
        </div>
      ))}
      <button type="submit" disabled={status === 'submitting'} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
        {status === 'submitting' ? 'Saving…' : submitLabel}
      </button>
      {status === 'success' && <p className="text-sm text-success-text">Saved.</p>}
      {status === 'error' && <p className="text-sm text-destructive">Error saving.</p>}
    </form>
  );
}
