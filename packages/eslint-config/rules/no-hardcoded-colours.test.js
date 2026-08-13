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
import { readFileSync } from 'node:fs'
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
        // ONE error: pure white is both a banned VALUE and a hardcoded literal,
        // and the rule now reports the token once, under the more specific message.
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
        // Pure white/black fires its own absolute ban, which subsumes the format
        // message for the same token.
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const M = 'mask-[linear-gradient(#000,#000)]'`, // theme-audit-ok: lint fixture — unannotated mask stop MUST fail
        // Pure white/black fires its own absolute ban, which subsumes the format
        // message for the same token.
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

// ===========================================================================
// THE TWO HOLES THE REGEXES LEFT OPEN  (bsuite#1889, 2026-08-13)
// ===========================================================================
//
// Both of these PASSED the pre-tokeniser source rule. Proven in both directions
// before this suite was written: the old source reported `forbiddenHex` for them
// in an ordinary file — never `forbiddenPure` — and reported NOTHING AT ALL in a
// format-exempt file, where the general hex check is switched off and only the
// absolute ban should have been left standing.
//
// They are two instances of one failure: a regex encodes an assumption about
// surface form, the assumption is wrong at an edge, and the miss is silent.
test('HOLE 1 — alpha-suffixed pure white/black is still pure', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // The guards that must survive: `#ffffff00` is eight hex digits, and so is
      // half of what these look like.
      { code: `const m = 'see crm7#1234 and bsuite#1871'` },
      { code: `const html = '<p>&#129514;</p>'` },
      // Not a colour: the run continues into non-hex word characters.
      { code: `const id = '#fffzzz'` },
    ],
    invalid: [
      // THE HOLE. The old alternation spelled the alpha nibbles as more literal
      // `f`s, so `ffffff` matched and `\b` was then asked to hold between `f` and
      // `0` — both word characters. It failed, and the alternation gave up
      // instead of reconsidering the length. White at zero opacity is white.
      {
        code: `const c = '#ffffff00'`, // theme-audit-ok: lint fixture — this literal IS the bug
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const c = '#FFFFFF00'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const c = '#00000080'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
      // 4-digit #RGBA, the short form of the same thing.
      {
        code: `const c = '#ffff'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
      // AND IT SURVIVES THE CARVE-OUT. This is the case the old rule was
      // completely silent on: no general hex check, and a PURE_RE that could not
      // see the value.
      {
        code: `/* EMAIL-HTML-EXEMPT */\nconst c = '#ffffff00'`, // theme-audit-ok: lint fixture
        errors: [{ messageId: 'forbiddenPure' }],
      },
    ],
  })
})

test('HOLE 2 — separators are a set, not a shape', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // Token-driven channels are not a hardcoded colour, in any separator style.
      { code: `const c = 'rgb(var(--rgb-brand))'` },
      { code: `const c = 'hsl(var(--h) 50% 50%)'` },
      // oklch is the MANDATED notation, so writing one is not a defect — only
      // writing pure white or pure black in one is. L=0.13 is neither.
      { code: `const c = 'oklch(0.13 0.02 260)'` }, // theme-audit-ok: lint fixture — the value is the test subject, not a token this file ships
    ],
    invalid: [
      // THE HOLE. The old pattern required commas, so the space-separated CSS
      // Color 4 form passed. A later attempt at `\s*[,\s]\s*` failed differently:
      // the leading `\s*` swallowed the space and left the separator nothing.
      {
        code: `const c = 'rgb(255 255 255)'`,
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const c = 'rgba(0 0 0 / 50%)'`,
        errors: [{ messageId: 'forbiddenPure' }],
      },
      // Same three numbers, four notations, one code path.
      { code: `const c = 'rgb(255,255,255)'`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const c = 'rgb(100% 100% 100%)'`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const c = 'hsl(0 0% 100%)'`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const c = 'hsl(210, 40%, 0%)'`, errors: [{ messageId: 'forbiddenPure' }] },
      // theme-audit-ok: lint fixture — pure white in the mandated notation is exactly what this asserts is caught
      { code: `const c = 'oklch(100% 0 0)'`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const c = 'hwb(0 100% 0%)'`, errors: [{ messageId: 'forbiddenPure' }] },
      { code: `const c = 'color(srgb 1 1 1)'`, errors: [{ messageId: 'forbiddenPure' }] },
      // pdf-lib / react-pdf normalise channels to 0..1. crm7's copy LOST this
      // case when it split the single PURE_RE into four purpose-built ones; the
      // forward-port is a union of the copies, not a copy of the longest.
      { code: `const c = 'rgb(1,1,1)'`, errors: [{ messageId: 'forbiddenPure' }] },
      // AND IT SURVIVES THE CARVE-OUT.
      {
        code: `/* EMAIL-HTML-EXEMPT */\nconst c = 'rgb(255 255 255)'`,
        errors: [{ messageId: 'forbiddenPure' }],
      },
    ],
  })
})

test('HOLE 3 — the rule must not flag its own sibling’s name', () => {
  ruleTester.run('no-hardcoded-colours', noHardcodedColours, {
    valid: [
      // `\b(prefix)-white\b` matched INSIDE `no-text-white`, because `-` is a
      // non-word character so the boundary holds in front of `text`. Three repos
      // each answered with a local `eslint-disable` — one fix applied three times
      // as a workaround. A tokeniser splits on whitespace and then decomposes by
      // segment: the first segment here is `no`, which is not a utility prefix,
      // so there is nothing to disable.
      { code: `const r = 'no-text-white'` },
      { code: `const r = 'bsuite/no-text-white and bsuite/no-hardcoded-colours'` },
      { code: `const C = () => <div className="no-text-white" />` },
      // Neighbouring shapes that were never utilities either.
      { code: `const C = () => <div className="whitespace-nowrap" />` },
      { code: `const p = 'src/components/to-white.ts'` },
    ],
    invalid: [
      // THE CONTROL. The real utilities must still fire, or the valid cases above
      // prove only that the rule is off.
      {
        code: `const C = () => <div className="bg-white" />`,
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const C = () => <div className="dark:hover:text-black" />`,
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const C = () => <div className="bg-white/50" />`,
        errors: [{ messageId: 'forbiddenPure' }],
      },
      {
        code: `const C = () => <div className="!border-black" />`,
        errors: [{ messageId: 'forbiddenPure' }],
      },
    ],
  })
})

test('the rule contains no regex — the standing ruling, enforced', () => {
  // A structural assertion, not a style preference. Every detection defect this
  // rule has shipped was a pattern whose assumption about surface form was wrong
  // at an edge, and the miss read as a pass. Re-introducing one would be
  // invisible to every other test here, because a new regex would only be
  // exercised by the shapes its author happened to think of.
  const src = readFileSync(new URL('./no-hardcoded-colours.js', import.meta.url), 'utf-8')
  for (const forbidden of ['new RegExp', '.test(', '.exec(', '.match(', '.matchAll(']) {
    assert.equal(
      src.includes(forbidden),
      false,
      `no-hardcoded-colours.js must not use ${forbidden} — the detection is a tokeniser (standing ruling, 2026-08-12)`,
    )
  }
  // `.split()` and `.replace()` are permitted ONLY with string arguments; a
  // regex separator would be the same defect wearing a method call.
  assert.equal(src.includes(".split('-')"), true, 'segment decomposition should be a string split')
})
