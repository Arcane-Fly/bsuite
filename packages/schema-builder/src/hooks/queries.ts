/**
 * TanStack Query `queryOptions` factories for Schema Builder reads. Per §3.7
 * of the master plan, these keep the query-key canonical across the package
 * and its consumers — invalidation goes through `.queryKey` not stringly-
 * typed arrays.
 */

import { queryOptions } from '@tanstack/react-query';
import {
  getSchemaEntities,
  getSchemaRelations,
  type LooseSupabaseClient,
} from '../service.js';
import type { AppScope } from '../types.js';

export const schemaEntitiesOptions = (
  client: LooseSupabaseClient,
  tenantId: string | null,
  appScope: AppScope = 'all',
) =>
  queryOptions({
    queryKey: ['schema-entities', tenantId, appScope] as const,
    queryFn: () => getSchemaEntities(client, tenantId, appScope),
    staleTime: 30_000,
  });

export const schemaRelationsOptions = (
  client: LooseSupabaseClient,
  tenantId: string | null,
  appScope: AppScope = 'all',
) =>
  queryOptions({
    queryKey: ['schema-relations', tenantId, appScope] as const,
    queryFn: () => getSchemaRelations(client, tenantId, appScope),
    staleTime: 30_000,
  });
