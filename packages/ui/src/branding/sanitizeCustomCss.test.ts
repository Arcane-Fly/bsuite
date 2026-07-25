import { describe, expect, it } from 'vitest'
import { sanitizeCustomCss } from './sanitizeCustomCss.js'

describe('sanitizeCustomCss', () => {
  it('allows plain CSS', () => {
    expect(sanitizeCustomCss('.x { color: blue; }')).toContain('blue')
  })
  it('rejects @import', () => {
    expect(sanitizeCustomCss('@import url(https://evil.test)')).toBe('')
  })
  it('rejects expression()', () => {
    expect(sanitizeCustomCss('width: expression(alert(1))')).toBe('')
  })
  it('rejects javascript:', () => {
    expect(sanitizeCustomCss('background: url(javascript:alert(1))')).toBe('')
  })
  it('rejects oversized input', () => {
    expect(sanitizeCustomCss('a'.repeat(50_001))).toBe('')
  })
  it('nullish → empty', () => {
    expect(sanitizeCustomCss(null)).toBe('')
    expect(sanitizeCustomCss(undefined)).toBe('')
  })
})
