/**
 * bsuite#3365: `.text-gradient-accent` sets `width: fit-content`, which makes a
 * parent's `text-center` inert, so centred gradient titles sat at the left.
 * The utility now centres its box when the element or its direct parent asks
 * for centre. jsdom does no layout, so this pins the rule's text; the rendered
 * proof is a real-browser measurement recorded on the PR.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(__dirname, 'utilities.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The declarations of the first top-level rule whose selector list names `selector`. */
function ruleFor(selector: string): Record<string, string> | undefined {
  for (const block of css.split('}')) {
    const [head, body] = block.split('{')
    if (body === undefined) continue
    const selectors = head.split(',').map((s) => s.trim())
    if (!selectors.includes(selector)) continue
    const decls: Record<string, string> = {}
    for (const d of body.split(';')) {
      const i = d.indexOf(':')
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim()
    }
    return decls
  }
  return undefined
}

describe('.text-gradient-accent keeps a centred title centred', () => {
  it('still shrink-wraps, which is why the centring rule is needed', () => {
    expect(ruleFor('.text-gradient-accent')?.width).toBe('fit-content')
  })

  it.each(['.text-center > .text-gradient-accent', '.text-gradient-accent.text-center'])(
    '%s centres the box',
    (selector) => {
      expect(ruleFor(selector)?.['margin-inline']).toBe('auto')
    },
  )

  it('does not centre a gradient title merely nested somewhere inside a centred container', () => {
    expect(ruleFor('.text-center .text-gradient-accent')).toBeUndefined()
  })
})

describe('.text-gradient-accent draws the icons in a heading', () => {
  it('gives an SVG in the heading a real colour, not the transparent the gradient needs', () => {
    expect(ruleFor('.text-gradient-accent svg')?.color).toBe('var(--role-primary-text)')
  })
})
