import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Database, FileText, GripVertical, Link2, PlusSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { EntityNodeData as ZodEntityNodeData } from '../schemas.js';
import type { TenantEntity } from '../types.js';
import { FieldRow } from './FieldRow.js';

/**
 * Runtime data for the React Flow node. Intentionally wider than the Zod
 * `EntityNodeDataSchema` because the Phase 1a port carries the full
 * `TenantEntity` row so downstream consumers (properties panel, relation
 * dialog) can read every column without a second Supabase round-trip.
 *
 * Phase 1b.2 actively renders `fields[]` as `<FieldRow>` children, each
 * exposing four per-column React Flow handles (§3.6 item 1).
 */
export type EntityNodeData = {
  label: React.ReactNode;
  entity: TenantEntity;
  /** Column rows. Empty/undefined in Phase 1a; populated in Phase 1b.2. */
  fields?: ZodEntityNodeData['fields'];
};

export type EntityNodeType = Node<EntityNodeData, 'entity'>;

export function EntityNode({ data, selected }: NodeProps<EntityNodeType>) {
  const entity = data.entity;
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(entity.label);

  // Reset draft when the entity's label changes externally (e.g. Realtime
  // update from another tab), but only if the user isn't mid-edit.
  useEffect(() => {
    if (!isRenaming) setDraftLabel(entity.label);
  }, [entity.label, isRenaming]);

  const commitRename = () => {
    const trimmed = draftLabel.trim();
    if (trimmed && trimmed !== entity.label) {
      // Dispatch CustomEvent; SchemaCanvas listens and routes to
      // controller.updateEntity so the node stays a pure display component.
      // §3.6 item 7.
      window.dispatchEvent(
        new CustomEvent('bsuite-rename-entity', {
          detail: { entityId: entity.id, newLabel: trimmed },
        }),
      );
    } else {
      // Nothing to commit — revert draft to persisted label.
      setDraftLabel(entity.label);
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setDraftLabel(entity.label);
    setIsRenaming(false);
  };

  const fields = data.fields ?? [];
  const hasFields = fields.length > 0;
  const entityHandleClass =
    '!h-5 !w-5 !border-2 !border-card !bg-role-primary !opacity-90 hover:!opacity-100';

  // The card root deliberately carries NO `nodrag`. React Flow's drag filter is
  //   !hasSelector(target, '.nodrag', domNode) && hasSelector(target, dragHandle, domNode)
  // and `hasSelector` walks from the event target UP to the node element, so a
  // `nodrag` here is an ancestor of the header grip and vetoed every drag before
  // `dragHandle` was ever consulted. The cards were completely immovable while
  // still showing a grab cursor and a "drag the header grip to move" tooltip.
  // The body does not need it: the `dragHandle` clause already means ONLY the
  // header can start a drag. Interactive children (FieldRow, the rename input)
  // carry their own `nodrag`, which is where it belongs.
  return (
    <div
      role="group"
      aria-label={`Entity: ${entity.label}${
        entity.is_system ? ' (system)' : ''
      }`}
      aria-selected={selected}
      tabIndex={0}
      title="Click to inspect fields. Drag the header grip to move. Drag a blue connector dot to another entity to create a relationship."
      className={`relative min-w-[240px] rounded-xl border bg-card shadow-md transition-all ${
        selected
          ? 'border-transparent ring-2 ring-ring ring-offset-2'
          : 'border-border'
      }`}
    >
      {/* Entity-level fallback handles. Used when user drags from the card
          body rather than a specific field row. Given explicit IDs so React
          Flow can distinguish them from field-level handles. */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${entity.id}.entity.top-target`}
        className={entityHandleClass}
        aria-label={`Entity-level target connector for ${entity.label}`}
        title={`Drop a relationship onto ${entity.label}`}
      />

      <div className="schema-node-drag-handle flex cursor-grab items-center justify-between gap-3 rounded-t-xl border-b border-border bg-card p-3 active:cursor-grabbing">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Drag entity" />
          <Database className="h-4 w-4 shrink-0 text-primary-text" />
          {isRenaming ? (
            <input
              autoFocus
              type="text"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={commitRename}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                // Stop React Flow from intercepting these keys while renaming
                // (Delete/Backspace would otherwise remove the node).
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              aria-label={`Rename ${entity.label}`}
              className="nodrag min-w-0 flex-1 rounded bg-transparent px-1 text-sm font-semibold text-foreground outline-none ring-1 ring-ring"
            />
          ) : (
            <div
              className="truncate text-sm font-semibold"
              onDoubleClick={(e) => {
                // Stop-propagation CRITICAL so the canvas's onNodeDoubleClick
                // (which opens the properties panel) doesn't also fire when
                // the user specifically double-clicks the label for rename.
                e.stopPropagation();
                if (!entity.is_system) setIsRenaming(true);
              }}
              title={
                entity.is_system ? undefined : 'Double-click to rename'
              }
            >
              {entity.label}
            </div>
          )}
        </div>
        {entity.is_system ? (
          <span
            className="h-4 shrink-0 rounded bg-muted px-1.5 text-[9px] font-medium uppercase leading-4 tracking-wide text-text-secondary"
            title="System entity: built-in object managed by the platform"
            aria-label="System entity"
          >
            SYS
          </span>
        ) : null}
      </div>

      <div className="truncate border-b border-border px-3 py-1 font-mono text-[10px] text-muted-foreground">
        {entity.name}
      </div>

      {hasFields ? (
        <div
          className="divide-y divide-border"
          role="list"
          aria-label={`${fields.length} fields`}
        >
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              entityId={entity.id}
              field={field}
              isSystemEntity={entity.is_system}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>No custom fields yet</span>
        </div>
      )}

      <div className="rounded-b-xl bg-card p-2">
        <div className="mb-2 rounded-md border border-role-primary/40 bg-role-primary/10 px-2 py-1 text-[10px] text-primary-text">
          <span className="inline-flex items-center gap-1 font-medium">
            <Link2 className="h-3 w-3" aria-hidden="true" />
            Drag blue dots to connect entities.
          </span>
        </div>
        <button
          type="button"
          title={`Add ${entity.label} as a widget to a custom page layout`}
          className="inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card text-xs font-medium text-text-secondary hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 dark:hover:bg-muted dark:focus:ring-offset-background"
          onClick={(event) => {
            event.stopPropagation();
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
        id={`${entity.id}.entity.bottom-source`}
        className={entityHandleClass}
        aria-label={`Entity-level source connector for ${entity.label}`}
        title={`Drag from ${entity.label} to create a relationship`}
      />
    </div>
  );
}
