/**
 * ESLint rule: no-hardcoded-colours
 *
 * Forbids hardcoded Tailwind palette utilities (text-slate-*, bg-gray-*, etc.)
 * and raw hex/rgba colour literals in JSX className strings and style objects.
 *
 * Exemptions:
 *  - Files with /* BRADEN-EXEMPT *\/ comment anywhere in the source
 *  - Files under braden/ directory (path-based check)
 *  - node_modules, dist, .next, out — skipped via ESLint ignorePatterns / ignores
 *
 * Fix: replace with a semantic token from @bsuite/theme/docs/TOKEN-MAPPING.md
 */

import { isBradenSubmoduleFile } from './_shared.js'

const TAILWIND_PALETTE_RE = /\b(text|bg|border|divide)-(slate|gray|zinc|neutral)-(\d{2,3})\b/g
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g
const RGBA_RE = /rgba?\(\s*\d/g

const PALETTE_MESSAGE =
  'Hardcoded Tailwind palette class "{{value}}" is forbidden. ' +
  'Use a semantic token (text-foreground, bg-card, etc.) from @bsuite/theme. ' +
  'See packages/theme/docs/TOKEN-MAPPING.md §1.'

const HEX_MESSAGE =
  'Hardcoded hex colour "{{value}}" is forbidden in JSX. ' +
  'Use var(--token) from @bsuite/theme. ' +
  'See packages/theme/docs/TOKEN-MAPPING.md §2.'

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hardcoded Tailwind palette utilities and hex/rgba colour literals',
      recommended: true,
    },
    schema: [],
    messages: {
      forbiddenPalette: PALETTE_MESSAGE,
      forbiddenHex: HEX_MESSAGE,
    },
  },

  create(context) {
    // ── Exemption: braden app ──────────────────────────────────────────────
    // Bug found + fixed 2026-07-17: the previous check was
    // `filename.includes('/braden/')` — a path-substring match that also
    // matches a contributor's home directory or a git worktree checkout
    // path, silently exempting EVERY file in EVERY app. See _shared.js for
    // the full writeup (also covers why a path-anchor fix isn't safe
    // either, given this platform's worktree-based workflow).
    if (isBradenSubmoduleFile(context.filename, context.cwd ?? process.cwd())) return {}

    // ── Exemption: BRADEN-EXEMPT marker in file ───────────────────────────────
    // Also found + fixed 2026-07-17 (same session): `context.getFilename()`/
    // `context.getSourceCode()` are the pre-ESLint-9 legacy accessors and no
    // longer exist on ESLint 10.x's rule context — calling them threw
    // `TypeError: context.getFilename is not a function` and crashed the
    // rule entirely for any consumer on eslint@^10 (verified against the
    // installed eslint@10.6.0 in the crm7 worktree). `context.filename` /
    // `context.sourceCode` are the ESLint 9+ replacements this package's
    // own peerDependencies range (">=9.0.0 <11.0.0") already requires.
    const sourceCode = context.sourceCode
    const fullText = sourceCode.getText()
    if (fullText.includes('BRADEN-EXEMPT')) return {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    function checkStringForPalette(node, value) {
      TAILWIND_PALETTE_RE.lastIndex = 0
      let match
      while ((match = TAILWIND_PALETTE_RE.exec(value)) !== null) {
        context.report({
          node,
          messageId: 'forbiddenPalette',
          data: { value: match[0] },
        })
      }
    }

    function checkStringForHex(node, value) {
      HEX_RE.lastIndex = 0
      RGBA_RE.lastIndex = 0
      let match
      while ((match = HEX_RE.exec(value)) !== null) {
        context.report({ node, messageId: 'forbiddenHex', data: { value: match[0] } })
      }
      while ((match = RGBA_RE.exec(value)) !== null) {
        context.report({ node, messageId: 'forbiddenHex', data: { value: match[0] } })
      }
    }

    // ── Visitors ──────────────────────────────────────────────────────────────

    return {
      // className="..." or className={`...`} or className={'...'}
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        const val = node.value
        if (!val) return

        if (val.type === 'Literal' && typeof val.value === 'string') {
          checkStringForPalette(node, val.value)
        } else if (val.type === 'JSXExpressionContainer') {
          const expr = val.expression
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkStringForPalette(node, expr.value)
          } else if (expr.type === 'TemplateLiteral') {
            expr.quasis.forEach((q) => checkStringForPalette(node, q.value.raw))
          }
        }
      },

      // style={{ color: '#...' }} — check Property values that are string literals
      Property(node) {
        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          checkStringForHex(node, node.value.value)
        }
      },
    }
  },
}
