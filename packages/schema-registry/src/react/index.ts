export { TenantLayoutSlot } from './TenantLayoutSlot';
export { useTenantSchema } from './useTenantSchema';
export { useTenantPageLayout } from './useTenantPageLayout';
export { useTenantNavigation } from './useTenantNavigation';
export { createMinimalClient } from './minimalClient';
export type { AppScope } from './types';

// Widget registry plugin API (v0.2.0)
export {
  registerWidget,
  getRegisteredWidgets,
  getWidgetById,
  _resetRegistryForTests,
} from './registerWidget';
export type { WidgetRegistryEntry, PropsEditorProps } from './registerWidget';

// New canonical widgets (v0.2.0)
export { EntityRefCellWidget } from './widgets/EntityRefCell';
export { SchemaFieldAdderWidget } from './widgets/SchemaFieldAdder';

// Built-in widget components (existing)
export { DataTableWidget } from './widgets/DataTable';
export { StatGridWidget } from './widgets/StatGrid';
export { EntitySelectorWidget } from './widgets/EntitySelector';
export { CardWidget } from './widgets/Card';
export { FormRendererWidget } from './widgets/FormRenderer';
export { UnknownWidget } from './widgets/UnknownWidget';

// Self-registration side-effect (ensures built-ins appear in registry)
import './registerBuiltins';
