/**
 * Phase 3A — keyboard reorder tests for FieldRow.
 * Alt+ArrowUp / Alt+ArrowDown on the focused edit button dispatches a
 * `bsuite-reorder-field` CustomEvent that SchemaCanvas resolves into a
 * `controller.reorderFields` RPC call.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FieldRow, type FieldRowField } from '../components/FieldRow.js';

// Mirrors the pattern from FieldRow.test.tsx — React Flow Handle renders
// as a no-op so we don't need a ReactFlowProvider in unit tests.
vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  // FieldRow converts the WCAG device-px target floor into CSS px using the
  // live zoom, so it subscribes to the transform scalar.
  useStore: (selector: (s: { transform: [number, number, number] }) => unknown) =>
    selector({ transform: [0, 0, 1] }),
}));

const baseField: FieldRowField = {
  id: 'field-1',
  name: 'email',
  type: 'text',
  isPrimary: false,
  isNullable: true,
};

interface ReorderDetail {
  entityId: string;
  fieldId: string;
  direction: 'up' | 'down';
}

describe('FieldRow — keyboard reorder (Phase 3A)', () => {
  let reorderEvents: ReorderDetail[];
  let editEvents: unknown[];
  let reorderListener: (e: Event) => void;
  let editListener: (e: Event) => void;

  beforeEach(() => {
    reorderEvents = [];
    editEvents = [];
    reorderListener = (e: Event) => {
      const ce = e as CustomEvent<ReorderDetail>;
      reorderEvents.push(ce.detail);
    };
    editListener = (e: Event) => {
      const ce = e as CustomEvent<unknown>;
      editEvents.push(ce.detail);
    };
    window.addEventListener('bsuite-reorder-field', reorderListener);
    window.addEventListener('bsuite-edit-field', editListener);
  });

  afterEach(() => {
    window.removeEventListener('bsuite-reorder-field', reorderListener);
    window.removeEventListener('bsuite-edit-field', editListener);
  });

  it('dispatches bsuite-reorder-field with direction=up on Alt+ArrowUp', () => {
    render(<FieldRow entityId="entity-1" field={baseField} />);
    const btn = screen.getByRole('button', { name: /edit field email/i });
    btn.focus();
    fireEvent.keyDown(btn, { key: 'ArrowUp', altKey: true });
    expect(reorderEvents).toHaveLength(1);
    expect(reorderEvents[0]).toEqual({
      entityId: 'entity-1',
      fieldId: 'field-1',
      direction: 'up',
    });
  });

  it('dispatches bsuite-reorder-field with direction=down on Alt+ArrowDown', () => {
    render(<FieldRow entityId="entity-1" field={baseField} />);
    const btn = screen.getByRole('button', { name: /edit field email/i });
    fireEvent.keyDown(btn, { key: 'ArrowDown', altKey: true });
    expect(reorderEvents).toHaveLength(1);
    expect(reorderEvents[0].direction).toBe('down');
  });

  it('does not dispatch without the Alt modifier', () => {
    render(<FieldRow entityId="entity-1" field={baseField} />);
    const btn = screen.getByRole('button', { name: /edit field email/i });
    fireEvent.keyDown(btn, { key: 'ArrowUp', altKey: false });
    fireEvent.keyDown(btn, { key: 'ArrowDown', altKey: false });
    expect(reorderEvents).toHaveLength(0);
  });

  it('does not dispatch for non-arrow keys', () => {
    render(<FieldRow entityId="entity-1" field={baseField} />);
    const btn = screen.getByRole('button', { name: /edit field email/i });
    fireEvent.keyDown(btn, { key: 'Enter', altKey: true });
    fireEvent.keyDown(btn, { key: ' ', altKey: true });
    fireEvent.keyDown(btn, { key: 'ArrowLeft', altKey: true });
    fireEvent.keyDown(btn, { key: 'ArrowRight', altKey: true });
    expect(reorderEvents).toHaveLength(0);
  });

  it('keyboard reorder does NOT fire the edit dispatcher', () => {
    render(<FieldRow entityId="entity-1" field={baseField} />);
    const btn = screen.getByRole('button', { name: /edit field email/i });
    fireEvent.keyDown(btn, { key: 'ArrowUp', altKey: true });
    expect(editEvents).toHaveLength(0);
  });

  it('renders no edit button (and therefore no keyboard reorder) for primary-key rows', () => {
    render(
      <FieldRow
        entityId="entity-1"
        field={{ ...baseField, isPrimary: true }}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /edit field/i }),
    ).toBeNull();
  });

  it('renders no edit button for system entities', () => {
    render(
      <FieldRow entityId="entity-1" field={baseField} isSystemEntity />,
    );
    expect(
      screen.queryByRole('button', { name: /edit field/i }),
    ).toBeNull();
  });

  it('exposes aria-keyshortcuts on the edit button for assistive tech', () => {
    render(<FieldRow entityId="entity-1" field={baseField} />);
    const btn = screen.getByRole('button', { name: /edit field email/i });
    expect(btn.getAttribute('aria-keyshortcuts')).toBe(
      'Alt+ArrowUp Alt+ArrowDown',
    );
  });

  it('includes the shortcut hint in the button title for sighted-mouse users', () => {
    render(<FieldRow entityId="entity-1" field={baseField} />);
    const btn = screen.getByRole('button', { name: /edit field email/i });
    expect(btn.getAttribute('title')).toMatch(/Alt\+/);
  });
});
