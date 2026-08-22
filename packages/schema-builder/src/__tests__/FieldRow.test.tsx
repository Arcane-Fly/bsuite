import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

/*
 * Mock React Flow's Handle so we can render FieldRow without a provider.
 *
 * The mock SPREADS `...rest` onto the div rather than cherry-picking named
 * props. That mirrors what @xyflow/react 12.11.2 actually does — its Handle
 * body is `jsx("div", { "data-handleid": ..., ...rest })` — so aria/`title`
 * props land on the DOM here exactly as they do in production, and the mock
 * does not silently drop a prop the component starts passing later.
 */
vi.mock('@xyflow/react', () => ({
  Handle: ({
    id,
    type,
    position,
    className,
    ...rest
  }: {
    id?: string;
    type: string;
    position: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="mock-handle"
      data-handle-id={id}
      data-handle-type={type}
      data-handle-position={position}
      className={className}
      {...rest}
    />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
  // FieldRow converts the WCAG device-px target floor into CSS px using the
  // live zoom, so it subscribes to the transform scalar.
  useStore: (selector: (s: { transform: [number, number, number] }) => unknown) =>
    selector({ transform: [0, 0, 1] }),
}));

import { FieldRow } from '../components/FieldRow.js';

describe('FieldRow', () => {
  const baseField = {
    id: 'field-1',
    name: 'email',
    type: 'text',
    isPrimary: false,
    isNullable: true,
  };

  it('renders field name and type', () => {
    const { getByText, container } = render(
      <FieldRow entityId="entity-1" field={baseField} />,
    );
    expect(getByText('email')).toBeDefined();
    expect(container.textContent).toContain('text');
  });

  it('renders exactly 4 handles with canonical IDs', () => {
    const { getAllByTestId } = render(
      <FieldRow entityId="entity-1" field={baseField} />,
    );
    const handles = getAllByTestId('mock-handle');
    expect(handles).toHaveLength(4);
    const ids = handles.map((h) => h.getAttribute('data-handle-id'));
    expect(ids).toEqual(
      expect.arrayContaining([
        'entity-1.field-1.left-target',
        'entity-1.field-1.left-source',
        'entity-1.field-1.right-target',
        'entity-1.field-1.right-source',
      ]),
    );
  });

  /*
   * crm7#1770 regression guard.
   *
   * @xyflow/react 12.11.2 renders <Handle> as a role-less <div> and spreads
   * caller props onto it. `aria-label` on a generic-role element is PROHIBITED
   * by ARIA (assistive tech never exposes it), so labelling the handles was
   * inert — while emitting four serious axe `aria-prohibited-attr` violations
   * per field row. On a real tenant schema that was ~14,016 violations and it
   * hard-blocked the WCAG AA gate for /settings/schema-builder in both themes
   * (crm7 tests/e2e/wcag-aa.spec.ts).
   */
  it('handles are aria-hidden and carry NO aria-label (aria-prohibited-attr)', () => {
    const { getAllByTestId } = render(
      <FieldRow entityId="entity-1" field={baseField} />,
    );
    const handles = getAllByTestId('mock-handle');
    expect(handles).toHaveLength(4);
    for (const h of handles) {
      // aria-label on a role-less div is prohibited and never announced.
      expect(h.getAttribute('aria-label')).toBeNull();
      expect(h.getAttribute('aria-hidden')).toBe('true');
      // The mouse-hover tooltip is the affordance we DO keep.
      expect(h.getAttribute('title')).toBeTruthy();
    }
  });

  /*
   * crm7#1770: EntityNode wraps rows in a role="list"; ARIA requires that a
   * list's children be listitems. Without this the entity card raised a
   * critical axe `aria-required-children` violation.
   */
  it('root is a listitem so EntityNode role="list" has required children', () => {
    const { container } = render(
      <FieldRow entityId="entity-1" field={baseField} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('role')).toBe('listitem');
  });

  it('shows NOT NULL tag when !isNullable && !isPrimary', () => {
    const { getByText } = render(
      <FieldRow
        entityId="entity-1"
        field={{ ...baseField, isNullable: false }}
      />,
    );
    expect(getByText('NOT NULL')).toBeDefined();
  });

  it('does NOT show NOT NULL tag for primary keys (redundant)', () => {
    const { queryByText } = render(
      <FieldRow
        entityId="entity-1"
        field={{ ...baseField, isPrimary: true, isNullable: false }}
      />,
    );
    expect(queryByText('NOT NULL')).toBeNull();
  });

  it('renders Key icon when isPrimary is true', () => {
    const { container } = render(
      <FieldRow
        entityId="entity-1"
        field={{ ...baseField, isPrimary: true }}
      />,
    );
    // lucide-react icons render as inline <svg> elements.
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('truncates long type labels with a trailing ellipsis', () => {
    const { container } = render(
      <FieldRow
        entityId="entity-1"
        field={{ ...baseField, type: 'character varying(255)' }}
      />,
    );
    // 12-char truncation → shows 11 chars + ellipsis.
    expect(container.textContent).toMatch(/character v\u2026/);
  });

  it('container has the `nodrag` className so handle drags work in React Flow', () => {
    const { container } = render(
      <FieldRow entityId="entity-1" field={baseField} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('nodrag');
  });
});
