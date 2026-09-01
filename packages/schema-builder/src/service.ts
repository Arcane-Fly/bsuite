/**
 * Supabase service layer for the Schema Builder tables. All functions take a
 * pre-constructed client so the package does not couple to any one app's
 * Supabase wiring.
 *
 * PostgREST note: `.or()` chained twice generates two root-level `or=` query
 * params which PostgREST interprets as "pick one", returning HTTP 400. Build
 * a single nested `and(or(...),or(...))` expression so both filters AND.
 */

import type {
  AppScope,
  TenantEntity,
  TenantEntityRelation,
  TenantFieldDefinition,
} from './types.js';

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

// -----------------------------------------------------------------
// Field CRUD (tenant_field_definitions) — Phase 1b.2
// -----------------------------------------------------------------

/**
 * Fetch the active fields for a single entity, sorted by sort_order then
 * creation time. Used by the per-entity properties panel.
 */
export async function getEntityFields(
  client: LooseSupabaseClient,
  entityId: string,
): Promise<TenantFieldDefinition[]> {
  const q = client
    .from('tenant_field_definitions')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<TenantFieldDefinition[]>(res);
}

/**
 * Fetch all active fields for the given tenant. Used by
 * `useSchemaController` to populate `fields` on every entity node at once
 * without N+1 round-trips. NULL tenant fields (platform / system fields)
 * are included so they appear on shared entities too.
 */
export async function getTenantFields(
  client: LooseSupabaseClient,
  tenantId: string | null,
): Promise<TenantFieldDefinition[]> {
  let q = client
    .from('tenant_field_definitions')
    .select('*')
    .eq('is_active', true);

  if (tenantId) {
    q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  } else {
    q = q.is('tenant_id', null);
  }

  q = q.order('sort_order', { ascending: true }).order('created_at', {
    ascending: true,
  });

  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<TenantFieldDefinition[]>(res);
}

export async function createEntityField(
  client: LooseSupabaseClient,
  field: Omit<TenantFieldDefinition, 'id' | 'created_at' | 'updated_at'>,
): Promise<TenantFieldDefinition> {
  const res = await client
    .from('tenant_field_definitions')
    .insert(field)
    .select('*')
    .single();
  return assertNoError<TenantFieldDefinition>(res);
}

