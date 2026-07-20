/**
 * bsuite/no-grid-dot-doctrine-violation
 *
 * Enforces the grid/dot background doctrine (W3 §3.3,
 * packages/theme/docs/TOKEN-MAPPING.md §8):
 *
 *   GRID — public/pre-auth marketing surfaces ONLY (localised hero band).
 *          Canonical primitive: <HeroGrid> (@bsuite/ui).
 *   DOT  — authenticated app shells ONLY (full-page, behind all cards).
 *          Canonical primitive: <DotPattern> (@bsuite/ui).
 *
 * GRID and DOT are mutually exclusive per context. This rule flags three
 * distinct violations:
 *
 *   (a) gridInAuthedShell   — <HeroGrid> rendered from a file path that
 *       looks like an authenticated app shell (dashboard/portal/shell).
 *   (b) dotOnPublicHero     — <DotPattern> rendered from a file path that
 *       looks like a public marketing/landing surface.
 *   (c) handRolledPattern   — a hand-rolled CSS background-image literal
 *       reproducing the grid-line or dot-tile signature instead of using
 *       the shared primitive. Exempted for the primitives' own source
 *       files (dot-pattern.tsx, hero-grid.tsx) and the theme package's
 *       own CSS (which legitimately defines the canonical pattern once).
 *
 * Detection is path-heuristic for (a)/(b) — conservative substring
 * markers, same style as the rest of this package (see
 * oauth-callback-must-bridge.ts's `isTestOrPackageSource`). False
 * negatives (an unusual path this rule doesn't recognise) are preferred
 * over false positives for an opt-in doctrine lint.
 */

import { ESLintUtils, AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

const RULE_NAME = 'no-grid-dot-doctrine-violation';

const createRule = ESLintUtils.RuleCreator<{ recommended: boolean }>(
  (name) => `https://github.com/GaryOcean428/bsuite/blob/main/packages/dry-lint#${name}`,
);

type MessageIds = 'gridInAuthedShell' | 'dotOnPublicHero' | 'handRolledPattern';

/** Path/name markers for authenticated app shells (post-login surfaces). */
const AUTHED_PATH_MARKERS: readonly string[] = [
  '/dashboard/', '/portal/', '/shell/', '/(authed)/', '/(app)/',
  'AppShell', 'DashboardShell', 'DashboardLayout', 'PortalLayout',
];

/** Path/name markers for public/pre-auth marketing surfaces. */
const PUBLIC_PATH_MARKERS: readonly string[] = [
  '/marketing/', '/landing/', '/(public)/', '/(marketing)/',
  'Landing.tsx', 'Marketing.tsx', 'PublicHero', 'LandingHero', 'LandingPage',
];

/** Files exempt from the hand-rolled-pattern check: the primitives'
 *  own source, and the theme package's own CSS-defining source. */
const PATTERN_SOURCE_EXEMPT_FRAGMENTS: readonly string[] = [
  'dot-pattern.tsx',
  'hero-grid.tsx',
  'packages/theme/src/',
];

// Signature substrings of the two canonical hand-rolled patterns. Kept as
// plain literals (no regex) — .includes() is sufficient and unambiguous.
//
// These signatures alone are too broad: `radial-gradient(circle` also
// matches ordinary ambient glow blobs (e.g.
// `radial-gradient(circle at top, var(--app-primary-glow), transparent 58%)`)
// and `linear-gradient(90deg,` also matches ordinary shimmer/skeleton
// gradients. Both canonical primitives — `.bsuite-hero-grid`
// (packages/theme/src/css/utilities.css) and the dot tile it mirrors —
// define their repeating tile with the exact `1px, transparent 1px`
// co-occurrence (a hard-edged 1px line/dot followed by a transparent 1px
// gap, which is what makes the background tile instead of blend). A glow
// or shimmer gradient never needs that co-occurrence, so requiring it
// alongside the signature keeps the rule scoped to actual grid/dot tiling
// while still catching hand-rolled reproductions of the doctrine pattern.
const DOT_CSS_SIGNATURE = 'radial-gradient(circle';
const GRID_CSS_SIGNATURE = 'linear-gradient(90deg,';
const TILE_FINGERPRINT = '1px, transparent 1px';

function isAuthedShellPath(filePath: string): boolean {
  return AUTHED_PATH_MARKERS.some((marker) => filePath.includes(marker));
}

function isPublicHeroPath(filePath: string): boolean {
  return PUBLIC_PATH_MARKERS.some((marker) => filePath.includes(marker));
}

function isPatternSourceExempt(filePath: string): boolean {
  return PATTERN_SOURCE_EXEMPT_FRAGMENTS.some((fragment) => filePath.includes(fragment));
}

function readJsxTagName(node: TSESTree.JSXOpeningElement): string | null {
  const nameNode = node.name;
  if (nameNode.type === AST_NODE_TYPES.JSXIdentifier) return nameNode.name;
  return null;
}

/** Extract a string value from a Literal or a single-quasi TemplateLiteral
 *  (covers both `background: '...'` and `` background: `...` `` forms). */
function readStaticStringValue(node: TSESTree.Expression): string | null {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join('');
  }
  return null;
}

