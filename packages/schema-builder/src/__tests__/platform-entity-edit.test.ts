/**
 * The developer-only platform-entity edit path.
 *
 * WHY THIS EXISTS
 *
 * Two independent bugs shipped in this feature and BOTH survived a full green
 * suite, because every existing test exercised `service.ts` in isolation and
 * nothing covered the controller's routing branch or the panel:
 *
 *   1. The properties-panel Save button was gated on `{!isSystem ? <footer>}`.
 *      All 44 entities are `is_system`, so a developer got unlocked inputs and
 *      no control to submit them — the feature shipped completely dead.
 *   2. The controller's guard read `Object.keys(updates)` and required every key
 *      to be label/description. The panel sends its whole `formData`, seeded
 *      from the entity, so the payload ALWAYS carries id/tenant_id/name/metadata
 *      and the guard rejected every platform save even when the user had changed
 *      nothing but the label.
 *
 * The fix compares against the STORED entity, so unchanged keys are ignored and
 * only genuine changes are policed. These tests pin that, plus the boundary that
 * makes it safe: structure stays migration-owned.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSchemaController } from '../hooks/useSchemaController.js';
import type { LooseSupabaseClient } from '../service.js';
import type { TenantEntity } from '../types.js';

const PLATFORM_ENTITY: TenantEntity = {
  id: 'plat-1',
  tenant_id: null, // platform-owned — the case the RPC exists for
  name: 'contacts',
  label: 'Contacts',
  description: 'Platform contacts',
  icon: null,
  app_scope: 'all',
  is_system: true,
  metadata: { position: { x: 1, y: 2 } },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const TENANT_ENTITY: TenantEntity = {
  ...PLATFORM_ENTITY,
  id: 'own-1',
  tenant_id: 't1',
  name: 'widgets',
  label: 'Widgets',
  is_system: false,
};

function chainFor(data: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'in', 'or', 'order']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve({ data, error: null }));
  chain.then = (f: (v: { data: unknown; error: null }) => unknown) =>
    Promise.resolve({ data, error: null }).then(f);
  return chain;
}

function buildClient(entities: TenantEntity[]) {
  const rpc = vi.fn((name: string) => {
    if (name === 'is_platform_developer') {
      return Promise.resolve({ data: true, error: null });
    }
    return Promise.resolve({ data: entities[0], error: null });
  });
  const updateChain = chainFor(entities[0]);
  const from = vi.fn((table: string) =>
    table === 'tenant_entities' ? chainFor(entities) : chainFor([]),
  );
  return {
    client: {
      from,
      rpc,
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
      channel: () => ({
        on: () => ({ on: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }) }),
      }),
      removeChannel: () => {},
    } as unknown as LooseSupabaseClient,
    rpc,
    from,
    updateChain,
  };
}

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

function newQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe('platform entity editing', () => {
  it('accepts a whole-entity payload when only the label actually changed', async () => {
    // This is EXACTLY what EntityPropertiesPanel sends: the full formData,
    // seeded from the entity, with one field edited. A keys-only guard rejected
    // it; the diff-based guard must let it through.
    const { client, rpc } = buildClient([PLATFORM_ENTITY]);
    const qc = newQc();
    const { result } = renderHook(
      () => useSchemaController({ supabase: client, tenantId: 't1', realtime: false }),
      { wrapper: wrapper(qc) },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateEntity(PLATFORM_ENTITY.id, {
        ...PLATFORM_ENTITY,
        label: 'Contacts (renamed)',
      });
    });

    expect(rpc).toHaveBeenCalledWith('update_platform_entity_label', {
      p_entity_id: 'plat-1',
      p_label: 'Contacts (renamed)',
      p_description: 'Platform contacts',
    });
  });

  it('refuses a structural change to a platform entity', async () => {
    // name / is_system / app_scope stay migration-owned for EVERY role: a slip
    // there changes the product for all tenants at once.
    const { client } = buildClient([PLATFORM_ENTITY]);
    const qc = newQc();
    const { result } = renderHook(
      () => useSchemaController({ supabase: client, tenantId: 't1', realtime: false }),
      { wrapper: wrapper(qc) },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      result.current.updateEntity(PLATFORM_ENTITY.id, {
        ...PLATFORM_ENTITY,
        name: 'hijacked',
      }),
    ).rejects.toThrow(/only label and description/i);
  });

  it('routes a TENANT-owned entity through the ordinary update, not the RPC', async () => {
    // The RPC must never become a general bypass for normal RLS.
    const { client, rpc } = buildClient([TENANT_ENTITY]);
    const qc = newQc();
    const { result } = renderHook(
      () => useSchemaController({ supabase: client, tenantId: 't1', realtime: false }),
      { wrapper: wrapper(qc) },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateEntity(TENANT_ENTITY.id, {
        ...TENANT_ENTITY,
        label: 'Widgets v2',
      });
    });

    const platformCalls = rpc.mock.calls.filter(
      (c) => c[0] === 'update_platform_entity_label',
    );
    expect(platformCalls).toHaveLength(0);
  });

  it('exposes isPlatformDeveloper from the SQL helper', async () => {
    const { client } = buildClient([PLATFORM_ENTITY]);
    const qc = newQc();
    const { result } = renderHook(
      () => useSchemaController({ supabase: client, tenantId: 't1', realtime: false }),
      { wrapper: wrapper(qc) },
    );
    await waitFor(() => expect(result.current.isPlatformDeveloper).toBe(true));
  });
});

describe('EntityPropertiesPanel save affordance', () => {
  it('renders a Save control for a platform developer on a platform entity', async () => {
    // The bug this pins: the footer holding the ONLY Save button was gated on
    // `!isSystem`. Every one of the 44 entities is is_system, so unlocking the
    // inputs for a developer produced editable fields with no way to submit —
    // the feature shipped dead while every other test stayed green.
    const { render, screen } = await import('@testing-library/react');
    const { EntityPropertiesPanel } = await import(
      '../components/EntityPropertiesPanel.js'
    );

    render(
      createElement(EntityPropertiesPanel, {
        entity: PLATFORM_ENTITY,
        onClose: () => {},
        onSave: () => {},
        isPlatformDeveloper: true,
      }),
    );

    expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
  });

  it('does NOT render a Save control for a non-developer on the same entity', async () => {
    // The other half: without this the test above would pass on a panel that
    // simply always shows Save, which would be a different bug.
    const { render, screen } = await import('@testing-library/react');
    const { EntityPropertiesPanel } = await import(
      '../components/EntityPropertiesPanel.js'
    );

    render(
      createElement(EntityPropertiesPanel, {
        entity: PLATFORM_ENTITY,
        onClose: () => {},
        onSave: () => {},
        isPlatformDeveloper: false,
      }),
    );

    expect(screen.queryByRole('button', { name: /save changes/i })).toBeNull();
  });
});
