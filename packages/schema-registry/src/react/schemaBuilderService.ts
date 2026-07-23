import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client-agnostic schema-builder service factory.
 *
 * All five BSuite consumer apps (crm7, bsu, conduit, r8, braden) keep a
 * triplicated `src/lib/schemaBuilderService.ts`. This module is the single
 * canonical source those files re-export from: each app calls
 * {@link createSchemaBuilderService} once with ITS OWN configured supabase
 * client and CURRENT_APP_SCOPE, then re-exports the bound methods for
 * back-compat. The package never imports an app supabase client — the client
 * is injected, keeping this package standalone (see CLAUDE.md "Shared
 * Packages" — Vercel clones only the consumer repo, not `packages/`).
 *
 * Modelled on business-suite-unified/src/lib/schemaBuilderService.ts (the
 * fullest copy). Semantics — especially the PostgREST no-double-`or`
 * single-nested-expression pattern and the {@link validateTenantId} UUID
 * guard — are mirrored exactly so behaviour is identical after migration.
 */

/**
 * Valid `app_scope` values — matches the DB CHECK constraint on
 * `tenant_entities.app_scope` / `tenant_entity_relations.app_scope`.
 *
 * NOTE: this uses `r8` (the DB CHECK value / R80.3 OAuth domain `r8.crm7.app`),
 * which matches the nav-layer `AppScope` in `./types.ts` after the 2026-07-23
 * r8 normalization (operator ruling: `r80` retired, canonical is `r8`
 * everywhere). The two declarations are structurally identical and both
 * exported (`AppScope` from types.ts; `AppScope` here) — kept as separate
 * declarations to avoid circular imports between the service and types layers.
 */
export const APP_SCOPES = ['all', 'crm7', 'bsu', 'conduit', 'r8', 'braden'] as const;
export type AppScope = (typeof APP_SCOPES)[number];

export interface TenantEntity {
  id: string;
  tenant_id: string | null;
  name: string;
  label: string;
  description: string | null;
  icon: string | null;
  is_system: boolean | null;
  app_scope: AppScope;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TenantEntityRelation {
  id: string;
  tenant_id: string | null;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  source_label: string | null;
  target_label: string | null;
  is_system: boolean | null;
  app_scope: AppScope;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Field-type enum mirroring the CHECK constraint on
 * `tenant_field_definitions.field_type`.
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'email'
  | 'phone';

/**
 * Subset of the `tenant_field_definitions` row shape that consumers need for
 * read-only rendering. This is the entity metadata authored in Feature Builder
 * — it lets a widget render correct columns even when the underlying entity
 * table is EMPTY (no first data row to infer keys from).
 */
export interface EntityFieldDefinition {
  id: string;
  entity_type: string;
  field_name: string;
  field_type: FieldType;
  label: string;
  sort_order: number;
}

/** Bound service surface returned by {@link createSchemaBuilderService}. */
export interface SchemaBuilderService {
  getSchemaEntities(tenantId: string | null, appScope?: AppScope): Promise<TenantEntity[]>;
  getSchemaRelations(tenantId: string | null, appScope?: AppScope): Promise<TenantEntityRelation[]>;
  getEntityFieldDefinitions(
    entityType: string,
    tenantId: string | null,
  ): Promise<EntityFieldDefinition[]>;
  createSchemaEntity(
    entity: Omit<TenantEntity, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TenantEntity>;
  updateSchemaEntity(id: string, updates: Partial<TenantEntity>): Promise<TenantEntity>;
  deleteSchemaEntity(id: string): Promise<void>;
  createSchemaRelation(
    relation: Omit<TenantEntityRelation, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TenantEntityRelation>;
  deleteSchemaRelation(id: string): Promise<void>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateTenantId(tenantId: string | null): void {
  if (tenantId && !UUID_PATTERN.test(tenantId)) {
    throw new Error('Invalid tenant ID format');
  }
}

/**
 * Build a schema-builder service bound to a specific supabase client and app
 * scope. Consumer apps call this once at module load with their own client and
 * `CURRENT_APP_SCOPE`.
 *
 * The supabase client is intentionally typed loosely (no `Database` generic) —
 * `supabase.from(<string>)` returns a loosely-typed builder and each result is
 * narrowed to the local interface at the call site, exactly as the BSU
 * original does.
 */
export function createSchemaBuilderService(
  supabase: SupabaseClient,
  currentScope: AppScope,
): SchemaBuilderService {
  async function getSchemaEntities(
    tenantId: string | null,
    appScope?: AppScope,
  ): Promise<TenantEntity[]> {
    validateTenantId(tenantId);
    const scope = appScope ?? currentScope;

    // PostgREST rejects multiple root-level `or=` params with 400. Chaining
    // `.or()` twice on the builder generates `or=(A)&or=(B)` which Supabase
    // interprets as "pick one" and errors. Build a single nested expression
    // instead so both filters AND together.
    let query = supabase.from('tenant_entities').select('*');
    if (tenantId) {
      // (tenant_id = X OR tenant_id IS NULL) AND scope filter
      if (scope !== 'all') {
        query = query.or(
          `and(or(tenant_id.eq.${tenantId},tenant_id.is.null),or(app_scope.eq.${scope},app_scope.eq.all))`,
        );
      } else {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }
    } else {
      // tenant_id IS NULL (system) AND scope filter
      query = query.is('tenant_id', null);
      if (scope !== 'all') {
        query = query.in('app_scope', [scope, 'all']);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw new Error(error.message ?? 'Failed to load entities');
    return (data ?? []) as unknown as TenantEntity[];
  }

  async function getSchemaRelations(
    tenantId: string | null,
    appScope?: AppScope,
  ): Promise<TenantEntityRelation[]> {
    validateTenantId(tenantId);
    const scope = appScope ?? currentScope;

    // Same no-double-`or` pattern as getSchemaEntities above.
    let query = supabase.from('tenant_entity_relations').select('*');
    if (tenantId) {
      if (scope !== 'all') {
        query = query.or(
          `and(or(tenant_id.eq.${tenantId},tenant_id.is.null),or(app_scope.eq.${scope},app_scope.eq.all))`,
        );
      } else {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }
    } else {
      query = query.is('tenant_id', null);
      if (scope !== 'all') {
        query = query.in('app_scope', [scope, 'all']);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw new Error(error.message ?? 'Failed to load entities');
    return (data ?? []) as unknown as TenantEntityRelation[];
  }

  async function getEntityFieldDefinitions(
    entityType: string,
    tenantId: string | null,
  ): Promise<EntityFieldDefinition[]> {
    validateTenantId(tenantId);

    let query = supabase
      .from('tenant_field_definitions')
      .select('id, entity_type, field_name, field_type, label, sort_order')
      .eq('entity_type', entityType)
      .eq('is_active', true);

    // Single nested `or` — chaining `.or()` twice yields `or=(A)&or=(B)` which
    // PostgREST rejects (see getSchemaEntities). NULL-tenant fields are
    // platform defaults visible to every tenant.
    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else {
      query = query.is('tenant_id', null);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) throw new Error(error.message ?? 'Failed to load field definitions');
    return (data ?? []) as unknown as EntityFieldDefinition[];
  }

  async function createSchemaEntity(
    entity: Omit<TenantEntity, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TenantEntity> {
    const { data, error } = await supabase
      .from('tenant_entities')
      .insert(entity)
      .select()
      .single();
    if (error) throw new Error(error.message ?? 'Operation failed');
    return data as unknown as TenantEntity;
  }

  async function updateSchemaEntity(
    id: string,
    updates: Partial<TenantEntity>,
  ): Promise<TenantEntity> {
    const { data, error } = await supabase
      .from('tenant_entities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message ?? 'Operation failed');
    return data as unknown as TenantEntity;
  }

  async function deleteSchemaEntity(id: string): Promise<void> {
    const { error } = await supabase.from('tenant_entities').delete().eq('id', id);
    if (error) throw new Error(error.message ?? 'Operation failed');
  }

  async function createSchemaRelation(
    relation: Omit<TenantEntityRelation, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TenantEntityRelation> {
    const { data, error } = await supabase
      .from('tenant_entity_relations')
      .insert(relation)
      .select()
      .single();
    if (error) throw new Error(error.message ?? 'Operation failed');
    return data as unknown as TenantEntityRelation;
  }

  async function deleteSchemaRelation(id: string): Promise<void> {
    const { error } = await supabase.from('tenant_entity_relations').delete().eq('id', id);
    if (error) throw new Error(error.message ?? 'Operation failed');
  }

  return {
    getSchemaEntities,
    getSchemaRelations,
    getEntityFieldDefinitions,
    createSchemaEntity,
    updateSchemaEntity,
    deleteSchemaEntity,
    createSchemaRelation,
    deleteSchemaRelation,
  };
}
