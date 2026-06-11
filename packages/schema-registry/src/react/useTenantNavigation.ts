'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NavConfig, NavItem, NavSection } from '@bsuite/nav-core';
import type { AppScope } from './types.js';

/**
 * Row shape of public.tenant_navigation (creator migration
 * 20260408000001_phase5_create_tenant_navigation.sql + the BSU Developer
 * Portal nav editor): ONE ROW PER SECTION — `section_label` is the
 * NavSection label and `items` is a flat NavItem[] JSONB array.
 *
 * bsuite#1506: earlier package versions selected `nav_json, version` —
 * columns that never existed in any migration — so every consumer logged a
 * PostgREST 400 on each page load and the overlay silently fell back to
 * static nav.
 */
interface TenantNavigationRow {
  section_label: string | null;
  items: unknown;
  sort_order: number | null;
}

function coerceItems(raw: unknown): NavItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (it): it is NavItem =>
      typeof it === 'object' &&
      it !== null &&
      typeof (it as NavItem).label === 'string' &&
      typeof (it as NavItem).href === 'string'
  );
}

/** Exported for tests. Builds the additive overlay NavConfig from DB rows. */
export function buildNavOverlay(rows: TenantNavigationRow[]): NavConfig | null {
  const sections: NavSection[] = rows
    .filter((r) => typeof r.section_label === 'string' && r.section_label.trim() !== '')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((r) => ({
      label: (r.section_label as string).trim(),
      // DB rows carry no icon. For label-matching sections mergeNavConfigs
      // keeps the base section object (icon included) and only appends
      // groups; only NET-NEW sections surface this undefined — consumers'
      // section renderers must tolerate a missing icon for overlay-only
      // sections.
      icon: undefined as unknown as NavSection['icon'],
      groups: [coerceItems(r.items)],
    }))
    .filter((s) => (s.groups?.[0]?.length ?? 0) > 0);

  if (sections.length === 0) return null;

  return {
    // mergeNavConfigs spreads the BASE config — this placeholder app
    // identity is never rendered; it exists to satisfy the NavConfig type.
    app: { name: '', shortName: '', homeHref: '/' },
    sections,
  };
}

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
        .select('section_label, items, sort_order')
        .eq('app_scope', appScope)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return buildNavOverlay((data ?? []) as TenantNavigationRow[]);
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
