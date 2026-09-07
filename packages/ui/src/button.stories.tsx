import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, type ButtonVariant, type ButtonSize } from './button.js'

const VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
]
const SIZES: ButtonSize[] = ['sm', 'md', 'lg', 'icon']

/**
 * The shared button. Every variant is bound to a ROLE token
 * (`bg-primary`, `bg-destructive`, …), never to a palette name — a
 * palette-bound button is invisible to tenant white-labelling.
 *
 * `destructive` resolves through `--role-error`, which is RED
 * `oklch(0.580 0.230 25)`. It is deliberately not purple: purple measured
 * ΔE 0.006 against the primary blue under protanopia, i.e. the destructive
 * action and the primary action were the same swatch for a colour-blind user.
 * Switch the theme toolbar to Dark and confirm the separation holds there too.
 */
const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: {
    children: 'Save changes',
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: VARIANTS,
      description: 'Role-bound visual treatment.',
      table: { defaultValue: { summary: 'primary' } },
    },
    size: {
      control: 'inline-radio',
      options: SIZES,
      description: 'Height and padding scale. `icon` is square.',
      table: { defaultValue: { summary: 'md' } },
    },
    children: { control: 'text', description: 'Button label.' },
    disabled: { control: 'boolean', description: 'Blocks pointer events and drops opacity to 50%.' },
    className: { control: 'text', description: 'Merged via tailwind-merge; later classes win.' },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** Editable. Change `variant`, `size`, `children` or `disabled` in Controls. */
export const Playground: Story = {}

/** Every variant at once, so a token regression shows as a row that stopped differing. */
export const AllVariants: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
}

/** The size ladder. `icon` renders square and takes a glyph, not a word. */
export const AllSizes: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {SIZES.map((size) => (
        <Button key={size} {...args} size={size}>
          {size === 'icon' ? '★' : size}
        </Button>
      ))}
    </div>
  ),
}

/**
 * Disabled state across every variant. `disabled:opacity-50` is the only cue —
 * there is no shape or icon change — so this is the surface to check when
 * asking whether "unavailable" is legible at a glance in both themes.
 */
export const Disabled: Story = {
  args: { disabled: true },
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
}
