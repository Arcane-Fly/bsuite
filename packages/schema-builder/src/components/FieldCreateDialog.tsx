/**
 * FieldCreateDialog — modal form for creating a new tenant_field_definitions row.
 *
 * Controlled dialog: caller manages open state and receives the submitted
 * payload via onSubmit. Uses native HTML form elements (no external dialog lib
 * dependency) so the package stays lightweight.
 *
 * Phase 2 public API — no changes in Phase 3A.
 */

import React, { useState, useCallback } from 'react'
import type { CreateFieldPayload, FieldType } from '../types.js'

export interface FieldCreateDialogProps {
  entityId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateFieldPayload) => Promise<void>
}

const FIELD_TYPES: FieldType[] = [
  'text',
  'integer',
  'numeric',
  'boolean',
  'date',
  'timestamptz',
  'uuid',
]

export function FieldCreateDialog({
  entityId,
  open,
  onOpenChange,
  onSubmit,
}: FieldCreateDialogProps) {
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [nullable, setNullable] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setFieldName('')
    setFieldType('text')
    setNullable(true)
    setSubmitting(false)
    setValidationError(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onOpenChange(false)
  }, [reset, onOpenChange])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setValidationError(null)

      const trimmed = fieldName.trim()
      if (!trimmed) {
        setValidationError('Field name is required.')
        return
      }
      if (!/^[a-z][a-z0-9_]{0,62}$/.test(trimmed)) {
        setValidationError(
          'Field name must start with a lowercase letter and contain only lowercase letters, digits, and underscores (max 63 characters).',
        )
        return
      }

      setSubmitting(true)
      try {
        await onSubmit({ entity_id: entityId, field_name: trimmed, field_type: fieldType, nullable })
        reset()
        onOpenChange(false)
      } catch {
        // errors are surfaced by the caller (controller.onError)
      } finally {
        setSubmitting(false)
      }
    },
    [entityId, fieldName, fieldType, nullable, onSubmit, reset, onOpenChange],
  )

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="fcreate-title" data-testid="field-create-dialog">
      <h2 id="fcreate-title">Add Field</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Field name */}
        <div>
          <label htmlFor="fcreate-name">Field name</label>
          <input
            id="fcreate-name"
            type="text"
            value={fieldName}
            onChange={e => setFieldName(e.target.value)}
            autoFocus
            data-testid="field-name-input"
          />
          {validationError && (
            <span role="alert" data-testid="field-name-error">
              {validationError}
            </span>
          )}
        </div>

        {/* Field type */}
        <div>
          <label htmlFor="fcreate-type">Field type</label>
          <select
            id="fcreate-type"
            value={fieldType}
            onChange={e => setFieldType(e.target.value as FieldType)}
            data-testid="field-type-select"
          >
            {FIELD_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Nullable */}
        <div>
          <label>
            <input
              type="checkbox"
              checked={nullable}
              onChange={e => setNullable(e.target.checked)}
              data-testid="field-nullable-checkbox"
            />
            {' '}Nullable
          </label>
        </div>

        <div>
          <button type="button" onClick={handleClose} data-testid="field-create-cancel">
            Cancel
          </button>
          <button type="submit" disabled={submitting} data-testid="field-create-submit">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
