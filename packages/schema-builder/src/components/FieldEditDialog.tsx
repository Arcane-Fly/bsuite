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
 * ⚠ Rename semantics (updated Phase 3B):
 * Editing `field_name` here updates the `tenant_field_definitions` metadata
 * row ONLY by default. An opt-in "Also rename the underlying Postgres column"
 * disclosure (shown only when the name changes) allows admins to also execute
 * an `ALTER TABLE ... RENAME COLUMN` via the `rename_physical_column` RPC.
 * The opt-in path:
 *   1. Calls the RPC with `p_dry_run = true` and shows a confirmation modal
 *      with the proposed SQL + affected objects (views, policies).
 *   2. On user confirm, calls the RPC with `p_dry_run = false` (wet-run).
 *   3. On cancel, dismisses the confirmation without making any changes.
 * The wet-run path requires the `onPreviewRename` prop to be wired and the
 * parent to handle `onSave({ ..., physical: true })` by calling the RPC.
 * Without `onPreviewRename`, the physical checkbox is hidden and the behaviour
 * is identical to Phase 2.
 */

import { AlertTriangle, Save, Trash2 } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { FieldType, RenamePreviewResult, TenantFieldDefinition } from '../types.js';
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
  /**
   * Phase 3B: when `true`, the parent should execute an
   * `ALTER TABLE ... RENAME COLUMN` in addition to updating the metadata row.
   * Passed through from the physical rename confirmation flow.
   */
  physical?: boolean;
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
  onSave: (payload: FieldEditDialogPayload) => void;
  onDelete: () => void;
  /**
   * Phase 3B: optional dry-run preview callback. When provided, the
   * "Also rename the underlying Postgres column" disclosure is shown
   * whenever the user edits `field_name`. The callback receives the
   * proposed new name and must return a `RenamePreviewResult` (or throw
   * on error). It is called when the user clicks Save with the physical
   * checkbox checked, before the confirmation modal is shown.
   *
   * If omitted, the physical rename disclosure is hidden and the
   * behaviour is identical to Phase 2.
   */
  onPreviewRename?: (newName: string) => Promise<RenamePreviewResult>;
}

interface FormState {
  fieldName: string;
  fieldType: FieldType;
  label: string;
  placeholder: string;
  isRequired: boolean;
}

type FormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_LABEL'; value: string }
  | { type: 'SET_TYPE'; value: FieldType }
  | { type: 'SET_PLACEHOLDER'; value: string }
  | { type: 'TOGGLE_REQUIRED' }
  | { type: 'INIT'; field: TenantFieldDefinition };

