/**
 * TanStack Query `queryOptions` factories, mirroring
 * `packages/schema-builder/src/hooks/queries.ts`. Query keys live here and
 * nowhere else — invalidation goes through `.queryKey`, never through a
 * stringly-typed array retyped at each call site.
 */

import { queryOptions } from '@tanstack/react-query';

import {
  getDraftVersion,
  getWorkflowDefinition,
  getWorkflowVersion,
  listWorkflowDefinitions,
  listWorkflowVersions,
  type LooseSupabaseClient,
} from '../service.js';

export const workflowDefinitionsOptions = (
  client: LooseSupabaseClient,
  tenantId: string | null,
) =>
  queryOptions({
    queryKey: ['workflow-definitions', tenantId] as const,
    queryFn: () => listWorkflowDefinitions(client, tenantId),
    staleTime: 30_000,
  });

export const workflowDefinitionOptions = (
  client: LooseSupabaseClient,
  definitionId: string | null,
) =>
  queryOptions({
    queryKey: ['workflow-definition', definitionId] as const,
    queryFn: () =>
      definitionId ? getWorkflowDefinition(client, definitionId) : Promise.resolve(null),
    enabled: definitionId != null,
    staleTime: 30_000,
  });

export const workflowVersionsOptions = (
  client: LooseSupabaseClient,
  definitionId: string | null,
) =>
  queryOptions({
    queryKey: ['workflow-versions', definitionId] as const,
    queryFn: () =>
      definitionId ? listWorkflowVersions(client, definitionId) : Promise.resolve([]),
    enabled: definitionId != null,
    staleTime: 30_000,
  });

/**
 * The draft being edited.
 *
 * `staleTime: Infinity` on purpose. The canvas is the authority on its own
 * unsaved state, and a background refetch landing mid-edit would replace the
 * node the user is dragging with the server's older copy. Cross-tab freshness
 * comes from the Realtime subscription, which invalidates DELIBERATELY and
 * only on a change somebody else actually made.
 */
export const workflowDraftOptions = (
  client: LooseSupabaseClient,
  definitionId: string | null,
) =>
  queryOptions({
    queryKey: ['workflow-draft', definitionId] as const,
    queryFn: () =>
      definitionId ? getDraftVersion(client, definitionId) : Promise.resolve(null),
    enabled: definitionId != null,
    staleTime: Infinity,
  });

export const workflowVersionOptions = (
  client: LooseSupabaseClient,
  versionId: string | null,
) =>
  queryOptions({
    queryKey: ['workflow-version', versionId] as const,
    queryFn: () =>
      versionId ? getWorkflowVersion(client, versionId) : Promise.resolve(null),
    enabled: versionId != null,
    staleTime: 30_000,
  });
