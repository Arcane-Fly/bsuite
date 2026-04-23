'use client';
import React, { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props { supabase: SupabaseClient; entity: string; displayField: string; appScope: string; onChange?: (id: string) => void; }
export function EntitySelectorWidget({ supabase, entity, displayField, appScope, onChange }: Props) {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    supabase.from('tenant_entities').select('id').eq('name', entity).in('app_scope',[appScope,'all']).maybeSingle().then(({ data }) => {
      if (!data) return;
      supabase.from(entity).select(`id,${displayField}`).limit(100).then(({ data: rows }) => {
        setOptions(((rows ?? []) as unknown as Record<string,unknown>[]).map((r) => ({ id: String(r['id']), label: String(r[displayField] ?? '') })));
      });
    });
  }, [supabase, entity, displayField, appScope]);
  return (
    <select className="rounded-md border px-2 py-1.5 text-sm" onChange={e => onChange?.(e.target.value)}>
      <option value="">Select {entity}…</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
