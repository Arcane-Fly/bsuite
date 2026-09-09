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

/**
 * A shape a queued action's SUBJECT must carry for the processor to do anything
 * with it. `workflow_run_advance` enqueues one row per advancing run and fills
 * `candidate_id` / `pipeline_entry_id` only when the run's subject actually IS
 * that thing — a `communications` subject on `sms.inbound` supplies neither.
 * `executeAction` (conduit `r7-automation-processor/handler.ts`) then fails
 * `send_email` ("no candidate_id on queue row") or no-ops
 * `auto_assign_field_officer` ("no pipeline_entry_id … no-op") rather than
 * doing what the picker promised.
 */
export type WorkflowActionRequirement = 'candidate' | 'pipeline_entry' | 'subject';

/** What the inspector needs to know about the workflow's subject to tell
 * whether a `requires` entry is met. Absent entirely = context unknown, so
 * nothing is gated (see `unmetActionRequirement`). */
export interface WorkflowActionContext {
  subjectTable?: string | null;
  hasCandidate?: boolean;
  hasPipelineEntry?: boolean;
}

const REQUIREMENT_MET: Record<WorkflowActionRequirement, (context: WorkflowActionContext) => boolean> = {
  candidate: (context) => context.hasCandidate === true,
  pipeline_entry: (context) => context.hasPipelineEntry === true,
  subject: (context) => context.subjectTable != null,
};

const REQUIREMENT_LABEL: Record<WorkflowActionRequirement, string> = {
  candidate: 'a candidate',
  pipeline_entry: 'a pipeline entry',
  subject: 'a subject',
};

function describeSubject(subjectTable: string | null | undefined): string {
  switch (subjectTable) {
    case 'candidates':
      return 'a candidate';
    case 'pipeline_entries':
      return 'a pipeline entry';
    case 'communications':
      return 'a communication';
    default:
      return subjectTable ? `a "${subjectTable}" record` : 'not yet known';
  }
}

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
  /** Subject shapes this action's queue row must carry to be executable. */
  requires: WorkflowActionRequirement[];
  /** One-line reason for the FIRST entry in `requires` — shown when unmet. */
  requiresReason?: string;
}

export const WORKFLOW_ACTION_VOCABULARY: readonly WorkflowActionVocabularyEntry[] = [
  {
    kind: 'send_email',
    label: 'Send email',
    implemented: true,
    requires: ['candidate'],
    requiresReason: "the processor reads the recipient off the queue row's candidate_id",
  },
  { kind: 'notify_internal', label: 'Notify internally (task)', implemented: true, requires: [] },
  {
    kind: 'send_sms',
    label: 'Send SMS',
    implemented: false,
    notAutomatedReason: 'SMS provider not configured',
    requires: [],
  },
  {
    kind: 'create_calendar_invite',
    label: 'Create calendar invite',
    implemented: false,
    notAutomatedReason: 'Calendar automation not configured — interview invites use the manual flow',
    requires: [],
  },
  {
    kind: 'auto_add_to_pool',
    label: 'Add to talent pool',
    implemented: false,
    notAutomatedReason: 'Pending consent model (conduit#229)',
    requires: [],
  },
  {
    kind: 'auto_assign_field_officer',
    label: 'Auto-assign field officer',
    implemented: true,
    requires: ['pipeline_entry'],
    requiresReason: "the processor reads who to assign off the queue row's pipeline_entry_id",
  },
];

export function actionVocabularyEntry(
  kind: string | undefined,
): WorkflowActionVocabularyEntry | undefined {
  return WORKFLOW_ACTION_VOCABULARY.find((entry) => entry.kind === kind);
}

/**
 * The first requirement of `entry` that `context` does not satisfy, or `null`
 * when every requirement is met OR `context` is absent — an absent context
 * means "unknown", not "unrestricted", but this package has no way to fetch
 * the subject itself, so absent renders as ungated (current behaviour) rather
 * than blocking every action by default.
 */
export function unmetActionRequirement(
  entry: WorkflowActionVocabularyEntry,
  context: WorkflowActionContext | undefined,
): WorkflowActionRequirement | null {
  if (!context) return null;
  for (const requirement of entry.requires) {
    if (!REQUIREMENT_MET[requirement](context)) return requirement;
  }
  return null;
}

/** The sentence the inspector shows beside a gated action. */
export function describeUnmetRequirement(
  entry: WorkflowActionVocabularyEntry,
  requirement: WorkflowActionRequirement,
  context: WorkflowActionContext,
): string {
  const reason = entry.requiresReason ? ` — ${entry.requiresReason}` : '';
  return `Needs ${REQUIREMENT_LABEL[requirement]}${reason}. This workflow's subject is ${describeSubject(
    context.subjectTable,
  )}.`;
}

/**
 * `tasks_priority_check` on `public.tasks`, mirrored from
 * `r7-automation-processor/handler.ts`'s `TASK_PRIORITIES` — the same four
 * values the processor falls back from on anything else.
 */
export const TASK_PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;

export type TaskPriorityOption = (typeof TASK_PRIORITY_OPTIONS)[number];
