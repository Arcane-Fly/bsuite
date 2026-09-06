import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { EntitySelector, type EntitySelectorSupabaseClient } from './entity-selector.js'

interface Client extends Record<string, unknown> {
  id: string
  name: string
  abn: string
  created_at: string
}

const ROWS: Client[] = [
  { id: '1', name: 'Acme Construction Pty Ltd', abn: '51 824 753 556', created_at: '2026-09-01' },
  { id: '2', name: 'Acme Civil Group', abn: '33 051 775 556', created_at: '2026-08-24' },
  { id: '3', name: 'Beacon Trades', abn: '12 345 678 901', created_at: '2026-08-19' },
  { id: '4', name: 'Coastal Plumbing', abn: '98 765 432 109', created_at: '2026-07-30' },
  { id: '5', name: 'Delta Electrical', abn: '11 222 333 444', created_at: '2026-07-11' },
]

/**
 * An in-memory stand-in for a Supabase client.
 *
 * `EntitySelector` takes the client as a PROP rather than importing one,
 * because each app's client is shaped differently (singleton vs per-request
 * factory, different `storageKey`). That is what makes the component testable
 * here at all — and it is why this fake is a legitimate harness, not a mock
 * standing in for the subject: the component's real code path runs, only the
 * transport is swapped.
 *
 * The builder is deliberately chainable-and-thenable in the same shape
 * PostgREST returns, so `.select().or().order().limit()` resolves the way the
 * component expects rather than the way a hand-written stub guesses.
 */
function makeFakeClient(opts: { fail?: boolean; latencyMs?: number } = {}) {
  const build = () => {
    let filtered = ROWS
    const builder: Record<string, unknown> = {}
    const chain = () => builder
    Object.assign(builder, {
      select: chain,
      eq: chain,
      in: chain,
      gte: chain,
      order: chain,
      limit: chain,
      or: (expr: string) => {
        const term = expr.split('.ilike.%')[1]?.split('%')[0]?.toLowerCase() ?? ''
        filtered = term
          ? ROWS.filter((r) => r.name.toLowerCase().includes(term) || r.abn.includes(term))
          : ROWS
        return builder
      },
      then: (
        resolve: (v: { data: Client[] | null; error: { message: string } | null }) => void,
      ) => {
        const settle = () =>
          resolve(
            opts.fail
              ? { data: null, error: { message: '42501: permission denied for table clients' } }
              : { data: filtered, error: null },
          )
        if (opts.latencyMs) setTimeout(settle, opts.latencyMs)
        else settle()
      },
    })
    return builder
  }
  const client: EntitySelectorSupabaseClient = {
    from: () => build(),
    schema: () => ({ from: () => build() }),
  }
  return client
}

/**
 * The shared entity picker — one of only three `@bsuite/ui` exports with real
 * multi-app adoption.
 *
 * The ordering prop is the interesting one. A `.limit()` with NO `.order()`
 * returns an arbitrary subset: Postgres hands back whatever the scan reaches
 * first. Once a table holds more matches than `limit`, the row the user just
 * created silently falls outside the window and the picker claims it does not
 * exist. Measured in crm7: 366 clients matched `%Acme%` against a limit of 50.
 * `orderBy` defaults to `created_at` descending so the newest match is always
 * offered.
 *
 * The `onQuickAdd` prop is the round-trip escape: it lets a user create the
 * missing record WITHOUT leaving the form they are filling in. Toggle it on
 * and off in Controls and ask whether finishing the task still requires
 * leaving the page.
 *
 * The props below are real `EntitySelector` props, forwarded verbatim by
 * `Harness`. The harness supplies only the transport and the controlled-value
 * plumbing that a story cannot express as static args.
 */
interface HarnessProps {
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  minChars?: number
  limit?: number
  debounceMs?: number
  onQuickAdd?: () => void
  quickAddLabel?: string
  selectedLabel?: string
  orderBy?: string
  orderAscending?: boolean
  /** Story-only: make the fake transport refuse the query. */
  fail?: boolean
  /** Story-only: delay the fake transport, to hold the in-flight state. */
  latencyMs?: number
}

const meta = {
  title: 'Data/EntitySelector',
  component: Harness,
  parameters: { layout: 'centered' },
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean', description: 'Offers a clear affordance on the selection.' },
    minChars: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: '0 loads on open; higher waits for typing.',
    },
    limit: {
      control: { type: 'range', min: 1, max: 50, step: 1 },
      description: 'Result window. Meaningless without orderBy — see the component notes.',
    },
    debounceMs: { control: { type: 'range', min: 0, max: 800, step: 50 } },
    quickAddLabel: { control: 'text' },
    selectedLabel: { control: 'text' },
    orderBy: { control: 'text' },
    orderAscending: { control: 'boolean' },
    fail: { control: 'boolean', description: 'Story-only: force a 42501 refusal.' },
    latencyMs: {
      control: { type: 'range', min: 0, max: 3000, step: 100 },
      description: 'Story-only: transport latency, to hold the in-flight state.',
    },
  },
} satisfies Meta<typeof Harness>

export default meta
type Story = StoryObj<typeof meta>

function Harness(args: HarnessProps) {
  const { fail, latencyMs, ...rest } = args
  const [value, setValue] = useState<string | undefined>(undefined)
  const [picked, setPicked] = useState<Client | null>(null)
  return (
    <div className="w-96 space-y-3">
      <EntitySelector<Client>
        supabaseClient={makeFakeClient({ fail, latencyMs })}
        table="clients"
        searchColumns={['name', 'abn']}
        displayField={(r) => r.name}
        secondaryField={(r) => `ABN ${r.abn}`}
        placeholder="Search clients…"
        minChars={0}
        {...rest}
        value={value}
        onSelect={(entity) => {
          setPicked(entity)
          setValue(entity?.id)
        }}
      />
      <p className="text-xs text-muted-foreground">
        Selected: <span className="font-mono text-foreground">{picked?.name ?? '(none)'}</span>
      </p>
    </div>
  )
}

/** Editable. Open it and type "acme" — two of five rows match. */
export const Playground: Story = {
  args: { placeholder: 'Search clients…', minChars: 0, clearable: true, limit: 20 },
}

/**
 * With the quick-add escape wired. This is the difference between "go to the
 * clients page, create it, come back and start this form again" and finishing
 * the task where you are.
 */
export const WithQuickAdd: Story = {
  args: {
    placeholder: 'Search clients…',
    minChars: 0,
    onQuickAdd: () => {},
    quickAddLabel: 'New client',
  },
}

/**
 * The query is REFUSED (42501). This must surface as an alert, never as an
 * empty result list — "you may not see this" read as "there is nothing here"
 * is the exact defect `DataUnavailable` exists to prevent, and a picker that
 * silently shows zero rows commits it too.
 */
export const QueryForbidden: Story = {
  args: { placeholder: 'Search clients…', minChars: 0, fail: true },
}

/** Slow transport — the in-flight state, which is otherwise a single frame. */
export const SlowQuery: Story = {
  args: { placeholder: 'Search clients…', minChars: 0, latencyMs: 1200 },
}

/** Disabled — the read-only shape a permission gate produces. */
export const Disabled: Story = {
  args: { placeholder: 'Search clients…', disabled: true },
}
