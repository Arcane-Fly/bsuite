'use client';
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Kind of feature gate checked by the `is_feature_enabled` RPC. */
export type FeatureType = 'page' | 'entity' | 'feature';

/**
 * Feature-gate hook. Calls the `is_feature_enabled(p_tenant_id, p_feature_type,
 * p_feature_key)` Postgres RPC and returns whether the feature is enabled.
 *
 * Doctrine is FAIL-OPEN: the gate returns `true` whenever it cannot obtain an
 * authoritative answer — a missing `tenantId`/`featureKey`, an RPC error, or
 * while the query is loading/disabled. ONLY an explicit `false` from the RPC
 * disables the feature. This prevents a transient DB hiccup, a slow first
 * paint, or an un-provisioned tenant from silently hiding working UI.
 *
 * @param supabase   Injected, app-configured supabase client (client-agnostic).
 * @param tenantId   Active tenant id; `null`/`undefined` ⇒ fail-open `true`.
 * @param featureType `page` | `entity` | `feature`.
 * @param featureKey Feature identifier; `undefined` ⇒ fail-open `true`.
 * @returns `false` only when the RPC explicitly returns `false`; otherwise `true`.
 */
export function useFeatureEnabled(
  supabase: SupabaseClient,
  tenantId: string | null | undefined,
  featureType: FeatureType,
  featureKey: string | undefined,
): boolean {
  const { data } = useQuery({
    queryKey: ['feature-enabled', tenantId, featureType, featureKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_feature_enabled', {
        p_tenant_id: tenantId,
        p_feature_type: featureType,
        p_feature_key: featureKey,
      });
      // Throw so react-query keeps `data` undefined → fail-open below.
      if (error) throw error;
      return data as boolean;
    },
    staleTime: 30_000,
    enabled: !!tenantId && !!featureKey,
  });

  // Fail-open: only a literal `false` disables. `undefined` (loading, disabled,
  // or error), `null`, and `true` all resolve to enabled.
  return data !== false;
}
