/**
 * Minimal row shapes for the Schema Builder tables. Kept package-local so
 * `@bsuite/schema-builder` does not depend on any one consumer app's Supabase
 * `Database` type. Shapes match the columns defined by the BSU-owned canonical
 * migrations through `20260503000000_add_field_level_relations.sql`.
 */

export const APP_SCOPES = ['all', 'crm7', 'bsu', 'conduit', 'r8', 'braden'] as const;
export type AppScope = (typeof APP_SCOPES)[number];

export type EntityMetadata = {
  position?: { x: number; y: number };
} & Record<string, unknown>;

export interface TenantEntity {
  id: string;
  tenant_id: string | null;
  name: string;
  label: string;
  description: string | null;
  icon: string | null;
  app_scope: AppScope;
  is_system: boolean;
  metadata: EntityMetadata | null;
  created_at: string | null;
  updated_at: string | null;
}

export type RelationType =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_many'
  | 'inherits_from';

export type ReferentialAction =
  | 'CASCADE'
  | 'SET NULL'
  | 'RESTRICT'
  | 'NO ACTION';

/**
 * A row of `public.tenant_entity_relations`, and ONLY what that table actually
 * has. Every property here must exist as a column on the live table.
 *
 * WHY THERE IS NO source_field_id / target_field_id / on_delete / on_update
 *
 * Migration 20260503000000 added those four columns; its rollback twin
 * 20260503000001 dropped them again on 2026-05-03. This interface kept
 * declaring them, `toDbRelation` kept emitting them, and `SchemaCanvas` kept
 * sending them — so PostgREST rejected EVERY relationship insert with PGRST204
 * for the next three and a half months. `tenant_entity_relations` held 0 rows
 * across all 7 tenants and the canvas drew 0 edges, because relationship
 * creation had simply never worked in this deployment.
 *
 * The four are gone from this type deliberately. Do not re-add them here to
 * "fix a type error" — the type error IS the bug surfacing. They may only come
 * back together with a migration that re-adds the columns, and
 * `relationInsertContract.test.ts` will hold the two halves together either way.
 *
 * Field-level relations are therefore UNAVAILABLE: a relation anchors an entity
 * to an entity, never a column to a column.
 */
export interface TenantEntityRelation {
  id: string;
  tenant_id: string | null;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: RelationType;
  source_label: string | null;
  target_label: string | null;
  is_system: boolean;
  app_scope: AppScope;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * The column list of `public.tenant_entity_relations`, as measured on the live
 * database (project `tuybltdrdefjblnplpqo`) on 2026-08-22 via
 * `information_schema.columns`.
 *
 * This exists because the TypeScript interface above and the actual table
 * disagreed for three and a half months and nothing noticed. A type can only
 * say what this code believes; this constant says what was measured, and
 * `relationInsertContract.test.ts` holds the write path to it.
 *
 * There is no CREATE TABLE for this table anywhere in the repo — it is
 * live-but-unrebuildable — so a measured constant is the strongest available
 * source of truth. The `schema-builder-relation-contract` workflow re-measures
 * it against production and fails if it has drifted.
 *
 * If you change this list, you are asserting the table changed. Prove it.
 */
export const TENANT_ENTITY_RELATIONS_COLUMNS = [
  'id',
  'tenant_id',
  'source_entity_id',
  'target_entity_id',
  'relation_type',
  'source_label',
  'target_label',
  'is_system',
  'metadata',
  'created_at',
  'updated_at',
  'app_scope',
] as const;

/**
 * Columns that migration 20260503000000 added and 20260503000001 dropped again.
 * Named explicitly so the contract test can assert they never come back through
 * the write path by accident — the failure mode is silent (PGRST204 on every
 * insert), so it needs a loud test rather than a comment.
 */
export const RELATION_COLUMNS_DROPPED_20260503 = [
  'source_field_id',
  'target_field_id',
  'on_delete',
  'on_update',
] as const;

/**
 * Field type enum mirroring the CHECK constraint on
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
 * Row shape for `tenant_field_definitions`. Covers the columns added through
 * migrations `20260304090002_phase5_create_tenant_field_definitions.sql`,
 * `20260304100000_ui_customization_system.sql`, and
 * `20260311053135_visual_relational_builder.sql` (entity_id).
 */
export interface TenantFieldDefinition {
  id: string;
  tenant_id: string | null;
  entity_id: string | null;
  entity_type: string;
  field_name: string;
  field_type: FieldType;
  label: string;
  placeholder: string | null;
  is_required: boolean;
  options: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  scope: string | null;
  is_system: boolean;
  is_locked: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Controller-options bag passed to every hook and the top-level component. */
export interface SchemaControllerOptions {
  /**
   * A fully-constructed `@supabase/supabase-js` client. Typed loosely so
   * consumers with their own Database generic can pass it through.
   */
  supabase: unknown;
  tenantId: string | null;
  appScope?: AppScope;
  /** Optional error sink (e.g., sonner `toast.error`). */
  onError?: (message: string, err?: unknown) => void;
  /** Optional success sink (e.g., sonner `toast.success`). */
  onSuccess?: (message: string) => void;
}
