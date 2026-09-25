/**
 * A published workflow with no draft must not look editable.
 *
 * Measured on production: the controller seeded the published graph, reported
 * isReadOnly false, accepted local edits, then flush dropped them because
 * seededVersionRef was never set. setIsDirty(false) fired and the toolbar
 * said "All changes saved". The edit was gone.
 *
 * createDraft is the escape hatch: after it lands, needsDraft is false and
 * an add is saved to the new draft.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useWorkflowController } from '../hooks/useWorkflowController.js';
import type { WorkflowDefinitionVersionRow, WorkflowGraph } from '../types.js';

const DEFINITION_ID = 'def-owned';
const TENANT_ID = 'tenant-1';
const OTHER_TENANT_ID = 'tenant-other';
const PUBLISHED_ID = 'ver-published';

const PUBLISHED_GRAPH: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'terminator', position: { x: 0, y: 0 }, data: { label: 'START' } },
    { id: 'step', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Review' } },
  ],
  edges: [{ id: 'e1', source: 'start', target: 'step' }],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const PUBLISHED: WorkflowDefinitionVersionRow = {
  id: PUBLISHED_ID,
  workflow_definition_id: DEFINITION_ID,
  tenant_id: TENANT_ID,
  version: 1,
  status: 'published',
  graph: PUBLISHED_GRAPH,
  trigger_config: null,
  ai_context: null,
  created_by: null,
  published_by: null,
  created_at: null,
  updated_at: null,
  published_at: null,
};

function publishedOnlyClient(opts: { definitionTenantId: string | null }) {
  const drafts: WorkflowDefinitionVersionRow[] = [];
  const saved: WorkflowGraph[] = [];
  const published: WorkflowDefinitionVersionRow = {
    ...PUBLISHED,
    tenant_id: opts.definitionTenantId,
  };

  const client = {
    saved,
    drafts,
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const chain: Record<string, unknown> = {
        eq(column: string, value: unknown) {
          filters[column] = value;
          return chain;
        },
        order: () => chain,
        limit() {
          if (table === 'workflow_definition_versions' && filters.status === 'draft') {
            return Promise.resolve({ data: [...drafts], error: null });
          }
          if (table === 'workflow_definition_versions') {
            return Promise.resolve({ data: [{ version: published.version }], error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
        maybeSingle() {
          if (table === 'workflow_definitions') {
            return Promise.resolve({
              data: {
                id: DEFINITION_ID,
                tenant_id: opts.definitionTenantId,
                key: DEFINITION_ID,
                name: DEFINITION_ID,
                app_scope: 'all',
                is_system: false,
                current_published_version_id: PUBLISHED_ID,
              },
              error: null,
            });
          }
          if (table === 'workflow_definition_versions' && filters.id === PUBLISHED_ID) {
            return Promise.resolve({ data: published, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(onF: (value: unknown) => unknown, onR?: (reason: unknown) => unknown) {
          const rows =
            table === 'workflow_definition_versions'
              ? filters.status === 'draft'
                ? [...drafts]
                : [published, ...drafts]
              : [];
          return Promise.resolve({ data: rows, error: null }).then(onF, onR);
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
                const draft = drafts[drafts.length - 1];
                return Promise.resolve({
                  data: draft ? { ...draft, graph: payload.graph } : null,
                  error: draft ? null : { message: 'no draft to save' },
                });
              },
            }),
          };
          return eqChain;
        },
        insert(payload: Record<string, unknown>) {
          const row: WorkflowDefinitionVersionRow = {
            id: 'ver-draft',
            workflow_definition_id: String(payload.workflow_definition_id),
            tenant_id: (payload.tenant_id as string | null) ?? null,
            version: payload.version as number,
            status: 'draft',
            graph: (payload.graph as WorkflowGraph) ?? PUBLISHED_GRAPH,
            trigger_config: null,
            ai_context: (payload.ai_context as Record<string, unknown> | null) ?? {},
            created_by: null,
            published_by: null,
            created_at: null,
            updated_at: null,
            published_at: null,
          };
          drafts.push(row);
          return {
            select: () => ({
              single: () => Promise.resolve({ data: row, error: null }),
            }),
          };
        },
      };
    },
  };
  return client;
}

function mount(
  client: ReturnType<typeof publishedOnlyClient>,
  tenantId: string | null,
  saveDebounceMs = 0,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(
    () =>
      useWorkflowController({
        supabase: client as never,
        tenantId,
        definitionId: DEFINITION_ID,
        realtime: false,
        saveDebounceMs,
      }),
    { wrapper },
  );
}

async function waitUntilSeeded(result: { current: { isGraphReady: boolean; nodes: { id: string }[] } }) {
  await waitFor(() => expect(result.current.isGraphReady).toBe(true));
  await waitFor(() => expect(result.current.nodes.map((n) => n.id)).toContain('step'));
}

describe('needsDraft — published workflow with no draft', () => {
  it('locks an owned published-only definition: no local edit, no save, not dirty', async () => {
    const client = publishedOnlyClient({ definitionTenantId: TENANT_ID });
    const { result } = mount(client, TENANT_ID);
    await waitUntilSeeded(result);

    expect(result.current.needsDraft).toBe(true);
    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.isDirty).toBe(false);
    const idsBefore = result.current.nodes.map((n) => n.id).sort();
    const stepBefore = result.current.nodes.find((n) => n.id === 'step');
    const labelBefore = stepBefore?.data.label;

    let addMessage = '';
    try {
      act(() => {
        result.current.addNode('step', { x: 10, y: 10 });
      });
    } catch (err) {
      addMessage = err instanceof Error ? err.message : String(err);
    }
    expect(addMessage).toBe('This workflow is published. Create a draft to edit it.');

    act(() => {
      result.current.updateNodeData('step', { label: 'Silently lost' });
    });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.nodes.map((n) => n.id).sort()).toEqual(idsBefore);
    expect(result.current.nodes.find((n) => n.id === 'step')?.data.label).toBe(labelBefore);
    expect(client.saved).toEqual([]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.needsDraft).toBe(true);
  });

  it('does not ask for a draft on a platform template or another organisation’s workflow', async () => {
    const template = publishedOnlyClient({ definitionTenantId: null });
    const templateMount = mount(template, TENANT_ID);
    await waitUntilSeeded(templateMount.result);
    expect(templateMount.result.current.needsDraft).toBe(false);

    const foreign = publishedOnlyClient({ definitionTenantId: OTHER_TENANT_ID });
    const foreignMount = mount(foreign, TENANT_ID);
    await waitUntilSeeded(foreignMount.result);
    expect(foreignMount.result.current.needsDraft).toBe(false);
  });

  it('after createDraft, needsDraft is false and an add is saved to the draft', async () => {
    const client = publishedOnlyClient({ definitionTenantId: TENANT_ID });
    const { result } = mount(client, TENANT_ID);
    await waitUntilSeeded(result);
    expect(result.current.needsDraft).toBe(true);

    await act(async () => {
      await result.current.createDraft();
    });
    await waitFor(() => expect(result.current.needsDraft).toBe(false));
    expect(result.current.isReadOnly).toBe(false);
    expect(result.current.draft?.id).toBe('ver-draft');

    let added = '';
    act(() => {
      added = result.current.addNode('step', { x: 40, y: 40 }).id;
    });
    await act(async () => {
      await result.current.saveNow();
      await new Promise((r) => setTimeout(r, 20));
    });

    const last = client.saved[client.saved.length - 1];
    expect(last?.nodes.map((n) => n.id)).toContain(added);
    expect(last?.nodes.map((n) => n.id)).toContain('start');
    expect(result.current.needsDraft).toBe(false);
  });
});
