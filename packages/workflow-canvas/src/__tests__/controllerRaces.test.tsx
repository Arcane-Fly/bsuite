/**
 * Failure paths the 152-test suite never executed:
 *
 *  1. Palette add then same-tick select used the pre-add node list and
 *     replaceGraph dropped the new node.
 *  2. An older in-flight save's onSuccess/onError overwrote a newer
 *     scheduleSave cache write.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useWorkflowController } from '../hooks/useWorkflowController.js';
import type { WorkflowDefinitionVersionRow, WorkflowGraph } from '../types.js';

const DEFINITION_ID = 'def-1';
const DRAFT_ID = 'ver-draft';
const TENANT_ID = 'tenant-1';

const SEED_GRAPH: WorkflowGraph = {
  nodes: [{ id: 'start', type: 'terminator', position: { x: 0, y: 0 }, data: { label: 'START' } }],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const DRAFT_ROW: WorkflowDefinitionVersionRow = {
  id: DRAFT_ID,
  workflow_definition_id: DEFINITION_ID,
  tenant_id: TENANT_ID,
  version: 1,
  status: 'draft',
  graph: SEED_GRAPH,
  trigger_config: null,
  ai_context: null,
  created_by: null,
  published_by: null,
  created_at: null,
  updated_at: null,
  published_at: null,
};

type InflightSave = {
  graph: unknown;
  succeed: () => void;
  fail: (message: string) => void;
};

function makeEditableClient() {
  const inflight: InflightSave[] = [];
  const persisted: unknown[] = [];
  let latestGraph: unknown = SEED_GRAPH;

  const client = {
    inflight,
    persisted,
    from(table: string) {
      return {
        select() {
          const filters: Record<string, unknown> = {};
          const chain: Record<string, unknown> = {
            eq(column: string, value: unknown) {
              filters[column] = value;
              return chain;
            },
            order() {
              return chain;
            },
            limit() {
              if (table === 'workflow_definition_versions' && filters.status === 'draft') {
                return Promise.resolve({ data: [DRAFT_ROW], error: null });
              }
              return Promise.resolve({ data: [], error: null });
            },
            maybeSingle() {
              if (table === 'workflow_definitions' && filters.id === DEFINITION_ID) {
                return Promise.resolve({
                  data: {
                    id: DEFINITION_ID,
                    tenant_id: TENANT_ID,
                    key: 'inbound',
                    name: 'Inbound',
                    app_scope: 'all',
                    is_system: false,
                    current_published_version_id: null,
                  },
                  error: null,
                });
              }
              return Promise.resolve({ data: null, error: null });
            },
            then(
              onF: (value: unknown) => unknown,
              onR?: (reason: unknown) => unknown,
            ) {
              const rows =
                table === 'workflow_definition_versions' ? [DRAFT_ROW] : [];
              return Promise.resolve({ data: rows, error: null }).then(onF, onR);
            },
          };
          return chain;
        },
        update(payload: { graph?: unknown }) {
          if (payload.graph !== undefined) latestGraph = payload.graph;
          const eqChain = {
            eq() {
              return eqChain;
            },
            select() {
              return {
                single() {
                  return new Promise<{ data: unknown; error: unknown }>((resolve) => {
                    const graph = latestGraph;
                    inflight.push({
                      graph,
                      succeed() {
                        persisted.push(graph);
                        resolve({
                          data: { ...DRAFT_ROW, graph },
                          error: null,
                        });
                      },
                      fail(message: string) {
                        resolve({ data: null, error: { message } });
                      },
                    });
                  });
                },
              };
            },
          };
          return eqChain;
        },
        insert() {
          return { select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
        },
      };
    },
  };
  return client;
}

function wrapperFor(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

async function seedController(qc: QueryClient, client: ReturnType<typeof makeEditableClient>) {
  const hook = renderHook(
    () =>
      useWorkflowController({
        supabase: client as never,
        tenantId: TENANT_ID,
        definitionId: DEFINITION_ID,
        realtime: false,
        saveDebounceMs: 60_000,
      }),
    { wrapper: wrapperFor(qc) },
  );
  await waitFor(() => {
    expect(hook.result.current.nodes.map((n) => n.id)).toContain('start');
  });
  return hook;
}

describe('add then same-tick select (palette path)', () => {
  it('keeps the new node and selects it when onNodeAdded maps the pre-add node list', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient();
    const { result } = await seedController(qc, client);

    let addedId = '';
    act(() => {
      const staleNodes = result.current.nodes;
      const node = result.current.addNode('step', { x: 40, y: 40 });
      addedId = node.id;
      result.current.onNodesChange(
        staleNodes.map((n) => ({
          type: 'select' as const,
          id: n.id,
          selected: n.id === node.id,
        })),
      );
    });

    expect(result.current.nodes.map((n) => n.id)).toContain(addedId);
    expect(result.current.nodes.find((n) => n.id === addedId)?.selected).toBe(true);
    expect(result.current.nodes.find((n) => n.id === 'start')?.selected).toBeFalsy();
  });

  it('deselects so the inspector can collapse, and delete removes the added node', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient();
    const { result } = await seedController(qc, client);

    let addedId = '';
    act(() => {
      addedId = result.current.addNode('step', { x: 40, y: 40 }).id;
    });
    expect(result.current.nodes.find((n) => n.id === addedId)?.selected).toBe(true);

    act(() => {
      result.current.onNodesChange(
        result.current.nodes.map((n) => ({
          type: 'select' as const,
          id: n.id,
          selected: false,
        })),
      );
    });
    expect(result.current.nodes.every((n) => !n.selected)).toBe(true);

    act(() => {
      result.current.deleteNode(addedId);
    });
    expect(result.current.nodes.map((n) => n.id)).not.toContain(addedId);
    expect(result.current.nodes.every((n) => !n.selected)).toBe(true);
  });
});

describe('overlapped saves must not clobber a newer optimistic graph', () => {
  const draftKey = ['workflow-draft', DEFINITION_ID] as const;
  const versionsKey = ['workflow-versions', DEFINITION_ID] as const;

  function draftGraph(qc: QueryClient): WorkflowGraph | undefined {
    return qc.getQueryData<WorkflowDefinitionVersionRow>(draftKey)?.graph;
  }
  function versionsDraftGraph(qc: QueryClient): WorkflowGraph | undefined {
    return qc
      .getQueryData<WorkflowDefinitionVersionRow[]>(versionsKey)
      ?.find((row) => row.status === 'draft')?.graph;
  }

  it('keeps B in both caches when in-flight A succeeds late', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient();
    const { result } = await seedController(qc, client);

    act(() => {
      result.current.addNode('step', { x: 10, y: 10 });
    });
    const saveA = result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(1));
    const graphA = client.inflight[0]!.graph;

    act(() => {
      result.current.addNode('handoff', { x: 80, y: 10 });
    });
    const liveIds = result.current.nodes.map((n) => n.id);
    expect(liveIds).toHaveLength(3);
    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(liveIds);
    expect(versionsDraftGraph(qc)?.nodes.map((n) => n.id)).toEqual(liveIds);

    act(() => {
      client.inflight[0]!.succeed();
    });
    await saveA;

    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(liveIds);
    expect(versionsDraftGraph(qc)?.nodes.map((n) => n.id)).toEqual(liveIds);
    expect(client.persisted).toHaveLength(1);
    expect((client.persisted[0] as WorkflowGraph).nodes.map((n) => n.id)).toEqual(
      (graphA as WorkflowGraph).nodes.map((n) => n.id),
    );
  });

  it('keeps B in both caches when in-flight A fails late, and does not persist A after B', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient();
    const { result } = await seedController(qc, client);

    act(() => {
      result.current.addNode('step', { x: 10, y: 10 });
    });
    const saveA = result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(1));

    act(() => {
      result.current.addNode('handoff', { x: 80, y: 10 });
    });
    const liveIds = result.current.nodes.map((n) => n.id);

    act(() => {
      client.inflight[0]!.fail('write conflict');
    });
    await saveA;

    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(liveIds);
    expect(versionsDraftGraph(qc)?.nodes.map((n) => n.id)).toEqual(liveIds);
    expect(client.persisted).toHaveLength(0);

    const saveB = result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(2));
    act(() => {
      client.inflight[1]!.succeed();
    });
    await saveB;

    expect(client.persisted).toHaveLength(1);
    expect((client.persisted[0] as WorkflowGraph).nodes.map((n) => n.id)).toEqual(liveIds);
    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(liveIds);
  });
});
