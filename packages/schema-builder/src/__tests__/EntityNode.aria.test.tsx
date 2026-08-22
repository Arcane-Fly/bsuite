import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

/*
 * Mock React Flow's Handle so EntityNode renders without a provider.
 *
 * Spreads `...rest` onto the div, matching @xyflow/react 12.11.2's real
 * behaviour — its Handle body is `jsx("div", { "data-handleid": ..., ...rest })`
 * with NO aria-label of its own. Cherry-picking named props here would hide
 * exactly the defect these tests guard.
 */
vi.mock('@xyflow/react', () => ({
  Handle: ({
    id,
    type,
    className,
    ...rest
  }: {
    id?: string;
    type: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="mock-handle"
      data-handle-id={id}
      data-handle-type={type}
      className={className}
      {...rest}
    />
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
 * ARIA contract for the entity card — crm7#1770.
 *
 * The crm7 WCAG AA E2E gate (tests/e2e/wcag-aa.spec.ts) fails a route on ANY
 * serious/critical axe violation. /settings/schema-builder was blocked in both
 * themes by three rules, all originating here rather than in React Flow:
 *
 *   aria-prohibited-attr   (serious)  — `aria-label` on the role-less
 *                                       `<div class="react-flow__handle">`
 *                                       that @xyflow/react renders. ~14,016
 *                                       nodes: four handles x every field row
 *                                       x every entity.
 *   aria-required-children (critical) — `role="list"` whose children were
 *                                       plain divs, not listitems.
 *   aria-allowed-attr      (critical) — `aria-selected` on `role="group"`,
 *                                       which ARIA does not permit there.
 *
 * These assertions are structural rather than an axe run so the package keeps
 * no axe dependency; the authoritative axe check stays in crm7's E2E gate,
 * which exercises the real rendered page.
 */
describe('EntityNode ARIA contract', () => {
  const entity = {
    id: 'entity-1',
    tenant_id: null,
    slug: 'contact',
    label: 'Contact',
    is_system: false,
  } as never;

  const fields = [
    { id: 'f1', name: 'email', type: 'text', isPrimary: false, isNullable: true },
    { id: 'f2', name: 'first_name', type: 'text', isPrimary: false, isNullable: false },
    { id: 'f3', name: 'id', type: 'uuid', isPrimary: true, isNullable: false },
  ];

  const renderNode = (selected: boolean) =>
    render(
      <div data-testid="rf-node">
        <EntityNode
          {...({
            data: { label: 'Contact', entity, fields },
            selected,
          } as unknown as React.ComponentProps<typeof EntityNode>)}
        />
      </div>,
    );

  const rootOf = (getByTestId: (id: string) => HTMLElement) =>
    getByTestId('rf-node').firstElementChild as HTMLElement;

  it('card root never uses aria-selected, which role=group forbids', () => {
    for (const selected of [true, false]) {
      const { getByTestId, unmount } = renderNode(selected);
      const root = rootOf(getByTestId);
      expect(root.getAttribute('role')).toBe('group');
      expect(root.getAttribute('aria-selected')).toBeNull();
      unmount();
    }
  });

  it('conveys selection with aria-current, which role=group allows', () => {
    const { getByTestId, unmount } = renderNode(true);
    expect(rootOf(getByTestId).getAttribute('aria-current')).toBe('true');
    unmount();

    const { getByTestId: getUnselected } = renderNode(false);
    expect(rootOf(getUnselected).getAttribute('aria-current')).toBeNull();
  });

  it('every child of the role=list field container is a listitem', () => {
    const { container } = renderNode(false);
    const list = container.querySelector('[role="list"]');
    expect(list).not.toBeNull();
    const children = Array.from((list as HTMLElement).children);
    expect(children).toHaveLength(fields.length);
    for (const child of children) {
      expect(child.getAttribute('role')).toBe('listitem');
    }
  });

  it('no handle anywhere in the card carries a prohibited aria-label', () => {
    const { getAllByTestId } = renderNode(false);
    const handles = getAllByTestId('mock-handle');
    // 4 per field row + the entity-level handles on the card itself.
    expect(handles.length).toBeGreaterThanOrEqual(fields.length * 4);
    for (const h of handles) {
      expect(h.getAttribute('aria-label')).toBeNull();
    }
  });
});
