'use client';
/**
 * Widget registry — plugin-style API so consumer apps can register additional
 * widget types at mount time without modifying @bsuite/schema-registry source.
 *
 * Registration is idempotent: re-registering the same `id` overwrites silently.
 * This matches how the 5 built-in widgets (DataTable, StatGrid, EntitySelector,
 * Card, FormRenderer) + the 2 new ones (EntityRefCell, SchemaFieldAdder) are
 * bootstrapped at module load by `registerBuiltins.ts`.
 *
 * Consumers: `import { registerWidget } from '@bsuite/schema-registry/react'`
 * then call once at app-mount (e.g. in `main.tsx`).
 */
import type { ComponentType } from 'react';

export interface WidgetRegistryEntry<Props = Record<string, unknown>> {
  id: string;
  name: string;
  component: ComponentType<Props>;
  PropsEditor?: ComponentType<PropsEditorProps<Props>>;
  defaultProps?: Partial<Props>;
}

export interface PropsEditorProps<Props = Record<string, unknown>> {
  props: Props;
  onChange: (next: Props) => void;
}

// Module-scoped registry. Map keyed by widget id for O(1) lookup.
// Note: untyped `unknown` for component props here is intentional — the registry
// is heterogeneous; per-widget typing lives on the WidgetRegistryEntry call-site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry is intentionally heterogeneous
const registry: Map<string, WidgetRegistryEntry<any>> = new Map();

export function registerWidget<Props>(entry: WidgetRegistryEntry<Props>): void {
  if (!entry.id || entry.id.length === 0) {
    throw new Error('[schema-registry] registerWidget: `id` is required');
  }
  if (typeof entry.component !== 'function' && typeof entry.component !== 'object') {
    throw new Error(`[schema-registry] registerWidget: \`component\` for '${entry.id}' must be a React component`);
  }
  registry.set(entry.id, entry as WidgetRegistryEntry<unknown>);
}

export function getRegisteredWidgets(): ReadonlyArray<WidgetRegistryEntry<unknown>> {
  return Array.from(registry.values());
}

export function getWidgetById(id: string): WidgetRegistryEntry<unknown> | undefined {
  return registry.get(id);
}

/** Test-only escape hatch — clears the registry between vitest cases. */
export function _resetRegistryForTests(): void {
  registry.clear();
}
