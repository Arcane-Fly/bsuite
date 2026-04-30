export { useTenantSchema } from './react/useTenantSchema.js';
export { useTenantNavigation } from './react/useTenantNavigation.js';
export { createMinimalClient } from './react/minimalClient.js';
export type { AppScope } from './react/types.js';
export {
  DataTablePropsSchema,
  StatGridPropsSchema,
  EntitySelectorPropsSchema,
  CardPropsSchema,
  FormRendererPropsSchema,
  EntityRefCellPropsSchema,
  SchemaFieldAdderPropsSchema,
  WidgetPropsSchema,
  LayoutJsonSchema,
} from './schemas/widgetProps.js';
export type { WidgetProps, LayoutJson } from './schemas/widgetProps.js';

// Deprecated shim (0.3.1+) — re-export for top-level consumers.
// Will be removed in 0.4.0 per ADR-0001/0003.
export { TenantLayoutSlot } from './react/TenantLayoutSlot.js';
export type { TenantLayoutSlotProps } from './react/TenantLayoutSlot.js';
