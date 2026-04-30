/**
 * Generic field-mapping utilities for CSV/XLSX import pipelines.
 *
 * The package ships only domain-agnostic helpers: `FieldMapping` type,
 * `applyFieldMappings`, and `autoDetectMappings`. Domain-specific mapping
 * tables (e.g. crm7's WAAMS → CRM column mappings) stay in the consumer
 * application where they belong.
 */

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export interface FieldTarget {
  label: string;
  value: string;
}

/**
 * Rewrite an array of rows so each row has keys matching the `targetField` of
 * the supplied mappings. Source keys without a mapping are dropped.
 */
export function applyFieldMappings<T extends Record<string, unknown>>(
  rows: readonly T[],
  mappings: readonly FieldMapping[],
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const mapping of mappings) {
      if (Object.prototype.hasOwnProperty.call(row, mapping.sourceField)) {
        out[mapping.targetField] = row[mapping.sourceField];
      }
    }
    return out;
  });
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[_\s-]/g, '');
}

/**
 * Best-effort match of source headers (from a CSV/XLSX) to target fields
 * (database columns). Matches are attempted in this order:
 *
 * 1. Exact case-insensitive match on `target.value` (after stripping `_`,
 *    `-`, and whitespace on both sides).
 * 2. Exact case-insensitive match on `target.label`.
 *
 * Unmatched headers are silently skipped — consumers surface them to the
 * user for manual mapping in their import wizard.
 */
export function autoDetectMappings(
  sourceHeaders: readonly string[],
  targetFields: readonly FieldTarget[],
): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  for (const header of sourceHeaders) {
    const normalized = normalize(header);
    const exact = targetFields.find((f) => normalize(f.value) === normalized);
    if (exact) {
      mappings.push({ sourceField: header, targetField: exact.value });
      continue;
    }
    const label = targetFields.find((f) => normalize(f.label) === normalized);
    if (label) {
      mappings.push({ sourceField: header, targetField: label.value });
    }
  }
  return mappings;
}
