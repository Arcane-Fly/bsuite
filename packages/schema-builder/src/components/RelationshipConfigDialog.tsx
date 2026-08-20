import { GitBranch } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RelationType } from '../types.js';
import { useLightDismissDialog } from '../hooks/useLightDismissDialog.js';

interface RelationshipConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  targetName: string;
  onConfirm: (config: {
    relation_type: RelationType;
    source_label: string | null;
    target_label: string | null;
  }) => void;
}

const RELATION_TYPE_OPTIONS: Array<{
  value: RelationType;
  label: string;
  description: string;
}> = [
  {
    value: 'one_to_many',
    label: 'One-to-Many',
    description: 'Source has many targets (e.g. Client → Contacts)',
  },
  {
    value: 'one_to_one',
    label: 'One-to-One',
    description: 'Source maps to exactly one target',
  },
  {
    value: 'many_to_many',
    label: 'Many-to-Many',
    description: 'Both sides can have multiple links',
  },
  {
    value: 'inherits_from',
    label: 'Inherits From',
    description: 'Source inherits all fields of target',
  },
];

export function RelationshipConfigDialog({
  open,
  onOpenChange,
  sourceName,
  targetName,
  onConfirm,
}: RelationshipConfigDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Backdrop click closes it, exactly as Escape does. `showModal()` gives
  // a backdrop ELEMENT, not backdrop-click dismissal — see the hook.
  useLightDismissDialog(dialogRef, open);
  const [relationType, setRelationType] = useState<RelationType>('one_to_many');
  const [sourceLabel, setSourceLabel] = useState('');
  const [targetLabel, setTargetLabel] = useState('');

  const isSelfRelation = sourceName === targetName;
  const isInheritsSelf = relationType === 'inherits_from' && isSelfRelation;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const reset = () => {
    setRelationType('one_to_many');
    setSourceLabel('');
    setTargetLabel('');
  };

  const handleConfirm = () => {
    if (isInheritsSelf) return;
    onConfirm({
      relation_type: relationType,
      source_label: sourceLabel.trim().slice(0, 100) || null,
      target_label: targetLabel.trim().slice(0, 100) || null,
    });
    reset();
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onOpenChange(false)}
      className="w-[min(480px,90vw)] rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-overlay/50"
      aria-labelledby="relationship-dialog-title"
    >
      <div className="p-6">
        <h2
          id="relationship-dialog-title"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <GitBranch className="h-5 w-5 text-primary-text" />
          Configure Relationship
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define the relationship between <strong>{sourceName}</strong> and{' '}
          <strong>{targetName}</strong>.
        </p>

        <div className="mt-4 space-y-4">
          {isInheritsSelf ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-role-error/50 bg-role-error/10 p-3 text-xs text-error-text"
            >
              An entity cannot inherit from itself. Please select a different
              relationship type.
            </div>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="relation-type-select"
              className="text-sm font-medium"
            >
              Relationship Type
            </label>
            <select
              id="relation-type-select"
              value={relationType}
              onChange={(e) =>
                setRelationType(e.target.value as RelationType)
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {RELATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="source-label-input"
              className="text-sm font-medium"
            >
              Source Label (optional)
            </label>
            <input
              id="source-label-input"
              type="text"
              placeholder={`e.g. "Assigned ${targetName}s"`}
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-describedby="source-label-hint"
            />
            <p
              id="source-label-hint"
              className="text-[10px] text-muted-foreground"
            >
              How <strong>{targetName}</strong> appears when viewed from{' '}
              <strong>{sourceName}</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="target-label-input"
              className="text-sm font-medium"
            >
              Target Label (optional)
            </label>
            <input
              id="target-label-input"
              type="text"
              placeholder={`e.g. "Belongs to ${sourceName}"`}
              value={targetLabel}
              onChange={(e) => setTargetLabel(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-describedby="target-label-hint"
            />
            <p
              id="target-label-hint"
              className="text-[10px] text-muted-foreground"
            >
              How <strong>{sourceName}</strong> appears when viewed from{' '}
              <strong>{targetName}</strong>.
            </p>
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
            type="button"
            onClick={handleConfirm}
            disabled={isInheritsSelf}
            className="inline-flex h-9 items-center rounded-md bg-role-primary px-4 text-sm font-medium text-text-on-primary hover:bg-role-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Relationship
          </button>
        </div>
      </div>
    </dialog>
  );
}
