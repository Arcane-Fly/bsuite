/**
 * `useWorkflowController` — the single canonical hook the workflow canvas is
 * driven by, modelled directly on
 * `packages/schema-builder/src/hooks/useSchemaController.ts`.
 *
 * WHAT IS COPIED FROM THERE, AND WHY EACH ONE
 *
 *  - TanStack Query native optimistic mutations with an `onMutate` snapshot and
 *    an `onError` rollback. Not `useOptimistic`: that is reserved for the
 *    Next.js / conduit Server-Action path (§3.7 of the May master plan), and
 *    five of six apps are Vite SPAs.
 *  - THE SAVE WRITES THE RETURNED ROW AND DOES NOT INVALIDATE ON SUCCESS. The
 *    schema builder shipped an `onSettled` invalidate and watched a refetch
 *    served BEFORE the write was visible clobber a card the user had just
 *    dragged, back to its computed slot, after a 200. Measured live 2026-08-06.
 *    Resync happens on FAILURE only.
 *  - A per-item rollback rather than restoring the whole snapshot. Restoring
 *    everything discards edits that succeeded while this one was in flight.
 *
 * WHAT IS NEW HERE
 *
 *  - The canvas holds the graph LOCALLY and saves on a debounce. A schema
 *    canvas persists one entity position per drag; a workflow canvas persists a
 *    whole `{nodes,edges,viewport}` document, and a write per pointer-move would
 *    be hundreds of round trips per drag.
 *  - Undo/redo over that local graph (`useUndoRedo`, depth 50).
 *  - A drag is ONE undo step, banked at its START. The gesture's first frame
 *    checkpoints where the node WAS; every frame after it replaces the present.
 *    Checkpointing at the end would bank the second-to-last pointer-move, so
 *    undo would nudge the node back a pixel instead of returning it.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyEdgeChanges, applyNodeChanges, addEdge } from '@xyflow/react';
import type {
  Connection,
  Edge,
  EdgeChange,
  NodeChange,
  Viewport,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createDraftVersion,
  duplicateWorkflowDefinition,
  publishVersion,
  saveVersionGraph,
  updateWorkflowDefinition,
  type LooseSupabaseClient,
} from '../service.js';
import type {
  WorkflowDefinitionRow,
  WorkflowDefinitionVersionRow,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from '../types.js';
import { emptyWorkflowGraph } from '../types.js';
import { workflowNodeTypeRegistry } from '../nodes/registry.js';
import type { WorkflowNodeTypeRegistry } from '../nodes/registry.js';
import { validateConnection } from '../validation/connection.js';
import type { ConnectionVerdict } from '../validation/connection.js';
import { computeSwimlaneLayout } from '../utils/autoLayout.js';
import type { SwimlaneLayoutOptions } from '../utils/autoLayout.js';
import {
  workflowDefinitionOptions,
  workflowDraftOptions,
  workflowVersionsOptions,
} from './queries.js';
import { useUndoRedo } from './useUndoRedo.js';
import { useWorkflowRealtimeSubscription } from './useRealtimeSubscription.js';

/** How long the canvas sits still before the graph is written. */
export const DEFAULT_SAVE_DEBOUNCE_MS = 900;

export interface UseWorkflowControllerOptions {
  supabase: LooseSupabaseClient;
  tenantId: string | null;
  definitionId: string | null;
  /** Swap in an extended registry to add node kinds. */
  registry?: WorkflowNodeTypeRegistry;
  onError?: (message: string, err?: unknown) => void;
  onSuccess?: (message: string) => void;
  /** Surfaced when a drop is refused, so the canvas can say WHY. */
  onConnectionRefused?: (verdict: ConnectionVerdict) => void;
  realtime?: boolean;
  saveDebounceMs?: number;
  /** Read-only mode: no mutation is issued and no debounce is armed. */
  readOnly?: boolean;
}

export interface WorkflowController {
  definition: WorkflowDefinitionRow | null;
  versions: WorkflowDefinitionVersionRow[];
  draft: WorkflowDefinitionVersionRow | null;
  registry: WorkflowNodeTypeRegistry;

  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;

  isLoading: boolean;
  loadError: Error | null;
  /**
   * True from the first unsaved edit until the write LANDS — and it stays true
   * when the write fails, because an edit that did not save is still unsaved.
   */
  isDirty: boolean;
  isSaving: boolean;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onViewportChange: (viewport: Viewport) => void;
  isValidConnection: (connection: Connection | Edge) => boolean;

  addNode: (kind: string, position: { x: number; y: number }, laneId?: string) => WorkflowNode;
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;

