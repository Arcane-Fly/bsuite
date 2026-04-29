/**
 * SchemaService — thin data-access layer for tenant_field_definitions.
 *
 * All reads go through the Supabase PostgREST query builder (so RLS + column
 * ordering are handled client-side). All writes go through SECURITY DEFINER
 * RPCs so server-side role validation is always enforced.
 *
 * Phase 3A: getEntityFields now orders by sort_order NULLS LAST, created_at.
 *           reorderEntityFields calls the new reorder_entity_fields RPC.
 */

import type { EntityField, CreateFieldPayload, UpdateFieldPayload, SupabaseLike } from './types.js'

export class SchemaService {
  constructor(private readonly client: SupabaseLike) {}

  /**
   * Fetch all fields for an entity, ordered by sort_order NULLS LAST then
   * created_at (Phase 3A ordering).
   */
  async getEntityFields(entityId: string): Promise<EntityField[]> {
    const { data, error } = await this.client
      .from('tenant_field_definitions')
      .select('id, entity_id, tenant_id, field_name, field_type, nullable, sort_order, created_at')
      .eq('entity_id', entityId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) throw new Error((error as { message: string }).message)
    return (data as EntityField[]) ?? []
  }

  /**
   * Create a new field via the create_entity_field SECURITY DEFINER RPC.
   * The RPC validates tenant membership and field_name format.
   */
  async createEntityField(payload: CreateFieldPayload): Promise<EntityField> {
    const { data, error } = await this.client.rpc('create_entity_field', {
      p_entity_id:  payload.entity_id,
      p_field_name: payload.field_name,
      p_field_type: payload.field_type,
      p_nullable:   payload.nullable ?? true,
    })

    if (error) throw new Error((error as { message: string }).message)
    return data as EntityField
  }

  /**
   * Update an existing field via the update_entity_field SECURITY DEFINER RPC.
   */
  async updateEntityField(fieldId: string, payload: UpdateFieldPayload): Promise<void> {
    const { error } = await this.client.rpc('update_entity_field', {
      p_field_id:   fieldId,
      p_field_name: payload.field_name ?? null,
      p_field_type: payload.field_type ?? null,
      p_nullable:   payload.nullable   ?? null,
    })

    if (error) throw new Error((error as { message: string }).message)
  }

  /**
   * Delete a field via the delete_entity_field SECURITY DEFINER RPC.
   */
  async deleteEntityField(entityId: string, fieldId: string): Promise<void> {
    const { error } = await this.client.rpc('delete_entity_field', {
      p_entity_id: entityId,
      p_field_id:  fieldId,
    })

    if (error) throw new Error((error as { message: string }).message)
  }

  /**
   * Phase 3A: Reorder fields via the reorder_entity_fields SECURITY DEFINER RPC.
   * The RPC validates that p_field_ids covers exactly the entity's fields
   * (no missing, no extra) before updating sort_order values.
   */
  async reorderEntityFields(entityId: string, fieldIds: string[]): Promise<void> {
    const { error } = await this.client.rpc('reorder_entity_fields', {
      p_entity_id: entityId,
      p_field_ids: fieldIds,
    })

    if (error) throw new Error((error as { message: string }).message)
  }
}
