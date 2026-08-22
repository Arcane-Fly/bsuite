/**
 * Zod schemas for Schema Builder domain objects. Source of truth for both
 * React Flow edge rendering (SchemaRelationSchema -> crow's-foot markers) and
 * the Supabase mutation layer (via toDbRelation / fromDbRelation).
 *
 * See `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.9.
 */

import { z } from 'zod';
import type { TenantEntityRelation } from './types.js';

/** Airtable / Supabase FK semantics. Maps 1:1 onto DB `relation_type`. */
export const CardinalitySchema = z.enum([
  'one_to_one',
  'one_to_many',
  'many_to_many',
  'inherits_from',
]);
export type Cardinality = z.infer<typeof CardinalitySchema>;

/** Referential-action semantics for the FK columns. */
export const ReferentialActionSchema = z.enum([
  'CASCADE',
  'SET NULL',
  'RESTRICT',
  'NO ACTION',
]);
export type ReferentialAction = z.infer<typeof ReferentialActionSchema>;

/** A single column row inside an entity card. */
export const EntityFieldSchema = z.object({
  /** Usually the fully-qualified `${tableId}.${columnName}`. */
  id: z.string(),
  /** Column name (e.g. 'customer_id'). */
  name: z.string(),
  /** Postgres type ('uuid', 'text', 'timestamptz', ...). */
  type: z.string(),
  isPrimary: z.boolean().default(false),
  isNullable: z.boolean().default(true),
});
export type EntityField = z.infer<typeof EntityFieldSchema>;

/** The React Flow node's `data` prop shape. */
export const EntityNodeDataSchema = z.object({
  /** Matches `tenant_entities.id`. */
  tableId: z.string(),
  /** Human-readable entity name. */
  label: z.string(),
  /** Column rows; empty for Phase 1a, populated in Phase 1b reflection. */
  fields: z.array(EntityFieldSchema).default([]),
  /**
   * CSS variable name (`var(--accent-primary)`) — never a hex literal, per
   * §3.5 R1 refinement. D2C vs Corporate themes render correctly without
   * re-authoring.
   */
  accentColor: z.string().optional(),
  collapsed: z.boolean().default(false),
  /** Flag for read-only display when the entity is a system / platform row. */
  isSystem: z.boolean().default(false),
});
export type EntityNodeData = z.infer<typeof EntityNodeDataSchema>;

/**
 * One edge on the canvas = one documented relation between two ENTITIES.
 *
 * ⚠ `source.fieldId`, `target.fieldId`, `metadata.onDelete` and
 * `metadata.onUpdate` are UI-MODEL ONLY and ARE NOT PERSISTED. The columns
 * that backed them were dropped by migration 20260503000001 (see
 * `TenantEntityRelation` in types.ts for the full history). `toDbRelation`
 * deliberately does not emit them, and `relationInsertContract.test.ts` fails
 * if it ever starts to again.
 *
 * They are retained on the Zod model so that the drag gesture can keep
 * reporting which handle it started from, and so that re-applying
 * 20260503000000 is a small diff rather than a rewrite. Do not read them back
 * expecting a round trip — `fromDbRelation` leaves fieldId undefined and lets
 * onDelete/onUpdate fall to their defaults, because the database has nothing to
 * tell it.
 */
export const SchemaRelationSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),

  source: z.object({
    tableId: z.string(),
    fieldId: z.string().optional(),
    handle: z.enum(['left', 'right', 'top', 'bottom']).default('right'),
  }),

  target: z.object({
    tableId: z.string(),
    fieldId: z.string().optional(),
    handle: z.enum(['left', 'right', 'top', 'bottom']).default('left'),
  }),

  metadata: z.object({
    cardinality: CardinalitySchema.default('one_to_many'),
    onDelete: ReferentialActionSchema.default('SET NULL'),
    onUpdate: ReferentialActionSchema.default('CASCADE'),
    /**
     * True iff this row REFLECTS an existing native Postgres FK discovered by
     * schema reflection. UI-read-only in 1b.
     */
    isSystem: z.boolean().default(false),
    /**
     * One-shot intent: emit ALTER TABLE ... ADD CONSTRAINT via the
     * apply_schema_relation RPC on next save. Never persisted — the RPC
     * consumes and clears it. Deferred behind Q9 gating.
     */
    applyAsPostgresFK: z.boolean().default(false),
  }),
});
export type SchemaRelation = z.infer<typeof SchemaRelationSchema>;

/**
 * Alias table (Zod -> DB column, §3.9). Used by toDbRelation / fromDbRelation.
 * Kept exported so tests can assert coverage of every column.
 */
export const ZOD_TO_DB_ALIASES = [
  ['id', 'id'],
  ['name', 'source_label'],
  ['source.tableId', 'source_entity_id'],
  ['target.tableId', 'target_entity_id'],
  ['metadata.cardinality', 'relation_type'],
  ['metadata.isSystem', 'is_system'],
] as const;

/**
 * Translate a validated `SchemaRelation` into the `tenant_entity_relations`
 * row shape expected by the Supabase upsert. The `source.handle` /
 * `target.handle` fields are intentionally dropped — they are UI-only; the
 * full React Flow Handle ID (`${tableId}.${fieldId}.${handle}`) is
 * reconstructed at render time by `EntityNode` and never persisted.
 *
 * `metadata.applyAsPostgresFK` is also dropped — it is consumed by the
 * `apply_schema_relation` RPC, not stored.
 */
export function toDbRelation(
  relation: SchemaRelation,
  opts: { tenantId: string | null; appScope: string },
): Omit<TenantEntityRelation, 'created_at' | 'updated_at'> {
  return {
    id: relation.id,
    tenant_id: opts.tenantId,
    source_entity_id: relation.source.tableId,
    target_entity_id: relation.target.tableId,
    relation_type: relation.metadata.cardinality,
    source_label: relation.name ?? null,
    target_label: null,
    is_system: relation.metadata.isSystem,
    app_scope: opts.appScope as TenantEntityRelation['app_scope'],
    metadata: {},
  };
}

/** Reverse of toDbRelation — rebuild a Zod-validated relation from a DB row. */
export function fromDbRelation(row: TenantEntityRelation): SchemaRelation {
  return SchemaRelationSchema.parse({
    id: row.id,
    name: row.source_label ?? undefined,
    source: {
      tableId: row.source_entity_id,
      handle: 'right',
    },
    target: {
      tableId: row.target_entity_id,
      handle: 'left',
    },
    metadata: {
      cardinality: row.relation_type,
      isSystem: row.is_system,
      applyAsPostgresFK: false,
    },
  });
}
