/**
 * `useSchemaReflection` — calls the `reflect_entity_schema(p_table_name)`
 * Postgres RPC to discover the live column list + PK/FK metadata for a
 * Supabase table. Referenced by §3.6 item 4 of the master plan.
 *
 * The RPC is OPTIONAL infrastructure: if the function is not deployed the
 * Postgres error code is `42883` (undefined_function). In that case we
 * resolve to an empty column set with `rpcAvailable: false` so consumers
 * can degrade gracefully to the `tenant_field_definitions` path.
 */

import { useQuery } from '@tanstack/react-query';
import type { LooseSupabaseClient } from '../service.js';

export interface ReflectedColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary: boolean;
  is_foreign_key: boolean;
  fk_table: string | null;
  fk_column: string | null;
}

export interface UseSchemaReflectionOptions {
  supabase: LooseSupabaseClient;
  tableName: string | null | undefined;
  schema?: string;
  enabled?: boolean;
}

export interface UseSchemaReflectionResult {
  columns: ReflectedColumn[];
  isLoading: boolean;
  error: Error | null;
  /**
   * `false` iff the server returned a `42883` (undefined_function) error,
   * indicating the migration has not been applied. Consumers should fall
   * back to their `tenant_field_definitions` query in that case.
   */
  rpcAvailable: boolean;
}

interface InternalResult {
  columns: ReflectedColumn[];
  rpcAvailable: boolean;
}

export function useSchemaReflection({
  supabase,
  tableName,
  schema = 'public',
  enabled = true,
}: UseSchemaReflectionOptions): UseSchemaReflectionResult {
  const query = useQuery<InternalResult, Error>({
    queryKey: ['schema-reflection', schema, tableName] as const,
    enabled: enabled && !!tableName,
    staleTime: 60_000,
    // Don't retry — 42883 (undefined_function) will never recover via retry,
    // and other errors are surfaced immediately so consumers can fall back
    // to the tenant_field_definitions path.
    retry: false,
    queryFn: async (): Promise<InternalResult> => {
      const res = (await supabase.rpc('reflect_entity_schema', {
        p_table_name: tableName,
        p_schema: schema,
      })) as { data: ReflectedColumn[] | null; error: { code?: string; message?: string } | null };

      if (res.error) {
        if (res.error.code === '42883') {
          return { columns: [], rpcAvailable: false };
        }
        throw new Error(res.error.message ?? 'Schema reflection failed');
      }
      return { columns: res.data ?? [], rpcAvailable: true };
    },
  });

  return {
    columns: query.data?.columns ?? [],
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    // Default to `false` until we have data — otherwise consumers might
    // render an "RPC available but 0 columns" state during initial load.
    rpcAvailable: query.data?.rpcAvailable ?? false,
  };
}
