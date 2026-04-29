import { describe, expect, it, vi } from 'vitest';

import {
  createEntityField,
  deleteEntityField,
  getEntityFields,
  getTenantFields,
  updateEntityField,
} from '../service.js';
import type { TenantFieldDefinition } from '../types.js';

/**
 * Build a thenable chainable mock that records every method call and resolves
 * to a fixed `{data, error}` pair on await. Any method returns the same chain
 * so `.select().eq().eq().order()` is tracked as an array of calls.
 */
function makeMockClient(response: { data: unknown; error: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const chain: Record<string, unknown> = {};
  const methods = [
    'from',
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'in',
    'is',
    'or',
    'order',
    'single',
  ] as const;
  for (const m of methods) {
    chain[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      if (m === 'single') return Promise.resolve(response);
      return chain;
    });
  }
  // Make the chain itself thenable so `await chain.from(...).select(...)` works.
  chain.then = (resolve: (r: { data: unknown; error: unknown }) => void) =>
    resolve(response);
  return { client: chain, calls };
}

const fakeField: TenantFieldDefinition = {
  id: 'field-1',
  tenant_id: 'tenant-1',
  entity_id: 'entity-1',
  entity_type: 'customers',
  field_name: 'email',
  field_type: 'email',
  label: 'Email',
  placeholder: null,
  is_required: true,
  options: null,
  sort_order: 0,
  is_active: true,
  scope: null,
  is_system: false,
  is_locked: false,
  created_at: null,
  updated_at: null,
};

describe('getEntityFields', () => {
  it('filters by entity_id and is_active=true, ordered by sort_order then created_at', async () => {
    const { client, calls } = makeMockClient({
      data: [fakeField],
      error: null,
    });
    const out = await getEntityFields(client, 'entity-1');
    expect(out).toEqual([fakeField]);
    expect(calls.find((c) => c.method === 'from')?.args[0]).toBe(
      'tenant_field_definitions',
    );
    const eqCalls = calls.filter((c) => c.method === 'eq');
    expect(eqCalls).toContainEqual({
      method: 'eq',
      args: ['entity_id', 'entity-1'],
    });
    expect(eqCalls).toContainEqual({
      method: 'eq',
      args: ['is_active', true],
    });
    const orderCalls = calls.filter((c) => c.method === 'order');
    expect(orderCalls[0]?.args[0]).toBe('sort_order');
    expect(orderCalls[1]?.args[0]).toBe('created_at');
  });

  it('throws the Supabase error if present', async () => {
    const { client } = makeMockClient({
      data: null,
      error: { message: 'RLS denied' },
    });
    await expect(getEntityFields(client, 'entity-1')).rejects.toThrow(
      'RLS denied',
    );
  });
});

describe('getTenantFields', () => {
  it('uses .or(tenant_id.eq...,tenant_id.is.null) when tenantId is set', async () => {
    const { client, calls } = makeMockClient({
      data: [fakeField],
      error: null,
    });
    await getTenantFields(client, 'tenant-1');
    const orCalls = calls.filter((c) => c.method === 'or');
    expect(orCalls).toHaveLength(1);
    expect(orCalls[0].args[0]).toContain('tenant_id.eq.tenant-1');
    expect(orCalls[0].args[0]).toContain('tenant_id.is.null');
  });

  it('uses .is(tenant_id, null) when tenantId is null', async () => {
    const { client, calls } = makeMockClient({
      data: [],
      error: null,
    });
    await getTenantFields(client, null);
    const isCalls = calls.filter((c) => c.method === 'is');
    expect(isCalls).toContainEqual({
      method: 'is',
      args: ['tenant_id', null],
    });
    expect(calls.filter((c) => c.method === 'or')).toHaveLength(0);
  });
});

describe('createEntityField', () => {
  it('inserts + selects + single and returns the row', async () => {
    const { client, calls } = makeMockClient({
      data: fakeField,
      error: null,
    });
    const { id: _id, created_at: _c, updated_at: _u, ...payload } = fakeField;
    const out = await createEntityField(client, payload);
    expect(out).toEqual(fakeField);
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toEqual(payload);
    expect(calls.find((c) => c.method === 'single')).toBeDefined();
  });
});

describe('updateEntityField', () => {
  it('updates with updated_at auto-set', async () => {
    const { client, calls } = makeMockClient({
      data: { ...fakeField, label: 'New Label' },
      error: null,
    });
    await updateEntityField(client, 'field-1', { label: 'New Label' });
    const updateCall = calls.find((c) => c.method === 'update');
    const payload = updateCall?.args[0] as Record<string, unknown>;
    expect(payload.label).toBe('New Label');
    expect(typeof payload.updated_at).toBe('string');
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual([
      'id',
      'field-1',
    ]);
  });
});

describe('deleteEntityField', () => {
  it('calls delete + eq by id', async () => {
    const { client, calls } = makeMockClient({ data: null, error: null });
    await deleteEntityField(client, 'field-1');
    expect(calls.find((c) => c.method === 'delete')).toBeDefined();
    expect(calls.find((c) => c.method === 'eq')?.args).toEqual([
      'id',
      'field-1',
    ]);
  });

  it('throws if the delete returns an error', async () => {
    const { client } = makeMockClient({
      data: null,
      error: { message: 'FK violation' },
    });
    await expect(deleteEntityField(client, 'field-1')).rejects.toThrow(
      'FK violation',
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 3B: renamePhysicalColumn
// ---------------------------------------------------------------------------

import { renamePhysicalColumn } from '../service.js';
import type { RenamePreviewResult } from '../types.js';

function makeRpcMockClient(rpcResponse: { data: unknown; error: unknown }) {
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const rpc = vi.fn((fn: string, args: unknown) => {
    rpcCalls.push({ fn, args });
    return Promise.resolve(rpcResponse) as unknown;
  });
  return { client: { rpc }, rpcCalls };
}

describe('renamePhysicalColumn', () => {
  it('calls the rename_physical_column RPC with dry_run=true by default', async () => {
    const preview: RenamePreviewResult = {
      would_execute: 'ALTER TABLE contacts RENAME COLUMN email TO primary_email',
      affected_views: [],
      affected_policies: [],
    };
    const { client, rpcCalls } = makeRpcMockClient({ data: preview, error: null });
    const result = await renamePhysicalColumn(client, 'entity-1', 'field-1', 'primary_email');
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe('rename_physical_column');
    expect(rpcCalls[0].args).toEqual({
      p_entity_id: 'entity-1',
      p_field_id: 'field-1',
      p_new_name: 'primary_email',
      p_dry_run: true,
    });
    expect(result).toEqual(preview);
  });

  it('calls the RPC with dry_run=false for wet-run', async () => {
    const wetResult = { executed: true, previous_name: 'email', new_name: 'primary_email' };
    const { client, rpcCalls } = makeRpcMockClient({ data: wetResult, error: null });
    const result = await renamePhysicalColumn(client, 'entity-1', 'field-1', 'primary_email', false);
    expect(rpcCalls[0].args).toEqual(
      expect.objectContaining({ p_dry_run: false }),
    );
    expect(result).toEqual(wetResult);
  });

  it('throws when the RPC returns an error', async () => {
    const { client } = makeRpcMockClient({
      data: null,
      error: { message: 'insufficient privilege' },
    });
    let caught: Error | null = null;
    try {
      await renamePhysicalColumn(client, 'entity-1', 'field-1', 'bad_name');
    } catch (e) {
      caught = e instanceof Error ? e : new Error(String(e));
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toBe('insufficient privilege');
  });
});
