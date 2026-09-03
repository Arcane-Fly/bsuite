/**
 * useAppUpdateAvailable — every assertion here has a POSITIVE and a NEGATIVE
 * control, because the failure this hook exists to prevent is a check that
 * always says "fine". A test that only proves the banner CAN appear cannot tell
 * a working detector from one wired to `true`.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppUpdateAvailable } from '../useAppUpdateAvailable.js'

function memoryStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    raw: store,
  }
}

/** A `/version.json` response carrying `commit`. */
function jsonResponse(commit: string): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null) },
    json: async () => ({ commit, builtAt: '2026-09-03T03:00:00.000Z' }),
  } as unknown as Response
}

/**
 * What every app in this estate ACTUALLY serves for a missing /version.json:
 * the SPA catch-all rewrite answers 200 with the index page.
 */
function htmlResponse(status = 200): Response & { json: ReturnType<typeof vi.fn> } {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null) },
    json: vi.fn(async () => { throw new SyntaxError('Unexpected token <') }),
  } as unknown as Response & { json: ReturnType<typeof vi.fn> }
}

let fetchMock: ReturnType<typeof vi.fn>
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  errorSpy.mockRestore()
})

describe('detection', () => {
  it('POSITIVE — flips versionChanged when the served commit differs', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    expect(result.current.latestCommit).toBe('bbbbbbb')
    expect(result.current.runningCommit).toBe('aaaaaaa')
    expect(result.current.updateCheckBroken).toBeNull()
  })

  it('NEGATIVE — does NOT flip when the served commit is the same', async () => {
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.latestCommit).toBe('aaaaaaa'))
    expect(result.current.versionChanged).toBe(false)
  })

  it('POSITIVE (R2: ANY difference) — a 40-char sha and its 7-char prefix are NOT the same build', async () => {
    // Both halves come from ONE resolver with ONE commitLength, so a length
    // mismatch means an app kept a hand-rolled define beside the plugin. That
    // is reported, not papered over with prefix tolerance.
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa1234567890abcdef1234567890abcdef1'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.latestCommit).toBeTruthy())
    expect(result.current.versionChanged).toBe(true)
  })

  it('POSITIVE (R2: a rollback is a change too) — an OLDER commit still flips versionChanged', async () => {
    // Instant Rollback moves the deployed commit backwards. There is no
    // ordering here to get wrong: the strings differ, so the version changed.
    fetchMock.mockResolvedValue(jsonResponse('0000000'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'fffffff', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
  })

  it('NEGATIVE — a served commit that is only a sentinel (local/unknown/empty) is malformed, not a change', async () => {
    fetchMock.mockResolvedValue(jsonResponse('local'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.updateCheckBroken).toBe('malformed'))
    expect(result.current.versionChanged).toBe(false)
  })

  it('fetches with cache: no-store so a CDN cannot answer from the old build', async () => {
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa'))
    renderHook(() => useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/version.json')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' })
  })

  it('re-checks when a backgrounded tab becomes visible again', async () => {
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa'))
    renderHook(() => useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
})

describe('a broken check is loud, never silent', () => {
  it('POSITIVE — 200 text/html sets updateCheckBroken and logs ONCE', async () => {
    const html = htmlResponse(200)
    fetchMock.mockResolvedValue(html)
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', intervalMs: 5, storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.updateCheckBroken).toBe('not-json'))
    expect(result.current.versionChanged).toBe(false)
    // R3(a): the content-type is asserted BEFORE parsing — the body is never read.
    expect(html.json).not.toHaveBeenCalled()

    // Keep polling — a broken check must not switch itself off.
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(2))
    // …and must not shout on every poll.
    const notJsonLogs = (errorSpy.mock.calls as unknown[][]).filter((c) => String(c[0]).includes('is not served as JSON'))
    expect(notJsonLogs).toHaveLength(1)
    expect(String(notJsonLogs[0][0])).toContain('status 200')
    expect(String(notJsonLogs[0][0])).toContain('text/html')
  })

  it('POSITIVE — a non-200 sets bad-status', async () => {
    fetchMock.mockResolvedValue(htmlResponse(307))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.updateCheckBroken).toBe('bad-status'))
  })

  it('POSITIVE — a fetch that never completes sets unreachable, and does not throw', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.updateCheckBroken).toBe('unreachable'))
  })

  it('POSITIVE — a broken check RECOVERS: html now, json later clears updateCheckBroken and detects the change', async () => {
    let serveJson = false
    fetchMock.mockImplementation(async () => (serveJson ? jsonResponse('bbbbbbb') : htmlResponse(200)))
    const storage = memoryStorage()
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', intervalMs: 5, storage }),
    )
    await waitFor(() => expect(result.current.updateCheckBroken).toBe('not-json'))
    expect(result.current.versionChanged).toBe(false)
    serveJson = true
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    expect(result.current.updateCheckBroken).toBeNull()
  })

  it('POSITIVE — application/json that does not parse is malformed, and the body IS read (content-type passed)', async () => {
    const json = vi.fn(async () => { throw new SyntaxError('bad json') })
    fetchMock.mockResolvedValue({
      ok: true, status: 200, headers: { get: () => 'application/json' }, json,
    } as unknown as Response)
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.updateCheckBroken).toBe('malformed'))
    expect(json).toHaveBeenCalledTimes(1)
  })

  it('POSITIVE — no running commit reports no-build-commit and never fetches', async () => {
    const { result } = renderHook(() => useAppUpdateAvailable({ storage: memoryStorage() }))
    await waitFor(() => expect(result.current.updateCheckBroken).toBe('no-build-commit'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.versionChanged).toBe(false)
  })

  it('NEGATIVE — valid JSON leaves updateCheckBroken null and logs nothing', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    expect(result.current.updateCheckBroken).toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('control: the kill switch and severity', () => {
  it('POSITIVE — enabled:false hides everything and stops polling', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({
        runningCommit: 'aaaaaaa',
        control: { enabled: false },
        storage: memoryStorage(),
      }),
    )
    await act(async () => { await Promise.resolve() })
    expect(result.current.versionChanged).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSITIVE — flipping enabled true -> false mid-session hides the notice and stops the poll', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useAppUpdateAvailable({ runningCommit: 'aaaaaaa', intervalMs: 5, control: { enabled }, storage: memoryStorage() }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    rerender({ enabled: false })
    expect(result.current.versionChanged).toBe(false)
    const callsAtDisable = fetchMock.mock.calls.length
    await new Promise((r) => setTimeout(r, 30))
    expect(fetchMock.mock.calls.length).toBe(callsAtDisable)
  })

  it('POSITIVE — severity: critical is exposed as dismissed:false on EVERY poll, even after dismiss()', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const storage = memoryStorage()
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', intervalMs: 5, control: { severity: 'critical' }, storage }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    act(() => { result.current.dismiss() })
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(2))
    expect(result.current.dismissed).toBe(false)
    expect(result.current.versionChanged).toBe(true)
  })

  it('NEGATIVE — severity: warning IS dismissible (only critical is not)', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const storage = memoryStorage()
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', control: { severity: 'warning' }, storage }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    act(() => { result.current.dismiss() })
    expect(result.current.dismissed).toBe(true)
  })

  it('NEGATIVE — the same setup with enabled omitted DOES notify', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    expect(fetchMock).toHaveBeenCalled()
  })
})

