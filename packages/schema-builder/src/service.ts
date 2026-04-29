/**
 * Supabase service layer for the Schema Builder tables. All functions take a
 * pre-constructed client so the package does not couple to any one app's
 * Supabase wiring.
 *
 * PostgREST note: `.or()` chained twice generates two root-level `or=` query
 * params which PostgREST interprets as "pick one", returning HTTP 400. Build
 * a single nested `and(or(...),or(...))` expression so both filters AND.
 */

import type { AppScope, TenantEntity, TenantEntityRelation } from './types.js';

// Loose Supabase client type to keep package consumer-agnostic. Consumers pass
// their own strongly-typed client; we only rely on the query-builder surface.
// Using `any` inside the type arg is intentional — the Database generic is
// owned by the consumer and resolved at their callsite.
type LooseQuery = {
  select: (cols: string) => LooseQuery;
  insert: (row: unknown) => LooseQuery;
  update: (row: unknown) => LooseQuery;
  delete: () => LooseQuery;
  eq: (col: string, val: unknown) => LooseQuery;
  is: (col: string, val: unknown) => LooseQuery;
  in: (col: string, vals: unknown[]) => LooseQuery;
  or: (expr: string) => LooseQuery;
  order: (col: string, opts?: { ascending?: boolean }) => LooseQuery;
  single: () => Promise<{ data: unknown; error: unknown }>;
  // Thenable so `await query` works on the query builder directly.
  then: Promise<{ data: unknown; error: unknown }>['then'];
};

export interface LooseChannel {
  on: (
    event: string,
    filter: Record<string, unknown>,
    handler: (payload: unknown) => void,
  ) => LooseChannel;
  subscribe: () => { unsubscribe: () => void };
}

export type LooseSupabaseClient = {
  from: (table: string) => LooseQuery;
  channel: (name: string) => LooseChannel;
  removeChannel: (channel: unknown) => void;
};

function assertNoError<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) {
    throw res.error instanceof Error
      ? res.error
      : new Error(
          typeof res.error === 'object' &&
          res.error !== null &&
          'message' in res.error
            ? String((res.error as { message: unknown }).message)
            : String(res.error),
        );
  }
  return res.data as T;
}

function scopedQuery(
  client: LooseSupabaseClient,
  table: 'tenant_entities' | 'tenant_entity_relations',
  tenantId: string | null,
  appScope: AppScope,
): LooseQuery {
  let q = client.from(table).select('*');

  if (tenantId) {
    if (appScope !== 'all') {
      q = q.or(
        `and(or(tenant_id.eq.${tenantId},tenant_id.is.null),or(app_scope.eq.${appScope},app_scope.eq.all))`,
      );
    } else {
      q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }
  } else {
    q = q.is('tenant_id', null);
    if (appScope !== 'all') {
      q = q.in('app_scope', [appScope, 'all']);
    }
  }

  return q;
}

export async function getSchemaEntities(
  client: LooseSupabaseClient,
  tenantId: string | null,
  appScope: AppScope = 'all',
): Promise<TenantEntity[]> {
  const q = scopedQuery(client, 'tenant_entities', tenantId, appScope).order(
    'created_at',
    { ascending: true },
  );
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<TenantEntity[]>(res);
}

export async function getSchemaRelations(
  client: LooseSupabaseClient,
  tenantId: string | null,
  appScope: AppScope = 'all',
): Promise<TenantEntityRelation[]> {
  const q = scopedQuery(client, 'tenant_entity_relations', tenantId, appScope);
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<TenantEntityRelation[]>(res);
}

export async function createSchemaEntity(
  client: LooseSupabaseClient,
  entity: Omit<TenantEntity, 'id' | 'created_at' | 'updated_at'>,
): Promise<TenantEntity> {
  const res = await client
    .from('tenant_entities')
    .insert(entity)
    .select('*')
    .single();
  return assertNoError<TenantEntity>(res);
}

export async function updateSchemaEntity(
  client: LooseSupabaseClient,
  id: string,
  updates: Partial<TenantEntity>,
): Promise<TenantEntity> {
  const res = await client
    .from('tenant_entities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  return assertNoError<TenantEntity>(res);
}

export async function deleteSchemaEntity(
  client: LooseSupabaseClient,
  id: string,
): Promise<void> {
  const res = await (client
    .from('tenant_entities')
    .delete()
    .eq('id', id) as unknown as Promise<{ data: unknown; error: unknown }>);
  assertNoError<unknown>(res);
}

export async function createSchemaRelation(
  client: LooseSupabaseClient,
  relation: Omit<TenantEntityRelation, 'created_at' | 'updated_at'>,
): Promise<TenantEntityRelation> {
  const res = await client
    .from('tenant_entity_relations')
    .insert(relation)
    .select('*')
    .single();
  return assertNoError<TenantEntityRelation>(res);
}

export async function updateSchemaRelation(
  client: LooseSupabaseClient,
  id: string,
  updates: Partial<TenantEntityRelation>,
): Promise<TenantEntityRelation> {
  const res = await client
    .from('tenant_entity_relations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  return assertNoError<TenantEntityRelation>(res);
}

export async function deleteSchemaRelation(
  client: LooseSupabaseClient,
  id: string,
): Promise<void> {
  const res = await (client
    .from('tenant_entity_relations')
    .delete()
    .eq('id', id) as unknown as Promise<{ data: unknown; error: unknown }>);
  assertNoError<unknown>(res);
}
