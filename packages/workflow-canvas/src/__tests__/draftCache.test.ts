/**
 * The step table reads the same caches the save mutation writes.
 * A padded versions list that is never patched is how add/rename/delete
 * stayed invisible without a reload (crm7#2604 follow-up).
 */
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  patchDraftGraphInVersions,
  restoreDraftGraphCaches,
  writeDraftGraphCaches,
} from '../hooks/draftCache.js';
import type { WorkflowDefinitionVersionRow, WorkflowGraph } from '../types.js';

const DRAFT: WorkflowDefinitionVersionRow = {
  id: 'ver-draft',
  workflow_definition_id: 'def-1',
  tenant_id: 't1',
  version: 2,
  status: 'draft',
  graph: { nodes: [{ id: 'a', type: 'step', position: { x: 0, y: 0 }, data: { label: 'A' } }], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  trigger_config: null,
  ai_context: null,
  created_by: null,
  published_by: null,
  created_at: null,
  updated_at: null,
  published_at: null,
};

const PUBLISHED: WorkflowDefinitionVersionRow = {
  ...DRAFT,
  id: 'ver-pub',
  version: 1,
  status: 'published',
  graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
};

const NEXT: WorkflowGraph = {
  nodes: [
    { id: 'a', type: 'step', position: { x: 0, y: 0 }, data: { label: 'A' } },
    { id: 'b', type: 'step', position: { x: 40, y: 0 }, data: { label: 'B' } },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describe('patchDraftGraphInVersions', () => {
  it('rewrites only the draft row, leaving the published overview graph untouched', () => {
    const next = patchDraftGraphInVersions([PUBLISHED, DRAFT], NEXT);
    expect(next?.find((row) => row.status === 'published')?.graph.nodes).toEqual([]);
    expect(next?.find((row) => row.status === 'draft')?.graph).toBe(NEXT);
  });
});

describe('writeDraftGraphCaches / restoreDraftGraphCaches', () => {
  it('writes the live graph to both caches and restores both on rollback', () => {
    const qc = new QueryClient();
    const draftKey = ['workflow-draft', 'def-1'] as const;
    const versionsKey = ['workflow-versions', 'def-1'] as const;
    qc.setQueryData(draftKey, DRAFT);
    qc.setQueryData(versionsKey, [PUBLISHED, DRAFT]);

    writeDraftGraphCaches(qc, draftKey, versionsKey, NEXT);

    expect(qc.getQueryData<WorkflowDefinitionVersionRow>(draftKey)?.graph).toEqual(NEXT);
    expect(
      qc.getQueryData<WorkflowDefinitionVersionRow[]>(versionsKey)?.find((row) => row.status === 'draft')
        ?.graph,
    ).toEqual(NEXT);
    expect(
      qc.getQueryData<WorkflowDefinitionVersionRow[]>(versionsKey)?.find((row) => row.status === 'published')
        ?.graph.nodes,
    ).toEqual([]);

    restoreDraftGraphCaches(qc, draftKey, versionsKey, DRAFT, [PUBLISHED, DRAFT]);

    expect(qc.getQueryData<WorkflowDefinitionVersionRow>(draftKey)?.graph.nodes).toHaveLength(1);
    expect(
      qc.getQueryData<WorkflowDefinitionVersionRow[]>(versionsKey)?.find((row) => row.status === 'draft')
        ?.graph.nodes,
    ).toHaveLength(1);
  });
});
