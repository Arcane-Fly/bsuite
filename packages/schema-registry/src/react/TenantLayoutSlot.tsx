'use client';
import React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from './types';
import { useTenantPageLayout } from './useTenantPageLayout';
import { WidgetRenderer } from './WidgetRenderer';
import { ErrorBoundary } from './ErrorBoundary';
import { LayoutJsonSchema } from '../schemas/widgetProps';

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
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TenantLayoutSlot] Invalid layout_json — skipping render', parseResult.error);
    }
    return null;
  }
  return (
    <ErrorBoundary fallback={null}>
      <WidgetRenderer widgets={parseResult.data.widgets} supabase={supabase} appScope={appScope} context={context} />
    </ErrorBoundary>
  );
}
