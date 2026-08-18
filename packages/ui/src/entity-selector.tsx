'use client'

/**
 * EntitySelector<T>
 *
 * Generic searchable combobox for selecting entities from any Supabase table.
 * Built on cmdk (Command) + Popover primitives shipped alongside this file in
 * `@bsuite/ui`.
 *
 * Extracted from crm7 into `@bsuite/ui` (AD-5, 2026-08-17). crm7 had 65 files
 * of adoption; throughput and conduit had each started hand-porting their own
 * copy at the identical path. A shared package with the old copies still
 * present is worse than no package at all — three divergent implementations
 * instead of one — so this is the SOLE implementation going forward. Apps
 * consume it directly (or via a thin per-app adapter that only binds their
 * own Supabase client instance — see crm7's `src/components/entity/
 * EntitySelector.tsx` for that pattern) rather than re-implementing it.
 *
 * Generalised out of crm7 in two ways, both required so this package does not
 * drag a consumer's local shadcn instance or app-singleton Supabase client
 * with it:
 *
 *   1. UI primitives (`Button`, `Command*`, `Popover*`, `StatusBadge`) are
 *      this package's OWN copies (`./button.js`, `./command.js`,
 *      `./popover.js`, `./status-badge.js`), not `@/components/ui/*` imports
 *      reaching back into crm7. They render from the same semantic Tailwind
 *      token classes (`bg-popover`, `text-muted-foreground`, …) every BSuite
 *      app already shares via `@bsuite/theme`, so the rendered result is
 *      pixel-identical to crm7's former local copy.
 *   2. Data access (`supabaseClient`) and diagnostics (`logger`) are
 *      dependency-injected props rather than a hardcoded `@/lib/supabase` /
 *      `@/utils/logger` import — every app owns a differently-shaped
 *      Supabase client (crm7: a Vite-SPA singleton; conduit: a per-request
 *      `createClient()` factory via `@supabase/ssr`), and this package
 *      cannot assume either.
 *
 * Features:
 *   - Debounced typeahead search against Supabase (ilike across configured columns)
 *   - Shows primary + secondary display fields per result
 *   - Returns the full row object on select (enables auto-populate in parent forms)
 *   - Optional "quick-add" button for inline entity creation
 *   - For small datasets (<50 rows) loads all on open; for larger sets requires typing
 *   - Supports external value control via `value` prop
 *
 * Usage:
 *   <EntitySelector<Employer>
 *     supabaseClient={supabase}
 *     table="employers"
 *     value={form.employer_id}
 *     onSelect={(emp) => { setValue('employer_id', emp.id); autoFill(emp); }}
 *     displayField={(r) => r.business_name}
 *     secondaryField={(r) => r.abn ?? r.industry}
 *     searchColumns={['business_name', 'trading_name', 'abn']}
 *   />
 */

import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from './button.js'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command.js'
import { Popover, PopoverContent, PopoverTrigger } from './popover.js'
import { StatusBadge } from './status-badge.js'
import { cn } from './utils.js'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Schema-agnostic Supabase filter-builder alias used by `filterFn`.
 *
 * `PostgrestFilterBuilder` is parameterised over the concrete DB schema,
 * row, result, and relationship types — which the EntitySelector factory
 * deliberately does not know at this layer (each selector wraps its own
 * `T`). Using `any` for the four generic positions is the canonical escape
 * hatch in `@supabase/postgrest-js` for schema-agnostic filter-builder
 * wrappers. Centralising it here (rather than `(query: any) => any` inline)
 * gives call sites stable input/output types so they get method completion
 * on `.eq()` / `.in()` / `.gte()` chains and no longer need `as typeof
 * query` casts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntitySelectorQuery = PostgrestFilterBuilder<any, any, any, any>

/**
 * Minimal diagnostics sink. Defaults to `console` so a consumer that omits
 * `logger` still sees failures during development rather than a silent
 * swallow; production apps typically inject their own structured logger.
 */
