/**
 * bsuite/no-raw-entity-select
 *
 * One-shot policy enforcement: when a JSX `<Select>` (or `<select>`) widget is
 * bound to an `*Id` / `*_id` value that names a known entity, fail. The repo
 * has canonical `<XSelector>` components in `src/components/entity/selectors/`
 * (ApprenticeSelector, ContactSelector, ClientSelector, EmployerSelector,
 * MentorSelector, TrainingProviderSelector, FundingSourceSelector, etc.) which
 * provide debounced typeahead search and proper handling of large datasets.
 *
 * Raw `<Select>` for entity-id values fails when the entity count exceeds the
 * visible list — there's no search field. This rule keeps the codebase
 * consistent with the directive (per the user's stand-downs incident report).
 *
 * Detected pattern:
 *   <Select value={createForm.personId} onValueChange={...}>
 *   <Select value={form.apprenticeId} ...>
 *   <select value={selectedClientId} ...>
 *
 * Allowed escapes:
 *   - The widget is the canonical `<EntitySelector>` itself
 *   - The widget is one of the known XSelector components (auto-detected via name)
 *   - The bound value is non-entity (e.g. `selectedFilterId` for a status filter)
 *
 * To bypass for a non-entity case where the *Id name is coincidental, add an
 * inline disable comment explaining the case.
 */

import { ESLintUtils, AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

const RULE_NAME = 'no-raw-entity-select';

/**
 * Field-suffix patterns that indicate an entity FK reference. Conservative
 * list — extend when new entity domains are added. Each entry is a strict
 * regex anchor matching the END of the bound field name.
 */
const ENTITY_FIELD_SUFFIXES: ReadonlyArray<RegExp> = [
  /apprentice(_?id|Id)$/,
  /trainee(_?id|Id)$/,
  /contact(_?id|Id)$/,
  /client(_?id|Id)$/,
  /employer(_?id|Id)$/,
  // host_employer_id, hostEmployerId, host_id (snake + camel mixes)
  /host(_employer|Employer)?(_?id|Id)$/,
  /mentor(_?id|Id)$/,
  /training(_provider|Provider)(_?id|Id)$/,
  /funding(_source|Source)(_?id|Id)$/,
  /person(_?id|Id)$/,
  /people(_?id|Id)$/,
];

/**
 * The widget tag names this rule flags. Excludes the canonical EntitySelector
 * and the XSelector wrappers (matched by suffix). Specifically catches:
 *   <Select> (shadcn primitive)
 *   <select> (raw HTML)
 */
const FLAGGED_TAGS = new Set(['Select', 'select']);

/**
 * Tag-name patterns that are considered the canonical Selector and therefore
 * skipped (e.g. <ApprenticeSelector>, <ContactSelector>, <EntitySelector>).
 */
const CANONICAL_SELECTOR_RE = /Selector$/;

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/GaryOcean428/bsuite/blob/main/packages/dry-lint#${name}`,
);

/**
 * Per-call rule options. Exported so the type is nameable from the plugin
 * default-export (TS4023).
 */
export interface NoRawEntitySelectOptions {
  /** Extra entity suffixes for project-specific overrides. */
  extraSuffixes?: ReadonlyArray<string>;
}

export const NO_RAW_ENTITY_SELECT_RULE_NAME = RULE_NAME;

export const noRawEntitySelectRule = createRule<
  [NoRawEntitySelectOptions],
  'rawEntitySelect'
>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow raw <Select>/<select> for values bound to entity-FK columns. Use the canonical <XSelector> from src/components/entity/selectors/ instead.',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          extraSuffixes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    ],
    messages: {
      rawEntitySelect:
        '[bsuite/no-raw-entity-select] <{{tag}}> is bound to an entity-FK value (`{{field}}`). ' +
        'Use the canonical <XSelector> from src/components/entity/selectors/ for searchable typeahead. ' +
        'See packages/dry-lint README + the stand-downs.tsx incident in NEW_ISSUES_FOUND.md for context.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const extraSuffixPatterns: ReadonlyArray<RegExp> = (options?.extraSuffixes ?? [])
      .map((s) => new RegExp(s));
    const allSuffixes: ReadonlyArray<RegExp> = [
      ...ENTITY_FIELD_SUFFIXES,
      ...extraSuffixPatterns,
    ];

    function looksLikeEntityField(fieldName: string): boolean {
      return allSuffixes.some((re) => re.test(fieldName));
    }

    /**
     * Extract the bound field name from a JSX `value={...}` expression. Returns
     * null when the expression isn't a simple identifier or member-access we can
     * statically read. Conservative — false negatives are preferred over false
     * positives for an opt-in lint.
     */
    function readBoundFieldName(
      expr: TSESTree.Expression | TSESTree.JSXExpression,
    ): string | null {
      if (expr.type === AST_NODE_TYPES.Identifier) {
        return expr.name;
      }
      if (expr.type === AST_NODE_TYPES.MemberExpression) {
        // `form.personId` → "personId"; `state.user.contactId` → "contactId"
        if (
          !expr.computed &&
          expr.property.type === AST_NODE_TYPES.Identifier
        ) {
          return expr.property.name;
        }
      }
      return null;
    }

    return {
      JSXOpeningElement(node) {
        const nameNode = node.name;
        if (nameNode.type !== AST_NODE_TYPES.JSXIdentifier) return;
        const tag = nameNode.name;

        if (CANONICAL_SELECTOR_RE.test(tag)) return;
        if (!FLAGGED_TAGS.has(tag)) return;

        const valueAttr = node.attributes.find(
          (attr) =>
            attr.type === AST_NODE_TYPES.JSXAttribute &&
            attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
            attr.name.name === 'value',
        );
        if (
          !valueAttr ||
          valueAttr.type !== AST_NODE_TYPES.JSXAttribute ||
          !valueAttr.value ||
          valueAttr.value.type !== AST_NODE_TYPES.JSXExpressionContainer
        ) {
          return;
        }

        const expr = valueAttr.value.expression;
        if (expr.type === AST_NODE_TYPES.JSXEmptyExpression) return;

        const fieldName = readBoundFieldName(expr);
        if (!fieldName) return;

        if (!looksLikeEntityField(fieldName)) return;

        context.report({
          node,
          messageId: 'rawEntitySelect',
          data: { tag, field: fieldName },
        });
      },
    };
  },
});
