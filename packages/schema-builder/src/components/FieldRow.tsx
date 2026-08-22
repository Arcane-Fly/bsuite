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
 *   - The outer `<div>` DOES carry `role="listitem"`. EntityNode wraps the
 *     rows in a `role="list"` container, and `list` requires `listitem`
 *     children — without it every entity card raised a critical axe
 *     `aria-required-children` violation (crm7#1770).
 *
 * Handle accessibility (crm7#1770):
 *   The four Handles are `aria-hidden="true"`, NOT labelled. @xyflow/react
 *   12.11.2 renders `<Handle>` as a role-less `<div>` and spreads caller
 *   props straight onto it (node_modules/@xyflow/react/dist/esm/index.js —
 *   the Handle return is `jsx("div", { "data-handleid": ..., ...rest })`;
 *   it adds NO aria-label of its own). `aria-label` on a generic-role
 *   element is prohibited by ARIA and is never exposed by assistive tech,
 *   so the labels we used to pass were inert — they announced nothing while
 *   producing ~14k serious axe `aria-prohibited-attr` violations on
 *   /settings/schema-builder (four per field row, on every entity).
 *   `aria-hidden` states the truth: these are mouse-drag-only affordances
 *   with no keyboard or AT path. `title` is retained for the mouse tooltip.
 *   NOTE: there is currently NO accessible (keyboard/AT) way to create a
 *   relationship — RelationshipConfigDialog only opens from a pointer-drag
 *   `onConnect`. That gap is real and tracked separately; hiding the
 *   handles does not shrink it, it just stops the DOM from claiming an
 *   affordance assistive tech could never reach.
 *
 * Memoised — large entities with 30+ fields would otherwise re-render every
 * row on every node drag.
 */

import { Handle, Position, useStore } from '@xyflow/react';
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

/**
 * CONNECT TARGET SIZING — WCAG 2.5.8 (AA, 24x24 minimum).
 *
 * These were `!h-3 !w-3`: 12 CSS px, which at the canvas's effective zoom of
 * 0.5 rendered as SIX DEVICE PIXELS. Four times below the floor. Drag-to-relate
 * was correctly wired the whole time — the gesture worked — but the target was
 * essentially unhittable, which is why the surface read as having no primary
 * action at all.
 *
 * The fix separates the HIT AREA from the PAINTED DOT. A 6px dot with a 24px
 * transparent hit box is easy to hit and still looks like a small connector;
 * growing the dot itself to 24px would have put a large blob on every field of
 * every card.
 *
 * Both are divided by the live zoom so the numbers hold in DEVICE pixels rather
 * than CSS pixels — the unit the user's finger and the success criterion both
 * actually work in. The hit box is clamped so it cannot grow wide enough to
 * overlap the neighbouring row's target when zoomed out.
 */
const HIT_TARGET_DEVICE_PX = 24;
const DOT_DEVICE_PX = 10;
const MAX_HIT_CSS_PX = 34;

export function handleSizing(zoom: number): {
  hit: number;
  dot: number;
} {
  const safeZoom = zoom > 0 ? zoom : 1;
  const hit = Math.min(HIT_TARGET_DEVICE_PX / safeZoom, MAX_HIT_CSS_PX);
  // The dot needs the same clamp as the hit box, and for the same reason.
  // Inverse-scaling it alone meant that once `hit` hit its ceiling the dot kept
  // growing past it — at zoom 0.05 a 200px dot inside a 34px target. Capping it
  // at half the hit box keeps the painted dot inside the thing being aimed at
  // at every zoom, which is the invariant that makes the split meaningful.
  const dot = Math.min(DOT_DEVICE_PX / safeZoom, hit / 2);
  return { hit, dot };
}

/** Transparent, larger than the dot, and the thing the pointer actually hits. */
const HANDLE_CLASS =
  '!bg-transparent !border-0 !rounded-full !opacity-100 group/handle';

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

function dispatchReorderEvent(
  entityId: string,
  fieldId: string,
  direction: 'up' | 'down',
) {
  window.dispatchEvent(
    new CustomEvent('bsuite-reorder-field', {
      detail: { entityId, fieldId, direction },
    }),
  );
}

function FieldRowImpl({ entityId, field, isSystemEntity }: FieldRowProps) {
  // Subscribe to the zoom scalar only. `handleSizing` converts the WCAG floor,
  // which is stated in device px, into the CSS px this element must declare.
  const zoom = useStore((s) => s.transform[2]);
  const { hit, dot } = handleSizing(zoom);
  const hitStyle = { width: `${hit}px`, height: `${hit}px` };
  const dotStyle = { width: `${dot}px`, height: `${dot}px` };
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

  /**
   * Phase 3A keyboard reorder — Alt+ArrowUp / Alt+ArrowDown while the edit
   * button is focused dispatches a `bsuite-reorder-field` event that
   * SchemaCanvas resolves into a `controller.reorderFields` RPC call. The
   * handler lives on the button (not the row div) so React Flow's own
   * arrow-key behaviour on the surrounding canvas stays intact.
   */
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      dispatchReorderEvent(entityId, field.id, 'up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      dispatchReorderEvent(entityId, field.id, 'down');
    }
  };

  return (
    <div
      role="listitem"
      className={`nodrag relative flex h-7 items-center gap-2 px-3 text-[11px] last:rounded-b-xl ${
        isEditable ? 'hover:bg-card dark:hover:bg-muted/60' : ''
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
        aria-hidden="true"
        title={`Drop a relationship onto ${field.name}`}
              style={hitStyle}
      >
        <span
          aria-hidden="true"
          style={dotStyle}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card bg-role-primary opacity-80 transition-transform group-hover/handle:scale-150 group-hover/handle:opacity-100"
        />
      </Handle>
      <Handle
        type="source"
        position={Position.Left}
        id={`${baseId}.left-source`}
        className={HANDLE_CLASS}
        aria-hidden="true"
        title={`Drag from ${field.name} to create a relationship`}
              style={hitStyle}
      >
        <span
          aria-hidden="true"
          style={dotStyle}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card bg-role-primary opacity-80 transition-transform group-hover/handle:scale-150 group-hover/handle:opacity-100"
        />
      </Handle>

      <span className="inline-flex w-4 shrink-0 items-center justify-center">
        {field.isPrimary ? (
          <Key className="h-3 w-3 text-warning-text" aria-label="Primary key" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1 truncate font-mono text-text-secondary">
        {field.name}
        {showNotNull ? (
          <span
            className="ml-1 text-[9px] font-semibold text-error-text"
            aria-label="not nullable"
          >
            NOT NULL
          </span>
        ) : null}
      </span>

      <span
        className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground"
        title={field.type}
      >
        {truncateType(field.type)}
      </span>

      {isEditable ? (
        <button
          type="button"
          onClick={handleEditClick}
          onKeyDown={handleEditKeyDown}
          aria-label={`Edit field ${field.name}`}
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
          title={`Edit field ${field.name} (Alt+\u2191 / Alt+\u2193 to reorder)`}
          className="nodrag inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-50 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
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
        aria-hidden="true"
        title={`Drop a relationship onto ${field.name}`}
              style={hitStyle}
      >
        <span
          aria-hidden="true"
          style={dotStyle}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card bg-role-primary opacity-80 transition-transform group-hover/handle:scale-150 group-hover/handle:opacity-100"
        />
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        id={`${baseId}.right-source`}
        className={HANDLE_CLASS}
        aria-hidden="true"
        title={`Drag from ${field.name} to create a relationship`}
              style={hitStyle}
      >
        <span
          aria-hidden="true"
          style={dotStyle}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card bg-role-primary opacity-80 transition-transform group-hover/handle:scale-150 group-hover/handle:opacity-100"
        />
      </Handle>
    </div>
  );
}

export const FieldRow = memo(FieldRowImpl);
FieldRow.displayName = 'FieldRow';
