/**
 * Guards for the canvas layout overlay.
 *
 * WHY THIS EXISTS
 *
 * Operator, 2026-08-06, on /settings/schema-builder: "these are stacked and
 * cant be moved. tidy does nothing and fit just zooms a little."
 *
 * Root cause was NOT the drag capture (that is the documented @xyflow/react v12
 * pattern and was correct). Positions were written to
 * `tenant_entities.metadata.position`, and every one of the 44 entity rows is
 * platform-owned — `tenant_id IS NULL`, `is_system = true`. The UPDATE policy
 * on that table requires BOTH `is_system = false` AND
 * `ut.tenant_id = tenant_entities.tenant_id`; since `NULL = <uuid>` evaluates to
 * NULL rather than TRUE, no user can ever satisfy it on those rows. Each drag
 * therefore produced a denied write, an optimistic rollback, and a node that
 * snapped back — and because no consumer passed `onError`, silently.
 *
 * These tests pin the two halves of the fix: writes go to the overlay, and a
 * personal override outranks the tenant default.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  getSchemaLayout,
  resolveLayout,
  saveSchemaLayoutPosition,
  type TenantSchemaLayoutRow,
} from '../service.js';

function row(over: Partial<TenantSchemaLayoutRow>): TenantSchemaLayoutRow {
  return {
    id: 'r1',
    tenant_id: 't1',
    user_id: null,
    entity_id: 'e1',
    app_scope: 'all',
    pos_x: 0,
    pos_y: 0,
    ...over,
  };
}

describe('resolveLayout', () => {
  it('uses the tenant default when the user has no override', () => {
    const out = resolveLayout([row({ pos_x: 10, pos_y: 20 })], 'user-1');
    expect(out.get('e1')).toEqual({ x: 10, y: 20 });
  });

  it('lets a personal override win over the tenant default', () => {
    // The whole reason both rows are allowed to coexist. If this inverts, one
    // admin dragging a card silently rearranges everyone else's canvas.
    const out = resolveLayout(
      [
        row({ id: 'a', user_id: null, pos_x: 10, pos_y: 20 }),
        row({ id: 'b', user_id: 'user-1', pos_x: 99, pos_y: 88 }),
      ],
      'user-1',
    );
    expect(out.get('e1')).toEqual({ x: 99, y: 88 });
  });

  it('ignores another user\'s override', () => {
    const out = resolveLayout(
      [
        row({ id: 'a', user_id: null, pos_x: 10, pos_y: 20 }),
        row({ id: 'b', user_id: 'someone-else', pos_x: 99, pos_y: 88 }),
      ],
      'user-1',
    );
    expect(out.get('e1')).toEqual({ x: 10, y: 20 });
  });

  it('returns nothing for an entity that was never placed', () => {
    // Absent must stay absent so SchemaCanvas falls through to its computed
    // grid rather than pinning every unplaced node to a single default point.
    expect(resolveLayout([], 'user-1').has('e1')).toBe(false);
  });
});

describe('saveSchemaLayoutPosition', () => {
  it('writes through the RPC, never to tenant_entities', async () => {
    // The regression guard. A future refactor that "simplifies" this back to
    // `.from('tenant_entities').update(...)` restores a write that RLS denies
    // for every one of the 44 platform rows.
    const rpc = vi.fn().mockResolvedValue({ data: row({}), error: null });
    const from = vi.fn();
    const client = { rpc, from };

    await saveSchemaLayoutPosition(client, {
      tenantId: 't1',
      entityId: 'e1',
      x: 5,
      y: 6,
    });

    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('save_schema_layout_position', {
      p_tenant_id: 't1',
      p_entity_id: 'e1',
      p_pos_x: 5,
      p_pos_y: 6,
      p_personal: false,
      p_app_scope: 'all',
    });
  });

  it('throws when the RPC returns an error instead of resolving quietly', async () => {
    // A guard that cannot fail is not a guard: prove the denial actually
    // propagates, because a swallowed rejection here is precisely what made the
    // original bug invisible.
    const client = {
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'denied by RLS' } }),
      from: vi.fn(),
    };

    await expect(
      saveSchemaLayoutPosition(client, {
        tenantId: 't1',
        entityId: 'e1',
        x: 1,
        y: 2,
      }),
    ).rejects.toThrow('denied by RLS');
  });
});

describe('getSchemaLayout', () => {
  it('returns an empty layout rather than querying when there is no tenant', async () => {
    const client = { from: vi.fn() };
    await expect(getSchemaLayout(client, null)).resolves.toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
  });
});
