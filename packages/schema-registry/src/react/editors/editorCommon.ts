'use client';
import type { z, ZodTypeAny } from 'zod';

export interface PropsEditorShellProps<P> {
  props: P;
  onChange: (next: P) => void;
}

export interface ZodValidationResult<P> {
  ok: boolean;
  value: P;
  issues: Record<string, string>;
}

/**
 * Runs a Zod schema against a candidate props object and returns either the
 * parsed (and possibly transformed) value plus success flag, or the value
 * as-is with an `issues` map keyed by dotted path. Never throws.
 */
export function validateWith<S extends ZodTypeAny>(
  schema: S,
  candidate: unknown
): ZodValidationResult<z.infer<S>> {
  const result = schema.safeParse(candidate);
  if (result.success) {
    return { ok: true, value: result.data, issues: {} };
  }
  const issues: Record<string, string> = {};
  for (const err of result.error.issues) {
    const key = err.path.length > 0 ? err.path.map(String).join('.') : '_root';
    issues[key] = err.message;
  }
  return { ok: false, value: candidate as z.infer<S>, issues };
}

/** Shared Tailwind string fragments — kept as anchored literals, no regex. */
export const EDITOR_INPUT_CLASS =
  'w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary';
export const EDITOR_LABEL_CLASS = 'block text-xs font-medium text-foreground';
export const EDITOR_ERROR_CLASS = 'mt-0.5 text-xs text-destructive';
export const EDITOR_SECTION_CLASS = 'space-y-3';
