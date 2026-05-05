/**
 * Phase 3B — unit tests for the `renamePhysicalColumn` service wrapper.
 * See packages/schema-builder/src/service.ts and the
 * `rename_physical_column` SECURITY DEFINER RPC in
 * `supabase/migrations/20260506000000_rename_physical_column_rpc.sql`.
 */

import { describe, expect, it, vi } from 'vitest';
import { renamePhysicalColumn } from '../service.js';

function mkMockClient(
  rpcResult: { data?: unknown; error?: unknown } = { data: null, error: null },
) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const entityId = '00000000-0000-0000-0000-000000000001';
const fieldId = '00000000-0000-0000-0000-000000000002';

describe('renamePhysicalColumn', () => {
  it('invokes rename_physical_column with the canonical dry-run payload', async () => {
    const client = mkMockClient({
      data: {
        executed: false,
        would_execute:
          'ALTER TABLE public."contact" RENAME COLUMN "email" TO "email_address"',
        affected_views: [],
        affected_policies: [],
      },
    });
    const result = await renamePhysicalColumn(
      client,
      entityId,
      fieldId,
      'email_address',
      { dryRun: true },
    );
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('rename_physical_column', {
      p_entity_id: entityId,
      p_field_id: fieldId,
      p_new_name: 'email_address',
      p_dry_run: true,
    });
    expect(result.executed).toBe(false);
    expect(result.would_execute).toMatch(/ALTER TABLE/);
  });

  it('invokes rename_physical_column with the canonical wet-run payload', async () => {
    const client = mkMockClient({
      data: {
        executed: true,
        would_execute:
          'ALTER TABLE public."contact" RENAME COLUMN "email" TO "email_address"',
        affected_views: [],
        affected_policies: [],
      },
    });
    const result = await renamePhysicalColumn(
      client,
      entityId,
      fieldId,
      'email_address',
      { dryRun: false },
    );
    expect(client.rpc).toHaveBeenCalledWith('rename_physical_column', {
      p_entity_id: entityId,
      p_field_id: fieldId,
      p_new_name: 'email_address',
      p_dry_run: false,
    });
    expect(result.executed).toBe(true);
  });

  it('returns the no_physical_table marker without throwing', async () => {
    const client = mkMockClient({
      data: {
        executed: false,
        reason: 'no_physical_table',
        old_field_name: 'email',
        new_field_name: 'email_address',
      },
    });
    const result = await renamePhysicalColumn(
      client,
      entityId,
      fieldId,
      'email_address',
      { dryRun: false },
    );
    expect(result.executed).toBe(false);
    expect(result.reason).toBe('no_physical_table');
  });

  it('rejects with invalid_parameter_value when the RPC rejects the identifier', async () => {
    const client = mkMockClient({
      data: null,
      error: {
        message:
          "invalid_parameter_value: p_new_name must match ^[a-z][a-z0-9_]{0,62}$ (got 1bad)",
      },
    });
    await expect(
      renamePhysicalColumn(client, entityId, fieldId, '1bad', {
        dryRun: true,
      }),
    ).rejects.toThrow(/invalid_parameter_value/);
  });

  it('rejects with insufficient_privilege when the caller lacks role', async () => {
    const client = mkMockClient({
      data: null,
      error: {
        message:
          'insufficient_privilege: admin or owner role required for entity',
      },
    });
    await expect(
      renamePhysicalColumn(client, entityId, fieldId, 'email_address', {
        dryRun: true,
      }),
    ).rejects.toThrow(/insufficient_privilege/);
  });

  it('rejects with duplicate_column when the target name already exists', async () => {
    const client = mkMockClient({
      data: null,
      error: {
        message:
          'invalid_parameter_value: duplicate_column — contact.email_address already exists',
      },
    });
    await expect(
      renamePhysicalColumn(client, entityId, fieldId, 'email_address', {
        dryRun: false,
      }),
    ).rejects.toThrow(/duplicate_column/);
  });

  it('propagates Error instances unchanged', async () => {
    const underlying = new Error('network offline');
    const client = mkMockClient({ data: null, error: underlying });
    await expect(
      renamePhysicalColumn(client, entityId, fieldId, 'email_address', {
        dryRun: true,
      }),
    ).rejects.toBe(underlying);
  });

  it('passes through affected_views and affected_policies on dry-run', async () => {
    const client = mkMockClient({
      data: {
        executed: false,
        would_execute: 'ALTER TABLE public."contact" RENAME COLUMN ...',
        affected_views: ['public.v_active_contacts'],
        affected_policies: ['contact_select', 'contact_update'],
        audit_id: '00000000-0000-0000-0000-000000000099',
      },
    });
    const result = await renamePhysicalColumn(
      client,
      entityId,
      fieldId,
      'email_address',
      { dryRun: true },
    );
    expect(result.affected_views).toEqual(['public.v_active_contacts']);
    expect(result.affected_policies).toEqual([
      'contact_select',
      'contact_update',
    ]);
    expect(result.audit_id).toBe('00000000-0000-0000-0000-000000000099');
  });
});
