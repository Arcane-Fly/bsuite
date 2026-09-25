/**
 * Which nodes a run would never visit.
 *
 * A terminator is a start only when `terminatorRole` says so (`data.role ===
 * 'start'`). When the graph has one, the run begins there. When it does not,
 * every node with no incoming edge is a root, so a single step and no
 * terminators is a valid workflow. Swimlanes are containers: they group
 * steps and are never themselves a step the run failed to reach.
 */

import { terminatorRole } from './nodes/TerminatorNode.js';
import { workflowNodeTypeRegistry } from './nodes/registry.js';
import type { WorkflowGraph, WorkflowNode } from './types.js';

export function findUnreachableNodes(graph: WorkflowGraph): WorkflowNode[] {
  const starts = graph.nodes.filter(
    (node) => node.type === 'terminator' && terminatorRole(node.data) === 'start',
  );

  const incoming = new Set<string>();
  const nextBySource = new Map<string, string[]>();
  for (const edge of graph.edges) {
    incoming.add(edge.target);
    const next = nextBySource.get(edge.source);
    if (next) next.push(edge.target);
    else nextBySource.set(edge.source, [edge.target]);
  }

  const roots =
    starts.length > 0 ? starts : graph.nodes.filter((node) => !incoming.has(node.id));

  const reachable = new Set<string>();
  const pending = roots.map((node) => node.id);
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined || reachable.has(id)) continue;
    reachable.add(id);
    const next = nextBySource.get(id);
    if (!next) continue;
    for (const target of next) {
      if (!reachable.has(target)) pending.push(target);
    }
  }

  return graph.nodes.filter(
    (node) => !workflowNodeTypeRegistry.isContainer(node.type) && !reachable.has(node.id),
  );
}
