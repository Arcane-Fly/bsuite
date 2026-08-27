import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position, useStore } from '@xyflow/react';
import { Database, FileText, GripVertical } from 'lucide-react';
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

/**
 * LEVEL OF DETAIL — what the card draws, by zoom band.
 *
 * There was none of this before, and the consequence was the operator's
 * headline complaint. 44 entities do not fit a 900px viewport at any zoom the
 * library will allow, so `fitView` bottomed out at scale 0.5 and every card
 * rendered its full detail at half size: card title 7 device px, field name
 * 5.5, field type 5, the NOT NULL badge 4.5. All of it unreadable, and one of
 * those strings was mis-transcribed in the original defect report — at 5px
 * even a careful reader guesses.
 *
 * Shrinking type is not the answer to a crowded diagram; drawing LESS is. Below
 * the thresholds a card stops pretending to show rows it cannot show, and
 * spends its pixels on the one thing that is legible and useful at that scale —
 * its name.
 *
 * The bands are expressed in RENDERED px: a 10px label at zoom 0.4 is 4 device
 * px, which is the number that actually matters.
 */
const LOD_FIELDS_VISIBLE = 0.7;
const LOD_META_VISIBLE = 0.35;

export function EntityNode({ data, selected }: NodeProps<EntityNodeType>) {
  const entity = data.entity;
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(entity.label);
  // transform is [x, y, zoom]. Subscribing to just the scalar keeps this from
  // re-rendering 44 cards on every pan.
  const zoom = useStore((s) => s.transform[2]);
  const showFields = zoom >= LOD_FIELDS_VISIBLE;
  const showMeta = zoom >= LOD_META_VISIBLE;

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
  //
  // crm7#1770: the root uses `aria-current`, NOT `aria-selected`.
  // `aria-selected` is not an allowed attribute on role=group — ARIA permits
  // it only on gridcell/option/row/tab/columnheader/rowheader/treeitem — so
  // every entity card raised a critical axe `aria-allowed-attr` violation and
  // blocked the WCAG gate on /settings/schema-builder. `aria-current` conveys
  // the same "this is the active card" meaning and is valid on role=group;
  // both facts were verified against axe-core 4.12.1, the exact version
  // @axe-core/playwright 4.12.1 resolves for the E2E suite.
  return (
    <div
      role="group"
      aria-label={`Entity: ${entity.label}${
        entity.is_system ? ' (system)' : ''
      }`}
      aria-current={selected ? 'true' : undefined}
      tabIndex={0}
      title="Click to inspect fields. Drag the header grip to move. Drag a blue connector dot to another entity to create a relationship."
      // `border-border` measured 2.26:1 dark and 1.27:1 light against the
      // canvas — below 1.4.11's 3:1, i.e. the card edge was not reliably
      // visible at all. This card is an interactive object (click, drag,
      // connect), so it belongs on the interactive boundary token, which
      // measures 5.95:1 dark / 4.39:1 light.
      // `shadow-md` is ACHROMATIC INK. In dark mode it resolves to ambient
      // shadow at chroma 0.0166 — below the 0.05 floor a glow has to clear to
      // read as separation — so all 45 entity cards sat flat against the
      // canvas with only their border to distinguish them. A shadow tuned for
      // a light canvas does nothing on a dark one; it is not a weaker effect,
      // it is no effect.
      //
      // `--glow-card` is the estate's answer and is already the pattern in
      // @bsuite/page-builder's grid surface. It is accent-derived via
      // color-mix on `--card-glow-source`, so a tenant's BrandingProvider
      // override re-colours it automatically, and it is `none` at :root — so
      // light mode keeps `shadow-md` untouched and the utility degrades safely
      // wherever the dark class is absent.
      //
      // Composes with the selected ring: Tailwind v4 gives `shadow-[…]` the
      // `--tw-shadow` slot and `ring-2` the `--tw-ring-shadow` slot, so a
      // selected card in dark mode paints both, not one instead of the other.
      className={`relative min-w-[240px] rounded-xl border bg-card shadow-md dark:shadow-[var(--glow-card,none)] transition-all ${
        selected
          ? 'border-transparent ring-2 ring-ring ring-offset-2'
          : 'border-border-interactive'
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
        aria-hidden="true"
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

      {showMeta ? (
        <div className="truncate border-b border-border px-3 py-1 font-mono text-[10px] text-muted-foreground">
          {entity.name}
        </div>
      ) : null}

      {!showFields ? (
        // Zoomed out. Rows would be sub-pixel noise that inflate the card and
        // therefore the diagram that already will not fit, so summarise
        // instead. The count still answers "is there anything in here".
        showMeta ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {hasFields
              ? `${fields.length} ${fields.length === 1 ? 'field' : 'fields'}`
              : 'No custom fields yet'}
          </div>
        ) : null
      ) : hasFields ? (
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

      {/* This footer used to carry two things, both removed.
       *
       * "Drag blue dots to connect entities." was rendered on EVERY card — 44
       * copies of one sentence, at 5 device px where it could not be read, each
       * adding height to a diagram that already overflowed. One instruction
       * belongs in one place; it now lives on the toolbar.
       *
       * "Add to Page" dispatched a `bsuite-add-entity-widget` CustomEvent that
       * NOTHING listens for — verified across every package and all six apps.
       * Its unit test asserted only that dispatch was called, which is true and
       * meaningless. A control wired to nothing is worse than no control: it
       * spends the user's attention and returns silence. It comes back when a
       * listener exists.
       */}

      <Handle
        type="source"
        position={Position.Bottom}
        id={`${entity.id}.entity.bottom-source`}
        className={entityHandleClass}
        aria-hidden="true"
        title={`Drag from ${entity.label} to create a relationship`}
      />
    </div>
  );
}
