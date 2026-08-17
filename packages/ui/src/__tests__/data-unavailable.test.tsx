import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DataUnavailable,
  resolveDataState,
  describeError,
  type DataUnavailableState,
} from '../data-unavailable.js'

const ALL_STATES: DataUnavailableState[] = ['loading', 'empty', 'error', 'forbidden', 'unavailable']

describe('DataUnavailable — the contract that replaces `query.data ?? FALLBACK`', () => {
  it('marks every state so a lint or test can prove a surface degraded honestly', () => {
    for (const state of ALL_STATES) {
      const { container, unmount } = render(<DataUnavailable state={state} />)
      const root = container.querySelector('[data-slot="data-unavailable"]') as HTMLElement
      expect(root).not.toBeNull()
      expect(root.getAttribute('data-state')).toBe(state)
      unmount()
    }
  })

  it('never renders the success tone — a failure is never green', () => {
    for (const state of ALL_STATES) {
      const { container, unmount } = render(<DataUnavailable state={state} />)
      const root = container.querySelector('[data-slot="data-unavailable"]') as HTMLElement
      expect(root.className).not.toContain('status-success')
      unmount()
    }
  })

  it('is visually not-a-card in every state (dashed border + hatch)', () => {
    for (const state of ALL_STATES) {
      const { container, unmount } = render(<DataUnavailable state={state} />)
      const root = container.querySelector('[data-slot="data-unavailable"]') as HTMLElement
      expect(root.className).toContain('border-dashed')
      expect(container.querySelector('pattern#bs-du-hatch')).not.toBeNull()
      unmount()
    }
  })

  it('separates "nothing exists" from "we could not find out" in the copy', () => {
    const { unmount } = render(<DataUnavailable state="empty" />)
    expect(screen.getByText(/real answer, not a failure/i)).toBeTruthy()
    unmount()

    render(<DataUnavailable state="error" />)
    expect(screen.getByText(/not an empty result/i)).toBeTruthy()
  })

  it('surfaces the verbatim reason so a denial is distinguishable from a fault', () => {
    render(
      <DataUnavailable
        state="forbidden"
        reason={'[42501] permission denied for table compliance_items'}
      />,
    )
    expect(screen.getByText(/permission denied for table compliance_items/)).toBeTruthy()
  })

  it('announces failures assertively and loading politely', () => {
    const { container, unmount } = render(<DataUnavailable state="error" />)
    const err = container.querySelector('[data-slot="data-unavailable"]') as HTMLElement
    expect(err.getAttribute('role')).toBe('alert')
    expect(err.getAttribute('aria-live')).toBe('assertive')
    unmount()

    const { container: c2 } = render(<DataUnavailable state="loading" />)
    const load = c2.querySelector('[data-slot="data-unavailable"]') as HTMLElement
    expect(load.getAttribute('role')).toBe('status')
    expect(load.getAttribute('aria-busy')).toBe('true')
  })

  it('offers retry where retrying can help, and suppresses it where it cannot', async () => {
    const onRetry = vi.fn()
    const { unmount } = render(<DataUnavailable state="error" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
    unmount()

    // A permission denial is not a transient fault; a retry button invites the
    // user to mistake it for one.
    render(<DataUnavailable state="forbidden" onRetry={onRetry} />)
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })
})

describe('resolveDataState — there is no fourth answer', () => {
  it('routes a pending query to loading', () => {
    expect(resolveDataState({ data: undefined, isPending: true })).toBe('loading')
  })

  it('routes a successful empty array to empty, NOT to error', () => {
    expect(resolveDataState({ data: [], isPending: false })).toBe('empty')
  })

  it('routes populated data to ready', () => {
    expect(resolveDataState({ data: [1, 2], isPending: false })).toBe('ready')
  })

  it('classifies an RLS denial as forbidden, not as a generic error', () => {
    // This is the K-2 defect in one assertion: the denial must not be able to
    // reach the same branch that a network blip reaches, because the old code
    // sent both to a fabricated 95% compliance score.
    expect(
      resolveDataState({
        data: undefined,
        isError: true,
        error: { code: '42501', message: 'permission denied for table compliance_items' },
      }),
    ).toBe('forbidden')

    expect(
      resolveDataState({ data: undefined, isError: true, error: { status: 403 } }),
    ).toBe('forbidden')
  })

  it('classifies a transport failure as error', () => {
    expect(
      resolveDataState({ data: undefined, isError: true, error: new Error('Failed to fetch') }),
    ).toBe('error')
  })

  it('treats undefined data on a settled query as error, never as empty', () => {
    // The whole class of bug is "absent data rendered as a confident answer".
    // Undefined must never be allowed to read as "nothing exists".
    expect(resolveDataState({ data: undefined, isPending: false })).toBe('error')
  })

  it('accepts a custom emptiness predicate for object-shaped payloads', () => {
    const isEmpty = (d: { items: unknown[] }) => d.items.length === 0
    expect(resolveDataState({ data: { items: [] }, isPending: false }, isEmpty)).toBe('empty')
    expect(resolveDataState({ data: { items: [1] }, isPending: false }, isEmpty)).toBe('ready')
  })
})

describe('describeError', () => {
  it('keeps the Postgres code, which is what distinguishes the failure modes', () => {
    expect(describeError({ code: '42501', message: 'permission denied' })).toBe(
      '[42501] permission denied',
    )
  })

  it('handles Error, string and unknown shapes without throwing', () => {
    expect(describeError(new Error('boom'))).toBe('boom')
    expect(describeError('plain')).toBe('plain')
    expect(describeError(null)).toBe('Unknown error')
    expect(describeError({ weird: true })).toBe('{"weird":true}')
  })
})
