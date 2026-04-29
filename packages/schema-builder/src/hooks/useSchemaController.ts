/**
 * `useSchemaController` — single canonical hook consumed by the Schema Builder
 * components. Replaces ~400 lines of near-identical `useEffect` + `useState`
 * wiring that previously lived in each of the four consumer apps.
 *
 * Pattern: TanStack Query native optimistic mutations (transition-safe;
 * `useOptimistic` is reserved for the Next.js / Conduit Server-Action path —
 * see §3.7 of the master plan).
 *
 * Phase 1b.2: now also manages `tenant_field_definitions` rows so EntityNode
 * can render column handles. Fields are fetched once per tenant (not per
 * entity) to avoid N+1 round-trips; the hook groups them by `entity_id` on
 * the client and exposes a `Record<string, TenantFieldDefinition[]>`.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  createEntityField,
  createSchemaEntity,
  createSchemaRelation,
  deleteEntityField,
  deleteSchemaEntity,
  deleteSchemaRelation,
  renamePhysicalColumn,
  updateEntityField,
  updateSchemaEntity,
  updateSchemaRelation,
} from '../service.js';
import type { LooseSupabaseClient } from '../service.js';
import type {
  AppScope,
  RenamePreviewResult,
  TenantEntity,
  TenantEntityRelation,
  TenantFieldDefinition,
} from '../types.js';
import {
  schemaEntitiesOptions,
  schemaRelationsOptions,
  tenantFieldsOptions,
} from './queries.js';
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
  /**
   * Active tenant_field_definitions grouped by `entity_id`. Entities with no
   * fields are simply absent from the record (not present as `[]`). Phase 1b.2.
   */
  fields: Record<string, TenantFieldDefinition[]>;
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
  createField: (
    field: Omit<TenantFieldDefinition, 'id' | 'created_at' | 'updated_at'>,
  ) => Promise<TenantFieldDefinition>;
  updateField: (
    id: string,
    updates: Partial<TenantFieldDefinition>,
  ) => Promise<TenantFieldDefinition>;
  deleteField: (id: string) => Promise<void>;
  /**
   * Phase 3B: rename a field's `field_name`.
   *
   * - `options.physical = false` (default): updates `tenant_field_definitions`
   *   metadata only — identical to calling `updateField(id, { field_name })`.
   * - `options.physical = true`: calls the `rename_physical_column` RPC with
   *   `p_dry_run = false`, executing `ALTER TABLE … RENAME COLUMN` AND updating
   *   `tenant_field_definitions.field_name` in a single transaction.
   *   Requires the caller to hold admin/owner role for the entity's tenant.
   */
  renameField: (
    entityId: string,
    fieldId: string,
    newName: string,
    options?: { physical?: boolean },
  ) => Promise<void>;
  /**
   * Phase 3B: dry-run preview for a physical column rename.
   * Returns the proposed SQL + affected views/policies WITHOUT executing DDL.
   * Intended to be wired into `FieldEditDialog.onPreviewRename`.
   */
  previewRenameField: (
    entityId: string,
    fieldId: string,
    newName: string,
  ) => Promise<RenamePreviewResult>;
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
  const fieldsQuery = useQuery({
    ...tenantFieldsOptions(supabase, tenantId),
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
  const fieldsKey = tenantFieldsOptions(supabase, tenantId).queryKey;

  // Surface fieldsQuery errors to the developer ONCE per error transition
  // without letting them gate the canvas. RLS or missing-grant errors on
  // `tenant_field_definitions` are common on consumers that haven't yet
  // applied the Phase 1b.2 migrations — we want devs to see them in toasts,
  // but we don't want the canvas to switch to its "Failed to load schema"
  // state, so the error is surfaced separately from `loadError`.
  const lastFieldsErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (
      fieldsQuery.error &&
      fieldsQuery.error !== lastFieldsErrorRef.current
    ) {
      lastFieldsErrorRef.current = fieldsQuery.error;
      onError?.(
        'Failed to load field definitions (non-fatal — canvas will render without field rows)',
        fieldsQuery.error,
      );
    }
    if (!fieldsQuery.error) lastFieldsErrorRef.current = null;
  }, [fieldsQuery.error, onError]);

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
  // Field mutations — create / update / delete (Phase 1b.2)
  // -----------------------------------------------------------------

  const createFieldMutation = useMutation({
    mutationFn: (
      field: Omit<TenantFieldDefinition, 'id' | 'created_at' | 'updated_at'>,
    ) => createEntityField(supabase, field),
    onMutate: async (field) => {
      await qc.cancelQueries({ queryKey: fieldsKey });
      const prev = qc.getQueryData<TenantFieldDefinition[]>(fieldsKey);
      // Temp id so the row has a stable React key; onSuccess replaces it
      // with the real server row, or onError rolls it back.
      const tempId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      qc.setQueryData<TenantFieldDefinition[]>(fieldsKey, (old = []) => [
        ...old,
        {
          ...field,
          id: tempId,
          created_at: null,
          updated_at: null,
        } as TenantFieldDefinition,
      ]);
      return { prev, tempId };
    },
    onError: (err, _field, ctx) => {
      // Deterministic rollback — covers the case where `prev` was undefined
      // because fieldsQuery itself errored and never populated the cache.
      qc.setQueryData(fieldsKey, ctx?.prev ?? []);
      onError?.('Failed to add field', err);
    },
    onSuccess: (newRow, _field, ctx) => {
      // Splice the real server row over the temp row so the UI never shows
      // both simultaneously during the brief gap before `onSettled` refetch.
      qc.setQueryData<TenantFieldDefinition[]>(fieldsKey, (old = []) =>
        old.map((f) => (ctx && f.id === ctx.tempId ? newRow : f)),
      );
      onSuccess?.('Field added');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fieldsKey }),
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TenantFieldDefinition>;
    }) => updateEntityField(supabase, id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: fieldsKey });
      const prev = qc.getQueryData<TenantFieldDefinition[]>(fieldsKey);
      qc.setQueryData<TenantFieldDefinition[]>(fieldsKey, (old = []) =>
        old.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(fieldsKey, ctx.prev);
      onError?.('Failed to update field', err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fieldsKey }),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (id: string) => deleteEntityField(supabase, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: fieldsKey });
      const prev = qc.getQueryData<TenantFieldDefinition[]>(fieldsKey);
      qc.setQueryData<TenantFieldDefinition[]>(fieldsKey, (old = []) =>
        old.filter((f) => f.id !== id),
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      // Deterministic rollback — see createFieldMutation onError comment.
      qc.setQueryData(fieldsKey, ctx?.prev ?? []);
      onError?.('Failed to remove field', err);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fieldsKey });
      // Relations reference fields via source_field_id / target_field_id.
      // A dropped field leaves orphan handles in the relation cache; refresh
      // so React Flow doesn't render edges to handles that no longer exist.
      void qc.invalidateQueries({ queryKey: relationsKey });
    },
    onSuccess: () => onSuccess?.('Field removed'),
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
  const createField = useCallback(
    (field: Omit<TenantFieldDefinition, 'id' | 'created_at' | 'updated_at'>) =>
      createFieldMutation.mutateAsync(field),
    [createFieldMutation],
  );
  const updateField = useCallback(
    (id: string, updates: Partial<TenantFieldDefinition>) =>
      updateFieldMutation.mutateAsync({ id, updates }),
    [updateFieldMutation],
  );
  const deleteField = useCallback(
    (id: string) => deleteFieldMutation.mutateAsync(id),
    [deleteFieldMutation],
  );

  // -----------------------------------------------------------------
  // Phase 3B: renameField + previewRenameField
  // -----------------------------------------------------------------

  const renameField = useCallback(
    async (
      entityId: string,
      fieldId: string,
      newName: string,
      options?: { physical?: boolean },
    ): Promise<void> => {
      if (options?.physical) {
        // Wet-run: ALTER TABLE + metadata update in one transaction.
        await renamePhysicalColumn(supabase, entityId, fieldId, newName, false);
        // Invalidate fields cache so the UI reflects the renamed column.
        void qc.invalidateQueries({ queryKey: fieldsKey });
      } else {
        // Metadata-only rename: same as updateField(fieldId, { field_name: newName }).
        await updateFieldMutation.mutateAsync({
          id: fieldId,
          updates: { field_name: newName },
        });
      }
    },
    [supabase, qc, fieldsKey, updateFieldMutation],
  );

  const previewRenameField = useCallback(
    (
      entityId: string,
      fieldId: string,
      newName: string,
    ): Promise<RenamePreviewResult> =>
      renamePhysicalColumn(supabase, entityId, fieldId, newName, true),
    [supabase],
  );

  const fieldsByEntity = useMemo(() => {
    const out: Record<string, TenantFieldDefinition[]> = {};
    for (const f of fieldsQuery.data ?? []) {
      if (!f.entity_id) continue;
      (out[f.entity_id] ??= []).push(f);
    }
    return out;
  }, [fieldsQuery.data]);

  return {
    entities: entitiesQuery.data ?? [],
    relations: relationsQuery.data ?? [],
    fields: fieldsByEntity,
    // Fields are non-critical — loading them must not gate the canvas, and
    // RLS failures on `tenant_field_definitions` (common across consumer
    // apps that haven't applied the Phase 1b.2 migration yet) must NOT
    // flip the canvas into its "Failed to load schema" error state. Field
    // errors degrade silently to `fields: {}`.
    isLoading: entitiesQuery.isLoading || relationsQuery.isLoading,
    loadError: (entitiesQuery.error ??
      relationsQuery.error ??
      null) as Error | null,
    createEntity,
    updateEntity,
    deleteEntity,
    updateEntityPosition,
    createRelation,
    updateRelation,
    deleteRelation,
    createField,
    updateField,
    deleteField,
    renameField,
    previewRenameField,
  };
}
