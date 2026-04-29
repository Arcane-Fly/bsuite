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
// Supabase client structural interface
// ---------------------------------------------------------------------------

/** Minimal error shape returned by Supabase operations. */
export interface SupabaseError {
  message: string
  code?: string
}

/** Minimal Supabase-compatible query result. */
export interface SupabaseResult<T = unknown> {
  data: T | null
  error: SupabaseError | null
}

/** Chainable query builder stub — covers the chained calls service.ts makes. */
export interface SupabaseQueryChain {
  select(cols?: string): SupabaseQueryChain
  eq(col: string, val: string | number | boolean | null): SupabaseQueryChain
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): SupabaseQueryChain
  then<T>(onFulfilled: (value: SupabaseResult<unknown[]>) => T): Promise<T>
  catch<T>(onRejected: (reason: unknown) => T): Promise<T>
}

/**
 * Minimal structural Supabase client interface.
 * Any @supabase/supabase-js SupabaseClient satisfies this without importing
 * @supabase/supabase-js as a dependency (avoids version coupling).
 */
export interface SupabaseLike {
  rpc(fn: string, params?: Record<string, unknown>): PromiseLike<SupabaseResult<unknown>>
  from(table: string): SupabaseQueryChain
}
