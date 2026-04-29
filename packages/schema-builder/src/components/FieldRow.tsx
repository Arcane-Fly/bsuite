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
 * Memoised — large entities with 30+ fields would otherwise re-render every
 * row on every node drag.
 */

import { Handle, Position } from '@xyflow/react';
import { Key } from 'lucide-react';
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

function FieldRowImpl({ entityId, field, isSystemEntity }: FieldRowProps) {
  const baseId = `${entityId}.${field.id}`;
  const showNotNull = !field.isNullable && !field.isPrimary;

  return (
    <div
      className="nodrag relative flex h-7 items-center gap-2 px-3 text-[11px] last:rounded-b-xl"
      data-field-id={field.id}
      data-system={isSystemEntity ? 'true' : undefined}
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
