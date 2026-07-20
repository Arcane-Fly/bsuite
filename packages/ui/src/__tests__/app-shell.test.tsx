import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AppShell } from '../app-shell.js'

describe('AppShell', () => {
  it('renders children inside the single scrollable content region', () => {
    const { getByTestId, container } = render(
      <AppShell>
        <p data-testid="page">hello</p>
      </AppShell>,
    )
    const content = container.querySelector('[data-slot="app-shell-content"]')
    expect(content).not.toBeNull()
    expect(content!.contains(getByTestId('page'))).toBe(true)
  })

  it('bakes the Bug-1 scroll-safe contract: bounded root WITHOUT overflow-hidden, content owns the scroll', () => {
    const { container } = render(<AppShell>x</AppShell>)
    const root = container.firstElementChild as HTMLElement
    // Root is a bounded-height flex row...
    expect(root.className).toContain('h-svh')
    expect(root.className).toContain('flex')
    // ...but must NEVER clip (the overflow-hidden + fixed-sidebar pairing is the bug).
    expect(root.className).not.toContain('overflow-hidden')
    // The content region is the ONLY scroll region and can shrink below content
    // (min-h-0) so the footer stays reachable at short viewport heights.
    const content = container.querySelector('[data-slot="app-shell-content"]') as HTMLElement
    expect(content.className).toContain('overflow-auto')
    expect(content.className).toContain('min-h-0')
    expect(content.className).toContain('flex-1')
  })

  it('pins header/footer/banner as shrink-0 (never scroll away, always reachable)', () => {
    const { getByTestId, container } = render(
      <AppShell
        banner={<div data-testid="banner" />}
        header={<div data-testid="header" />}
        footer={<div data-testid="footer" />}
      >
        x
      </AppShell>,
    )
    for (const id of ['banner', 'header', 'footer']) {
      const wrapper = getByTestId(id).parentElement as HTMLElement
      expect(wrapper.className).toContain('shrink-0')
    }
    // Order inside the main column: banner, header, content, footer.
    const main = container.querySelector('[data-slot="app-shell-main"]') as HTMLElement
    const slots = Array.from(main.children).map((c) => c.getAttribute('data-slot') ?? c.firstElementChild?.getAttribute('data-testid'))
    expect(slots).toEqual(['banner', 'header', 'app-shell-content', 'footer'])
  })

  it('renders the fixed viewport dot-pattern background by default and omits it when disabled', () => {
    const { container: withBg } = render(<AppShell>x</AppShell>)
    const bg = withBg.querySelector('[data-slot="app-shell-background"]') as HTMLElement
    expect(bg).not.toBeNull()
    // Fixed viewport layer (robust vs BSU Bug 5 invisible-dots), behind content.
    expect(bg.className).toContain('fixed')
    expect(bg.className).toContain('inset-0')
    expect(bg.className).toContain('z-0')
    expect(bg.querySelector('svg')).not.toBeNull()

    const { container: noBg } = render(
      <AppShell showDotPattern={false}>x</AppShell>,
    )
    expect(noBg.querySelector('[data-slot="app-shell-background"]')).toBeNull()
  })

  it('sidebar and aside slots are optional and render as flex siblings when provided', () => {
    const { container } = render(
      <AppShell sidebar={<nav data-testid="sidebar" />} aside={<div data-testid="aside" />}>
        x
      </AppShell>,
    )
    expect(container.querySelector('[data-testid="sidebar"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="aside"]')).not.toBeNull()
    const root = container.firstElementChild as HTMLElement
    // sidebar is before the main column; aside after it.
    const order = Array.from(root.children).map(
      (c) => c.getAttribute('data-testid') ?? c.getAttribute('data-slot'),
    )
    expect(order.indexOf('sidebar')).toBeLessThan(order.indexOf('app-shell-main'))
    expect(order.indexOf('app-shell-main')).toBeLessThan(order.indexOf('aside'))
  })

  it('omits sidebar/aside slots entirely when not provided (braden/throughput top-nav case)', () => {
    // container-scoped so a prior render's DOM cannot leak into this assertion.
    const { container } = render(<AppShell>x</AppShell>)
    expect(container.querySelector('[data-testid="sidebar"]')).toBeNull()
    expect(container.querySelector('[data-testid="aside"]')).toBeNull()
    const root = container.firstElementChild as HTMLElement
    // Only the background + main column remain.
    const slots = Array.from(root.children).map((c) => c.getAttribute('data-slot'))
    expect(slots).toEqual(['app-shell-background', 'app-shell-main'])
  })
})
