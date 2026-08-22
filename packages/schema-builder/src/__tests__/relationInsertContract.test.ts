/**
 * THE GATE THAT WAS MISSING FOR THREE AND A HALF MONTHS.
 *
 * Migration 20260503000001 dropped four columns from
 * `public.tenant_entity_relations` on 2026-05-03. `types.ts` kept declaring
 * them, `toDbRelation` kept emitting them, and `SchemaCanvas` kept sending
 * them. PostgREST rejects an insert naming a column that does not exist, so
 * EVERY relationship write failed with PGRST204 — the table held 0 rows across
 * all 7 tenants and the canvas drew 0 edges, in production, for the entire
 * period. Nothing failed a build, because nothing compared the write payload
 * against the table.
 *
 * That is the whole job of this file. It is deliberately paranoid in three
 * ways, each answering a way a check like this normally rots:
 *
 *   1. It derives the dropped columns from the SHIPPED SQL, not from the
 *      TypeScript it is checking. A test that reads its expectation out of the
 *      code under test only proves the code equals itself.
 *   2. It carries POSITIVE CONTROLS. A regex that silently stops matching
 *      reports an empty set, and an empty set trivially satisfies "none of
 *      these leaked". Absence of evidence reads identical to a pass, so the
 *      parser must first prove it can still see what it is looking for.
 *   3. It asserts the payload is a SUBSET of the measured live columns, not
 *      merely that four known-bad names are absent. The next dropped column
 *      will not be one of those four.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SchemaRelationSchema, toDbRelation } from '../schemas.js';
import {
  RELATION_COLUMNS_DROPPED_20260503,
  TENANT_ENTITY_RELATIONS_COLUMNS,
} from '../types.js';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'supabase',
  'migrations',
);

/** Every `ALTER TABLE public.tenant_entity_relations ... DROP COLUMN x` in the
 *  package's own shipped migrations, in filename order. */
function droppedColumnsFromShippedMigrations(): string[] {
  const dropped: string[] = [];
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    // Isolate each ALTER TABLE ... ; statement that targets our table, so a
    // DROP COLUMN belonging to a DIFFERENT table in the same file cannot be
    // misattributed to this one.
    const statements =
      sql.match(
        /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?tenant_entity_relations\b[\s\S]*?;/gi,
      ) ?? [];
    for (const stmt of statements) {
      for (const m of stmt.matchAll(
        /DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?([a-z_][a-z0-9_]*)"?/gi,
      )) {
        dropped.push(m[1].toLowerCase());
      }
    }
  }
  return dropped;
}

/** A representative relation carrying every UI-model field, including the ones
 *  that must NOT be persisted. If the write path ever starts forwarding them,
 *  this is the input that catches it. */
const relationWithEverythingSet = SchemaRelationSchema.parse({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'OrderCustomer',
  source: { tableId: 'orders', fieldId: 'customer_id', handle: 'right' },
  target: { tableId: 'customers', fieldId: 'id', handle: 'left' },
  metadata: {
    cardinality: 'one_to_many',
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
    isSystem: false,
    applyAsPostgresFK: true,
  },
});

describe('migration parser positive controls', () => {
  // Without these, a regex that silently stopped matching would report "no
  // dropped columns", and every assertion below would pass vacuously.
  it('can still see DROP COLUMN in the shipped migrations', () => {
    const dropped = droppedColumnsFromShippedMigrations();
    expect(dropped.length).toBeGreaterThan(0);
  });

  it('finds exactly the four columns 20260503000001 dropped', () => {
    const dropped = new Set(droppedColumnsFromShippedMigrations());
    for (const col of RELATION_COLUMNS_DROPPED_20260503) {
      expect(dropped).toContain(col);
    }
  });

  it('attributes a DROP COLUMN on another table to that other table', () => {
    // Guards the statement-isolation above. A parser that greps the whole file
    // for DROP COLUMN would wrongly claim `unrelated_col` here.
    const sql = `
      ALTER TABLE public.some_other_table DROP COLUMN unrelated_col;
      ALTER TABLE public.tenant_entity_relations DROP COLUMN ours;
    `;
    const statements =
      sql.match(
        /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?tenant_entity_relations\b[\s\S]*?;/gi,
      ) ?? [];
    const found = statements.flatMap((s) =>
      [
        ...s.matchAll(/DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?([a-z_][a-z0-9_]*)"?/gi),
      ].map((m) => m[1]),
    );
    expect(found).toEqual(['ours']);
  });
});

describe('relation insert contract', () => {
  it('never emits a column the shipped migrations dropped', () => {
    const dropped = new Set(droppedColumnsFromShippedMigrations());
    const row = toDbRelation(relationWithEverythingSet, {
      tenantId: 't1',
      appScope: 'crm7',
    });
    const leaked = Object.keys(row).filter((k) => dropped.has(k));
    expect(leaked).toEqual([]);
  });

  it('emits only columns the live table actually has', () => {
    const live = new Set<string>(TENANT_ENTITY_RELATIONS_COLUMNS);
    const row = toDbRelation(relationWithEverythingSet, {
      tenantId: 't1',
      appScope: 'crm7',
    });
    const unknown = Object.keys(row).filter((k) => !live.has(k));
    // This is the assertion that would have caught the original bug on the day
    // the migration landed, and that catches the NEXT dropped column too.
    expect(unknown).toEqual([]);
  });

  it('supplies every NOT NULL column the table requires', () => {
    // Measured NOT NULL on 2026-08-22: id, source_entity_id, target_entity_id,
    // relation_type, app_scope. An insert omitting one of these fails at
    // runtime just as loudly as naming a column that does not exist.
    const required = [
      'id',
      'source_entity_id',
      'target_entity_id',
      'relation_type',
      'app_scope',
    ];
    const row = toDbRelation(relationWithEverythingSet, {
      tenantId: 't1',
      appScope: 'crm7',
    });
    for (const col of required) {
      expect(Object.keys(row)).toContain(col);
      expect(row[col as keyof typeof row]).not.toBeNull();
      expect(row[col as keyof typeof row]).not.toBeUndefined();
    }
  });

  it('keeps the measured column constant and the row type in step', () => {
    // Both halves are hand-maintained; this fails if someone edits one only.
    const row = toDbRelation(relationWithEverythingSet, {
      tenantId: 't1',
      appScope: 'crm7',
    });
    // Every key the writer produces must be declared in the constant...
    for (const key of Object.keys(row)) {
      expect(TENANT_ENTITY_RELATIONS_COLUMNS).toContain(key);
    }
    // ...and the constant must not have quietly regrown a dropped column.
    for (const col of RELATION_COLUMNS_DROPPED_20260503) {
      expect(TENANT_ENTITY_RELATIONS_COLUMNS).not.toContain(col);
    }
  });
});
