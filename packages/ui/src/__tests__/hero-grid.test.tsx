import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HeroGrid } from '../hero-grid.js'

describe('HeroGrid', () => {
  it('renders a single div (the pattern is pure CSS, no DOM tree)', () => {
    const { container } = render(<HeroGrid />)
    const divs = container.querySelectorAll('div')
    expect(divs).toHaveLength(1)
  })

  it('applies the shared .bsuite-hero-grid utility class', () => {
    const { container } = render(<HeroGrid />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('bsuite-hero-grid')
  })

  it('is pointer-events-none so it never intercepts hero content clicks', () => {
    const { container } = render(<HeroGrid />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('pointer-events-none')
  })

  it('sets aria-hidden so the decorative pattern is not announced', () => {
    const { container } = render(<HeroGrid />)
    expect(container.querySelector('div')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('merges consumer className alongside the base classes (does not replace them)', () => {
    const { container } = render(<HeroGrid className="opacity-50" />)
    const el = container.querySelector('div')!
    expect(el.className).toContain('bsuite-hero-grid')
    expect(el.className).toContain('opacity-50')
  })

  it('forwards arbitrary HTML div props', () => {
    const { container } = render(<HeroGrid data-testid="hero-grid-bg" />)
    expect(container.querySelector('[data-testid="hero-grid-bg"]')).not.toBeNull()
  })
})
