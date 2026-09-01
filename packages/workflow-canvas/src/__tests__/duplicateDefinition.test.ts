/**
 * `duplicateWorkflowDefinition` — "Copy to my organisation".
 *
 * WHAT THESE TESTS ARE ACTUALLY GUARDING
 *
 *  1. THE COPY ARRIVES AS A DRAFT. `current_published_version_id` stays NULL
 *     and the new version's status is `draft`, so nothing downstream can pick
 *     the copy up until a person publishes it. A duplicate that arrived
 *     published would put an unreviewed process into force on a tenant with one
 *     click, and every consumer reads through that pointer.
 *  2. THE SOURCE GRAPH COMES FROM THE POINTER, not from `max(version)`. The
 *     fake below deliberately holds a NEWER draft than the published version,
 *     and the copy must be the published one — otherwise copying a template
 *     while somebody has an editor open copies their half-finished work.
 *  3. A SECOND COPY DOES NOT 23505. `(tenant_id, key)` is unique, so the retry
 *     has to bump the key rather than surface a constraint name the user cannot
 *     act on.
 *  4. A NON-UNIQUE ERROR IS NOT RETRIED. Spinning five times on a permission
 *     failure turns one refusal into five, and reports the last one as though
 *     it were the first.
 */

import { describe, expect, it } from 'vitest';

import { duplicateWorkflowDefinition } from '../service.js';
import type {
  WorkflowDefinitionRow,
  WorkflowDefinitionVersionRow,
  WorkflowGraph,
} from '../types.js';

const PLATFORM_TEMPLATE: WorkflowDefinitionRow = {
  id: 'def-template',
  tenant_id: null,
  key: 'apprentice-placement',
  name: 'Apprentice Placement',
  description: 'End-to-end apprentice journey.',
  app_scope: 'all',
  is_system: true,
  current_published_version_id: 'ver-published',
  created_by: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const PUBLISHED_GRAPH: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'terminator', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const DRAFT_GRAPH: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'terminator', position: { x: 0, y: 0 }, data: { label: 'Start' } },
    { id: 'wip', type: 'step', position: { x: 200, y: 0 }, data: { label: 'Half-finished' } },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const PUBLISHED_VERSION: WorkflowDefinitionVersionRow = {
  id: 'ver-published',
  workflow_definition_id: 'def-template',
  tenant_id: null,
  version: 3,
  status: 'published',
  graph: PUBLISHED_GRAPH,
  trigger_config: null,
  ai_context: { rationale_notes: [{ id: 'n1', question: 'Why?', answer: 'Because.' }] },
  created_by: null,
  published_by: null,
  created_at: null,
  updated_at: null,
  published_at: '2026-09-01T00:00:00Z',
};

/** A NEWER draft than the published one — see guard 2 in the header. */
const NEWER_DRAFT: WorkflowDefinitionVersionRow = {
  ...PUBLISHED_VERSION,
  id: 'ver-draft',
  version: 4,
  status: 'draft',
  graph: DRAFT_GRAPH,
  published_at: null,
};

interface Recorded {
  table: string;
  payload: Record<string, unknown>;
}

/**
 * A hand-rolled fake rather than a mocking library.
 *
 * The service chains `.from().select().eq().maybeSingle()` and
 * `.from().insert().select().single()`, and a generic mock that returns itself
 * from every call cannot tell those two chains apart — which is how a stub ends
 * up asserting that a query it never understood "succeeded". This fake answers
 * each terminal by the table and the filters it actually received.
 */
