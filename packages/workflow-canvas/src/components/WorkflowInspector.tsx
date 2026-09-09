/**
 * `WorkflowInspector` — rename a step, describe it, set a terminator's role,
 * configure a step's action, delete it.
 *
 * INLINE, NOT A MODAL. See the original rationale below for renaming; the same
 * reasoning is why a terminator's role and a step's action are edited beside
 * the canvas rather than behind a dialog.
 *
 * INLINE RENAME, NOT A MODAL. Renaming a step is the single most common edit on
 * a process diagram and it is a correction, not a decision: the user is looking
 * at the card, they can see it is wrong, and a dialog that hides the diagram to
 * fix one word costs the round trip as well as the typing. The field sits
 * beside the canvas and writes through `updateNodeData`, so the card updates as
 * they type and the same 900 ms debounce persists it.
 *
 * A KEYSTROKE IS NOT AN UNDO STEP. `updateNodeData` checkpoints, which would
 * put one undo entry per character on a 50-slot stack and make Ctrl+Z useless
 * for anything else. Every text field therefore holds its own draft string and
 * commits on blur or Enter — one edit, one undo step, matching the drag rule
 * the controller already applies to a pointer-move stream. A discrete control
 * (the role buttons, the action-kind picker, the priority picker) has no
 * keystroke stream to debounce, so it commits immediately on change — that is
 * still one user action per commit.
 *
 * THE ACTION OBJECT IS REPLACED WHOLE ON EVERY COMMIT, NOT PATCHED FIELD BY
 * FIELD. `updateNodeData` shallow-merges `patch` into `node.data` (see
 * `useWorkflowController.ts`), so `node.data.action` itself has no per-key
 * merge — writing `{ action: { message: next } }` would silently drop
 * `title`/`priority`/`to` that were set moments before. Every action-field
 * commit here therefore spreads the CURRENT `action` object first. The bridge
 * migration (`workflow_run_advance`) reads `node.data.action ∥ {kind: ...}` —
 * an OR, not a merge — so whenever `action` is set it MUST carry its own
 * `kind`, or the processor sees `Unknown action kind: undefined` and fails the
 * step outright.
 *
 * DELETE ASKS FIRST WHEN IT WOULD TAKE MORE THAN THE SELECTED NODE. Deleting a
 * lane deletes everything inside it (the controller removes orphans on purpose
 * — children of a missing parent render at the origin with a console warning,
 * which is a broken canvas rather than an error). Losing a lane's worth of
 * steps to one click, on a surface whose undo is real but not obvious, is the
 * kind of quiet loss this estate keeps finding after the fact.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  TASK_PRIORITY_OPTIONS,
  WORKFLOW_ACTION_VOCABULARY,
  actionVocabularyEntry,
  describeUnmetRequirement,
  unmetActionRequirement,
} from '../actionVocabulary.js';
import type { WorkflowActionContext } from '../actionVocabulary.js';
import type { WorkflowController } from '../hooks/useWorkflowController.js';
import { terminatorRole } from '../nodes/TerminatorNode.js';
import type { TerminatorRole, WorkflowNode } from '../types.js';
import { WORKFLOW_INSPECTOR_SURFACE, joinClassNames } from './chromeClasses.js';

export interface WorkflowAssigneeOption {
  id: string;
  label: string;
}

export interface WorkflowEmailTemplateOption {
  key: string;
  label: string;
}

export interface WorkflowInspectorProps {
  controller: WorkflowController;
  /** The node being inspected. Nothing renders when there is none. */
  selectedNodeId: string | null;
  className?: string;
  /** Told when the inspected node is deleted, so a consumer can clear selection. */
  onNodeDeleted?: (nodeId: string) => void;
  /**
   * Asks the user to confirm a delete that removes more than the node itself.
   * Defaults to `window.confirm`. Injected so a test can assert the QUESTION
   * was asked rather than stubbing a global.
   */
  confirmDelete?: (message: string) => boolean;
  /**
   * What the workflow's subject actually is, so the action picker can gate a
   * kind the processor cannot execute against it (e.g. `send_email` needs a
   * candidate). Absent = ungated, same as before this prop existed.
   */
  actionContext?: WorkflowActionContext;
  /** A real picker for the assignee field. Absent keeps the raw-UUID input. */
  assigneeOptions?: WorkflowAssigneeOption[];
  /** A real picker for the email template field. Absent keeps the raw-key input. */
  emailTemplateOptions?: WorkflowEmailTemplateOption[];
}

