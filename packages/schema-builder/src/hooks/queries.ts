/**
 * TanStack Query `queryOptions` factories for Schema Builder reads. Per §3.7
 * of the master plan, these keep the query-key canonical across the package
 * and its consumers — invalidation goes through `.queryKey` not stringly-
 * typed arrays.
 */

import { queryOptions } from '@tanstack/react-query';
import {
  getEntityFields,
  getSchemaEntities,
  getSchemaRelations,
  getTenantFields,
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

/**
 * Options for fetching the fields of a single entity. Used by the entity
 * properties panel to lazy-load field rows when the user opens one entity.
 */
export const entityFieldsOptions = (
  client: LooseSupabaseClient,
  entityId: string | null,
) =>
  queryOptions({
    queryKey: ['schema-entity-fields', entityId] as const,
    queryFn: () =>
      entityId ? getEntityFields(client, entityId) : Promise.resolve([]),
    enabled: entityId != null,
    staleTime: 30_000,
  });

/**
 * Options for fetching every active field in a tenant in one shot. Used by
 * `useSchemaController` so EntityNode can render field rows for every entity
 * on the canvas without N+1 requests.
 */
export const tenantFieldsOptions = (
  client: LooseSupabaseClient,
  tenantId: string | null,
) =>
  queryOptions({
    queryKey: ['schema-tenant-fields', tenantId] as const,
    queryFn: () => getTenantFields(client, tenantId),
    staleTime: 30_000,
  });