function makeClient(options: { existingKeys?: Set<string>; insertError?: unknown } = {}) {
  const existingKeys = options.existingKeys ?? new Set<string>();
  const inserts: Recorded[] = [];
  let versionInsertCount = 0;

  const client = {
    from(table: string) {
      return {
        select() {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq(column: string, value: unknown) {
              filters[column] = value;
              return chain;
            },
            order() {
              return chain;
            },
            limit() {
              // `getMaxVersion` ends on `.limit()`, which is awaited directly.
              return Promise.resolve({ data: [], error: null });
            },
            maybeSingle() {
              if (table === 'workflow_definitions' && filters.id === 'def-template') {
                return Promise.resolve({ data: PLATFORM_TEMPLATE, error: null });
              }
              if (table === 'workflow_definition_versions') {
                if (filters.id === 'ver-published') {
                  return Promise.resolve({ data: PUBLISHED_VERSION, error: null });
                }
                if (filters.id === 'ver-draft') {
                  return Promise.resolve({ data: NEWER_DRAFT, error: null });
                }
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
          return chain;
        },
        insert(payload: Record<string, unknown>) {
          inserts.push({ table, payload });
          return {
            select() {
              return {
                single() {
                  if (options.insertError) {
                    return Promise.resolve({ data: null, error: options.insertError });
                  }
                  if (table === 'workflow_definitions') {
                    const key = String(payload.key);
                    if (existingKeys.has(key)) {
                      return Promise.resolve({
                        data: null,
                        error: { code: '23505', message: 'duplicate key' },
                      });
                    }
                    return Promise.resolve({
                      data: {
                        ...PLATFORM_TEMPLATE,
                        id: `def-copy-${key}`,
                        tenant_id: payload.tenant_id,
                        key,
                        name: payload.name,
                        is_system: false,
                        current_published_version_id: null,
                      },
                      error: null,
                    });
                  }
                  versionInsertCount += 1;
                  return Promise.resolve({
                    data: {
                      ...NEWER_DRAFT,
                      id: `ver-copy-${versionInsertCount}`,
                      workflow_definition_id: String(payload.workflow_definition_id),
                      tenant_id: payload.tenant_id,
                      version: payload.version,
                      status: payload.status,
                      graph: payload.graph,
                      ai_context: payload.ai_context,
                    },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
  };

  return { client, inserts };
}

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('duplicateWorkflowDefinition', () => {
  it('lands the copy as a DRAFT with no published pointer', async () => {
    const { client, inserts } = makeClient();
    const result = await duplicateWorkflowDefinition(client, {
      sourceDefinitionId: 'def-template',
      tenantId: TENANT,
    });

    expect(result.definition.current_published_version_id).toBeNull();
    expect(result.draft.status).toBe('draft');

    const definitionInsert = inserts.find((i) => i.table === 'workflow_definitions');
    expect(definitionInsert?.payload.current_published_version_id).toBeNull();
    expect(definitionInsert?.payload.tenant_id).toBe(TENANT);
    // The copy is the tenant's own workflow, never a platform-maintained one.
    expect(definitionInsert?.payload.is_system).toBe(false);
  });

  it('copies the PUBLISHED graph, not a newer draft', async () => {
    const { client, inserts } = makeClient();
    await duplicateWorkflowDefinition(client, {
      sourceDefinitionId: 'def-template',
      tenantId: TENANT,
    });

    const versionInsert = inserts.find((i) => i.table === 'workflow_definition_versions');
    const graph = versionInsert?.payload.graph as WorkflowGraph;
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes.map((n) => n.id)).not.toContain('wip');
  });

  it('carries the rationale notes across with the graph', async () => {
    const { client, inserts } = makeClient();
    await duplicateWorkflowDefinition(client, {
      sourceDefinitionId: 'def-template',
      tenantId: TENANT,
    });
    const versionInsert = inserts.find((i) => i.table === 'workflow_definition_versions');
    expect(versionInsert?.payload.ai_context).toEqual(PUBLISHED_VERSION.ai_context);
  });

  it('bumps the key rather than surfacing 23505 on a second copy', async () => {
    const { client, inserts } = makeClient({
      existingKeys: new Set(['apprentice-placement']),
    });
    const result = await duplicateWorkflowDefinition(client, {
      sourceDefinitionId: 'def-template',
      tenantId: TENANT,
    });

    expect(result.definition.key).toBe('apprentice-placement-2');
    const keys = inserts
      .filter((i) => i.table === 'workflow_definitions')
      .map((i) => i.payload.key);
    expect(keys).toEqual(['apprentice-placement', 'apprentice-placement-2']);
  });

  it('does NOT retry an error that is not a unique violation', async () => {
    const { client, inserts } = makeClient({
      insertError: { code: '42501', message: 'permission denied' },
    });

    await expect(
      duplicateWorkflowDefinition(client, {
        sourceDefinitionId: 'def-template',
        tenantId: TENANT,
      }),
    ).rejects.toThrow(/permission denied/);

    expect(inserts.filter((i) => i.table === 'workflow_definitions')).toHaveLength(1);
  });

  it('refuses a source that does not exist rather than creating an empty copy', async () => {
    const { client, inserts } = makeClient();
    await expect(
      duplicateWorkflowDefinition(client, {
        sourceDefinitionId: 'def-missing',
        tenantId: TENANT,
      }),
    ).rejects.toThrow(/no longer exists/);
    expect(inserts).toHaveLength(0);
  });
});
