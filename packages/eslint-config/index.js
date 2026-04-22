import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import noHardcodedColours from './rules/no-hardcoded-colours.js'

// Re-export the rule for apps that build their own flat config
export { noHardcodedColours }

// Inline plugin object — usable directly in any flat config array
export const bsuitePlugin = {
  rules: {
    'no-hardcoded-colours': noHardcodedColours,
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
