/**
 * FieldCreateDialog — Phase 1c (v0.4.0).
 *
 * Replaces the `window.prompt` placeholder previously used by SchemaCanvas.
 * Native `<dialog>` (mirrors RelationshipConfigDialog + EntityPropertiesPanel
 * styling patterns) with snake_case validation, auto-filling Display Label,
 * all nine field types available via native <select>, and keyboard parity
 * (Enter submits, Esc closes via native dialog behaviour).
 */

import { PlusCircle } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import type { FieldType } from '../types.js';
import { useLightDismissDialog } from '../hooks/useLightDismissDialog.js';

export const SNAKE_CASE_RE = /^[a-z_][a-z0-9_]*$/;

export const FIELD_TYPE_OPTIONS: ReadonlyArray<{
  value: FieldType;
  label: string;
}> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean (true/false)' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Single-select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

export interface FieldCreateDialogPayload {
  field_name: string;
  field_type: FieldType;
  label: string;
  placeholder: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface FieldCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human-readable entity name; shown in the header. */
  entityLabel: string;
  /** snake_case underlying name; shown as a hint under the header. */
  entityName: string;
  /**
   * Lowercased list of field names already defined on the entity; used for
   * uniqueness validation so the Create button stays disabled when a
   * duplicate would be submitted.
   */
  existingFieldNames?: string[];
  /** Next `sort_order` value to assign (defaults to 0). */
  nextSortOrder?: number;
  onConfirm: (payload: FieldCreateDialogPayload) => void | Promise<void>;
}

interface FormState {
  fieldName: string;
  fieldType: FieldType;
  label: string;
  /** Tracks whether the user has manually edited the Label input. */
  labelEdited: boolean;
  placeholder: string;
  isRequired: boolean;
}

type FormAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_LABEL'; value: string }
  | { type: 'SET_TYPE'; value: FieldType }
  | { type: 'SET_PLACEHOLDER'; value: string }
  | { type: 'TOGGLE_REQUIRED' }
  | { type: 'RESET' };

const INITIAL_STATE: FormState = {
  fieldName: '',
  fieldType: 'text',
  label: '',
  labelEdited: false,
  placeholder: '',
  isRequired: false,
};

/**
 * Normalize raw input to match the canonical snake_case identifier shape.
 * Lowercase + replace any non-[a-z0-9_] char with an underscore so users can
 * paste PascalCase / kebab-case names without manually re-typing them.
 */
function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_NAME': {
      const normalized = normalizeName(action.value);
      return {
        ...state,
        fieldName: normalized,
        // Auto-mirror Label from field name until the user manually overrides
        // it. Once labelEdited is true we stop touching the label field.
        label: state.labelEdited ? state.label : normalized,
      };
    }
    case 'SET_LABEL':
      return { ...state, label: action.value, labelEdited: true };
    case 'SET_TYPE':
      return { ...state, fieldType: action.value };
    case 'SET_PLACEHOLDER':
      return { ...state, placeholder: action.value };
    case 'TOGGLE_REQUIRED':
      return { ...state, isRequired: !state.isRequired };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}

function validateFieldName(
  name: string,
  existingFieldNames: string[],
): string | null {
  if (name.length === 0) return null;
  if (name.length < 2) return 'Must be at least 2 characters';
  if (!SNAKE_CASE_RE.test(name)) {
    return 'Must be snake_case (lowercase letters, digits, underscore; must not start with a digit)';
  }
  if (existingFieldNames.includes(name.toLowerCase())) {
    return 'A field with this name already exists';
  }
  return null;
}

export function FieldCreateDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  existingFieldNames = [],
  nextSortOrder = 0,
  onConfirm,
}: FieldCreateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Backdrop click closes it, exactly as Escape does. `showModal()` gives
  // a backdrop ELEMENT, not backdrop-click dismissal — see the hook.
  useLightDismissDialog(dialogRef, open);
  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Render-time reset-on-reopen: when `open` flips false -> true, clear every
  // form field so a previous cancelled draft never bleeds into the next
  // session. Calling setState during render is the React-blessed pattern for
  // this — see EntityPropertiesPanel for the sibling usage.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open && !prevOpen) {
      dispatch({ type: 'RESET' });
      setIsSubmitting(false);
    }
  }

  // Native <dialog> imperative open/close — mirrors RelationshipConfigDialog.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const nameError = validateFieldName(state.fieldName, existingFieldNames);
  const canSubmit =
    state.fieldName.length > 0 && nameError === null && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        field_name: state.fieldName,
        field_type: state.fieldType,
        label: state.label.trim() || state.fieldName,
        placeholder: state.placeholder.trim() || null,
        is_required: state.isRequired,
        sort_order: nextSortOrder,
      });
    } catch {
      // Parent onConfirm owns the visible error sink; keep the dialog open.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onOpenChange(false)}
      className="w-[min(520px,90vw)] rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-overlay/50"
      aria-labelledby="field-create-dialog-title"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <h2
          id="field-create-dialog-title"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <PlusCircle className="h-5 w-5 text-primary-text" aria-hidden="true" />
          Add Field to {entityLabel}
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
              htmlFor="field-create-name"
              className="block text-xs font-medium text-text-secondary"
            >
              Field Name
            </label>
            <input
              id="field-create-name"
              type="text"
              autoFocus
              value={state.fieldName}
              onChange={(e) =>
                dispatch({ type: 'SET_NAME', value: e.target.value })
              }
              placeholder="e.g. contact_email"
              aria-invalid={nameError !== null}
              aria-describedby={
                nameError ? 'field-create-name-error' : 'field-create-name-hint'
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
                id="field-create-name-error"
                role="alert"
                className="text-[10px] text-error-text"
              >
                {nameError}
              </p>
            ) : (
              <p
                id="field-create-name-hint"
                className="text-[10px] text-muted-foreground"
              >
                Column identifier. Lowercase letters, digits, and underscores.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="field-create-type"
              className="block text-xs font-medium text-text-secondary"
            >
              Field Type
            </label>
            <select
              id="field-create-type"
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
              htmlFor="field-create-label"
              className="block text-xs font-medium text-text-secondary"
            >
              Display Label
            </label>
            <input
              id="field-create-label"
              type="text"
              value={state.label}
              onChange={(e) =>
                dispatch({ type: 'SET_LABEL', value: e.target.value })
              }
              placeholder="Auto-filled from field name"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-describedby="field-create-label-hint"
            />
            <p
              id="field-create-label-hint"
              className="text-[10px] text-muted-foreground"
            >
              Shown to end users in forms and tables.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="field-create-placeholder"
              className="block text-xs font-medium text-text-secondary"
            >
              Placeholder (optional)
            </label>
            <input
              id="field-create-placeholder"
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
              id="field-create-required"
              type="checkbox"
              checked={state.isRequired}
              onChange={() => dispatch({ type: 'TOGGLE_REQUIRED' })}
              className="h-4 w-4 rounded border-border-strong text-primary-text focus:ring-2 focus:ring-ring bg-muted"
            />
            <label
              htmlFor="field-create-required"
              className="text-sm text-text-secondary"
            >
              Required field
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
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
            {isSubmitting ? 'Creating…' : 'Create Field'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
