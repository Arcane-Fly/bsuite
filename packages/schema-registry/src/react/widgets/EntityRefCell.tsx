'use client';
import React, { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { EntityRefCellPropsSchema } from '../../schemas/widgetProps.js';
import { UnknownWidget } from './UnknownWidget.js';

type EntityRefCellProps = z.infer<typeof EntityRefCellPropsSchema>;

export interface EntityRefCellWidgetProps {
  supabase: SupabaseClient;
  appScope: string;
  widgetProps: EntityRefCellProps;
  onClick?: (entityId: string) => void;
  /** Optional navigation hook — defaults to window.location assignment on click. */
  onNavigate?: (href: string) => void;
}

/**
 * EntityRefCell — displays a single field from a tenant_entities-whitelisted row
 * in another page/app. Click navigates to the source record.
 *
 * Cross-app linkage: target row's RLS still applies. If the auth subject can't
 * read the row (tenant mismatch / entity deleted) we render UnknownWidget as a
 * safe fallback — never throw.
 *
 * Wired by the widget registry; also usable standalone.
 */
export function EntityRefCellWidget({
  supabase,
  appScope,
  widgetProps,
  onClick,
  onNavigate,
}: EntityRefCellWidgetProps) {
  const [value, setValue] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      // Server-side entity whitelist — entity must exist in tenant_entities for
      // the foreign app_scope. `appScope` here is the CURRENT app; we allow
      // reads if the foreign entity is scoped to the target scope or 'all'.
      const foreignScope = widgetProps.foreign_app_scope;
      const { data: entityDef } = await supabase
        .from('tenant_entities')
        .select('id')
        .eq('name', widgetProps.entity)
        .in('app_scope', [foreignScope, 'all'])
        .maybeSingle();

      if (cancelled) return;
      if (!entityDef) {
        setStatus('missing');
        return;
      }

      const { data: rowData, error } = await supabase
        .from(widgetProps.entity)
        .select(`id,${widgetProps.display_field}`)
        .eq('id', widgetProps.entity_id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !rowData) {
        setStatus('missing');
        return;
      }
      // supabase-js types the select-by-template generically; cast through
      // unknown because we've already validated the entity via the whitelist
      // and the display_field via the Zod schema upstream.
      const row = rowData as unknown as Record<string, unknown>;
      const recordValue = row[widgetProps.display_field];
      setValue(recordValue == null ? '' : String(recordValue));
      setStatus('ready');
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    appScope,
    widgetProps.foreign_app_scope,
    widgetProps.entity,
    widgetProps.entity_id,
    widgetProps.display_field,
  ]);

  if (status === 'missing') return <UnknownWidget type={`EntityRefCell(${widgetProps.entity})`} />;
  if (status === 'loading') {
    return <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" aria-busy="true" />;
  }

  const defaultHref = `/${widgetProps.foreign_app_scope}/${widgetProps.entity}/${widgetProps.entity_id}`;
  const href = widgetProps.href_template
    ? widgetProps.href_template
        .split('{id}').join(widgetProps.entity_id)
        .split('{entity}').join(widgetProps.entity)
        .split('{app}').join(widgetProps.foreign_app_scope)
    : defaultHref;

  const handleClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    if (onClick) {
      onClick(widgetProps.entity_id);
      return;
    }
    if (onNavigate) {
      onNavigate(href);
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.assign(href);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-primary underline-offset-2 hover:underline"
      data-widget="EntityRefCell"
    >
      {value}
    </a>
  );
}
