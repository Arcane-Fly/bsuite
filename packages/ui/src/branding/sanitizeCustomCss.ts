/**
 * Shared custom-CSS sanitizer for tenant white-label injection.
 * Apps should prefer this over local copies (de-dupe / excellence loop).
 *
 * textContent injection avoids HTML breakout; this still rejects high-risk
 * CSS constructs. No-regex: case-insensitive substring scan.
 */
export function sanitizeCustomCss(raw: string | null | undefined): string {
  if (raw == null) return ''
  const s = String(raw)
  if (s.length > 50_000) return ''
  const lower = s.toLowerCase()
  const forbidden = [
    '@import',
    'expression(',
    'javascript:',
    'vbscript:',
    '-moz-binding',
    'behavior:',
    '</style',
    '<script',
  ]
  for (const token of forbidden) {
    if (lower.includes(token)) return ''
  }
  return s
}
