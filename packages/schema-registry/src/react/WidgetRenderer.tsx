'use client';
import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CardWidget } from './widgets/Card.js';
import { DataTableWidget } from './widgets/DataTable.js';
import { EntityRefCellWidget } from './widgets/EntityRefCell.js';
import { EntitySelectorWidget } from './widgets/EntitySelector.js';
import { FormRendererWidget } from './widgets/FormRenderer.js';
import { SchemaFieldAdderWidget } from './widgets/SchemaFieldAdder.js';
import { StatGridWidget } from './widgets/StatGrid.js';
import { UnknownWidget } from './widgets/UnknownWidget.js';
import { WidgetPropsSchema } from '../schemas/widgetProps.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { getWidgetById } from './registerWidget.js';
// Side-effect import: ensures the 7 built-ins self-register.
import './registerBuiltins.js';

interface WidgetDef {
  id: string;
  type: string;
  props: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

interface Props {
  widgets: WidgetDef[];
  supabase: SupabaseClient;
  appScope: string;
  context?: Record<string, unknown>;
}

export function WidgetRenderer({ widgets, supabase, appScope, context }: Props) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {widgets.map((widget) => (
        <ErrorBoundary key={widget.id} fallback={null}>
          <div style={{ gridColumn: `span ${widget.position.w}` }}>
            <SingleWidget widget={widget} supabase={supabase} appScope={appScope} context={context} />
          </div>
        </ErrorBoundary>
      ))}
    </div>
  );
}

function SingleWidget({
  widget,
  supabase,
  appScope,
  context,
}: {
  widget: WidgetDef;
  supabase: SupabaseClient;
  appScope: string;
  context?: Record<string, unknown>;
}) {
  // Parse via the Zod discriminated union first — rejects unknown types with
  // UnknownWidget fallback. Built-in types get strongly-typed dispatch; any
  // type not in the built-in switch falls through to the consumer registry.
  const parsed = WidgetPropsSchema.safeParse({ type: widget.type, ...widget.props });
  if (!parsed.success) {
    // Not in the canonical discriminated union — last resort: check the runtime
    // registry for a consumer-registered widget by id.
    const consumerEntry = getWidgetById(widget.type);
    if (consumerEntry) {
      // Registry components accept Props via the generic registry API;
      // we forward the widget's authored props + renderer context.
      // Cast is safe: registry is heterogeneous by design (per registerWidget.ts).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry components accept widget-specific prop shapes
      const Component = consumerEntry.component as React.ComponentType<any>;
      return <Component {...widget.props} supabase={supabase} appScope={appScope} context={context} />;
    }
    return <UnknownWidget type={widget.type} />;
  }

  const p = parsed.data;
  switch (p.type) {
    case 'DataTable':
      return <DataTableWidget supabase={supabase} appScope={appScope} widgetProps={p} />;
    case 'StatGrid':
      return <StatGridWidget supabase={supabase} entity={p.entity} metric={p.metric} appScope={appScope} />;
    case 'EntitySelector':
      return (
        <EntitySelectorWidget
          supabase={supabase}
          entity={p.entity}
          displayField={p.display_field}
          appScope={appScope}
        />
      );
    case 'Card':
      return (
        <CardWidget title={p.title} collapsible={p.collapsible}>
          {context ? <pre className="text-xs">{JSON.stringify(context, null, 2)}</pre> : null}
        </CardWidget>
      );
    case 'FormRenderer':
      return (
        <FormRendererWidget
          supabase={supabase}
          entity={p.entity}
          fields={p.fields}
          submitLabel={p.submit_label}
          appScope={appScope}
        />
      );
    case 'EntityRefCell':
      return <EntityRefCellWidget supabase={supabase} appScope={appScope} widgetProps={p} />;
    case 'SchemaFieldAdder':
      return <SchemaFieldAdderWidget supabase={supabase} widgetProps={p} />;
    default: {
      // Exhaustiveness check — any new member of the discriminated union will
      // trip this at compile time.
      const _exhaustive: never = p;
      return <UnknownWidget type={(_exhaustive as { type: string }).type} />;
    }
  }
}
