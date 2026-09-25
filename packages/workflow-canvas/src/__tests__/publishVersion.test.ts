/**
 * `publishVersion` refuses a graph the run would skip, and writes nothing
 * when it refuses.
 *
 * The measured graph is Start → End with a notify step off to the side. The
 * run begins at the Start terminator and finishes, and the step's action
 * never runs. The refusal names that step in the words a person can act on.
 */

import { describe, expect, it } from 'vitest';

import { publishVersion } from '../service.js';
import type { WorkflowDefinitionRow, WorkflowEdge, WorkflowGraph, WorkflowNode } from '../types.js';

interface RecordedWrite {
  table: string;
  payload: Record<string, unknown>;
}

function node(
  id: string,
  type: string,
  data: Record<string, unknown>,
): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function edge(id: string, source: string, target: string): WorkflowEdge {
  return { id, source, target };
}

function graph(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowGraph {
  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
}

const start = node('start', 'terminator', { label: 'START', role: 'start' });
const end = node('end', 'terminator', { label: 'END', role: 'end' });

const disconnected = graph(
  [
    start,
    end,
    node('step1', 'step', { label: 'Notify internally', actionKey: 'notify_internal' }),
  ],
  [edge('e-start-end', 'start', 'end')],
);

const connected = graph(
  [
    start,
    node('step1', 'step', { label: 'Notify internally', actionKey: 'notify_internal' }),
    end,
  ],
  [edge('e-start-step', 'start', 'step1'), edge('e-step-end', 'step1', 'end')],
);

const DEFINITION: WorkflowDefinitionRow = {
  id: 'def-1',
  tenant_id: 'tenant-1',
  key: 'notify',
  name: 'Notify',
  description: null,
  app_scope: 'all',
  is_system: false,
  current_published_version_id: 'ver-1',
  created_by: null,
  created_at: null,
  updated_at: null,
};

function makeClient(versionGraph: WorkflowGraph) {
  const writes: RecordedWrite[] = [];

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
            maybeSingle() {
              if (table === 'workflow_definition_versions' && filters.id === 'ver-1') {
                return Promise.resolve({
                  data: {
                    id: 'ver-1',
                    workflow_definition_id: 'def-1',
                    graph: versionGraph,
                  },
                  error: null,
                });
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
          return chain;
        },
        update(payload: Record<string, unknown>) {
          writes.push({ table, payload });
          const chain = {
            eq() {
              return chain;
            },
            select() {
              return chain;
            },
            single() {
              if (table === 'workflow_definition_versions') {
                return Promise.resolve({ data: { id: 'ver-1' }, error: null });
              }
              return Promise.resolve({ data: DEFINITION, error: null });
            },
          };
          return chain;
        },
      };
    },
  };

  return { client, writes };
}

describe('publishVersion reachability', () => {
  it('throws and writes nothing when a step cannot be reached from Start', async () => {
    const { client, writes } = makeClient(disconnected);

    let thrown: unknown;
    try {
      await publishVersion(client, 'def-1', 'ver-1');
    } catch (err) {
      thrown = err;
    }

    expect(thrown instanceof Error).toBe(true);
    expect(thrown instanceof Error ? thrown.message : '').toBe(
      'Nothing leads to Notify internally, so it would never run. Connect it from Start or remove it, then publish.',
    );
    expect(writes).toEqual([]);
  });

  it('names every unreachable step, and an unnamed one, and still writes nothing', async () => {
    const two = graph(
      [
        start,
        end,
        node('step-a', 'step', { label: 'Send the offer' }),
        node('step-b', 'step', { actionKey: 'notify_internal' }),
      ],
      [edge('e-start-end', 'start', 'end')],
    );
    const { client, writes } = makeClient(two);

    let thrown: unknown;
    try {
      await publishVersion(client, 'def-1', 'ver-1');
    } catch (err) {
      thrown = err;
    }

    expect(thrown instanceof Error).toBe(true);
    expect(thrown instanceof Error ? thrown.message : '').toBe(
      'Nothing leads to Send the offer, an unnamed step, so they would never run. Connect them from Start or remove them, then publish.',
    );
    expect(writes).toEqual([]);
  });

  it('publishes when Start reaches the step and End', async () => {
    const { client, writes } = makeClient(connected);

    const published = await publishVersion(client, 'def-1', 'ver-1');

    expect(published.id).toBe('def-1');
    expect(published.current_published_version_id).toBe('ver-1');
    expect(writes.map((write) => write.table)).toEqual([
      'workflow_definition_versions',
      'workflow_definitions',
    ]);
    expect(writes[0]?.payload.status).toBe('published');
    expect(writes[1]?.payload.current_published_version_id).toBe('ver-1');
  });
});
