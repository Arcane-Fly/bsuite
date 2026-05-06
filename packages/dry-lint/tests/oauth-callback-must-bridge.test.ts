import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { oauthCallbackMustBridgeRule } from '../src/rules/oauth-callback-must-bridge.js';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

const CALLBACK_PATH = '/repo/src/pages/auth/callback.tsx';

ruleTester.run('oauth-callback-must-bridge', oauthCallbackMustBridgeRule, {
  valid: [
    {
      name: 'callback that bridges via supabase.auth.setSession passes',
      filename: CALLBACK_PATH,
      code: `
        const { tokens, user } = await exchangeCodeForTokens(code, state);
        localStorage.setItem('bs_access_token', tokens.access_token);
        const { error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        if (error) throw error;
      `,
    },
    {
      name: 'callback using a differently-named supabase root still bridges',
      filename: CALLBACK_PATH,
      code: `
        const { tokens } = await exchangeCodeForTokens(code, state);
        await client.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
      `,
    },
    {
      name: 'a file that never calls exchangeCodeForTokens is unaffected',
      filename: CALLBACK_PATH,
      code: `
        const result = await someOtherFlow(code);
        return result;
      `,
    },
    {
      name: 'callback that bridges via const-result destructure passes',
      filename: CALLBACK_PATH,
      code: `
        const { tokens } = await exchangeCodeForTokens(code, state);
        const sessionResult = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
      `,
    },
    {
      name: 'test files are skipped (path contains __tests__)',
      filename: '/repo/src/pages/auth/__tests__/callback.test.tsx',
      code: `
        const { tokens } = await exchangeCodeForTokens(code, state);
        // No setSession — but this is a test file, so the rule skips it.
      `,
    },
    {
      name: '@bsuite/auth package source is skipped (defines exchangeCodeForTokens itself)',
      filename: '/repo/packages/auth/src/oauth-client.ts',
      code: `
        export async function exchangeCodeForTokens(code, state) {
          // canonical implementation — never bridges, just returns tokens
          return { tokens: {}, user: {} };
        }
      `,
    },
    {
      name: 'mock fixture files are skipped',
      filename: '/repo/src/__mocks__/business-suite-oauth.ts',
      code: `
        export const exchangeCodeForTokens = vi.fn();
      `,
    },
  ],
  invalid: [
    {
      name: 'callback that calls exchangeCodeForTokens but never setSession fails',
      filename: CALLBACK_PATH,
      code: `
        const { tokens, user } = await exchangeCodeForTokens(code, state);
        localStorage.setItem('bs_access_token', tokens.access_token);
        localStorage.setItem('bs_refresh_token', tokens.refresh_token);
        // INTENTIONAL BUG: missing supabase.auth.setSession bridge.
        navigate('/dashboard');
      `,
      errors: [{ messageId: 'missingBridge' }],
    },
    {
      name: 'a non-auth setSession (e.g. zustand store.setSession) does not satisfy the bridge',
      filename: CALLBACK_PATH,
      code: `
        const { tokens } = await exchangeCodeForTokens(code, state);
        // zustand store accidentally named setSession — does NOT count.
        store.setSession(tokens);
      `,
      errors: [{ messageId: 'missingBridge' }],
    },
    {
      name: 'top-level setSession() with no .auth. parent does not satisfy the bridge',
      filename: CALLBACK_PATH,
      code: `
        const { tokens } = await exchangeCodeForTokens(code, state);
        setSession({ tokens });
      `,
      errors: [{ messageId: 'missingBridge' }],
    },
  ],
});
