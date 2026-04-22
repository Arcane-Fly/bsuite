import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileSidebarDrawer } from '../MobileSidebarDrawer'

describe('MobileSidebarDrawer', () => {
  it('renders children in a dialog-roled aside', () => {
    const { getByRole } = render(
      <MobileSidebarDrawer open onClose={() => {}}>
        <nav>nav content</nav>
      </MobileSidebarDrawer>,
    )
    const dialog = getByRole('dialog', { name: 'Navigation' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.textContent).toContain('nav content')
  })

  it('applies the open translate class when open', () => {
    const { getByRole } = render(
      <MobileSidebarDrawer open onClose={() => {}}>
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    const dialog = getByRole('dialog')
    expect(dialog.className).toContain('translate-x-0')
    expect(dialog.className).not.toContain('-translate-x-full')
  })

  it('applies the closed translate class when closed', () => {
    const { container } = render(
      <MobileSidebarDrawer open={false} onClose={() => {}}>
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    // still rendered for exit animation; matched by role even with aria-hidden wrapper.
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('-translate-x-full')
  })

  it('right-side variant uses right/translate-x-full classes', () => {
    const { container } = render(
      <MobileSidebarDrawer open={false} onClose={() => {}} side="right">
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('right-0')
    expect(aside?.className).toContain('translate-x-full')
  })

  it('clicking the backdrop invokes onClose', () => {
    const onClose = vi.fn()
    const { container } = render(
      <MobileSidebarDrawer open onClose={onClose}>
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    const backdrop = container.querySelector('[aria-hidden="true"]')
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the panel does NOT invoke onClose', () => {
    const onClose = vi.fn()
    const { getByText } = render(
      <MobileSidebarDrawer open onClose={onClose}>
        <nav>link</nav>
      </MobileSidebarDrawer>,
    )
    fireEvent.click(getByText('link'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('locks body scroll while open and restores on close', () => {
    document.body.style.overflow = ''
    const { rerender } = render(
      <MobileSidebarDrawer open onClose={() => {}}>
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <MobileSidebarDrawer open={false} onClose={() => {}}>
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('is hidden from assistive tech when closed', () => {
    const { container } = render(
      <MobileSidebarDrawer open={false} onClose={() => {}}>
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
    expect(wrapper.className).toContain('pointer-events-none')
  })

  it('accepts a custom ariaLabel + panelClassName', () => {
    const { getByRole } = render(
      <MobileSidebarDrawer
        open
        onClose={() => {}}
        ariaLabel="App menu"
        panelClassName="w-72"
      >
        <nav>x</nav>
      </MobileSidebarDrawer>,
    )
    const dialog = getByRole('dialog', { name: 'App menu' })
    expect(dialog.className).toContain('w-72')
  })
})
