/**
 * FieldEditDialog — Phase 2 (v0.5.0) + Phase 3B (v0.7.0).
 *
 * Sibling of FieldCreateDialog for editing an existing
 * tenant_field_definitions row. Pre-populates every input from the `field`
 * prop, applies the same snake_case validation and uniqueness rules (while
 * excluding the field's own current name), exposes a Save Changes button,
 * and adds a "Delete field" action guarded by `window.confirm`.
 *
 * Kept intentionally symmetric with FieldCreateDialog: identical reducer
 * shape, identical render-time reset pattern (keyed on `field.id` so opening
 * the dialog for a different field always re-seeds the form), identical
 * validation helper, identical styling. This mirror-symmetry keeps unit
 * tests short and means future UX tweaks can be applied in one pass across
 * both dialogs.
 *
 * Rename semantics:
 * Editing `field_name` here is metadata-only by default; an opt-in
 * disclosure (§3.B — Phase 3B) allows also renaming the physical column via
 * a dry-run → confirm → wet-run flow. Without the opt-in, the underlying
 * Postgres column keeps its old name and raw-SQL consumers continue to work
 * against the old identifier. Metadata-driven widgets (Form Builder / Page
 * Builder) resolve through `tenant_field_definitions.field_name` and pick up
 * the new name immediately.
 */

import { Save, Trash2 } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { RenamePhysicalColumnResult } from '../service.js';
import type { FieldType, TenantFieldDefinition } from '../types.js';
import { useLightDismissDialog } from '../hooks/useLightDismissDialog.js';
import {
  FIELD_TYPE_OPTIONS,
  SNAKE_CASE_RE,
} from './FieldCreateDialog.js';

export interface FieldEditDialogPayload {
  field_name: string;
  field_type: FieldType;
  label: string;
  placeholder: string | null;
  is_required: boolean;
}

export interface FieldEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human-readable entity name; shown in the header. */
  entityLabel: string;
  /** snake_case underlying name; shown as a hint under the header. */
  entityName: string;
  /**
   * The field being edited. When null, nothing is rendered — parent
   * components should avoid mounting this dialog until they have a
   * concrete field to edit.
   */
  field: TenantFieldDefinition | null;
  /**
   * Lowercased list of field names already defined on the entity
   * (including the field being edited — the uniqueness check excludes
   * the row's own current name automatically).
   */
  existingFieldNames?: string[];
  onSave: (payload: FieldEditDialogPayload) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  /**
   * Phase 3B — opt-in physical-column rename. When provided, a disclosure
   * appears under the form whenever `field_name` differs from the initial
   * value. Callers must support both dry-run (preview) and wet-run
   * (execute) modes via the `opts.dryRun` flag; the dialog calls dry-run
   * first to populate the confirmation step and wet-run only after the
   * user confirms. When omitted, the disclosure is hidden and rename
   * remains metadata-only.
   */
  onRenamePhysical?: (
    newName: string,
    opts: { dryRun: boolean },
  ) => Promise<RenamePhysicalColumnResult>;

  /**
   * Whether a physical column rename can actually succeed for THIS entity.
   *
   * The disclosure used to appear whenever `onRenamePhysical` was supplied and
   * the name had changed — which is not the same question. `rename_physical_column`
   * refuses unless the entity's table is registered in
   * `schema_builder_physical_tables`, and measured on production 2026-09-01 that
   * allowlist holds 0 rows while 0 of 45 `tenant_entities` resolve to a real
   * `public.<name>` table at all. So the checkbox was offered on every field of
   * every entity and could not succeed for any of them: an inert control that
   * spent the user a confirmation step to reach a refusal.
   *
   * Undefined keeps the old behaviour, so an existing consumer is not silently
   * changed; pass `false` to hide the disclosure and let the rename take the
   * metadata path that actually works.
   */
  physicalRenameAvailable?: boolean;
}

interface FormState {
  fieldName: string;
  fieldType: FieldType;
  label: string;
  placeholder: string;
  isRequired: boolean;
  /** Phase 3B: user has ticked the "also rename Postgres column" checkbox. */
  physicalRenameRequested: boolean;
}

type FormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_LABEL'; value: string }
  | { type: 'SET_TYPE'; value: FieldType }
  | { type: 'SET_PLACEHOLDER'; value: string }
  | { type: 'TOGGLE_REQUIRED' }
  | { type: 'TOGGLE_PHYSICAL_RENAME' }
  | { type: 'INIT'; field: TenantFieldDefinition };

const EMPTY_STATE: FormState = {
  fieldName: '',
  fieldType: 'text',
  label: '',
  placeholder: '',
  isRequired: false,
  physicalRenameRequested: false,
};

/**
 * Mirror of FieldCreateDialog.normalizeName — kept as a private copy so the
 * two dialogs can evolve independently if the canonical name rules ever
 * diverge (e.g. if we allow dots for nested fields in the future).
 */
function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function initialStateFromField(field: TenantFieldDefinition): FormState {
  return {
    fieldName: field.field_name,
    fieldType: field.field_type as FieldType,
    label: field.label ?? field.field_name,
    placeholder: field.placeholder ?? '',
    isRequired: !!field.is_required,
    physicalRenameRequested: false,
  };
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, fieldName: normalizeName(action.value) };
    case 'SET_LABEL':
      return { ...state, label: action.value };
    case 'SET_TYPE':
      return { ...state, fieldType: action.value };
    case 'SET_PLACEHOLDER':
      return { ...state, placeholder: action.value };
    case 'TOGGLE_REQUIRED':
      return { ...state, isRequired: !state.isRequired };
    case 'TOGGLE_PHYSICAL_RENAME':
      return {
        ...state,
        physicalRenameRequested: !state.physicalRenameRequested,
      };
    case 'INIT':
      return initialStateFromField(action.field);
    default:
      return state;
  }
}

function validateFieldName(
  name: string,
  existingFieldNames: string[],
  ownName: string,
): string | null {
  if (name.length === 0) return 'Field name cannot be empty';
  if (name.length < 2) return 'Must be at least 2 characters';
  if (!SNAKE_CASE_RE.test(name)) {
    return 'Must be snake_case (lowercase letters, digits, underscore; must not start with a digit)';
  }
  const others = existingFieldNames
    .map((n) => n.toLowerCase())
    .filter((n) => n !== ownName.toLowerCase());
  if (others.includes(name.toLowerCase())) {
    return 'A field with this name already exists';
  }
  return null;
}

/**
 * Phase 3B — state machine for the two-phase physical rename flow.
 *
 *   idle            → no physical rename in progress
 *   running-dry     → awaiting dry-run RPC
 *   confirming      → dry-run returned; showing confirmation dialog
 *   running-wet     → user confirmed; awaiting wet-run RPC
 *   error           → dry-run OR wet-run failed; showing error inline
 */
type PhysicalRenameState =
  | { phase: 'idle' }
  | { phase: 'running-dry' }
  | { phase: 'confirming'; result: RenamePhysicalColumnResult }
  | { phase: 'running-wet'; result: RenamePhysicalColumnResult }
  | { phase: 'error'; message: string };

/**
 * Say what actually happened.
 *
 * Until 2026-09-01 every refusal rendered as "No physical table exists for this
 * entity; only the metadata name will change." Both halves were untrue for the
 * common case. `rename_physical_column` returned `no_physical_table` for ANY
 * unregistered entity, and its allowlist ships EMPTY — so that was the answer for
 * every entity, while the physical table usually did exist and was merely not
 * registered. The second half was untrue in every case: this branch returns
 * without performing any metadata rename, so nothing was renamed at all.
 *
 * The RPC now distinguishes the two (migration 20261101000000), and each message
 * below states the real situation and who can change it. A message that names the
 * wrong cause is worse than a vague one — it sends the user to fix something that
 * was never broken.
 */
