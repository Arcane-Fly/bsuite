import { describe, expect, it } from 'vitest'

describe('removed shared auth storage surface', () => {
  it('does not expose the retired helper from the public barrel', async () => {
    const mod = await import('../index')
    expect(Object.keys(mod)).not.toContain('create' + 'CookieStorage')
  })
})
