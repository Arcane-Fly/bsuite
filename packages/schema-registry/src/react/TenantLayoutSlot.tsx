'use client';
import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from './types.js';
import { useTenantPageLayout } from './useTenantPageLayout.js';
import { WidgetRenderer } from './WidgetRenderer.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { LayoutJsonSchema } from '../schemas/widgetProps.js';

function isProductionRuntime(): boolean {
  const maybeProcess = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return maybeProcess?.env?.NODE_ENV === 'production';
}

interface TenantLayoutSlotProps {
  supabase: SupabaseClient;
  route: string;
  appScope: AppScope;
  context?: Record<string, unknown>;
}

export function TenantLayoutSlot({ supabase, route, appScope, context }: TenantLayoutSlotProps) {
  const { data: layout, isLoading, error } = useTenantPageLayout(supabase, route, appScope);
  if (isLoading) return null;
  if (error || !layout) return null;
  const parseResult = LayoutJsonSchema.safeParse(layout.layout_json);
  if (!parseResult.success) {
    if (!isProductionRuntime()) {
      // Stringify the ZodError to avoid a node util.inspect bug that crashes
      // on certain error graphs in jsdom/vitest environments.
      console.warn(
        '[TenantLayoutSlot] Invalid layout_json — skipping render',
        parseResult.error.message
      );
    }
    return null;
  }
  return (
    <ErrorBoundary fallback={null}>
      <WidgetRenderer widgets={parseResult.data.widgets} supabase={supabase} appScope={appScope} context={context} />
    </ErrorBoundary>
  );
}
