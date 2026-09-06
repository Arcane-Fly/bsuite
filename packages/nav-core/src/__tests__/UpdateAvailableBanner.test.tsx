/**
 * UpdateAvailableBanner.
 *
 * The load-bearing assertions are the NEGATIVE ones: it renders NOTHING when
 * the build has not changed, and Refresh does NOT reload when a form is dirty
 * and the person cancels. Those two are the whole promise made to a client with
 * a half-filled timesheet open.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UPDATE_BANNER_SLOT, UpdateAvailableBanner } from '../UpdateAvailableBanner.js'
import { markDirty, resetUnsavedChanges } from '../useUnsavedChanges.js'

function memoryStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
  }
}

function jsonResponse(commit: string): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ commit, builtAt: '2026-09-03T03:00:00.000Z' }),
  } as unknown as Response
}

const NORMAL = 'This app has been updated. Save your work, then refresh.'
const ESCALATED = 'This tab is out of date and may stop working. Save your work, then refresh.'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  resetUnsavedChanges()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  resetUnsavedChanges()
  vi.unstubAllGlobals()
})

describe('what it renders', () => {
  it('NEGATIVE — renders nothing when the deployed commit matches', async () => {
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa'))
    const { container } = render(
      <UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }} />,
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(container.querySelector(`[data-slot="${UPDATE_BANNER_SLOT}"]`)).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('POSITIVE — a changed commit renders role="status" aria-live="polite" with the normal copy', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }} />)
    const banner = await screen.findByRole('status')
    expect(banner).toHaveAttribute('aria-live', 'polite')
    expect(banner).toHaveAttribute('data-slot', UPDATE_BANNER_SLOT)
    expect(banner).toHaveTextContent(NORMAL)
    // R2: the word "new" nowhere — a rollback moves the commit backwards.
    expect(banner.textContent ?? '').not.toMatch(/\bnew\b/i)
  })

  it('R2 — neither copy, escalated or normal, uses the word "new"', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    let raise: ((reason?: string) => void) | undefined
    render(
      <UpdateAvailableBanner
        update={{ runningCommit: 'aaaaaaa', storage: memoryStorage(), onSignal: (fn) => { raise = fn } }}
      />,
    )
    const banner = await screen.findByRole('status')
    expect(banner.textContent ?? '').not.toMatch(/\bnew\b/i)
    raise?.('chunk')
    await waitFor(() => expect(banner).toHaveTextContent(ESCALATED))
    expect(banner.textContent ?? '').not.toMatch(/\bnew\b/i)
  })

  it('POSITIVE — an escalated signal renders the escalated copy instead', async () => {
    fetchMock.mockResolvedValue(jsonResponse('aaaaaaa'))
    let raise: ((reason?: string) => void) | undefined
    render(
      <UpdateAvailableBanner
        update={{
          runningCommit: 'aaaaaaa',
          storage: memoryStorage(),
          onSignal: (fn) => { raise = fn },
        }}
      />,
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByRole('status')).toBeNull()
    raise?.('vite:preloadError')
    const banner = await screen.findByRole('status')
    expect(banner).toHaveTextContent(ESCALATED)
  })

  it('uses only role tokens the SHARED theme generates — never bg-info/bg-warning', async () => {
    // `--color-info` and `--color-warning` are declared privately by crm7 and
    // business-suite-unified and by NOBODY else, so `bg-info/10` paints nothing
    // in conduit, braden, throughput or R80.4. See the docblock in
    // UpdateAvailableBanner.tsx.
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }} />)
    const banner = await screen.findByRole('status')
    const classes = banner.className
    expect(classes).toContain('bg-role-info/10')
    expect(classes).toContain('border-role-info/30')
    expect(classes).toContain('text-info-text')
    expect(classes).not.toMatch(/(^|\s)bg-info\//)
    expect(classes).not.toMatch(/(^|\s)bg-warning\//)
    // No raw colour and no pure white or black anywhere in the tree.
    expect(banner.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(banner.outerHTML).not.toMatch(/oklch\(/)
    expect(banner.outerHTML).not.toMatch(/rgba?\(/)
    expect(banner.outerHTML).not.toMatch(/\b(bg|text|border)-(white|black)\b/)
    expect(banner.outerHTML).not.toContain('style=')
  })

  it('warning severity paints the warning role set', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    render(
      <UpdateAvailableBanner
        control={{ severity: 'warning' }}
        update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }}
      />,
    )
    const banner = await screen.findByRole('status')
    expect(banner.className).toContain('bg-role-warning/10')
    expect(banner.className).toContain('text-warning-text')
    expect(screen.getByLabelText('Dismiss update notice')).toBeInTheDocument()
  })

  it('critical uses the destructive set, offers NO dismiss, and ignores a stored dismissal', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const storage = memoryStorage()
    storage.setItem('bsuite:update-dismissed:bbbbbbb', '1')
    render(
      <UpdateAvailableBanner
        control={{ severity: 'critical' }}
        update={{ runningCommit: 'aaaaaaa', storage }}
      />,
    )
    const banner = await screen.findByRole('status')
    expect(banner.className).toContain('bg-destructive/10')
    expect(banner.className).toContain('text-error-text')
    expect(screen.queryByLabelText('Dismiss update notice')).toBeNull()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('NEGATIVE — a broken check (200 text/html) renders NOTHING: no banner is not the same as a stale one, and it is logged', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue({
      ok: true, status: 200, headers: { get: () => 'text/html' }, json: async () => { throw new SyntaxError('<') },
    } as unknown as Response)
    render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }} />)
    await waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('status')).toBeNull()
    errorSpy.mockRestore()
  })

  it('NEGATIVE — enabled:false renders nothing even with a changed commit', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    render(
      <UpdateAvailableBanner
        control={{ enabled: false }}
        update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }}
      />,
    )
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('compact only changes padding, never the copy', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    render(
      <UpdateAvailableBanner compact update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }} />,
    )
    const banner = await screen.findByRole('status')
    expect(banner.className).toContain('px-3')
    expect(banner).toHaveTextContent(NORMAL)
  })

  it('carries no transition — prefers-reduced-motion is respected by having no motion', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }} />)
    const banner = await screen.findByRole('status')
    expect(banner.outerHTML).not.toContain('transition')
    expect(banner.outerHTML).not.toContain('animate-')
  })
})

describe('Refresh', () => {
  it('POSITIVE — clean: calls onRefresh once', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const onRefresh = vi.fn()
    render(
      <UpdateAvailableBanner
        onRefresh={onRefresh}
        update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }}
      />,
    )
    await screen.findByRole('status')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('POSITIVE — with no onRefresh, Refresh calls window.location.reload() exactly once', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const original = window.location
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } })
    try {
      render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }} />)
      await screen.findByRole('status')
      expect(reload).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  })

  it('NEGATIVE — the banner NEVER reloads on its own: a changed commit, an escalation, a dismissal — zero reloads', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const original = window.location
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } })
    let raise: ((reason?: string) => void) | undefined
    try {
      render(
        <UpdateAvailableBanner
          update={{ runningCommit: 'aaaaaaa', storage: memoryStorage(), intervalMs: 5, onSignal: (fn) => { raise = fn } }}
        />,
      )
      await screen.findByRole('status')
      raise?.('vite:preloadError')
      await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(2))
      expect(reload).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  })

  it('NEGATIVE — dirty and the person cancels: does NOT refresh', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onRefresh = vi.fn()
    render(
      <UpdateAvailableBanner
        onRefresh={onRefresh}
        update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }}
      />,
    )
    await screen.findByRole('status')
    markDirty('timesheet:42')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes. Refresh anyway? They will be lost.',
    )
    expect(onRefresh).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('POSITIVE — dirty and the person accepts: refreshes', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onRefresh = vi.fn()
    render(
      <UpdateAvailableBanner
        onRefresh={onRefresh}
        update={{ runningCommit: 'aaaaaaa', storage: memoryStorage() }}
      />,
    )
    await screen.findByRole('status')
    markDirty('timesheet:42')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })
})

describe('Dismiss', () => {
  it('POSITIVE — removes the banner, keyed by the detected commit', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const storage = memoryStorage()
    render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage }} />)
    await screen.findByRole('status')
    fireEvent.click(screen.getByLabelText('Dismiss update notice'))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(storage.getItem('bsuite:update-dismissed:bbbbbbb')).toBe('1')
  })

  it('POSITIVE — a LATER deploy (different commit) re-shows a dismissed banner', async () => {
    let served = 'bbbbbbb'
    fetchMock.mockImplementation(async () => jsonResponse(served))
    const storage = memoryStorage()
    render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage, intervalMs: 5 }} />)
    await screen.findByRole('status')
    fireEvent.click(screen.getByLabelText('Dismiss update notice'))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(storage.getItem('bsuite:update-dismissed:bbbbbbb')).toBe('1')
    // the next deploy lands — the bbbbbbb dismissal must not cover it
    served = 'ccccccc'
    await screen.findByRole('status')
    expect(storage.getItem('bsuite:update-dismissed:ccccccc')).toBeNull()
  })

  it('NEGATIVE — a dismissal stored for the SAME detected commit keeps it hidden across a remount', async () => {
    fetchMock.mockResolvedValue(jsonResponse('bbbbbbb'))
    const storage = memoryStorage()
    storage.setItem('bsuite:update-dismissed:bbbbbbb', '1')
    render(<UpdateAvailableBanner update={{ runningCommit: 'aaaaaaa', storage }} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('packaging — the Vite plugin never reaches a browser bundle', () => {
  const src = path.resolve(__dirname, '..')

  it('index.ts does not import or re-export ./vite', () => {
    const index = readFileSync(path.join(src, 'index.ts'), 'utf8')
    expect(index).not.toMatch(/from ['"]\.\/vite(\.js)?['"]/)
  })

  it('no browser-side module imports node: built-ins', () => {
    for (const f of ['index.ts', 'buildInfo.ts', 'useAppUpdateAvailable.ts', 'useUnsavedChanges.ts', 'UpdateAvailableBanner.tsx']) {
      const text = readFileSync(path.join(src, f), 'utf8')
      expect(text, f).not.toMatch(/from ['"]node:/)
    }
  })

  it('POSITIVE control — vite.ts itself DOES import node: built-ins (so the test above can fail)', () => {
    expect(readFileSync(path.join(src, 'vite.ts'), 'utf8')).toMatch(/from ['"]node:/)
  })

  it('package.json exposes ./vite as its own subpath export', () => {
    const pkg = JSON.parse(readFileSync(path.join(src, '..', 'package.json'), 'utf8')) as { exports: Record<string, unknown> }
    expect(pkg.exports['./vite']).toEqual({ import: './dist/vite.js', types: './dist/vite.d.ts' })
  })
})
