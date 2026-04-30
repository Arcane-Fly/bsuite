const JSON_MIME = 'application/json';

export interface ToJsonOptions {
  /** Pretty-print with 2-space indent. Default `true`. */
  pretty?: boolean;
}

/**
 * BigInt-safe replacer — JSON.stringify throws on bigint, so we stringify it.
 * Everything else passes through.
 */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString(10) : value;
}

/**
 * Serialise any JSON-compatible value to a string.
 */
export function toJson(data: unknown, options: ToJsonOptions = {}): string {
  const pretty = options.pretty ?? true;
  return JSON.stringify(data, bigintReplacer, pretty ? 2 : undefined);
}

/**
 * Serialise any JSON-compatible value to a Blob.
 */
export function toJsonBlob(data: unknown, options: ToJsonOptions = {}): Blob {
  return new Blob([toJson(data, options)], { type: JSON_MIME });
}
