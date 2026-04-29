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
//
// `LooseQuery` is intentionally `any`: the real `@supabase/supabase-js`
// PostgrestQueryBuilder returns different concrete builder types from
// `.select()` / `.eq()` / `.or()` / `.is()` / `.in()` / `.order()`, so a
// structurally-typed shape cannot match. Service methods below cast to
// `Promise<{ data, error }>` at the await site, so the loss of type precision
// on intermediate chain links has no runtime impact.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseQuery = any;

// See LooseQuery above for rationale — the real RealtimeChannel's `.on()` has
// tagged-union overloads (presence/postgres_changes/broadcast/system) that
// cannot be structurally matched, so we widen to `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseChannel = any;

// Pragmatic widening to `any` after three rounds of structural-compat failures
// (.from()/eq/or, .channel().on() overloads, .removeChannel() return type).
// The package trusts callers to pass a real supabase-js client. Service methods
// below cast `await` sites to Promise<{data,error}> explicitly, so there is no
// runtime type-safety loss — TypeScript just stops re-validating the client's
// rich structural API on every version bump of @supabase/supabase-js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseSupabaseClient = any;

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
