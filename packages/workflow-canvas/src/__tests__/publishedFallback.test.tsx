/**
 * A DEFINITION WITH NO DRAFT MUST STILL SHOW ITS PUBLISHED GRAPH.
 *
 * Measured on production 2026-09-02, after crm7 adopted this package: the canvas
 * mounted (`.react-flow` present), threw nothing, showed no loading fallback and
 * no error — and rendered 0 nodes against a 42-node workflow. The page around it
 * read "6 lanes · 32 steps · 2 decisions · 41 transitions". The canvas said
 * nothing.
 *
 * The cause was one line: the seeding effect returns early when there is no
 * draft, because editing is what this controller is for. A platform template has
 * exactly one version and its status is `published` — verified against the
 * database, 1 version, status published — so `draftRow` was null forever.
 *
 * The second test is the one that matters more. `seededVersionRef` is the SAVE
 * TARGET: `flush` and the unmount cleanup both refuse when it is null. Seeding
 * the published version into that ref would have made the published graph
 * writable by any later edit — a platform template silently rewritten by someone
 * who dragged a node while reading it. The fallback deliberately uses a separate
 * ref so the published graph has nowhere to save to BY CONSTRUCTION, not by a
 * flag a future edit could forget to check.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkflowController } from '../hooks/useWorkflowController.js';

const DEFINITION_ID = 'def-1';
const PUBLISHED_ID = 'ver-published';

const PUBLISHED_GRAPH = {
  nodes: [
    { id: 'lane', type: 'swimlane', position: { x: 0, y: 0 }, data: { label: 'Apprentice' } },
    { id: 'step', type: 'step', parentId: 'lane', position: { x: 40, y: 40 }, data: { label: 'Accept offer' } },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

/**
 * PostgREST-shaped stub, following `duplicateDefinition.test.ts`: `select()`
 * returns a chain that RECORDS its filters, so the terminal call can dispatch on
 * them. The draft lookup ends on `.limit(1)` and the version lookup ends on
 * `.maybeSingle()` — two different terminals against the same table, which is
 * exactly why filters have to be tracked rather than answered positionally.
 */
function makeClient(opts: { draftRows: unknown[] }) {
  const writes: string[] = [];
  const client = {
    writes,
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
            // getDraftVersion ends here.
            limit() {
              if (table === 'workflow_definition_versions' && filters.status === 'draft') {
                return Promise.resolve({ data: opts.draftRows, error: null });
              }
              return Promise.resolve({ data: [], error: null });
            },
            // getWorkflowDefinition and getWorkflowVersion end here.
            maybeSingle() {
              if (table === 'workflow_definitions' && filters.id === DEFINITION_ID) {
                return Promise.resolve({
                  data: {
                    id: DEFINITION_ID,
                    tenant_id: null,
                    key: 'apprentice-placement',
                    name: 'Apprentice Placement',
                    app_scope: 'all',
                    is_system: true,
                    current_published_version_id: PUBLISHED_ID,
                  },
                  error: null,
                });
              }
              if (table === 'workflow_definition_versions' && filters.id === PUBLISHED_ID) {
                return Promise.resolve({
                  data: {
                    id: PUBLISHED_ID,
                    workflow_definition_id: DEFINITION_ID,
                    status: 'published',
                    version: 1,
                    graph: PUBLISHED_GRAPH,
                  },
                  error: null,
                });
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
          return chain;
        },
        update() {
          writes.push(table);
          return { eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
        },
        insert() {
          writes.push(table);
          return { select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
        },
      };
    },
  };
  return client;
}

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('published-graph fallback', () => {
  it('seeds the canvas from the published version when there is no draft', async () => {
    const supabase = makeClient({ draftRows: [] }) as never;
    const { result } = renderHook(
      () => useWorkflowController({ supabase, tenantId: null, definitionId: DEFINITION_ID, readOnly: true }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.nodes.length).toBeGreaterThan(0);
    });
    expect(result.current.nodes.map((n) => n.id)).toContain('step');
  });

  it('leaves the published version unwritable — no save target exists for it', async () => {
    const supabase = makeClient({ draftRows: [] }) as never;
    const { result, unmount } = renderHook(
      () => useWorkflowController({ supabase, tenantId: null, definitionId: DEFINITION_ID, readOnly: false }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.nodes.length).toBeGreaterThan(0);
    });
    // Move a node, then force the flush path that a real edit would take.
    result.current.onNodesChange([
      { id: 'step', type: 'position', position: { x: 999, y: 999 }, dragging: false } as never,
    ]);
    await result.current.saveNow();
    unmount();
    // Nothing may have been written to a version row.
    expect((supabase as unknown as { writes: string[] }).writes).toHaveLength(0);
  });
});
