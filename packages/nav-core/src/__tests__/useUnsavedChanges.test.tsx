/**
 * useUnsavedChanges — the guard is only worth anything if it comes OFF again.
 * A `beforeunload` that is never removed makes every navigation in the app
 * prompt, which is how a real guard gets deleted by the next person.
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  UNSAVED_CONFIRM_MESSAGE,
  markClean,
  markDirty,
  resetUnsavedChanges,
  useRegisterDirty,
  useUnsavedChanges,
} from '../useUnsavedChanges.js'

let addSpy: ReturnType<typeof vi.spyOn>
let removeSpy: ReturnType<typeof vi.spyOn>

function beforeUnloadCalls(spy: ReturnType<typeof vi.spyOn>): unknown[][] {
  return (spy.mock.calls as unknown[][]).filter((c) => c[0] === 'beforeunload')
}

beforeEach(() => {
  resetUnsavedChanges()
  addSpy = vi.spyOn(window, 'addEventListener')
  removeSpy = vi.spyOn(window, 'removeEventListener')
})

afterEach(() => {
  resetUnsavedChanges()
  addSpy.mockRestore()
  removeSpy.mockRestore()
})

describe('the dirty registry', () => {
  it('NEGATIVE — starts clean and installs no beforeunload', () => {
    const { result } = renderHook(() => useUnsavedChanges())
    expect(result.current.isDirty).toBe(false)
    expect(result.current.dirtyCount).toBe(0)
    expect(beforeUnloadCalls(addSpy)).toHaveLength(0)
  })

  it('POSITIVE — markDirty flips isDirty and ARMS beforeunload', () => {
    const { result } = renderHook(() => useUnsavedChanges())
    act(() => { markDirty('timesheet:42') })
    expect(result.current.isDirty).toBe(true)
    expect(result.current.dirtyCount).toBe(1)
    expect(beforeUnloadCalls(addSpy)).toHaveLength(1)
  })

  it('POSITIVE — markClean DISARMS it again', () => {
    const { result } = renderHook(() => useUnsavedChanges())
    act(() => { markDirty('timesheet:42') })
    act(() => { markClean('timesheet:42') })
    expect(result.current.isDirty).toBe(false)
    expect(beforeUnloadCalls(removeSpy).length).toBeGreaterThanOrEqual(1)
  })

  it('two dirty surfaces keep the guard armed until BOTH are clean', () => {
    const { result } = renderHook(() => useUnsavedChanges())
    act(() => { markDirty('a'); markDirty('b') })
    expect(result.current.dirtyCount).toBe(2)
    act(() => { markClean('a') })
    expect(result.current.isDirty).toBe(true)
    act(() => { markClean('b') })
    expect(result.current.isDirty).toBe(false)
  })

  it('markDirty is idempotent — a re-render does not stack listeners', () => {
    renderHook(() => useUnsavedChanges())
    act(() => { markDirty('a'); markDirty('a'); markDirty('a') })
    expect(beforeUnloadCalls(addSpy)).toHaveLength(1)
  })

  it('the handler calls preventDefault AND sets returnValue (Safari reads the legacy one)', () => {
    renderHook(() => useUnsavedChanges())
    act(() => { markDirty('a') })
    const handler = beforeUnloadCalls(addSpy)[0][1] as (e: Event) => void
    const event = { preventDefault: vi.fn(), returnValue: undefined } as unknown as BeforeUnloadEvent
    handler(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.returnValue).toBe('')
  })
})

describe('confirmLeave', () => {
  it('NEGATIVE — clean: returns true and never prompts', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result } = renderHook(() => useUnsavedChanges())
    expect(result.current.confirmLeave()).toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('POSITIVE — dirty: prompts with the estate wording and honours "cancel"', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result } = renderHook(() => useUnsavedChanges())
    act(() => { markDirty('a') })
    expect(result.current.confirmLeave()).toBe(false)
    expect(confirmSpy).toHaveBeenCalledWith(UNSAVED_CONFIRM_MESSAGE)
    expect(UNSAVED_CONFIRM_MESSAGE).toBe(
      'You have unsaved changes. Refresh anyway? They will be lost.',
    )
    confirmSpy.mockRestore()
  })

  it('POSITIVE — dirty and confirmed: returns true', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = renderHook(() => useUnsavedChanges())
    act(() => { markDirty('a') })
    expect(result.current.confirmLeave()).toBe(true)
    confirmSpy.mockRestore()
  })
})

describe('useRegisterDirty — the react-hook-form one-liner', () => {
  it('POSITIVE — registers while dirty, deregisters when saved', () => {
    const reader = renderHook(() => useUnsavedChanges())
    const form = renderHook(({ dirty }) => useRegisterDirty('apprentice-edit:7', dirty), {
      initialProps: { dirty: false },
    })
    expect(reader.result.current.isDirty).toBe(false)

    form.rerender({ dirty: true })
    expect(reader.result.current.isDirty).toBe(true)

    form.rerender({ dirty: false })
    expect(reader.result.current.isDirty).toBe(false)
  })

  it('POSITIVE — unmounting a dirty form clears its registration', () => {
    const reader = renderHook(() => useUnsavedChanges())
    const form = renderHook(() => useRegisterDirty('apprentice-edit:7', true))
    expect(reader.result.current.isDirty).toBe(true)
    form.unmount()
    expect(reader.result.current.isDirty).toBe(false)
    expect(beforeUnloadCalls(removeSpy).length).toBeGreaterThanOrEqual(1)
  })

  it('NEGATIVE — two forms with the SAME id: the second clean clears both (documented)', () => {
    const reader = renderHook(() => useUnsavedChanges())
    act(() => { markDirty('form'); markDirty('form') })
    expect(reader.result.current.dirtyCount).toBe(1)
    act(() => { markClean('form') })
    expect(reader.result.current.isDirty).toBe(false)
  })
})
