export { useTenantSchema } from './react/useTenantSchema.js';
export { useTenantNavigation } from './react/useTenantNavigation.js';
export { createMinimalClient } from './react/minimalClient.js';
export type { AppScope } from './react/types.js';

// Client-agnostic schema-builder service (v0.4.0). `AppScope` here (`r8`)
// differs from the nav-layer `AppScope` (`r80`), so it is aliased to
// `SchemaBuilderAppScope` to avoid a name collision.
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
