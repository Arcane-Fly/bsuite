/**
 * Cross-tab sync. Subscribes to `postgres_changes` on the two workflow tables
 * and invalidates the canonical query keys. Straight port of
 * `packages/schema-builder/src/hooks/useRealtimeSubscription.ts`.
 *
 * THE DRAFT KEY IS DELIBERATELY EXCLUDED FROM THE DEFAULT.
 *
 * `workflow-draft` is the row the open editor is writing to. Invalidating it on
 * every `postgres_changes` event would refetch the draft in response to THIS
 * tab's own save, and the response — older than the local state by however long
 * the round trip took — would replace the graph the user is still editing. The
 * schema builder hit exactly this: a refetch served before an insert was
 * visible clobbered a just-dragged card back to its grid slot (see
 * `useSchemaController`'s `updatePositionMutation.onSuccess`).
 *
 * So the draft is refreshed only when `invalidateDraft` is opted into, which the
 * controller does NOT do while an edit session is open.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { LooseSupabaseClient } from '../service.js';
import {
  workflowDefinitionOptions,
  workflowDefinitionsOptions,
  workflowDraftOptions,
  workflowVersionsOptions,
} from './queries.js';

export interface UseWorkflowRealtimeOptions {
  client: LooseSupabaseClient;
  tenantId: string | null;
  definitionId: string | null;
  enabled?: boolean;
  /** See the header. Default false. */
  invalidateDraft?: boolean;
}

export function useWorkflowRealtimeSubscription({
  client,
  tenantId,
  definitionId,
  enabled = true,
  invalidateDraft = false,
}: UseWorkflowRealtimeOptions): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !tenantId) return;

    const definitionsKey = workflowDefinitionsOptions(client, tenantId).queryKey;
    const definitionKey = workflowDefinitionOptions(client, definitionId).queryKey;
    const versionsKey = workflowVersionsOptions(client, definitionId).queryKey;
    const draftKey = workflowDraftOptions(client, definitionId).queryKey;

    const channel = client
      .channel(`workflow-canvas-${tenantId}-${definitionId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_definitions' },
        () => {
          void qc.invalidateQueries({ queryKey: definitionsKey });
          if (definitionId) void qc.invalidateQueries({ queryKey: definitionKey });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workflow_definition_versions' },
        () => {
          if (!definitionId) return;
          void qc.invalidateQueries({ queryKey: versionsKey });
          if (invalidateDraft) void qc.invalidateQueries({ queryKey: draftKey });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, tenantId, definitionId, enabled, invalidateDraft, qc]);
}
