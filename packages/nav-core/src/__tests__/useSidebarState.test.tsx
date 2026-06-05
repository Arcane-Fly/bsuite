import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory localStorage shim. Vitest + jsdom's built-in Storage impl is
// inconsistent across versions (sometimes missing `.clear()`), so we own
// the mock here, matching the shared storage-adapter test pattern.
function installLocalStorageMock() {
  const store: Record<string, string> = {}
  const mock = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
  }
  vi.stubGlobal('localStorage', mock)
  return mock
}

let storage = installLocalStorageMock()

// Import after the stub so the hook's initial read sees our mock.
import { useSidebarState } from '../useSidebarState'

beforeEach(() => {
  storage = installLocalStorageMock()
})

describe('useSidebarState — collapsed persistence', () => {
  it('defaults to expanded when no localStorage entry', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    expect(result.current.collapsed).toBe(false)
  })

  it('honours initialCollapsed when localStorage empty', () => {
    const { result } = renderHook(() =>
      useSidebarState({ storageKey: 'test-key', initialCollapsed: true }),
    )
    expect(result.current.collapsed).toBe(true)
  })

  it('reads a prior "true" from localStorage', () => {
    storage.setItem('test-key', 'true')
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    expect(result.current.collapsed).toBe(true)
  })

  it('reads a prior "false" from localStorage', () => {
    storage.setItem('test-key', 'false')
    const { result } = renderHook(() =>
      useSidebarState({ storageKey: 'test-key', initialCollapsed: true }),
    )
    expect(result.current.collapsed).toBe(false)
  })

  it('persists toggleCollapse to localStorage', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => result.current.toggleCollapse())
    expect(result.current.collapsed).toBe(true)
    expect(storage.getItem('test-key')).toBe('true')
    act(() => result.current.toggleCollapse())
    expect(result.current.collapsed).toBe(false)
    expect(storage.getItem('test-key')).toBe('false')
  })

  it('persists setCollapsed directly', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => result.current.setCollapsed(true))
    expect(result.current.collapsed).toBe(true)
    expect(storage.getItem('test-key')).toBe('true')
  })
})

describe('useSidebarState — mobile drawer', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    expect(result.current.mobileOpen).toBe(false)
  })

  it('toggleMobile flips state', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => result.current.toggleMobile())
    expect(result.current.mobileOpen).toBe(true)
    act(() => result.current.toggleMobile())
    expect(result.current.mobileOpen).toBe(false)
  })

  it('closeMobile forces closed even when already closed', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => result.current.closeMobile())
    expect(result.current.mobileOpen).toBe(false)
    act(() => result.current.toggleMobile())
    act(() => result.current.closeMobile())
    expect(result.current.mobileOpen).toBe(false)
  })

  it('Escape key closes an open drawer', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => result.current.toggleMobile())
    expect(result.current.mobileOpen).toBe(true)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(result.current.mobileOpen).toBe(false)
  })

  it('Escape key is a no-op when drawer is closed', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(result.current.mobileOpen).toBe(false)
  })

  it('mobile toggle does NOT persist (drawer is session-scoped)', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => result.current.toggleMobile())
    expect(storage.getItem('test-key')).toBeNull()
  })

  it('collapsed and mobileOpen are independent states', () => {
    const { result } = renderHook(() => useSidebarState({ storageKey: 'test-key' }))
    act(() => result.current.toggleCollapse())
    expect(result.current.collapsed).toBe(true)
    expect(result.current.mobileOpen).toBe(false)
    act(() => result.current.toggleMobile())
    expect(result.current.collapsed).toBe(true)
    expect(result.current.mobileOpen).toBe(true)
  })
})

describe('useSidebarState — resilience', () => {
  it('uses distinct storage keys so two apps do not clobber each other', () => {
    storage.setItem('app-a', 'true')
    storage.setItem('app-b', 'false')
    const a = renderHook(() => useSidebarState({ storageKey: 'app-a' }))
    const b = renderHook(() => useSidebarState({ storageKey: 'app-b' }))
    expect(a.result.current.collapsed).toBe(true)
    expect(b.result.current.collapsed).toBe(false)
  })
})