  autoLayout: (options?: SwimlaneLayoutOptions) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  /** Force the pending debounce to fire now. */
  saveNow: () => Promise<void>;
  createDraft: () => Promise<WorkflowDefinitionVersionRow>;
  publish: (versionId?: string) => Promise<WorkflowDefinitionRow>;
  /**
   * Rename the WORKFLOW (not a node). `name` is the column; there is no `label`
   * column on `workflow_definitions`, and the earlier signature said there was —
   * every rename returned a 42703. `key` is deliberately not renameable: an
   * automation trigger names the key, so changing it detaches every trigger.
   */
  rename: (name: string, description?: string | null) => Promise<WorkflowDefinitionRow>;
  /**
   * "Duplicate to my tenant" — copy this workflow (normally a platform
   * template) into `tenantId` as an editable DRAFT. Nothing is published, so
   * the copy cannot go live by accident.
   */
  duplicateToTenant: (
    name?: string,
  ) => Promise<{ definition: WorkflowDefinitionRow; draft: WorkflowDefinitionVersionRow }>;
  /** True when the loaded workflow is a platform template (tenant_id IS NULL). */
  isPlatformTemplate: boolean;
  /**
   * True when the loaded workflow belongs to a DIFFERENT tenant than the one in
   * session. Editing is refused rather than attempted: RLS would refuse the
   * write anyway, and a canvas that accepts edits it cannot save is worse than
   * one that says so.
   */
  isReadOnly: boolean;
}

/**
 * ONE DRAG IS ONE UNDO STEP, AND THE STEP IS TAKEN AT THE START.
 *
 * A drag emits a position change per pointer-move. Checkpointing each would
 * fill a 50-slot stack with one gesture; checkpointing at the END would push
 * the second-to-last FRAME of the gesture, so undo would nudge the node back a
 * pixel instead of returning it to where the drag began. So the checkpoint is
 * taken when the drag starts, and every frame after it merely replaces.
 *
 * These three predicates are exported because they are the whole rule, and a
 * rule worth this much comment is worth testing directly.
 */
export function isDragStart(changes: readonly NodeChange[]): boolean {
  return changes.some((c) => c.type === 'position' && c.dragging === true);
}

export function isDragEnd(changes: readonly NodeChange[]): boolean {
  return changes.some((c) => c.type === 'position' && c.dragging === false);
}

/** Adds, removes and replacements are edits in their own right. */
export function isStructuralChange(changes: readonly NodeChange[]): boolean {
  return changes.some(
    (c) => c.type === 'add' || c.type === 'remove' || c.type === 'replace',
  );
}

function newNodeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useWorkflowController({
  supabase,
  tenantId,
  definitionId,
  registry = workflowNodeTypeRegistry,
  onError,
  onSuccess,
  onConnectionRefused,
  realtime = true,
  saveDebounceMs = DEFAULT_SAVE_DEBOUNCE_MS,
  readOnly = false,
}: UseWorkflowControllerOptions): WorkflowController {
  const qc = useQueryClient();

  const definitionQuery = useQuery(workflowDefinitionOptions(supabase, definitionId));
  const versionsQuery = useQuery(workflowVersionsOptions(supabase, definitionId));
  const draftQuery = useQuery(workflowDraftOptions(supabase, definitionId));

  useWorkflowRealtimeSubscription({
    client: supabase,
    tenantId,
    definitionId,
    enabled: realtime,
    // See that hook's header: refreshing the draft under an open editor
    // replaces the graph the user is editing with an older copy.
    invalidateDraft: false,
  });

  const definitionKey = workflowDefinitionOptions(supabase, definitionId).queryKey;
  const draftKey = workflowDraftOptions(supabase, definitionId).queryKey;
  const versionsKey = workflowVersionsOptions(supabase, definitionId).queryKey;

  // --- local graph, with undo/redo -----------------------------------------
  const graphApi = useUndoRedo<WorkflowGraph>(emptyWorkflowGraph());
  const { state: graph, set: setGraph, replace: replaceGraph, reset: resetGraph } = graphApi;

  // Which draft the local graph was seeded from. Guards against re-seeding on
  // every refetch, which would discard unsaved edits.
  const seededVersionRef = useRef<string | null>(null);
  const draftRow = draftQuery.data ?? null;

  // Declared before the seeding effect so that effect can mark the seeded graph
  // as already-synced; see the persistence effect further down.
  const lastScheduledRef = useRef<WorkflowGraph | null>(null);

  useEffect(() => {
    if (!draftRow) return;
    if (seededVersionRef.current === draftRow.id) return;
    seededVersionRef.current = draftRow.id;
    const seeded = draftRow.graph ?? emptyWorkflowGraph();
    resetGraph(seeded);
    // What we just read from the server is by definition already saved.
    lastScheduledRef.current = seeded;
  }, [draftRow, resetGraph]);

  // --- save -----------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: ({ versionId, next }: { versionId: string; next: WorkflowGraph }) =>
      saveVersionGraph(supabase, versionId, next),
    onMutate: async ({ next }) => {
      await qc.cancelQueries({ queryKey: draftKey });
      const prev = qc.getQueryData<WorkflowDefinitionVersionRow | null>(draftKey);
      qc.setQueryData<WorkflowDefinitionVersionRow | null>(draftKey, (old) =>
        old ? { ...old, graph: next } : old,
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(draftKey, ctx.prev);
      onError?.('Could not save the workflow', err);
      // Resync on FAILURE only — see the header.
      void qc.invalidateQueries({ queryKey: draftKey });
    },
    onSuccess: (saved) => {
      // Write the authoritative row rather than refetching for it.
      qc.setQueryData<WorkflowDefinitionVersionRow | null>(draftKey, saved);
    },
  });

  // The graph the debounce will write. A ref, not state: the timer must read
  // the LATEST graph when it fires, and re-arming the timer on every keystroke
  // is what a state dependency would cause.
  const pendingRef = useRef<WorkflowGraph | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMutateRef = useRef(saveMutation.mutateAsync);
  saveMutateRef.current = saveMutation.mutateAsync;

  // `isDirty` is STATE, not `pendingRef.current !== null`.
  //
  // A ref read during render does not re-render when it changes, so a consumer
  // rendering "Unsaved changes…" from it would have shown the value as of
  // whatever unrelated render happened last — never flipping on the edit, and
  // never clearing on the save. An indicator that is wrong in both directions
  // is worse than none: it teaches the user not to trust it, and the whole
  // reason to show it is that the save is deferred behind a debounce.
  const [isDirty, setIsDirty] = useState(false);

  const flush = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const next = pendingRef.current;
    const versionId = seededVersionRef.current;
    pendingRef.current = null;
    if (!next || !versionId) {
      setIsDirty(false);
      return;
    }
    try {
      await saveMutateRef.current({ versionId, next });
      // Only clear on SUCCESS. A failed save leaves the edit unsaved, and
      // saying otherwise is how work gets lost quietly — the mutation's
      // onError has already rolled the cache back and told the caller.
      setIsDirty(false);
    } catch {
      // Left dirty deliberately. The error is surfaced by the mutation's
      // onError; swallowing it here only stops it becoming an unhandled
      // rejection from the debounce timer, which has no caller to catch it.
    }
  }, []);

  const scheduleSave = useCallback(
    (next: WorkflowGraph) => {
      if (readOnly) return;
      pendingRef.current = next;
      setIsDirty(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, saveDebounceMs);
    },
    [flush, readOnly, saveDebounceMs],
  );

  // A pending edit must not be lost because the user navigated away. Flushing
  // in the cleanup is the difference between "saved a moment later" and
  // "silently discarded", and a silently discarded save is the failure this
  // estate keeps finding after the fact.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const next = pendingRef.current;
      const versionId = seededVersionRef.current;
      if (next && versionId) void saveMutateRef.current({ versionId, next });
    },
    [],
  );

  const commit = useCallback(
    (next: WorkflowGraph, checkpoint: boolean) => {
      if (checkpoint) setGraph(next);
      else replaceGraph(next);
      // The save is NOT scheduled here. See the effect below: UNDO and REDO
      // also change the graph and must also persist, and a `commit`-only
      // schedule would have left an undone edit on screen and saved on the
      // server — the exact "it reverted after I reloaded" defect.
    },
    [replaceGraph, setGraph],
  );

  // Persist ANY change to the graph, whoever made it — an edit, an undo, a
  // redo, an auto-layout. Keyed on identity: `useUndoRedo` only ever hands back
  // a new object when the graph actually changed.
  useEffect(() => {
    if (readOnly) return;
    if (lastScheduledRef.current === null) {
      // First render, or the graph a draft was just seeded with. Saving it
      // back verbatim would be a write that changes nothing.
      lastScheduledRef.current = graph;
      return;
    }
    if (lastScheduledRef.current === graph) return;
    lastScheduledRef.current = graph;
    scheduleSave(graph);
  }, [graph, readOnly, scheduleSave]);

  // --- xyflow change handlers ----------------------------------------------
  const graphRef = useRef(graph);
  graphRef.current = graph;

  // Whether a drag gesture is currently in progress, so its FIRST frame can be
  // told from its middle ones. See the predicates above.
  const draggingRef = useRef(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const current = graphRef.current;
      const nodes = applyNodeChanges(changes, current.nodes) as WorkflowNode[];
      const next = { ...current, nodes };

      if (isDragStart(changes) && !draggingRef.current) {
        draggingRef.current = true;
        // Bank where the node WAS before the gesture moved it, then let the
        // gesture's frames replace the present.
        graphApi.checkpoint();
        replaceGraph(next);
        return;
      }
      if (isDragEnd(changes)) draggingRef.current = false;

      commit(next, isStructuralChange(changes));
    },
    [commit, graphApi, replaceGraph],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const current = graphRef.current;
      const edges = applyEdgeChanges(changes, current.edges);
      // Every edge change is structural — there is no drag-equivalent stream.
      commit({ ...current, edges }, true);
    },
    [commit],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge): boolean =>
      validateConnection({
        connection,
        nodes: graphRef.current.nodes,
        edges: graphRef.current.edges,
        registry,
      }).ok,
    [registry],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const current = graphRef.current;
      const verdict = validateConnection({
        connection,
        nodes: current.nodes,
        edges: current.edges,
        registry,
      });
      if (!verdict.ok) {
        // Refusing SILENTLY is how a canvas teaches users that dragging is
        // unreliable. `isValidConnection` already blocks the drop visually;
        // this is the sentence explaining it.
        onConnectionRefused?.(verdict);
        return;
      }
      commit({ ...current, edges: addEdge(connection, current.edges) }, true);
    },
    [commit, onConnectionRefused, registry],
  );

  const onViewportChange = useCallback(
    (viewport: Viewport) => {
      // A pan is not an undoable edit, and it must not fill the stack.
      const current = graphRef.current;
      commit({ ...current, viewport }, false);
    },
    [commit],
  );

  // --- node CRUD ------------------------------------------------------------
  const addNode = useCallback(
    (kind: string, position: { x: number; y: number }, laneId?: string): WorkflowNode => {
      const descriptor = registry.get(kind);
      if (!descriptor) {
        throw new Error(`Unknown node kind '${kind}' — not in this registry.`);
      }
      const current = graphRef.current;
      const lane = laneId
        ? current.nodes.find(
            (n) =>
              registry.isContainer(n.type) &&
              (n.data as { laneId?: unknown } | undefined)?.laneId === laneId,
          )
        : undefined;
      const node: WorkflowNode = {
        id: newNodeId(),
        type: kind,
        position,
        data: { ...descriptor.defaultData(), ...(laneId ? { laneId } : {}) },
        ...(lane ? { parentId: lane.id, extent: 'parent' as const } : {}),
      };
      // A parent must precede its children in the array; appending a child of
      // an existing lane is always safe because the lane is already earlier.
      commit({ ...current, nodes: [...current.nodes, node] }, true);
      return node;
    },
    [commit, registry],
  );

  const updateNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      const current = graphRef.current;
      commit(
        {
          ...current,
          nodes: current.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        },
        true,
      );
    },
    [commit],
  );

  const deleteNode = useCallback(
    (id: string) => {
      const current = graphRef.current;
      // Children of a deleted lane would otherwise render at the origin with a
      // console warning about a missing parent — a broken canvas, not an error.
      const orphanIds = new Set(
        current.nodes.filter((n) => n.parentId === id).map((n) => n.id),
      );
      orphanIds.add(id);
      commit(
        {
          ...current,
          nodes: current.nodes.filter((n) => !orphanIds.has(n.id)),
          edges: current.edges.filter(
            (e) => !orphanIds.has(e.source) && !orphanIds.has(e.target),
          ),
        },
        true,
      );
    },
    [commit],
  );

  const autoLayout = useCallback(
    (options?: SwimlaneLayoutOptions) => {
      const current = graphRef.current;
      const { nodes } = computeSwimlaneLayout(current.nodes, current.edges, options);
      commit({ ...current, nodes }, true);
    },
    [commit],
  );

  // --- version mutations ----------------------------------------------------
  const createDraftMutation = useMutation({
    mutationFn: () => {
      if (!definitionId || !tenantId) {
        throw new Error('Cannot open a draft without a workflow and a tenant.');
      }
      return createDraftVersion(supabase, {
        definitionId,
        tenantId,
        graph: graphRef.current,
      });
    },
    onSuccess: (row) => {
      qc.setQueryData<WorkflowDefinitionVersionRow | null>(draftKey, row);
      void qc.invalidateQueries({ queryKey: versionsKey });
      onSuccess?.('Draft created');
    },
    onError: (err) => onError?.('Could not create a draft', err),
  });

  const publishMutation = useMutation({
    mutationFn: async (versionId?: string) => {
      if (!definitionId) throw new Error('Cannot publish without a workflow.');
      const target = versionId ?? seededVersionRef.current;
      if (!target) throw new Error('There is no draft to publish.');
      // The in-flight debounce must land BEFORE the version is frozen —
      // publishing a version whose last edits are still in a timer publishes a
      // graph the user can see on screen and nobody else will ever get.
      await flush();
      return publishVersion(supabase, definitionId, target);
    },
    onSuccess: (row) => {
      qc.setQueryData<WorkflowDefinitionRow | null>(definitionKey, row);
      void qc.invalidateQueries({ queryKey: versionsKey });
      void qc.invalidateQueries({ queryKey: draftKey });
      onSuccess?.('Workflow published');
    },
    onError: (err) => onError?.('Could not publish the workflow', err),
  });

  const renameMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string | null }) => {
      if (!definitionId) throw new Error('Cannot rename without a workflow.');
      return updateWorkflowDefinition(supabase, definitionId, { name, description });
    },
    onMutate: async ({ name, description }) => {
      await qc.cancelQueries({ queryKey: definitionKey });
      const prev = qc.getQueryData<WorkflowDefinitionRow | null>(definitionKey);
      qc.setQueryData<WorkflowDefinitionRow | null>(definitionKey, (old) =>
        old ? { ...old, name, description: description ?? old.description } : old,
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(definitionKey, ctx.prev);
      onError?.('Could not rename the workflow', err);
    },
    onSuccess: (row) => qc.setQueryData(definitionKey, row),
  });

  // A platform template has no owning tenant; a workflow owned by ANOTHER
  // tenant is visible only if the session is a platform developer, and RLS
  // would refuse every write to it. Both are computed from the row rather than
  // passed in, so a consumer cannot forget to pass them.
  const definitionRow = definitionQuery.data ?? null;
  const isPlatformTemplate = definitionRow !== null && definitionRow.tenant_id === null;
  const isReadOnly =
    readOnly ||
    (definitionRow !== null &&
      definitionRow.tenant_id !== null &&
      tenantId !== null &&
      definitionRow.tenant_id !== tenantId);

  const duplicateMutation = useMutation({
    mutationFn: (name?: string) => {
      if (!definitionId) throw new Error('Cannot duplicate without a workflow.');
      if (!tenantId) {
        throw new Error('No tenant is selected, so there is nowhere to copy this to.');
      }
      return duplicateWorkflowDefinition(supabase, {
        sourceDefinitionId: definitionId,
        tenantId,
        name,
      });
    },
    onSuccess: () => {
      // The copy is a DIFFERENT definition, so this workflow's own caches are
      // untouched; what changed is the LIST the caller renders it from.
      void qc.invalidateQueries({ queryKey: ['workflow', 'definitions'] });
      onSuccess?.('Copied to your organisation as a draft');
    },
    onError: (err) => onError?.('Could not copy that workflow', err),
  });

  const loadError = useMemo(
    () =>
      (definitionQuery.error as Error | null) ??
      (draftQuery.error as Error | null) ??
      (versionsQuery.error as Error | null) ??
      null,
    [definitionQuery.error, draftQuery.error, versionsQuery.error],
  );

  return {
    definition: definitionQuery.data ?? null,
    versions: versionsQuery.data ?? [],
    draft: draftRow,
    registry,

    nodes: graph.nodes,
    edges: graph.edges,
    viewport: graph.viewport,

    isLoading:
      definitionQuery.isLoading || draftQuery.isLoading || versionsQuery.isLoading,
    loadError,
    isDirty: isDirty || saveMutation.isPending,
    isSaving: saveMutation.isPending,

    onNodesChange,
    onEdgesChange,
    onConnect,
    onViewportChange,
    isValidConnection,

    addNode,
    updateNodeData,
    deleteNode,
    autoLayout,

    undo: graphApi.undo,
    redo: graphApi.redo,
    canUndo: graphApi.canUndo,
    canRedo: graphApi.canRedo,

    saveNow: flush,
    createDraft: createDraftMutation.mutateAsync,
    publish: publishMutation.mutateAsync,
    rename: (name, description) => renameMutation.mutateAsync({ name, description }),
    duplicateToTenant: duplicateMutation.mutateAsync,
    isPlatformTemplate,
    isReadOnly,
  };
}
