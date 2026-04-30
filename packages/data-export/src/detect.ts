export type ExportFormat = 'csv' | 'xlsx' | 'json';

/**
 * Detect the export format from a File, Blob (via a supplied filename), or
 * filename string. Matches by file extension:
 *
 * | Extension | Format |
 * |-----------|--------|
 * | `.csv`    | `csv`  |
 * | `.xlsx`, `.xls` | `xlsx` |
 * | `.json`   | `json` |
 *
 * Throws for unsupported extensions — callers are expected to surface this
 * to the user (e.g. a file-upload wizard that rejects the file).
 *
 * @throws {Error} when the extension is not recognised or missing.
 */
export function detectFormat(input: File | string): ExportFormat {
  const name = typeof input === 'string' ? input : input.name;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'csv':
      return 'csv';
    case 'xlsx':
    case 'xls':
      return 'xlsx';
    case 'json':
      return 'json';
    default:
      throw new Error(
        `@bsuite/data-export: unsupported file extension ".${ext}". ` +
          `Supported: .csv, .xlsx, .xls, .json`,
      );
  }
}