const FIELD_CLASS =
  'mt-1 w-full rounded-lg border border-border-interactive bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const LABEL_CLASS = 'block text-xs font-medium text-foreground';

function readString(node: WorkflowNode | undefined, key: string): string {
  const value = node?.data?.[key];
  return typeof value === 'string' ? value : '';
}

function readActionRecord(node: WorkflowNode | undefined): Record<string, unknown> {
  const value = node?.data?.['action'];
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** The first string in a `to` that may be a single value or an array — used
 * only to seed a draft field; the commit path never re-derives from this. */
function firstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

/** Commits on Enter (and blurs), restores the committed value on Escape. */
function commitOnEnterOrEscape(
  commit: () => void,
  restore: () => void,
): (event: React.KeyboardEvent<HTMLInputElement>) => void {
  return (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      restore();
      event.currentTarget.blur();
    }
  };
}

function roleButtonClass(active: boolean): string {
  return active
    ? 'flex-1 rounded-lg border border-primary bg-primary/10 px-2 py-1 text-xs font-medium text-foreground'
    : 'flex-1 rounded-lg border border-border-interactive bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent';
}

export function WorkflowInspector({
  controller,
  selectedNodeId,
  className,
  onNodeDeleted,
  confirmDelete,
  actionContext,
  assigneeOptions,
  emailTemplateOptions,
}: WorkflowInspectorProps) {
  const node = controller.nodes.find((n) => n.id === selectedNodeId);
  const kind = node?.type ?? 'step';
  const readOnly = controller.isReadOnly;

  const committedLabel = readString(node, 'label');
  const committedDescription = readString(node, 'description');
  const committedRole: TerminatorRole = terminatorRole(node?.data);

  const committedActionKind = readString(node, 'actionKey');
  const committedAction = readActionRecord(node);
  const committedMessage = typeof committedAction.message === 'string' ? committedAction.message : '';
  const committedTitle = typeof committedAction.title === 'string' ? committedAction.title : '';
  const committedPriority =
    typeof committedAction.priority === 'string' ? committedAction.priority : '';
  const committedAssignee = firstString(committedAction.to);
  const committedTemplateKey =
    typeof committedAction.template_key === 'string' ? committedAction.template_key : '';
  const committedEmailTo = firstString(committedAction.to);

  const [label, setLabel] = useState(committedLabel);
  const [description, setDescription] = useState(committedDescription);
  const [actionMessage, setActionMessage] = useState(committedMessage);
  const [actionTitle, setActionTitle] = useState(committedTitle);
  const [actionAssignee, setActionAssignee] = useState(committedAssignee);
  const [actionTemplateKey, setActionTemplateKey] = useState(committedTemplateKey);
  const [actionTo, setActionTo] = useState(committedEmailTo);

  // Re-seed when the SELECTION changes, not on every render of the same node:
  // re-seeding while the user types would fight the caret. Keyed on the node id
  // so an external change (a realtime update, an undo) to the same node still
  // does not discard what is half-typed in the field.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (seededFor.current === selectedNodeId) return;
    seededFor.current = selectedNodeId;
    setLabel(committedLabel);
    setDescription(committedDescription);
    setActionMessage(committedMessage);
    setActionTitle(committedTitle);
    setActionAssignee(committedAssignee);
    setActionTemplateKey(committedTemplateKey);
    setActionTo(committedEmailTo);
  }, [
    committedDescription,
    committedLabel,
    committedMessage,
    committedTitle,
    committedAssignee,
    committedTemplateKey,
    committedEmailTo,
    selectedNodeId,
  ]);

  const commit = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedNodeId) return;
      controller.updateNodeData(selectedNodeId, patch);
    },
    [controller, selectedNodeId],
  );

  const commitLabel = useCallback(() => {
    const next = label.trim();
    // An empty label renders as "Untitled step" and is almost never what the
    // user meant; refusing the blank and restoring what was there is kinder
    // than saving a card nobody can identify.
    if (next.length === 0) {
      setLabel(committedLabel);
      return;
    }
    if (next !== committedLabel) commit({ label: next });
  }, [commit, committedLabel, label]);

  const commitDescription = useCallback(() => {
    if (description !== committedDescription) commit({ description });
  }, [commit, committedDescription, description]);

  const commitRole = useCallback(
    (role: TerminatorRole) => {
      if (role === committedRole) return;
      commit({ role });
    },
    [commit, committedRole],
  );

  /**
   * Every action-field commit spreads the CURRENT action object and re-asserts
   * `kind` — see the file header for why both of those are load-bearing.
   */
  const commitActionPatch = useCallback(
    (patch: Record<string, unknown>) => {
      if (!committedActionKind) return;
      const merged: Record<string, unknown> = {
        ...committedAction,
        kind: committedActionKind,
        ...patch,
      };
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(merged)) {
        // A key drops out ONLY when THIS patch just blanked it — an untouched
        // key the user never edited (an extension field, or one this package
        // doesn't know about) is kept byte-for-byte, including null/''/false/0.
        const blankedByThisPatch =
          Object.prototype.hasOwnProperty.call(patch, k) && (v === '' || v === undefined || v === null);
        if (blankedByThisPatch) continue;
        next[k] = v;
      }
      commit({ action: next });
    },
    [commit, committedAction, committedActionKind],
  );

  const commitActionKind = useCallback(
    (nextKind: string) => {
      if (nextKind === committedActionKind) return;
      if (nextKind === '') {
        commit({ actionKey: undefined, action: undefined });
        return;
      }
      // The other kind's fields are kept, not wiped — switching back after a
      // wrong pick should not cost what was already typed, and an unfamiliar
      // key here is preserved exactly like an unfamiliar key anywhere else.
      commit({ actionKey: nextKind, action: { ...committedAction, kind: nextKind } });
    },
    [commit, committedAction, committedActionKind],
  );

  const commitMessage = useCallback(() => {
    const next = actionMessage.trim();
    if (next !== committedMessage) commitActionPatch({ message: next });
  }, [actionMessage, commitActionPatch, committedMessage]);

  const commitTitle = useCallback(() => {
    const next = actionTitle.trim();
    if (next !== committedTitle) commitActionPatch({ title: next });
  }, [actionTitle, commitActionPatch, committedTitle]);

  const commitAssignee = useCallback(() => {
    const next = actionAssignee.trim();
    if (next !== committedAssignee) commitActionPatch({ to: next });
  }, [actionAssignee, commitActionPatch, committedAssignee]);

  const commitTemplateKey = useCallback(() => {
    const next = actionTemplateKey.trim();
    if (next !== committedTemplateKey) commitActionPatch({ template_key: next });
  }, [actionTemplateKey, commitActionPatch, committedTemplateKey]);

  const commitTo = useCallback(() => {
    const next = actionTo.trim();
    if (next !== committedEmailTo) commitActionPatch({ to: next });
  }, [actionTo, commitActionPatch, committedEmailTo]);

  const commitPriority = useCallback(
    (value: string) => {
      commitActionPatch({ priority: value });
    },
    [commitActionPatch],
  );

  const remove = useCallback(() => {
    if (!node || !selectedNodeId) return;
    const childCount = controller.nodes.filter((n) => n.parentId === selectedNodeId).length;
    if (childCount > 0) {
      const ask = confirmDelete ?? ((message: string) => window.confirm(message));
      const ok = ask(
        `Deleting "${committedLabel}" also deletes the ${childCount} step${
          childCount === 1 ? '' : 's'
        } inside it. Delete anyway?`,
      );
      if (!ok) return;
    }
    controller.deleteNode(selectedNodeId);
    onNodeDeleted?.(selectedNodeId);
  }, [committedLabel, confirmDelete, controller, node, onNodeDeleted, selectedNodeId]);

  if (!node) return null;

  const descriptor = controller.registry.get(kind);
  const selectedVocabEntry = actionVocabularyEntry(committedActionKind);

  return (
    <aside
      className={joinClassNames(WORKFLOW_INSPECTOR_SURFACE, className)}
      data-testid="workflow-inspector"
      data-workflow-region="inspector"
      aria-label="Selected step"
    >
      <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {descriptor?.label ?? kind}
      </p>

      <label className={LABEL_CLASS} htmlFor="workflow-node-label">
        Name
      </label>
      <input
        id="workflow-node-label"
        data-testid="workflow-inspector-label"
        value={label}
        readOnly={readOnly}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={commitLabel}
        onKeyDown={commitOnEnterOrEscape(commitLabel, () => setLabel(committedLabel))}
        className={FIELD_CLASS}
      />

      <label className={`mt-3 ${LABEL_CLASS}`} htmlFor="workflow-node-description">
        Notes
      </label>
      <textarea
        id="workflow-node-description"
        data-testid="workflow-inspector-description"
        value={description}
        readOnly={readOnly}
        rows={3}
        onChange={(event) => setDescription(event.target.value)}
        onBlur={commitDescription}
        className={FIELD_CLASS}
      />

      {kind === 'terminator' ? (
        <div className="mt-3">
          <p className={LABEL_CLASS}>Role</p>
          <div className="mt-1 flex gap-2" role="radiogroup" aria-label="Terminator role">
            <button
              type="button"
              role="radio"
              aria-checked={committedRole === 'start'}
              data-testid="workflow-inspector-role-start"
              disabled={readOnly}
              onClick={() => commitRole('start')}
              className={roleButtonClass(committedRole === 'start')}
            >
              Start
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={committedRole === 'end'}
              data-testid="workflow-inspector-role-end"
              disabled={readOnly}
              onClick={() => commitRole('end')}
              className={roleButtonClass(committedRole === 'end')}
            >
              End
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            A start only sends; an end only receives. A process needs exactly one start before it
            can publish.
          </p>
        </div>
      ) : null}

      {kind === 'step' ? (
        <div className="mt-3">
          <label className={LABEL_CLASS} htmlFor="workflow-node-action-kind">
            Action
          </label>
          <select
            id="workflow-node-action-kind"
            data-testid="workflow-inspector-action-kind"
            value={committedActionKind}
            disabled={readOnly}
            onChange={(event) => commitActionKind(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">No action — a manual step</option>
            {WORKFLOW_ACTION_VOCABULARY.map((entry) => {
              const unmet = unmetActionRequirement(entry, actionContext);
              return (
                <option key={entry.kind} value={entry.kind} disabled={unmet !== null}>
                  {entry.implemented ? entry.label : `${entry.label} (not automated yet)`}
                  {unmet !== null ? ' (unavailable here)' : ''}
                </option>
              );
            })}
          </select>

          {selectedVocabEntry && !selectedVocabEntry.implemented ? (
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--color-warning, currentColor)' }}
              data-testid="workflow-inspector-action-not-automated"
            >
              Not automated yet — {selectedVocabEntry.notAutomatedReason}. The step will save, but
              the processor records it as skipped rather than performing it.
            </p>
          ) : null}

          {actionContext ? (
            <ul className="mt-1 space-y-1" data-testid="workflow-inspector-action-unavailable-reasons">
              {WORKFLOW_ACTION_VOCABULARY.map((entry) => {
                const unmet = unmetActionRequirement(entry, actionContext);
                // The currently-selected kind gets its own dedicated notice below,
                // right where the rest of its fields render — no need to repeat it here.
                if (unmet === null || entry.kind === committedActionKind) return null;
                return (
                  <li
                    key={entry.kind}
                    className="text-xs"
                    style={{ color: 'var(--color-warning, currentColor)' }}
                    data-testid={`workflow-inspector-action-unavailable-${entry.kind}`}
                  >
                    {entry.label}: {describeUnmetRequirement(entry, unmet, actionContext)}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {selectedVocabEntry && actionContext ? (
            (() => {
              const unmet = unmetActionRequirement(selectedVocabEntry, actionContext);
              if (unmet === null) return null;
              return (
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'var(--color-error, currentColor)' }}
                  data-testid="workflow-inspector-action-unavailable-selected"
                >
                  {describeUnmetRequirement(selectedVocabEntry, unmet, actionContext)}
                </p>
              );
            })()
          ) : null}

          {committedActionKind === 'notify_internal' ? (
            <div className="mt-2 space-y-2">
              <div>
                <label className={LABEL_CLASS} htmlFor="workflow-node-action-message">
                  Message *
                </label>
                <textarea
                  id="workflow-node-action-message"
                  data-testid="workflow-inspector-action-message"
                  value={actionMessage}
                  readOnly={readOnly}
                  rows={2}
                  maxLength={500}
                  onChange={(event) => setActionMessage(event.target.value)}
                  onBlur={commitMessage}
                  className={FIELD_CLASS}
                />
                {actionMessage.trim().length === 0 ? (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--color-error, currentColor)' }}
                    data-testid="workflow-inspector-action-message-required"
                  >
                    Required — the processor refuses an empty message.
                  </p>
                ) : null}
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="workflow-node-action-title">
                  Title (optional)
                </label>
                <input
                  id="workflow-node-action-title"
                  data-testid="workflow-inspector-action-title"
                  value={actionTitle}
                  readOnly={readOnly}
                  onChange={(event) => setActionTitle(event.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={commitOnEnterOrEscape(commitTitle, () => setActionTitle(committedTitle))}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="workflow-node-action-priority">
                  Priority
                </label>
                <select
                  id="workflow-node-action-priority"
                  data-testid="workflow-inspector-action-priority"
                  value={committedPriority}
                  disabled={readOnly}
                  onChange={(event) => commitPriority(event.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">Medium (default)</option>
                  {TASK_PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority[0].toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="workflow-node-action-assignee">
                  {assigneeOptions ? 'Assignee (optional)' : 'Assignee user id'}
                </label>
                {assigneeOptions ? (
                  <select
                    id="workflow-node-action-assignee"
                    data-testid="workflow-inspector-action-assignee"
                    value={committedAssignee}
                    disabled={readOnly}
                    onChange={(event) => commitActionPatch({ to: event.target.value })}
                    className={FIELD_CLASS}
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                    {committedAssignee &&
                    !assigneeOptions.some((option) => option.id === committedAssignee) ? (
                      <option value={committedAssignee} disabled>
                        {committedAssignee}
                      </option>
                    ) : null}
                  </select>
                ) : (
                  <>
                    <input
                      id="workflow-node-action-assignee"
                      data-testid="workflow-inspector-action-assignee"
                      value={actionAssignee}
                      readOnly={readOnly}
                      placeholder="User UUID"
                      onChange={(event) => setActionAssignee(event.target.value)}
                      onBlur={commitAssignee}
                      onKeyDown={commitOnEnterOrEscape(commitAssignee, () =>
                        setActionAssignee(committedAssignee),
                      )}
                      className={FIELD_CLASS}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      A list of assignees is not available yet — paste a user&apos;s UUID to assign
                      the task, or leave this blank for the tenant queue.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {committedActionKind === 'send_email' ? (
            <div className="mt-2 space-y-2">
              <div>
                <label className={LABEL_CLASS} htmlFor="workflow-node-action-template">
                  {emailTemplateOptions ? 'Template' : 'Email template key'}
                </label>
                {emailTemplateOptions ? (
                  <select
                    id="workflow-node-action-template"
                    data-testid="workflow-inspector-action-template-key"
                    value={committedTemplateKey}
                    disabled={readOnly}
                    onChange={(event) => commitActionPatch({ template_key: event.target.value })}
                    className={FIELD_CLASS}
                  >
                    <option value="">Choose a template</option>
                    {emailTemplateOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                    {committedTemplateKey &&
                    !emailTemplateOptions.some((option) => option.key === committedTemplateKey) ? (
                      <option value={committedTemplateKey} disabled>
                        {committedTemplateKey}
                      </option>
                    ) : null}
                  </select>
                ) : (
                  <>
                    <input
                      id="workflow-node-action-template"
                      data-testid="workflow-inspector-action-template-key"
                      value={actionTemplateKey}
                      readOnly={readOnly}
                      onChange={(event) => setActionTemplateKey(event.target.value)}
                      onBlur={commitTemplateKey}
                      onKeyDown={commitOnEnterOrEscape(commitTemplateKey, () =>
                        setActionTemplateKey(committedTemplateKey),
                      )}
                      className={FIELD_CLASS}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      A list of templates is not available yet — paste the template&apos;s key.
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="workflow-node-action-to">
                  To
                </label>
                <input
                  id="workflow-node-action-to"
                  data-testid="workflow-inspector-action-to"
                  value={actionTo}
                  readOnly={readOnly}
                  onChange={(event) => setActionTo(event.target.value)}
                  onBlur={commitTo}
                  onKeyDown={commitOnEnterOrEscape(commitTo, () => setActionTo(committedEmailTo))}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {readOnly ? (
        <p className="mt-3 text-xs text-muted-foreground">
          This workflow belongs to another organisation, so it cannot be edited here.
        </p>
      ) : (
        <button
          type="button"
          onClick={remove}
          data-testid="workflow-inspector-delete"
          className="mt-3 w-full rounded-lg border px-2 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ borderColor: 'var(--color-error, currentColor)', color: 'var(--color-error, currentColor)' }}
        >
          Delete this step
        </button>
      )}
    </aside>
  );
}

WorkflowInspector.workflowRegion = 'inspector' as const;
