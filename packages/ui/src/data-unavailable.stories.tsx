import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  DataUnavailable,
  resolveDataState,
  type DataUnavailableState,
  type QueryLike,
} from './data-unavailable.js'
import { Button } from './button.js'

const STATES: DataUnavailableState[] = ['loading', 'empty', 'error', 'forbidden', 'unavailable']

/**
 * The honest-absence surface. It replaces the `query.data ?? HARDCODED_FALLBACK`
 * idiom that once rendered a fabricated 95% compliance score — including
 * "Fair Work Compliance — Award rates verified" — when the underlying query
 * had actually been denied by RLS. An authorization failure was shown to the
 * user as a compliance assurance.
 *
 * The distinctions this component exists to keep apart are the ones to check
 * visually here:
 *
 *   empty       the query succeeded and the answer is genuinely "none"
 *   error       the query failed; we do not know the answer
 *   forbidden   the data may exist; THIS caller may not see it
 *   unavailable no queryable source is reachable at all
 *
 * A null meaning UNKNOWN must never read as UNRESTRICTED, and `empty` must
 * never be reachable from a failure. Flip `state` in Controls and confirm the
 * four failure states never borrow `empty`'s calm, and that none of them is
 * green — a failure is never success-toned.
 */
const meta = {
  title: 'Primitives/DataUnavailable',
  component: DataUnavailable,
  parameters: { layout: 'padded' },
  args: {
    state: 'error',
    title: 'Charge rates',
    description: undefined,
    reason: 'PGRST301: JWT expired',
    retryLabel: 'Try again',
    size: 'block',
  },
  argTypes: {
    state: {
      control: 'inline-radio',
      options: STATES,
      description: 'Which absence this is. The four failure states must stay distinguishable.',
    },
    title: {
      control: 'text',
      description: 'What could not be shown, as a SPECIFIC noun — "Budgets", not "Data".',
    },
    description: { control: 'text', description: 'Overrides the preset prose.' },
    reason: {
      control: 'text',
      description:
        'The verbatim failure reason, rendered monospace. A sanitised reason is how "unknown" becomes "fine" again.',
    },
    size: {
      control: 'inline-radio',
      options: ['compact', 'block'],
      description: '`compact` suits an inline card slot; `block` a full page region.',
    },
    retryLabel: { control: 'text' },
    onRetry: { action: 'retry' },
  },
} satisfies Meta<typeof DataUnavailable>

export default meta
type Story = StoryObj<typeof meta>

/** Editable. Step `state` through all five; edit `reason` and watch it render verbatim. */
export const Playground: Story = {}

/**
 * All five states stacked. This is the story that answers "can a user tell
 * 'there is nothing' from 'we could not find out' from 'you may not look'?"
 * If any two of these read the same, the component has stopped doing its job.
 */
export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid gap-6">
      {STATES.map((state) => (
        <DataUnavailable
          key={state}
          state={state}
          title={`Charge rates — ${state}`}
          reason={state === 'empty' || state === 'loading' ? undefined : `demo reason for ${state}`}
          onRetry={state === 'forbidden' ? undefined : () => {}}
        />
      ))}
    </div>
  ),
}

/**
 * `forbidden` deliberately carries NO retry — retrying an authorization
 * refusal cannot help, and offering the button implies the failure is
 * transient. The escape hatch is a site-specific action instead.
 */
export const ForbiddenHasNoRetry: Story = {
  args: {
    state: 'forbidden',
    title: 'Payroll exports',
    reason: '42501: permission denied for table payroll_exports',
    action: <Button variant="outline">Request access</Button>,
  },
}

/**
 * `compact` in a card slot — the shape most real call sites use, and the one
 * where a too-tall empty state pushes the rest of the page off screen.
 */
export const CompactInCard: Story = {
  args: { size: 'compact', state: 'empty', title: 'Timesheets', reason: undefined },
  render: (args) => (
    <div className="max-w-md rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">This week</h3>
      <DataUnavailable {...args} />
    </div>
  ),
}

/**
 * `resolveDataState` is the pure mapper that keeps call sites from
 * re-deriving the branching (and re-inventing the `??` fallback). This story
 * runs it over real query shapes and prints what each resolves to, so the
 * mapping is checkable rather than asserted.
 */
export const ResolverTruthTable: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const cases: Array<[string, QueryLike<{ id: number }[]>]> = [
      ['isPending', { data: undefined, isPending: true }],
      [
        'isError + 42501',
        { data: undefined, isError: true, error: new Error('42501: permission denied') },
      ],
      [
        'isError + network',
        { data: undefined, isError: true, error: new Error('Failed to fetch') },
      ],
      ['settled, data undefined', { data: undefined }],
      ['settled, data []', { data: [] }],
      ['settled, data [row]', { data: [{ id: 1 }] }],
    ]
    return (
      <table className="w-full max-w-2xl text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 font-semibold text-foreground">Query shape</th>
            <th className="py-2 font-semibold text-foreground">resolveDataState →</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(([label, query]) => (
            <tr key={label} className="border-b border-border">
              <td className="py-2 font-mono text-xs text-muted-foreground">{label}</td>
              <td className="py-2 font-mono text-xs text-foreground">
                {String(resolveDataState(query))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  },
}
