import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock React Flow's Handle so we can render FieldRow without a provider.
vi.mock('@xyflow/react', () => ({
  Handle: ({
    id,
    type,
    position,
    className,
    'aria-label': ariaLabel,
  }: {
    id?: string;
    type: string;
    position: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <div
      data-testid="mock-handle"
      data-handle-id={id}
      data-handle-type={type}
      data-handle-position={position}
      className={className}
      aria-label={ariaLabel}
    />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
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
