/**
 * Supabase service layer for `workflow_definitions` and
 * `workflow_definition_versions`.
 *
 * Every function takes a pre-constructed client, exactly as
 * `packages/schema-builder/src/service.ts` does, so the package couples to no
 * one app's Supabase wiring. The `Loose*` type aliases and the `assertNoError`
 * shape are lifted from that file deliberately — three consumer apps render
 * that canvas and a fourth pattern here would be a fourth thing to keep in step.
 *
 * THIS PACKAGE DOES NOT OWN THE TABLES. The `workflow_definitions` migration
 * creates them, with RLS copied verbatim from `public.form_layouts` (four
 * separate policies, never `FOR ALL`). If a column name here disagrees with that
 * file, the migration is right. See `types.ts` for the version-collision note:
 * the version the plan reserved is no longer free.
 */

import { deserialiseGraph, serialiseGraph } from './schemas.js';
import { emptyWorkflowGraph } from './types.js';
import type {
  WorkflowDefinitionRow,
  WorkflowDefinitionVersionRow,
  WorkflowGraph,
} from './types.js';

// See `packages/schema-builder/src/service.ts` for the full rationale: the real
// PostgrestQueryBuilder returns a different concrete type from every chain link,
// so a structurally-typed shape cannot match. Awaits are cast at the call site,
// so there is no runtime type-safety loss.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseQuery = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseChannel = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseSupabaseClient = any;

const DEFINITIONS = 'workflow_definitions';
const VERSIONS = 'workflow_definition_versions';

/** Postgres unique-violation. See `createDraftVersion` for why it is caught. */
const UNIQUE_VIOLATION = '23505';

/**
 * Every failure this module raises carries a MACHINE-READABLE `code`, and that
 * is not decoration.
 *
 * Operator ruling 2026-08-26: assert the OUTCOME, not the wording. A caller —
 * and a test — that has to match on prose is brittle in both directions, and
 * the dangerous direction is the quiet one: reword the message and the check
 * stops matching and PASSES while the code still misbehaves. `DuplicateNodeKind
 * Error` in `nodes/registry.ts` already made this call for the same reason.
 *
 * For a PostgREST failure the code is the SQLSTATE the database returned
 * (`23505` unique violation, `42501` insufficient privilege, `42703` undefined
 * column), which is what a caller actually needs to branch on.
 */
export class WorkflowServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkflowServiceError';
  }
}

/** The source of a duplicate is gone — deleted, or never visible to this role. */
export class WorkflowSourceMissingError extends Error {
  readonly code = 'workflow-source-missing';

  constructor(readonly definitionId: string) {
    super(`Workflow '${definitionId}' no longer exists, or you cannot see it.`);
    this.name = 'WorkflowSourceMissingError';
  }
}

/** A readable message from anything a Supabase call can reject or resolve-error with. */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function assertNoError<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) {
    throw new WorkflowServiceError(errorCode(res.error) ?? 'unknown', describeError(res.error));
  }
  return res.data as T;
}

function errorCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

/**
 * Rows come back with `graph` as raw jsonb. Parsing it here — once, at the
 * boundary — is what keeps every caller from deciding for itself whether to
 * trust the column, and is where a malformed graph is caught while the failure
 * still has a row id attached to it.
 */
