/**
 * Contract for the coarse-pointer touch floor.
 *
 * These assertions exist because the rule's SAFETY comes entirely from the media
 * query. Without `pointer: coarse` the same declarations would apply on desktop
 * and resize every control in an estate largely made of dense data surfaces. A
 * future edit that drops or widens that gate must fail here rather than ship.
 *
 * String containment, not pattern matching — an exact expected value is a claim
 * a reader can check against the file.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const touchCss = readFileSync(join(HERE, 'css/touch.css'), 'utf8')
const indexCss = readFileSync(join(HERE, 'css/index.css'), 'utf8')

describe('coarse-pointer touch floor', () => {
  it('is reachable: the css barrel every app imports pulls it in', () => {
    expect(indexCss.includes("@import './touch.css';")).toBe(true)
  })

  it('is gated on pointer: coarse, so desktop rendering is untouched', () => {
    expect(touchCss.includes('@media (pointer: coarse) {')).toBe(true)
  })

  it('declares no rule outside that gate', () => {
    // Everything before the first `@media` must be comment or blank. A
    // declaration above it would apply on every device, which is the exact
    // regression this file exists to prevent.
    const head = touchCss.slice(0, touchCss.indexOf('@media'))
    const stripped = head.split('*/').pop() ?? ''
    expect(stripped.trim()).toBe('')
  })

  it('raises inputs to 16px, which is what stops iOS zooming the page on focus', () => {
    expect(touchCss.includes('font-size: max(16px, 1rem);')).toBe(true)
  })

  it('sets a 44px floor on both axes', () => {
    expect(touchCss.includes('min-height: 44px;')).toBe(true)
    expect(touchCss.includes('min-width: 44px;')).toBe(true)
  })

  it('uses min-* so a control that is already larger keeps its own size', () => {
    // Checked per line: a substring test cannot tell `height:` from
    // `min-height:`. The first draft of this assertion made exactly that
    // mistake and failed against correct CSS.
    const declarations = touchCss
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('height:') || line.startsWith('width:'))
    expect(declarations).toEqual([])
  })

  it('excludes checkbox and radio, whose hit area is the label', () => {
    expect(touchCss.includes("input:not([type='checkbox']):not([type='radio'])")).toBe(true)
  })

  it('offers a documented opt-out for genuinely dense surfaces', () => {
    expect(touchCss.includes('.tap-exempt')).toBe(true)
    expect(touchCss.includes('THE ESCAPE HATCH')).toBe(true)
  })

  it('records the measurement that justified it, so the claim can be re-checked', () => {
    expect(touchCss.includes('suite.crm7.app/login')).toBe(true)
    expect(touchCss.includes('3681px -> 3681px')).toBe(true)
  })
})
