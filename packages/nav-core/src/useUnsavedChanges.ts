'use client'
/**
 * useUnsavedChanges — the other half of "save your work, then refresh".
 *
 * A notice that says "save your work" and then lets one click throw it away is
 * worse than no notice, because it took the person's attention and gave nothing
 * back. This is the registry that makes the Refresh button ask first.
 *
 * MEASURED BASELINE (2026-09-03, origin/development of all six apps): ONE
 * `beforeunload` guard exists in the entire estate —
 * business-suite-unified/src/pages/Developer/WebsiteCmsTab.tsx. crm7's eight
 * `[id]/edit.tsx` pages compute `form.formState.isDirty` and use it only to
 * grey out a Save button. Closing a tab mid-edit anywhere else loses the work
 * silently.
 *
 * WHY THE REGISTRY IS MODULE-LEVEL AND NOT A CONTEXT
 * --------------------------------------------------
 * The form that is dirty and the banner that must warn about it are on opposite
 * sides of the app shell, and in four of the six apps there is no provider
 * between them (R80.4 and throughput hand-roll their shells; braden has none).
 * A context would need a provider added to eleven mount points before the first
 * form could register. A module-level store needs nothing, and `useSyncExternal-
 * Store` makes it correct under concurrent rendering.
 *
 * WHY `beforeunload` IS ATTACHED BY THE STORE, NOT BY THE HOOK
 * -----------------------------------------------------------
 * The guard must be on whenever ANY form is dirty, exactly once, whether the
 * banner is mounted or not. Attaching it per hook instance would install one
 * listener per subscriber and would fall off entirely on a page with a dirty
 * form and no banner.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react'

/** The estate's plain wording. Deliberately says what is lost, not "are you sure". */
export const UNSAVED_CONFIRM_MESSAGE =
  'You have unsaved changes. Refresh anyway? They will be lost.'

const dirtyIds = new Set<string>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function onBeforeUnload(event: BeforeUnloadEvent): void {
  // The modern contract is preventDefault(); `returnValue` is the legacy one and
  // is still what Safari reads. Both, or the dialog does not appear everywhere.
  event.preventDefault()
  event.returnValue = ''
}

function syncBeforeUnload(): void {
  if (typeof window === 'undefined') return
  if (dirtyIds.size > 0) {
    window.addEventListener('beforeunload', onBeforeUnload)
  } else {
    window.removeEventListener('beforeunload', onBeforeUnload)
  }
}

/**
 * Record `id` as having unsaved work. Idempotent.
 *
 * `id` must be stable and unique per form — `apprentice-edit:${apprenticeId}`,
 * not `'form'`. Two surfaces sharing an id means the second markClean() clears
 * the first one's guard.
 */
export function markDirty(id: string): void {
  if (dirtyIds.has(id)) return
  dirtyIds.add(id)
  syncBeforeUnload()
  emit()
}

/** Record `id` as saved or discarded. Idempotent. */
export function markClean(id: string): void {
  if (!dirtyIds.delete(id)) return
  syncBeforeUnload()
  emit()
}

/** Test seam and hard reset. Not part of the adoption path. */
export function resetUnsavedChanges(): void {
  if (dirtyIds.size === 0) return
  dirtyIds.clear()
  syncBeforeUnload()
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getDirtyCount(): number {
  return dirtyIds.size
}

/** Server render has no registry — always clean, never a hydration mismatch. */
function getServerDirtyCount(): number {
  return 0
}

export interface UnsavedChangesState {
  /** Anything registered as dirty right now. */
  isDirty: boolean
  /** How many surfaces are dirty. Useful for a "2 unsaved forms" message. */
  dirtyCount: number
  markDirty: (id: string) => void
  markClean: (id: string) => void
  /**
   * `true` when it is safe to leave. Clean -> `true` with no prompt. Dirty ->
   * a `window.confirm` the person must accept.
   */
  confirmLeave: () => boolean
}

/**
 * Read the dirty registry, and get the confirm helper the banner's Refresh uses.
 *
 * @example
 * const { confirmLeave } = useUnsavedChanges()
 * <button onClick={() => { if (confirmLeave()) window.location.reload() }}>Refresh</button>
 */
export function useUnsavedChanges(): UnsavedChangesState {
  const dirtyCount = useSyncExternalStore(subscribe, getDirtyCount, getServerDirtyCount)

  const confirmLeave = useCallback((): boolean => {
    if (getDirtyCount() === 0) return true
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true
    return window.confirm(UNSAVED_CONFIRM_MESSAGE)
  }, [])

  return { isDirty: dirtyCount > 0, dirtyCount, markDirty, markClean, confirmLeave }
}

/**
 * The one-liner for a react-hook-form surface.
 *
 * @example
 * useRegisterDirty(`apprentice-edit:${id}`, form.formState.isDirty)
 *
 * Unregisters on unmount, so navigating away from a dirty form does not leave a
 * `beforeunload` guard armed for a form that no longer exists.
 */
export function useRegisterDirty(id: string, isDirty: boolean): void {
  useEffect(() => {
    if (isDirty) markDirty(id)
    else markClean(id)
  }, [id, isDirty])

  useEffect(() => () => { markClean(id) }, [id])
}