function hydrateVersion(row: WorkflowDefinitionVersionRow): WorkflowDefinitionVersionRow {
  return { ...row, graph: deserialiseGraph(row.graph) };
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

/**
 * Everything a tenant can see: its own workflows AND the platform templates.
 *
 * TWO THINGS WERE WRONG HERE AND BOTH WERE INVISIBLE UNTIL THE QUERY RAN.
 *
 *  1. `.order('label')` named a column that does not exist. The migration
 *     declares `name`; PostgREST answered `42703 column
 *     workflow_definitions.label does not exist`, so the list was empty in
 *     every environment, for every tenant.
 *  2. `.eq('tenant_id', tenantId)` excluded every `tenant_id IS NULL` row —
 *     which is precisely the set of platform templates, the only rows
 *     "Duplicate to my tenant" can act on. The feature had nothing to show.
 *
 * `.or()` rather than two round trips: the SELECT policy already admits both
 * branches (`tenant_id IS NULL OR tenant_id IN (SELECT auth_tenant_id())`), so
 * one request returns exactly what the caller is allowed to see and no more.
 *
 * With no tenant — a developer who has not chosen one — the templates alone are
 * still the right answer, not an empty list: they are readable by every
 * authenticated user and they are what such a session is usually there to edit.
 */
export async function listWorkflowDefinitions(
  client: LooseSupabaseClient,
  tenantId: string | null,
): Promise<WorkflowDefinitionRow[]> {
  const base: LooseQuery = client
    .from(DEFINITIONS)
    .select('*')
    .order('name', { ascending: true });
  const q: LooseQuery = tenantId
    ? base.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    : base.is('tenant_id', null);
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<WorkflowDefinitionRow[]>(res) ?? [];
}

export async function getWorkflowDefinition(
  client: LooseSupabaseClient,
  definitionId: string,
): Promise<WorkflowDefinitionRow | null> {
  const res = await client
    .from(DEFINITIONS)
    .select('*')
    .eq('id', definitionId)
    .maybeSingle();
  return assertNoError<WorkflowDefinitionRow | null>(res);
}

/**
 * The insertable shape, spelled out rather than derived by `Omit`.
 *
 * `Omit<Row, …>` looked tidy and was wrong in both directions: it REQUIRED
 * `created_by` (which the database fills or leaves null, and which a client has
 * no business asserting) and it silently allowed `label`, a column that does
 * not exist. `key` is NOT NULL with no default, so it is required here.
 */
export interface CreateWorkflowDefinitionArgs {
  tenantId: string | null;
  key: string;
  name: string;
  description?: string | null;
  appScope?: string;
  isSystem?: boolean;
}

export async function createWorkflowDefinition(
  client: LooseSupabaseClient,
  args: CreateWorkflowDefinitionArgs,
): Promise<WorkflowDefinitionRow> {
  const res = await client
    .from(DEFINITIONS)
    .insert({
      tenant_id: args.tenantId,
      key: args.key,
      name: args.name,
      description: args.description ?? null,
      app_scope: args.appScope ?? 'all',
      is_system: args.isSystem ?? false,
      current_published_version_id: null,
    })
    .select('*')
    .single();
  return assertNoError<WorkflowDefinitionRow>(res);
}

/**
 * `label` is gone from the update set because the column never existed: a
 * rename SET a column PostgREST refused, so renaming a workflow failed with a
 * 42703 every time. `name` is the display name and `key` is deliberately NOT
 * updatable here — an automation trigger names the key, so changing it would
 * silently detach every trigger pointed at this workflow.
 */
export async function updateWorkflowDefinition(
  client: LooseSupabaseClient,
  definitionId: string,
  updates: Partial<Pick<WorkflowDefinitionRow, 'description' | 'name'>>,
): Promise<WorkflowDefinitionRow> {
  const res = await client
    .from(DEFINITIONS)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', definitionId)
    .select('*')
    .single();
  return assertNoError<WorkflowDefinitionRow>(res);
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export async function listWorkflowVersions(
  client: LooseSupabaseClient,
  definitionId: string,
): Promise<WorkflowDefinitionVersionRow[]> {
  const q: LooseQuery = client
    .from(VERSIONS)
    .select('*')
    .eq('workflow_definition_id', definitionId)
    .order('version', { ascending: false });
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<WorkflowDefinitionVersionRow[]>(res).map(hydrateVersion);
}

export async function getWorkflowVersion(
  client: LooseSupabaseClient,
  versionId: string,
): Promise<WorkflowDefinitionVersionRow | null> {
  const res = await client.from(VERSIONS).select('*').eq('id', versionId).maybeSingle();
  const row = assertNoError<WorkflowDefinitionVersionRow | null>(res);
  return row ? hydrateVersion(row) : null;
}

/**
 * The version the editor edits: the newest `draft` for this definition.
 *
 * Returns null rather than creating one. Creating a row as a side effect of a
 * READ would write to the database on every page load of a published-only
 * workflow, and the caller — which knows whether the user actually asked to
 * edit — is the right place for that decision.
 */
export async function getDraftVersion(
  client: LooseSupabaseClient,
  definitionId: string,
): Promise<WorkflowDefinitionVersionRow | null> {
  const q: LooseQuery = client
    .from(VERSIONS)
    .select('*')
    .eq('workflow_definition_id', definitionId)
    .eq('status', 'draft')
    .order('version', { ascending: false })
    .limit(1);
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  const rows = assertNoError<WorkflowDefinitionVersionRow[]>(res);
  return rows.length > 0 && rows[0] ? hydrateVersion(rows[0]) : null;
}

/**
 * The graph a consumer should render — read THROUGH the published pointer.
 *
 * Deliberately not "the highest version number": that would serve a
 * half-finished draft to every reader the moment someone opened the editor.
 * The pointer is what makes publishing an atomic, reversible act.
 */
export async function getPublishedGraph(
  client: LooseSupabaseClient,
  definitionId: string,
): Promise<WorkflowGraph | null> {
  const definition = await getWorkflowDefinition(client, definitionId);
  if (!definition?.current_published_version_id) return null;
  const version = await getWorkflowVersion(
    client,
    definition.current_published_version_id,
  );
  return version?.graph ?? null;
}

export interface CreateDraftVersionArgs {
  definitionId: string;
  tenantId: string;
  graph: WorkflowGraph;
  aiContext?: Record<string, unknown> | null;
  /**
   * Explicit version number. When omitted the next one is derived from the
   * current maximum — see the race note in `createDraftVersion`.
   */
  version?: number;
}

/**
 * Open a new draft.
 *
 * THE VERSION NUMBER IS A RACE, AND IT IS HANDLED RATHER THAN IGNORED. Reading
 * `max(version)` and inserting `max + 1` is a read-modify-write: two editors
 * opening a draft in the same second both read 3 and both insert 4. The
 * migration declares `unique (workflow_definition_id, version)`, so the loser
 * gets a 23505 instead of a duplicate — and this retries against the new
 * maximum rather than surfacing a constraint error the user cannot act on.
 * Bounded at three attempts: past that it is contention worth reporting, not
 * worth spinning on.
 */
export async function createDraftVersion(
  client: LooseSupabaseClient,
  args: CreateDraftVersionArgs,
): Promise<WorkflowDefinitionVersionRow> {
  const payloadBase = {
    workflow_definition_id: args.definitionId,
    tenant_id: args.tenantId,
    status: 'draft' as const,
    graph: serialiseGraph(args.graph),
    // `workflow_definition_versions.ai_context` is `NOT NULL DEFAULT
    // '{}'::jsonb`. A column default only fires when the insert OMITS the
    // key; an explicit `null` in the payload overrides it and violates the
    // constraint instead of falling through to it (bsuite-3205). Every
    // caller that supplies nothing must produce `{}`, never a literal null.
    ai_context: args.aiContext ?? {},
  };

  let attempt = 0;
  let nextVersion = args.version;
  let lastError: unknown;

  while (attempt < 3) {
    if (nextVersion === undefined) {
      nextVersion = (await getMaxVersion(client, args.definitionId)) + 1;
    }
    const res = await client
      .from(VERSIONS)
      .insert({ ...payloadBase, version: nextVersion })
      .select('*')
      .single();
    if (!res.error) return hydrateVersion(res.data as WorkflowDefinitionVersionRow);
    lastError = res.error;
    if (errorCode(res.error) !== UNIQUE_VIOLATION) break;
    // Somebody else took this number. Re-read and try the next one.
    nextVersion = undefined;
    attempt += 1;
  }

  return assertNoError<WorkflowDefinitionVersionRow>({ data: null, error: lastError });
}

async function getMaxVersion(
  client: LooseSupabaseClient,
  definitionId: string,
): Promise<number> {
  const q: LooseQuery = client
    .from(VERSIONS)
    .select('version')
    .eq('workflow_definition_id', definitionId)
    .order('version', { ascending: false })
    .limit(1);
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  const rows = assertNoError<{ version: number }[]>(res);
  return rows.length > 0 && rows[0] ? rows[0].version : 0;
}

/**
 * Persist the canvas into a DRAFT version's `graph` column.
 *
 * `.eq('status', 'draft')` is a guard, not decoration: a published version is
 * an immutable record of what was in force, and an editor left open across a
 * publish must not silently rewrite it. The update then matches no row and
 * `single()` errors, which is the correct outcome — the caller reloads.
 */
export async function saveVersionGraph(
  client: LooseSupabaseClient,
  versionId: string,
  graph: WorkflowGraph,
): Promise<WorkflowDefinitionVersionRow> {
  const res = await client
    .from(VERSIONS)
    .update({ graph: serialiseGraph(graph), updated_at: new Date().toISOString() })
    .eq('id', versionId)
    .eq('status', 'draft')
    .select('*')
    .single();
  return hydrateVersion(assertNoError<WorkflowDefinitionVersionRow>(res));
}

export async function updateVersionAiContext(
  client: LooseSupabaseClient,
  versionId: string,
  aiContext: Record<string, unknown> | null,
): Promise<WorkflowDefinitionVersionRow> {
  const res = await client
    .from(VERSIONS)
    .update({ ai_context: aiContext, updated_at: new Date().toISOString() })
    .eq('id', versionId)
    .select('*')
    .single();
  return hydrateVersion(assertNoError<WorkflowDefinitionVersionRow>(res));
}

/**
 * Publish a draft: flip its status, then move the definition's pointer.
 *
 * THE ORDER IS CHOSEN, NOT INCIDENTAL. Two tables are written and this package
 * cannot create the RPC that would make it one statement (migrations are Lane
 * 1's; Phase 2 should move this into `publish_workflow_version()`). Of the two
 * possible orders, only this one fails safe:
 *
 *   status first, then pointer  — a crash between them leaves a published row
 *                                 that nothing points at. Every reader goes
 *                                 through the pointer, so nobody sees it and
 *                                 re-running publish fixes it.
 *   pointer first, then status  — a crash between them points production at a
 *                                 row still marked draft, which the editor may
 *                                 then keep writing to. Live traffic reading a
 *                                 graph someone is mid-edit on.
 */
export async function publishVersion(
  client: LooseSupabaseClient,
  definitionId: string,
  versionId: string,
): Promise<WorkflowDefinitionRow> {
  const now = new Date().toISOString();

  const versionRes = await client
    .from(VERSIONS)
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', versionId)
    .eq('workflow_definition_id', definitionId)
    .select('id')
    .single();
  assertNoError<{ id: string }>(versionRes);

  const defRes = await client
    .from(DEFINITIONS)
    .update({ current_published_version_id: versionId, updated_at: now })
    .eq('id', definitionId)
    .select('*')
    .single();
  return assertNoError<WorkflowDefinitionRow>(defRes);
}

/**
 * Copy a workflow — normally a platform template — into a tenant, as a DRAFT.
 *
 * IT LANDS AS A DRAFT AND THAT IS THE SAFETY PROPERTY, not an omission. The new
 * definition's `current_published_version_id` stays NULL, so no runtime and no
 * consumer can pick the copy up until a person deliberately publishes it. A
 * duplicate that arrived published would put an unreviewed process into force
 * on somebody else's tenant with one click.
 *
 * THE SOURCE GRAPH IS READ THROUGH THE PUBLISHED POINTER, never as "the newest
 * version". Copying the newest would copy whoever happens to have a draft open
 * on the template — the exact half-finished state the pointer exists to hide.
 *
 * THE KEY COLLIDES ON THE SECOND COPY. `(tenant_id, key)` is unique, so
 * duplicating the same template twice into one tenant raises 23505. Surfacing
 * that to the user is surfacing a constraint name they cannot act on, so the
 * suffix is bumped and the insert retried. Bounded at five: past that it is a
 * naming problem, not contention, and it should be reported rather than spun on.
 *
 * THE DEFINITION INSERT IS CLEANED UP IF THE DRAFT INSERT FAILS. Both are
 * ordinary supabase-js REST calls — no RPC, no cross-table transaction — so a
 * failure between them used to leave a permanently orphaned definition row
 * with zero versions. See the try/catch below for the compensating delete.
 */
export interface DuplicateWorkflowDefinitionArgs {
  sourceDefinitionId: string;
  /** The tenant receiving the copy. Never null — a copy must be owned. */
  tenantId: string;
  /** Overrides the copied name; the key is derived from the source either way. */
  name?: string;
}

export async function duplicateWorkflowDefinition(
  client: LooseSupabaseClient,
  args: DuplicateWorkflowDefinitionArgs,
): Promise<{ definition: WorkflowDefinitionRow; draft: WorkflowDefinitionVersionRow }> {
  const source = await getWorkflowDefinition(client, args.sourceDefinitionId);
  if (!source) throw new WorkflowSourceMissingError(args.sourceDefinitionId);

  const sourceVersion = source.current_published_version_id
    ? await getWorkflowVersion(client, source.current_published_version_id)
    : null;
  const graph = sourceVersion?.graph ?? emptyWorkflowGraph();

  let definition: WorkflowDefinitionRow | null = null;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5 && !definition; attempt += 1) {
    const key = attempt === 1 ? source.key : `${source.key}-${attempt}`;
    const name =
      attempt === 1
        ? (args.name ?? source.name)
        : `${args.name ?? source.name} (${attempt})`;
    const res = await client
      .from(DEFINITIONS)
      .insert({
        tenant_id: args.tenantId,
        key,
        name,
        description: source.description,
        app_scope: source.app_scope,
        // The copy is the tenant's own, never a platform-maintained one.
        is_system: false,
        current_published_version_id: null,
      })
      .select('*')
      .single();
    if (!res.error) {
      definition = res.data as WorkflowDefinitionRow;
      break;
    }
    lastError = res.error;
    if (errorCode(res.error) !== UNIQUE_VIOLATION) break;
  }
  if (!definition) {
    return assertNoError<never>({ data: null, error: lastError });
  }

  // ATOMIC FROM THE CALLER'S POINT OF VIEW, THOUGH NOT FROM POSTGRES'S. There
  // is no cross-table transaction available to a client-side caller — this
  // is two separate supabase-js REST calls, not an RPC — so a failed draft
  // insert below must not leave the definition row just created above behind
  // as an orphan nobody asked for and nothing points back to. The
  // compensating delete is best-effort and wrapped on its own: a refused
  // delete (RLS, network) is folded into the thrown error rather than
  // silently replacing it, so the caller always learns why the draft insert
  // failed, and — when cleanup also failed — which definition id was left
  // behind to find and remove by hand.
  try {
    const draft = await createDraftVersion(client, {
      definitionId: definition.id,
      tenantId: args.tenantId,
      graph,
      // The rationale notes travel with the graph. A copied process without
      // the reasons behind its branches is a shape nobody can maintain.
      // `?? {}`, never `?? null` — see the NOT NULL note in
      // `createDraftVersion` (bsuite-3205); explicit here too so the intent
      // reads without having to trace into the callee.
      aiContext: sourceVersion?.ai_context ?? {},
      version: 1,
    });
    return { definition, draft };
  } catch (err) {
    const orphanId = definition.id;
    let cleanupMessage: string | null = null;
    try {
      const delRes = await client.from(DEFINITIONS).delete().eq('id', orphanId);
      if (delRes?.error) cleanupMessage = describeError(delRes.error);
    } catch (cleanupErr) {
      cleanupMessage = describeError(cleanupErr);
    }
    if (cleanupMessage) {
      // `{ cause }` as a constructor argument needs an ES2022 lib target;
      // this package builds at ES2020, so the cause is attached as a plain
      // property instead — Node has honoured `Error.prototype.cause` this
      // way since 16.9, independent of the caller's TS `target`.
      const wrapped = new Error(
        `duplicateWorkflowDefinition: draft insert failed (${describeError(err)}); cleanup failed (${cleanupMessage}); orphan definition ${orphanId} left`,
      ) as Error & { cause?: unknown };
      wrapped.cause = err;
      throw wrapped;
    }
    throw err;
  }
}

export async function deleteWorkflowVersion(
  client: LooseSupabaseClient,
  versionId: string,
): Promise<void> {
  const res = await (client
    .from(VERSIONS)
    .delete()
    .eq('id', versionId)
    .eq('status', 'draft') as unknown as Promise<{ data: unknown; error: unknown }>);
  assertNoError<unknown>(res);
}