describe('dismissal', () => {
  it('POSITIVE — dismiss() hides it, and the dismissal survives a re-render', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const storage = memoryStorage()
    const { result, rerender } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    expect(result.current.dismissed).toBe(false)

    act(() => { result.current.dismiss() })
    expect(result.current.dismissed).toBe(true)
    expect(storage.raw['bsuite:update-dismissed:bbbbbbb']).toBe('1')

    rerender()
    expect(result.current.dismissed).toBe(true)
  })

  it('POSITIVE (R6) — with no storage option the key lands in sessionStorage, keyed by the DETECTED commit', async () => {
    sessionStorage.clear()
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const { result } = renderHook(() => useAppUpdateAvailable({ runningCommit: 'aaaaaaa' }))
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    act(() => { result.current.dismiss() })
    expect(sessionStorage.getItem('bsuite:update-dismissed:bbbbbbb')).toBe('1')
    // Keyed by the DETECTED commit, never the running one.
    expect(sessionStorage.getItem('bsuite:update-dismissed:aaaaaaa')).toBeNull()
    expect(localStorage.getItem('bsuite:update-dismissed:bbbbbbb')).toBeNull()
    sessionStorage.clear()
  })

  it('NEGATIVE — a dismissal for one commit does NOT carry to a different one', async () => {
    const storage = memoryStorage()
    storage.setItem('bsuite:update-dismissed:bbbbbbb', '1')
    fetchMock.mockResolvedValue(jsonResponse('ccccccc'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage }),
    )
    await waitFor(() => expect(result.current.latestCommit).toBe('ccccccc'))
    expect(result.current.dismissed).toBe(false)
  })

  it('POSITIVE — critical is NOT dismissible and stays visible', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const storage = memoryStorage()
    storage.setItem('bsuite:update-dismissed:bbbbbbb', '1')
    const { result } = renderHook(() =>
      useAppUpdateAvailable({
        runningCommit: 'aaaaaaa',
        control: { severity: 'critical' },
        storage,
      }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    // Already "dismissed" in storage, and still not dismissed.
    expect(result.current.dismissed).toBe(false)
    act(() => { result.current.dismiss() })
    expect(result.current.dismissed).toBe(false)
  })
})

