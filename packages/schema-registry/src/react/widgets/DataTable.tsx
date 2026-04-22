'use client';
import React, { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { DataTablePropsSchema } from '../../schemas/widgetProps';

type DataTableProps = z.infer<typeof DataTablePropsSchema>;

interface Props {
  supabase: SupabaseClient;
  appScope: string;
  widgetProps: DataTableProps;
}

export function DataTableWidget({ supabase, appScope, widgetProps }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Server-side entity whitelist check
      const { data: entityDef } = await supabase
        .from('tenant_entities')
        .select('id')
        .eq('name', widgetProps.entity)
        .in('app_scope', [appScope, 'all'])
        .maybeSingle();

      if (!entityDef) {
        if (!cancelled) setError(`Entity '${widgetProps.entity}' is not in the allowed whitelist`);
        setLoading(false);
        return;
      }

      let query = supabase.from(widgetProps.entity).select(widgetProps.columns.join(',') || '*');
      if (widgetProps.sort) {
        query = query.order(widgetProps.sort.column, { ascending: widgetProps.sort.direction === 'asc' });
      }
      query = query.limit(widgetProps.page_size);

      const { data, error: fetchErr } = await query;
      if (!cancelled) {
        if (fetchErr) setError(fetchErr.message);
        else setRows((data as unknown as Record<string, unknown>[] | null) ?? []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [supabase, widgetProps.entity, appScope]);

  if (loading) return <div className="h-20 animate-pulse rounded-md bg-muted" />;
  if (error) return <div className="text-sm text-destructive">Error: {error}</div>;

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>{widgetProps.columns.map(c => <th key={c} className="px-3 py-2 text-left">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              {widgetProps.columns.map(c => <td key={c} className="px-3 py-2">{String(row[c] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
