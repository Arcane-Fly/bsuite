import {
  NO_CROSS_APP_WRITE_RULE_NAME,
  noCrossAppWriteRule,
} from './rules/no-cross-app-write.js';
import {
  NO_RAW_ENTITY_SELECT_RULE_NAME,
  noRawEntitySelectRule,
} from './rules/no-raw-entity-select.js';
import {
  OAUTH_CALLBACK_MUST_BRIDGE_RULE_NAME,
  oauthCallbackMustBridgeRule,
} from './rules/oauth-callback-must-bridge.js';
import ownershipMap from './ownership-map.json' with { type: 'json' };

export { detectAppFromPath, type AppKey } from './app-detection.js';
export { noCrossAppWriteRule, noRawEntitySelectRule, oauthCallbackMustBridgeRule };

const PLUGIN_NAME = 'bsuite';
const PLUGIN_VERSION = '0.4.0';

/**
 * The `@bsuite/dry-lint` ESLint flat-config plugin.
 *
 * Usage (eslint.config.{ts,js}):
 *
 * ```ts
 * import bsuiteDryLint from '@bsuite/dry-lint';
 *
 * export default [
 *   bsuiteDryLint.configs.recommended,
 *   // ...
 * ];
 * ```
 *
 * Or, to wire only the rule:
 *
 * ```ts
 * import bsuiteDryLint from '@bsuite/dry-lint';
 *
 * export default [
 *   {
 *     plugins: { bsuite: bsuiteDryLint },
 *     rules: {
 *       'bsuite/no-cross-app-write': 'error',
 *     },
 *   },
 * ];
 * ```
 */
const pluginBase = {
  meta: { name: PLUGIN_NAME, version: PLUGIN_VERSION },
  rules: {
    [NO_CROSS_APP_WRITE_RULE_NAME]: noCrossAppWriteRule,
    [NO_RAW_ENTITY_SELECT_RULE_NAME]: noRawEntitySelectRule,
    [OAUTH_CALLBACK_MUST_BRIDGE_RULE_NAME]: oauthCallbackMustBridgeRule,
  },
};

const recommendedConfig = {
  name: '@bsuite/dry-lint/recommended',
  plugins: { [PLUGIN_NAME]: pluginBase },
  rules: {
    [`${PLUGIN_NAME}/${NO_CROSS_APP_WRITE_RULE_NAME}`]: 'error' as const,
    [`${PLUGIN_NAME}/${NO_RAW_ENTITY_SELECT_RULE_NAME}`]: 'warn' as const,
    [`${PLUGIN_NAME}/${OAUTH_CALLBACK_MUST_BRIDGE_RULE_NAME}`]: 'error' as const,
  },
};

const warnConfig = {
  name: '@bsuite/dry-lint/warn',
  plugins: { [PLUGIN_NAME]: pluginBase },
  rules: {
    [`${PLUGIN_NAME}/${NO_CROSS_APP_WRITE_RULE_NAME}`]: 'warn' as const,
    [`${PLUGIN_NAME}/${NO_RAW_ENTITY_SELECT_RULE_NAME}`]: 'warn' as const,
    [`${PLUGIN_NAME}/${OAUTH_CALLBACK_MUST_BRIDGE_RULE_NAME}`]: 'warn' as const,
  },
};

const bsuiteDryLint = {
  ...pluginBase,
  configs: {
    recommended: recommendedConfig,
    warn: warnConfig,
  },
  ownershipMap,
};

export default bsuiteDryLint;
export { ownershipMap };
