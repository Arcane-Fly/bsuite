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

function ruleFor(selector: string): string | undefined {
  const re = /([^{}]+)\{([^{}]*)\}/g
  for (let m = re.exec(css); m; m = re.exec(css)) {
    const selectors = m[1].split(',').map((s) => s.trim())
    if (selectors.includes(selector)) return m[2]
  }
  return undefined
}

describe('.text-gradient-accent keeps a centred title centred', () => {
  it('still shrink-wraps, which is why the centring rule is needed', () => {
    expect(ruleFor('.text-gradient-accent')).toMatch(/width:\s*fit-content/)
  })

  it.each(['.text-center > .text-gradient-accent', '.text-gradient-accent.text-center'])(
    '%s centres the box',
    (selector) => {
      expect(ruleFor(selector)).toMatch(/margin-inline:\s*auto/)
    },
  )

  it('does not centre a gradient title merely nested somewhere inside a centred container', () => {
    expect(ruleFor('.text-center .text-gradient-accent')).toBeUndefined()
  })
})
