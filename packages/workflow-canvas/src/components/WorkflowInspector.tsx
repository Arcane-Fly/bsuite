/**
 * `WorkflowInspector` — rename a step, describe it, delete it.
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
 * for anything else. The field therefore holds its own draft string and commits
 * on blur or Enter — one edit, one undo step, matching the drag rule the
 * controller already applies to a pointer-move stream.
 *
 * DELETE ASKS FIRST WHEN IT WOULD TAKE MORE THAN THE SELECTED NODE. Deleting a
 * lane deletes everything inside it (the controller removes orphans on purpose
 * — children of a missing parent render at the origin with a console warning,
 * which is a broken canvas rather than an error). Losing a lane's worth of
 * steps to one click, on a surface whose undo is real but not obvious, is the
 * kind of quiet loss this estate keeps finding after the fact.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { WorkflowController } from '../hooks/useWorkflowController.js';
import type { WorkflowNode } from '../types.js';

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
}

function readString(node: WorkflowNode | undefined, key: string): string {
  const value = node?.data?.[key];
  return typeof value === 'string' ? value : '';
}

export function WorkflowInspector({
  controller,
  selectedNodeId,
  className,
  onNodeDeleted,
  confirmDelete,
}: WorkflowInspectorProps) {
  const node = controller.nodes.find((n) => n.id === selectedNodeId);
  const committedLabel = readString(node, 'label');
  const committedDescription = readString(node, 'description');

  const [label, setLabel] = useState(committedLabel);
  const [description, setDescription] = useState(committedDescription);

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
  }, [committedDescription, committedLabel, selectedNodeId]);

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

  const kind = node.type ?? 'step';
  const descriptor = controller.registry.get(kind);
  const readOnly = controller.isReadOnly;

  return (
    <aside
      className={
        className ??
        'pointer-events-auto absolute bottom-3 right-3 z-10 w-72 rounded-xl border border-border bg-card p-3 shadow-md dark:shadow-[var(--glow-card,none)]'
      }
      data-testid="workflow-inspector"
      aria-label="Selected step"
    >
      <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {descriptor?.label ?? kind}
      </p>

      <label className="block text-xs font-medium text-foreground" htmlFor="workflow-node-label">
        Name
      </label>
      <input
        id="workflow-node-label"
        data-testid="workflow-inspector-label"
        value={label}
        readOnly={readOnly}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={commitLabel}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitLabel()
            ;(event.target as HTMLInputElement).blur()
          }
          if (event.key === 'Escape') {
            setLabel(committedLabel)
            ;(event.target as HTMLInputElement).blur()
          }
        }}
        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <label
        className="mt-3 block text-xs font-medium text-foreground"
        htmlFor="workflow-node-description"
      >
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
        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

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
