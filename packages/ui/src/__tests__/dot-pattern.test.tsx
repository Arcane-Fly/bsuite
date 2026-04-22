import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DotPattern } from '../dot-pattern.js'
import { cn } from '../utils.js'

describe('DotPattern', () => {
  it('renders a single SVG element (not a circle-per-dot)', () => {
    const { container } = render(<DotPattern />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    // Exactly one circle (inside <pattern>) and one rect (the full-viewport fill)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.querySelectorAll('rect')).toHaveLength(1)
  })

  it('applies default tile metrics via the <pattern> element', () => {
    const { container } = render(<DotPattern />)
    const pattern = container.querySelector('pattern')
    expect(pattern).not.toBeNull()
    expect(pattern!.getAttribute('width')).toBe('16')
    expect(pattern!.getAttribute('height')).toBe('16')
    expect(pattern!.getAttribute('patternUnits')).toBe('userSpaceOnUse')
  })

  it('forwards width/height/cr props to the SVG pattern + circle', () => {
    const { container } = render(
      <DotPattern width={28} height={28} cr={1.5} />,
    )
    const pattern = container.querySelector('pattern')
    const circle = container.querySelector('circle')
    expect(pattern!.getAttribute('width')).toBe('28')
    expect(pattern!.getAttribute('height')).toBe('28')
    expect(circle!.getAttribute('r')).toBe('1.5')
  })

  it('adds the animate-dot-glow class when glow is true', () => {
    const { container } = render(<DotPattern glow />)
    const svg = container.querySelector('svg')!
    expect(svg.className.baseVal).toContain('animate-dot-glow')
  })

  it('merges consumer className via tailwind-merge (last wins)', () => {
    const { container } = render(<DotPattern className="text-blue-500 opacity-30" />)
    const svg = container.querySelector('svg')!
    // Default class has text-neutral-400/80; tailwind-merge should drop it
    // in favour of the consumer-provided text-blue-500.
    expect(svg.className.baseVal).toContain('text-blue-500')
    expect(svg.className.baseVal).not.toContain('text-neutral-400/80')
    expect(svg.className.baseVal).toContain('opacity-30')
  })

  it('sets aria-hidden so the decorative pattern is not announced', () => {
    const { container } = render(<DotPattern />)
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('cn', () => {
  it('dedups conflicting Tailwind utilities keeping the last', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})
