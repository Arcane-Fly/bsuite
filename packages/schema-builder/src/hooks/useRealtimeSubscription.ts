/**
 * Subscribes to `postgres_changes` on the three Schema Builder tables and
 * invalidates the canonical TanStack Query keys whenever Supabase Realtime
 * emits an event. Keeps every open developer tab in sync per §3.8.
 *
 * Safe to call with `enabled: false` during SSR.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { schemaEntitiesOptions, schemaRelationsOptions } from './queries.js';
import type { LooseSupabaseClient } from '../service.js';
import type { AppScope } from '../types.js';

export interface UseRealtimeSubscriptionOptions {
  client: LooseSupabaseClient;
  tenantId: string | null;
  appScope: AppScope;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  client,
  tenantId,
  appScope,
  enabled = true,
}: UseRealtimeSubscriptionOptions): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !tenantId) return;

    const entitiesKey = schemaEntitiesOptions(client, tenantId, appScope).queryKey;
    const relationsKey = schemaRelationsOptions(client, tenantId, appScope).queryKey;

    const channel = client
      .channel(`schema-builder-${tenantId}-${appScope}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant_entities' },
        () => {
          void qc.invalidateQueries({ queryKey: entitiesKey });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant_entity_relations' },
        () => {
          void qc.invalidateQueries({ queryKey: relationsKey });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenant_field_definitions' },
        () => {
          void qc.invalidateQueries({ queryKey: ['entity-fields', tenantId] });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, tenantId, appScope, enabled, qc]);
}
