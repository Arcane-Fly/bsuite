/**
 * Failure paths the 152-test suite never executed:
 *
 *  1. Palette add then same-tick select used the pre-add node list and
 *     replaceGraph dropped the new node.
 *  2. An older in-flight save's onSuccess/onError overwrote a newer
 *     scheduleSave cache write.
 *  3. A late def1 save wrote lastSaved after the same hook instance switched
 *     to def2, so a later def2 failure restored def1's graph into def2 caches.
 *  4. Unmount flushed the pending graph off the serial chain, so B started
 *     concurrent with in-flight A.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useWorkflowController } from '../hooks/useWorkflowController.js';
import type { WorkflowDefinitionVersionRow, WorkflowGraph } from '../types.js';

const DEFINITION_ID = 'def-1';
const DEFINITION_ID_B = 'def-2';
const DRAFT_ID = 'ver-draft';
const DRAFT_ID_B = 'ver-draft-b';
const TENANT_ID = 'tenant-1';

const SEED_GRAPH: WorkflowGraph = {
  nodes: [{ id: 'start', type: 'terminator', position: { x: 0, y: 0 }, data: { label: 'START' } }],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const SEED_GRAPH_B: WorkflowGraph = {
  nodes: [
    { id: 'start-b', type: 'terminator', position: { x: 0, y: 0 }, data: { label: 'START B' } },
  ],
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

const DRAFT_ROW_B: WorkflowDefinitionVersionRow = {
  ...DRAFT_ROW,
  id: DRAFT_ID_B,
  workflow_definition_id: DEFINITION_ID_B,
  graph: SEED_GRAPH_B,
};

type InflightSave = {
  graph: unknown;
  succeed: () => void;
  fail: (message: string) => void;
};

function makeEditableClient(drafts: WorkflowDefinitionVersionRow[] = [DRAFT_ROW]) {
  const inflight: InflightSave[] = [];
  const persisted: unknown[] = [];
  const latestByVersion = new Map<string, unknown>(drafts.map((row) => [row.id, row.graph]));
  const committedByVersion = new Map<string, unknown>();

  function rowWithCommitted(row: WorkflowDefinitionVersionRow): WorkflowDefinitionVersionRow {
    const graph = committedByVersion.get(row.id);
    return graph !== undefined ? { ...row, graph: graph as WorkflowGraph } : row;
  }

  function draftsMatching(filters: Record<string, unknown>): WorkflowDefinitionVersionRow[] {
    return drafts
      .filter((row) => {
        if (
          filters.workflow_definition_id !== undefined &&
          row.workflow_definition_id !== filters.workflow_definition_id
        ) {
          return false;
        }
        if (filters.status !== undefined && row.status !== filters.status) return false;
        if (filters.id !== undefined && row.id !== filters.id) return false;
        return true;
      })
      .map(rowWithCommitted);
  }

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
                return Promise.resolve({ data: draftsMatching(filters), error: null });
              }
              return Promise.resolve({ data: [], error: null });
            },
            maybeSingle() {
              if (table === 'workflow_definitions' && typeof filters.id === 'string') {
                const draft = drafts.find((row) => row.workflow_definition_id === filters.id);
                if (draft) {
                  return Promise.resolve({
                    data: {
                      id: draft.workflow_definition_id,
                      tenant_id: TENANT_ID,
                      key: draft.workflow_definition_id,
                      name: draft.workflow_definition_id,
                      app_scope: 'all',
                      is_system: false,
                      current_published_version_id: null,
                    },
                    error: null,
                  });
                }
              }
              return Promise.resolve({ data: null, error: null });
            },
            then(
              onF: (value: unknown) => unknown,
              onR?: (reason: unknown) => unknown,
            ) {
              const rows =
                table === 'workflow_definition_versions' ? draftsMatching(filters) : [];
              return Promise.resolve({ data: rows, error: null }).then(onF, onR);
            },
          };
          return chain;
        },
        update(payload: { graph?: unknown }) {
          const eqFilters: Record<string, unknown> = {};
          const eqChain = {
            eq(column: string, value: unknown) {
              eqFilters[column] = value;
              return eqChain;
            },
            select() {
              return {
                single() {
                  return new Promise<{ data: unknown; error: unknown }>((resolve) => {
                    const versionId = String(eqFilters.id ?? '');
                    if (payload.graph !== undefined) latestByVersion.set(versionId, payload.graph);
                    const graph = latestByVersion.get(versionId);
                    const draft = drafts.find((row) => row.id === versionId) ?? drafts[0]!;
                    inflight.push({
                      graph,
                      succeed() {
                        persisted.push(graph);
                        committedByVersion.set(
                          versionId,
                          JSON.parse(JSON.stringify(graph)) as WorkflowGraph,
                        );
                        resolve({
                          data: { ...draft, graph },
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

async function seedController(
  qc: QueryClient,
  client: ReturnType<typeof makeEditableClient>,
  definitionId: string = DEFINITION_ID,
) {
  const hook = renderHook(
    (props: { definitionId: string }) =>
      useWorkflowController({
        supabase: client as never,
        tenantId: TENANT_ID,
        definitionId: props.definitionId,
        realtime: false,
        saveDebounceMs: 60_000,
      }),
    { wrapper: wrapperFor(qc), initialProps: { definitionId } },
  );
  const expectedStart = definitionId === DEFINITION_ID_B ? 'start-b' : 'start';
  await waitFor(() => {
    expect(hook.result.current.nodes.map((n) => n.id)).toContain(expectedStart);
  });
  return hook;
}

function draftGraph(qc: QueryClient, definitionId = DEFINITION_ID): WorkflowGraph | undefined {
  return qc.getQueryData<WorkflowDefinitionVersionRow>(['workflow-draft', definitionId])?.graph;
}

function versionsDraftGraph(
  qc: QueryClient,
  definitionId = DEFINITION_ID,
): WorkflowGraph | undefined {
  return qc
    .getQueryData<WorkflowDefinitionVersionRow[]>(['workflow-versions', definitionId])
    ?.find((row) => row.status === 'draft')?.graph;
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

  it('rolls B fail back to A after late A success, not to the pre-A snapshot', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient();
    const { result } = await seedController(qc, client);

    act(() => {
      result.current.addNode('step', { x: 10, y: 10 });
    });
    const idsA = result.current.nodes.map((n) => n.id);
    const saveA = result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(1));

    act(() => {
      result.current.addNode('handoff', { x: 80, y: 10 });
    });
    const idsB = result.current.nodes.map((n) => n.id);
    expect(idsB).toHaveLength(3);

    act(() => {
      client.inflight[0]!.succeed();
    });
    await saveA;

    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsB);
    expect((client.inflight[0]!.graph as WorkflowGraph).nodes.map((n) => n.id)).toEqual(
      idsA,
    );

    const saveB = result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(2));
    expect((client.inflight[1]!.graph as WorkflowGraph).nodes.map((n) => n.id)).toEqual(
      idsB,
    );

    act(() => {
      client.inflight[1]!.fail('write conflict');
    });
    await saveB;

    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsA);
    expect(versionsDraftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsA);
    expect(client.persisted).toHaveLength(1);
    expect((client.persisted[0] as WorkflowGraph).nodes.map((n) => n.id)).toEqual(idsA);
  });
});

describe('definition switch must not let a late def1 save contaminate def2', () => {
  it('keeps def2 caches on def2 after late A success then a def2 save fails', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient([DRAFT_ROW, DRAFT_ROW_B]);
    const hook = await seedController(qc, client, DEFINITION_ID);

    act(() => {
      hook.result.current.addNode('step', { x: 10, y: 10 });
    });
    const def1Ids = hook.result.current.nodes.map((n) => n.id);
    expect(def1Ids).toHaveLength(2);
    const saveA = hook.result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(1));

    act(() => {
      hook.rerender({ definitionId: DEFINITION_ID_B });
    });
    await waitFor(() => {
      expect(hook.result.current.nodes.map((n) => n.id)).toContain('start-b');
    });
    expect(hook.result.current.nodes.map((n) => n.id)).toEqual(['start-b']);

    act(() => {
      client.inflight[0]!.succeed();
    });
    await saveA;

    expect(draftGraph(qc, DEFINITION_ID_B)?.nodes.map((n) => n.id)).toEqual(['start-b']);
    expect(versionsDraftGraph(qc, DEFINITION_ID_B)?.nodes.map((n) => n.id)).toEqual(['start-b']);

    act(() => {
      hook.result.current.addNode('handoff', { x: 40, y: 40 });
    });
    const def2Edited = hook.result.current.nodes.map((n) => n.id);
    expect(def2Edited).toHaveLength(2);
    expect(def2Edited).toContain('start-b');
    expect(def2Edited).not.toEqual(def1Ids);

    const saveB = hook.result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(2));
    act(() => {
      client.inflight[1]!.fail('write conflict');
    });
    await saveB;

    expect(draftGraph(qc, DEFINITION_ID_B)?.nodes.map((n) => n.id)).toEqual(['start-b']);
    expect(versionsDraftGraph(qc, DEFINITION_ID_B)?.nodes.map((n) => n.id)).toEqual(['start-b']);
    expect(draftGraph(qc, DEFINITION_ID_B)?.nodes.map((n) => n.id)).not.toEqual(def1Ids);
  });
});

describe('unmount flush stays on the serial save chain', () => {
  it('does not start pending B until in-flight A finishes, and persists B last', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient();
    const { result, unmount } = await seedController(qc, client);

    act(() => {
      result.current.addNode('step', { x: 10, y: 10 });
    });
    void result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(1));
    const graphA = client.inflight[0]!.graph;

    act(() => {
      result.current.addNode('handoff', { x: 80, y: 10 });
    });
    const idsB = result.current.nodes.map((n) => n.id);
    expect(idsB).toHaveLength(3);
    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsB);

    act(() => {
      unmount();
    });
    expect(client.inflight.length).toBe(1);

    act(() => {
      client.inflight[0]!.succeed();
    });
    await waitFor(() => expect(client.inflight.length).toBe(2));

    act(() => {
      client.inflight[1]!.succeed();
    });
    await waitFor(() => expect(client.persisted).toHaveLength(2));

    expect((client.persisted[0] as WorkflowGraph).nodes.map((n) => n.id)).toEqual(
      (graphA as WorkflowGraph).nodes.map((n) => n.id),
    );
    expect((client.persisted[1] as WorkflowGraph).nodes.map((n) => n.id)).toEqual(idsB);
    expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsB);
    expect(versionsDraftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsB);
  });

  it('rolls an unmounted B failure back to A after A has already succeeded', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const client = makeEditableClient();
    const { result, unmount } = await seedController(qc, client);

    act(() => {
      result.current.addNode('step', { x: 10, y: 10 });
    });
    const idsA = result.current.nodes.map((n) => n.id);
    void result.current.saveNow();
    await waitFor(() => expect(client.inflight.length).toBe(1));

    act(() => {
      result.current.addNode('handoff', { x: 80, y: 10 });
    });
    const idsB = result.current.nodes.map((n) => n.id);

    act(() => {
      unmount();
    });
    expect(client.inflight.length).toBe(1);

    act(() => {
      client.inflight[0]!.succeed();
    });
    await waitFor(() => expect(client.inflight.length).toBe(2));

    act(() => {
      client.inflight[1]!.fail('write conflict');
    });
    await waitFor(() => expect(draftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsA));

    expect(versionsDraftGraph(qc)?.nodes.map((n) => n.id)).toEqual(idsA);
    expect(client.persisted).toHaveLength(1);
    expect((client.persisted[0] as WorkflowGraph).nodes.map((n) => n.id)).toEqual(idsA);
    expect(idsB).not.toEqual(idsA);
  });
});