export function refusalMessage(reason: string | undefined): string {
  switch (reason) {
    case 'table_not_registered':
      return (
        'This entity\'s table is not registered for physical column renames, so the ' +
        'column was left unchanged. A platform developer can register it. Renaming ' +
        'the field label instead is always available and affects only what this app ' +
        'displays.'
      );
    case 'no_physical_table':
      return (
        'This entity has no physical database table, so there is no column to rename. ' +
        'Renaming the field label instead affects only what this app displays.'
      );
    default:
      return 'The rename did not run, and the column was left unchanged.';
  }
}

export function FieldEditDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  field,
  existingFieldNames = [],
  onSave,
  onDelete,
  onRenamePhysical,
  physicalRenameAvailable,
}: FieldEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Backdrop click closes it, exactly as Escape does. `showModal()` gives
  // a backdrop ELEMENT, not backdrop-click dismissal — see the hook.
  useLightDismissDialog(dialogRef, open);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  const [state, dispatch] = useReducer(
    formReducer,
    field ? initialStateFromField(field) : EMPTY_STATE,
  );
  const [renameState, setRenameState] = useState<PhysicalRenameState>({
    phase: 'idle',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Render-time reset keyed on `field.id`: when the parent swaps this
  // dialog between different fields (or toggles from null -> a field),
  // re-seed the form so stale edits never leak across edit sessions.
  const fieldId = field?.id ?? null;
  const [prevFieldId, setPrevFieldId] = useState<string | null>(fieldId);
  if (prevFieldId !== fieldId) {
    setPrevFieldId(fieldId);
    if (field) dispatch({ type: 'INIT', field });
    setRenameState({ phase: 'idle' });
    setIsSubmitting(false);
  }

  // Native <dialog> imperative open/close — mirrors FieldCreateDialog.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Light dismiss for the confirm dialog, but NOT while the rename is actually
  // running. 'confirming' and 'error' are both states a user may safely back
  // out of; 'running-wet' is a rename in flight against the database, and
  // closing its dialog would hide an operation that is still happening rather
  // than stop it.
  useLightDismissDialog(
    confirmDialogRef,
    renameState.phase === 'confirming' || renameState.phase === 'error',
  );

  // Open / close the secondary confirm <dialog> based on rename state.
  useEffect(() => {
    const el = confirmDialogRef.current;
    if (!el) return;
    const shouldBeOpen =
      renameState.phase === 'confirming' ||
      renameState.phase === 'running-wet' ||
      renameState.phase === 'error';
    if (shouldBeOpen && !el.open) el.showModal();
    else if (!shouldBeOpen && el.open) el.close();
  }, [renameState.phase]);

  if (!field) return null;

  const ownName = field.field_name;
  const nameError = validateFieldName(
    state.fieldName,
    existingFieldNames,
    ownName,
  );
  const canSubmit =
    state.fieldName.length > 0 &&
    nameError === null &&
    !isSubmitting &&
    renameState.phase !== 'running-dry' &&
    renameState.phase !== 'running-wet';

  const fieldNameChanged = state.fieldName !== ownName;
  // `physicalRenameAvailable === false` hides it outright. `undefined` preserves
  // the previous behaviour for consumers that have not been updated.
  const showPhysicalDisclosure =
    typeof onRenamePhysical === 'function' &&
    fieldNameChanged &&
    physicalRenameAvailable !== false;

  const buildPayload = (): FieldEditDialogPayload => ({
    field_name: state.fieldName,
    field_type: state.fieldType,
    label: state.label.trim() || state.fieldName,
    placeholder: state.placeholder.trim() || null,
    is_required: state.isRequired,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    // Fast path: no physical rename requested — behave exactly like Phase 2.
    if (!state.physicalRenameRequested || !onRenamePhysical) {
      setIsSubmitting(true);
      try {
        await onSave(buildPayload());
      } catch {
        // Parent onSave owns the visible error sink; keep the dialog open.
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    // Phase 3B: dry-run first so the user sees the exact DDL + affected
    // views/policies before any destructive change runs.
    setRenameState({ phase: 'running-dry' });
    try {
      const result = await onRenamePhysical(state.fieldName, { dryRun: true });
      setRenameState({ phase: 'confirming', result });
    } catch (err) {
      setRenameState({
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleCancel = () => onOpenChange(false);

  const handleDelete = async () => {
    const displayName = field.label ?? field.field_name;
    const ok =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(
            `Delete field "${displayName}"? This cannot be undone.`,
          )
        : true;
    if (!ok) return;
    setIsSubmitting(true);
    try {
      await onDelete();
    } catch {
      // Parent onDelete owns the visible error sink; keep the dialog open.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmWetRun = async () => {
    if (renameState.phase !== 'confirming' || !onRenamePhysical) return;
    const dryResult = renameState.result;
    setRenameState({ phase: 'running-wet', result: dryResult });
    try {
      const wet = await onRenamePhysical(state.fieldName, { dryRun: false });
      if (!wet.executed) {
        setRenameState({ phase: 'error', message: refusalMessage(wet.reason) });
        return;
      }
      setRenameState({ phase: 'idle' });
      setIsSubmitting(true);
      try {
        await onSave(buildPayload());
      } catch {
        // Parent onSave owns the visible error sink; keep the dialog open.
      } finally {
        setIsSubmitting(false);
      }
    } catch (err) {
      setRenameState({
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleCancelConfirm = () => {
    setRenameState({ phase: 'idle' });
  };

  const confirmResult =
    renameState.phase === 'confirming' || renameState.phase === 'running-wet'
      ? renameState.result
      : null;

  return (
    <>
      <dialog
        ref={dialogRef}
        onClose={() => onOpenChange(false)}
        className="w-[min(520px,90vw)] rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-overlay/50"
        aria-labelledby="field-edit-dialog-title"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <h2
            id="field-edit-dialog-title"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <Save className="h-5 w-5 text-primary-text" aria-hidden="true" />
            Edit Field in {entityLabel}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Entity:{' '}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              {entityName}
            </code>
          </p>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="field-edit-name"
                className="block text-xs font-medium text-text-secondary"
              >
                Field Name
              </label>
              <input
                id="field-edit-name"
                type="text"
                autoFocus
                value={state.fieldName}
                onChange={(e) =>
                  dispatch({ type: 'SET_NAME', value: e.target.value })
                }
                aria-invalid={nameError !== null}
                aria-describedby={
                  nameError ? 'field-edit-name-error' : 'field-edit-name-hint'
                }
                aria-required="true"
                className={`w-full rounded-md border bg-card px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring ${
                  nameError
                    ? 'border-role-error'
                    : 'border-border'
                }`}
              />
              {nameError ? (
                <p
                  id="field-edit-name-error"
                  role="alert"
                  className="text-[10px] text-error-text"
                >
                  {nameError}
                </p>
              ) : (
                <p
                  id="field-edit-name-hint"
                  className="text-[10px] text-muted-foreground"
                >
                  Column identifier. Lowercase letters, digits, and underscores.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="field-edit-type"
                className="block text-xs font-medium text-text-secondary"
              >
                Field Type
              </label>
              <select
                id="field-edit-type"
                value={state.fieldType}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_TYPE',
                    value: e.target.value as FieldType,
                  })
                }
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="field-edit-label"
                className="block text-xs font-medium text-text-secondary"
              >
                Display Label
              </label>
              <input
                id="field-edit-label"
                type="text"
                value={state.label}
                onChange={(e) =>
                  dispatch({ type: 'SET_LABEL', value: e.target.value })
                }
                placeholder="Shown to end users"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-describedby="field-edit-label-hint"
              />
              <p
                id="field-edit-label-hint"
                className="text-[10px] text-muted-foreground"
              >
                Shown to end users in forms and tables.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="field-edit-placeholder"
                className="block text-xs font-medium text-text-secondary"
              >
                Placeholder (optional)
              </label>
              <input
                id="field-edit-placeholder"
                type="text"
                value={state.placeholder}
                onChange={(e) =>
                  dispatch({ type: 'SET_PLACEHOLDER', value: e.target.value })
                }
                placeholder="e.g. jane@example.com"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="field-edit-required"
                type="checkbox"
                checked={state.isRequired}
                onChange={() => dispatch({ type: 'TOGGLE_REQUIRED' })}
                className="h-4 w-4 rounded border-border-strong text-primary-text focus:ring-2 focus:ring-ring bg-muted"
              />
              <label
                htmlFor="field-edit-required"
                className="text-sm text-text-secondary"
              >
                Required field
              </label>
            </div>

            {showPhysicalDisclosure ? (
              <details
                className="rounded-md border border-role-warning/40 bg-role-warning/10 p-3"
                data-testid="field-edit-physical-disclosure"
              >
                <summary className="cursor-pointer text-xs font-medium text-warning-text">
                  Advanced: also rename the underlying Postgres column
                </summary>
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-warning-text">
                    Raw SQL queries and views referencing the old column name
                    will break. Metadata-driven widgets (Form Builder / Page
                    Builder) are unaffected.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      id="field-edit-rename-physical"
                      type="checkbox"
                      checked={state.physicalRenameRequested}
                      onChange={() =>
                        dispatch({ type: 'TOGGLE_PHYSICAL_RENAME' })
                      }
                      className="h-4 w-4 rounded border-role-warning text-warning-text focus:ring-2 focus:ring-role-warning bg-role-warning/10"
                    />
                    <label
                      htmlFor="field-edit-rename-physical"
                      className="text-xs text-warning-text"
                    >
                      Also rename the underlying Postgres column (advanced,
                      destructive)
                    </label>
                  </div>
                </div>
              </details>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-role-error/40 bg-card px-3 text-sm font-medium text-error-text hover:bg-role-error/10 focus:outline-none focus:ring-2 focus:ring-role-error dark:hover:bg-role-error/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Field
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-9 items-center rounded-md bg-role-primary px-4 text-sm font-medium text-text-on-primary hover:bg-role-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {renameState.phase === 'running-dry'
                  ? 'Checking\u2026'
                  : isSubmitting
                    ? 'Saving\u2026'
                    : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </dialog>

      {/* Phase 3B confirmation dialog — shown only when the user opted into
          the physical rename path. Renders the exact DDL + affected views /
          policies returned by the dry-run, and captures explicit consent
          before the wet-run ALTER TABLE is executed. */}
      <dialog
        ref={confirmDialogRef}
        onClose={handleCancelConfirm}
        className="w-[min(560px,92vw)] rounded-lg border border-role-warning/40 bg-card p-0 shadow-xl backdrop:bg-overlay/50"
        aria-labelledby="field-edit-confirm-title"
      >
        <div className="p-6">
          <h3
            id="field-edit-confirm-title"
            className="text-base font-semibold text-warning-text"
          >
            Confirm physical column rename
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            This will execute the following statement against the production
            database. It cannot be rolled back automatically.
          </p>

          {confirmResult ? (
            <div className="mt-4 space-y-3">
              <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[11px] text-foreground">
                {confirmResult.would_execute ?? '(no DDL returned)'}
              </pre>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Affected views ({confirmResult.affected_views?.length ?? 0})
                  </p>
                  {confirmResult.affected_views?.length ? (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-text-secondary">
                      {confirmResult.affected_views.map((v) => (
                        <li key={v} className="font-mono">
                          {v}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">None</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Affected policies (
                    {confirmResult.affected_policies?.length ?? 0})
                  </p>
                  {confirmResult.affected_policies?.length ? (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-text-secondary">
                      {confirmResult.affected_policies.map((p) => (
                        <li key={p} className="font-mono">
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">None</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {renameState.phase === 'error' ? (
            <div
              role="alert"
              className="mt-4 rounded-md border border-role-error/40 bg-role-error/10 p-3 text-[11px] text-error-text"
            >
              {renameState.message}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelConfirm}
              className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmWetRun}
              disabled={
                renameState.phase !== 'confirming' &&
                renameState.phase !== 'error'
              }
              className="inline-flex h-9 items-center rounded-md bg-role-warning px-4 text-sm font-medium text-text-on-warning hover:bg-role-warning focus:outline-none focus:ring-2 focus:ring-role-warning focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {renameState.phase === 'running-wet'
                ? 'Renaming\u2026'
                : 'Rename column'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
