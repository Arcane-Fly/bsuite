/**
 * Minimal row shapes for the Schema Builder tables. Kept package-local so
 * `@bsuite/schema-builder` does not depend on any one consumer app's Supabase
 * `Database` type. Shapes match the columns defined by the BSU-owned canonical
 * migrations through `20260503000000_add_field_level_relations.sql`.
 */

export const APP_SCOPES = ['all', 'crm7', 'bsu', 'conduit', 'r80', 'braden'] as const;
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

export interface TenantEntityRelation {
  id: string;
  tenant_id: string | null;
  source_entity_id: string;
  target_entity_id: string;
  /** New in migration 20260503000000 — NULL for legacy entity-level rows. */
  source_field_id: string | null;
  /** New in migration 20260503000000 — NULL for legacy entity-level rows. */
  target_field_id: string | null;
  relation_type: RelationType;
  source_label: string | null;
  target_label: string | null;
  /** New in migration 20260503000000. Defaults to 'SET NULL' on field-level. */
  on_delete: ReferentialAction | null;
  /** New in migration 20260503000000. Defaults to 'CASCADE' on field-level. */
  on_update: ReferentialAction | null;
  is_system: boolean;
  app_scope: AppScope;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

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

/**
 * Result shape returned by the `rename_physical_column` RPC when called with
 * `p_dry_run = true`. Used by `FieldEditDialog` to populate the confirmation
 * modal before the user triggers the wet-run.
 *
 * Phase 3B.
 */
export interface RenamePreviewResult {
  /** The exact `ALTER TABLE ... RENAME COLUMN ...` SQL that would be executed. */
  would_execute: string;
  /** Names of views in the `public` schema whose definition references the old column name. */
  affected_views: string[];
  /** Names of RLS policies on the entity's table (all policies, not just those referencing the column). */
  affected_policies: string[];
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
