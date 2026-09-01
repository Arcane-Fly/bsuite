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
  countPhysicalTableRegistrations,
  reorderEntityFields,
  resolveLayout,
  saveSchemaLayoutPosition,
  updatePlatformEntityLabel,
  updateEntityField,
  updateSchemaEntity,
  updateSchemaRelation,
} from '../service.js';
import type {
  LooseSupabaseClient,
  RenamePhysicalColumnResult,
  TenantSchemaLayoutRow,
} from '../service.js';
import type {
  AppScope,
  TenantEntity,
  TenantEntityRelation,
  TenantFieldDefinition,
} from '../types.js';
import {
  schemaEntitiesOptions,
  schemaLayoutOptions,
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
  /**
   * Resolved canvas position per entity id, from the `tenant_schema_layout`
   * overlay. Absent entities have never been placed and fall back to the
   * computed grid in SchemaCanvas.
   */
  layout: Map<string, { x: number; y: number }>;
  /**
   * True when the signed-in user holds platform_role = 'developer' — the only
   * role permitted to edit platform-owned schema. Drives whether the properties
   * panel unlocks label/description on a system entity; the database enforces
   * the same rule independently, so a tampered client gains nothing.
   */
  isPlatformDeveloper: boolean;
  /** false only on a measured zero; undefined while loading or on read failure. */
  physicalRenameAvailable: boolean | undefined;
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
   * Phase 3A: atomically reorder the active fields of an entity. The id
   * array must cover exactly the entity's active fields (no missing/extra/
   * duplicate ids) — the `reorder_entity_fields` RPC rejects partial arrays
   * with `invalid_parameter_value`. Optimistic cache update rolls back on
   * error via the usual toast sink.
   */
  reorderFields: (
    entityId: string,
    orderedFieldIds: string[],
  ) => Promise<void>;
  /**
   * Phase 3B: rename a field. By default (`physical` omitted or false) this
   * is metadata-only — identical to `updateField(id, { field_name })` — and
   * returns the updated field row. When `physical: true` is passed, the
   * underlying Postgres column is renamed via the `rename_physical_column`
   * SECURITY DEFINER RPC in a two-phase flow: the UI is expected to call
   * with `dryRun: true` first, show the returned `would_execute` plus
   * affected views/policies to the user, and only call again with
   * `dryRun: false` on explicit confirmation. Every call writes an audit
   * row to `schema_mutations_audit`.
   */
  renameField: (
    entityId: string,
    fieldId: string,
    newName: string,
    opts?: { physical?: boolean; dryRun?: boolean },
  ) => Promise<RenamePhysicalColumnResult | TenantFieldDefinition>;
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
  // The arrangement of the canvas, kept apart from the entities themselves
  // because the entities are platform-owned and shared while the arrangement is
  // per-tenant. See getSchemaLayout's header for the full reasoning.
  const layoutQuery = useQuery({
    ...schemaLayoutOptions(supabase, tenantId, appScope),
    enabled: !!tenantId,
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
  const layoutKey = schemaLayoutOptions(supabase, tenantId, appScope).queryKey;

  // Needed only to resolve a personal override over the tenant default. Kept as
  // its own long-lived query rather than a prop so no consumer has to thread the
  // user id through; auth identity does not change without a remount.
  const userQuery = useQuery({
    queryKey: ['schema-layout-user'] as const,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return (data?.user?.id as string | undefined) ?? null;
    },
    staleTime: Infinity,
  });

  // Mirrors the SQL is_platform_developer() helper. This is a UI affordance
  // ONLY — update_platform_entity_label() re-checks it server-side, so a client
  // that forces this true still gets 42501.
  const platformDeveloperQuery = useQuery({
    queryKey: ['is-platform-developer'] as const,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_platform_developer');
      if (error) return false;
      return data === true;
    },
    staleTime: 5 * 60_000,
  });

  /**
   * Can a physical column rename succeed for this tenant AT ALL?
   *
   * `rename_physical_column` refuses unless the entity's table is registered in
   * `schema_builder_physical_tables`, which ships EMPTY by design — it is the fix
   * for a privilege escalation where the ALTER TABLE target came from
   * caller-controlled `tenant_entities.name`. With zero registrations the
   * "also rename the database column" checkbox cannot succeed for any entity, so
   * offering it charges the user a confirm step to reach a refusal.
   *
   * On error this resolves UNDEFINED, not false: a failed read is not proof of
   * zero, and defaulting to false would silently remove a working capability the
   * moment the query hiccuped.
   */
  const physicalRenameQuery = useQuery({
    queryKey: ['physical-table-registrations', tenantId] as const,
    queryFn: async () => {
      if (!tenantId) return 0;
      try {
        return await countPhysicalTableRegistrations(supabase, tenantId);
      } catch {
        return undefined;
      }
    },
    enabled: tenantId !== undefined,
    staleTime: 5 * 60_000,
  });

  const resolvedLayout = useMemo(
    () => resolveLayout(layoutQuery.data ?? [], userQuery.data ?? null),
    [layoutQuery.data, userQuery.data],
  );

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
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TenantEntity> }) => {
      // A platform-owned entity (tenant_id IS NULL) cannot be written through
      // ordinary RLS by anyone — that is deliberate, since all five tenants read
      // the same row. The single audited exception is the developer-only RPC,
      // which accepts label/description and nothing else.
      const entity = entitiesQuery.data?.find((e) => e.id === id);
      if (entity && entity.tenant_id === null) {
        // Compare against the STORED entity rather than trusting the caller's
        // key set. EntityPropertiesPanel sends its whole formData -- which is
        // seeded from the entity and therefore always carries id, tenant_id,
        // name, metadata and the timestamps -- so a keys-only check rejected
        // every platform save even when the user had touched nothing but the
        // label. What matters is which values actually DIFFER.
        const changed = Object.keys(updates).filter(
          (k) =>
            !Object.is(
              (entity as unknown as Record<string, unknown>)[k],
              (updates as unknown as Record<string, unknown>)[k],
            ),
        );
        const disallowed = changed.filter(
          (k) => k !== 'label' && k !== 'description',
        );
        if (disallowed.length > 0) {
          throw new Error(
            `Platform entities allow only label and description to be edited (attempted to change: ${disallowed.join(', ')})`,
          );
        }
        return updatePlatformEntityLabel(
          supabase,
          id,
          updates.label ?? entity.label,
          updates.description ?? null,
        );
      }
      return updateSchemaEntity(supabase, id, updates);
    },
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

  // Canvas position now writes to the tenant_schema_layout OVERLAY, not to
  // tenant_entities.metadata.
  //
  // The old target was unwritable by construction: all 44 entity rows are
  // platform-owned (tenant_id IS NULL, is_system = true) and the UPDATE policy
  // demands both `is_system = false` and `ut.tenant_id = tenant_entities.tenant_id`,
  // which `NULL = <uuid>` can never satisfy. Every drag produced a denied write,
  // an optimistic rollback, and a node that snapped home — with no consumer
  // passing onError, entirely silently.
  const updatePositionMutation = useMutation({
    mutationFn: ({
      id,
      position,
    }: {
      id: string;
      entity: TenantEntity;
      position: { x: number; y: number };
    }) => {
      if (!tenantId) {
        // Refuse rather than pretend. Without a tenant there is no row the
        // overlay could be attributed to, and a silently-dropped save is the
        // exact defect this change exists to remove.
        throw new Error('Cannot save layout without a tenant context');
      }
      return saveSchemaLayoutPosition(supabase, {
        tenantId,
        entityId: id,
        x: position.x,
        y: position.y,
        appScope,
      });
    },
    onMutate: async ({ id, position }) => {
      await qc.cancelQueries({ queryKey: layoutKey });
      const prev = qc.getQueryData<TenantSchemaLayoutRow[]>(layoutKey);
      qc.setQueryData<TenantSchemaLayoutRow[]>(layoutKey, (old = []) => {
        const next = old.filter(
          (r) => !(r.entity_id === id && r.user_id === null),
        );
        next.push({
          id: `optimistic:${id}`,
          tenant_id: tenantId ?? '',
          user_id: null,
          entity_id: id,
          app_scope: appScope,
          pos_x: position.x,
          pos_y: position.y,
        });
        return next;
      });
      return { prev };
    },
    onError: (err, vars, ctx) => {
      // Roll back ONLY the node that failed.
      //
      // Restoring the whole snapshot discards work that succeeded in the
      // meantime: drag A, then drag B before A resolves; B saves and refetches;
      // A then fails and the old whole-array restore would reset the cache to a
      // state that predates B's drag, visibly reverting a position the user had
      // already been told was saved. Dragging several cards in quick succession
      // is the normal way to use this canvas, so the race is routine, not exotic.
      const prevRow = ctx?.prev?.find(
        (r) => r.entity_id === vars.id && r.user_id === null,
      );
      qc.setQueryData<TenantSchemaLayoutRow[]>(layoutKey, (cur = []) => {
        const without = cur.filter(
          (r) => !(r.entity_id === vars.id && r.user_id === null),
        );
        return prevRow ? [...without, prevRow] : without;
      });
      onError?.('Could not save canvas position', err);
      // Resync ONLY on failure. The success path writes the authoritative row
      // from the RPC, so an unconditional invalidate there is what allowed a
      // stale refetch to clobber a just-saved position.
      void qc.invalidateQueries({ queryKey: layoutKey });
    },
    onSuccess: (saved) => {
      // Write the row the RPC returned rather than refetching for it.
      //
      // The refetch that used to live in onSettled could be SERVED BEFORE this
      // insert was visible, and the response then clobbered the optimistic row
      // with a list that did not contain it — so a card the user had just
      // dragged snapped back to its computed grid slot even though the position
      // was already committed. Observed live 2026-08-06: the save returned 200
      // with pos (80, 976), the refetch came back without that row, the card
      // reverted, and a reload showed it correctly at (80, 976). The RPC hands
      // back the authoritative row, so there is nothing a refetch could add.
      qc.setQueryData<TenantSchemaLayoutRow[]>(layoutKey, (cur = []) => [
        ...cur.filter(
          (r) =>
            !(r.entity_id === saved.entity_id && r.user_id === saved.user_id),
        ),
        saved,
      ]);
    },
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

  const reorderFieldsMutation = useMutation({
    mutationFn: ({
      entityId,
      orderedFieldIds,
    }: {
      entityId: string;
      orderedFieldIds: string[];
    }) => reorderEntityFields(supabase, entityId, orderedFieldIds),
    onMutate: async ({ entityId, orderedFieldIds }) => {
      await qc.cancelQueries({ queryKey: fieldsKey });
      const prev = qc.getQueryData<TenantFieldDefinition[]>(fieldsKey);
      // Optimistic: rewrite sort_order in cache so the UI reflects the new
      // order instantly. `onSettled` re-fetches from Postgres to reconcile,
      // and `onError` restores the pre-mutation snapshot below.
      const indexMap = new Map(
        orderedFieldIds.map((id, idx) => [id, idx] as const),
      );
      qc.setQueryData<TenantFieldDefinition[]>(fieldsKey, (old = []) =>
        old.map((f) =>
          f.entity_id === entityId && indexMap.has(f.id)
            ? { ...f, sort_order: indexMap.get(f.id)! }
            : f,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      // Deterministic rollback — see createFieldMutation onError comment.
      qc.setQueryData(fieldsKey, ctx?.prev ?? []);
      onError?.('Failed to reorder fields', err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: fieldsKey }),
    onSuccess: () => onSuccess?.('Fields reordered'),
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
  const reorderFields = useCallback(
    (entityId: string, orderedFieldIds: string[]) =>
      reorderFieldsMutation.mutateAsync({ entityId, orderedFieldIds }),
    [reorderFieldsMutation],
  );
  const renameField = useCallback(
    async (
      entityId: string,
      fieldId: string,
      newName: string,
      opts: { physical?: boolean; dryRun?: boolean } = {},
    ): Promise<RenamePhysicalColumnResult | TenantFieldDefinition> => {
      // Metadata-only path: identical to the existing updateField flow, so
      // downstream cache invalidation, optimistic updates, and error toasts
      // are unchanged.
      if (!opts.physical) {
        return updateFieldMutation.mutateAsync({
          id: fieldId,
          updates: { field_name: newName },
        });
      }
      // Physical-rename path: bypass the mutation cache — the UI drives the
      // two-phase confirm flow and refetches via invalidate on wet-run
      // success. Query invalidation is handled in the wet-run success case
      // below to keep the fields cache in sync with the DB rename.
      const dryRun = opts.dryRun ?? true;
      const result = await renamePhysicalColumn(
        supabase,
        entityId,
        fieldId,
        newName,
        { dryRun },
      );
      if (!dryRun && result.executed) {
        // ALTER TABLE succeeded — tenant_field_definitions.field_name was
        // updated server-side too. Refetch so the canvas reflects the new
        // name without waiting for the realtime event.
        void qc.invalidateQueries({ queryKey: fieldsKey });
      }
      return result;
    },
    [supabase, updateFieldMutation, qc, fieldsKey],
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
    layout: resolvedLayout,
    isPlatformDeveloper: platformDeveloperQuery.data === true,
    /**
     * `false` only when the count is a measured zero. `undefined` while loading
     * or after a read failure, so the consumer keeps prior behaviour rather than
     * hiding a control on incomplete information.
     */
    physicalRenameAvailable:
      physicalRenameQuery.data === undefined ? undefined : physicalRenameQuery.data > 0,
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
    reorderFields,
    renameField,
  };
}
