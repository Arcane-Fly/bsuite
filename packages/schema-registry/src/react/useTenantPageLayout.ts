'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from './types.js';

export function useTenantPageLayout(
  supabase: SupabaseClient,
  routePath: string,
  appScope: AppScope
) {
  const queryClient = useQueryClient();
  const queryKey = ['tenant-page-layout', appScope, routePath];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_page_layouts')
        .select('*')
        .eq('route_path', routePath)
        .eq('app_scope', appScope)
        .eq('is_published', true)
        .order('layout_version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`tenant-page-layout:${appScope}:${routePath}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tenant_page_layouts',
        filter: `route_path=eq.${routePath}`,
      }, () => {
        void queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, routePath, appScope, queryClient]);

  return query;
}
