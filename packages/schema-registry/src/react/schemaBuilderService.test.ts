import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSchemaBuilderService, APP_SCOPES } from './schemaBuilderService.js';

const TENANT = '11111111-1111-1111-1111-111111111111';

/**
 * Chainable supabase builder stub. Every query method returns the same builder
 * (recorded via vi.fn) and the builder is thenable, so any terminal `await`
 * (`.order()`, `.single()`, or a terminal `.eq()` on delete) resolves to
 * `result`. This lets us assert the exact `.from/.or/.eq/.is/.in` call sequence.
 */
function makeMockSupabase(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: unknown } = {};
  for (const m of [
    'select',
    'or',
    'eq',
    'is',
    'in',
    'order',
    'insert',
    'update',
    'delete',
    'single',
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  // Thenable: resolve terminal awaits to `result`.
  (builder as { then: unknown }).then = (resolve: (v: unknown) => unknown) => resolve(result);
  const from = vi.fn(() => builder);
  const supabase = { from } as unknown as SupabaseClient;
  return { supabase, from, builder };
}

describe('createSchemaBuilderService', () => {
  it('exposes the eight bound service methods', () => {
    const { supabase } = makeMockSupabase();
    const svc = createSchemaBuilderService(supabase, 'crm7');
    expect(Object.keys(svc).sort()).toEqual(
      [
        'createSchemaEntity',
        'createSchemaRelation',
        'deleteSchemaEntity',
        'deleteSchemaRelation',
        'getEntityFieldDefinitions',
        'getSchemaEntities',
        'getSchemaRelations',
        'updateSchemaEntity',
      ].sort(),
    );
  });

  it('APP_SCOPES mirrors the DB CHECK constraint (r8, not r80)', () => {
    expect([...APP_SCOPES]).toEqual(['all', 'crm7', 'bsu', 'conduit', 'r8', 'braden']);
  });

  describe('getSchemaEntities', () => {
    it('tenant + non-all scope → single nested and(or(...),or(...)) expression', async () => {
      const { supabase, from, builder } = makeMockSupabase({ data: [], error: null });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.getSchemaEntities(TENANT, 'crm7');

      expect(from).toHaveBeenCalledWith('tenant_entities');
      expect(builder.select).toHaveBeenCalledWith('*');
      expect(builder.or).toHaveBeenCalledTimes(1);
      expect(builder.or).toHaveBeenCalledWith(
        `and(or(tenant_id.eq.${TENANT},tenant_id.is.null),or(app_scope.eq.crm7,app_scope.eq.all))`,
      );
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
      // No double-or / no .is / no .in on the tenant+scope path.
      expect(builder.is).not.toHaveBeenCalled();
      expect(builder.in).not.toHaveBeenCalled();
    });

    it('tenant + all scope → flat tenant-or-null or() with no scope clause', async () => {
      const { supabase, builder } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.getSchemaEntities(TENANT, 'all');

      expect(builder.or).toHaveBeenCalledTimes(1);
      expect(builder.or).toHaveBeenCalledWith(`tenant_id.eq.${TENANT},tenant_id.is.null`);
    });

    it('null tenant + non-all scope → is(tenant_id,null) + in(app_scope,[scope,all])', async () => {
      const { supabase, builder } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.getSchemaEntities(null, 'bsu');

      expect(builder.is).toHaveBeenCalledWith('tenant_id', null);
      expect(builder.in).toHaveBeenCalledWith('app_scope', ['bsu', 'all']);
      expect(builder.or).not.toHaveBeenCalled();
    });

    it('null tenant + all scope → is(tenant_id,null) only, no scope filter', async () => {
      const { supabase, builder } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.getSchemaEntities(null, 'all');

      expect(builder.is).toHaveBeenCalledWith('tenant_id', null);
      expect(builder.in).not.toHaveBeenCalled();
      expect(builder.or).not.toHaveBeenCalled();
    });

    it('defaults appScope to the injected currentScope', async () => {
      const { supabase, builder } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'conduit');
      await svc.getSchemaEntities(TENANT);

      expect(builder.or).toHaveBeenCalledWith(
        `and(or(tenant_id.eq.${TENANT},tenant_id.is.null),or(app_scope.eq.conduit,app_scope.eq.all))`,
      );
    });

    it('rejects a malformed tenant id before touching the client', async () => {
      const { supabase, from } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await expect(svc.getSchemaEntities('not-a-uuid')).rejects.toThrow('Invalid tenant ID format');
      expect(from).not.toHaveBeenCalled();
    });

    it('throws the PostgREST error message on failure', async () => {
      const { supabase } = makeMockSupabase({ data: null, error: { message: 'boom' } });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await expect(svc.getSchemaEntities(TENANT)).rejects.toThrow('boom');
    });
  });

  describe('getSchemaRelations', () => {
    it('mirrors getSchemaEntities against tenant_entity_relations', async () => {
      const { supabase, from, builder } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'r8');
      await svc.getSchemaRelations(TENANT, 'r8');

      expect(from).toHaveBeenCalledWith('tenant_entity_relations');
      expect(builder.or).toHaveBeenCalledWith(
        `and(or(tenant_id.eq.${TENANT},tenant_id.is.null),or(app_scope.eq.r8,app_scope.eq.all))`,
      );
    });
  });

  describe('getEntityFieldDefinitions', () => {
    it('filters entity_type + is_active, single or() for tenant-or-null, sorts by sort_order', async () => {
      const { supabase, from, builder } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.getEntityFieldDefinitions('contacts', TENANT);

      expect(from).toHaveBeenCalledWith('tenant_field_definitions');
      expect(builder.eq).toHaveBeenCalledWith('entity_type', 'contacts');
      expect(builder.eq).toHaveBeenCalledWith('is_active', true);
      expect(builder.or).toHaveBeenCalledTimes(1);
      expect(builder.or).toHaveBeenCalledWith(`tenant_id.eq.${TENANT},tenant_id.is.null`);
      expect(builder.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });

    it('null tenant → is(tenant_id,null), no or()', async () => {
      const { supabase, builder } = makeMockSupabase();
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.getEntityFieldDefinitions('contacts', null);

      expect(builder.is).toHaveBeenCalledWith('tenant_id', null);
      expect(builder.or).not.toHaveBeenCalled();
    });
  });

  describe('mutations', () => {
    it('createSchemaEntity inserts into tenant_entities and returns the row', async () => {
      const row = { id: 'e1', name: 'x' };
      const { supabase, from, builder } = makeMockSupabase({ data: row, error: null });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      const input = {
        tenant_id: TENANT,
        name: 'x',
        label: 'X',
        description: null,
        icon: null,
        is_system: false,
        app_scope: 'crm7' as const,
        metadata: null,
      };
      const out = await svc.createSchemaEntity(input);

      expect(from).toHaveBeenCalledWith('tenant_entities');
      expect(builder.insert).toHaveBeenCalledWith(input);
      expect(builder.single).toHaveBeenCalled();
      expect(out).toBe(row);
    });

    it('updateSchemaEntity stamps updated_at and filters by id', async () => {
      const row = { id: 'e1' };
      const { supabase, builder } = makeMockSupabase({ data: row, error: null });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.updateSchemaEntity('e1', { label: 'New' });

      expect(builder.update).toHaveBeenCalledTimes(1);
      const updateArg = builder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg.label).toBe('New');
      expect(typeof updateArg.updated_at).toBe('string');
      expect(builder.eq).toHaveBeenCalledWith('id', 'e1');
    });

    it('deleteSchemaEntity deletes by id from tenant_entities', async () => {
      const { supabase, from, builder } = makeMockSupabase({ data: null, error: null });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.deleteSchemaEntity('e1');

      expect(from).toHaveBeenCalledWith('tenant_entities');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'e1');
    });

    it('createSchemaRelation inserts into tenant_entity_relations', async () => {
      const row = { id: 'r1' };
      const { supabase, from, builder } = makeMockSupabase({ data: row, error: null });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      const rel = {
        tenant_id: TENANT,
        source_entity_id: 's',
        target_entity_id: 't',
        relation_type: 'has_many',
        source_label: null,
        target_label: null,
        is_system: false,
        app_scope: 'crm7' as const,
        metadata: null,
      };
      const out = await svc.createSchemaRelation(rel);

      expect(from).toHaveBeenCalledWith('tenant_entity_relations');
      expect(builder.insert).toHaveBeenCalledWith(rel);
      expect(out).toBe(row);
    });

    it('deleteSchemaRelation deletes by id from tenant_entity_relations', async () => {
      const { supabase, from, builder } = makeMockSupabase({ data: null, error: null });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await svc.deleteSchemaRelation('r1');

      expect(from).toHaveBeenCalledWith('tenant_entity_relations');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'r1');
    });

    it('surfaces the error message when a mutation fails', async () => {
      const { supabase } = makeMockSupabase({ data: null, error: { message: 'nope' } });
      const svc = createSchemaBuilderService(supabase, 'crm7');
      await expect(svc.deleteSchemaEntity('e1')).rejects.toThrow('nope');
    });
  });
});
