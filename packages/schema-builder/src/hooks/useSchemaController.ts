/**
 * `useSchemaController` — single canonical hook consumed by the Schema Builder
 * components. Replaces ~400 lines of near-identical `useEffect` + `useState`
 * wiring that previously lived in each of the four consumer apps.
 *
 * Pattern: TanStack Query native optimistic mutations (transition-safe;
 * `useOptimistic` is reserved for the Next.js / Conduit Server-Action path —
 * see §3.7 of the master plan).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  createSchemaEntity,
  createSchemaRelation,
  deleteSchemaEntity,
  deleteSchemaRelation,
  updateSchemaEntity,
  updateSchemaRelation,
} from '../service.js';
import type { LooseSupabaseClient } from '../service.js';
import type {
  AppScope,
  TenantEntity,
  TenantEntityRelation,
} from '../types.js';
import { schemaEntitiesOptions, schemaRelationsOptions } from './queries.js';
import { useRealtimeSubscription } from './useRealtimeSubscription.js';

export interface UseSchemaControllerOptions {
  supabase: LooseSupabaseClient;
  tenantId: string | null;
  appScope?: AppScope;
  onError?: (message: string, err?: unknown) => void;
  onSuccess?: (message: string) => void;
  realtime?: boolean;
}

export interface SchemaController {
  entities: TenantEntity[];
  relations: TenantEntityRelation[];
  isLoading: boolean;
  loadError: Error | null;
  createEntity: (
    entity: Omit<TenantEntity, 'id' | 'created_at' | 'updated_at'>,
  ) => Promise<TenantEntity>;
  updateEntity: (
    id: string,
    updates: Partial<TenantEntity>,
  ) => Promise<TenantEntity>;
  deleteEntity: (id: string) => Promise<void>;
  updateEntityPosition: (
    id: string,
    position: { x: number; y: number },
  ) => Promise<void>;
  createRelation: (
    relation: Omit<TenantEntityRelation, 'created_at' | 'updated_at'>,
  ) => Promise<TenantEntityRelation>;
  updateRelation: (
    id: string,
    updates: Partial<TenantEntityRelation>,
  ) => Promise<TenantEntityRelation>;
  deleteRelation: (id: string) => Promise<void>;
}

export function useSchemaController({
  supabase,
  tenantId,
  appScope = 'all',
  onError,
  onSuccess,
  realtime = true,
}: UseSchemaControllerOptions): SchemaController {
  const qc = useQueryClient();

  const entitiesQuery = useQuery({
    ...schemaEntitiesOptions(supabase, tenantId, appScope),
    enabled: tenantId !== undefined,
  });
  const relationsQuery = useQuery({
    ...schemaRelationsOptions(supabase, tenantId, appScope),
    enabled: tenantId !== undefined,
  });

  useRealtimeSubscription({
    client: supabase,
    tenantId,
    appScope,
    enabled: realtime,
  });

  const entitiesKey = schemaEntitiesOptions(
    supabase,
    tenantId,
    appScope,
  ).queryKey;
  const relationsKey = schemaRelationsOptions(
    supabase,
    tenantId,
    appScope,
  ).queryKey;

  // -----------------------------------------------------------------
  // Entity mutations — create / update / delete / updatePosition
  // -----------------------------------------------------------------

  const createEntityMutation = useMutation({
    mutationFn: (
      entity: Omit<TenantEntity, 'id' | 'created_at' | 'updated_at'>,
    ) => createSchemaEntity(supabase, entity),
    onSettled: () => qc.invalidateQueries({ queryKey: entitiesKey }),
    onSuccess: () => onSuccess?.('Entity created'),
    onError: (err) => onError?.('Failed to create entity', err),
  });

  const updateEntityMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TenantEntity> }) =>
      updateSchemaEntity(supabase, id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: entitiesKey });
      const prev = qc.getQueryData<TenantEntity[]>(entitiesKey);
      qc.setQueryData<TenantEntity[]>(entitiesKey, (old = []) =>
        old.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(entitiesKey, ctx.prev);
      onError?.('Failed to update entity', err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: entitiesKey }),
  });

  const deleteEntityMutation = useMutation({
    mutationFn: (id: string) => deleteSchemaEntity(supabase, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: entitiesKey });
      await qc.cancelQueries({ queryKey: relationsKey });
      const prevEntities = qc.getQueryData<TenantEntity[]>(entitiesKey);
      const prevRelations = qc.getQueryData<TenantEntityRelation[]>(relationsKey);
      qc.setQueryData<TenantEntity[]>(entitiesKey, (old = []) =>
        old.filter((e) => e.id !== id),
      );
      qc.setQueryData<TenantEntityRelation[]>(relationsKey, (old = []) =>
        old.filter((r) => r.source_entity_id !== id && r.target_entity_id !== id),
      );
      return { prevEntities, prevRelations };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prevEntities) qc.setQueryData(entitiesKey, ctx.prevEntities);
      if (ctx?.prevRelations) qc.setQueryData(relationsKey, ctx.prevRelations);
      onError?.('Failed to delete entity', err);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: entitiesKey });
      void qc.invalidateQueries({ queryKey: relationsKey });
    },
    onSuccess: () => onSuccess?.('Entity deleted'),
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({
      id,
      entity,
      position,
    }: {
      id: string;
      entity: TenantEntity;
      position: { x: number; y: number };
    }) =>
      updateSchemaEntity(supabase, id, {
        metadata: { ...(entity.metadata ?? {}), position },
      }),
    onMutate: async ({ id, position }) => {
      await qc.cancelQueries({ queryKey: entitiesKey });
      const prev = qc.getQueryData<TenantEntity[]>(entitiesKey);
      qc.setQueryData<TenantEntity[]>(entitiesKey, (old = []) =>
        old.map((e) =>
          e.id === id
            ? { ...e, metadata: { ...(e.metadata ?? {}), position } }
            : e,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(entitiesKey, ctx.prev);
      onError?.('Could not save canvas position', err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: entitiesKey }),
  });

  // -----------------------------------------------------------------
  // Relation mutations — create / update / delete
  // -----------------------------------------------------------------

  const createRelationMutation = useMutation({
    mutationFn: (
      relation: Omit<TenantEntityRelation, 'created_at' | 'updated_at'>,
    ) => createSchemaRelation(supabase, relation),
    onMutate: async (relation) => {
      await qc.cancelQueries({ queryKey: relationsKey });
      const prev = qc.getQueryData<TenantEntityRelation[]>(relationsKey);
      qc.setQueryData<TenantEntityRelation[]>(relationsKey, (old = []) => [
        ...old,
        {
          ...relation,
          created_at: null,
          updated_at: null,
        } as TenantEntityRelation,
      ]);
      return { prev };
    },
    onError: (err, _relation, ctx) => {
      if (ctx?.prev) qc.setQueryData(relationsKey, ctx.prev);
      onError?.('Failed to create relationship', err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: relationsKey }),
    onSuccess: () => onSuccess?.('Relationship created'),
  });

  const updateRelationMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TenantEntityRelation>;
    }) => updateSchemaRelation(supabase, id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: relationsKey });
      const prev = qc.getQueryData<TenantEntityRelation[]>(relationsKey);
      qc.setQueryData<TenantEntityRelation[]>(relationsKey, (old = []) =>
        old.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(relationsKey, ctx.prev);
      onError?.('Failed to update relationship', err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: relationsKey }),
  });

  const deleteRelationMutation = useMutation({
    mutationFn: (id: string) => deleteSchemaRelation(supabase, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: relationsKey });
      const prev = qc.getQueryData<TenantEntityRelation[]>(relationsKey);
      qc.setQueryData<TenantEntityRelation[]>(relationsKey, (old = []) =>
        old.filter((r) => r.id !== id),
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(relationsKey, ctx.prev);
      onError?.('Failed to remove relationship', err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: relationsKey }),
    onSuccess: () => onSuccess?.('Relationship removed'),
  });

  // -----------------------------------------------------------------
  // Public controller surface
  // -----------------------------------------------------------------

  const createEntity = useCallback(
    (entity: Omit<TenantEntity, 'id' | 'created_at' | 'updated_at'>) =>
      createEntityMutation.mutateAsync(entity),
    [createEntityMutation],
  );
  const updateEntity = useCallback(
    (id: string, updates: Partial<TenantEntity>) =>
      updateEntityMutation.mutateAsync({ id, updates }),
    [updateEntityMutation],
  );
  const deleteEntity = useCallback(
    (id: string) => deleteEntityMutation.mutateAsync(id),
    [deleteEntityMutation],
  );
  const updateEntityPosition = useCallback(
    async (id: string, position: { x: number; y: number }) => {
      const entity = entitiesQuery.data?.find((e) => e.id === id);
      if (!entity) return;
      await updatePositionMutation.mutateAsync({ id, entity, position });
    },
    [entitiesQuery.data, updatePositionMutation],
  );
  const createRelation = useCallback(
    (relation: Omit<TenantEntityRelation, 'created_at' | 'updated_at'>) =>
      createRelationMutation.mutateAsync(relation),
    [createRelationMutation],
  );
  const updateRelation = useCallback(
    (id: string, updates: Partial<TenantEntityRelation>) =>
      updateRelationMutation.mutateAsync({ id, updates }),
    [updateRelationMutation],
  );
  const deleteRelation = useCallback(
    (id: string) => deleteRelationMutation.mutateAsync(id),
    [deleteRelationMutation],
  );

  return {
    entities: entitiesQuery.data ?? [],
    relations: relationsQuery.data ?? [],
    isLoading: entitiesQuery.isLoading || relationsQuery.isLoading,
    loadError: (entitiesQuery.error ?? relationsQuery.error ?? null) as
      | Error
      | null,
    createEntity,
    updateEntity,
    deleteEntity,
    updateEntityPosition,
    createRelation,
    updateRelation,
    deleteRelation,
  };
}
