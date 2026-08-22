import { describe, expect, it } from 'vitest';
import {
  CardinalitySchema,
  EntityNodeDataSchema,
  ReferentialActionSchema,
  SchemaRelationSchema,
  ZOD_TO_DB_ALIASES,
  fromDbRelation,
  toDbRelation,
} from '../schemas.js';
import type { TenantEntityRelation } from '../types.js';

describe('CardinalitySchema', () => {
  it('accepts every cardinality the DB supports', () => {
    for (const v of [
      'one_to_one',
      'one_to_many',
      'many_to_many',
      'inherits_from',
    ]) {
      expect(CardinalitySchema.parse(v)).toBe(v);
    }
  });

  it('rejects unknown cardinality', () => {
    expect(() => CardinalitySchema.parse('zero_to_infinity')).toThrow();
  });
});

describe('ReferentialActionSchema', () => {
  it('matches Postgres FK action surface', () => {
    for (const v of ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']) {
      expect(ReferentialActionSchema.parse(v)).toBe(v);
    }
  });
});

describe('EntityNodeDataSchema', () => {
  it('defaults fields/collapsed/isSystem', () => {
    const parsed = EntityNodeDataSchema.parse({
      tableId: 't1',
      label: 'Customers',
    });
    expect(parsed.fields).toEqual([]);
    expect(parsed.collapsed).toBe(false);
    expect(parsed.isSystem).toBe(false);
  });
});

describe('SchemaRelationSchema', () => {
  it('parses a valid entity-level relation', () => {
    const rel = SchemaRelationSchema.parse({
      id: '00000000-0000-4000-8000-000000000000',
      source: { tableId: 'orders' },
      target: { tableId: 'customers' },
      metadata: {},
    });
    expect(rel.source.handle).toBe('right');
    expect(rel.target.handle).toBe('left');
    expect(rel.metadata.cardinality).toBe('one_to_many');
    expect(rel.metadata.onDelete).toBe('SET NULL');
    expect(rel.metadata.onUpdate).toBe('CASCADE');
  });

  it('parses a field-level relation (Phase 1b shape)', () => {
    const rel = SchemaRelationSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      source: { tableId: 'orders', fieldId: 'customer_id' },
      target: { tableId: 'customers', fieldId: 'id' },
      metadata: { cardinality: 'one_to_many', onDelete: 'CASCADE' },
    });
    expect(rel.source.fieldId).toBe('customer_id');
    expect(rel.target.fieldId).toBe('id');
  });

  it('rejects non-UUID id', () => {
    expect(() =>
      SchemaRelationSchema.parse({
        id: 'not-a-uuid',
        source: { tableId: 'orders' },
        target: { tableId: 'customers' },
        metadata: {},
      }),
    ).toThrow();
  });
});

describe('DB alias translators', () => {
  const sampleRel = SchemaRelationSchema.parse({
    id: '22222222-2222-4222-8222-222222222222',
    name: 'OrderCustomer',
    source: { tableId: 'orders', fieldId: 'customer_id' },
    target: { tableId: 'customers', fieldId: 'id' },
    metadata: {
      cardinality: 'one_to_many',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      isSystem: false,
      applyAsPostgresFK: true, // one-shot intent — must be dropped
    },
  });

  it('toDbRelation maps every Zod field to its DB column', () => {
    const row = toDbRelation(sampleRel, { tenantId: 't1', appScope: 'crm7' });
    expect(row.id).toBe(sampleRel.id);
    expect(row.source_entity_id).toBe('orders');
    expect(row.target_entity_id).toBe('customers');
    expect(row.relation_type).toBe('one_to_many');
    expect(row.is_system).toBe(false);
    expect(row.source_label).toBe('OrderCustomer');
    expect(row.tenant_id).toBe('t1');
    expect(row.app_scope).toBe('crm7');
  });

  it('toDbRelation drops field-level anchors and referential actions', () => {
    // `sampleRel` deliberately carries fieldId + onDelete/onUpdate. They are
    // UI-model only; the columns were dropped by 20260503000001. Emitting them
    // is what made PostgREST reject every insert (PGRST204) from 2026-05-03.
    const row = toDbRelation(sampleRel, { tenantId: 't1', appScope: 'crm7' });
    for (const dropped of [
      'source_field_id',
      'target_field_id',
      'on_delete',
      'on_update',
    ]) {
      expect(dropped in row).toBe(false);
    }
  });

  it('toDbRelation strips applyAsPostgresFK one-shot intent', () => {
    const row = toDbRelation(sampleRel, { tenantId: null, appScope: 'all' });
    expect('applyAsPostgresFK' in row).toBe(false);
    expect((row.metadata as Record<string, unknown>).applyAsPostgresFK).toBeUndefined();
  });

  it('fromDbRelation re-hydrates a DB row to the Zod shape', () => {
    const dbRow: TenantEntityRelation = {
      id: '33333333-3333-4333-8333-333333333333',
      tenant_id: 't1',
      source_entity_id: 'orders',
      target_entity_id: 'customers',
      relation_type: 'one_to_many',
      source_label: 'OrderCustomer',
      target_label: null,
      is_system: true,
      app_scope: 'crm7',
      metadata: {},
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    };
    const rel = fromDbRelation(dbRow);
    expect(rel.source.tableId).toBe('orders');
    expect(rel.target.tableId).toBe('customers');
    expect(rel.metadata.cardinality).toBe('one_to_many');
    expect(rel.metadata.isSystem).toBe(true);
    // applyAsPostgresFK is never persisted — always re-defaults to false.
    expect(rel.metadata.applyAsPostgresFK).toBe(false);
  });

  it('fromDbRelation defaults the un-persisted UI-model fields', () => {
    // The database cannot answer these, so the re-hydrated relation must fall
    // to defaults rather than inventing a column-level anchor that no row has.
    const dbRow: TenantEntityRelation = {
      id: '44444444-4444-4444-8444-444444444444',
      tenant_id: null,
      source_entity_id: 'a',
      target_entity_id: 'b',
      relation_type: 'many_to_many',
      source_label: null,
      target_label: null,
      is_system: false,
      app_scope: 'all',
      metadata: null,
      created_at: null,
      updated_at: null,
    };
    const rel = fromDbRelation(dbRow);
    expect(rel.source.fieldId).toBeUndefined();
    expect(rel.target.fieldId).toBeUndefined();
    expect(rel.metadata.onDelete).toBe('SET NULL');
    expect(rel.metadata.onUpdate).toBe('CASCADE');
  });

  it('ZOD_TO_DB_ALIASES covers every translated column', () => {
    const dbCols = ZOD_TO_DB_ALIASES.map(([, db]) => db);
    expect(dbCols).toEqual(
      expect.arrayContaining([
        'id',
        'source_entity_id',
        'target_entity_id',
        'relation_type',
        'is_system',
      ]),
    );
  });

  it('ZOD_TO_DB_ALIASES names no column the table does not have', () => {
    const dbCols = ZOD_TO_DB_ALIASES.map(([, db]) => db);
    for (const dropped of [
      'source_field_id',
      'target_field_id',
      'on_delete',
      'on_update',
    ]) {
      expect(dbCols).not.toContain(dropped);
    }
  });
});
