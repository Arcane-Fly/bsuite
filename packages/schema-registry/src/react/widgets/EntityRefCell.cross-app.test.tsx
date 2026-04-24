import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EntityRefCellWidget } from './EntityRefCell';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cross-App Entity-Cell Linkage — integration-style vitest coverage.
 *
 * Per docs/20260425-universal-canvas-master-execution-plan-v1.00W.md §W3-D:
 * the must-have #5 browser-level E2E lives at
 * crm7/tests/e2e/cross-app-entity-linkage.spec.ts (env-gated skip + runbook).
 *
 * This file proves the same behaviour at the unit boundary: when a widget
 * authored with foreign_app_scope='crm7' is rendered inside the r80 app,
 * (a) the widget goes through the tenant_entities whitelist path,
 * (b) the fetched row's display_field is shown,
 * (c) a click resolves to the cross-app deep-link URL.
 *
 * This is deliberately independent of the base EntityRefCell.test.tsx —
 * the base covers loading / missing / href_template states inside the
 * same app scope, while THIS spec exercises the cross-app semantics that
 * must-have #5 calls out.
 */

function makeMockSupabase(responses: {
  entityDef: unknown;
  row: unknown;
  rowError?: unknown;
}) {
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

describe('EntityRefCellWidget — cross-app linkage (must-have #5)', () => {
  // Scenario: R80.3 page mounts an EntityRefCell authored with
  // foreign_app_scope='crm7' pointing to a CRM7 contacts row.
  const crm7ContactProps = {
    type: 'EntityRefCell' as const,
    foreign_app_scope: 'crm7' as const,
    entity: 'contacts',
    entity_id: '33333333-3333-3333-3333-333333333333',
    display_field: 'full_name',
  };

  it('renders CRM7 contact display_field when mounted on R80.3 page', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'tenant-entities-crm7-contacts' },
      row: { id: crm7ContactProps.entity_id, full_name: 'Jane Doe (CRM7)' },
    });
    render(
      <EntityRefCellWidget
        supabase={supabase}
        appScope="r80"
        widgetProps={crm7ContactProps}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Jane Doe (CRM7)')).toBeTruthy();
    });
  });

  it('default href resolves to the CRM7 deep-link pattern', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'tenant-entities-crm7-contacts' },
      row: { id: crm7ContactProps.entity_id, full_name: 'Jane Doe (CRM7)' },
    });
    render(
      <EntityRefCellWidget
        supabase={supabase}
        appScope="r80"
        widgetProps={crm7ContactProps}
      />,
    );
    const link = await screen.findByRole('link');
    expect(link.getAttribute('href')).toBe(
      `/crm7/contacts/${crm7ContactProps.entity_id}`,
    );
  });

  it('href_template override resolves {app}/{entity}/{id} for prod cross-app URL', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'tenant-entities-crm7-contacts' },
      row: { id: crm7ContactProps.entity_id, full_name: 'Jane Doe (CRM7)' },
    });
    render(
      <EntityRefCellWidget
        supabase={supabase}
        appScope="r80"
        widgetProps={{
          ...crm7ContactProps,
          href_template: 'https://crm.crm7.app/{entity}/{id}',
        }}
      />,
    );
    const link = await screen.findByRole('link');
    expect(link.getAttribute('href')).toBe(
      `https://crm.crm7.app/contacts/${crm7ContactProps.entity_id}`,
    );
  });

  it('click fires onNavigate with the resolved cross-app href', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'tenant-entities-crm7-contacts' },
      row: { id: crm7ContactProps.entity_id, full_name: 'Jane Doe (CRM7)' },
    });
    const onNavigate = vi.fn();
    render(
      <EntityRefCellWidget
        supabase={supabase}
        appScope="r80"
        widgetProps={{
          ...crm7ContactProps,
          href_template: 'https://crm.crm7.app/{entity}/{id}',
        }}
        onNavigate={onNavigate}
      />,
    );
    const link = await screen.findByRole('link');
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledWith(
      `https://crm.crm7.app/contacts/${crm7ContactProps.entity_id}`,
    );
  });

  it('click fires onClick with entity_id when onClick is provided', async () => {
    const supabase = makeMockSupabase({
      entityDef: { id: 'tenant-entities-crm7-contacts' },
      row: { id: crm7ContactProps.entity_id, full_name: 'Jane Doe (CRM7)' },
    });
    const onClick = vi.fn();
    render(
      <EntityRefCellWidget
        supabase={supabase}
        appScope="r80"
        widgetProps={crm7ContactProps}
        onClick={onClick}
      />,
    );
    const link = await screen.findByRole('link');
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledWith(crm7ContactProps.entity_id);
  });

  it('renders fallback when foreign entity is not in tenant_entities whitelist', async () => {
    // Simulates an RLS denial or an entity scope mismatch — the whitelist
    // lookup returns null, the row-fetch never runs, widget falls back.
    const supabase = makeMockSupabase({
      entityDef: null,
      row: null,
    });
    const { container } = render(
      <EntityRefCellWidget
        supabase={supabase}
        appScope="r80"
        widgetProps={{ ...crm7ContactProps, entity: 'auth.users' }}
      />,
    );
    await waitFor(() => {
      expect(container.textContent ?? '').toContain('unknown');
    });
  });
});
