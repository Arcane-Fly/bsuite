/**
 * The graph round trip.
 *
 * `workflow_definition_versions.graph` holds xyflow's NATIVE
 * `{ nodes, edges, viewport }`. The property that makes that claim true is
 * `deserialiseGraph(serialiseGraph(g))` deep-equalling `g` — no translation, no
 * dropped fields, no reordered keys that change meaning. This is the May plan's
 * §9.1 output-equivalence loop applied to this surface, and its red-team
 * amendment #20 (Zod validation on serialise AND deserialise).
 */

import { describe, expect, it } from 'vitest';

import { WorkflowGraphSchema, deserialiseGraph, serialiseGraph } from '../schemas.js';
import { computeSwimlaneLayout } from '../utils/autoLayout.js';
import { emptyWorkflowGraph } from '../types.js';
import type { WorkflowGraph } from '../types.js';
import { apprenticeFragment } from './fixtures.js';

describe('serialise -> deserialise is lossless', () => {
  it('round-trips the apprentice fragment, loops and all', () => {
    const graph = apprenticeFragment();
    const round = deserialiseGraph(serialiseGraph(graph));
    expect(round).toEqual(graph);
  });

  it('round-trips through JSON, which is what jsonb actually does', () => {
    const graph = apprenticeFragment();
    // supabase-js sends the object and Postgres stores it as jsonb; a string
    // trip is the closest a unit test gets to that, and it is where a Date, a
    // Map or an undefined would be exposed.
    const asStored = JSON.parse(JSON.stringify(serialiseGraph(graph)));
    expect(deserialiseGraph(asStored)).toEqual(graph);
  });

  it('round-trips a LAID-OUT graph, keeping parentId and extent', () => {
    const graph = apprenticeFragment();
    const { nodes } = computeSwimlaneLayout(graph.nodes, graph.edges);
    const laidOut: WorkflowGraph = { ...graph, nodes };

    const round = deserialiseGraph(JSON.parse(JSON.stringify(serialiseGraph(laidOut))));
    expect(round).toEqual(laidOut);

    // Named explicitly: these two are what make a swimlane mean anything, and
    // they are the fields a bespoke envelope would have quietly dropped.
    const member = round.nodes.find((n) => n.id === 'send-esign');
    expect(member?.parentId).toBe('lane-gto-labour-hire-team');
    expect(member?.extent).toBe('parent');
  });

  it('preserves the viewport, so reopening lands where the reader left', () => {
    const graph = apprenticeFragment();
    expect(deserialiseGraph(serialiseGraph(graph)).viewport).toEqual({
      x: -120,
      y: 40,
      zoom: 0.75,
    });
  });

  it('round-trips the empty graph a new draft starts from', () => {
    const empty = emptyWorkflowGraph();
    expect(deserialiseGraph(serialiseGraph(empty))).toEqual(empty);
  });
});

describe('fields xyflow owns survive even though this package never names them', () => {
  it('keeps unknown node and edge fields byte-for-byte', () => {
    // `measured`, `handles`, `initialWidth` and friends arrive with xyflow minor
    // bumps. A strict schema would reject a graph it validated last week; a
    // stripping one would silently lose the field, which is worse.
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: 'n1',
          type: 'step',
          position: { x: 10, y: 20 },
          data: { label: 'A' },
          measured: { width: 220, height: 88 },
          selected: false,
          dragging: false,
          someFutureXyflowField: { nested: true },
        } as never,
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n1',
          animated: true,
          markerEnd: { type: 'arrowclosed' },
        } as never,
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    };

    const round = deserialiseGraph(serialiseGraph(graph));
    expect(round).toEqual(graph);
  });

  it('keeps a node type this package has never heard of', () => {
    // The registry is open, so a consumer's own kind must survive a save/load
    // cycle even though `WORKFLOW_NODE_KINDS` does not list it.
    const graph: WorkflowGraph = {
      nodes: [
        { id: 'w', type: 'webhook', position: { x: 0, y: 0 }, data: { label: 'POST' } },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    expect(deserialiseGraph(serialiseGraph(graph)).nodes[0]?.type).toBe('webhook');
  });
});

describe('malformed input is refused at parse time, not carried onto the canvas', () => {
  it('refuses a node with no id', () => {
    expect(() =>
      serialiseGraph({
        nodes: [{ position: { x: 0, y: 0 }, data: {} } as never],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    ).toThrow();
  });

  it('refuses a node with a non-finite position — NaN renders as an invisible card', () => {
    expect(() =>
      serialiseGraph({
        nodes: [{ id: 'a', position: { x: Number.NaN, y: 0 }, data: {} }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    ).toThrow();
  });

  it('refuses an edge missing its target', () => {
    expect(() =>
      serialiseGraph({
        nodes: [],
        edges: [{ id: 'e', source: 'a' } as never],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    ).toThrow();
  });

  it('refuses a viewport zoom outside anything the canvas can escape from', () => {
    expect(() =>
      serialiseGraph({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 0 } }),
    ).toThrow();
  });

  it('treats a NULL graph column as the empty graph, not as an error', () => {
    // A definition row can exist before its first draft has any content.
    expect(deserialiseGraph(null)).toEqual(emptyWorkflowGraph());
    expect(deserialiseGraph(undefined)).toEqual(emptyWorkflowGraph());
  });

  it('throws on a present-but-corrupt graph rather than half-loading it', () => {
    expect(() => deserialiseGraph({ nodes: 'not-an-array', edges: [] })).toThrow();
  });
});

describe('the persisted shape is xyflow-native, with no envelope of our own', () => {
  it('has exactly the three top-level keys React Flow uses', () => {
    const json = serialiseGraph(apprenticeFragment());
    expect(Object.keys(json).sort()).toEqual(['edges', 'nodes', 'viewport']);
  });

  it('is what WorkflowGraphSchema accepts, so the column and the type agree', () => {
    expect(WorkflowGraphSchema.safeParse(serialiseGraph(apprenticeFragment())).success).toBe(
      true,
    );
  });
});
