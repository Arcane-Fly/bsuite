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

/**
 * Option text is built from the ACTUAL entity names, and the explanation is
 * kept OUT of the `<option>`.
 *
 * Both halves used to be concatenated into one option — `label — description`
 * — in a 430px select, where the longest ran to 62 characters. Native option
 * text cannot wrap and the browser simply truncates it, so the explanation was
 * cut off mid-sentence exactly when it was needed. The description now renders
 * as ordinary helper text below the select, where it can wrap, and only for the
 * option actually selected.
 */
const RELATION_TYPE_OPTIONS: Array<{
  value: RelationType;
  /** Short, and phrased with the real entity names on both sides. */
  label: (source: string, target: string) => string;
  description: (source: string, target: string) => string;
}> = [
  {
    value: 'one_to_many',
    label: (s, t) => `One ${s} → many ${t}`,
    description: (s, t) =>
      `Each ${s} can be linked to any number of ${t} records. Each ${t} points back to one ${s}.`,
  },
  {
    value: 'one_to_one',
    label: (s, t) => `One ${s} → one ${t}`,
    description: (s, t) => `Each ${s} is linked to at most one ${t}, and vice versa.`,
  },
  {
    value: 'many_to_many',
    label: (s, t) => `Many ${s} ↔ many ${t}`,
    description: (s, t) => `Any number of ${s} records can link to any number of ${t} records.`,
  },
  {
    value: 'inherits_from',
    label: (s, t) => `${s} inherits ${t}'s fields`,
    description: (s, t) => `${s} takes on every field defined on ${t}, in addition to its own.`,
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

  const selectedOption =
    RELATION_TYPE_OPTIONS.find((o) => o.value === relationType) ??
    RELATION_TYPE_OPTIONS[0];

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
      className="w-[min(560px,92vw)] rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-overlay/50"
      aria-labelledby="relationship-dialog-title"
      aria-describedby="relationship-dialog-scope"
    >
      <div className="p-6">
        <h2
          id="relationship-dialog-title"
          className="flex items-center gap-2 text-lg font-semibold text-foreground"
        >
          <GitBranch className="h-5 w-5 text-primary-text" aria-hidden="true" />
          Link {sourceName} to {targetName}
        </h2>

        {/*
          THE MOST IMPORTANT SENTENCE IN THIS DIALOG.

          The button said "Create Relationship" and the title said "Configure
          Relationship", which a reasonable person reads as "I am adding a
          foreign key to my database". What actually happens is that a row is
          written to `tenant_entity_relations` — a documentation table that
          nothing else in the estate reads. The diagram gains a line; the
          database is unchanged; no constraint exists; no query behaves
          differently.

          That gap produces confident false belief, which is worse than visible
          confusion, and it is the single most serious design defect on this
          surface. Whatever is eventually decided about creating real foreign
          keys from here, the UI must never again imply it already does.
        */}
        <p
          id="relationship-dialog-scope"
          className="mt-2 rounded-md border border-role-info/40 bg-role-info/10 p-3 text-xs text-info-text"
        >
          <strong>Diagram link only.</strong> This records how these entities
          relate, for documentation and for this canvas. It does not change the
          database or enforce anything.
        </p>

        <div className="mt-4 space-y-4">
          {isInheritsSelf ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-role-error/50 bg-role-error/10 p-3 text-xs text-error-text"
            >
              An entity can&rsquo;t inherit from itself. Pick a different type.
            </div>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="relation-type-select"
              className="text-sm font-medium"
            >
              How many?
            </label>
            <select
              id="relation-type-select"
              autoFocus
              value={relationType}
              onChange={(e) =>
                setRelationType(e.target.value as RelationType)
              }
              aria-describedby="relation-type-description"
              className="w-full rounded-md border border-border-interactive bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {RELATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label(sourceName, targetName)}
                </option>
              ))}
            </select>
            <p
              id="relation-type-description"
              className="text-xs text-muted-foreground"
            >
              {selectedOption.description(sourceName, targetName)}
            </p>
          </div>

          <div className="space-y-2">
            {/*
              COPY CHANGE ONLY — THE WIRING IS CORRECT. `sourceLabel` persists
              to `source_label` with no swap at any of the six hops between this
              input and the database, and that was traced field-for-field before
              anything here was touched. The mental model inverted because the
              NOUN and the SENTENCE pointed opposite ways: "Source Label" reads
              naturally as "the label FOR the source", while the helper text
              said it described the target. Users trust the noun.

              So the field is renamed to describe what it produces, at which
              point the helper sentence is redundant and is deleted rather than
              reworded. Do not "fix" this by swapping the mapping — that would
              break correct data to satisfy a caption.
            */}
            <label
              htmlFor="source-label-input"
              className="text-sm font-medium"
            >
              What {sourceName} calls {targetName}{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="source-label-input"
              type="text"
              placeholder={`Assigned ${targetName}s`}
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border-interactive bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="target-label-input"
              className="text-sm font-medium"
            >
              What {targetName} calls {sourceName}{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="target-label-input"
              type="text"
              placeholder={`Belongs to ${sourceName}`}
              value={targetLabel}
              onChange={(e) => setTargetLabel(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-border-interactive bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* One sentence that makes the direction unmistakable, using the
              user's own words as they type them. This removes the whole class
              of confusion the two labels above used to create, because there is
              nothing left to infer. */}
          {sourceLabel.trim() || targetLabel.trim() ? (
            <p
              className="rounded-md bg-muted p-3 text-xs text-text-secondary"
              aria-live="polite"
            >
              {sourceLabel.trim() ? (
                <>
                  On a <strong>{sourceName}</strong> you&rsquo;ll see &ldquo;
                  {sourceLabel.trim()}&rdquo;.{' '}
                </>
              ) : null}
              {targetLabel.trim() ? (
                <>
                  On a <strong>{targetName}</strong> you&rsquo;ll see &ldquo;
                  {targetLabel.trim()}&rdquo;.
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-9 items-center rounded-md border border-border-interactive bg-card px-4 text-sm font-medium hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isInheritsSelf}
            className="inline-flex h-9 items-center rounded-md bg-role-primary px-4 text-sm font-medium text-text-on-primary hover:bg-role-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create link
          </button>
        </div>
      </div>
    </dialog>
  );
}
