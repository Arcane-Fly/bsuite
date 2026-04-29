/**
 * FieldEditDialog — modal form for editing an existing tenant_field_definitions row.
 *
 * Controlled dialog: caller manages open state and receives the updated
 * payload via onSubmit. Pre-fills form with the current field values.
 *
 * Phase 2 public API — no changes in Phase 3A.
 *
 * JSDoc caveat (Phase 2): editing field_name updates the metadata row only.
 * It does NOT rename the underlying Postgres column. Raw-SQL consumers must
 * be updated manually after a field_name change. This gap is addressed in
 * Phase 3B which adds an opt-in dry-run ALTER TABLE RENAME COLUMN path.
 */

import React, { useState, useCallback, useEffect } from 'react'
import type { EntityField, UpdateFieldPayload, FieldType } from '../types.js'

export interface FieldEditDialogProps {
  /** The field to edit. When null, the dialog renders nothing. */
  field: EntityField | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (fieldId: string, payload: UpdateFieldPayload) => Promise<void>
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

export function FieldEditDialog({
  field,
  open,
  onOpenChange,
  onSubmit,
}: FieldEditDialogProps) {
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [nullable, setNullable] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Sync form state when the field prop changes or the dialog opens
  useEffect(() => {
    if (field && open) {
      setFieldName(field.field_name)
      setFieldType(field.field_type)
      setNullable(field.nullable)
      setValidationError(null)
    }
  }, [field, open])

  const handleClose = useCallback(() => {
    setValidationError(null)
    setSubmitting(false)
    onOpenChange(false)
  }, [onOpenChange])

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

      if (!field) return

      const payload: UpdateFieldPayload = {
        field_name: trimmed,
        field_type: fieldType,
        nullable,
      }

      setSubmitting(true)
      try {
        await onSubmit(field.id, payload)
        onOpenChange(false)
      } catch {
        // errors are surfaced by the caller (controller.onError)
      } finally {
        setSubmitting(false)
      }
    },
    [field, fieldName, fieldType, nullable, onSubmit, onOpenChange],
  )

  if (!open || !field) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="fedit-title" data-testid="field-edit-dialog">
      <h2 id="fedit-title">Edit Field</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Field name */}
        <div>
          <label htmlFor="fedit-name">Field name</label>
          <input
            id="fedit-name"
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
          <label htmlFor="fedit-type">Field type</label>
          <select
            id="fedit-type"
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
          <button type="button" onClick={handleClose} data-testid="field-edit-cancel">
            Cancel
          </button>
          <button type="submit" disabled={submitting} data-testid="field-edit-submit">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
