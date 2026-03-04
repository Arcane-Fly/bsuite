import { describe, it, expect, beforeEach } from 'vitest'
import { createCookieStorage } from '../cookieStorage'

// In-memory cookie store for testing
function setupCookieMock() {
  const store: Record<string, string> = {}

  Object.defineProperty(document, 'cookie', {
    get() {
      return Object.entries(store).map(([k, v]) => `${k}=${v}`).join('; ')
    },
    set(val: string) {
      const eqIdx = val.indexOf('=')
      const key = val.slice(0, eqIdx)
      const rest = val.slice(eqIdx + 1)
      const semiIdx = rest.indexOf(';')
      const value = semiIdx >= 0 ? rest.slice(0, semiIdx) : rest
      const attrs = semiIdx >= 0 ? rest.slice(semiIdx) : ''
      if (attrs.includes('max-age=0')) {
        delete store[key]
      } else {
        store[key] = value
      }
    },
    configurable: true,
  })
  return store
}

describe('createCookieStorage', () => {
  beforeEach(() => {
    setupCookieMock()
  })

  it('round-trips a short value', () => {
    const storage = createCookieStorage()
    storage.setItem('test', 'hello world')
    expect(storage.getItem('test')).toBe('hello world')
  })

  it('round-trips a value exceeding chunkSize', () => {
    const storage = createCookieStorage({ chunkSize: 10 })
    const long = 'a'.repeat(25)
    storage.setItem('big', long)
    expect(storage.getItem('big')).toBe(long)
  })

  it('returns null for missing key', () => {
    const storage = createCookieStorage()
    expect(storage.getItem('missing')).toBeNull()
  })

  it('removeItem clears the value', () => {
    const storage = createCookieStorage()
    storage.setItem('key', 'value')
    storage.removeItem('key')
    expect(storage.getItem('key')).toBeNull()
  })

  it('overwrites previous value without stale chunks', () => {
    const storage = createCookieStorage({ chunkSize: 5 })
    storage.setItem('k', 'aaaaaaaaaa') // creates chunks
    storage.setItem('k', 'x')          // replaces with single cookie
    expect(storage.getItem('k')).toBe('x')
  })

  it('preserves special characters', () => {
    const storage = createCookieStorage()
    const value = 'eyJhbGciOiJIUzI1NiJ9.payload.signature==' // JWT-like
    storage.setItem('jwt', value)
    expect(storage.getItem('jwt')).toBe(value)
  })
})
