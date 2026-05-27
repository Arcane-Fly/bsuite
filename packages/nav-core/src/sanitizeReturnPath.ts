/**
 * sanitizeReturnPath — canonical open-redirect defense for cross-app return paths.
 *
 * Single source of truth for every BSuite app's `/auth/login` page and
 * every `/auth/callback` that reads `auth_return_path`. Replaces the 5
 * divergent inline implementations that lived in:
 *   - business-suite-unified/src/lib/auth/sanitizeReturnPath.ts
 *   - crm7/src/lib/auth/sanitizeReturnPath.ts
 *   - braden/src/pages/auth/Login.tsx + AuthCallback.tsx (inlined)
 *   - R80.3/src/pages/AuthLogin.tsx (inlined)
 *   - throughput/src/components/login/LoginContent.tsx (inlined)
 *
 * Threat model
 * ────────────
 * Attacker controls `?return_path=…` on a victim's `/auth/login` URL.
 * Goal: make the OAuth callback navigate to an external origin so the
 * attacker can phish the user with a convincing logged-in-then-redirected
 * flow. Defense: reject everything except same-origin relative paths
 * after decoding.
 *
 * Defended attack vectors
 * ───────────────────────
 *   1. Absolute URL                — `https://evil.com/`
 *   2. Protocol-relative           — `//evil.com/`
 *   3. Backslash IE-quirk          — `/\evil.com`
 *   4. Encoded protocol-relative   — `/%2Fevil.com`  (decoded → `//evil.com`)
 *   5. Encoded backslash           — `/%5Cevil.com`  (decoded → `/\evil.com`)
 *   6. Double-encoded              — `/%252F%252Fevil.com`  (only single-decode survives)
 *   7. Null-byte injection         — `/%00//evil.com` (decoded → `/\0//evil.com`;
 *                                     browser strips null and resolves to `//evil.com`)
 *      Round-2 finding #1.
 *   8. Dot-slash gadget            — `/.%2F%2Fevil.com` (decoded → `/././evil.com`;
 *                                     RFC 3986 §5.2.4 dot-segment removal yields
 *                                     `//evil.com`). Round-2 finding #2.
 *   9. Overly long payload         — DoS / URL-length amplification on the
 *      OAuth Server (414 URI Too Long)
 *  10. Malformed percent-encoding  — `decodeURIComponent` throws URIError
 *
 * Each vector has an explicit test case in
 * `packages/nav-core/src/__tests__/sanitizeReturnPath.test.ts`.
 *
 * Contract
 * ────────
 * - INPUT: raw query value (string | null | undefined) + a default path
 * - OUTPUT: a same-origin relative path beginning with `/`, single-decoded,
 *   guaranteed safe to pass to `navigate(...)` or `window.location.assign(...)`
 * - The default is supplied by each app (e.g. `/dashboard` for crm7,
 *   `/admin/branding` for braden) so this helper can be used uniformly.
 *
 * @example
 *   sanitizeReturnPath('/dashboard', '/')                    // → '/dashboard'
 *   sanitizeReturnPath('//evil.com', '/')                    // → '/'
 *   sanitizeReturnPath('/%2Fevil.com', '/')                  // → '/'
 *   sanitizeReturnPath('/%00//evil.com', '/')                // → '/'
 *   sanitizeReturnPath('/.%2F%2Fevil.com', '/')              // → '/'
 *   sanitizeReturnPath(undefined, '/dashboard')              // → '/dashboard'
 */
export function sanitizeReturnPath(
  raw: string | null | undefined,
  defaultPath: string,
): string {
  if (!raw) return defaultPath;
  if (typeof raw !== 'string') return defaultPath;

  // Decode first. A payload of `/%2Fevil.com` decodes to `//evil.com`,
  // which then fails the `startsWith('//')` check below. Without the
  // decode, the raw value starts with `/%`, NOT `//`, and would pass.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding (e.g. `%ZZ`, lone `%`) — reject.
    return defaultPath;
  }

  // Reject control characters anywhere in the decoded path. Null bytes
  // are stripped by browsers before navigation, which can turn a
  // benign-looking `/%00//evil.com` into an open redirect to `//evil.com`.
  // Other control chars (CR/LF, tab) are also dangerous in URL contexts.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(decoded)) return defaultPath;

  // Reject dot-slash gadgets explicitly. After decoding, `/.%2F%2Fevil.com`
  // becomes `/./../evil.com` or `/.//evil.com`. RFC 3986 §5.2.4 dot-segment
  // removal in the browser's URL parser resolves these to forms that
  // can escape same-origin. The conservative rule: any segment starting
  // with `..` or any `/.` followed by another `/` is rejected.
  if (decoded.includes('/.')) return defaultPath;
  if (decoded.includes('/..')) return defaultPath;

  // Standard same-origin checks on the decoded form.
  if (!decoded.startsWith('/')) return defaultPath;
  if (decoded.startsWith('//')) return defaultPath;
  if (decoded.startsWith('/\\')) return defaultPath;

  // Length cap on BOTH raw and decoded. A short encoded payload that
  // expands long after decoding shouldn't squeak through.
  if (raw.length > 512) return defaultPath;
  if (decoded.length > 512) return defaultPath;

  return decoded;
}
