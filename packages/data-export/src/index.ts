/**
 * @bsuite/data-export — main entry.
 *
 * Exports lightweight types + CSV + JSON + browser helpers + domain-free
 * field-mapping and format-detection utilities. The XLSX subpath is **not**
 * re-exported here: consumers that need XLSX must import from
 * `@bsuite/data-export/xlsx` directly. This guarantees that apps only using
 * CSV (e.g. BSU analytics) never pull `@e965/xlsx` into their dependency
 * graph, even transitively.
 *
 * ```ts
 * import { toCsvBlob, detectFormat } from '@bsuite/data-export';
 * import { downloadBlob } from '@bsuite/data-export/browser';
 * import { toXlsxBlob } from '@bsuite/data-export/xlsx'; // only when needed
 * ```
 */

export type {
  CellValue,
  CoerceOptions,
  HeaderStyle,
  InputRow,
  Row,
  SanitizeMode,
  SheetSpec,
} from './types.js';

export { sanitizeForFormula, applySanitize } from './sanitize.js';
export { coerceCell, unionHeaders, prepareRow } from './coerce.js';

export {
  toCsv,
  toCsvBlob,
  parseCsv,
  type ToCsvOptions,
  type ParseCsvOptions,
  type ParseCsvResult,
  type ParseCsvError,
  type ParseCsvInput,
} from './csv/index.js';

export { toJson, toJsonBlob, type ToJsonOptions } from './json/index.js';

export { downloadBlob } from './browser/index.js';

export {
  applyFieldMappings,
  autoDetectMappings,
  type FieldMapping,
  type FieldTarget,
} from './mappings.js';

export { detectFormat, type ExportFormat } from './detect.js';
