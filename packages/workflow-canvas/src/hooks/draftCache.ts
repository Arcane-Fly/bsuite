/**
 * The draft graph has ONE cache owner: `workflowDraftOptions.queryKey`.
 *
 * `saveMutation` used to write that key only. crm7's step table read
 * `workflow-versions`, so add/rename/delete did not appear until a versions
 * refetch. These helpers write the same graph to the draft row AND the
 * matching draft entry in the versions list, and they are what rollback
 * restores. Published rows in the list are left untouched.
 */

import type { QueryClient } from '@tanstack/react-query';

import type { WorkflowDefinitionVersionRow, WorkflowGraph } from '../types.js';

export function patchDraftGraphInVersions(
  versions: WorkflowDefinitionVersionRow[] | undefined,
  graph: WorkflowGraph,
): WorkflowDefinitionVersionRow[] | undefined {
  if (!versions) return versions;
  let changed = false;
  const next = versions.map((row) => {
    if (row.status !== 'draft') return row;
    changed = true;
    return { ...row, graph };
  });
  return changed ? next : versions;
}

export function writeDraftGraphCaches(
  qc: QueryClient,
  draftKey: readonly unknown[],
  versionsKey: readonly unknown[],
  graph: WorkflowGraph,
): void {
  qc.setQueryData<WorkflowDefinitionVersionRow | null>(draftKey, (old) =>
    old ? { ...old, graph } : old,
  );
  qc.setQueryData<WorkflowDefinitionVersionRow[]>(versionsKey, (old) =>
    patchDraftGraphInVersions(old, graph) ?? old,
  );
}

export function restoreDraftGraphCaches(
  qc: QueryClient,
  draftKey: readonly unknown[],
  versionsKey: readonly unknown[],
  prevDraft: WorkflowDefinitionVersionRow | null | undefined,
  prevVersions: WorkflowDefinitionVersionRow[] | undefined,
): void {
  if (prevDraft !== undefined) {
    qc.setQueryData<WorkflowDefinitionVersionRow | null>(draftKey, prevDraft);
  }
  if (prevVersions !== undefined) {
    qc.setQueryData<WorkflowDefinitionVersionRow[]>(versionsKey, prevVersions);
  }
}
