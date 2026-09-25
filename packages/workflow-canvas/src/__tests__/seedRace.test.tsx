/**
 * An edit made before the draft has loaded must never reach the server.
 *
 * Measured on production (crm7 /workflows/:id, 25 Sep 2026): reopening a saved
 * workflow and clicking a palette item as soon as the palette rendered turned a
 * 4-node, 1-edge draft into a 1-node, 0-edge draft. The draft read returned the
 * right graph; the palette simply accepted the click while the local graph was
 * still the empty placeholder, and the next save wrote "empty + one step" over
 * the saved work.
 *
 * The draft read below is held open so the edit lands in exactly that window.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useWorkflowController } from '../hooks/useWorkflowController.js';
import type { WorkflowDefinitionVersionRow, WorkflowGraph } from '../types.js';

const DEFINITION_ID = 'def-seed';
const TENANT_ID = 'tenant-1';

const SAVED: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'terminator', position: { x: 0, y: 0 }, data: { label: 'START' } },
    { id: 'end', type: 'terminator', position: { x: 0, y: 200 }, data: { label: 'END' } },
    { id: 'review', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Review' } },
  ],
  edges: [{ id: 'e1', source: 'start', target: 'end' }],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const DRAFT: WorkflowDefinitionVersionRow = {
  id: 'ver-draft',
  workflow_definition_id: DEFINITION_ID,
  tenant_id: TENANT_ID,
  version: 1,
  status: 'draft',
  graph: SAVED,
  trigger_config: null,
  ai_context: null,
  created_by: null,
  published_by: null,
  created_at: null,
  updated_at: null,
  published_at: null,
};

/** A client whose draft read resolves only when the test says so. */
function slowDraftClient() {
  let releaseDraft: () => void = () => {};
  const draftGate = new Promise<void>((resolve) => {
    releaseDraft = resolve;
  });
  const saved: WorkflowGraph[] = [];
  const client = {
    saved,
    releaseDraft: () => releaseDraft(),
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const rows = () =>
        table === 'workflow_definition_versions' &&
        (filters.status === undefined || filters.status === 'draft')
          ? [DRAFT]
          : [];
      const chain: Record<string, unknown> = {
        eq(column: string, value: unknown) {
          filters[column] = value;
          return chain;
        },
        order: () => chain,
        limit() {
          if (table === 'workflow_definition_versions' && filters.status === 'draft') {
            return draftGate.then(() => ({ data: rows(), error: null }));
          }
          return Promise.resolve({ data: [], error: null });
        },
        maybeSingle() {
          if (table === 'workflow_definitions') {
            return Promise.resolve({
              data: {
                id: DEFINITION_ID,
                tenant_id: TENANT_ID,
                key: DEFINITION_ID,
                name: DEFINITION_ID,
                app_scope: 'all',
                is_system: false,
                current_published_version_id: null,
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(onF: (value: unknown) => unknown, onR?: (reason: unknown) => unknown) {
          return draftGate.then(() => ({ data: rows(), error: null })).then(onF, onR);
        },
      };
      return {
        select: () => chain,
        update(payload: { graph?: WorkflowGraph }) {
          const eqChain = {
            eq: () => eqChain,
            select: () => ({
              single() {
                if (payload.graph) saved.push(payload.graph);
                return Promise.resolve({ data: { ...DRAFT, graph: payload.graph }, error: null });
              },
            }),
          };
          return eqChain;
        },
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        }),
      };
    },
  };
  return client;
}

function mount(client: ReturnType<typeof slowDraftClient>, saveDebounceMs = 0) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(
    () =>
      useWorkflowController({
        supabase: client as never,
        tenantId: TENANT_ID,
        definitionId: DEFINITION_ID,
        realtime: false,
        saveDebounceMs,
      }),
    { wrapper },
  );
}

describe('editing before the draft has loaded', () => {
  it('is locked while the draft loads, so the palette offers nothing to click', async () => {
    const client = slowDraftClient();
    const { result } = mount(client);
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.isReadOnly).toBe(true);

    act(() => client.releaseDraft());
    await waitFor(() => expect(result.current.nodes.map((n) => n.id)).toContain('start'));
    expect(result.current.isReadOnly).toBe(false);
  });

  it('THE BITE: an edit before load never reaches the server, even after the draft seeds', async () => {
    const client = slowDraftClient();
    const { result } = mount(client, 50);

    act(() => {
      // Refused now (it throws); before the fix it was added to the placeholder.
      try {
        result.current.addNode('step', { x: 10, y: 10 });
      } catch {
        /* expected once fixed */
      }
      // A user pan before load: before the fix this scheduled nodes=[].
      result.current.onViewportChange({ x: 5, y: 5, zoom: 1.2 });
    });

    // The draft lands inside the debounce window, then the timer would fire.
    act(() => client.releaseDraft());
    await waitFor(() => expect(result.current.nodes.map((n) => n.id)).toContain('start'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    // Nothing was edited after load, so nothing may have been written at all.
    expect(client.saved).toEqual([]);
    expect(result.current.nodes.map((n) => n.id).sort()).toEqual(['end', 'review', 'start']);
    expect(result.current.edges).toHaveLength(1);
  });

  it('refuses an add before load instead of returning a node it never added', async () => {
    const client = slowDraftClient();
    const { result } = mount(client);
    let refused = false;
    try {
      result.current.addNode('step', { x: 0, y: 0 });
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
    act(() => client.releaseDraft());
    await waitFor(() => expect(result.current.isGraphReady).toBe(true));
    // No phantom step arrived with the draft.
    expect(result.current.nodes.map((n) => n.id).sort()).toEqual(['end', 'review', 'start']);
  });

  it('once unlocked, an add is kept on top of the saved draft', async () => {
    const client = slowDraftClient();
    const { result } = mount(client);
    setTimeout(() => client.releaseDraft(), 30);
    // Today isReadOnly is false before anything loads, so an add here would land
    // on the empty placeholder and vanish when the draft seeds. Unlocked must
    // mean seeded.
    await waitFor(() => expect(result.current.isReadOnly).toBe(false));
    expect(result.current.nodes.map((n) => n.id)).toContain('start');

    let added = '';
    act(() => {
      added = result.current.addNode('step', { x: 10, y: 10 }).id;
    });
    await act(async () => {
      await result.current.saveNow();
      await new Promise((r) => setTimeout(r, 20));
    });

    const last = client.saved[client.saved.length - 1];
    expect(last?.nodes.map((n) => n.id).sort()).toEqual(['end', added, 'review', 'start'].sort());
    expect(last?.edges).toHaveLength(1);
  });
});
