import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EntityRefCellWidget } from './EntityRefCell';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeMockSupabase(responses: {
  entityDef: unknown;
  row: unknown;
  rowError?: unknown;
}) {
  // Chainable stub that returns what we want for each call sequence.
  // Each .from() starts a new chain; we count calls to know which to return.
  let callCount = 0;
  const makeChain = (finalData: unknown, finalError: unknown = null) => ({
    select: () => ({
      eq: () => ({
        in: () => ({
          maybeSingle: () => Promise.resolve({ data: finalData, error: finalError }),
        }),
        maybeSingle: () => Promise.resolve({ data: finalData, error: finalError }),
      }),
    }),
  });
  return {
    from: vi.fn(() => {
      callCount += 1;
      if (callCount === 1) return makeChain(responses.entityDef);
      return makeChain(responses.row, responses.rowError ?? null);
    }),
  } as unknown as SupabaseClient;
}

describe('EntityRefCellWidget', () => {
  const baseProps = {
    type: 'EntityRefCell' as const,
    foreign_app_scope: 'crm7' as const,
    entity: 'contacts',
    entity_id: '11111111-1111-1111-1111-111111111111',
    display_field: 'full_name',
  };

  it('renders known entity value as a link', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'ent-1' },
      row: { id: baseProps.entity_id, full_name: 'Alice Smith' },
    });
    render(<EntityRefCellWidget supabase={supabase} appScope="r80" widgetProps={baseProps} />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeTruthy();
    });
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(`/crm7/contacts/${baseProps.entity_id}`);
  });

  it('falls back to UnknownWidget when entity is not whitelisted', async () => {
    const supabase = makeMockSupabase({
      entityDef: null,
      row: null,
    });
    const { container } = render(
      <EntityRefCellWidget supabase={supabase} appScope="r80" widgetProps={baseProps} />
    );
    await waitFor(() => {
      expect(container.textContent ?? '').toContain('unknown');
    });
  });

  it('falls back when target row has been deleted', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'ent-1' },
      row: null,
    });
    const { container } = render(
      <EntityRefCellWidget supabase={supabase} appScope="r80" widgetProps={baseProps} />
    );
    await waitFor(() => {
      expect(container.textContent ?? '').toContain('unknown');
    });
  });

  it('uses href_template when provided', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'ent-1' },
      row: { id: baseProps.entity_id, full_name: 'Bob' },
    });
    render(
      <EntityRefCellWidget
        supabase={supabase}
        appScope="r80"
        widgetProps={{ ...baseProps, href_template: '/custom/{entity}/{id}' }}
      />
    );
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toBe(`/custom/contacts/${baseProps.entity_id}`);
    });
  });
});
