// Zero-dependency test using Node's built-in test runner (node:test) —
// SOURCE OF TRUTH; mirrored into each submodule's eslint-rules/.
// Run via `node --test packages/eslint-config/rules/no-text-white.test.js`.
//
// WHY THIS EXISTS
// This rule had no source of truth and no test anywhere. It lived in three
// submodules with three different bodies, and the only way to find out what it
// actually enforced was to run all three against the same inputs. This file is
// that experiment, frozen so it cannot be lost again.
//
// The suite is NEGATIVE-CONTROLLED in both directions:
//
//   - Every `invalid` case below reports ZERO errors against at least one of the
//     three pre-reconciliation bodies, so the suite fails against them rather
//     than passing vacuously. The object-property case in particular reported
//     zero in BOTH crm7 and conduit.
//
//   - The two `valid` cases naming the rule itself (`'no-text-white'` as a
//     registration key, `'bsuite/no-text-white'` as a severity binding) reported
//     ONE error each in ALL THREE bodies. That false positive is why every repo
//     registering this rule carried eslint-disable comments in its own config.
//     They pin the tightened `(?<![a-z:-])` lookbehind: revert it to `(?<![a-z:])`
//     and these two go red.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { noTextWhite } from './no-text-white.js'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' },
  },
})

test('no-text-white', () => {
  ruleTester.run('no-text-white', noTextWhite, {
    valid: [
      // Semantic tokens are the whole point of the rule.
      { code: 'const a = <div className="text-foreground" />' },
      { code: 'const a = <div className="text-muted-foreground" />' },

      // Conditional prefixes are state overlays on top of a token, not the base
      // colour, so they are exempt by design.
      { code: 'const a = <div className="hover:text-white" />' },
      { code: 'const a = <div className="focus-visible:text-black" />' },
      { code: 'const a = <div className="dark:text-white" />' },
      { code: 'const a = <div className="group-hover:text-white" />' },

      // `text-white-ish` is not the banned utility — the `(?!-)` guard.
      { code: 'const a = <div className="text-white-ish" />' },

      // THE FALSE POSITIVE THIS RULE SHIPPED WITH, in both of its shapes.
      // A hyphen before `text-white` means we are looking at this rule's own
      // NAME, never a Tailwind class — no utility is ever preceded by `-`.
      // Both of these reported 1 error in all three pre-reconciliation bodies.
      { code: "const plugin = { 'no-text-white': rule }" },
      { code: "const rules = { 'bsuite/no-text-white': 'warn' }" },
      { code: "import { noTextWhite } from './eslint-rules/no-text-white.js'" },
    ],
    invalid: [
      // Plain className attribute.
      {
        code: 'const a = <div className="text-white" />',
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: 'const a = <div className="text-black" />',
        errors: [{ messageId: 'forbidden' }],
      },
      // Mid-string, and with the `!` important modifier.
      {
        code: 'const a = <div className="p-1 text-white p-2" />',
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: 'const a = <div className="!text-white" />',
        errors: [{ messageId: 'forbidden' }],
      },
      // Template literal inside an expression container.
      {
        code: 'const a = <div className={`p-2 text-white`} />',
        errors: [{ messageId: 'forbidden' }],
      },
      // cn() / clsx() call arguments.
      {
        code: "const a = cn('p-2', 'text-white')",
        errors: [{ messageId: 'forbidden' }],
      },
      // Array element and ternary branch.
      {
        code: "const a = ['text-white']",
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: "const a = x ? 'text-white' : 'text-foreground'",
        errors: [{ messageId: 'forbidden' }],
      },
      // THE BSU-ONLY CASE. Object property values were walked in exactly one of
      // the three copies; crm7 and conduit both reported ZERO here. This is the
      // single behavioural difference the reconciliation kept.
      {
        code: "const a = { classes: 'bg-purple-600 text-white' }",
        errors: [{ messageId: 'forbidden' }],
      },
      // A prefixed variant does not launder an unprefixed one in the same string.
      {
        code: 'const a = <div className="hover:text-white text-black" />',
        errors: [{ messageId: 'forbidden' }],
      },
    ],
  })
})

// The braden exemption is shared with no-hardcoded-colours and is asserted in
// _shared.test.js. What matters here is that the exemption is WIRED — a rule that
// forgets to call it enforces the Corporate brand's own palette against it.
test('no-text-white consults the shared braden exemption', () => {
  const src = noTextWhite.create.toString()
  assert.match(
    src,
    /isBradenSubmoduleFile\(/,
    'the rule must delegate the braden exemption to _shared.js, not re-implement a path check',
  )
})
