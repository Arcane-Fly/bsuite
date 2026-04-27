'use client';
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from './types.js';

export function useTenantSchema(supabase: SupabaseClient, scope: AppScope) {
  return useQuery({
    queryKey: ['tenant-schema', scope],
    queryFn: async () => {
      const { data: entities, error: eErr } = await supabase
        .from('tenant_entities')
        .select('*')
        .in('app_scope', [scope, 'all'])
        .order('name');
      if (eErr) throw eErr;
      const { data: relations, error: rErr } = await supabase
        .from('tenant_entity_relations')
        .select('*')
        .in('app_scope', [scope, 'all']);
      if (rErr) throw rErr;
      return { entities: entities ?? [], relations: relations ?? [] };
    },
    staleTime: 5 * 60 * 1000,
  });
}
