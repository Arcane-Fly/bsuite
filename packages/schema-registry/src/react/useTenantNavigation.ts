'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NavConfig } from '@bsuite/nav-core';
import type { AppScope } from './types';

export function useTenantNavigation(
  supabase: SupabaseClient,
  appScope: AppScope
): { navConfig: NavConfig | null; isLoading: boolean; error: Error | null } {
  const queryClient = useQueryClient();
  const queryKey = ['tenant-navigation', appScope];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_navigation')
        .select('nav_json, version')
        .eq('app_scope', appScope)
        .maybeSingle();
      if (error) throw error;
      return (data?.nav_json as NavConfig) ?? null;
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`tenant-navigation:${appScope}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tenant_navigation',
        filter: `app_scope=eq.${appScope}`,
      }, () => {
        void queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, appScope, queryClient]);

  return { navConfig: data ?? null, isLoading, error: error as Error | null };
}
