import { ESLintUtils, AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import ownershipMap from '../ownership-map.json' with { type: 'json' };
import { detectAppFromPath, type AppKey } from '../app-detection.js';

/**
 * Single-owner entry — one canonical write surface.
 */
type OwnerOwnershipEntry = {
  owner: AppKey | 'all' | 'shared';
  writers?: never;
  readers: ReadonlyArray<AppKey>;
  $comment?: string;
};

/**
 * Multi-writer entry (PHASE-3c, @bsuite/dry-lint@0.2.0) — explicit allow-list of
 * apps that may write to a co-owned table. Mutually exclusive with `owner`. Use
 * for admin-CRUD co-ownership cases (e.g. tenants + user_tenants where BSU is
 * the platform-level owner and CRM7's tenant-management edge function performs
 * legitimate tenant admin operations on its own org hierarchy).
 *
 * `writers: []` is invalid — see {@link assertOwnershipEntryValid}.
 */
type WritersOwnershipEntry = {
  owner?: never;
  writers: ReadonlyArray<AppKey>;
  readers: ReadonlyArray<AppKey>;
  $comment?: string;
};

type OwnershipEntry = OwnerOwnershipEntry | WritersOwnershipEntry;

type OwnershipMap = {
  $schema?: string;
  $comment?: string;
  tables: Record<string, OwnershipEntry>;
};

/**
 * Validate an ownership-map entry at module load. Throws on malformed entries
 * so we fail fast at lint startup rather than silently letting invalid map
 * shapes through. Enforces:
 *  - `owner` and `writers` are mutually exclusive (PHASE-3c rule schema).
 *  - At least one of `owner` / `writers` must be present.
 *  - `writers` (when present) must be a non-empty array.
 *
 * Exported for unit-test access — the same validator runs at module load on
 * the bundled `ownership-map.json`.
 */
export function assertOwnershipEntryValid(table: string, entry: OwnershipEntry): void {
  const hasOwner = 'owner' in entry && entry.owner != null;
  const hasWriters = 'writers' in entry && entry.writers != null;

  if (hasOwner && hasWriters) {
    throw new Error(
      `[bsuite/no-cross-app-write] Ownership-map entry for "${table}" has BOTH ` +
        `"owner" and "writers" set. These are mutually exclusive — use one or the other.`,
    );
  }

  if (!hasOwner && !hasWriters) {
    throw new Error(
      `[bsuite/no-cross-app-write] Ownership-map entry for "${table}" must have ` +
        `either "owner" or "writers" set.`,
    );
  }

  if (hasWriters && (!Array.isArray(entry.writers) || entry.writers.length === 0)) {
    throw new Error(
      `[bsuite/no-cross-app-write] Ownership-map entry for "${table}" has empty ` +
        `"writers" list. Use "owner" for single-writer entries, or list at least ` +
        `one writer app.`,
    );
  }
}

const TABLES: Record<string, OwnershipEntry> = (ownershipMap as OwnershipMap).tables;

// Validate every entry at module load — fail fast on schema violations.
for (const [tableName, entry] of Object.entries(TABLES)) {
  assertOwnershipEntryValid(tableName, entry);
}

/**
 * Set of method names on the Supabase query builder that constitute a WRITE.
 * `select` is intentionally excluded — reads are always allowed.
 */
const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

const createRule = ESLintUtils.RuleCreator<{ recommended: boolean }>(
  (name) =>
    `https://github.com/GaryOcean428/bsuite/blob/main/packages/dry-lint/README.md#${name}`,
);

type MessageIds = 'crossAppWrite' | 'crossAppWriteMultiWriter' | 'unknownTable';

type RuleOptions = [
  {
    /**
     * Per-file override for the detected app. Useful when the file system
     * layout doesn't carry the canonical app name (e.g. monorepo packages).
     * If unset the rule infers the app from the file path.
     */
    appOverride?: AppKey;
    /**
     * If true, also report writes to tables that are not in the ownership map.
     * Defaults to false because new tables shouldn't break CI before they
     * land in the map; they are surfaced as warnings via the dry-run report.
     */
    warnOnUnknownTable?: boolean;
  },
];

/**
 * Resolve the static string value of an argument node, if it has one.
 * Supports plain string literals and template literals with no expressions.
 */
function resolveStaticString(node: TSESTree.Node | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  if (
    node.type === AST_NODE_TYPES.TemplateLiteral &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    const cooked = node.quasis[0]?.value.cooked;
    return cooked == null ? undefined : cooked;
  }
  return undefined;
}

/**
 * Walk the callee chain from a `.{insert|update|upsert|delete}(...)` callsite
 * back through any number of intermediate query-builder methods (`.eq`, `.select`,
 * `.match`, etc.) to find the nearest `.from('<table>')` call. Returns the
 * resolved table name or `undefined` if the chain doesn't contain a usable
 * `.from(...)` invocation.
 *
 * We ascend the AST via the `object` of the MemberExpression rather than
 * descending so that the search is bounded to the same query-builder chain,
 * not the entire enclosing expression.
 */
function findFromTable(
  initial: TSESTree.MemberExpression,
): { tableName: string; fromCall: TSESTree.CallExpression } | undefined {
  let current: TSESTree.Node | undefined = initial.object;
  while (current) {
    if (current.type === AST_NODE_TYPES.CallExpression) {
      const callee: TSESTree.Node = current.callee;
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        !callee.computed &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        callee.property.name === 'from' &&
        current.arguments.length >= 1
      ) {
        const tableName = resolveStaticString(current.arguments[0]);
        if (tableName) {
          return { tableName, fromCall: current };
        }
        return undefined;
      }
      // Not a `.from()` call — descend into the callee's object to keep walking
      // back along the chain.
      if (callee.type === AST_NODE_TYPES.MemberExpression) {
        current = callee.object;
        continue;
      }
      return undefined;
    }
    if (current.type === AST_NODE_TYPES.MemberExpression) {
      current = current.object;
      continue;
    }
    if (current.type === AST_NODE_TYPES.AwaitExpression) {
      current = current.argument;
      continue;
    }
    return undefined;
  }
  return undefined;
}

