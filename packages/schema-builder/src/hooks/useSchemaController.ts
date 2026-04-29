/**
 * useSchemaController — React hook for managing entity field definitions.
 *
 * Provides all CRUD operations plus Phase 3A reordering with optimistic UI:
 * on reorderFields, the local state is updated immediately; if the RPC fails
 * the previous state is restored and the optional onError callback is invoked.
 */

import { useState, useCallback, useMemo } from 'react'
import type {
  EntityField,
  CreateFieldPayload,
  UpdateFieldPayload,
  SchemaController,
  SupabaseLike,
} from '../types.js'
import { SchemaService } from '../service.js'

export interface UseSchemaControllerOptions {
  /** Called when any operation fails. Use this to show a toast notification. */
  onError?: (message: string) => void
}

export function useSchemaController(
  client: SupabaseLike,
  options: UseSchemaControllerOptions = {},
): SchemaController {
  const [fields, setFields] = useState<EntityField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const service = useMemo(() => new SchemaService(client), [client])
  const { onError } = options

  // ---------------------------------------------------------------------------
  // loadFields
  // ---------------------------------------------------------------------------
  const loadFields = useCallback(
    async (entityId: string) => {
      setLoading(true)
      setError(null)
      try {
        const data = await service.getEntityFields(entityId)
        setFields(data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load fields'
        setError(msg)
        onError?.(msg)
      } finally {
        setLoading(false)
      }
    },
    [service, onError],
  )

  // ---------------------------------------------------------------------------
  // createField
  // ---------------------------------------------------------------------------
  const createField = useCallback(
    async (payload: CreateFieldPayload) => {
      setLoading(true)
      setError(null)
      try {
        const newField = await service.createEntityField(payload)
        setFields(prev => [...prev, newField])
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create field'
        setError(msg)
        onError?.(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [service, onError],
  )

  // ---------------------------------------------------------------------------
  // updateField
  // ---------------------------------------------------------------------------
  const updateField = useCallback(
    async (fieldId: string, payload: UpdateFieldPayload) => {
      setLoading(true)
      setError(null)
      try {
        await service.updateEntityField(fieldId, payload)
        setFields(prev =>
          prev.map(f => (f.id === fieldId ? { ...f, ...payload } : f)),
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to update field'
        setError(msg)
        onError?.(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [service, onError],
  )

  // ---------------------------------------------------------------------------
  // deleteField
  // ---------------------------------------------------------------------------
  const deleteField = useCallback(
    async (entityId: string, fieldId: string) => {
      setLoading(true)
      setError(null)
      try {
        await service.deleteEntityField(entityId, fieldId)
        setFields(prev => prev.filter(f => f.id !== fieldId))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to delete field'
        setError(msg)
        onError?.(msg)
        throw e
      } finally {
        setLoading(false)
      }
    },
    [service, onError],
  )

  // ---------------------------------------------------------------------------
  // reorderFields — Phase 3A
  // Optimistic UI: reorder local state immediately; rollback on RPC error.
  // ---------------------------------------------------------------------------
  const reorderFields = useCallback(
    async (entityId: string, orderedFieldIds: string[]) => {
      // Capture snapshot synchronously before any async operation
      const snapshot = fields

      // Compute optimistically-reordered list
      const idToField = new Map(fields.map(f => [f.id, f]))
      const reordered = orderedFieldIds
        .map((id, index) => {
          const f = idToField.get(id)
          return f ? { ...f, sort_order: (index + 1) * 10 } : null
        })
        .filter((f): f is EntityField => f !== null)

      // Optimistic update
      setFields(reordered)

      try {
        await service.reorderEntityFields(entityId, orderedFieldIds)
      } catch (e) {
        // Rollback to pre-reorder state
        setFields(snapshot)
        const msg = e instanceof Error ? e.message : 'Failed to reorder fields'
        setError(msg)
        onError?.(msg)
        throw e
      }
    },
    [service, fields, onError],
  )

  return {
    fields,
    loading,
    error,
    loadFields,
    createField,
    updateField,
    deleteField,
    reorderFields,
  }
}
