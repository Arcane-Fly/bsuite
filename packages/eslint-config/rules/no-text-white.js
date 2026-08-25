/**
 * ESLint rule: no-text-white — SOURCE OF TRUTH.
 *
 * theme-audit-ok: a rule that bans two utilities has to name them once to say so
 * Bans `text-white` and `text-black` as standalone text colour utilities in
 * className strings. They are absolute colours: they do not invert with the
 * theme, so a component using one is unreadable in either light or dark.
 *
 * Correct replacement: `text-foreground` (body), `text-muted-foreground`
 * (secondary), `text-heading` (headings). See @bsuite/theme TOKEN-MAPPING.md.
 * Conditional prefixes (`hover:`, `focus:`, `dark:`, `group-hover:`, …) are
 * exempt — those are state overlays on top of a token, not the base colour.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 *
 * It did not, until now. The rule lived in THREE submodules with THREE
 * different bodies and no source of truth, so nothing could say which was
 * right. Measured 2026-08-12 from origin/development of each repo:
 *
 *     business-suite-unified   94 lines   body sha256 7f355e90…
 *     crm7                     96 lines   body sha256 692fbc25…
 *     conduit                  90 lines   body sha256 5618e430…
 *
 * Reconciled on BEHAVIOUR, not on line count and not on location. A 15-case
 * differential battery run against all three bodies found exactly ONE
 * behavioural difference between them, plus one defect shared by all three.
 *
 *   1. Only BSU walked object PROPERTY values, so only BSU caught a className
 *      string sitting in an object property — theme-audit-ok: naming the shape,
 *      `{ classes: 'bg-purple-600 text-white' }`. crm7 and conduit read that
 *      as clean. Every other difference between the three was comment prose
 *      and Prettier line-wrapping. The Property walk is KEPT — measured
 *      against conduit's full 412-file lint it added zero findings in product
 *      code, so its cost is nil and its coverage is strictly larger.
 *
 *   2. ALL THREE flagged their own name. The lookbehind was `(?<![a-z:])`,
 *      which does not exclude a preceding hyphen, so the literal strings
 *      `no-text-white` and `bsuite/no-text-white` matched. Every repo that
 *      REGISTERS this rule therefore got two false positives in its own
 *      eslint config, and the estate had been answering them with
 *      `eslint-disable-next-line` comments in each repo — a workaround
 *      re-applied per repo instead of a fix applied once. The lookbehind is
 *      now `(?<![a-z:-])`. No Tailwind utility is ever preceded by a hyphen,
 *      so nothing real is lost: the battery scores 15/15 with the tightened
 *      form against 13/15 with the old one, and conduit's full lint went from
 *      2 warnings (both in eslint.config.mjs, both naming this rule, both
 *      fatal under its `--max-warnings 0`) to 0.
 *
 * The location fallacy is worth naming, because this estate has been bitten by
 * it twice on the sibling rule: "the copy in packages/ is authoritative" is NOT
 * a safe default here. For no-hardcoded-colours the nominal source in packages/
 * has twice been the STALEST copy of the six — once at crm7#1579, and again on
 * 2026-08-12 when crm7's copy was 69 lines ahead of it, carrying four
 * purpose-built pure-colour regexes the source still lacks. Reconcile on
 * measured behaviour every time, never on which directory a file sits in.
 *
 * DISTRIBUTION: each submodule that carries this rule holds a byte-identical
 * inline copy at `<submodule>/eslint-rules/no-text-white.js`, because Vercel
 * clones only that submodule and packages/ does not exist in its build context.
 * `scripts/sync-inline-eslint-rules.mjs --check` fails CI when a copy drifts.
 */

import { isBradenSubmoduleFile } from './_shared.js'

const FORBIDDEN_RE = /(?<![a-z:-])text-(white|black)(?!-)\b/g
const PREFIXED_EXEMPT_RE =
  /\b(hover|focus|focus-visible|dark|group-hover|group-focus):text-(white|black)\b/g

export const noTextWhite = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      // The description deliberately does NOT quote the utilities it bans.
      //
      // It used to, behind a disable directive naming `bsuite/no-text-white` — and
      // that directive was wrong twice over. The rule it named does not fire here, so
      // ESLint reported it as an UNUSED disable; the rule that actually fires on that
      // line is `bsuite/no-hardcoded-colours`, whose PURE_TAILWIND_RE matches the
      // literal wherever it appears, prose included. Proven by removing the directive:
      // `no-text-white` stayed silent and `no-hardcoded-colours` fired.
      //
      // Naming the right rule would have worked, and would still have been a
      // suppression that has to stay correct forever. Not writing the literal is
      // simpler and cannot rot. Same class as a colour literal in a comment tripping
      // the C1/C2 gates: a gate matching the token in prose ABOUT the token is a
      // recurring cost, and the cheap side of it is the prose.
      description:
        'Disallow standalone white and black text utilities. Use text-foreground instead.',
      recommended: true,
    },
    schema: [],
    messages: {
      forbidden:
        '"{{value}}" is a hardcoded colour token. Use text-foreground (body), text-muted-foreground (secondary), or text-heading (headings). ' +
        'See packages/theme/docs/TOKEN-MAPPING.md. ' +
        'If this is intentionally on a coloured fill, add // eslint-disable-next-line bsuite/no-text-white with a fill-context comment.',
    },
  },
  create(context) {
    // Braden submodule uses a separate Corporate theme — exempt it.
    // See eslint-rules/_shared.js — unified 2026-07-17 onto the shared,
    // fable-verified isBradenSubmoduleFile() (package.json-anchored
    // filesystem walk) instead of this file's own bespoke path-regex
    // check, so all bsuite consumer repos exempt braden identically.
    if (isBradenSubmoduleFile(context.filename, context.cwd ?? process.cwd())) return {}

    function checkValue(node, value) {
      // Strip exempted prefixed variants first
      const stripped = value.replace(PREFIXED_EXEMPT_RE, '')
      FORBIDDEN_RE.lastIndex = 0
      let match
      while ((match = FORBIDDEN_RE.exec(stripped)) !== null) {
        context.report({
          node,
          messageId: 'forbidden',
          data: { value: match[0] },
        })
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        const val = node.value
        if (!val) return
        if (val.type === 'Literal' && typeof val.value === 'string') {
          checkValue(node, val.value)
        } else if (val.type === 'JSXExpressionContainer') {
          const expr = val.expression
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkValue(node, expr.value)
          } else if (expr.type === 'TemplateLiteral') {
            expr.quasis.forEach((q) => checkValue(node, q.value.raw))
          }
        }
      },
      // Also catch string literals used in cn() / clsx() call arguments,
      // array expressions, ternary branches, and object property values —
      // a className string sitting in an object property, which is the shape
      // that reached production in DeveloperToolbar. The literal example is
      // spelled out in this file's header rather than here: packages/ is in
      // scope for the platform-wide pure white/black ban, and the source of a
      // colour rule must not ship the pattern it forbids downstream.
      Literal(node) {
        if (typeof node.value !== 'string') return
        const parent = node.parent
        if (
          parent &&
          (parent.type === 'CallExpression' ||
            parent.type === 'ArrayExpression' ||
            parent.type === 'ConditionalExpression' ||
            parent.type === 'Property')
        ) {
          checkValue(node, node.value)
        }
      },
    }
  },
}