export interface EntitySelectorLogger {
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Structural shape this component needs from a Supabase client — NOT the
 * nominal `SupabaseClient` class type from `@supabase/supabase-js`.
 *
 * Deliberate: this package's own `@supabase/supabase-js` (a devDependency,
 * used only for the type) and a consumer's own `@supabase/supabase-js` (a
 * peer dependency, resolved from THEIR lockfile) can end up as two
 * different installed instances in a pnpm monorepo where every app pins
 * its own floating range independently — crm7's own copy has drifted to
 * 2.110.8 against this package's 2.108.1, for instance. TypeScript treats
 * two structurally-identical classes sourced from different physical
 * packages as nominally incompatible ("not assignable" even though every
 * member matches), which would make a real consumer's real client fail to
 * satisfy a nominal `SupabaseClient` prop type for no functional reason.
 * A structural interface sidesteps the whole class of failure: any client
 * with these two methods satisfies it, regardless of which supabase-js
 * instance produced it. The query builder itself is intentionally
 * `any`-erased past this point — see {@link EntitySelectorQuery}, the
 * same escape hatch this component already uses for `filterFn`.
 */
export interface EntitySelectorSupabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any
  schema: (schemaName: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any
  }
}

export interface EntitySelectorProps<T extends Record<string, unknown>> {
  /**
   * The consumer's own Supabase client instance. `@bsuite/ui` does not own a
   * client — each app's client is shaped differently (singleton vs
   * per-request factory, different `storageKey`, etc.) — so this is
   * required rather than imported internally.
   */
  supabaseClient: EntitySelectorSupabaseClient
  /** Diagnostics sink for non-fatal query failures. Defaults to `console`. */
  logger?: EntitySelectorLogger
  /** Supabase table name */
  table: string
  /**
   * Optional non-`public` Postgres schema (e.g. `'catalog'`). When set, the
   * query is built via `supabaseClient.schema(schema).from(table)` instead
   * of `supabaseClient.from(table)`. PostgREST embeds do not cross schema
   * boundaries, and cross-schema reads additionally require the querying
   * role (`authenticated`/`anon`) to hold `USAGE` on that schema, which is a
   * DB grant this component cannot verify or fix at runtime. A failed read
   * surfaces through the existing `error` state below (role="alert"), the
   * same path used for a bad embed hint — never a silent "no results".
   */
  schema?: string
  /** Currently selected entity ID (controlled) */
  value?: string
  /**
   * Called with the full row when user selects; null when cleared.
   *
   * May return a Promise (import-on-select: a catalogue selector resolves
   * the pick through an RPC before committing it). When it does,
   * `handleItemSelect` below does NOT optimistically show the clicked row —
   * see that function's comment for why an optimistic update is actively
   * wrong for an async `onSelect`.
   */
  onSelect: (entity: T | null) => void | Promise<void>
  /** How to render the primary display text from a row */
  displayField: (row: T) => string
  /** Optional secondary line (e.g. ABN, email) */
  secondaryField?: (row: T) => string
  /** Columns to search via ilike */
  searchColumns: readonly string[]
  /** Supabase select string — supports JOINs e.g. "*, contacts(first_name)" */
  selectColumns?: string
  /**
   * Additional Supabase query filters (e.g. status eq active). Receives
   * and returns a schema-agnostic {@link EntitySelectorQuery} so consumers
   * get stable input/output typing and `.eq()` / `.in()` / `.gte()` method
   * completion without needing `as typeof query` casts at each call site.
   */
  filterFn?: (query: EntitySelectorQuery) => EntitySelectorQuery
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Show a "+" quick-add button; callback fired on click */
  onQuickAdd?: () => void
  /** Quick-add button label */
  quickAddLabel?: string
  /** Min characters before searching (0 = load on open) */
  minChars?: number
  /** Debounce in ms */
  debounceMs?: number
  /** Max results to fetch */
  limit?: number
  /** Allow clearing the selection */
  clearable?: boolean
  /** Additional className for the trigger button */
  className?: string
  /** Label shown in the trigger when an entity is selected */
  selectedLabel?: string
  /**
   * Notifies the parent when the selector's query state changes so the
   * parent form can gate submission ("Resolving company…") while the
   * typeahead is in-flight. Fires on every loading-state transition plus
   * when the query text changes.
   */
  onQueryStateChange?: (state: { isLoading: boolean; query: string }) => void
  /**
   * Optional custom row renderer. When provided, replaces the default
   * display/secondary field layout for each result row, letting selectors
   * visually distinguish inactive/discontinued rows.
   *
   * The renderer receives the row plus a selection indicator so custom
   * implementations can still draw a check/highlight for the currently
   * selected entity. The wrapping `<CommandItem>` (with its own click /
   * keyboard handler) is supplied by EntitySelector — `renderRow` only
   * renders the row's inner content.
   */
  renderRow?: (row: T, meta: { isSelected: boolean }) => ReactNode
  /** Form control id for aria-labelledby */
  id?: ComponentPropsWithoutRef<'button'>['id']
  /** Form control name attribute */
  name?: ComponentPropsWithoutRef<'button'>['name']
  /** Form control aria-describedby */
  'aria-describedby'?: ComponentPropsWithoutRef<'button'>['aria-describedby']
  /** Form control aria-invalid */
  'aria-invalid'?: ComponentPropsWithoutRef<'button'>['aria-invalid']
  /** Form control aria-labelledby */
  'aria-labelledby'?: ComponentPropsWithoutRef<'button'>['aria-labelledby']
  /**
   * Import-on-select: when a selector SEARCHES one table/schema but `value`
   * is a foreign key into a DIFFERENT table (e.g. a catalogue selector
   * searches `catalog.qualifications` but the owning column — and
   * therefore `value` — points at `public.qualifications`, the tenant's
   * own copy created on select), these three let the "resolve an
   * already-selected value" lookup target that different table instead of
   * `table`/`schema`/`selectColumns`. Default (all three omitted) is
   * today's behaviour: resolve from the same place search runs against —
   * every existing caller is unaffected.
   */
  resolveValueTable?: string
  resolveValueSchema?: string
  resolveValueSelectColumns?: string
  /**
   * ONE-SHOT: ids already linked to this record through an earlier screen.
   *
   * DRY is about one row in one table. This is about the USER never typing
   * the same thing twice: the second screen in a workflow surfaces what the
   * first screen already established, so the answer is one click rather
   * than a search.
   *
   * These are fetched BY ID and shown in their own group at the top, before
   * any typing. That matters — `minChars` means an ordinary picker shows
   * nothing at all until the user types, which is exactly the moment they
   * are being asked to re-derive something the system already knows.
   * Suggested rows bypass that.
   *
   * This narrows nothing. The full catalogue stays searchable underneath,
   * so a genuinely new choice is never blocked — the same
   * advise-don't-block posture the rest of this domain runs on.
   */
  suggestedIds?: readonly string[]
  /**
   * Heading for the suggested group. Say WHERE the options came from — "From
   * Teagan Taylor's record", "Preferred by Built Management Services" —
   * because a bare "Suggested" gives the user no way to judge whether to
   * trust it.
   */
  suggestedLabel?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntitySelector<T extends Record<string, unknown>>({
  supabaseClient,
  logger = console,
  table,
  schema,
  value,
  onSelect,
  displayField,
  secondaryField,
  searchColumns,
  selectColumns = '*',
  filterFn,
  placeholder = 'Search...',
  disabled = false,
  onQuickAdd,
  quickAddLabel = 'Create new',
  minChars = 0,
  debounceMs = 250,
  limit = 50,
  clearable = true,
  className,
  selectedLabel,
  onQueryStateChange,
  renderRow,
  id,
  name,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-labelledby': ariaLabelledBy,
  resolveValueTable,
  resolveValueSchema,
  resolveValueSelectColumns,
  suggestedIds,
  suggestedLabel = 'Already linked',
}: EntitySelectorProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<T[]>([])
  const [suggestedItems, setSuggestedItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  /**
   * A failed search (bad `selectColumns` embed, RLS denial, network error,
   * etc.) must not fall through to `setItems([])` with only a logger
   * side-channel — the rendered dropdown would show the exact same
   * `CommandEmpty` "No items found" copy as a genuine zero-result search,
   * which is indistinguishable from the user's perspective. Tracking the
   * error message separately lets the render below show a distinct,
   * `role="alert"` state instead.
   */
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedInitial = useRef(false)

  /**
   * Returns a schema-scoped `.from(table)` builder. Defaults to the public
   * schema (identical to the pre-existing `supabaseClient.from(table)`
   * behaviour) unless `schema` is supplied, in which case it queries via
   * `supabaseClient.schema(schema).from(table)` — see the `schema` prop doc.
   *
   * {@link EntitySelectorSupabaseClient} is structurally typed for the same
   * reason {@link EntitySelectorQuery} is `any`-erased: this package has no
   * generated `Database` type to parameterise against, and each consumer's
   * own generated types differ. `.schema()` is likewise unparameterised
   * here — a schema-agnostic escape hatch, not a typing gap introduced by
   * this component.
   */
  const fromTable = useCallback(() => {
    if (schema) {
      return supabaseClient.schema(schema).from(table)
    }
    return supabaseClient.from(table)
  }, [schema, table, supabaseClient])

  /**
   * Table/schema/columns for resolving an already-selected `value` into a
   * display row. Defaults to the search table when `resolveValueTable` is
   * omitted — see the prop doc for why these can differ.
   */
  const resolveTableName = resolveValueTable ?? table
  const resolveSchemaName = resolveValueSchema ?? schema
  const resolveSelectColumns = resolveValueSelectColumns ?? selectColumns
  const fromResolveTable = useCallback(() => {
    if (resolveSchemaName) {
      return supabaseClient.schema(resolveSchemaName).from(resolveTableName)
    }
    return supabaseClient.from(resolveTableName)
  }, [resolveSchemaName, resolveTableName, supabaseClient])

  // ── Resolve selected item from value prop ──────────────────────────────
  useEffect(() => {
    if (!value) {
      setSelectedItem(null)
      return
    }

    // If we already have this item loaded, use it — but only when the
    // search results and the resolve target are the SAME table (the
    // `resolveValueTable` override case means `items` come from a
    // different table than `value` points at, so a matching `id` there
    // would be coincidental, not correct).
    if (!resolveValueTable) {
      const existing = items.find((i) => String(i.id) === String(value))
      if (existing) {
        setSelectedItem(existing)
        return
      }
    }

    // Otherwise fetch the single entity by ID
    let cancelled = false
    ;(async () => {
      const { data } = await fromResolveTable()
        .select(resolveSelectColumns)
        .eq('id', value)
        .single()
      if (!cancelled && data) {
        setSelectedItem(data as unknown as T)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [value, resolveValueTable, resolveTableName, resolveSelectColumns, fromResolveTable]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search / load items ────────────────────────────────────────────────
  const fetchItems = useCallback(
    async (searchTerm: string) => {
      setIsLoading(true)
      setError(null)
      try {
        // Supabase `.select()` returns a narrow `PostgrestTransformBuilder`
        // subtype that carries the concrete row schema. We widen it to the
        // schema-agnostic {@link EntitySelectorQuery} alias so the public
        // `filterFn` prop type (which is unparameterised by design) can
        // consume and return it without callers needing `as` casts. The
        // single widen-cast here replaces the casts every inner selector
        // would otherwise need.
        let q = fromTable().select(selectColumns) as unknown as EntitySelectorQuery

        // Apply custom filters
        if (filterFn) {
          q = filterFn(q)
        }

        // Apply search if term is long enough
        if (searchTerm.length >= Math.max(minChars, 1)) {
          const escaped = searchTerm
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/,/g, '\\,')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
          const term = `%${escaped}%`
          const orConditions = searchColumns.map((col) => `${col}.ilike.${term}`).join(',')
          q = q.or(orConditions)
        }

        q = q.limit(limit)

        const { data, error: queryError } = await q

        if (queryError) {
          logger.warn(`EntitySelector(${table}): search error`, queryError.message)
          setError(queryError.message || 'Failed to load results.')
          setItems([])
          return
        }

        setItems((data as unknown as T[]) ?? [])
      } catch (err) {
        logger.error(`EntitySelector(${table}): unexpected error`, err)
        setError(err instanceof Error ? err.message : 'Failed to load results.')
        setItems([])
      } finally {
        setIsLoading(false)
      }
    },
    [table, selectColumns, searchColumns, filterFn, minChars, limit, fromTable, logger],
  )

  /**
   * ONE-SHOT: fetch the already-linked rows BY ID.
   *
   * Deliberately a separate query from the search, for two reasons. It must not
   * be subject to `minChars` — the whole point is that the user sees the answer
   * without typing — and it must not be subject to `limit`, or a suggestion
   * could fall off the end of a busy catalogue and silently stop being offered.
   *
   * `filterFn` is NOT applied. A suggestion is already an established link made
   * by this user on an earlier screen; re-filtering it here could hide a row the
   * system itself put there, which reads as the feature being broken.
   */
  const suggestedKey = suggestedIds?.length ? [...suggestedIds].sort().join(',') : ''
  useEffect(() => {
    if (!open || !suggestedKey) {
      if (!suggestedKey) setSuggestedItems([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { data, error: sErr } = await fromTable()
          .select(selectColumns)
          .in('id', suggestedKey.split(','))
        if (cancelled) return
        if (sErr) {
          // Never surface this as a page error — the catalogue below still
          // works, so a failed suggestion degrades to an ordinary search
          // rather than blocking the user.
          logger.warn(`EntitySelector(${table}): suggested fetch failed`, sErr.message)
          setSuggestedItems([])
          return
        }
        setSuggestedItems((data as unknown as T[]) ?? [])
      } catch (err) {
        if (!cancelled) {
          logger.warn(`EntitySelector(${table}): suggested fetch threw`, err)
          setSuggestedItems([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, suggestedKey, fromTable, selectColumns, table, logger])

  /**
   * One row, shared by the suggested group and the catalogue group.
   *
   * Extracted rather than duplicated: the two groups must stay visually and
   * behaviourally identical, and a copy is how one of them quietly loses the
   * selected-check or the `renderRow` override later.
   */
  const renderItem = (item: T) => {
    const itemId = String(item.id)
    const isSelected = String(value) === itemId
    return (
      <CommandItem
        key={itemId}
        value={itemId}
        onSelect={() => handleItemSelect(item)}
        className="flex items-center justify-between"
      >
        {renderRow ? (
          renderRow(item, { isSelected })
        ) : (
          <>
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">{displayField(item)}</span>
              {secondaryField && (
                <span className="text-xs text-muted-foreground truncate">
                  {secondaryField(item)}
                </span>
              )}
            </div>
            {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </>
        )}
      </CommandItem>
    )
  }

  // ── Load items when popover opens (for small datasets / minChars=0) ───
  useEffect(() => {
    if (open && !hasLoadedInitial.current) {
      hasLoadedInitial.current = true
      fetchItems('')
    }
  }, [open, fetchItems])

  // ── Debounced search on query change ───────────────────────────────────
  const handleQueryChange = useCallback(
    (val: string) => {
      setQuery(val)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchItems(val), debounceMs)
    },
    [fetchItems, debounceMs],
  )

  // ── Surface loading+query state upward so the parent form can gate submit ─
  useEffect(() => {
    if (onQueryStateChange) {
      onQueryStateChange({ isLoading, query })
    }
  }, [isLoading, query, onQueryStateChange])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Selection handlers ─────────────────────────────────────────────────
  /**
   * A PRIOR version of this fix had an import-on-select consumer call the
   * parent's `onSelect(null)` on every import-RPC failure, meant to clear a
   * stale optimistic display. That made things worse: in EDIT mode `value`
   * starts as the SAVED entity id, and `onSelect(null)` overwrote the
   * parent form's state with `undefined` — wiping a link the database
   * actually has, the exact inverse of the bug being fixed, on every failed
   * re-pick.
   *
   * The real defect is here, not in the caller: this function set
   * `selectedItem` SYNCHRONOUSLY AND OPTIMISTICALLY on every click, before
   * `onSelect` (which may be async — see the prop doc) had any chance to
   * fail. For a synchronous `onSelect` (the overwhelming majority of
   * consumers) that is correct — there is no failure mode to protect
   * against. For an async `onSelect` (routing the pick through an
   * import-from-catalogue RPC, say), setting `selectedItem` before the
   * round-trip resolves means: on failure, the trigger shows a row the
   * database was never given, and it stays wrong because `value` never
   * changed, so the "resolve selected item from value" effect (above) has
   * nothing to react to and never corrects it.
   *
   * Fix: detect a thenable return and skip the optimistic update entirely.
   * The eventual state is then driven ONLY by `value`:
   *   - success: the async `onSelect` calls the caller's real setter with
   *     the new (imported) id, `value` changes, the resolve-effect fetches
   *     and displays it — one extra network round trip, correct result.
   *   - failure: the async `onSelect` does NOT call the caller's setter,
   *     `value` is untouched, `selectedItem` was never touched either — a
   *     fresh form keeps showing the placeholder, an edit form keeps
   *     showing the saved entity. Neither a false assertion nor a false
   *     wipe.
   */
  const handleItemSelect = (item: T) => {
    const result = onSelect(item)
    if (!result || typeof (result as Promise<void>).then !== 'function') {
      setSelectedItem(item)
    }
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItem(null)
    onSelect(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const triggerLabel = selectedItem ? (selectedLabel ?? displayField(selectedItem)) : placeholder

  return (
    <div className="flex gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            id={id}
            name={name}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-labelledby={ariaLabelledBy}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selectedItem && 'text-muted-foreground',
              className,
            )}
          >
            <span className="truncate min-w-0">{triggerLabel}</span>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {clearable && selectedItem && (
                <X className="h-3.5 w-3.5 opacity-50 hover:opacity-100" onClick={handleClear} />
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={handleQueryChange}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                </div>
              ) : error ? (
                <div className="text-center py-6 px-4 text-sm text-error-text" role="alert">
                  Couldn&apos;t load results: {error}
                </div>
              ) : items.length === 0 && suggestedItems.length === 0 ? (
                <CommandEmpty>
                  {query.length > 0 ? `No results for "${query}"` : 'No items found'}
                </CommandEmpty>
              ) : (
                <>
                  {/*
                    ONE-SHOT group. Rendered FIRST and before any typing, so the
                    thing the user already told us on the previous screen is one
                    click away rather than something they re-derive.

                    Suppressed once they start searching: at that point they have
                    said the suggestion is not what they want, and leaving it
                    pinned above the results just pushes the real match down.
                  */}
                  {suggestedItems.length > 0 && query.length === 0 && (
                    <CommandGroup heading={suggestedLabel}>
                      {suggestedItems.map((item) => renderItem(item))}
                    </CommandGroup>
                  )}
                  {(() => {
                    // De-dupe so a suggested row is not offered twice; showing
                    // the same entity in both groups reads as two different
                    // records.
                    const shown =
                      suggestedItems.length > 0 && query.length === 0
                        ? items.filter(
                            (i) => !suggestedItems.some((s) => String(s.id) === String(i.id)),
                          )
                        : items
                    if (shown.length === 0) return null
                    return (
                      <CommandGroup
                        heading={
                          suggestedItems.length > 0 && query.length === 0
                            ? 'All options'
                            : undefined
                        }
                      >
                        {shown.map((item) => renderItem(item))}
                      </CommandGroup>
                    )
                  })()}
                </>
              )}

              {/* Quick-add button */}
              {onQuickAdd && (
                <div className="border-t p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => {
                      setOpen(false)
                      onQuickAdd()
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {quickAddLabel}
                  </Button>
                </div>
              )}

              {/* Item count badge */}
              {items.length > 0 && (
                <div className="border-t px-2 py-1.5 text-center">
                  <StatusBadge tone="neutral" className="text-[10px]">
                    {items.length}
                    {items.length >= limit ? '+' : ''} result{items.length !== 1 ? 's' : ''}
                  </StatusBadge>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Inline quick-add — labeled text when provided, icon fallback elsewhere */}
      {onQuickAdd && (
        <Button
          type="button"
          variant="outline"
          size={quickAddLabel && quickAddLabel.length > 12 ? 'sm' : 'icon'}
          className={
            quickAddLabel && quickAddLabel.length > 12 ? 'shrink-0 whitespace-nowrap' : 'shrink-0'
          }
          disabled={disabled}
          onClick={onQuickAdd}
          title={quickAddLabel}
          aria-label={quickAddLabel}
          data-testid="entity-selector-quick-add"
        >
          <Plus className="h-4 w-4" />
          {quickAddLabel && quickAddLabel.length > 12 ? (
            <span className="ml-1.5 max-w-[10rem] truncate sm:max-w-none">{quickAddLabel}</span>
          ) : null}
        </Button>
      )}
    </div>
  )
}

export default EntitySelector
