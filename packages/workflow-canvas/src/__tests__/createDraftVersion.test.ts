/**
 * `createDraftVersion` — the ai_context NOT NULL bite (bsuite-3205).
 *
 * `workflow_definition_versions.ai_context` is `jsonb NOT NULL DEFAULT
 * '{}'::jsonb` (`supabase/migrations/20261103000000_workflow_definitions.sql:274`).
 * A column default only fires when the INSERT OMITS the key entirely — an
 * explicit `null` in the payload overrides it and violates the constraint
 * instead of falling through to it. `ai_context: args.aiContext ?? null`
 * turned "the caller supplied nothing" into exactly that explicit `null`.
 *
 * `useWorkflowController.ts`'s `createDraftMutation` is the live, reachable
 * caller: it invokes this function with only `{ definitionId, tenantId,
 * graph }` — no `aiContext` — every time the "Create draft" action fires from
 * the shipped canvas UI (`WorkflowCanvasInner.tsx`, whenever `editable &&
 * publishedLock`).
 *
 * These assert the VALUE actually sent to the insert, not merely that the
 * call resolved — a fake client that returns success regardless of payload
 * would pass either way and prove nothing.
 */

import { describe, expect, it } from 'vitest';

import { createDraftVersion } from '../service.js';
import { emptyWorkflowGraph } from '../types.js';
import type { WorkflowDefinitionVersionRow } from '../types.js';

interface Recorded {
  table: string;
  payload: Record<string, unknown>;
}

function makeClient() {
  const inserts: Recorded[] = [];

  const client = {
    from(table: string) {
      return {
        select() {
          const chain = {
            eq() {
              return chain;
            },
            order() {
              return chain;
            },
            limit() {
              // `getMaxVersion` is skipped whenever the caller supplies an
              // explicit `version`, which every test below does — this
              // exists only so a chain that reaches it does not throw.
              return Promise.resolve({ data: [], error: null });
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
                  const row: WorkflowDefinitionVersionRow = {
                    id: 'ver-1',
                    workflow_definition_id: String(payload.workflow_definition_id),
                    tenant_id: (payload.tenant_id as string | null) ?? null,
                    version: payload.version as number,
                    status: payload.status as WorkflowDefinitionVersionRow['status'],
                    graph: payload.graph as WorkflowDefinitionVersionRow['graph'],
                    trigger_config: null,
                    ai_context: payload.ai_context as Record<string, unknown>,
                    created_by: null,
                    published_by: null,
                    created_at: null,
                    updated_at: null,
                    published_at: null,
                  };
                  return Promise.resolve({ data: row, error: null });
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

describe('createDraftVersion', () => {
  it('sends {} for ai_context when the caller supplies none — never an explicit null', async () => {
    const { client, inserts } = makeClient();

    // Exactly the call shape `useWorkflowController.ts`'s createDraftMutation
    // makes: no `aiContext` key at all, the same as `args.aiContext` being
    // `undefined`.
    await createDraftVersion(client, {
      definitionId: 'def-1',
      tenantId: 'tenant-1',
      graph: emptyWorkflowGraph(),
      version: 1,
    });

    expect(inserts).toHaveLength(1);
    const sent = inserts[0]?.payload.ai_context;
    expect(sent).toEqual({});
    expect(sent).not.toBeNull();
    expect(sent).not.toBeUndefined();
  });

  it('sends {} for ai_context when the caller passes null explicitly too', async () => {
    const { client, inserts } = makeClient();

    await createDraftVersion(client, {
      definitionId: 'def-1',
      tenantId: 'tenant-1',
      graph: emptyWorkflowGraph(),
      version: 1,
      aiContext: null,
    });

    expect(inserts[0]?.payload.ai_context).toEqual({});
  });

  it('passes an explicitly supplied aiContext through unchanged', async () => {
    const { client, inserts } = makeClient();
    const aiContext = {
      rationale_notes: [{ id: 'n1', question: 'Why this branch?', answer: 'Compliance.' }],
    };

    await createDraftVersion(client, {
      definitionId: 'def-1',
      tenantId: 'tenant-1',
      graph: emptyWorkflowGraph(),
      version: 1,
      aiContext,
    });

    expect(inserts[0]?.payload.ai_context).toEqual(aiContext);
  });
});
