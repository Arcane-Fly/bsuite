/**
 * THE STEP ACTION VOCABULARY — one list, read by the inspector's picker and by
 * this package's own tests, so the two cannot drift the way the canvas and the
 * real processor already have.
 *
 * `docs/plans/20260908-remediation/evidence/supervisor-claude-c6-vocabulary-
 * decision-20260909.md` (crm7#2594 C6, crm7#2603) mapped the ONLY processor
 * that ever reads a queued action — conduit's `r7-automation-processor`
 * (`supabase/functions/r7-automation-processor/handler.ts`, `executeAction`) —
 * and found the canvas had no control at all for `node.data.actionKey` /
 * `node.data.action`, so the only executable step ever authored was written by
 * SQL. This module is the fix's vocabulary half: every kind the processor's
 * switch statement knows about, in the SAME order, each flagged with whether
 * the processor actually DOES something for it today or only records the
 * queue row as `skipped`.
 *
 * `implemented: false` entries are NOT removed from the picker — a workflow
 * author choosing "Send SMS" should see that the platform has no SMS lane yet,
 * not fail to find the option and assume the canvas is broken. `notAutomatedReason`
 * is the processor's own skip message (`handler.ts` lines 183-202), so the
 * inspector's copy and the eventual `r7_automation_queue.last_error` agree.
 */

export const WORKFLOW_ACTION_KINDS = [
  'send_email',
  'notify_internal',
  'send_sms',
  'create_calendar_invite',
  'auto_add_to_pool',
  'auto_assign_field_officer',
] as const;

export type WorkflowActionKind = (typeof WORKFLOW_ACTION_KINDS)[number];

export interface WorkflowActionVocabularyEntry {
  kind: WorkflowActionKind;
  /** Palette label, in the user's nouns. */
  label: string;
  /** True when `r7-automation-processor` actually executes this kind today. */
  implemented: boolean;
  /**
   * The processor's own skip reason, shown so the inspector never asserts an
   * effect the processor will not perform. Present only when `!implemented`.
   */
  notAutomatedReason?: string;
}

export const WORKFLOW_ACTION_VOCABULARY: readonly WorkflowActionVocabularyEntry[] = [
  { kind: 'send_email', label: 'Send email', implemented: true },
  { kind: 'notify_internal', label: 'Notify internally (task)', implemented: true },
  {
    kind: 'send_sms',
    label: 'Send SMS',
    implemented: false,
    notAutomatedReason: 'SMS provider not configured',
  },
  {
    kind: 'create_calendar_invite',
    label: 'Create calendar invite',
    implemented: false,
    notAutomatedReason: 'Calendar automation not configured — interview invites use the manual flow',
  },
  {
    kind: 'auto_add_to_pool',
    label: 'Add to talent pool',
    implemented: false,
    notAutomatedReason: 'Pending consent model (conduit#229)',
  },
  { kind: 'auto_assign_field_officer', label: 'Auto-assign field officer', implemented: true },
];

export function actionVocabularyEntry(
  kind: string | undefined,
): WorkflowActionVocabularyEntry | undefined {
  return WORKFLOW_ACTION_VOCABULARY.find((entry) => entry.kind === kind);
}

/**
 * `tasks_priority_check` on `public.tasks`, mirrored from
 * `r7-automation-processor/handler.ts`'s `TASK_PRIORITIES` — the same four
 * values the processor falls back from on anything else.
 */
export const TASK_PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;

export type TaskPriorityOption = (typeof TASK_PRIORITY_OPTIONS)[number];
