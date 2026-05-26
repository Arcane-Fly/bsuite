/**
 * branding-sanitize — neutralises CSS injection in tenant-controlled
 * white-label values before they reach CSS custom properties.
 *
 * Closes two risks in the `applyBrandingToRoot` sink in `BrandingProvider`:
 *
 *   SEC-002 — CSS injection via `font_stack`. A crafted value written to
 *             `--font-stack` can carry `</style>`, `expression(...)`,
 *             `url(...)` or a declaration breakout.
 *   SEC-003 — CSS injection via `logo_url` / `mark_url` / `logo_*_url` /
 *             `favicon_url`. An unescaped value embedded in an unquoted
 *             `url(...)` token can close the token early and inject
 *             arbitrary CSS, or smuggle a dangerous scheme
 *             (`javascript:`, `data:text/html`, …).
 *
 * The three white-label tables backing `branding_json_for_tenant`
 * (`platform_branding`, `tenant_branding`, `tenant_app_branding`) are
 * writable by semi-trusted platform/tenant admins, so the sanitiser runs
 * at the DOM-apply boundary — every write path is covered, not just the
 * admin UI.
 *
 * Mirrors the canonical sanitiser shipped on
 *   business-suite-unified/src/lib/branding-sanitize.ts (BSU#485, merged
 *   2026-05-25)
 *   crm7/src/lib/branding-sanitize.ts (crm7#857, open draft)
 * — DRY-merged into `@bsuite/theme` here so every consumer of
 * `<BrandingProvider>` is covered with a single version bump.
 *
 * All helpers are pure and regex-free (per the BSuite No-Regex-by-Default
 * rule); they are exercised directly in `./branding-sanitize.test.ts`.
 */

/** Schemes permitted in a branding image URL. Everything else
 *  (`javascript:`, `data:`, `vbscript:`, `blob:`, `file:`, …) is rejected. */
const SAFE_URL_SCHEMES: ReadonlySet<string> = new Set(['http:', 'https:'])

/** Upper bound on a branding URL — guards against pathological input. */
const MAX_URL_LENGTH = 2048

/** Upper bound on a font-family value — real font stacks are short. */
const MAX_FONT_LENGTH = 200

/**
 * Substrings that must never appear in a font-family value. Each can
 * break out of the declaration or open an injection vector:
 *  - angle brackets    → closing-tag breakout
 *  - parentheses       → url() / expression() invocation
 *  - braces, semicolon → declaration / ruleset breakout
 *  - at-sign           → at-rules such as the import rule
 *  - backslash         → CSS escape sequences
 *  - the comment-open / comment-close digraphs
 * Real font stacks are comma-separated family names and need none of these.
 */
const FONT_FORBIDDEN_TOKENS: readonly string[] = [
  '<', '>', '(', ')', '{', '}', ';', '@', '\\', '/*', '*/',
]

/** True when the string contains an ASCII control character (incl. newlines),
 *  any of which can terminate a CSS token early. Regex-free by design. */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/** Escape the characters that could close a double-quoted CSS string early. */
function escapeCssString(value: string): string {
  return value.split('\\').join('\\\\').split('"').join('\\"')
}

/**
 * Validate a branding image URL (logo / mark / favicon).
 *
 * Accepts and returns:
 *  - absolute `http(s)` URLs — parsed and normalised via the URL API
 *  - root-relative paths (`/logo.svg`) — same-origin, no scheme to abuse
 *
 * Returns `null` for everything else — dangerous schemes, protocol-relative
 * `//host` forms, control characters, unparseable input, over-long input.
 * Callers treat `null` as "no logo" and fall back to the default.
 */
export function sanitizeBrandingUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (value === '' || value.length > MAX_URL_LENGTH) return null
  if (hasControlChar(value)) return null

  // Root-relative path: same-origin, no scheme. Reject the protocol-relative
  // `//host` form, which resolves to an arbitrary (attacker-chosen) origin.
  if (value.startsWith('/')) {
    return value.startsWith('//') ? null : value
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return null
  }
  if (!SAFE_URL_SCHEMES.has(parsed.protocol)) return null
  return parsed.href
}

/**
 * Wrap a validated URL in a `url("...")` token, escaping `"` and `\` so the
 * string cannot be closed early. Always pair with {@link sanitizeBrandingUrl}
 * — never call this on un-validated input. Returns `null` for `null` input
 * so call sites can pass the result straight to a set-or-clear helper.
 */
export function toCssUrl(safeUrl: string | null | undefined): string | null {
  if (!safeUrl) return null
  return `url("${escapeCssString(safeUrl)}")`
}

/**
 * Validate a CSS `font-family` value. Legitimate font stacks are
 * comma-separated family names (`"Inter", "Helvetica Neue", sans-serif`)
 * and never need braces, semicolons, parentheses, at-rules or comment
 * markers. The presence of any forbidden token means an injection attempt,
 * so the whole value is rejected (returns `null` → caller falls back to the
 * default font).
 */
export function sanitizeFontFamily(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (value === '' || value.length > MAX_FONT_LENGTH) return null
  if (hasControlChar(value)) return null
  for (const token of FONT_FORBIDDEN_TOKENS) {
    if (value.includes(token)) return null
  }
  return value
}
