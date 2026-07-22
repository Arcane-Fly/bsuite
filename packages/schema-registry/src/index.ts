export { useTenantSchema } from './react/useTenantSchema.js';
export { useTenantNavigation } from './react/useTenantNavigation.js';
export { createMinimalClient } from './react/minimalClient.js';
export type { AppScope } from './react/types.js';

// Client-agnostic schema-builder service (v0.4.0). After the 2026-07-23 r8
// normalization, this service's `AppScope` and the nav-layer `AppScope` are
// structurally identical (both `r8`) — both exported; `SchemaBuilderAppScope`
// is kept as a back-compat alias for 0.4.0 consumers.
export { createSchemaBuilderService, APP_SCOPES } from './react/schemaBuilderService.js';
export type {
  SchemaBuilderService,
  TenantEntity,
  TenantEntityRelation,
  FieldType,
  EntityFieldDefinition,
  AppScope as SchemaBuilderAppScope,
} from './react/schemaBuilderService.js';

// Feature-gate hook (v0.4.0) — fail-open `is_feature_enabled` RPC wrapper.
export { useFeatureEnabled } from './react/useFeatureEnabled.js';
export type { FeatureType } from './react/useFeatureEnabled.js';
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
