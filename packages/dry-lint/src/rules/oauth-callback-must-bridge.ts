/**
 * bsuite/oauth-callback-must-bridge
 *
 * Enforces the cross-app SSO contract for OAuth callback handlers: in any file
 * that calls `exchangeCodeForTokens(...)`, a corresponding call to
 * `supabase.auth.setSession(...)` MUST also exist. Without this bridge, the
 * BS-OAuth-issued access_token is stored only in the `bs_*` localStorage keys
 * and the app's per-domain Supabase client falls back to anon — breaking every
 * RLS-protected query immediately after the BSU→app handoff.
 *
 * Failure mode: 401 on `platform_branding`, 401 on `branding_json_for_tenant`
 * RPC, 406 on `profiles?id=eq.<user-id>.single()`. Incident: 2026-05-06.
 *
 * Detected pattern (REQUIRED):
 *   const { tokens, user } = await exchangeCodeForTokens(code, state);
 *   localStorage.setItem('bs_access_token', tokens.access_token);
 *   // ...
 *   const { error } = await supabase.auth.setSession({
 *     access_token: tokens.access_token,
 *     refresh_token: tokens.refresh_token,
 *   });
 *
 * Allowed escapes:
 *   - The file is the canonical `@bsuite/auth` package itself (we don't lint
 *     the source of `exchangeCodeForTokens`; only its consumers).
 *   - Test fixtures + mocks (file path matches `__tests__`, `*.test.*`,
 *     `*.spec.*`, `mocks/`, `__mocks__/`).
 */

import { ESLintUtils, AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

const RULE_NAME = 'oauth-callback-must-bridge';

const createRule = ESLintUtils.RuleCreator<{ recommended: boolean }>(
  (name) =>
    `https://github.com/GaryOcean428/bsuite/blob/main/packages/dry-lint/README.md#${name}`,
);

type MessageIds = 'missingBridge';

const TEST_PATH_FRAGMENTS = [
  '__tests__',
  '/__mocks__/',
  '/mocks/',
  '.test.',
  '.spec.',
  'packages/auth/src/',
];

function isTestOrPackageSource(filePath: string): boolean {
  return TEST_PATH_FRAGMENTS.some((fragment) => filePath.includes(fragment));
}

/**
 * True when the call expression's callee is `exchangeCodeForTokens`.
 * Matches both bare `exchangeCodeForTokens(...)` and any module-prefixed
 * form like `bsuiteAuth.exchangeCodeForTokens(...)`.
 */
function isExchangeCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return callee.name === 'exchangeCodeForTokens';
  }
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return callee.property.name === 'exchangeCodeForTokens';
  }
  return false;
}

/**
 * True when the call expression's callee resembles `<obj>.auth.setSession`.
 * Accepts any object root (e.g. `supabase`, `client`, `await createClient().`).
 */
function isSetSessionCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    callee.computed ||
    callee.property.type !== AST_NODE_TYPES.Identifier ||
    callee.property.name !== 'setSession'
  ) {
    return false;
  }
  // Walk up: foo.auth.setSession — the immediate object must be a member
  // expression whose property name is 'auth'.
  const obj = callee.object;
  if (
    obj.type !== AST_NODE_TYPES.MemberExpression ||
    obj.computed ||
    obj.property.type !== AST_NODE_TYPES.Identifier ||
    obj.property.name !== 'auth'
  ) {
    return false;
  }
  return true;
}

export const oauthCallbackMustBridgeRule = createRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce supabase.auth.setSession() bridge in BS OAuth callback handlers — without it, the user is anonymous in the destination app after BSU→app handoff (incident 2026-05-06).',
      recommended: true,
    },
    schema: [],
    messages: {
      missingBridge:
        'BS OAuth callback handler calls exchangeCodeForTokens() but does NOT call supabase.auth.setSession(). The OAuth-Server-issued access_token must be bridged to a Supabase session — without this, the per-domain supabase client falls back to anon and RLS-protected reads 401/406 immediately after the BSU→app handoff. See bsuite_incident_20260506_bsoauth_supabase_session_bridge for the failure mode and the canonical fix pattern.',
    },
  },
  defaultOptions: [],
  create(context) {
    const filePath = context.filename;

    // Skip the @bsuite/auth package source (it defines exchangeCodeForTokens
    // and is not a callback handler) and all test / mock files.
    if (isTestOrPackageSource(filePath)) {
      return {};
    }

    let exchangeCallNode: TSESTree.CallExpression | null = null;
    let hasSetSessionCall = false;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isExchangeCall(node) && exchangeCallNode === null) {
          exchangeCallNode = node;
        } else if (isSetSessionCall(node)) {
          hasSetSessionCall = true;
        }
      },
      'Program:exit'() {
        if (exchangeCallNode !== null && !hasSetSessionCall) {
          context.report({
            node: exchangeCallNode,
            messageId: 'missingBridge',
          });
        }
      },
    };
  },
});

export const OAUTH_CALLBACK_MUST_BRIDGE_RULE_NAME = RULE_NAME;
