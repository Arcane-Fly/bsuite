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
  patchDraftGraphInVersions,
  restoreDraftGraphCaches,
  writeDraftGraphCaches,
} from './draftCache.js';
import {
  workflowDefinitionOptions,
  workflowDefinitionsOptions,
  workflowDraftOptions,
  workflowVersionOptions,
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
  /**
   * A published workflow with no draft: nothing can be saved until a draft is created with createDraft().
   */
  needsDraft: boolean;
  /**
   * The graph on screen is the saved one. Until then every edit is refused and
   * isReadOnly is true; this says why, apart from "another organisation's".
   */
  isGraphReady: boolean;
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

/**
 * One persist attempt, bound to the definition that queued it.
 *
 * `seq` is the same-definition debounce generation: a newer schedule must not
 * have its optimistic caches rolled back by an older in-flight write.
 * `generation` is the definition-scope generation: a late response from a
 * previous `definitionId` must not touch this editor's last-saved snapshots.
 */
type SaveWrite = {
  versionId: string;
  next: WorkflowGraph;
  seq: number;
  generation: number;
  definitionId: string | null;
  draftKey: readonly unknown[];
  versionsKey: readonly unknown[];
};

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

  /*
   * THE PUBLISHED VERSION, FOR A DEFINITION THAT HAS NO DRAFT.
   *
   * The seeding effect below reads the DRAFT, because editing is what this
   * controller is for. A platform template has only a published version and no
   * draft, so the canvas mounted and rendered an EMPTY graph — measured on
   * production 2026-09-02: `.react-flow` present, no error, no fallback,
   * 0 nodes against a 42-node workflow. The page around it said "6 lanes,
   * 32 steps"; the canvas said nothing.
   *
   * Seeding from the published version fixes the view. What it must NOT do is
   * make the published version writable: `seededVersionRef` is the save
   * target, and both `flush` and the unmount cleanup refuse when it is null.
   * So this path deliberately leaves that ref alone — a published-seeded graph
   * has nowhere to save to, by construction rather than by a flag someone can
   * later forget to check.
   */
  const publishedVersionId = draftQuery.data
    ? null
    : (definitionQuery.data?.current_published_version_id ?? null);
  const publishedQuery = useQuery(workflowVersionOptions(supabase, publishedVersionId));

  useWorkflowRealtimeSubscription({
    client: supabase,
    tenantId,
    definitionId,
    enabled: realtime,
    // See that hook's header: refreshing the draft under an open editor
    // replaces the graph the user is editing with an older copy.
    invalidateDraft: false,
  });

  // MEMOISED so the identities are stable across renders, which is what lets the
  // definition-switch effect below list them honestly instead of suppressing
  // exhaustive-deps. Each `*Options()` call allocates a FRESH `queryKey` tuple
  // (`queries.ts` builds `['workflow-draft', definitionId] as const` inline), so
  // the unmemoised values changed identity every render and any effect that
  // named them re-fired every render.
  //
  // `[supabase, definitionId]` is the honest dependency list, not a narrowing:
  // `supabase` is read inside the factory, and every one of these three keys is
  // a pure function of `definitionId` alone — the client reaches `queryFn`, never
  // `queryKey`. So a churning client cannot change a key's VALUE, only its
  // identity, and the effect below is guarded by a definitionId comparison anyway.
  const definitionKey = useMemo(
    () => workflowDefinitionOptions(supabase, definitionId).queryKey,
    [supabase, definitionId],
  );
  const draftKey = useMemo(
    () => workflowDraftOptions(supabase, definitionId).queryKey,
    [supabase, definitionId],
  );
  const versionsKey = useMemo(
    () => workflowVersionsOptions(supabase, definitionId).queryKey,
    [supabase, definitionId],
  );
  const lastSavedDraftRef = useRef<WorkflowDefinitionVersionRow | null>(null);
  const lastSavedVersionsRef = useRef<WorkflowDefinitionVersionRow[] | undefined>(undefined);
  /** Bumps on every `scheduleSave`. Stale in-flight saves must not write caches. */
  const saveSeqRef = useRef(0);
  const saveChainRef = useRef(Promise.resolve());
  /**
   * Bumps when `definitionId` changes on this same hook instance (CRM's canvas
   * is unkeyed). In-flight writes keep the generation they were queued with.
   */
  const generationRef = useRef(0);
  const definitionIdRef = useRef(definitionId);
  const draftKeyRef = useRef<readonly unknown[]>(draftKey);
  const versionsKeyRef = useRef<readonly unknown[]>(versionsKey);
  /** Skip one persist pass after seed / definition switch so the pre-reset graph is not written. */
  const skipPersistRef = useRef(false);
  // The LIST key's first segment, for prefix invalidation after a duplicate.
  const definitionsKeyPrefix = [workflowDefinitionsOptions(supabase, tenantId).queryKey[0]];

  // --- local graph, with undo/redo -----------------------------------------
  const graphApi = useUndoRedo<WorkflowGraph>(emptyWorkflowGraph());
  const { state: graph, set: setGraph, replace: replaceGraph, reset: resetGraph } = graphApi;

  /*
   * A pending save carries the version it is FOR, taken when it is scheduled.
   * It used to carry only the graph, and flush read the target version when
   * the timer fired: an edit made before the draft loaded was scheduled with
   * no target, the draft then seeded, and the timer wrote that pre-load graph
   * into the draft just seeded (production, 25 Sep 2026: 4 nodes -> 1).
   */
  const pendingRef = useRef<{ graph: WorkflowGraph; versionId: string | null } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Which draft the local graph was seeded from. Guards against re-seeding on
  // every refetch, which would discard unsaved edits.
  const seededVersionRef = useRef<string | null>(null);
  /* Separate from seededVersionRef ON PURPOSE — see the published seeding effect. */
  const seededPublishedRef = useRef<string | null>(null);
  const draftRow = draftQuery.data ?? null;

  /*
   * WHICH GRAPH THE LOCAL STATE HOLDS, as state rather than a ref, so it is set
   * in the same render batch as the seeded graph.
   *
   * Until the saved graph has been seeded, the local graph is the empty
   * placeholder. An edit made then — a palette click the moment the palette
   * rendered — landed on that placeholder, and the next save wrote "empty plus
   * one step" over the saved draft: measured on production 25 Sep 2026, a
   * 4-node, 1-edge draft reopened and clicked at once became 1 node, 0 edges.
   * So the editor is locked, and every edit refused, until this says the graph
   * on screen is the graph that was saved.
   */
  const [seededFrom, setSeededFrom] = useState<string | null>(null);

  // Declared before the seeding effect so that effect can mark the seeded graph
  // as already-synced; see the persistence effect further down.
  const lastScheduledRef = useRef<WorkflowGraph | null>(null);

  useEffect(() => {
    if (!draftRow) return;
    if (seededVersionRef.current === draftRow.id) return;
    seededVersionRef.current = draftRow.id;
    // Anything pending was made before this graph loaded, against a graph that
    // was never saved. It is dropped, never written over the one just read.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    const seeded = draftRow.graph ?? emptyWorkflowGraph();
    resetGraph(seeded);
    setSeededFrom(`draft:${draftRow.id}`);
    // What we just read from the server is by definition already saved.
    lastScheduledRef.current = seeded;
    lastSavedDraftRef.current = draftRow;
    lastSavedVersionsRef.current = versionsQuery.data;
    skipPersistRef.current = true;
  }, [draftRow, resetGraph, versionsQuery.data]);

  /*
   * No draft: show what is PUBLISHED rather than an empty canvas. Guarded by its
   * own ref so it seeds once, and it never touches `seededVersionRef`, so the
   * published version cannot be written by any later edit.
   */
  const publishedRow = publishedQuery.data ?? null;
  useEffect(() => {
    if (draftRow) return;
    if (!publishedRow) return;
    if (seededPublishedRef.current === publishedRow.id) return;
    seededPublishedRef.current = publishedRow.id;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    const seeded = publishedRow.graph ?? emptyWorkflowGraph();
    resetGraph(seeded);
    setSeededFrom(`published:${publishedRow.id}`);
    lastScheduledRef.current = seeded;
    skipPersistRef.current = true;
  }, [draftRow, publishedRow, resetGraph]);

  // Ready once the graph that will be edited is the one on screen: the draft,
  // or with no draft the published version, or — a workflow with neither —
  // the empty graph, once both reads have answered.
  const graphReady =
    definitionQuery.isSuccess &&
    draftQuery.isSuccess &&
    (draftRow
      ? seededFrom === `draft:${draftRow.id}`
      : publishedVersionId
        ? // A published version that failed to load must not lock the editor
          // for ever; loadError says why the canvas is empty.
          seededFrom === `published:${publishedVersionId}` || publishedQuery.isError
        : true);
  const graphReadyRef = useRef(graphReady);
  graphReadyRef.current = graphReady;

  // A platform template has no owning tenant; a workflow owned by ANOTHER
  // tenant is visible only if the session is a platform developer, and RLS
  // would refuse every write to it. Both are computed from the row rather than
  // passed in, so a consumer cannot forget to pass them.
  const definitionRow = definitionQuery.data ?? null;
  const isPlatformTemplate = definitionRow !== null && definitionRow.tenant_id === null;
  const isOtherTenant =
    definitionRow !== null &&
    definitionRow.tenant_id !== null &&
    tenantId !== null &&
    definitionRow.tenant_id !== tenantId;
  const needsDraft =
    graphReady &&
    !draftRow &&
    Boolean(publishedVersionId) &&
    definitionRow?.tenant_id === tenantId;
  const isReadOnly = readOnly || !graphReady || isOtherTenant || needsDraft;
  const readOnlyRef = useRef(isReadOnly);
  readOnlyRef.current = isReadOnly;
  const needsDraftRef = useRef(needsDraft);
  needsDraftRef.current = needsDraft;

  // --- save -----------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: ({ versionId, next }: SaveWrite) =>
      saveVersionGraph(supabase, versionId, next),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: vars.draftKey });
      await qc.cancelQueries({ queryKey: vars.versionsKey });
      const sameScope = vars.generation === generationRef.current;
      const prevDraft = sameScope
        ? (lastSavedDraftRef.current ??
          qc.getQueryData<WorkflowDefinitionVersionRow | null>(vars.draftKey))
        : qc.getQueryData<WorkflowDefinitionVersionRow | null>(vars.draftKey);
      const prevVersions = sameScope
        ? (lastSavedVersionsRef.current ??
          qc.getQueryData<WorkflowDefinitionVersionRow[]>(vars.versionsKey))
        : qc.getQueryData<WorkflowDefinitionVersionRow[]>(vars.versionsKey);
      writeDraftGraphCaches(qc, vars.draftKey, vars.versionsKey, vars.next);
      return { prevDraft, prevVersions };
    },
    onError: (err, vars, ctx) => {
      onError?.('Could not save the workflow', err);
      const sameScope = vars.generation === generationRef.current;
      // Same definition: a stale seq must not roll a newer optimistic graph
      // back. Cross-scope writes restore only the keys they captured.
      if (sameScope && vars.seq !== saveSeqRef.current) return;
      restoreDraftGraphCaches(
        qc,
        vars.draftKey,
        vars.versionsKey,
        ctx?.prevDraft,
        ctx?.prevVersions,
      );
      if (!sameScope) return;
      // Resync on FAILURE only — see the header.
      void qc.invalidateQueries({ queryKey: vars.draftKey });
      void qc.invalidateQueries({ queryKey: vars.versionsKey });
    },
    onSuccess: (saved, vars) => {
      if (
        vars.definitionId != null &&
        saved.workflow_definition_id !== vars.definitionId
      ) {
        return;
      }
      const sameScope = vars.generation === generationRef.current;
      if (sameScope) {
        // Do NOT seq-gate last-saved. Same-definition A-success then B-fail
        // must roll back to A, not to the pre-A snapshot.
        lastSavedDraftRef.current = saved;
        lastSavedVersionsRef.current =
          patchDraftGraphInVersions(lastSavedVersionsRef.current, saved.graph) ??
          lastSavedVersionsRef.current;
        if (vars.seq !== saveSeqRef.current) return;
      }
      qc.setQueryData<WorkflowDefinitionVersionRow | null>(vars.draftKey, saved);
      writeDraftGraphCaches(qc, vars.draftKey, vars.versionsKey, saved.graph);
    },
  });

  // The graph the debounce will write. A ref, not state: the timer must read
  // the LATEST graph when it fires, and re-arming the timer on every keystroke
  // is what a state dependency would cause.
  const saveMutateRef = useRef(saveMutation.mutateAsync);
  saveMutateRef.current = saveMutation.mutateAsync;

  const enqueueSave = useCallback((vars: SaveWrite): Promise<void> => {
    const run = async () => {
      try {
        await saveMutateRef.current(vars);
        if (
          vars.generation === generationRef.current &&
          vars.seq === saveSeqRef.current
        ) {
          setIsDirty(false);
        }
      } catch {
        // Left dirty deliberately. The error is surfaced by the mutation's
        // onError; swallowing it here only stops it becoming an unhandled
        // rejection from the debounce timer, which has no caller to catch it.
      }
    };
    const chained = saveChainRef.current.then(run, run);
    saveChainRef.current = chained.then(
      () => undefined,
      () => undefined,
    );
    return chained;
  }, []);

  const captureSaveWrite = useCallback(
    (next: WorkflowGraph, versionId: string, seq: number): SaveWrite => ({
      versionId,
      next,
      seq,
      generation: generationRef.current,
      definitionId: definitionIdRef.current,
      draftKey: [...draftKeyRef.current],
      versionsKey: [...versionsKeyRef.current],
    }),
    [],
  );

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
    const pending = pendingRef.current;
    const next = pending?.graph ?? null;
    // Only the version this edit was made against, and only while it is still
    // the one on screen.
    const versionId =
      pending && pending.versionId !== null && pending.versionId === seededVersionRef.current
        ? pending.versionId
        : null;
    const seq = saveSeqRef.current;
    const generation = generationRef.current;
    pendingRef.current = null;
    if (!next || !versionId) {
      if (seq === saveSeqRef.current && generation === generationRef.current) {
        setIsDirty(false);
      }
      return;
    }
    await enqueueSave(captureSaveWrite(next, versionId, seq));
  }, [captureSaveWrite, enqueueSave]);

  const scheduleSave = useCallback(
    (next: WorkflowGraph) => {
      if (readOnlyRef.current) return;
      saveSeqRef.current += 1;
      pendingRef.current = { graph: next, versionId: seededVersionRef.current };
      setIsDirty(true);
      // The step table (and any other reader of the draft/versions caches)
      // follows this write. Waiting for the 900 ms debounce left the table
      // on the last fetched versions row while the canvas already had the
      // new node. Rollback of these caches is the mutation's onError.
      writeDraftGraphCaches(qc, draftKeyRef.current, versionsKeyRef.current, next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, saveDebounceMs);
    },
    // Keys live in refs so this callback stays stable. A new queryKey tuple
    // every render would re-fire the persist effect and write the live graph
    // over a lastSaved restore.
    [flush, qc, saveDebounceMs],
  );

  // Same hook instance, new definition (CRM inner is unkeyed). Bind leftover
  // writes to the previous generation so their callbacks cannot contaminate
  // this editor's last-saved snapshots, then start a fresh serial chain.
  useEffect(() => {
    if (definitionIdRef.current === definitionId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const leftover = pendingRef.current?.graph ?? null;
    const leftoverVersionId = pendingRef.current?.versionId ?? null;
    const leftoverSeq = saveSeqRef.current;
    const leftoverGeneration = generationRef.current;
    const leftoverDefinitionId = definitionIdRef.current;
    const leftoverDraftKey = [...draftKeyRef.current];
    const leftoverVersionsKey = [...versionsKeyRef.current];
    pendingRef.current = null;

    if (leftover && leftoverVersionId && leftoverDefinitionId) {
      const previousChain = saveChainRef.current;
      const runLeftover = async () => {
        try {
          await saveMutateRef.current({
            versionId: leftoverVersionId,
            next: leftover,
            seq: leftoverSeq,
            generation: leftoverGeneration,
            definitionId: leftoverDefinitionId,
            draftKey: leftoverDraftKey,
            versionsKey: leftoverVersionsKey,
          });
        } catch {
          /* mutation onError */
        }
      };
      void previousChain.then(runLeftover, runLeftover);
    }

    generationRef.current += 1;
    saveSeqRef.current = 0;
    saveChainRef.current = Promise.resolve();
    lastSavedDraftRef.current = null;
    lastSavedVersionsRef.current = undefined;
    seededVersionRef.current = null;
    seededPublishedRef.current = null;
    lastScheduledRef.current = null;
    skipPersistRef.current = true;
    definitionIdRef.current = definitionId;
    setSeededFrom(null);
    draftKeyRef.current = draftKey;
    versionsKeyRef.current = versionsKey;
    setIsDirty(false);
  }, [definitionId, draftKey, versionsKey]);

  // A pending edit must not be lost because the user navigated away. Flushing
  // in the cleanup is the difference between "saved a moment later" and
  // "silently discarded", and a silently discarded save is the failure this
  // estate keeps finding after the fact. Must use the same serial chain as
  // flush — a raw mutate here raced an in-flight A with the pending B.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const pending = pendingRef.current;
      pendingRef.current = null;
      const next = pending?.graph ?? null;
      const versionId =
        pending && pending.versionId !== null && pending.versionId === seededVersionRef.current
          ? pending.versionId
          : null;
      if (!next || !versionId) return;
      void enqueueSave(
        captureSaveWrite(next, versionId, saveSeqRef.current),
      );
    },
    [captureSaveWrite, enqueueSave],
  );

  const graphRef = useRef(graph);
  graphRef.current = graph;

  const commit = useCallback(
    (next: WorkflowGraph, checkpoint: boolean) => {
      // Nothing edits a graph that has not loaded (see seededFrom). Every
      // mutator — add, move, connect, delete, layout, pan — comes through here.
      // readOnlyRef also covers a published-only graph (needsDraft) and another
      // organisation's workflow: those have a graph on screen but nowhere to save.
      if (readOnlyRef.current) return;
      // Same-tick readers (palette add then select) must see this graph.
      // Waiting for the next render left onNodesChange on the pre-add list,
      // and replaceGraph then dropped the node.
      graphRef.current = next;
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
    if (readOnlyRef.current) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    if (lastScheduledRef.current === null) {
      // First render, or the graph a draft was just seeded with. Saving it
      // back verbatim would be a write that changes nothing.
      lastScheduledRef.current = graph;
      return;
    }
    if (lastScheduledRef.current === graph) return;
    lastScheduledRef.current = graph;
    scheduleSave(graph);
  }, [graph, graphReady, scheduleSave]);

  // --- xyflow change handlers ----------------------------------------------
  // Whether a drag gesture is currently in progress, so its FIRST frame can be
  // told from its middle ones. See the predicates above.
  const draggingRef = useRef(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const current = graphRef.current;
      const nodes = applyNodeChanges(changes, current.nodes) as WorkflowNode[];
      const next = { ...current, nodes };

      if (readOnlyRef.current) return;
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
      // Returning a node that was never added would have callers select a
      // phantom. The palette is hidden until ready, so this is a caller bug.
      if (needsDraftRef.current) {
        throw new Error('This workflow is published. Create a draft to edit it.');
      }
      if (!graphReadyRef.current) {
        throw new Error('The workflow has not finished loading; nothing can be added yet.');
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
        selected: true,
        data: { ...descriptor.defaultData(), ...(laneId ? { laneId } : {}) },
        ...(lane ? { parentId: lane.id, extent: 'parent' as const } : {}),
      };
      // A parent must precede its children in the array; appending a child of
      // an existing lane is always safe because the lane is already earlier.
      // Select here so a same-tick onNodeAdded cannot replaceGraph from a
      // pre-add node list and drop the node, and so the inspector opens.
      commit(
        {
          ...current,
          nodes: [
            ...current.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
            node,
          ],
        },
        true,
      );
      return node;
    },
    [commit, registry],
  );

  const updateNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      if (readOnlyRef.current) return;
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
      // A draft copies the graph on screen; before it loads that is the empty
      // placeholder, not the workflow.
      if (!graphReadyRef.current) {
        throw new Error('The workflow has not finished loading yet.');
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
      //
      // The key comes from the FACTORY, not from a literal. queries.ts says
      // keys live there and nowhere else, and the first draft of this line
      // ignored that: it passed ['workflow', 'definitions'] while the list is
      // keyed ['workflow-definitions', tenantId], so it matched nothing and the
      // new workflow did not appear until a reload. Only the first segment is
      // taken, so every cached tenant's list is invalidated rather than just
      // the one in session — a developer who switches tenants must not be shown
      // a stale list from before the copy.
      void qc.invalidateQueries({ queryKey: definitionsKeyPrefix });
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

    undo: () => {
      if (graphReadyRef.current) graphApi.undo();
    },
    redo: () => {
      if (graphReadyRef.current) graphApi.redo();
    },
    canUndo: graphApi.canUndo,
    canRedo: graphApi.canRedo,

    saveNow: flush,
    createDraft: createDraftMutation.mutateAsync,
    publish: publishMutation.mutateAsync,
    rename: (name, description) => renameMutation.mutateAsync({ name, description }),
    duplicateToTenant: duplicateMutation.mutateAsync,
    isPlatformTemplate,
    isReadOnly,
    needsDraft,
    isGraphReady: graphReady,
  };
}
