/**
 * Phase 3A — unit tests for the `reorderEntityFields` service wrapper.
 * See packages/schema-builder/src/service.ts and the
 * `reorder_entity_fields` SECURITY DEFINER RPC in
 * `supabase/migrations/20260505000000_field_sort_order_and_reorder_rpc.sql`.
 */

import { describe, expect, it, vi } from 'vitest';
import { reorderEntityFields } from '../service.js';

function mkMockClient(
  rpcResult: { data?: unknown; error?: unknown } = { data: null, error: null },
) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const entityId = '00000000-0000-0000-0000-000000000001';

describe('reorderEntityFields', () => {
  it('invokes reorder_entity_fields with the canonical snake_case payload', async () => {
    const client = mkMockClient();
    await reorderEntityFields(client, entityId, [
      'field-a',
      'field-b',
      'field-c',
    ]);
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('reorder_entity_fields', {
      p_entity_id: entityId,
      p_field_ids: ['field-a', 'field-b', 'field-c'],
    });
  });

  it('resolves without value on success', async () => {
    const client = mkMockClient({ data: null, error: null });
    await expect(
      reorderEntityFields(client, entityId, ['a']),
    ).resolves.toBeUndefined();
  });

  it('accepts an empty array (legal no-op for empty entities)', async () => {
    const client = mkMockClient();
    await reorderEntityFields(client, entityId, []);
    expect(client.rpc).toHaveBeenCalledWith('reorder_entity_fields', {
      p_entity_id: entityId,
      p_field_ids: [],
    });
  });

  it('rejects when the RPC returns insufficient_privilege', async () => {
    const client = mkMockClient({
      data: null,
      error: { message: 'insufficient_privilege: admin or owner role required' },
    });
    // NOTE: manual try/catch is used here (instead of
    // `.rejects.toThrow(/regex/)`) because vitest 2.x's regex-matcher path
    // stringifies the thrown Error's `.message` via a route that returns `''`
    // for plain Error instances wrapping a stringified PostgREST error. The
    // Error IS thrown with the right message — `.toBeInstanceOf(Error)` +
    // `.message.toMatch(/regex/)` is the reliable check and is also more
    // portable across vitest versions.
    let caught: unknown;
    try {
      await reorderEntityFields(client, entityId, ['a']);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/insufficient_privilege/);
  });

  it('rejects when the RPC returns invalid_parameter_value for a partial array', async () => {
    const client = mkMockClient({
      data: null,
      error: {
        message:
          "invalid_parameter_value: p_field_ids does not match the entity's active fields",
      },
    });
    let caught: unknown;
    try {
      await reorderEntityFields(client, entityId, ['a']);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/invalid_parameter_value/);
  });

  it('rejects when the RPC returns a duplicate-id error', async () => {
    const client = mkMockClient({
      data: null,
      error: {
        message: 'invalid_parameter_value: p_field_ids contains duplicates',
      },
    });
    let caught: unknown;
    try {
      await reorderEntityFields(client, entityId, ['a', 'a']);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/duplicates/);
  });

  it('rejects when the RPC returns a bare string error', async () => {
    const client = mkMockClient({
      data: null,
      error: 'network failure',
    });
    await expect(
      reorderEntityFields(client, entityId, ['a']),
    ).rejects.toThrow();
  });

  it('propagates Error instances unchanged', async () => {
    const underlying = new Error('boom');
    const client = mkMockClient({ data: null, error: underlying });
    await expect(
      reorderEntityFields(client, entityId, ['a']),
    ).rejects.toBe(underlying);
  });
});
