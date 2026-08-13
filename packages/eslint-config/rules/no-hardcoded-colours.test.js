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
        // ONE error. The literal matches both the pure ban and the format rule,
        // but the dedup keys on range:value, so the more specific message wins.
        errors: [{ messageId: 'forbiddenPure' }],
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
        // Pure white/black fires its own absolute ban; the dedup collapses the
        // duplicate format complaint, so ONE error with the specific message.
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const M = 'mask-[linear-gradient(#000,#000)]'`, // theme-audit-ok: lint fixture — unannotated mask stop MUST fail
        // Pure white/black fires its own absolute ban; the dedup collapses the
        // duplicate format complaint, so ONE error with the specific message.
        errors: [{ messageId: 'forbiddenPure' }],
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

test('gaps found by the business-suite-unified sweep, 2026-08-11', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // HTML numeric character entity — NOT a colour. `&#129514;` is an emoji.
      { code: `const html = '<p>&#129514; hello</p>'` },
      { code: `const html = '&#8212; em dash &#160;'` },
    ],
    invalid: [
      // A template literal with a trailing method call: the ReturnStatement's
      // argument is a CallExpression, which the walker does not descend into.
      {
        code: 'function t() { return `<p style="color:#333">x</p>`.trim() }', // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenHex' }],
      },
      {
        code: "const s = `color:#f8f9fa`.trim()", // theme-audit-ok: lint fixture — off-palette is the point
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // Chained calls must not launder it either.
      {
        code: "const s = `color:#f8f9fa`.trim().toUpperCase()", // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenHex' }],
      },
    ],
  })
})

test('EMAIL-HTML-EXEMPT disarms the rule for mail/printable HTML', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      { code: `/* EMAIL-HTML-EXEMPT */\nconst html = '<td bgcolor="#2563eb">hi</td>'` },
    ],
    invalid: [
      // Same code without the marker must still fire, or the "valid" case above
      // proves nothing about the marker.
      {
        code: `const html = '<td bgcolor="#2563eb">hi</td>'`,
        errors: [{ messageId: 'forbiddenHex' }],
      },
    ],
  })
})

test('EMAIL-HTML-EXEMPT relaxes the FORMAT but never the pure-white/black ban (crm7#1623)', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // An ordinary brand hex IS allowed in mail HTML — var() cannot resolve there.
      { code: `/* EMAIL-HTML-EXEMPT */\nconst html = '<td bgcolor="#2563eb">hi</td>'` },
    ],
    invalid: [
      // THE CONTROL THE ORIGINAL HATCH LACKED. The marker used to `return {}`,
      // so this produced ZERO errors while the comment above it promised pure
      // white was still banned. The suite would have stayed green on a silently
      // permitted violation — which is exactly what was happening.
      {
        code: `/* EMAIL-HTML-EXEMPT */\nconst html = '<td bgcolor="#ffffff">x</td>'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `/* EMAIL-HTML-EXEMPT */\nconst html = '<td bgcolor="#fff">x</td>'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `/* EMAIL-HTML-EXEMPT */\nconst c = 'rgb(255, 255, 255)'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
      // pdf-lib's normalised form — the e-signature certificate title shape.
      {
        code: `const c = 'rgb(0, 0, 0)'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
    ],
  })
})

test('the react-pdf carve-out needs a real IMPORT, not a mention (crm7#1623)', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // A genuine import earns the exemption.
      {
        code: `import { Text } from '@react-pdf/renderer'\nconst c = '#ab233a'`,
      },
      // The deliberate marker still works — it covers dynamic imports and helpers.
      { code: `/* REACT-PDF-EXEMPT */\nconst c = '#ab233a'` },
    ],
    invalid: [
      // MENTIONING the library in a comment must NOT exempt the file. This is the
      // shape that silently exempted the customer-facing quote signing page and
      // the client invoice email in crm7 — 12 files matched the substring, 6
      // actually imported it.
      {
        code: `// this file deliberately does NOT use @react-pdf/renderer\nconst c = '#ab233a'`,
        errors: [{ messageId: 'forbiddenHex' }],
      },
      // And a mention must not hide pure white either.
      {
        code: `// see @react-pdf/renderer for the other flow\nconst c = '#ffffff'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
    ],
  })
})

test('the forward-ported pure-colour regexes catch every notation, and only those', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    // Each of these was INVISIBLE to the single PURE_RE this file replaced. Ported
    // from crm7's copy, which was ahead of the source — see the rule's own header.
    valid: [
      // oklch is the estate's PREFERRED notation, so a raw oklch near-black is not
      // a format violation the way a raw hex is. What matters here is only that
      // the pure ban does not claim it: lightness 0.13 is not 0.
      { code: `const a = 'oklch(0.13 0.02 260)'` },
    ],
    invalid: [
      // Alpha hex — the source's regex ended at \b and never saw these.
      { code: `const a = '#ffffff00'`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const a = '#fff8'`, errors: [{ messageId: 'forbiddenPure' }] },
      // Space-separated rgb, including the slash-alpha form.
      { code: `const a = 'rgba(0 0 0 / 50%)'`, errors: [{ messageId: 'forbiddenPure' }] },
      // pdf-lib's normalised white. This one came from THIS file, not crm7 —
      // preserved through the merge because it is the notation the e-signature
      // certificate title was written in.
      { code: `const a = 'rgb(1, 1, 1)'`, errors: [{ messageId: 'forbiddenPure' }] },
      // oklch anchored on lightness, so any chroma and hue still count.
      { code: `const a = 'oklch(1 0.02 260)'`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const a = 'oklch(100% 0 0)'`, errors: [{ messageId: 'forbiddenPure' }] },
      // hsl lightness is the THIRD component.
      { code: `const a = 'hsl(210 40% 100%)'`, errors: [{ messageId: 'forbiddenPure' }] },
      // Tailwind white/black have no numeric shade, so TAILWIND_PALETTE_RE is
      // structurally blind to them.
      { code: `const C = () => <div className="bg-white" />`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const C = () => <div className="text-black" />`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const C = () => <div className="bg-white/50" />`, errors: [{ messageId: 'forbiddenPure' }] },
      // THE OVER-REACH CONTROL. The estate near-white and near-black are the
      // prescribed REPLACEMENTS for pure, so the pure ban must never claim them.
      // They are still hardcoded literals, so the FORMAT rule still fires — the
      // messageId is the whole point of these two cases.
      { code: `const a = '#f8f9fa'`, errors: [{ messageId: 'forbiddenHex' }] },
      { code: `const a = '#0a0e1a'`, errors: [{ messageId: 'forbiddenHex' }] },
      // Lightness is what makes a colour pure. A dark navy is not black, and a
      // 50%-lightness grey is not white — both are still hardcoded, so the FORMAT
      // rule fires and the pure ban does not. Again, the messageId is the point.
      { code: `const a = 'hsl(0 0% 50%)'`, errors: [{ messageId: 'forbiddenHex' }] },
    ],
  })
})
