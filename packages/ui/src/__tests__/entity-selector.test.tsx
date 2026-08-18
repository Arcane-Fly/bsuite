/**
 * Ported from crm7's `EntitySelector.oneshot.test.tsx` when the component was
 * extracted into `@bsuite/ui` (AD-5, 2026-08-17). Behaviour is unchanged; only
 * the Supabase mock moves from a module mock (`vi.mock('@/lib/supabase', …)`)
 * to a plain object passed via the new `supabaseClient` prop, matching the
 * component's dependency-injection contract.
 *
 * One-shot data entry, pinned at the component that implements it.
 *
 * Operator, 2026-08-06, correcting a conflation of one-shot with DRY:
 *
 *   "its if a field is added on one page and its relevant to another page then
 *    i can add the field there and it'll pick up the linked options. so if
 *    placement has Qualification, and People record for someone has
 *    Qualification then i can just select that qualification in the page that
 *    comes second in my activities as a user."
 *
 * DRY is one row in one table. One-shot is the USER not typing the same thing
 * twice. This file tests the second thing.
 *
 * The behaviour that carries it is narrow and easy to regress: the linked
 * options must appear WITHOUT TYPING. An ordinary picker with `minChars` shows
 * nothing until the user searches — which is the exact moment they are being
 * asked to re-derive what the system already knows.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { EntitySelector } from '../entity-selector.js'

const QUALS = {
  'q-carpentry': { id: 'q-carpentry', title: 'Certificate III in Carpentry', code: 'CPC30220' },
  'q-plumbing': { id: 'q-plumbing', title: 'Certificate III in Plumbing', code: 'CPC32420' },
  'q-electro': { id: 'q-electro', title: 'Certificate III in Electrotechnology', code: 'UEE30820' },
}

/** Rows the `.in('id', …)` suggested query should return. */
let suggestedRows: unknown[] = []
/** Rows the ordinary catalogue search should return. */
let searchRows: unknown[] = []
/** Force the suggested-by-id query to fail, to prove graceful degradation. */
let suggestedFails = false

function makeQuery() {
  const state = { isIn: false }
  const result = () =>
    state.isIn
      ? suggestedFails
        ? { data: null, error: { message: 'rls denied' } }
        : { data: suggestedRows, error: null }
      : { data: searchRows, error: null }

  const q: Record<string, unknown> = {}
  const chain = () => q
  q.select = chain
  q.or = chain
  q.eq = chain
  q.limit = chain
  q.order = chain
  q.in = (_col: string) => {
    state.isIn = true
    return q
  }
  // Awaiting the builder resolves it, matching postgrest-js.
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve)
  return q
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSupabase: any = {
  from: () => makeQuery(),
  schema: () => ({ from: () => makeQuery() }),
}

type Qual = { id: string; title: string; code: string } & Record<string, unknown>

function renderPicker(props: Partial<React.ComponentProps<typeof EntitySelector>> = {}) {
  return render(
    <EntitySelector<Qual>
      supabaseClient={mockSupabase}
      table="qualifications"
      onSelect={() => {}}
      displayField={(r) => r.title}
      secondaryField={(r) => r.code}
      searchColumns={['title', 'code']}
      placeholder="Search qualifications..."
      {...(props as object)}
    />,
  )
}

beforeEach(() => {
  suggestedRows = []
  searchRows = Object.values(QUALS)
  suggestedFails = false
})
afterEach(cleanup)

