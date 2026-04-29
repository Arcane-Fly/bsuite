import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Database, FileText, PlusSquare } from 'lucide-react';

import type { EntityNodeData as ZodEntityNodeData } from '../schemas.js';
import type { TenantEntity } from '../types.js';

/**
 * Runtime data for the React Flow node. Intentionally wider than the Zod
 * `EntityNodeDataSchema` because the Phase 1a port carries the full
 * `TenantEntity` row so downstream consumers (properties panel, relation
 * dialog) can read every column without a second Supabase round-trip.
 *
 * Phase 1b will add the `fields[]` array from `ZodEntityNodeData`, at which
 * point the component will render a handle pair per field row per §3.6
 * item 1.
 */
export type EntityNodeData = {
  label: React.ReactNode;
  entity: TenantEntity;
  /** Optional Phase 1b column rows. Zod-validated. Empty in 1a. */
  fields?: ZodEntityNodeData['fields'];
};

export type EntityNodeType = Node<EntityNodeData, 'entity'>;

export function EntityNode({ data, selected }: NodeProps<EntityNodeType>) {
  const entity = data.entity;

  return (
    <div
      role="group"
      aria-label={`Entity: ${entity.label}${
        entity.is_system ? ' (system)' : ''
      }`}
      aria-selected={selected}
      tabIndex={0}
      className={`relative min-w-[200px] rounded-xl border bg-white shadow-md transition-all dark:bg-neutral-900 ${
        selected
          ? 'border-transparent ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900'
          : 'border-neutral-200 dark:border-neutral-700'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 border-2 border-white bg-neutral-500 dark:border-neutral-900"
        aria-label={`Connect to ${entity.label}`}
      />

      <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center gap-2 overflow-hidden">
          <Database className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="truncate text-sm font-semibold">{entity.label}</div>
        </div>
        {entity.is_system ? (
          <span className="h-4 shrink-0 rounded bg-neutral-200 px-1.5 text-[9px] font-medium uppercase leading-4 tracking-wide text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
            SYS
          </span>
        ) : null}
      </div>

      <div className="space-y-2 rounded-b-xl bg-white p-3 dark:bg-neutral-900">
        <div className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {entity.name}
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
          <FileText className="h-3 w-3" />
          <span>{data.fields?.length ?? 0} fields mapped</span>
        </div>

        <button
          type="button"
          className="mt-1 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus:ring-offset-neutral-900"
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent('bsuite-add-entity-widget', {
                detail: { entityType: entity.name, label: entity.label },
              }),
            );
          }}
        >
          <PlusSquare className="h-3 w-3" />
          Add to Page
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 border-2 border-white bg-blue-500 dark:border-neutral-900"
        aria-label={`Connect from ${entity.label}`}
      />
    </div>
  );
}
