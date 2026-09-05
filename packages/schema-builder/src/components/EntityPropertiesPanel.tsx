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
import { useLightDismissDialog } from '../hooks/useLightDismissDialog.js';

export interface EntityPropertiesPanelProps {
  /** `null` renders the panel in create mode. */
  entity: TenantEntity | null;
  /** Lowercase names already used in the scope, used for uniqueness validation. */
  existingNames?: string[];
  onClose: () => void;
  onSave: (updates: Partial<TenantEntity>) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  /**
   * True when the signed-in user is a platform developer. Unlocks label and
   * description on a PLATFORM-owned system entity — the one edit that role is
   * permitted to make, routed through the audited
   * `update_platform_entity_label` RPC. The database enforces this
   * independently, so forcing the prop true client-side yields 42501.
   */
  isPlatformDeveloper?: boolean;
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
  isPlatformDeveloper,
}: EntityPropertiesPanelProps) {
  const [formData, setFormData] = useState<Partial<TenantEntity>>(
    entity ?? DEFAULT_FORM,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);

  // Backdrop click closes it, exactly as Escape does. `showModal()` gives
  // a backdrop ELEMENT, not backdrop-click dismissal — see the hook.
  useLightDismissDialog(confirmDialogRef, confirmDeleteOpen);

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

  // Platform-owned rows are shared by every tenant, so they stay locked for
  // everyone EXCEPT a platform developer, and even then only for the two
  // descriptive fields. Structural attributes (name, is_system, app_scope) stay
  // migration-owned regardless of role: a slip there changes the product for
  // all tenants at once.
  const isPlatformOwned = entity != null && entity.tenant_id === null;
  const canEditPlatformCopy = isPlatformOwned && isPlatformDeveloper === true;
  const descriptiveLocked = isSystem && !canEditPlatformCopy;

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
      className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card shadow-lg"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Database className="h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
            {entity ? 'Edit Entity' : 'New Entity'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
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
          className="-mr-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted dark:hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-5">
          {isSystem ? (
            <p
              className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-text-secondary"
              role="note"
            >
              {canEditPlatformCopy
                ? 'Platform entity — every tenant sees this. As a platform developer you may edit its label and description; the change is recorded in the platform schema audit. Structure stays migration-owned.'
                : 'Platform entity — managed by BSuite and shared across all tenants, so its details are read-only here. You can still rearrange it on the canvas, and add your own fields to it.'}
            </p>
          ) : null}
          <div className="space-y-2">
            <label
              htmlFor="sb-entity-label"
              className="block text-xs font-medium text-text-secondary"
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
              disabled={descriptiveLocked}
              aria-required={!isEditing}
              className="w-full rounded-md border border-border-interactive bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-card disabled:text-muted-foreground dark:disabled:bg-muted"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sb-entity-name"
              className="block text-xs font-medium text-text-secondary"
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
              className={`w-full rounded-md border bg-card px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-card disabled:text-muted-foreground dark:disabled:bg-muted ${
                nameError
                  ? 'border-role-error'
                  : 'border-border-interactive'
              }`}
            />
            {nameError ? (
              <p
                id="sb-entity-name-error"
                role="alert"
                className="text-[10px] text-error-text"
              >
                {nameError}
              </p>
            ) : (
              <p
                id="sb-entity-name-hint"
                className="text-[10px] text-muted-foreground"
              >
                Used as the underlying table reference. Cannot be changed after
                creation.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sb-entity-description"
              className="block text-xs font-medium text-text-secondary"
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
              disabled={descriptiveLocked}
              className="w-full rounded-md border border-border-interactive bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-card disabled:text-muted-foreground dark:disabled:bg-muted"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sb-entity-app-scope"
              className="block text-xs font-medium text-text-secondary"
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
              className="w-full rounded-md border border-border-interactive bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-card disabled:text-muted-foreground dark:disabled:bg-muted"
            >
              {APP_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope === 'all' ? 'All Apps' : scope.toUpperCase()}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Controls which BSuite apps can see this entity.
            </p>
          </div>

          {isEditing && !isSystem && onDelete ? (
            <div className="border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label={`Delete entity ${entity?.label ?? ''}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-role-error/30 bg-role-error/10 px-4 py-2 text-sm font-medium text-error-text hover:bg-role-error/20 focus:outline-none focus:ring-2 focus:ring-role-error"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete Entity
              </button>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Warning: this also removes all relationships involving this
                entity.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/*
        The footer must also render for a platform developer editing a platform
        entity. Gating it on `!isSystem` alone shipped the developer-edit feature
        DEAD: the label/description inputs unlocked, and there was no control to
        submit them. That is the same built-but-unwired defect this whole change
        set exists to remove, reintroduced one commit later.
      */}
      {!isSystem || canEditPlatformCopy ? (
        <footer className="border-t border-border bg-card/70 p-4">
          <button
            type="button"
            onClick={() => onSave(formData)}
            disabled={!canSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-role-primary px-4 py-2 text-sm font-medium text-text-on-primary hover:bg-role-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isEditing ? 'Save Changes' : 'Create Entity'}
          </button>
        </footer>
      ) : null}

      <dialog
        ref={confirmDialogRef}
        onClose={() => setConfirmDeleteOpen(false)}
        className="w-[min(420px,90vw)] rounded-lg border border-border bg-card p-6 shadow-xl backdrop:bg-overlay/50"
        aria-labelledby="sb-confirm-delete-title"
      >
        <h3
          id="sb-confirm-delete-title"
          className="text-base font-semibold text-foreground"
        >
          Delete &ldquo;{entity?.label}&rdquo;?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This permanently deletes the entity and every relationship attached
          to it. This action cannot be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(false)}
            className="inline-flex h-9 items-center rounded-md border border-border-interactive bg-card px-4 text-sm font-medium hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDeleteOpen(false);
              if (entity) onDelete?.(entity.id);
            }}
            className="inline-flex h-9 items-center rounded-md bg-role-error px-4 text-sm font-medium text-text-on-error hover:bg-role-error focus:outline-none focus:ring-2 focus:ring-role-error focus:ring-offset-1"
          >
            Delete Entity
          </button>
        </div>
      </dialog>
    </aside>
  );
}
