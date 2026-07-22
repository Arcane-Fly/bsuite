export { useTenantSchema } from './useTenantSchema.js';
export { useTenantNavigation } from './useTenantNavigation.js';
export { createMinimalClient } from './minimalClient.js';
export type { AppScope } from './types.js';

// Client-agnostic schema-builder service (v0.4.0) — canonical source for the
// apps' triplicated src/lib/schemaBuilderService.ts. After the 2026-07-23 r8
// normalization, this service's `AppScope` and the nav-layer `./types.ts`
// `AppScope` are structurally identical (both `r8`) — both exported from this
// barrel; consumers may use either.
export { createSchemaBuilderService, APP_SCOPES } from './schemaBuilderService.js';
export type {
  SchemaBuilderService,
  TenantEntity,
  TenantEntityRelation,
  FieldType,
  EntityFieldDefinition,
  AppScope as SchemaBuilderAppScope,
} from './schemaBuilderService.js';

// Feature-gate hook (v0.4.0) — fail-open `is_feature_enabled` RPC wrapper.
export { useFeatureEnabled } from './useFeatureEnabled.js';
export type { FeatureType } from './useFeatureEnabled.js';

// Deprecated shim (0.3.1+) — will be removed in 0.4.0 per ADR-0001/0003.
export { TenantLayoutSlot } from './TenantLayoutSlot.js';
export type { TenantLayoutSlotProps } from './TenantLayoutSlot.js';

// Widget registry plugin API (v0.2.0)
export {
  registerWidget,
  getRegisteredWidgets,
  getWidgetById,
  _resetRegistryForTests,
} from './registerWidget.js';
export type { WidgetRegistryEntry, PropsEditorProps } from './registerWidget.js';

// New canonical widgets (v0.2.0)
export { EntityRefCellWidget } from './widgets/EntityRefCell.js';
export { SchemaFieldAdderWidget } from './widgets/SchemaFieldAdder.js';

// Built-in widget components (existing)
export { DataTableWidget } from './widgets/DataTable.js';
export { StatGridWidget } from './widgets/StatGrid.js';
export { EntitySelectorWidget } from './widgets/EntitySelector.js';
export { CardWidget } from './widgets/Card.js';
export { FormRendererWidget } from './widgets/FormRenderer.js';
export { UnknownWidget } from './widgets/UnknownWidget.js';

// Self-registration side-effect (ensures built-ins appear in registry)
import './registerBuiltins.js';
