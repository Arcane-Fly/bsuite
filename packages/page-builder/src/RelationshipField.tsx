import { X } from 'lucide-react';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from './utils.js';
import type { RelationshipFieldOption } from './types.js';

/**
 * RelationshipField — the app-agnostic relationship-field widget (W4-1).
 *
 * A typeahead over a single entity that writes ONE foreign key on the
 * record being edited, distinct from the entity-list widget (a table of
 * every row, writing nothing). `@bsuite/page-builder` cannot import from
 * crm7 or talk to Supabase, so the data source is entirely caller-supplied
 * — `search`/`resolveOption` are the ClientSelector-equivalent behaviour
 * crm7 (or any consumer) wires in; this component owns only the picker
 * interaction and its validation contract.
 *
 * The validation contract is deliberately the same shape as crm7's
 * `EntitySelector`/`ClientSelector` (`crm7/src/components/entity/
 * EntitySelector.tsx`, `.../selectors/ClientSelector.tsx`): the ONLY way to
 * commit a value is to pick one of the options `search` returned — there is
 * no code path that turns raw typed text into a committed value. Typed text
 * that does not match the currently-committed option's label is refused on
 * blur/Escape: the field reverts to the last committed value and
 * `onInvalidEntry` fires instead of `onChange`. That refusal is exactly
 * what stopped 7 contacts becoming free-text orphans in crm7 — a
 * relationship field that skipped it would recreate the same problem this
 * widget exists to fix.
 *
 * Controlled component: `value` is the FK currently persisted on the host
 * record. `onChange` REQUESTS a write; the caller updates its own backing
 * store and re-passes `value` once the write lands (optimistically or
 * not) — this component never assumes its own write succeeded.
 */

export interface RelationshipFieldProps {
  /** Currently selected FK value (the id written on the host record), or
   * null/undefined when unset. */
  value?: string | null;
  /** The caller's tenant — forwarded to `search`/`resolveOption` on every
   * call so the picker's data source is scoped to it by construction,
   * never by convention (W4-1's tenant-scoping requirement). */
  tenantId?: string | null;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Debounce, in ms, between the last keystroke and firing `search`. */
  debounceMs?: number;
  /**
   * Search the target entity, scoped to `tenantId`. Consumers supply their
   * own data source here (crm7's ClientSelector-equivalent query) — this
   * package never talks to Supabase directly.
   */
  search: (query: string, tenantId: string | null | undefined) => Promise<RelationshipFieldOption[]>;
  /**
   * Resolve the option behind an already-set `value` (e.g. re-fetch by id)
   * so the field can show its label without the caller pre-resolving it.
   * Optional — omit if `initialOption` is supplied instead.
   */
  resolveOption?: (id: string, tenantId: string | null | undefined) => Promise<RelationshipFieldOption | null>;
  /** Pre-resolved option for `value`, when the caller already has it. */
  initialOption?: RelationshipFieldOption | null;
  /**
   * Called with the picked option — this is what writes the foreign key.
   * Called with `null` only from the explicit clear action, never from an
   * unresolved typed value.
   */
  onChange: (option: RelationshipFieldOption | null) => void | Promise<void>;
  /**
   * Called when the field is blurred/committed with typed text that does
   * not match any resolved/committed option — the value is refused
   * (reverted) and `onChange` is NOT called.
   */
  onInvalidEntry?: (query: string) => void;
  emptyLabel?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function RelationshipField({
  value,
  tenantId,
  label,
  placeholder = 'Search…',
  disabled = false,
  debounceMs = 250,
  search,
  resolveOption,
  initialOption = null,
  onChange,
  onInvalidEntry,
  emptyLabel = 'No matches',
  className,
  id,
  'aria-label': ariaLabel,
}: RelationshipFieldProps) {
  const generatedId = useId();
  const inputId = id ?? `relationship-field-${generatedId}`;
  const listboxId = `${inputId}-listbox`;

  const [selected, setSelected] = useState<RelationshipFieldOption | null>(initialOption);
  const [query, setQuery] = useState(initialOption?.label ?? '');
  const [options, setOptions] = useState<RelationshipFieldOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Hydrate the label for an externally-set/changed `value` this instance
  // has not resolved yet. Deliberately keyed on `value` alone — `selected`
  // is set BY this same effect (and by `commitOption`/`clearSelection`), so
  // including it would either no-op (already in sync) or fight the user's
  // own selection; `resolveOption`/`tenantId` changing mid-session should
  // not retrigger a resolve for a value that hasn't changed.
  useEffect(() => {
    if ((value ?? null) === (selected?.id ?? null)) return;
    if (!value) {
      setSelected(null);
      setQuery('');
      return;
    }
    if (!resolveOption) return;
    let cancelled = false;
    resolveOption(value, tenantId)
      .then((option) => {
        if (cancelled || !option) return;
        setSelected(option);
        setQuery(option.label);
      })
      .catch(() => {
        /* leave the field as-is; caller's resolveOption owns error reporting */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const runSearch = useCallback(
    (text: string) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      search(text, tenantId)
        .then((results) => {
          if (requestIdRef.current !== requestId) return;
          setOptions(results);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setOptions([]);
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setIsLoading(false);
        });
    },
    [search, tenantId],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setQuery(text);
    setIsOpen(true);
    setHighlightedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), debounceMs);
  };

  const commitOption = (option: RelationshipFieldOption) => {
    setSelected(option);
    setQuery(option.label);
    setIsOpen(false);
    setOptions([]);
    setHighlightedIndex(-1);
    void onChange(option);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setOptions([]);
    setIsOpen(false);
    void onChange(null);
  };

  // The refusal behaviour this component exists to provide (see the module
  // doc): committing is ONLY ever done via `commitOption`, called from a
  // listbox option pick. Reaching blur/Escape with typed text that does not
  // exactly match the currently-committed option's label means the user
  // typed something that never resolved to a real row — revert, and tell
  // the caller via `onInvalidEntry` instead of writing anything.
  const refuseUnresolvedTypedText = () => {
    const trimmed = query.trim();
    const matchesCommitted = selected ? trimmed === selected.label : trimmed.length === 0;
    if (matchesCommitted) return;
    onInvalidEntry?.(trimmed);
    setQuery(selected?.label ?? '');
    setOptions([]);
  };

  const handleBlur = () => {
    // A mousedown on a listbox option (see onMouseDown below) prevents the
    // input from ever losing focus for that interaction, so `handleBlur`
    // only ever runs for a genuine focus-away — commitOption has already
    // run synchronously before this fires when the user picks an option.
    setIsOpen(false);
    refuseUnresolvedTypedText();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        if (options.length === 0) runSearch(query);
        return;
      }
      setHighlightedIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
        event.preventDefault();
        commitOption(options[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setQuery(selected?.label ?? '');
        setOptions([]);
      }
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <div className="relative flex items-center gap-1">
        <input
          id={inputId}
          role="combobox"
          type="text"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 && options[highlightedIndex]
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-label={ariaLabel ?? label}
          className="w-full rounded-md border border-border-interactive bg-background px-2 py-1.5 text-sm text-foreground disabled:opacity-60"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (options.length === 0) runSearch(query);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {selected && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSelection}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-md"
        >
          {isLoading ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={selected?.id === option.id}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  index === highlightedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commitOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div>{option.label}</div>
                {option.secondaryLabel && (
                  <div className="text-xs text-muted-foreground">{option.secondaryLabel}</div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default RelationshipField;
