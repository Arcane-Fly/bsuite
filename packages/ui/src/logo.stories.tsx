import type { Meta, StoryObj } from '@storybook/react-vite'
import { Logo, resolveLogoUrl, type LogoBranding, type LogoSlot } from './Logo.js'
import { D2CDefaultLogo } from './default-logo.js'

const SLOTS: LogoSlot[] = ['favicon', 'sidebar', 'auth', 'marketing', 'header']

/**
 * Slot-, theme- and branding-aware logo. The resolver walks FOUR tiers in
 * order — app override (`app_logo_*`), enterprise (`logo_*`), platform
 * (`platform_logo_*`), then the inline D2C SVG default.
 *
 * `colorScheme: 'auto'` reads `<html class="dark">` AT RENDER TIME. That makes
 * it the one prop in this package whose correctness cannot be established by a
 * unit test that never mounts under a theme — flip the Theme toolbar and watch
 * `auto` follow while `light` and `dark` stay pinned.
 *
 * The component takes branding from PROPS and calls no hook, because it has to
 * work in six apps with six different branding hooks. The stories below pass
 * branding shapes directly, which is also how the tier precedence becomes
 * checkable rather than asserted.
 */
const meta = {
  title: 'Branding/Logo',
  component: Logo,
  parameters: { layout: 'centered' },
  args: {
    slot: 'sidebar',
    colorScheme: 'auto',
    branding: null,
  },
  argTypes: {
    slot: {
      control: 'select',
      options: SLOTS,
      description: 'Drives the default dimensions.',
    },
    colorScheme: {
      control: 'inline-radio',
      options: ['light', 'dark', 'auto'],
      description: '`auto` reads the .dark class on <html> at render time.',
    },
    alt: { control: 'text', description: 'Defaults to branding.company_name ?? "BSuite".' },
    width: { control: { type: 'number' }, description: 'Explicit px override.' },
    height: { control: { type: 'number' }, description: 'Explicit px override.' },
    className: { control: 'text' },
    branding: { control: 'object', description: 'The resolved 4-tier branding shape.' },
  },
} satisfies Meta<typeof Logo>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Editable. With `branding: null` this renders the inline D2C default SVG —
 * no asset dependency, which is why an unbranded tenant never shows a broken
 * image.
 */
export const Playground: Story = {}

/** Every slot at its default size, so a dimension regression is one glance. */
export const AllSlots: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-end gap-8">
      {SLOTS.map((slot) => (
        <div key={slot} className="flex flex-col items-center gap-2">
          <Logo slot={slot} />
          <span className="text-xs text-muted-foreground">{slot}</span>
        </div>
      ))}
    </div>
  ),
}

/**
 * The four-tier precedence, rendered as a truth table by calling the real
 * resolver. Each row states the branding it was given and the tier the
 * resolver picked — so precedence is measured, not described.
 */
export const TierPrecedence: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => {
    const cases: Array<[string, LogoBranding | null]> = [
      ['nothing set', null],
      ['platform only', { platform_logo_url: 'https://example.invalid/platform.svg' }],
      [
        'platform + enterprise',
        {
          platform_logo_url: 'https://example.invalid/platform.svg',
          logo_url: 'https://example.invalid/tenant.svg',
        },
      ],
      [
        'platform + enterprise + app',
        {
          platform_logo_url: 'https://example.invalid/platform.svg',
          logo_url: 'https://example.invalid/tenant.svg',
          app_logo_url: 'https://example.invalid/app.svg',
        },
      ],
      [
        'app dark variant, dark scheme',
        {
          app_logo_url: 'https://example.invalid/app.svg',
          app_logo_dark_url: 'https://example.invalid/app-dark.svg',
        },
      ],
    ]
    return (
      <table className="w-full max-w-3xl text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 font-semibold text-foreground">Branding given</th>
            <th className="py-2 font-semibold text-foreground">tier</th>
            <th className="py-2 font-semibold text-foreground">src</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(([label, branding], i) => {
            const scheme = i === 4 ? 'dark' : 'light'
            const r = resolveLogoUrl(branding, 'sidebar', scheme)
            return (
              <tr key={label} className="border-b border-border">
                <td className="py-2 text-muted-foreground">{label}</td>
                <td className="py-2 font-mono text-xs text-foreground">{r.tier}</td>
                <td className="py-2 font-mono text-xs break-all text-muted-foreground">
                  {r.src ?? '(inline SVG default)'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  },
}

/**
 * The inline default mark on its own, at several sizes. It carries a `title`
 * for screen readers; when it sits beside a wordmark span the CONSUMER must
 * pass an empty alt so the name is not announced twice.
 */
export const DefaultMark: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="flex items-end gap-8">
      {[24, 40, 64, 96].map((s) => (
        <div key={s} className="flex flex-col items-center gap-2">
          <D2CDefaultLogo width={s} height={s} />
          <span className="text-xs text-muted-foreground">{s}px</span>
        </div>
      ))}
    </div>
  ),
}
