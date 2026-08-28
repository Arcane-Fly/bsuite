import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import noHardcodedColours from './rules/no-hardcoded-colours.js'
import { noTextWhite } from './rules/no-text-white.js'

// Re-export the rules for apps that build their own flat config
export { noHardcodedColours, noTextWhite }

// Inline plugin object — usable directly in any flat config array.
//
// no-text-white is DEFINED here but deliberately NOT bound to a severity in
// `base` below. Every app that enforces it already binds it itself, at a
// severity it chose (BSU and conduit both run it at `warn` under
// `--max-warnings 0`). Switching it on for every consumer of `base` would
// change three apps' lint results in a commit that is nominally about giving
// the rule a source of truth. Defining it without binding it costs nothing and
// makes `bsuite/no-text-white` disable directives resolvable everywhere, which
// is what stops the "Definition for rule was not found" failure mode.
export const bsuitePlugin = {
  rules: {
    'no-hardcoded-colours': noHardcodedColours,
    'no-text-white': noTextWhite,
  },
}

/** @type {import('typescript-eslint').ConfigArray} */
export const base = tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '.vercel', 'storybook-static'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      bsuite: bsuitePlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Phase 5 theme centralisation — forbid hardcoded palette/hex colours
      'bsuite/no-hardcoded-colours': 'error',
      /*
       * Australian dates and times, estate-wide (2026-08-28).
       *
       * `toLocaleDateString()` with NO argument does not mean "the app's
       * locale" — it means the VIEWER'S BROWSER locale. On a US-configured
       * browser `23/08/2026` renders as `8/23/2026`, which an Australian
       * reader parses as a different day. The operator reported exactly that
       * on production /payroll/timesheets. 97 bare call sites across five
       * apps were swept onto `@bsuite/dates` in the same change; this rule is
       * what stops the 98th.
       *
       * ABSENCE DOES NOT MATCH A GREP — the earlier D-76 sweep searched for
       * the `'en-US'` literal and could not see a missing argument, which is
       * why /admin kept rendering US dates after it. The selector below keys
       * on `arguments.length === 0`, so it catches what a text search cannot.
       *
       * `toLocaleString()` is deliberately NOT restricted: most of its ~76
       * uses format NUMBERS, where en-AU and en-US agree, and banning it
       * would be noise rather than a defect.
       */
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[arguments.length=0] > MemberExpression[property.name='toLocaleDateString']",
          message:
            "Bare toLocaleDateString() uses the viewer's browser locale, not Australian. Use formatDate() from '@bsuite/dates'.",
        },
        {
          selector:
            "CallExpression[arguments.length=0] > MemberExpression[property.name='toLocaleTimeString']",
          message:
            "Bare toLocaleTimeString() uses the viewer's browser locale (12h on en-US). Use formatTime() from '@bsuite/dates'.",
        },
      ],
    },
  },
)

export default base