const EMPTY_STATE: FormState = {
  fieldName: '',
  fieldType: 'text',
  label: '',
  placeholder: '',
  isRequired: false,
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

/** Phase 3B — shape of the confirmation modal state. */
type ConfirmState =
  | { status: 'idle' }
  | { status: 'previewing' }
  | { status: 'ready'; preview: RenamePreviewResult; payload: FieldEditDialogPayload }
  | { status: 'error'; message: string };

export function FieldEditDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  field,
  existingFieldNames = [],
  onSave,
  onDelete,
  onPreviewRename,
}: FieldEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  const [state, dispatch] = useReducer(
    formReducer,
    field ? initialStateFromField(field) : EMPTY_STATE,
  );

  // Phase 3B: physical rename checkbox state + confirmation modal state.
  const [physicalChecked, setPhysicalChecked] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ status: 'idle' });

  // Render-time reset keyed on `field.id`: when the parent swaps this
  // dialog between different fields (or toggles from null -> a field),
  // re-seed the form so stale edits never leak across edit sessions.
  const fieldId = field?.id ?? null;
  const [prevFieldId, setPrevFieldId] = useState<string | null>(fieldId);
  if (prevFieldId !== fieldId) {
    setPrevFieldId(fieldId);
    if (field) dispatch({ type: 'INIT', field });
    setPhysicalChecked(false);
    setConfirmState({ status: 'idle' });
  }

  // Native <dialog> imperative open/close — mirrors FieldCreateDialog.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Phase 3B: open/close the confirmation modal imperatively.
  const confirmOpen = confirmState.status === 'ready';
  useEffect(() => {
    const el = confirmDialogRef.current;
    if (!el) return;
    if (confirmOpen && !el.open) el.showModal();
    else if (!confirmOpen && el.open) el.close();
  }, [confirmOpen]);

  if (!field) return null;

  const ownName = field.field_name;
  const nameError = validateFieldName(
    state.fieldName,
    existingFieldNames,
    ownName,
  );
  const canSubmit = state.fieldName.length > 0 && nameError === null;

  // Whether the user has changed the field name from its original value.
  const nameChanged = state.fieldName !== ownName;

  // Phase 3B: whether to show the physical rename disclosure.
  const showPhysicalDisclosure = nameChanged && onPreviewRename !== undefined;

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

    const payload = buildPayload();

    // Phase 3B: if the physical checkbox is checked and a preview callback
    // is available, run the dry-run first and show the confirmation modal.
    if (physicalChecked && onPreviewRename) {
      setConfirmState({ status: 'previewing' });
      try {
        const preview = await onPreviewRename(state.fieldName);
        setConfirmState({ status: 'ready', preview, payload });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Preview failed — try again.';
        setConfirmState({ status: 'error', message });
      }
      return;
    }

    // Default path: metadata-only save (Phase 2 behaviour preserved).
    onSave(payload);
  };

  const handleCancel = () => {
    setConfirmState({ status: 'idle' });
    onOpenChange(false);
  };

  const handleConfirmRename = () => {
    if (confirmState.status !== 'ready') return;
    const payload: FieldEditDialogPayload = {
      ...confirmState.payload,
      physical: true,
    };
    setConfirmState({ status: 'idle' });
    onSave(payload);
  };

  const handleCancelConfirm = () => {
    setConfirmState({ status: 'idle' });
  };

  const handleDelete = () => {
    const displayName = field.label ?? field.field_name;
    const ok =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(
            `Delete field "${displayName}"? This cannot be undone.`,
          )
        : true;
    if (ok) onDelete();
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        onClose={() => onOpenChange(false)}
        className="w-[min(520px,90vw)] rounded-lg border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/50 dark:border-neutral-700 dark:bg-neutral-900"
        aria-labelledby="field-edit-dialog-title"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <h2
            id="field-edit-dialog-title"
            className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            <Save className="h-5 w-5 text-blue-500" aria-hidden="true" />
            Edit Field in {entityLabel}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Entity:{' '}
            <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
              {entityName}
            </code>
          </p>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="field-edit-name"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
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
                className={`w-full rounded-md border bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 ${
                  nameError
                    ? 'border-red-500 dark:border-red-600'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              />
              {nameError ? (
                <p
                  id="field-edit-name-error"
                  role="alert"
                  className="text-[10px] text-red-600 dark:text-red-400"
                >
                  {nameError}
                </p>
              ) : (
                <p
                  id="field-edit-name-hint"
                  className="text-[10px] text-neutral-500 dark:text-neutral-400"
                >
                  Column identifier. Lowercase letters, digits, and underscores.
                </p>
              )}
            </div>

            {/* Phase 3B: physical rename disclosure — hidden when name is unchanged
                or when onPreviewRename is not wired. */}
            {showPhysicalDisclosure && (
              <details className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                  Also rename the underlying Postgres column (advanced, destructive)
                </summary>
                <div className="border-t border-amber-200 px-3 py-3 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <input
                      id="field-edit-physical"
                      type="checkbox"
                      checked={physicalChecked}
                      onChange={(e) => setPhysicalChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-2 focus:ring-amber-500 dark:border-amber-600"
                    />
                    <label
                      htmlFor="field-edit-physical"
                      className="text-xs text-amber-800 dark:text-amber-300"
                    >
                      Execute{' '}
                      <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900">
                        ALTER TABLE … RENAME COLUMN
                      </code>{' '}
                      on save
                    </label>
                  </div>
                  {physicalChecked && (
                    <p className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                      <AlertTriangle
                        className="mt-0.5 h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                      Raw SQL queries and views referencing the old column name
                      will break. Metadata-driven widgets (Form Builder / Page
                      Builder) are unaffected.
                    </p>
                  )}
                  {confirmState.status === 'previewing' && (
                    <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                      Fetching dry-run preview…
                    </p>
                  )}
                  {confirmState.status === 'error' && (
                    <p
                      role="alert"
                      className="mt-2 text-[10px] text-red-600 dark:text-red-400"
                    >
                      {confirmState.message}
                    </p>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-2">
              <label
                htmlFor="field-edit-type"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
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
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
                aria-describedby="field-edit-label-hint"
              />
              <p
                id="field-edit-label-hint"
                className="text-[10px] text-neutral-500 dark:text-neutral-400"
              >
                Shown to end users in forms and tables.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="field-edit-placeholder"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
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
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="field-edit-required"
                type="checkbox"
                checked={state.isRequired}
                onChange={() => dispatch({ type: 'TOGGLE_REQUIRED' })}
                className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800"
              />
              <label
                htmlFor="field-edit-required"
                className="text-sm text-neutral-700 dark:text-neutral-300"
              >
                Required field
              </label>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-red-300 bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-700 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Field
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || confirmState.status === 'previewing'}
                className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </dialog>

      {/* Phase 3B: confirmation modal — shown after a successful dry-run. */}
      <dialog
        ref={confirmDialogRef}
        onClose={handleCancelConfirm}
        className="w-[min(560px,95vw)] rounded-lg border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/50 dark:border-neutral-700 dark:bg-neutral-900"
        aria-labelledby="field-rename-confirm-title"
        data-testid="rename-confirm-dialog"
      >
        {confirmState.status === 'ready' && (
          <div className="p-6">
            <h3
              id="field-rename-confirm-title"
              className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              <AlertTriangle
                className="h-5 w-5 text-amber-500"
                aria-hidden="true"
              />
              Confirm column rename
            </h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Review the DDL that will be executed. This action cannot be
              undone.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  SQL to execute
                </p>
                <pre className="overflow-x-auto rounded-md bg-neutral-100 p-3 font-mono text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  {confirmState.preview.would_execute}
                </pre>
              </div>

              {confirmState.preview.affected_views.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                    Affected views ({confirmState.preview.affected_views.length})
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {confirmState.preview.affected_views.map((v) => (
                      <li key={v}>
                        <code>{v}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {confirmState.preview.affected_policies.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Policies on this table ({confirmState.preview.affected_policies.length})
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                    {confirmState.preview.affected_policies.map((p) => (
                      <li key={p}>
                        <code>{p}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                className="inline-flex h-9 items-center rounded-md bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
              >
                Rename Column
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
