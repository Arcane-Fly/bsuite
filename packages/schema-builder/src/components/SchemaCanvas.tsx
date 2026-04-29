/**
 * SchemaCanvas — top-level container for the entity field list.
 *
 * Responsibilities:
 *  - Renders a FieldRow for each field in controller.fields.
 *  - Phase 3A: Subscribes to the 'bsuite-reorder-field' CustomEvent (bubbles
 *    from FieldRow pencil button via Alt+ArrowUp / Alt+ArrowDown).  When
 *    received, computes the new field order and calls controller.reorderFields.
 *  - Phase 3A: Announces the result via a visually-hidden role="status"
 *    aria-live="polite" region so screen-reader users hear the move.
 *
 * Announcement messages:
 *   "Moved {field name} up"   / "Moved {field name} down"
 *   "Already at top"          / "Already at bottom"
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { SchemaController, ReorderFieldEventDetail } from '../types.js'
import { FieldRow } from './FieldRow.js'

export interface SchemaCanvasProps {
  entityId: string
  controller: SchemaController
  onEditField: (fieldId: string) => void
  onCreateField?: () => void
}

export function SchemaCanvas({
  entityId,
  controller,
  onEditField,
  onCreateField,
}: SchemaCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = useState('')

  // ---------------------------------------------------------------------------
  // Phase 3A: handle bsuite-reorder-field events
  // ---------------------------------------------------------------------------
  const handleReorderEvent = useCallback(
    (e: Event) => {
      const { entityId: evtEntityId, fieldId, direction } =
        (e as CustomEvent<ReorderFieldEventDetail>).detail

      // Only handle events for this canvas's entity
      if (evtEntityId !== entityId) return

      const { fields } = controller
      const currentIndex = fields.findIndex(f => f.id === fieldId)
      if (currentIndex === -1) return

      const field = fields[currentIndex]

      // Boundary checks
      if (direction === 'up' && currentIndex === 0) {
        setAnnouncement('Already at top')
        return
      }
      if (direction === 'down' && currentIndex === fields.length - 1) {
        setAnnouncement('Already at bottom')
        return
      }

      // Build new ordered id array
      const newFields = [...fields]
      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      ;[newFields[currentIndex], newFields[swapIndex]] = [
        newFields[swapIndex],
        newFields[currentIndex],
      ]
      const newFieldIds = newFields.map(f => f.id)

      const directionLabel = direction === 'up' ? 'up' : 'down'
      setAnnouncement(`Moved ${field.field_name} ${directionLabel}`)

      controller.reorderFields(entityId, newFieldIds).catch(() => {
        // Rollback is handled by the controller; clear any stale announcement
        setAnnouncement('')
      })
    },
    [entityId, controller],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('bsuite-reorder-field', handleReorderEvent)
    return () => {
      el.removeEventListener('bsuite-reorder-field', handleReorderEvent)
    }
  }, [handleReorderEvent])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const { fields, loading, error } = controller

  return (
    <div ref={containerRef} data-testid="schema-canvas">
      {/* ARIA live region for keyboard reorder announcements */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="reorder-announcement"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {announcement}
      </span>

      {loading && <p data-testid="loading-indicator">Loading…</p>}
      {error  && <p role="alert" data-testid="error-message">{error}</p>}

      {!loading && !error && fields.length === 0 && (
        <p data-testid="empty-message">No fields defined yet.</p>
      )}

      {fields.map((field, index) => (
        <FieldRow
          key={field.id}
          field={field}
          entityId={entityId}
          fieldIndex={index}
          totalFields={fields.length}
          onEdit={onEditField}
        />
      ))}

      {onCreateField && (
        <button
          type="button"
          onClick={onCreateField}
          data-testid="add-field-button"
        >
          Add field
        </button>
      )}
    </div>
  )
}