describe('escalation', () => {
  it('POSITIVE — an app signal escalates without any poll saying so', async () => {
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa'))
    let raise: ((reason?: string) => void) | undefined
    const { result } = renderHook(() =>
      useAppUpdateAvailable({
        runningCommit: 'aaaaaaa',
        storage: memoryStorage(),
        onSignal: (fn) => { raise = fn },
      }),
    )
    await waitFor(() => expect(result.current.latestCommit).toBe('aaaaaaa'))
    expect(result.current.escalated).toBe(false)

    act(() => { raise?.('vite:preloadError') })
    expect(result.current.escalated).toBe(true)
    expect(result.current.versionChanged).toBe(false)
  })

  it('POSITIVE — escalation after a dismissal re-shows the notice', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    let raise: ((reason?: string) => void) | undefined
    const storage = memoryStorage()
    const { result } = renderHook(() =>
      useAppUpdateAvailable({
        runningCommit: 'aaaaaaa',
        storage,
        onSignal: (fn) => { raise = fn },
      }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    act(() => { result.current.dismiss() })
    expect(result.current.dismissed).toBe(true)

    act(() => { raise?.('chunk-load-error') })
    expect(result.current.dismissed).toBe(false)
    expect(result.current.escalated).toBe(true)
  })

  it('NEGATIVE — with no signal fed, escalated stays false', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const { result } = renderHook(() =>
      useAppUpdateAvailable({ runningCommit: 'aaaaaaa', storage: memoryStorage() }),
    )
    await waitFor(() => expect(result.current.versionChanged).toBe(true))
    expect(result.current.escalated).toBe(false)
  })

  it('unsubscribes the app signal on unmount', async () => {
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa'))
    const cleanup = vi.fn()
    const { unmount } = renderHook(() =>
      useAppUpdateAvailable({
        runningCommit: 'aaaaaaa',
        storage: memoryStorage(),
        onSignal: () => cleanup,
      }),
    )
    expect(cleanup).not.toHaveBeenCalled()
    unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})
