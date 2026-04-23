'use client';
import React, { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Props { supabase: SupabaseClient; entity: string; metric: string; appScope: string; }
export function StatGridWidget({ supabase, entity, metric, appScope }: Props) {
  const [value, setValue] = useState<string>('—');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('tenant_entities').select('id').eq('name', entity).in('app_scope', [appScope,'all']).maybeSingle().then(({ data }) => {
      if (!data) { setValue('N/A'); setLoading(false); return; }
      const col = metric.startsWith('count') ? 'count' : metric.split(':')[1];
      const selectExpr = metric === 'count' ? `${col}:count(*)` : `${col}:${metric.split(':')[0]}(${col})`;
      supabase.from(entity).select(selectExpr).then(({ data: d }) => {
        const rows = (d ?? []) as unknown as Record<string, unknown>[];
        setValue(rows[0]?.[col] != null ? String(rows[0][col]) : '—');
        setLoading(false);
      });
    });
  }, [supabase, entity, metric, appScope]);
  return (
    <div className="rounded-md border p-4">
      {loading ? <div className="h-8 animate-pulse rounded bg-muted" /> : <p className="text-2xl font-semibold">{value}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{entity} / {metric}</p>
    </div>
  );
}
