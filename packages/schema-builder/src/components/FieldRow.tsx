/**
 * FieldRow — renders a single tenant_field_definitions row.
 *
 * Phase 3A: The pencil button (and the row container when focused) responds
 * to Alt+ArrowUp / Alt+ArrowDown by dispatching a 'bsuite-reorder-field'
 * CustomEvent that bubbles up to the enclosing SchemaCanvas.
 *
 * ARIA:
 *   - aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" on the pencil button
 *   - aria-label describes the field for screen readers
 *
 * Safety:
 *   - No role="button" on non-button elements (ARIA 1.2 §5.2.8.4)
 *   - The pencil button is a native <button> element
 */

import React, { useCallback } from 'react'
import type { EntityField, ReorderFieldEventDetail } from '../types.js'

export interface FieldRowProps {
  field: EntityField
  entityId: string
  fieldIndex: number
  totalFields: number
  onEdit: (fieldId: string) => void
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text:        'Text',
  integer:     'Integer',
  numeric:     'Numeric',
  boolean:     'Boolean',
  date:        'Date',
  timestamptz: 'Timestamp',
  uuid:        'UUID',
}

export function FieldRow({
  field,
  entityId,
  fieldIndex,
  totalFields,
  onEdit,
}: FieldRowProps) {
  const dispatchReorder = useCallback(
    (direction: 'up' | 'down', sourceElement: HTMLElement) => {
      const detail: ReorderFieldEventDetail = {
        entityId,
        fieldId: field.id,
        direction,
      }
      sourceElement.dispatchEvent(
        new CustomEvent<ReorderFieldEventDetail>('bsuite-reorder-field', {
          bubbles:    true,
          cancelable: true,
          detail,
        }),
      )
    },
    [entityId, field.id],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!e.altKey) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        dispatchReorder('up', e.currentTarget)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        dispatchReorder('down', e.currentTarget)
      }
    },
    [dispatchReorder],
  )

  const typeLabel = FIELD_TYPE_LABELS[field.field_type] ?? field.field_type
  const positionLabel = `field ${fieldIndex + 1} of ${totalFields}`

  return (
    <div
      role="row"
      aria-label={`${field.field_name}, ${typeLabel}, ${field.nullable ? 'nullable' : 'required'}, ${positionLabel}`}
      data-field-id={field.id}
      data-testid="field-row"
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}
    >
      <span style={{ flex: 1, fontWeight: 600 }} data-testid="field-name">
        {field.field_name}
      </span>

      <span
        style={{ color: '#666', fontSize: '0.875rem' }}
        aria-label={`type: ${typeLabel}`}
        data-testid="field-type"
      >
        {typeLabel}
      </span>

      <span
        style={{ color: '#888', fontSize: '0.75rem' }}
        aria-label={field.nullable ? 'nullable' : 'required'}
        data-testid="field-nullable"
      >
        {field.nullable ? 'nullable' : 'required'}
      </span>

      {/* Pencil / edit button — Phase 3A: Alt+ArrowUp/Down keyboard shortcuts */}
      <button
        type="button"
        aria-label={`Edit ${field.field_name}`}
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        data-testid="field-edit-button"
        onClick={() => onEdit(field.id)}
        onKeyDown={handleKeyDown}
        style={{ cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px' }}
      >
        {/* Pencil icon (inline SVG avoids icon-library peer dependency) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>
    </div>
  )
}
