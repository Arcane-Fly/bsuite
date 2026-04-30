/**
 * Entity properties panel — canonical create/edit/delete surface for tenant
 * entities. Plain HTML + Tailwind (no shadcn) so the package has zero
 * design-system dependency; consumers theme via the neutral palette.
 *
 * Sync-from-prop uses the React-blessed render-time reset pattern: when the
 * incoming `entity` identity changes, we set state DURING render (not in a
 * useEffect) so the form resets atomically before the next paint. See
 * https://react.dev/reference/react/useState#storing-information-from-previous-renders
 */

import { Database, Save, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { APP_SCOPES, type AppScope, type TenantEntity } from '../types.js';

export interface EntityPropertiesPanelProps {
  /** `null` renders the panel in create mode. */
  entity: TenantEntity | null;
  /** Lowercase names already used in the scope, used for uniqueness validation. */
  existingNames?: string[];
  onClose: () => void;
  onSave: (updates: Partial<TenantEntity>) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

const DEFAULT_FORM: Partial<TenantEntity> = {
  name: '',
  label: '',
  description: '',
  is_system: false,
  app_scope: 'all',
};

const NAME_REGEX = /^[a-z][a-z0-9_]*$/;

function validateName(
  val: string,
  isEditing: boolean,
  existingNames: string[],
): string | null {
  if (val.length === 0) return null;
  if (val.length < 2) return 'Must be at least 2 characters';
  if (!NAME_REGEX.test(val)) {
    return 'Must start with a letter and contain only lowercase letters, digits, and underscores';
  }
  if (!isEditing && existingNames.includes(val)) {
    return 'An entity with this name already exists';
  }
  return null;
}

export function EntityPropertiesPanel({
  entity,
  existingNames = [],
  onClose,
  onSave,
  onDelete,
}: EntityPropertiesPanelProps) {
  const [formData, setFormData] = useState<Partial<TenantEntity>>(
    entity ?? DEFAULT_FORM,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  // Render-time reset: when the `entity.id` identity changes (including
  // null→entity or entity→null transitions), reset formData + nameError
  // BEFORE the next render completes. Calling setState during render is
  // explicitly supported by React for this pattern.
  const currentEntityId = entity?.id ?? null;
  const [prevEntityId, setPrevEntityId] = useState<string | null>(
    currentEntityId,
  );
  if (prevEntityId !== currentEntityId) {
    setPrevEntityId(currentEntityId);
    setFormData(entity ?? DEFAULT_FORM);
    setNameError(null);
  }

  // Native <dialog> confirm: imperatively open/close via showModal/close.
  useEffect(() => {
    const el = confirmDialogRef.current;
    if (!el) return;
    if (confirmDeleteOpen && !el.open) el.showModal();
    else if (!confirmDeleteOpen && el.open) el.close();
  }, [confirmDeleteOpen]);

  const isEditing = !!entity;
  const isSystem = entity?.is_system === true;

  const handleNameChange = (raw: string) => {
    const val = raw.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setFormData((p) => ({ ...p, name: val }));
    setNameError(validateName(val, isEditing, existingNames));
  };

  const canSave =
    !nameError && (isEditing ? true : !!formData.name && !!formData.label);

  return (
    <aside
      role="region"
      aria-label={entity ? `Edit Entity: ${entity.label}` : 'Create New Entity'}
      className="flex h-full w-80 shrink-0 flex-col border-l border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <Database className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
            {entity ? 'Edit Entity' : 'New Entity'}
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {isSystem
              ? 'System entities are read-only'
              : isEditing
                ? 'Configure schema node'
                : 'Create a new tenant entity'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close entity panel"
          className="-mr-1 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="sb-entity-label"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Display Label
            </label>
            <input
              id="sb-entity-label"
              type="text"
              value={formData.label ?? ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, label: e.target.value }))
              }
              placeholder="e.g. Company Vehicle"
              disabled={isSystem}
              aria-required={!isEditing}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:disabled:bg-neutral-800"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sb-entity-name"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Database Name
            </label>
            <input
              id="sb-entity-name"
              type="text"
              value={formData.name ?? ''}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. company_vehicle"
              disabled={isEditing /* immutable after creation */}
              aria-invalid={!!nameError}
              aria-describedby={
                nameError ? 'sb-entity-name-error' : 'sb-entity-name-hint'
              }
              aria-required={!isEditing}
              className={`w-full rounded-md border bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 dark:bg-neutral-900 dark:disabled:bg-neutral-800 ${
                nameError
                  ? 'border-red-500 dark:border-red-600'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            />
            {nameError ? (
              <p
                id="sb-entity-name-error"
                role="alert"
                className="text-[10px] text-red-600 dark:text-red-400"
              >
                {nameError}
              </p>
            ) : (
              <p
                id="sb-entity-name-hint"
                className="text-[10px] text-neutral-500 dark:text-neutral-400"
              >
                Used as the underlying table reference. Cannot be changed after
                creation.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sb-entity-description"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Description
            </label>
            <input
              id="sb-entity-description"
              type="text"
              value={formData.description ?? ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Brief description"
              disabled={isSystem}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:disabled:bg-neutral-800"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sb-entity-app-scope"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              App Visibility
            </label>
            <select
              id="sb-entity-app-scope"
              value={(formData.app_scope as AppScope) ?? 'all'}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  app_scope: e.target.value as AppScope,
                }))
              }
              disabled={isSystem}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:disabled:bg-neutral-800"
            >
              {APP_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope === 'all' ? 'All Apps' : scope.toUpperCase()}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              Controls which BSuite apps can see this entity.
            </p>
          </div>

          {isEditing && !isSystem && onDelete ? (
            <div className="border-t border-neutral-200 pt-5 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label={`Delete entity ${entity?.label ?? ''}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete Entity
              </button>
              <p className="mt-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400">
                Warning: this also removes all relationships involving this
                entity.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {!isSystem ? (
        <footer className="border-t border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
          <button
            type="button"
            onClick={() => onSave(formData)}
            disabled={!canSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isEditing ? 'Save Changes' : 'Create Entity'}
          </button>
        </footer>
      ) : null}

      <dialog
        ref={confirmDialogRef}
        onClose={() => setConfirmDeleteOpen(false)}
        className="w-[min(420px,90vw)] rounded-lg border border-neutral-200 bg-white p-6 shadow-xl backdrop:bg-black/50 dark:border-neutral-700 dark:bg-neutral-900"
        aria-labelledby="sb-confirm-delete-title"
      >
        <h3
          id="sb-confirm-delete-title"
          className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
        >
          Delete &ldquo;{entity?.label}&rdquo;?
        </h3>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          This permanently deletes the entity and every relationship attached
          to it. This action cannot be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(false)}
            className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDeleteOpen(false);
              if (entity) onDelete?.(entity.id);
            }}
            className="inline-flex h-9 items-center rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
          >
            Delete Entity
          </button>
        </div>
      </dialog>
    </aside>
  );
}
