export { useTenantSchema } from './useTenantSchema.js';
export { useTenantNavigation } from './useTenantNavigation.js';
export { createMinimalClient } from './minimalClient.js';
export type { AppScope } from './types.js';

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
