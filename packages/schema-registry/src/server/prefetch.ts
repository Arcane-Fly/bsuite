import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from '../react/types';

export async function prefetchTenantPageLayout(
  supabase: SupabaseClient,
  routePath: string,
  appScope: AppScope
) {
  const { data, error } = await supabase
    .from('tenant_page_layouts')
    .select('*')
    .eq('route_path', routePath)
    .eq('app_scope', appScope)
    .eq('is_published', true)
    .order('layout_version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}
