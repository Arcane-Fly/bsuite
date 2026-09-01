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

/**
 * The chain appended to every branding-supplied font-family before it
 * reaches a CSS custom property a stylesheet resolves directly
 * (`font-family: var(--font-stack)` etc). `system-ui` and `sans-serif` are
 * always available — neither needs an `@font-face` rule — so a family this
 * package never registered a face for degrades to the platform system-sans
 * stack instead of the browser's serif default.
 *
 * Confirmed live on suite.crm7.app/login (2026-09-01): a consumer app's own
 * branding hook wrote `--font-body: Geist` (bare, no fallback) as an inline
 * style on `<html>` — which beats every stylesheet rule, including this
 * package's own correctly-chained `vars.css` default — and the page
 * rendered pixel-identical to an explicit `font-family: serif` probe, i.e.
 * Times. `sanitizeFontFamily` alone does not prevent this: a syntactically
 * legitimate bare name (no @font-face required to pass the injection check)
 * still has nothing to fall back to once it reaches the DOM. Every
 * `<BrandingProvider>` font write — here and in any consumer app's own
 * DOM-apply sink — must go through {@link sanitizeFontFamilyForCss} instead.
 */
const FONT_FALLBACK_CHAIN = 'system-ui, sans-serif'

/**
 * Maps a family name someone would reasonably type or pick in a branding UI
 * to the face this package actually registers via `@font-face`
 * (`../css/fonts.css`). Keyed on the lowercased, unquoted bare name. A human
 * choosing "Geist" must land on the variable face that exists, not silently
 * degrade past it to the generic fallback — bare `Geist` (no such face; the
 * registered family is `"Geist Variable"`) was exactly the production
 * defect this module exists to prevent.
 */
const FONT_FACE_ALIASES: ReadonlyMap<string, string> = new Map([
  ['geist', 'Geist Variable'],
  ['geist variable', 'Geist Variable'],
  ['geist mono', 'Geist Mono Variable'],
  ['geist mono variable', 'Geist Mono Variable'],
])

/** Strip one layer of matching straight quotes, if present. Regex-free. */
function unquoteFamily(value: string): string {
  if (value.length >= 2) {
    const first = value.charAt(0)
    const last = value.charAt(value.length - 1)
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1)
    }
  }
  return value
}

/** Split a font-family stack into its first (primary) entry and the rest,
 *  on the first top-level comma. Regex-free. */
function splitFirstFamily(stack: string): { first: string; rest: string } {
  const commaIndex = stack.indexOf(',')
  if (commaIndex === -1) return { first: stack.trim(), rest: '' }
  return { first: stack.slice(0, commaIndex).trim(), rest: stack.slice(commaIndex + 1).trim() }
}

/**
 * Validate a CSS `font-family` value, resolve a known alias to the face
 * this package actually ships, and append {@link FONT_FALLBACK_CHAIN} — for
 * call sites that write straight to a CSS custom property consumed as
 * `font-family: var(--font-x)`. Delegates the injection check to
 * {@link sanitizeFontFamily} — this only changes what a legitimate value
 * turns into on its way to the DOM, never the accept/reject decision.
 * Returns `null` when the input fails sanitization (caller then leaves the
 * theme's own default — which already carries its own fallback — in place).
 *
 * Alias resolution looks only at the FIRST (primary) entry of the stack —
 * the one a single-family branding picker actually submits — and, when it
 * matches a known alias, prepends the resolved face ahead of it (keeping
 * the raw name in the stack too): `Geist` → `"Geist Variable", Geist,
 * system-ui, sans-serif`. A value with no known alias (`Inter`, or anything
 * else this package has not shipped a face for) is passed through
 * unresolved and still gets the fallback chain, so it degrades to system
 * sans rather than the browser's serif default.
 */
export function sanitizeFontFamilyForCss(raw: string | null | undefined): string | null {
  const safe = sanitizeFontFamily(raw)
  if (!safe) return null

  const { first } = splitFirstFamily(safe)
  const bareLower = unquoteFamily(first).toLowerCase()
  const resolvedFace = FONT_FACE_ALIASES.get(bareLower)
  const alreadyResolved = resolvedFace != null && resolvedFace.toLowerCase() === bareLower
  const withResolvedFace = resolvedFace && !alreadyResolved ? `"${resolvedFace}", ${safe}` : safe

  return `${withResolvedFace}, ${FONT_FALLBACK_CHAIN}`
}
