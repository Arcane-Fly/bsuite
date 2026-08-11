/**
 * ESLint rule: no-hardcoded-colours — SOURCE OF TRUTH.
 *
 * Forbids hardcoded Tailwind palette utilities (text-amber-600, bg-gray-100, etc.)
 * and raw hex/rgb/hsl colour literals in className strings, style objects, and any
 * string returned or assigned as a colour value.
 *
 * Exemptions:
 *  - Files with /* BRADEN-EXEMPT *\/ comment anywhere in the source
 *  - Files under braden/ directory (path-based check)
 *  - @react-pdf/renderer files (pdfkit accepts hex only) — /* REACT-PDF-EXEMPT *\/
 *  - node_modules, dist, .next, out — skipped via ESLint ignorePatterns / ignores
 *
 * Fix: replace with a semantic token from @bsuite/theme/docs/TOKEN-MAPPING.md
 *
 * DISTRIBUTION: each submodule carries a byte-identical inline copy at
 * `<submodule>/eslint-rules/no-hardcoded-colours.js` so standalone CI can resolve
 * the rule without the monorepo. `scripts/check-inline-rule-parity.mjs` fails CI if
 * a copy drifts. Before that check existed, this file — the nominal source of truth
 * — was itself the STALEST copy: it lacked the `(?<![\w#])` issue-reference guard
 * that every submodule copy already had (crm7#1579).
 */

import { isBradenSubmoduleFile } from './_shared.js'

// Every Tailwind palette hue, not just the neutrals.
//
// crm7#1579: this list read `slate|gray|zinc|neutral` for as long as the rule had
// existed, so EVERY chromatic class passed the gate. `text-amber-600` shipped to
// production twice (GrantsConsole.tsx:453, InterpretationRulesTab.tsx:764) with a
// green lint. The rule was not enforcing "use tokens"; it was enforcing "don't use
// grey", which is the one case a designer is least likely to get wrong.
//
// Measured before widening (2026-08-10): 0 hits across all six apps for the full
// hue x prefix matrix below, so this costs nothing today and closes the hole.
const HUES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
].join('|')

// Every Tailwind utility prefix that takes a colour — the old list stopped at
// `text|bg|border|divide`, so `ring-red-500`, `fill-green-600` and gradient stops
// (`from-`/`via-`/`to-`) were all invisible to the gate.
const PREFIXES = [
  'text',
  'bg',
  'border',
  'divide',
  'ring',
  'outline',
  'shadow',
  'from',
  'via',
  'to',
  'accent',
  'caret',
  'decoration',
  'fill',
  'stroke',
  'placeholder',
].join('|')

const TAILWIND_PALETTE_RE = new RegExp(`\\b(${PREFIXES})-(${HUES})-(\\d{2,3})\\b`, 'g')

