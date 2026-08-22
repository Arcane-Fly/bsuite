import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock React Flow's Handle so EntityNode renders without a provider.
vi.mock('@xyflow/react', () => ({
  Handle: ({ id, type, className }: { id?: string; type: string; className?: string }) => (
    <div data-testid="mock-handle" data-handle-id={id} data-handle-type={type} className={className} />
  ),
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  // EntityNode reads the live zoom for level-of-detail. Tests that assert the
  // FULL card must sit above the 0.7 field band, or they assert the collapsed
  // card and pass for the wrong reason.
  useStore: (selector: (s: { transform: [number, number, number] }) => unknown) =>
    selector({ transform: [0, 0, 1] }),
}));

import { EntityNode } from '../components/EntityNode.js';

/**
 * Guards the drag filter, which is the thing that silently broke.
 *
 * SchemaCanvas sets `dragHandle: '.schema-node-drag-handle'`, and React Flow
 * decides whether a pointerdown may start a drag with:
 *
 *   !hasSelector(target, '.nodrag', domNode) && hasSelector(target, dragHandle, domNode)
 *
 * `hasSelector` walks from the event target UP to the node element. So ANY
 * `nodrag` on an ancestor of the grip — including the card root — vetoes the
 * drag before `dragHandle` is consulted. That shipped: every entity card was
 * completely immovable while still rendering a grab cursor and a "drag the
 * header grip to move" tooltip, and nothing failed loudly because a filtered
 * drag is indistinguishable from a user who simply did not drag.
 *
 * This reproduces React Flow's own upward walk rather than asserting on one
 * hard-coded element, so re-nesting the header inside a new `nodrag` wrapper
 * fails here too.
 */
function hasNodragAncestor(from: Element, stopAt: Element): boolean {
  let cur: Element | null = from;
  while (cur) {
    if (cur.matches('.nodrag')) return true;
    if (cur === stopAt) return false;
    cur = cur.parentElement;
  }
  return false;
}

describe('EntityNode drag filter', () => {
  const entity = {
    id: 'entity-1',
    tenant_id: null,
    slug: 'contact',
    label: 'Contact',
    is_system: true,
  } as never;

  const renderNode = () =>
    render(
      <div data-testid="rf-node">
        <EntityNode
          {...({
            data: { label: 'Contact', entity, fields: [] },
            selected: false,
          } as unknown as React.ComponentProps<typeof EntityNode>)}
        />
      </div>,
    );

  it('exposes exactly one drag handle', () => {
    const { container } = renderNode();
    expect(container.querySelectorAll('.schema-node-drag-handle')).toHaveLength(1);
  });

  it('drag handle has NO nodrag ancestor, so React Flow will not veto the drag', () => {
    const { container, getByTestId } = renderNode();
    const handle = container.querySelector('.schema-node-drag-handle');
    expect(handle).not.toBeNull();
    expect(hasNodragAncestor(handle as Element, getByTestId('rf-node'))).toBe(false);
  });

  it('card root itself carries no nodrag', () => {
    const { getByTestId } = renderNode();
    const root = getByTestId('rf-node').firstElementChild as Element;
    expect(root.classList.contains('nodrag')).toBe(false);
  });
});