describe('one-shot: already-linked options', () => {
  it('shows the linked option WITHOUT the user typing anything', async () => {
    // The person's record already says Carpentry. On the placement screen —
    // second in the user's workflow — that must be offered, not searched for.
    suggestedRows = [QUALS['q-carpentry']]
    const user = userEvent.setup()
    renderPicker({
      suggestedIds: ['q-carpentry'],
      suggestedLabel: "From Teagan Taylor's record",
    })

    await user.click(screen.getByRole('combobox'))

    await waitFor(() => {
      expect(screen.getByText("From Teagan Taylor's record")).toBeInTheDocument()
    })
    expect(screen.getByText('Certificate III in Carpentry')).toBeInTheDocument()
  })

  it('names WHERE the options came from, so the user can judge them', async () => {
    // A bare "Suggested" heading gives no basis to trust or ignore the row.
    suggestedRows = [QUALS['q-plumbing']]
    const user = userEvent.setup()
    renderPicker({
      suggestedIds: ['q-plumbing'],
      suggestedLabel: 'Preferred by Built Management Services',
    })
    await user.click(screen.getByRole('combobox'))
    await waitFor(() =>
      expect(screen.getByText('Preferred by Built Management Services')).toBeInTheDocument(),
    )
  })

  it('does NOT narrow the catalogue — every other option stays reachable', async () => {
    // One-shot suggests; it must never restrict. A genuinely new choice is
    // always available, which is the same advise-don't-block posture the rest
    // of this domain runs on.
    suggestedRows = [QUALS['q-carpentry']]
    const user = userEvent.setup()
    renderPicker({ suggestedIds: ['q-carpentry'] })

    await user.click(screen.getByRole('combobox'))

    await waitFor(() => expect(screen.getByText('All options')).toBeInTheDocument())
    expect(screen.getByText('Certificate III in Plumbing')).toBeInTheDocument()
    expect(screen.getByText('Certificate III in Electrotechnology')).toBeInTheDocument()
  })

  it('does not offer the same row twice', async () => {
    // The suggested row is also in the catalogue result. Rendering both reads
    // as two different qualifications.
    suggestedRows = [QUALS['q-carpentry']]
    const user = userEvent.setup()
    renderPicker({ suggestedIds: ['q-carpentry'] })

    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('All options')).toBeInTheDocument())

    expect(screen.getAllByText('Certificate III in Carpentry')).toHaveLength(1)
  })

  it('stops pinning the suggestion once the user starts searching', async () => {
    // By typing, the user has said the suggestion is not what they want.
    // Keeping it pinned above just pushes the real match down the list.
    suggestedRows = [QUALS['q-carpentry']]
    const user = userEvent.setup()
    renderPicker({ suggestedIds: ['q-carpentry'], suggestedLabel: 'From the person record' })

    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('From the person record')).toBeInTheDocument())

    searchRows = [QUALS['q-plumbing']]
    await user.type(screen.getByPlaceholderText('Search qualifications...'), 'plumb')

    await waitFor(() => {
      expect(screen.queryByText('From the person record')).not.toBeInTheDocument()
    })
  })

  it('behaves exactly as before when no suggestions are supplied', async () => {
    // The overwhelming majority of existing call sites pass nothing. They must
    // not gain a stray heading or an empty group.
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByRole('combobox'))
    await waitFor(() =>
      expect(screen.getByText('Certificate III in Carpentry')).toBeInTheDocument(),
    )
    expect(screen.queryByText('All options')).not.toBeInTheDocument()
    expect(screen.queryByText('Already linked')).not.toBeInTheDocument()
  })

  it('degrades to an ordinary picker when the suggested fetch fails', async () => {
    // An RLS denial on the suggestion must not take the catalogue down with it
    // — a broken convenience should not become a broken form.
    suggestedFails = true
    const user = userEvent.setup()
    renderPicker({ suggestedIds: ['q-carpentry'], suggestedLabel: 'From the person record' })

    await user.click(screen.getByRole('combobox'))

    await waitFor(() => expect(screen.getByText('Certificate III in Plumbing')).toBeInTheDocument())
    expect(screen.queryByText('From the person record')).not.toBeInTheDocument()
    // And specifically NOT the error state — the form still works.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

/**
 * ORDER BEFORE LIMIT.
 *
 * A `.limit()` with no `.order()` returns an ARBITRARY subset of the matches —
 * Postgres hands back whatever the scan reaches first. Once a table holds more
 * rows matching a search term than `limit`, the row the user just created is
 * routinely outside the window and the picker reports it does not exist.
 * Measured in crm7 before the fix: 366 clients matched `%Acme%` against a
 * limit of 50.
 *
 * crm7's local copy was fixed first; this suite exists because the SHARED
 * component still carried the defect afterwards, and conduit had already
 * adopted the shared one — so the bug was live in an app that never had it
 * locally. A fix that lands in a consumer and not in the package it was
 * extracted from is not fixed.
 */
describe('EntitySelector — ordering before limiting', () => {
  function orderSpyClient(opts: { orderFails?: boolean } = {}) {
    const calls: Array<{ order?: [string, { ascending: boolean }]; limited: boolean }> = []
    const make = () => {
      const rec: { order?: [string, { ascending: boolean }]; limited: boolean } = { limited: false }
      calls.push(rec)
      const q: Record<string, unknown> = {}
      const chain = () => q
      q.select = chain
      q.or = chain
      q.eq = chain
      q.in = chain
      q.order = (col: string, o: { ascending: boolean }) => {
        rec.order = [col, o]
        return q
      }
      q.limit = () => {
        rec.limited = true
        return q
      }
      q.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(
          rec.order && opts.orderFails
            ? { data: null, error: { code: '42703', message: `column "${rec.order[0]}" does not exist` } }
            : { data: [], error: null },
        ).then(resolve)
      return q
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = { from: () => make(), schema: () => ({ from: () => make() }) }
    return { client, calls }
  }

  it('orders by created_at descending by default, before the limit truncates', async () => {
    const { client, calls } = orderSpyClient()
    render(
      <EntitySelector<Qual>
        table="qualifications"
        supabaseClient={client}
        searchColumns={['title']}
        labelKey="title"
        valueKey="id"
        onSelect={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => expect(calls.some((c) => c.order)).toBe(true))
    const ordered = calls.find((c) => c.order)!
    expect(ordered.order![0]).toBe('created_at')
    expect(ordered.order![1].ascending).toBe(false)
    expect(ordered.limited).toBe(true)
  })

  it('honours an explicit orderBy for tables without created_at', async () => {
    const { client, calls } = orderSpyClient()
    render(
      <EntitySelector<Qual>
        table="award_rates"
        orderBy="effective_from"
        orderAscending
        supabaseClient={client}
        searchColumns={['title']}
        labelKey="title"
        valueKey="id"
        onSelect={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => expect(calls.some((c) => c.order)).toBe(true))
    const ordered = calls.find((c) => c.order)!
    expect(ordered.order![0]).toBe('effective_from')
    expect(ordered.order![1].ascending).toBe(true)
  })

  it('fails SOFT on an unknown order column — retries unordered rather than breaking the picker', async () => {
    // `table` is dynamic at some call sites (page-builder relationship widget,
    // admin data browser), so the default column is not guaranteed to exist.
    // Converting a working picker into a broken one would be worse than the
    // unordered behaviour it had before.
    const { client, calls } = orderSpyClient({ orderFails: true })
    render(
      <EntitySelector<Qual>
        table="some_registry_table"
        supabaseClient={client}
        searchColumns={['title']}
        labelKey="title"
        valueKey="id"
        onSelect={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => expect(calls.filter((c) => c.limited).length).toBeGreaterThanOrEqual(2))
    expect(calls.some((c) => c.order)).toBe(true)
    expect(calls.some((c) => !c.order && c.limited)).toBe(true)
  })
})
