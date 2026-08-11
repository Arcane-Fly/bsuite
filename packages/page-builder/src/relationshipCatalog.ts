import type { RelationshipCatalog, RelationshipWidgetDetail } from './types.js';

/**
 * True only when `detail` names a relationship literally present in
 * `catalog` — the W4-2 gate ("a relationship field may only be offered
 * where the host record genuinely has a foreign key to write").
 *
 * `catalog` is undefined/empty-safe by design: no catalogue means nothing
 * has been proven writable, so every relationship is refused (fail closed)
 * rather than silently offering a picker that cannot save. This is the only
 * place that decision is made — `PageGridLayout`'s add-relationship-widget
 * handler calls this before ever creating a widget, and it is exported so
 * consumers (e.g. a canvas "add element" palette deciding what to list) can
 * apply the identical rule ahead of dispatching the event.
 *
 * `@bsuite/page-builder` never infers writability itself — it has no notion
 * of a database. Consumers build `catalog` from a live schema source (in
 * crm7, `report_catalog_joins` filtered to `cardinality = 'many_to_one'`
 * and `is_active = true`, cross-checked against `pg_constraint` — see the
 * Wave 4 implementation PR for the verification query and evidence).
 */
export function isRelationshipWritable(
  catalog: RelationshipCatalog | undefined,
  detail: Pick<RelationshipWidgetDetail, 'hostEntityType' | 'fkColumn' | 'targetEntityType'>,
): boolean {
  if (!catalog || catalog.length === 0) return false;
  return catalog.some(
    (entry) =>
      entry.hostEntityType === detail.hostEntityType &&
      entry.fkColumn === detail.fkColumn &&
      entry.targetEntityType === detail.targetEntityType,
  );
}
