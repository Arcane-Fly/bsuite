/**
 * bsuite/no-uuid-input-placeholder
 *
 * Flags any JSX `<Input>` / `<input>` / `<Textarea>` / `<textarea>` whose
 * `placeholder` attribute asks the operator to paste a UUID — a direct
 * violation of the BSuite DRY one-shot architecture (every entity has
 * exactly ONE owning app that provides CRUD UI; everywhere else picks
 * from canonical entity selectors via FK).
 *
 * Pattern detected (any one of):
 *   - placeholder contains "UUID of …"
 *   - placeholder contains "Enter … UUID" / "Paste … UUID" / "Insert … UUID"
 *   - placeholder contains "… UUID …" / "UUID …" / "… UUID" (whole-word
 *     "UUID", case-insensitive). Belt-and-braces because operators should
 *     never type a 36-char hex string by hand for any reason.
 *
 * Use one of the canonical selectors from
 * `src/components/entity/selectors/` (or build a new tenant-scoped one
 * mirroring the IncidentSelector I4 pattern) and store the row's `id`.
 *
 * Allowed escapes:
 *   - Test files (path matches `__tests__`, `*.test.*`, `*.spec.*`,
 *     `*.stories.*`, `mocks/`, `__mocks__/`).
 *   - Inline `// eslint-disable-next-line bsuite/no-uuid-input-placeholder`
 *     immediately above the offending JSX. Use this ONLY when there is
 *     genuinely no canonical entity to pick from (e.g. a developer-only
 *     debug surface) — and document why with a comment.
 *
 * History: this rule landed after the 2026-06-01 sweep (PRs #933–#939)
 * which replaced raw UUID inputs across 16 CRM7 pages with canonical
 * entity selectors. See docs/20260227-dry-one-shot-architecture-v1.04A.md.
 */

import { ESLintUtils, AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

const RULE_NAME = 'no-uuid-input-placeholder';

const createRule = ESLintUtils.RuleCreator<{ recommended: boolean }>(
  (name) =>
    `https://github.com/GaryOcean428/bsuite/blob/main/packages/dry-lint/README.md#${name}`,
);

type MessageIds = 'uuidPlaceholder';

/** JSX element names treated as free-text input surfaces. Both PascalCase
 *  shadcn/ui components and the lowercase HTML primitives are matched. */
const INPUT_ELEMENT_NAMES = new Set(['Input', 'input', 'Textarea', 'textarea']);

const TEST_PATH_FRAGMENTS = [
  '__tests__',
  '/__mocks__/',
  '/mocks/',
  '.test.',
  '.spec.',
  '.stories.',
];

function isTestPath(filePath: string): boolean {
  return TEST_PATH_FRAGMENTS.some((fragment) => filePath.includes(fragment));
}

/** Anchored, case-insensitive whole-word match for "UUID" in a string.
 *  Bounded to ≤ 30 chars per BSuite no-regex-by-default doctrine. */
const UUID_TOKEN = /\bUUID\b/i;

/** Resolve a JSX element's tag name regardless of whether it is a member
 *  expression (e.g. `Form.Input`). Returns the trailing identifier name
 *  for member expressions so `<Form.Input>` matches `Input`.
 *
 *  Note: handles a single level of nesting (`<Form.Input>`). Deeply nested
 *  forms like `<Form.Field.Input>` resolve via the trailing identifier
 *  too because we read `name.property` regardless of how deep `name.object`
 *  is — we only care about the leaf component name. */
function getTagName(opening: TSESTree.JSXOpeningElement): string | null {
  const name = opening.name;
  if (name.type === AST_NODE_TYPES.JSXIdentifier) {
    return name.name;
  }
  if (
    name.type === AST_NODE_TYPES.JSXMemberExpression &&
    name.property.type === AST_NODE_TYPES.JSXIdentifier
  ) {
    return name.property.name;
  }
  return null;
}

/** Pull a literal string out of a JSXAttribute's value, or null if the
 *  value is dynamic / not a plain string. We intentionally do NOT chase
 *  variable references — false-negatives on `placeholder={UUID_LABEL}`
 *  are acceptable, false-positives are not. */
function getPlaceholderString(value: TSESTree.JSXAttribute['value']): string | null {
  if (value === null) return null;
  if (value.type === AST_NODE_TYPES.Literal && typeof value.value === 'string') {
    return value.value;
  }
  if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
    const expr = value.expression;
    if (expr.type === AST_NODE_TYPES.Literal && typeof expr.value === 'string') {
      return expr.value;
    }
    // Template literal with no interpolations: extract the cooked text.
    if (
      expr.type === AST_NODE_TYPES.TemplateLiteral &&
      expr.expressions.length === 0 &&
      expr.quasis.length === 1
    ) {
      return expr.quasis[0].value.cooked;
    }
  }
  return null;
}

export const noUuidInputPlaceholderRule = createRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `<Input placeholder="UUID of …">` and similar UUID-prompting placeholders. Operators should pick from a canonical entity selector, not paste a UUID by hand. Direct violation of the DRY one-shot architecture.',
      recommended: true,
    },
    schema: [],
    messages: {
      uuidPlaceholder:
        'Free-text input asks the operator to type/paste a UUID ({{ placeholder }}). This is a DRY one-shot violation — every entity has exactly ONE owning app that provides CRUD UI; everywhere else must pick from a canonical entity selector. Use a selector from `src/components/entity/selectors/` (or build a new tenant-scoped one mirroring the IncidentSelector I4 pattern) and store the row\'s id. See docs/20260227-dry-one-shot-architecture-v1.04A.md.',
    },
  },
  defaultOptions: [],
  create(context) {
    const filePath = context.filename;
    if (isTestPath(filePath)) {
      return {};
    }

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        // Attribute name must be `placeholder`.
        if (
          node.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          node.name.name !== 'placeholder'
        ) {
          return;
        }

        // Parent JSXOpeningElement must be one of the input-shaped tags.
        const parent = node.parent;
        if (parent?.type !== AST_NODE_TYPES.JSXOpeningElement) {
          return;
        }
        const tagName = getTagName(parent);
        if (tagName === null || !INPUT_ELEMENT_NAMES.has(tagName)) {
          return;
        }

        const placeholder = getPlaceholderString(node.value);
        if (placeholder === null) {
          return;
        }

        if (!UUID_TOKEN.test(placeholder)) {
          return;
        }

        // Truncate the placeholder text in the error message so very long
        // strings don't blow out CI logs. Wrap in quotes for readability
        // (avoiding JSON.stringify so the renderer doesn't show escaped
        // characters from "\u2026" et al.).
        const preview =
          placeholder.length > 60 ? `${placeholder.slice(0, 57)}…` : placeholder;
        context.report({
          node,
          messageId: 'uuidPlaceholder',
          data: {
            placeholder: `"${preview}"`,
          },
        });
      },
    };
  },
});

export const NO_UUID_INPUT_PLACEHOLDER_RULE_NAME = RULE_NAME;