export async function updateEntityField(
  client: LooseSupabaseClient,
  id: string,
  updates: Partial<TenantFieldDefinition>,
): Promise<TenantFieldDefinition> {
  const res = await client
    .from('tenant_field_definitions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  return assertNoError<TenantFieldDefinition>(res);
}

export async function deleteEntityField(
  client: LooseSupabaseClient,
  id: string,
): Promise<void> {
  const res = await (client
    .from('tenant_field_definitions')
    .delete()
    .eq('id', id) as unknown as Promise<{ data: unknown; error: unknown }>);
  assertNoError<unknown>(res);
}

/**
 * Atomically reorder the active fields of an entity via the
 * `reorder_entity_fields` SECURITY DEFINER RPC. `orderedFieldIds` MUST be
 * the complete set of active field ids for `entityId` (no missing, extra,
 * or duplicate ids); the RPC rejects partial arrays with
 * `invalid_parameter_value` to prevent accidental data loss.
 *
 * Phase 3A — see `docs/20260504-schema-builder-phase-3-plan-v1.00W.md` §3.A
 * and migration `20260505000000_field_sort_order_and_reorder_rpc.sql`.
 */
export async function reorderEntityFields(
  client: LooseSupabaseClient,
  entityId: string,
  orderedFieldIds: string[],
): Promise<void> {
  const res = await (client.rpc('reorder_entity_fields', {
    p_entity_id: entityId,
    p_field_ids: orderedFieldIds,
  }) as unknown as Promise<{ data: unknown; error: unknown }>);
  assertNoError<unknown>(res);
}

// -----------------------------------------------------------------
// Physical column rename (rename_physical_column) — Phase 3B
// -----------------------------------------------------------------

/**
 * Result of `rename_physical_column`. On a dry-run `executed` is always
 * `false` and `would_execute` / `affected_views` / `affected_policies` are
 * populated so the UI can ask the user to confirm. On a wet-run `executed`
 * flips to `true` when the ALTER TABLE succeeded.
 *
 * REFUSALS carry a `reason`, and since migration 20261101000000 they are
 * distinguished — because the caller can act on one and not the other:
 *
 *   'no_physical_table'    there is genuinely no `public.<name>` table
 *   'table_not_registered' the table exists but is not in
 *                          `schema_builder_physical_tables` for this tenant, so a
 *                          platform developer can register it
 *
 * Both were previously `no_physical_table`, and because the allowlist ships EMPTY
 * that was the answer for every entity — which the dialog rendered as "No physical
 * table exists for this entity", usually false. Neither refusal writes an audit row.
 *
 * Phase 3B — see `docs/20260504-schema-builder-phase-3-plan-v1.00W.md` §3.B
 * and migration `20260506000000_rename_physical_column_rpc.sql`.
 */
export interface RenamePhysicalColumnResult {
  executed: boolean;
  /** See the note above: 'no_physical_table' | 'table_not_registered' on refusal. */
  reason?: string;
  audit_id?: string;
  would_execute?: string;
  affected_views?: string[];
  affected_policies?: string[];
  old_field_name?: string;
  new_field_name?: string;
}

/**
 * Invoke the `rename_physical_column` RPC. Callers MUST run a dry-run first
 * (opts.dryRun = true) and show the returned `would_execute` + affected
 * objects to the user before calling again with `dryRun: false`. The RPC
 * writes one audit row per call (dry-run and wet-run both) so every attempt
 * — successful or not — is observable in `schema_mutations_audit`.
 */
/**
 * How many physical tables this tenant has registered for Schema-Builder renames.
 *
 * WHY THE UI NEEDS THIS. `rename_physical_column` refuses unless the entity's
 * table appears in `schema_builder_physical_tables`, and that allowlist ships
 * EMPTY by design — it is the fix for a privilege escalation where the ALTER
 * TABLE target came from caller-controlled `tenant_entities.name`. Measured on
 * production 2026-09-01: the allowlist holds 0 rows, and 0 of 45 `tenant_entities`
 * resolve to a real `public.<name>` table at all.
 *
 * So the "also rename the database column" checkbox was being offered on every
 * field of every entity while being unable to succeed for any of them — an inert
 * control that charged the user a confirm step to reach a refusal. When this
 * returns 0, the caller hides the disclosure and the rename takes the metadata
 * path, which is what the user wanted and what works.
 *
 * Counted per TENANT rather than per entity because the allowlist is keyed on
 * `(table_name, tenant_id)` with no entity column — there is no cheap client-side
 * entity -> table mapping, and the RPC still enforces the per-entity check. Zero
 * is the answer that matters: it proves no entity can succeed.
 */
export async function countPhysicalTableRegistrations(
  client: LooseSupabaseClient,
  tenantId: string,
): Promise<number> {
  const res = await (client
    .from('schema_builder_physical_tables')
    .select('table_name', { count: 'exact', head: true })
    .eq('tenant_id', tenantId) as unknown as Promise<{ count: number | null; error: unknown }>);
  if (res.error) {
    // A read failure is NOT proof of zero. Returning 0 here would hide the
    // control on a transient error and quietly remove a capability, which is the
    // exact failure this whole change exists to undo. Surface it as "unknown"
    // by throwing; the caller decides, and its default is the old behaviour.
    throw res.error;
  }
  return res.count ?? 0;
}

export async function renamePhysicalColumn(
  client: LooseSupabaseClient,
  entityId: string,
  fieldId: string,
  newName: string,
  opts: { dryRun: boolean },
): Promise<RenamePhysicalColumnResult> {
  const res = await (client.rpc('rename_physical_column', {
    p_entity_id: entityId,
    p_field_id: fieldId,
    p_new_name: newName,
    p_dry_run: opts.dryRun,
  }) as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<RenamePhysicalColumnResult>(res);
}

// -----------------------------------------------------------------------------
// Canvas layout overlay
//
// WHY THIS IS A SEPARATE TABLE AND NOT `tenant_entities.metadata.position`
//
// Measured live 2026-08-06: all 44 tenant_entities rows are platform-owned
// (`tenant_id IS NULL`, `is_system = true`). The UPDATE policy on that table
// requires BOTH `is_system = false` AND `ut.tenant_id = tenant_entities.tenant_id`
// — and `NULL = <uuid>` is NULL, never true — so those rows cannot be written by
// any user, by construction. Writing positions there produced a denied UPDATE,
// an optimistic rollback, and a node that snapped back to where it started.
//
// Positions now live in `tenant_schema_layout`, keyed by tenant (and optionally
// by user). Arranging a diagram and altering a shared schema are different
// powers; keeping them in different tables is what lets a tenant do the first
// without being granted the second.
// -----------------------------------------------------------------------------

export interface TenantSchemaLayoutRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  entity_id: string;
  app_scope: string;
  pos_x: number;
  pos_y: number;
}

/**
 * Every layout row visible to the caller for this tenant/scope — both the
 * tenant defaults (`user_id IS NULL`) and the caller's own overrides. RLS does
 * the filtering; resolution between the two happens in `resolveLayout`.
 */
export async function getSchemaLayout(
  client: LooseSupabaseClient,
  tenantId: string | null,
  appScope: AppScope = 'all',
): Promise<TenantSchemaLayoutRow[]> {
  if (!tenantId) return [];
  const res = await (client
    .from('tenant_schema_layout')
    .select('id,tenant_id,user_id,entity_id,app_scope,pos_x,pos_y')
    .eq('tenant_id', tenantId)
    .in('app_scope', [appScope, 'all']) as unknown as Promise<{
    data: unknown;
    error: unknown;
  }>);
  return assertNoError<TenantSchemaLayoutRow[]>(res);
}

/**
 * Collapse the rows into one position per entity. A personal override beats the
 * tenant default; that ordering is the whole point of allowing both.
 */
export function resolveLayout(
  rows: TenantSchemaLayoutRow[],
  userId: string | null,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  for (const r of rows) {
    if (r.user_id === null) out.set(r.entity_id, { x: r.pos_x, y: r.pos_y });
  }
  if (userId) {
    for (const r of rows) {
      if (r.user_id === userId) out.set(r.entity_id, { x: r.pos_x, y: r.pos_y });
    }
  }
  return out;
}

/**
 * Persist one entity position. Goes through the `save_schema_layout_position`
 * RPC rather than a bare upsert so the "personal override vs tenant default"
 * decision is made in exactly one place — three consumer apps render this
 * canvas and would each re-derive it slightly differently.
 */
export async function saveSchemaLayoutPosition(
  client: LooseSupabaseClient,
  args: {
    tenantId: string;
    entityId: string;
    x: number;
    y: number;
    personal?: boolean;
    appScope?: AppScope;
  },
): Promise<TenantSchemaLayoutRow> {
  const res = await (client.rpc('save_schema_layout_position', {
    p_tenant_id: args.tenantId,
    p_entity_id: args.entityId,
    p_pos_x: args.x,
    p_pos_y: args.y,
    p_personal: args.personal ?? false,
    p_app_scope: args.appScope ?? 'all',
  }) as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<TenantSchemaLayoutRow>(res);
}

/**
 * Developer-only rename of a PLATFORM-owned entity. Every other entity edit
 * goes through `updateSchemaEntity`; this exists because platform rows are
 * deliberately unwritable through ordinary RLS, and the RPC is the single
 * audited exception. It refuses tenant-owned entities server-side.
 */
export async function updatePlatformEntityLabel(
  client: LooseSupabaseClient,
  entityId: string,
  label: string,
  description?: string | null,
): Promise<TenantEntity> {
  const res = await (client.rpc('update_platform_entity_label', {
    p_entity_id: entityId,
    p_label: label,
    p_description: description ?? null,
  }) as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<TenantEntity>(res);
}
