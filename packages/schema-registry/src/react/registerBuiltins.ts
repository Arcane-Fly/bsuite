'use client';
/**
 * Self-registers the 7 built-in widgets into the module-scoped registry.
 * Imported for side-effects by the package barrel, so consumers get the
 * defaults for free.
 *
 * Consumer apps that need custom widgets can call `registerWidget(...)` at
 * mount time; re-registering the same id is idempotent.
 */
import { registerWidget } from './registerWidget';
import { CardWidget } from './widgets/Card';
import { DataTableWidget } from './widgets/DataTable';
import { EntityRefCellWidget } from './widgets/EntityRefCell';
import { EntitySelectorWidget } from './widgets/EntitySelector';
import { FormRendererWidget } from './widgets/FormRenderer';
import { SchemaFieldAdderWidget } from './widgets/SchemaFieldAdder';
import { StatGridWidget } from './widgets/StatGrid';

// Use a module-local flag to prevent double-registration when the module is
// evaluated in multiple bundles (e.g. SSR + client).
let registered = false;

export function registerBuiltinWidgets(): void {
  if (registered) return;
  registered = true;

  // Note: these components are intentionally typed loosely in the registry —
  // each is invoked by the renderer with its exact Zod-parsed props, not via
  // the registry interface (which is for consumer-authored widgets).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- built-ins accept widget-specific prop shapes; registry is heterogeneous
  registerWidget<any>({ id: 'Card', name: 'Card', component: CardWidget });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  registerWidget<any>({ id: 'DataTable', name: 'Data Table', component: DataTableWidget });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  registerWidget<any>({ id: 'EntityRefCell', name: 'Entity Reference', component: EntityRefCellWidget });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  registerWidget<any>({ id: 'EntitySelector', name: 'Entity Selector', component: EntitySelectorWidget });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  registerWidget<any>({ id: 'FormRenderer', name: 'Form Renderer', component: FormRendererWidget });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  registerWidget<any>({ id: 'SchemaFieldAdder', name: 'Schema Field Adder', component: SchemaFieldAdderWidget });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  registerWidget<any>({ id: 'StatGrid', name: 'Stat Grid', component: StatGridWidget });
}

// Side-effect: register on import. Consumer just needs to touch the barrel.
registerBuiltinWidgets();