// (?<![\w#&]) — a hex colour is never preceded directly by a word character,
// another #, or an ampersand.
//
// `\w` and `#`: without them this rule flags ISSUE REFERENCES — `bsuite#1871`
// matched as the 4-digit hex `#1871`, which is valid CSS #RGBA syntax, so the
// length check could never save it. That failed a build for a comment citing
// the very issue the change implemented.
//
// `&`: without it, HTML NUMERIC CHARACTER ENTITIES match. `&#129514;` (an
// emoji, in an email template) reads as the 6-digit hex `#129514`. Found by the
// business-suite-unified sweep, 2026-08-11 — the same false-positive class as
// the issue references, one character further left. Hex entities (`&#x1F600;`)
// were already safe: `x` is not a hex digit, so the pattern never engaged.
//
// `color:#fff`, `"#fff"`, ` #fff` all still match — punctuation and whitespace  theme-audit-ok: naming the forbidden value is this rule's job
// are not word characters.
const HEX_RE = /(?<![\w#&])#[0-9a-fA-F]{3,8}\b/g
const RGBA_RE = /rgba?\(\s*\d/g
const HSLA_RE = /hsla?\(\s*[\d.]/g

// Pure white and pure black, in every notation they get written in.
//
// These are banned in EVERY role by standing operator ruling — not a format
// preference like "use a token", but an absolute. So they survive the email
// carve-out, which relaxes only the format rules. The estate's near-white and
// near-black are #f8f9fa and #0a0e1a.
//
// rgb(255,255,255) and rgb(0,0,0) are matched with optional spaces and an
// optional alpha, and pdf-lib's normalised rgb(1,1,1) / rgb(0,0,0) too — the
// e-signature certificate title was pure black in exactly that form.
const PURE_RE =
  /(?<![\w#&])#(?:fff|ffffff|000|000000)\b|rgba?\(\s*(?:255\s*,\s*255\s*,\s*255|0\s*,\s*0\s*,\s*0|1\s*,\s*1\s*,\s*1)\s*(?:,[^)]*)?\)|oklch\(\s*(?:1\s+0\s+0|0\s+0\s+0)\s*\)/gi

const PURE_MESSAGE =
  'Pure white/black "{{value}}" is banned in EVERY role (operator ruling). ' +
  'Use the estate near-white/near-black (#f8f9fa / #0a0e1a) or a role token. ' +
  'This ban is NOT lifted by EMAIL-HTML-EXEMPT — that marker relaxes the format, not the contract.'

const PALETTE_MESSAGE =
  'Hardcoded Tailwind palette class "{{value}}" is forbidden. ' +
  'Use a semantic token (text-foreground, bg-card, text-warning-text, etc.) from @bsuite/theme. ' +
  'See packages/theme/docs/TOKEN-MAPPING.md §1.'

const HEX_MESSAGE =
  'Hardcoded colour literal "{{value}}" is forbidden. ' +
  'Use var(--token) from @bsuite/theme, or color-mix() over two tokens. ' +
  'See packages/theme/docs/TOKEN-MAPPING.md §2.'

export const noHardcodedColours = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded Tailwind palette utilities and hex/rgb/hsl colour literals',
      recommended: true,
    },
    schema: [],
    messages: {
      forbiddenPalette: PALETTE_MESSAGE,
      forbiddenHex: HEX_MESSAGE,
      forbiddenPure: PURE_MESSAGE,
    },
  },
  create(context) {
    // See eslint-rules/_shared.js — 2026-07-17 (W1 session) fix for a
    // naive absolute-path substring exemption that also matched any
    // contributor whose home directory contains "braden".
    if (isBradenSubmoduleFile(context.filename, context.cwd ?? process.cwd())) return {}
    const sourceCode = context.sourceCode
    const fullText = sourceCode.getText()
    if (fullText.includes('BRADEN-EXEMPT')) return {}
    // React-PDF / pdfkit renderer files: the pdfkit engine only accepts hex/rgb
    // literals — no Tailwind, no CSS vars, no oklch. The engine dictates the format.
    //
    // TRIGGERS ON A REAL IMPORT, not a substring (crm7#1623). `fullText.includes()`
    // matched ANY mention: a header comment, prose, even a note saying the file does
    // NOT use the library. In crm7 that exempted 12 files of which only 6 import it.
    // The six freeloaders included `pages/quotes/sign/[token].tsx` — the CUSTOMER-
    // FACING QUOTE SIGNING PAGE — and `invoice-send-direct`, the invoice emailed to
    // clients, which earns its exemption from a stale header comment while line 132
    // says "no @react-pdf". Its 12 raw hex values, three of them pure white, have
    // therefore never been reported by anything.
    const importsReactPdf = (sourceCode.ast?.body ?? []).some(
      (n) => n.type === 'ImportDeclaration' && n.source?.value === '@react-pdf/renderer',
    )
    // REACT-PDF-EXEMPT stays a substring check: unlike a mention, the marker is
    // deliberate, and it covers what an import check cannot see (dynamic import,
    // a re-export, a helper called only by a renderer).
    if (importsReactPdf || fullText.includes('REACT-PDF-EXEMPT')) return {}

    // EMAIL-HTML-EXEMPT: HTML delivered to a MAIL CLIENT, or a standalone printable
    // document opened outside the app. Neither has the D2C stylesheet loaded, so
    // `var(--token)` resolves to nothing and most mail clients cannot parse oklch().
    // Hex is the only format that renders.
    //
    // A FILE-level marker rather than an `ignores:` entry, deliberately — the
    // 24-entry list retired in crm7#1579 was correct the day it was written and
    // wrong every day after, because the reason lived where nobody reads it.
    //
    // REDUCED, NOT DISARMED (crm7#1623). This used to `return {}`, which switched
    // the whole rule off for the file while the comment above it promised that
    // "pure white/black stay banned". The comment was enforced nowhere, and the
    // rule's own test only asserted that a NORMAL hex stops firing — so the suite
    // would have stayed green if pure white had been silently permitted, which it
    // was. An escape hatch whose documentation and behaviour disagree is worse than
    // no hatch, because the documentation is what the next author trusts.
    //
    // So the format rules relax and the ABSOLUTE ban survives: pure white and pure
    // black are banned in every role, in email too. Anything else hex is allowed
    // here. Near-white/near-black equivalents exist — see the DEFAULT_PALETTE and
    // DEFAULT_EMAIL_BRANDING constants in business-suite-unified's
    // `supabase/functions/email-dispatcher/`. (An earlier version of this comment
    // cited `_shared/email-branding.ts`, a path that has never existed in any app.)
    const emailExempt = fullText.includes('EMAIL-HTML-EXEMPT')

    const reported = new Set()
    const lines = sourceCode.getLines()

    /**
     * `theme-audit-ok` — the in-repo, line-local escape hatch, honoured on the
     * node's own lines or the line immediately above it.
     *
     * This exists for CSS MASK stops. In a mask, `#000`/`#fff` are not paint —  theme-audit-ok: prose about mask stops, not a colour
     * the channel is alpha, so `#fff` means "fully opaque". Swapping them for a  theme-audit-ok: prose about mask stops, not a colour
     * theme token silently breaks the mask, which is why the magicui borders
     * (border-beam.tsx, shine-border.tsx) carry the annotation already. The
     * widened rule reaches those template literals for the first time, so it has
     * to understand the convention the codebase was already using.
     *
     * Preferred over an `ignores:` entry because the justification stays next to
     * the code, where the next person editing the line will see it — the 24-entry
     * ignore list retired in crm7#1579 is what happens when it does not.
     */
    function isAnnotatedOk(node) {
      const loc = node.loc
      if (!loc) return false
      // The node's own lines — covers a trailing `// theme-audit-ok` on the value's
      // line (shine-border.tsx) and an annotation nested inside a multi-line
      // declarator (border-beam.tsx, where the comment sits between `=` and the
      // string).
      for (let n = loc.start.line; n <= loc.end.line; n++) {
        if (lines[n - 1]?.includes('theme-audit-ok')) return true
      }
      // The line immediately above, but ONLY when it is comment-only. Accepting any
      // preceding line that merely CONTAINS the marker let a trailing annotation
      // licence the next statement — `const s = '#fff' // theme-audit-ok` silently
      // exempted the `const brand = '#ab233a'` beneath it. Caught by the rule's own
      // test; an escape hatch that leaks one line down is how ignore lists start.
      const above = lines[loc.start.line - 2]
      if (above !== undefined) {
        const trimmed = above.trim()
        const commentOnly =
          trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
        if (commentOnly && trimmed.includes('theme-audit-ok')) return true
      }
      return false
    }

    function report(node, messageId, value) {
      // One literal can be reached by two visitors (a Property whose value is also
      // a ConditionalExpression branch). Dedupe so it is reported once.
      const key = `${node.range?.[0] ?? '?'}:${messageId}:${value}`
      if (reported.has(key)) return
      reported.add(key)
      if (isAnnotatedOk(node)) return
      context.report({ node, messageId, data: { value } })
    }

    function checkString(node, value) {
      // Pure white/black first, and ALWAYS — including in an email-exempt file.
      // This is the absolute the carve-out must not reach.
      PURE_RE.lastIndex = 0
      let pure
      while ((pure = PURE_RE.exec(value)) !== null) report(node, 'forbiddenPure', pure[0])

      // Everything below is a FORMAT rule — "prefer a token over a literal" — and
      // that is what an email template legitimately cannot honour.
      if (emailExempt) return

      for (const [re, messageId] of [
        [TAILWIND_PALETTE_RE, 'forbiddenPalette'],
        [HEX_RE, 'forbiddenHex'],
        [RGBA_RE, 'forbiddenHex'],
        [HSLA_RE, 'forbiddenHex'],
      ]) {
        re.lastIndex = 0
        let match
        while ((match = re.exec(value)) !== null) report(node, messageId, match[0])
      }
    }

    /**
     * Walk an expression in VALUE position and check every string literal that
     * could end up being the colour.
     *
     * crm7#1579 finding 2: the rule only visited `className` attributes and object
     * properties, so a colour returned from a plain function escaped entirely —
     * `return 'rgb(249 115 22)'` (DealHealthPanel.tsx:42) and the same literal
     * behind a ternary (forecast.tsx:323) both linted clean while feeding an inline
     * style. Ternary / `??` / `||` branches are walked because a colour ramp is
     * actually written in that shape.
     */
    function checkValueExpression(expr, depth = 0) {
      if (!expr || depth > 6) return
      switch (expr.type) {
        case 'Literal':
          if (typeof expr.value === 'string') checkString(expr, expr.value)
          break
        case 'TemplateLiteral':
          expr.quasis.forEach((q) => checkString(expr, q.value.raw))
          break
        case 'ConditionalExpression':
          checkValueExpression(expr.consequent, depth + 1)
          checkValueExpression(expr.alternate, depth + 1)
          break
        case 'LogicalExpression':
          checkValueExpression(expr.left, depth + 1)
          checkValueExpression(expr.right, depth + 1)
          break
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
          checkValueExpression(expr.expression, depth + 1)
          break
        case 'CallExpression':
          // `` return `<p style="color:#333">`.trim() `` — the ReturnStatement's
          // argument is the CALL, not the template, so the walker stopped here
          // and the literal escaped. Found by the business-suite-unified sweep
          // 2026-08-11: ONE file had ~12 hex literals in sibling templates and
          // only the 2 without a trailing `.trim()` were ever reported, which
          // read as "this file is nearly clean" rather than "the walker cannot
          // see it". Descend through the receiver so `.trim()` / `.replace()`
          // chains do not launder a colour.
          //
          // Arguments are deliberately NOT walked: a string passed to an
          // arbitrary function is not necessarily a colour, and flagging it
          // would trade this false negative for a worse false positive.
          if (expr.callee?.type === 'MemberExpression') {
            checkValueExpression(expr.callee.object, depth + 1)
          }
          break
        default:
          break
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        const val = node.value
        if (!val) return
        if (val.type === 'Literal' && typeof val.value === 'string') {
          // Hex-checked now too: `text-[#fff]` arbitrary values used to slip past,  theme-audit-ok: names the value the rule catches
          // because className was palette-checked only and hex was Property-only.
          checkString(node, val.value)
        } else if (val.type === 'JSXExpressionContainer') {
          checkValueExpression(val.expression)
        }
      },
      Property(node) {
        // Palette-checked now too — a variant map (`{ warn: 'text-amber-600' }`)
        // is an object property, and was previously hex-checked only.
        checkValueExpression(node.value)
      },
      ReturnStatement(node) {
        checkValueExpression(node.argument)
      },
      ArrowFunctionExpression(node) {
        // Concise body: `const c = () => 'rgb(...)'` has no ReturnStatement.
        if (node.body && node.body.type !== 'BlockStatement') checkValueExpression(node.body)
      },
      VariableDeclarator(node) {
        checkValueExpression(node.init)
      },
    }
  },
}
