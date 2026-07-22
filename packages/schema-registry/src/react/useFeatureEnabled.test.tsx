import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useFeatureEnabled } from './useFeatureEnabled.js';

const TENANT = '11111111-1111-1111-1111-111111111111';

function makeSupabase(response: { data: unknown; error: unknown }) {
  const rpc = vi.fn(() => Promise.resolve(response));
  return { supabase: { rpc } as unknown as SupabaseClient, rpc };
}

function wrapper() {
  // retry:false so error queries settle immediately (fail-open path).
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useFeatureEnabled (fail-open doctrine)', () => {
  it('returns true and skips the RPC when tenantId is missing', () => {
    const { supabase, rpc } = makeSupabase({ data: false, error: null });
    const { result } = renderHook(() => useFeatureEnabled(supabase, null, 'page', 'reports'), {
      wrapper: wrapper(),
    });
    expect(result.current).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns true and skips the RPC when featureKey is missing', () => {
    const { supabase, rpc } = makeSupabase({ data: false, error: null });
    const { result } = renderHook(() => useFeatureEnabled(supabase, TENANT, 'feature', undefined), {
      wrapper: wrapper(),
    });
    expect(result.current).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails open (true) while the query is loading', () => {
    const { supabase } = makeSupabase({ data: false, error: null });
    const { result } = renderHook(
      () => useFeatureEnabled(supabase, TENANT, 'page', 'reports'),
      { wrapper: wrapper() },
    );
    // First synchronous render: data is still undefined → fail-open true.
    expect(result.current).toBe(true);
  });

  it('calls the RPC with the documented params and returns true when enabled', async () => {
    const { supabase, rpc } = makeSupabase({ data: true, error: null });
    const { result } = renderHook(
      () => useFeatureEnabled(supabase, TENANT, 'entity', 'contacts'),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith('is_feature_enabled', {
      p_tenant_id: TENANT,
      p_feature_type: 'entity',
      p_feature_key: 'contacts',
    });
    expect(result.current).toBe(true);
  });

  it('disables (false) ONLY when the RPC explicitly returns false', async () => {
    const { supabase } = makeSupabase({ data: false, error: null });
    const { result } = renderHook(
      () => useFeatureEnabled(supabase, TENANT, 'page', 'reports'),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('fails open (true) when the RPC errors', async () => {
    const { supabase, rpc } = makeSupabase({ data: null, error: { message: 'rpc down' } });
    const { result } = renderHook(
      () => useFeatureEnabled(supabase, TENANT, 'feature', 'ai'),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    // Error path keeps data undefined → stays enabled.
    expect(result.current).toBe(true);
  });

  it('fails open (true) when the RPC returns null', async () => {
    const { supabase, rpc } = makeSupabase({ data: null, error: null });
    const { result } = renderHook(
      () => useFeatureEnabled(supabase, TENANT, 'feature', 'ai'),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });
});
