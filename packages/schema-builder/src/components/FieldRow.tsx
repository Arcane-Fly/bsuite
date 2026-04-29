/**
 * FieldRow — a single column row inside an EntityNode.
 *
 * Reference: `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`
 * §3.6 item 1 (column-level handles).
 *
 * Each row exposes FOUR React Flow Handles (left-target, left-source,
 * right-target, right-source) so the user can drag from any column to any
 * other column's handle. Handle IDs follow the canonical pattern
 * `${entityId}.${fieldId}.${side}-${kind}` so SchemaCanvas#onConnect can parse
 * them back into `source_field_id` / `target_field_id` on the relation row.
 *
 * Phase 2 edit affordance:
 *   - A real `<button>` child (pencil icon) with `aria-label="Edit field X"`
 *     is rendered on editable rows. This is the canonical focusable element
 *     assistive tech and Playwright use to trigger the edit flow.
 *   - A whole-row `onDoubleClick` handler fires the same event for mouse
 *     users who remember the "double-click to edit" convention.
 *   - The outer `<div>` does NOT have `role="button"`. ARIA forbids
 *     interactive descendants (React Flow Handles) inside a role=button,
 *     and the browser cannot compute an accessible name from a wrapper
 *     that also contains truncated text + badges. The inner button is the
 *     correct accessibility surface.
 *
 * Memoised — large entities with 30+ fields would otherwise re-render every
 * row on every node drag.
 */

import { Handle, Position } from '@xyflow/react';
import { Key, Pencil } from 'lucide-react';
import { memo } from 'react';

import type { EntityField } from '../schemas.js';

/**
 * Row shape for a column inside an EntityNode. Aliased to the Zod-derived
 * `EntityField` type so that the FieldRow view and the Zod schema source of
 * truth never drift. If you need to extend the field shape, update
 * `EntityFieldSchema` in `schemas.ts`.
 */
export type FieldRowField = EntityField;

export interface FieldRowProps {
  entityId: string;
  field: FieldRowField;
  isSystemEntity?: boolean;
}

const HANDLE_CLASS =
  '!h-2 !w-2 !bg-neutral-400 !border !border-white dark:!border-neutral-900';

function truncateType(t: string, max = 12): string {
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}\u2026`;
}

function dispatchEditEvent(entityId: string, fieldId: string) {
  window.dispatchEvent(
    new CustomEvent('bsuite-edit-field', {
      detail: { entityId, fieldId },
    }),
  );
}

function FieldRowImpl({ entityId, field, isSystemEntity }: FieldRowProps) {
  const baseId = `${entityId}.${field.id}`;
  const showNotNull = !field.isNullable && !field.isPrimary;
  // Primary keys and system entities are read-only; they don't get the
  // pencil button or the double-click handler.
  const isEditable = !field.isPrimary && !isSystemEntity;

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isEditable) return;
    // Stop React Flow's node-level doubleclick from also firing, which
    // would open the EntityPropertiesPanel on top of the edit dialog.
    e.stopPropagation();
    dispatchEditEvent(entityId, field.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatchEditEvent(entityId, field.id);
  };

  return (
    <div
      className={`nodrag relative flex h-7 items-center gap-2 px-3 text-[11px] last:rounded-b-xl ${
        isEditable ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60' : ''
      }`}
      data-field-id={field.id}
      data-system={isSystemEntity ? 'true' : undefined}
      onDoubleClick={handleDoubleClick}
    >
      {/* Left side handles */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${baseId}.left-target`}
        className={HANDLE_CLASS}
        aria-label={`Target handle for ${field.name}`}
      />
      <Handle
        type="source"
        position={Position.Left}
        id={`${baseId}.left-source`}
        className={HANDLE_CLASS}
        aria-label={`Source handle for ${field.name}`}
      />

      <span className="inline-flex w-4 shrink-0 items-center justify-center">
        {field.isPrimary ? (
          <Key className="h-3 w-3 text-amber-500" aria-label="Primary key" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1 truncate font-mono text-neutral-700 dark:text-neutral-200">
        {field.name}
        {showNotNull ? (
          <span
            className="ml-1 text-[9px] font-semibold text-red-500"
            aria-label="not nullable"
          >
            NOT NULL
          </span>
        ) : null}
      </span>

      <span
        className="shrink-0 font-mono text-[10px] uppercase text-neutral-400"
        title={field.type}
      >
        {truncateType(field.type)}
      </span>

      {isEditable ? (
        <button
          type="button"
          onClick={handleEditClick}
          aria-label={`Edit field ${field.name}`}
          title={`Edit field ${field.name}`}
          className="nodrag inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-neutral-500 opacity-50 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-400"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}

      {/* Right side handles */}
      <Handle
        type="target"
        position={Position.Right}
        id={`${baseId}.right-target`}
        className={HANDLE_CLASS}
        aria-label={`Target handle for ${field.name}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${baseId}.right-source`}
        className={HANDLE_CLASS}
        aria-label={`Source handle for ${field.name}`}
      />
    </div>
  );
}

export const FieldRow = memo(FieldRowImpl);
FieldRow.displayName = 'FieldRow';
