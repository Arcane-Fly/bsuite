import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSchemaController } from '../hooks/useSchemaController.js';
import type { LooseSupabaseClient } from '../service.js';
import type {
  TenantEntity,
  TenantEntityRelation,
} from '../types.js';

function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'is',
    'in',
    'or',
    'order',
  ] as const;
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (onFulfilled: (v: typeof result) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return chain;
}

function buildFakeClient(options: {
  entities?: TenantEntity[];
  relations?: TenantEntityRelation[];
  insertRelationError?: Error | null;
}): LooseSupabaseClient {
  const insertResult = options.insertRelationError
    ? { data: null, error: options.insertRelationError }
    : {
        data: {
          id: 'new-relation',
          tenant_id: null,
          source_entity_id: 'orders',
          target_entity_id: 'customers',
          source_field_id: null,
          target_field_id: null,
          relation_type: 'one_to_many' as const,
          source_label: null,
          target_label: null,
          on_delete: 'SET NULL' as const,
          on_update: 'CASCADE' as const,
          is_system: false,
          app_scope: 'all' as const,
          metadata: {},
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        error: null,
      };

  const from = (table: string) => {
    if (table === 'tenant_entities') {
      return buildChain({ data: options.entities ?? [], error: null }) as never;
    }
    if (table === 'tenant_entity_relations') {
      const chain = buildChain({
        data: options.relations ?? [],
        error: null,
      });
      chain.single = vi.fn(() => Promise.resolve(insertResult));
      return chain as never;
    }
    return buildChain({ data: [], error: null }) as never;
  };

  return {
    from,
    channel: () => ({
      on: () => ({
        on: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        }),
      }),
    }) as never,
    removeChannel: () => {},
  } as unknown as LooseSupabaseClient;
}

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useSchemaController', () => {
  it('loads entities + relations', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const client = buildFakeClient({
      entities: [
        {
          id: 'e1',
          tenant_id: 't1',
          name: 'orders',
          label: 'Orders',
          description: null,
          icon: null,
          app_scope: 'all',
          is_system: false,
          metadata: null,
          created_at: null,
          updated_at: null,
        },
      ],
      relations: [],
    });

    const { result } = renderHook(
      () =>
        useSchemaController({
          supabase: client,
          tenantId: 't1',
          realtime: false,
        }),
      { wrapper: wrapper(qc) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entities).toHaveLength(1);
    expect(result.current.entities[0].name).toBe('orders');
  });

  it('rolls back optimistic create on failure', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const err = new Error('boom');
    const client = buildFakeClient({
      entities: [],
      relations: [],
      insertRelationError: err,
    });
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useSchemaController({
          supabase: client,
          tenantId: 't1',
          realtime: false,
          onError,
        }),
      { wrapper: wrapper(qc) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.createRelation({
          id: '55555555-5555-4555-8555-555555555555',
          tenant_id: 't1',
          source_entity_id: 'orders',
          target_entity_id: 'customers',
          relation_type: 'one_to_many',
          source_label: null,
          target_label: null,
          is_system: false,
          app_scope: 'all',
          metadata: {},
        }),
      ).rejects.toBeTruthy();
    });

    // After rollback, relations cache is back to its original (empty) state.
    expect(result.current.relations).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(
      'Failed to create relationship',
      expect.anything(),
    );
  });
});
