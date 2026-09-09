/**
 * `WorkflowToolbar` — undo/redo, tidy, save state, and Draft → Publish.
 *
 * THE SAVE INDICATOR IS THE POINT OF THE LEFT-HAND SIDE. The controller writes
 * on a 900 ms debounce, so between an edit and its write there is a window in
 * which the screen and the database disagree. A canvas that never says so
 * teaches the user that closing the tab is safe when it is not — and the
 * controller deliberately leaves `isDirty` TRUE after a failed save, so
 * "Unsaved changes" is honest in the failure case too, which is the case that
 * matters.
 *
 * PUBLISH IS DELIBERATELY NOT ONE CLICK FROM "SAVED". Publishing moves
 * `current_published_version_id`, and every consumer reads through that
 * pointer, so it is the act that puts a process into force for everyone. The
 * button therefore says what will happen ("Publish version N") rather than
 * "Save", and it is disabled while a draft is still settling — publishing mid-
 * debounce would freeze a version whose last edits are still in a timer. (The
 * controller flushes first as a second guard; this stops the user reaching for
 * it in the first place.)
 *
 * "DUPLICATE TO MY TENANT" APPEARS ONLY ON A TEMPLATE. A platform template is
 * readable by everyone and writable by almost nobody, so the useful action on
 * one is to take a copy — and offering "copy" beside "publish" on a workflow
 * the tenant already owns is two ways to do one thing.
 */

import { useCallback, type ReactNode } from 'react';

import type { WorkflowController } from '../hooks/useWorkflowController.js';
import { WORKFLOW_TOOLBAR_SURFACE, joinClassNames } from './chromeClasses.js';

export interface WorkflowToolbarProps {
  controller: WorkflowController;
  className?: string;
  /** Called after a successful duplicate, with the new definition's id. */
  onDuplicated?: (definitionId: string) => void;
  /** Extra controls in the reserved toolbar row (fullscreen). Not an overlay. */
  children?: ReactNode;
}

function saveStateLabel(controller: WorkflowController): string {
  if (controller.isSaving) return 'Saving…';
  if (controller.isDirty) return 'Unsaved changes';
  return 'All changes saved';
}

export function WorkflowToolbar({
  controller,
  className,
  onDuplicated,
  children,
}: WorkflowToolbarProps) {
  const { draft, definition, isPlatformTemplate, isReadOnly } = controller;

  const publish = useCallback(() => {
    void controller.publish();
  }, [controller]);

  const duplicate = useCallback(() => {
    void controller.duplicateToTenant().then((result) => {
      onDuplicated?.(result.definition.id);
    });
  }, [controller, onDuplicated]);

  const publishedVersionId = definition?.current_published_version_id ?? null;
  const draftIsAlreadyPublished = draft !== null && draft.id === publishedVersionId;

  return (
    <div
      className={joinClassNames(WORKFLOW_TOOLBAR_SURFACE, className)}
      data-testid="workflow-toolbar"
      data-workflow-region="toolbar"
    >
      <span
        className="px-1 text-xs text-muted-foreground"
        data-testid="workflow-save-state"
        // Announced rather than merely drawn: the state changes without the
        // user acting, which is exactly when a sighted user notices a quiet
        // label and a screen-reader user does not.
        role="status"
        aria-live="polite"
      >
        {saveStateLabel(controller)}
      </span>

      {isReadOnly ? null : (
        <>
          <button
            type="button"
            onClick={controller.undo}
            disabled={!controller.canUndo}
            className={buttonClass}
            data-testid="workflow-undo"
            title="Undo (Ctrl/Cmd+Z)"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={controller.redo}
            disabled={!controller.canRedo}
            className={buttonClass}
            data-testid="workflow-redo"
            title="Redo (Ctrl/Cmd+Shift+Z)"
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => controller.autoLayout()}
            className={buttonClass}
            data-testid="workflow-auto-layout"
            title="Lay the steps out along their lanes"
          >
            Tidy up
          </button>
        </>
      )}

      {isPlatformTemplate ? (
        <button
          type="button"
          onClick={duplicate}
          className={primaryButtonClass}
          data-testid="workflow-duplicate"
        >
          Copy to my organisation
        </button>
      ) : isReadOnly ? null : (
        <button
          type="button"
          onClick={publish}
          disabled={!draft || controller.isDirty || draftIsAlreadyPublished}
          className={primaryButtonClass}
          data-testid="workflow-publish"
          title={
            draftIsAlreadyPublished
              ? 'This version is already the published one.'
              : controller.isDirty
                ? 'Waiting for the last edit to save.'
                : 'Make this version the one everyone uses.'
          }
        >
          {draft ? `Publish version ${draft.version}` : 'Publish'}
        </button>
      )}
      {children ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

WorkflowToolbar.workflowRegion = 'toolbar' as const;

const buttonClass =
  'rounded-lg border border-border-interactive bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const primaryButtonClass =
  'rounded-lg border border-primary bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
