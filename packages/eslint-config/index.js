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
    },
  },
)

export default base
