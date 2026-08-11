// Zero-dependency test using Node's built-in test runner (node:test) —
// SOURCE OF TRUTH; mirrored into each submodule's eslint-rules/.
// Run via `node --test packages/eslint-config/rules/no-hardcoded-colours.test.js`.
//
// WHY THIS EXISTS (crm7#1579)
// The rule shipped for months looking like a colour gate while enforcing almost
// nothing. Two independent holes:
//   1. The palette regex matched only `slate|gray|zinc|neutral`, so every
//      CHROMATIC class passed. `text-amber-600` reached production twice with a
//      green lint (GrantsConsole.tsx:453, InterpretationRulesTab.tsx:764).
//   2. Only `className` attributes and object properties were visited, so a colour
//      RETURNED from a function escaped entirely — `return 'rgb(249 115 22)'`
//      (DealHealthPanel.tsx:42) and the same literal behind a ternary
//      (forecast.tsx:323) both linted clean while feeding an inline style.
//
// Nobody had ever watched this rule fail on the shapes it was supposed to stop.
// Every `invalid` case below is a shape that previously produced ZERO errors, and
// the `valid` cases pin the two guards that must NOT regress into false positives:
// token expressions, and `crm7#1234` issue references (a 4-digit hex look-alike
// that once failed a build for citing the very issue it fixed).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { noHardcodedColours } from './no-hardcoded-colours.js'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' },
  },
})

test('no-hardcoded-colours catches every shape that was previously gate-invisible', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // Semantic tokens — the whole point of the rule.
      { code: `const C = () => <div className="text-warning-text bg-card" />` },
      { code: `function c() { return 'var(--color-warning)' }` },
      { code: `function c() { return 'color-mix(in oklch, var(--color-warning), var(--color-error) 50%)' }` },
      // Neutral-palette semantic names that are NOT palette classes.
      { code: `const C = () => <div className="text-foreground border-border" />` },
      // Issue references must not read as hex — this guard exists because
      // `bsuite#1871` once failed a build as the 4-digit hex `#1871`.
      { code: `const msg = 'see crm7#1234 and bsuite#1871'` },
      { code: `const C = () => <div className="p-4" title="crm7#1234" />` },
      // Non-colour hex-shaped things that are not preceded by punctuation/space+#.
      { code: `const id = 'abc123'` },
    ],
    invalid: [
      // ── Hole 1: chromatic palettes (previously ZERO errors) ──────────────
      {
        code: `const C = () => <div className="text-amber-600" />`,
        errors: [{ messageId: 'forbiddenPalette' }],
      },
      {
        code: `const C = () => <div className="bg-red-50" />`,
        errors: [{ messageId: 'forbiddenPalette' }],
      },
      // Prefixes the old rule never covered at all.
      {
        code: `const C = () => <div className="ring-blue-500" />`,
        errors: [{ messageId: 'forbiddenPalette' }],
      },
      {
        code: `const C = () => <div className="fill-green-600" />`,
        errors: [{ messageId: 'forbiddenPalette' }],
      },
      {
        code: `const C = () => <div className="from-purple-500" />`,
        errors: [{ messageId: 'forbiddenPalette' }],
      },
      // Neutral palettes must still fire — the original coverage is preserved.
      {
        code: `const C = () => <div className="text-slate-500" />`,
        errors: [{ messageId: 'forbiddenPalette' }],
      },

      // ── Hole 2: colour strings outside className/Property ────────────────
      // The exact DealHealthPanel.tsx:42 shape.
      {
        code: `function signal(v) { if (v >= 25) return 'rgb(249 115 22)'; return 'var(--x)' }`,
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // Concise arrow body — no ReturnStatement node at all.
      {
        code: `const c = () => '#ff8800'`, // theme-audit-ok: lint fixture — an off-palette literal is the point
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // The exact forecast.tsx:323 shape — literal behind a ternary.
      {
        code: `function f(v) { return v ? 'rgb(249 115 22)' : 'var(--ok)' }`,
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // Variable initialiser.
      {
        code: `const brand = '#1a2b3c'`, // theme-audit-ok: lint fixture — an off-palette literal is the point
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // hsl() was never checked by the old rule in any position.
      {
        code: `const brand = 'hsl(210 100% 50%)'`,
        errors: [{ messageId: 'forbiddenHex' }],
      },

      // ── Asymmetry: className was palette-only, Property was hex-only ─────
      // Palette class in an object property (a variant map).
      {
        code: `const ramp = { warn: 'text-amber-600' }`,
        errors: [{ messageId: 'forbiddenPalette' }],
      },
      // Arbitrary hex value inside className.
      {
        code: `const C = () => <div className="text-[#ffffff]" />`, // theme-audit-ok: lint fixture — the rule must be seen catching this
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // Style object — the original Property/hex path, must still work.
      {
        code: `const C = () => <div style={{ color: '#888' }} />`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // The host-employer.tsx:116 shape: a banned literal hiding as a var() fallback.
      {
        code: `const C = () => <div style={{ color: 'var(--color-muted-foreground, #888)' }} />`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenHex' }],
      },
    ],
  })
})

test('theme-audit-ok annotates a mask stop without disarming the file', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // Same line — the shine-border.tsx shape.
      {
        code: `const s = { mask: \`linear-gradient(#fff 0 0)\` } // theme-audit-ok: mask stop, opacity not paint`,
      },
      // Line above — the border-beam.tsx MASK_CLASS shape.
      {
        code: `// theme-audit-ok: MASK stops — in a mask the channel is opacity, not paint\nconst M = 'mask-[linear-gradient(#000,#000)]'`,
      },
    ],
    invalid: [
      // The SAME code without the annotation must still fire — otherwise the
      // "valid" cases above would prove nothing about the hatch.
      {
        code: `const s = { mask: \`linear-gradient(#fff 0 0)\` }`, // theme-audit-ok: lint fixture — unannotated mask stop MUST fail
        errors: [{ messageId: 'forbiddenHex' }],
      },
      {
        code: `const M = 'mask-[linear-gradient(#000,#000)]'`, // theme-audit-ok: lint fixture — unannotated mask stop MUST fail
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // The hatch is line-local, not file-wide: an annotated mask stop on one line
      // must not licence an unrelated hardcoded colour further down the file.
      {
        code: `const s = '#fff' // theme-audit-ok: mask stop\nconst brand = '#ab233a'`,
        errors: [{ messageId: 'forbiddenHex' }],
      },
    ],
  })
})

test('BRADEN-EXEMPT and react-pdf escape hatches still disarm the rule', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      { code: `/* BRADEN-EXEMPT */\nconst brand = '#ab233a'` },
      { code: `import { Text } from '@react-pdf/renderer'\nconst c = '#ab233a'` },
      { code: `/* REACT-PDF-EXEMPT */\nconst c = '#ab233a'` },
    ],
    invalid: [],
  })
  assert.ok(true)
})
