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
 * THIS PACKAGE DOES NOT OWN THE TABLES. Migration
 * `20261102000000_workflow_definitions.sql` creates them, with RLS copied
 * verbatim from `public.form_layouts` (four separate policies, never `FOR ALL`).
 * If a column name here disagrees with that file, the migration is right.
 */

import { deserialiseGraph, serialiseGraph } from './schemas.js';
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

function assertNoError<T>(res: { data: unknown; error: unknown }): T {
  if (res.error) {
    throw res.error instanceof Error
      ? res.error
      : new Error(
          typeof res.error === 'object' &&
          res.error !== null &&
          'message' in res.error
            ? String((res.error as { message: unknown }).message)
            : String(res.error),
        );
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

export async function listWorkflowDefinitions(
  client: LooseSupabaseClient,
  tenantId: string | null,
): Promise<WorkflowDefinitionRow[]> {
  if (!tenantId) return [];
  const q: LooseQuery = client
    .from(DEFINITIONS)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('label', { ascending: true });
  const res = await (q as unknown as Promise<{ data: unknown; error: unknown }>);
  return assertNoError<WorkflowDefinitionRow[]>(res);
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

export async function createWorkflowDefinition(
  client: LooseSupabaseClient,
  definition: Omit<
    WorkflowDefinitionRow,
    'id' | 'created_at' | 'updated_at' | 'current_published_version_id'
  >,
): Promise<WorkflowDefinitionRow> {
  const res = await client
    .from(DEFINITIONS)
    .insert({ ...definition, current_published_version_id: null })
    .select('*')
    .single();
  return assertNoError<WorkflowDefinitionRow>(res);
}

export async function updateWorkflowDefinition(
  client: LooseSupabaseClient,
  definitionId: string,
  updates: Partial<Pick<WorkflowDefinitionRow, 'label' | 'description' | 'name'>>,
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
    ai_context: args.aiContext ?? null,
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
