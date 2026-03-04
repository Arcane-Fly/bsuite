// packages/nav-core/src/cookieStorage.ts
/**
 * Shared chunked cookie storage for cross-subdomain Supabase sessions.
 *
 * Supabase session JSON can exceed the 4,096-byte browser cookie limit (RFC 6265 §6.1)
 * once URI-encoded. We split values across numbered chunks (`key.0`, `key.1`, …)
 * and reassemble on read — same approach as @supabase/ssr.
 *
 * Usage:
 *   const storage = createCookieStorage({ domain: '.crm7.app' })
 *   createClient(url, key, { auth: { storage } })
 */

export interface CookieStorageOptions {
  /** Cross-subdomain cookie domain, e.g. '.crm7.app'. Only set on matching hostnames. */
  domain?: string
  /** Max cookie age in seconds. Default: 2,592,000 (30 days). */
  maxAge?: number
  /** Chunk size in bytes. Default: 3,500 (leaves headroom under 4,096 limit). */
  chunkSize?: number
}

export interface CookieStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createCookieStorage(options: CookieStorageOptions = {}): CookieStorageLike {
  const { domain, maxAge = 2_592_000, chunkSize = 3_500 } = options

  function cookieAttrs(): string {
    const parts: string[] = []
    if (domain && typeof window !== 'undefined' && window.location.hostname.endsWith(domain.replace(/^\./, ''))) {
      parts.push(`domain=${domain}`)
    }
    parts.push('path=/')
    parts.push(`max-age=${maxAge}`)
    parts.push('SameSite=Lax')
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      parts.push('Secure')
    }
    return parts.join('; ')
  }

  function deleteAttrs(): string {
    const parts: string[] = []
    if (domain && typeof window !== 'undefined' && window.location.hostname.endsWith(domain.replace(/^\./, ''))) {
      parts.push(`domain=${domain}`)
    }
    parts.push('path=/')
    parts.push('max-age=0')
    parts.push('SameSite=Lax')
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      parts.push('Secure')
    }
    return parts.join('; ')
  }

  /** Read raw (URI-encoded) cookie value without decoding. */
  function readCookieRaw(name: string): string | null {
    if (typeof document === 'undefined') return null
    const prefix = `${name}=`
    const entry = document.cookie.split('; ').find((c) => c.startsWith(prefix))
    return entry ? entry.slice(prefix.length) : null
  }

  function removeItem(key: string): void {
    if (typeof document === 'undefined') return
    const attrs = deleteAttrs()
    document.cookie = `${key}=; ${attrs}`
    for (let i = 0; i < 20; i++) {
      const chunk = readCookieRaw(`${key}.${i}`)
      if (chunk === null) break
      document.cookie = `${key}.${i}=; ${attrs}`
    }
  }

  return {
    getItem(key: string): string | null {
      // Try un-chunked first (fast path for small values / legacy cookies)
      const single = readCookieRaw(key)
      if (single) return decodeURIComponent(single)

      // Reassemble chunks — read raw to avoid splitting encoded sequences
      const chunks: string[] = []
      for (let i = 0; ; i++) {
        const chunk = readCookieRaw(`${key}.${i}`)
        if (chunk === null) break
        chunks.push(chunk)
      }
      // Decode once after joining all chunks
      return chunks.length > 0 ? decodeURIComponent(chunks.join('')) : null
    },

    setItem(key: string, value: string): void {
      if (typeof document === 'undefined') return
      const attrs = cookieAttrs()
      const encoded = encodeURIComponent(value)

      removeItem(key) // clear any previous chunks first

      if (encoded.length <= chunkSize) {
        document.cookie = `${key}=${encoded}; ${attrs}`
      } else {
        for (let i = 0; i * chunkSize < encoded.length; i++) {
          const slice = encoded.substring(i * chunkSize, (i + 1) * chunkSize)
          document.cookie = `${key}.${i}=${slice}; ${attrs}`
        }
      }
    },

    removeItem,
  }
}
