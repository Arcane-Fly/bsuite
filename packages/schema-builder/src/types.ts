/**
 * Core types for @bsuite/schema-builder.
 *
 * These types represent the tenant_field_definitions table schema
 * and the public API surface of the schema-builder package.
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Supported Postgres column types for tenant-defined fields. */
export type FieldType =
  | 'text'
  | 'integer'
  | 'numeric'
  | 'boolean'
  | 'date'
  | 'timestamptz'
  | 'uuid'

/** A row from tenant_field_definitions (Phase 3A: includes sort_order). */
export interface EntityField {
  id: string
  entity_id: string
  tenant_id: string
  field_name: string
  field_type: FieldType
  nullable: boolean
  /** Display / storage order. Spacing of 10 between rows. Phase 3A+. */
  sort_order: number
  created_at: string
}

/** Payload for creating a new field definition. */
export interface CreateFieldPayload {
  entity_id: string
  field_name: string
  field_type: FieldType
  nullable?: boolean
}

/** Payload for updating an existing field definition. */
export interface UpdateFieldPayload {
  field_name?: string
  field_type?: FieldType
  nullable?: boolean
}

// ---------------------------------------------------------------------------
// Controller interface (returned by useSchemaController)
// ---------------------------------------------------------------------------

export interface SchemaController {
  fields: EntityField[]
  loading: boolean
  error: string | null
  loadFields: (entityId: string) => Promise<void>
  createField: (payload: CreateFieldPayload) => Promise<void>
  updateField: (fieldId: string, payload: UpdateFieldPayload) => Promise<void>
  deleteField: (entityId: string, fieldId: string) => Promise<void>
  /** Phase 3A: reorder fields with optimistic UI + rollback on RPC error. */
  reorderFields: (entityId: string, orderedFieldIds: string[]) => Promise<void>
}

// ---------------------------------------------------------------------------
// CustomEvent detail (FieldRow → SchemaCanvas)
// ---------------------------------------------------------------------------

/** Detail carried by the 'bsuite-reorder-field' CustomEvent. */
export interface ReorderFieldEventDetail {
  entityId: string
  fieldId: string
  direction: 'up' | 'down'
}

// ---------------------------------------------------------------------------
// Supabase client duck-type
// ---------------------------------------------------------------------------

/**
 * Minimal Supabase-compatible client type.
 * Any @supabase/supabase-js SupabaseClient satisfies this interface.
 * Using `any` avoids coupling to a specific @supabase/supabase-js version.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural duck-type; avoids @supabase/supabase-js version coupling
export type SupabaseLike = any
