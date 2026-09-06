import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppShell } from './app-shell.js'
import { Button } from './button.js'
import { StatusBadge } from './status-badge.js'

/**
 * ---------------------------------------------------------------------------
 * THE SHELL CONTRACT — one scroll region, and it is not the document.
 *
 * `[data-slot="app-shell-content"]` owns `overflow-auto`; `banner`, `header`,
 * `footer` and the sidebar are all `shrink-0` and never scroll away. The root
 * is `h-svh`, NOT `min-h-screen` and never `calc(100vh - Npx)` — the
 * DOM-layout-lint invariants ban those outright because they are how the shell
 * grows with its content and hands the scroll back to the document.
 *
 * That regression is INVISIBLE to unit tests: the DOM renders, React mounts,
 * there are no console errors, and the page simply scrolls in the wrong place.
 * It shipped live once when Tailwind v4's source detection skipped
 * `node_modules` and the classes emitted only by this package's dist
 * (`h-svh`, `min-h-0`, `shrink-0`, `isolate`) silently vanished from the built
 * CSS — every test green.
 *
 * These stories render at `fullscreen` so the shell gets the real viewport.
 * Switch the viewport toolbar across all four breakpoints and confirm the
 * footer stays reachable and the document itself never gains a scrollbar.
 * ---------------------------------------------------------------------------
 */
const meta = {
  title: 'Shell/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  args: {
    showDotPattern: true,
  },
  argTypes: {
    showDotPattern: {
      control: 'boolean',
      description: 'The fixed viewport dot layer. braden passes false — its brand is photo-forward.',
    },
    className: { control: 'text', description: 'Extra classes on the h-svh flex root.' },
    contentClassName: { control: 'text', description: 'Extra classes on the scroll region.' },
  },
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

function Filler({ rows = 30, label = 'Row' }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
        >
          <span className="text-sm text-foreground">
            {label} {i + 1}
          </span>
          <StatusBadge tone={i % 3 === 0 ? 'info' : 'neutral'}>active</StatusBadge>
        </div>
      ))}
    </div>
  )
}

function DemoSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-bg-surface p-4 md:flex">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Navigation
      </p>
      {['Dashboard', 'People', 'Placements', 'Charge rates', 'Quotes'].map((item) => (
        <button
          key={item}
          type="button"
          className="rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
        >
          {item}
        </button>
      ))}
      <div className="mt-auto pt-4 text-xs text-muted-foreground">
        Sidebar footer — must stay reachable at every viewport.
      </div>
    </aside>
  )
}

function DemoHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-bg-surface px-6 py-3">
      <span className="text-sm font-semibold text-foreground">Placements</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost">
          Filter
        </Button>
        <Button size="sm">New placement</Button>
      </div>
    </header>
  )
}

function DemoFooter() {
  return (
    <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
      Pinned footer — never scrolls away.
    </footer>
  )
}

/** Editable. The full slot set with enough content to force the scroll. */
export const Playground: Story = {
  args: {
    sidebar: <DemoSidebar />,
    header: <DemoHeader />,
    footer: <DemoFooter />,
    children: <Filler />,
  },
}

/**
 * Top-nav only — no sidebar. This is throughput's and braden's shape, and it
 * is the one where a shell that assumed a sidebar collapses.
 */
export const TopNavOnly: Story = {
  args: {
    header: <DemoHeader />,
    footer: <DemoFooter />,
    children: <Filler rows={20} />,
    showDotPattern: false,
  },
}

/**
 * With a banner above the header. The banner is `shrink-0` too, so it eats
 * viewport height rather than pushing the footer off screen.
 */
export const WithBanner: Story = {
  args: {
    banner: (
      <div className="bg-role-warning/15 px-6 py-2 text-sm text-foreground">
        Demo tenant — figures are not real.
      </div>
    ),
    sidebar: <DemoSidebar />,
    header: <DemoHeader />,
    footer: <DemoFooter />,
    children: <Filler rows={25} />,
  },
}

/**
 * With the right-hand `aside` slot — crm7's AI assistant panel shape. It is a
 * flex SIBLING of the main column, so it never lands inside the scroll region.
 */
export const WithAside: Story = {
  args: {
    sidebar: <DemoSidebar />,
    header: <DemoHeader />,
    children: <Filler rows={25} />,
    aside: (
      <div className="hidden w-80 shrink-0 border-l border-border bg-bg-surface p-4 lg:block">
        <p className="text-sm font-semibold text-foreground">Assistant</p>
        <p className="mt-2 text-sm text-muted-foreground">
          A viewport-fixed panel belongs in this slot, not in the scroll region.
        </p>
      </div>
    ),
  },
}

/**
 * Almost no content. The shell must still fill the viewport and pin the footer
 * to the bottom — a shell that collapses to its content height here is the
 * `min-h-screen` regression wearing a different hat.
 */
export const ShortContent: Story = {
  args: {
    header: <DemoHeader />,
    footer: <DemoFooter />,
    children: <div className="p-6 text-sm text-muted-foreground">One line of content.</div>,
  },
}
