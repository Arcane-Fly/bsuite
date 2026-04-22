'use client';
import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DataTableWidget } from './widgets/DataTable';
import { StatGridWidget } from './widgets/StatGrid';
import { EntitySelectorWidget } from './widgets/EntitySelector';
import { CardWidget } from './widgets/Card';
import { FormRendererWidget } from './widgets/FormRenderer';
import { UnknownWidget } from './widgets/UnknownWidget';
import { WidgetPropsSchema } from '../schemas/widgetProps';
import { ErrorBoundary } from './ErrorBoundary';

interface WidgetDef { id: string; type: string; props: Record<string, unknown>; position: { x: number; y: number; w: number; h: number }; }
interface Props { widgets: WidgetDef[]; supabase: SupabaseClient; appScope: string; context?: Record<string, unknown>; }

export function WidgetRenderer({ widgets, supabase, appScope, context }: Props) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {widgets.map(widget => (
        <ErrorBoundary key={widget.id} fallback={null}>
          <div style={{ gridColumn: `span ${widget.position.w}` }}>
            <SingleWidget widget={widget} supabase={supabase} appScope={appScope} context={context} />
          </div>
        </ErrorBoundary>
      ))}
    </div>
  );
}

function SingleWidget({ widget, supabase, appScope, context }: { widget: WidgetDef; supabase: SupabaseClient; appScope: string; context?: Record<string, unknown> }) {
  const parsed = WidgetPropsSchema.safeParse({ type: widget.type, ...widget.props });
  if (!parsed.success) return <UnknownWidget type={widget.type} />;
  const p = parsed.data;
  switch (p.type) {
    case 'DataTable': return <DataTableWidget supabase={supabase} appScope={appScope} widgetProps={p} />;
    case 'StatGrid': return <StatGridWidget supabase={supabase} entity={p.entity} metric={p.metric} appScope={appScope} />;
    case 'EntitySelector': return <EntitySelectorWidget supabase={supabase} entity={p.entity} displayField={p.display_field} appScope={appScope} />;
    case 'Card': return <CardWidget title={p.title} collapsible={p.collapsible}>{context ? <pre className="text-xs">{JSON.stringify(context, null, 2)}</pre> : null}</CardWidget>;
    case 'FormRenderer': return <FormRendererWidget supabase={supabase} entity={p.entity} fields={p.fields} submitLabel={p.submit_label} appScope={appScope} />;
    default: return <UnknownWidget type={widget.type} />;
  }
}