/** True when a Property node's key reads as a CSS background-image field,
 *  in either camelCase (style objects) or kebab-case (string) form. */
function isBackgroundImageKey(node: TSESTree.Property): boolean {
  const key = node.key;
  if (key.type === AST_NODE_TYPES.Identifier) {
    return key.name === 'backgroundImage' || key.name === 'background';
  }
  if (key.type === AST_NODE_TYPES.Literal && typeof key.value === 'string') {
    return key.value === 'background-image' || key.value === 'background';
  }
  return false;
}

export const noGridDotDoctrineViolationRule = createRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce the grid/dot background doctrine: GRID is public/pre-auth marketing hero bands only (<HeroGrid>), DOT is authenticated app shells only (<DotPattern>). Flags cross-context usage and hand-rolled duplicates of either pattern.',
      recommended: true,
    },
    schema: [],
    messages: {
      gridInAuthedShell:
        '<HeroGrid> is the public/pre-auth marketing primitive (grid/dot doctrine, W3 §3.3) but this file path looks like an authenticated app shell. Use <DotPattern> instead — DOT is the authenticated-surface background.',
      dotOnPublicHero:
        '<DotPattern> is the authenticated-shell primitive (grid/dot doctrine, W3 §3.3) but this file path looks like a public marketing/landing surface. Use <HeroGrid> instead — GRID is the pre-auth hero-band background.',
      handRolledPattern:
        'Hand-rolled grid/dot background CSS detected. Use the shared <HeroGrid> or <DotPattern> primitive from @bsuite/ui instead of reproducing the pattern inline — see packages/theme/docs/TOKEN-MAPPING.md §8.',
    },
  },
  defaultOptions: [],
  create(context) {
    const filePath = context.filename;

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const tag = readJsxTagName(node);
        if (!tag) return;

        if (tag === 'HeroGrid' && isAuthedShellPath(filePath)) {
          context.report({ node, messageId: 'gridInAuthedShell' });
        }
        if (tag === 'DotPattern' && isPublicHeroPath(filePath)) {
          context.report({ node, messageId: 'dotOnPublicHero' });
        }
      },

      Property(node: TSESTree.Property) {
        if (isPatternSourceExempt(filePath)) return;
        if (!isBackgroundImageKey(node)) return;
        if (node.value.type !== AST_NODE_TYPES.Literal
            && node.value.type !== AST_NODE_TYPES.TemplateLiteral) {
          return;
        }
        const value = readStaticStringValue(node.value);
        if (!value) return;
        const hasDoctrineSignature =
          value.includes(DOT_CSS_SIGNATURE) || value.includes(GRID_CSS_SIGNATURE);
        if (hasDoctrineSignature && value.includes(TILE_FINGERPRINT)) {
          context.report({ node, messageId: 'handRolledPattern' });
        }
      },
    };
  },
});

export const NO_GRID_DOT_DOCTRINE_VIOLATION_RULE_NAME = RULE_NAME;