export const noCrossAppWriteRule = createRule<RuleOptions, MessageIds>({
  name: 'no-cross-app-write',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Supabase write calls (insert/update/upsert/delete) on tables not owned by the current app per the BSuite one-shot ownership map.',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          appOverride: {
            type: 'string',
            enum: ['bsu', 'crm7', 'conduit', 'braden', 'r80', 'throughput', 'shared'],
          },
          warnOnUnknownTable: { type: 'boolean' },
        },
      },
    ],
    messages: {
      crossAppWrite:
        '[bsuite/no-cross-app-write] {{app}} cannot {{method}} into "{{table}}" — owned by {{owner}}. ' +
        'Either move the write to {{owner}} (one-shot pattern) or update src/ownership-map.json with justification.',
      crossAppWriteMultiWriter:
        '[bsuite/no-cross-app-write] {{app}} cannot {{method}} into "{{table}}" — writers are [{{writers}}]. ' +
        'Either move the write to one of those apps or add {{app}} to the writers list in src/ownership-map.json with justification.',
      unknownTable:
        '[bsuite/no-cross-app-write] Unknown table "{{table}}" written from {{app}} via .{{method}}(). ' +
        'Add it to packages/dry-lint/src/ownership-map.json with the canonical owner.',
    },
  },
  defaultOptions: [{ warnOnUnknownTable: false }],
  create(context, [options]) {
    const appOverride = options?.appOverride;
    const warnOnUnknownTable = options?.warnOnUnknownTable ?? false;
    // Prefer the physical disk path so app detection works even when the
    // virtual filename has been processed (e.g. by a code-block parser).
    const filename =
      context.physicalFilename ?? context.filename ?? context.getFilename();
    const detectedApp = appOverride ?? detectAppFromPath(filename);

    // If we can't tell which app this file belongs to, the rule cannot make a
    // safe judgment. No-op rather than spam false positives across shared code.
    if (!detectedApp) {
      return {};
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.property.type !== AST_NODE_TYPES.Identifier
        ) {
          return;
        }
        const methodName = callee.property.name;
        if (!WRITE_METHODS.has(methodName)) {
          return;
        }

        const resolved = findFromTable(callee);
        if (!resolved) {
          // The write call isn't anchored to a `.from('<literal>')` chain we
          // can statically resolve. Skip — manual review required.
          return;
        }

        const { tableName } = resolved;
        const entry = TABLES[tableName];

        if (!entry) {
          if (warnOnUnknownTable) {
            context.report({
              node,
              messageId: 'unknownTable',
              data: { table: tableName, app: detectedApp, method: methodName },
            });
          }
          return;
        }

        // Multi-writer entry (PHASE-3c): pass when detected app is in writers,
        // flag otherwise.
        if ('writers' in entry && entry.writers != null) {
          if (entry.writers.includes(detectedApp as AppKey)) {
            return;
          }
          context.report({
            node,
            messageId: 'crossAppWriteMultiWriter',
            data: {
              app: detectedApp,
              method: methodName,
              table: tableName,
              writers: entry.writers.join(', '),
            },
          });
          return;
        }

        const { owner } = entry;
        if (owner === 'all' || owner === 'shared') {
          // Event sinks + audit-trail tables explicitly accept writes from any
          // app.
          return;
        }

        if (owner === detectedApp) {
          // Owner writing to its own table — allowed.
          return;
        }

        context.report({
          node,
          messageId: 'crossAppWrite',
          data: {
            app: detectedApp,
            method: methodName,
            table: tableName,
            owner,
          },
        });
      },
    };
  },
});

export const NO_CROSS_APP_WRITE_RULE_NAME = 'no-cross-app-write';
