import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState } from './empty-state.js'
import { LoadingSpinner } from './loading-spinner.js'
import { Button } from './button.js'

/**
 * `EmptyState` is the "nothing here YET" surface — the one case where the
 * answer is genuinely none and the user is not being told a failure.
 * For an absence caused by a failure, refusal or unknown, use
 * `DataUnavailable` instead: collapsing those two is the defect that let an
 * RLS denial render as a clean empty list.
 */
const meta = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
  parameters: { layout: 'padded' },
  args: {
    title: 'No records yet',
    description:
      'Create or import records once the owning app has the canonical data.',
  },
  argTypes: {
    title: { control: 'text', description: 'A specific noun, in the user’s words.' },
    description: { control: 'text', description: 'One sentence on how to get out of the state.' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

/** Editable. Change the title/description; toggle the action on with `WithAction`. */
export const Playground: Story = {}

/**
 * With an action. An empty state that names no way out is a dead end — the
 * round-trip test applies here too: the escape should be doable on this page.
 */
export const WithAction: Story = {
  args: {
    action: <Button variant="outline">Create record</Button>,
  },
}

/** With a leading glyph. The icon is decorative; the title carries the meaning. */
export const WithIcon: Story = {
  args: {
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-10 w-10"
      >
        <path d="M3 7h18M3 12h18M3 17h9" strokeLinecap="round" />
      </svg>
    ),
    action: <Button variant="outline">Import a file</Button>,
  },
}

/**
 * Constrained to a narrow card. `min-h-48` is a floor, so the surface should
 * still breathe at the `xs` viewport — switch the viewport toolbar to xs — 480
 * and confirm the description does not clip mid-word.
 */
export const InNarrowCard: Story = {
  render: (args) => (
    <div className="max-w-xs rounded-lg border border-border bg-card p-3">
      <EmptyState {...args} />
    </div>
  ),
}

/**
 * The spinner, at all three sizes. It inherits `text-primary`, so it follows
 * tenant white-labelling rather than painting a fixed blue.
 */
export const Spinners: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <LoadingSpinner size={size} label={`Loading ${size}`} />
          <span className="text-xs text-muted-foreground">{size}</span>
        </div>
      ))}
    </div>
  ),
}
