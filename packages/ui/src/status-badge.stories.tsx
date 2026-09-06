import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusBadge, type StatusBadgeTone } from './status-badge.js'

const TONES: StatusBadgeTone[] = ['neutral', 'info', 'success', 'warning', 'destructive']

/**
 * ---------------------------------------------------------------------------
 * KNOWN DEFECT, MADE VISIBLE ON PURPOSE — `success` and `warning` DO NOT PAINT.
 *
 * `StatusBadge` binds its success and warning tones to a `status-*` utility
 * namespace:
 *
 *     success: 'border-status-success/20 bg-status-success/10 text-status-success'
 *     warning: 'border-status-warning/20 bg-status-warning/10 text-status-warning'
 *
 * `@bsuite/theme` ships NO `status-*` colour. `preset-v4.css` defines
 * `--color-role-success` and `--color-role-warning`; there is no
 * `--color-status-success` anywhere in the package. Tailwind therefore emits
 * no rule at all for those class names, and both tones fall through to the
 * inherited body colour on a transparent ground — identical to each other and
 * to plain text.
 *
 * Measured on this harness's own build: a full recursive walk of every
 * CSSRule in the rendered document returned ZERO selectors containing
 * `status-`. The two tones are dead in every consumer.
 *
 * WHY IT SURVIVED. `src/__tests__/primitives.test.tsx` asserts
 * `toHaveClass('text-status-success')` — it checks that the class STRING is on
 * the element, which stays true forever whether or not the class emits a rule.
 * A test on the class name cannot see an unpainted class; only a rendered
 * surface can, which is what this story is.
 *
 * The estate has already paid for it twice: `business-suite-unified/src/index.css`
 * and `braden/src/index.css` each independently define a local
 * `--color-status-warning` to patch around the missing shared token. Two apps
 * carrying a private fix for a shared-package defect is the adoption signal.
 *
 * NOT FIXED HERE. The fix belongs in `@bsuite/theme` (map the `status-*`
 * namespace onto the existing `--role-success` / `--role-warning`) or in
 * `@bsuite/ui` (rebind the two tones to `role-success` / `role-warning`).
 * Either is a published-package change that needs a version bump, a publish,
 * and a lockfile regeneration in six apps — a rollout, not a drive-by. This
 * story is the evidence and the regression guard for it.
 * ---------------------------------------------------------------------------
 */
const meta = {
  title: 'Primitives/StatusBadge',
  component: StatusBadge,
  args: {
    children: 'In progress',
    tone: 'info',
  },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: TONES,
      description:
        'Semantic tone. `success` and `warning` currently paint nothing — see the component notes.',
      table: { defaultValue: { summary: 'neutral' } },
    },
    children: { control: 'text', description: 'Badge label — a state, not a sentence.' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

/** Editable. Step `tone` through all five and watch two of them not change. */
export const Playground: Story = {}

/**
 * All five tones side by side. `neutral`, `info` and `destructive` paint;
 * `success` and `warning` render as bare text on a transparent ground.
 * If a future theme release lands the `status-*` namespace, this story is
 * where it becomes visible — all five will differ.
 */
export const AllTones: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone}>
            {tone}
          </StatusBadge>
        ))}
      </div>
      <p className="max-w-lg text-sm text-muted-foreground">
        Expected: five visually distinct badges. Actual: <code>success</code> and{' '}
        <code>warning</code> are indistinguishable from body text, because{' '}
        <code>status-success</code> / <code>status-warning</code> emit no CSS rule.
      </p>
    </div>
  ),
}

/**
 * The same five tones against a panel surface rather than the body ground.
 * A tone that relies on the page background to read is a tone that breaks the
 * moment it is dropped into a card — which is where badges actually live.
 */
export const OnPanel: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        {TONES.map((tone) => (
          <StatusBadge key={tone} tone={tone}>
            {tone}
          </StatusBadge>
        ))}
      </div>
    </div>
  ),
}
