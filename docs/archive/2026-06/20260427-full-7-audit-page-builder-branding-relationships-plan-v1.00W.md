# BSuite Full-7 Audit, Reconcile, and UX Upgrade Plan

This plan reconciles the BSuite workspace first, audits all seven repositories and roadmap artifacts, then implements the canvas, schema-builder, logo, branding, and relationship UX upgrades through shared packages and owning apps with evidence-gated verification.

Execution status is tracked in [docs/20260427-full-7-execution-ledger-v1.00W.md](../20260427-full-7-execution-ledger-v1.00W.md). The ledger is the current truth for completed, blocked, and next-safe slices.

## Scope

- **Repositories:** `business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, `throughput`, and the seventh edge/deferred repo referenced by the audit set, including Biped if it appears in current roadmap/session evidence.
- **Working branch rule:** use each repo's `development` branch for work; reconcile against `main` before implementation.
- **Shipping branch rule:** `main` remains the production/default branch; `development` is the local/shared integration branch for new work and must be re-created if auto-deleted after merge.
- **Ship-all-apps rule:** use the `ship-all-apps` workflow through preview build, PR, bot feedback, and verification, but stop short of final merge to `main` until manual visual/functional verification is complete.
- **Package rule:** shared runtime concerns live in published `@bsuite/*` packages using npm versions, never `workspace:*` or `file:` in consumers.
- **No-defer rule:** discovered implementation defects are fixed in the same approved workstream unless they are operator-only external actions.

## Phase 0 — Reconcile Before Work

- **Inventory repo state:** record branch, upstream, dirty files, submodule pointers, unpushed commits, and dev/main divergence for all seven repos.
- **Protect current work:** separate user changes from agent changes; do not discard dirty files.
- **Resolve parent/submodule drift:** follow the documented dev/main reconciliation path before code work, with CRM7 and parent repo treated as highest risk.
- **Default/development alignment:** before new work, confirm `development` starts aligned with `main`; after production merge, re-create/reactivate `development` if GitHub auto-deletes it, bump parent submodule refs, and confirm `development` and `main` are aligned before the next cycle.
- **Evidence output:** reconciliation note with branch SHAs, working-tree status, and any conflict decisions.

## Phase 1 — Audit Roadmaps, Plans, and Prior Sessions

- **Collect sources:** scan repo `docs/`, `.windsurf/plans`, Claude/session prompts, roadmap/gap/outstanding docs, `AGENTS.md`, `CLAUDE.md`, and package READMEs.
- **Classify each item:** `SHIPPED`, `IN-PROGRESS`, `NOT-STARTED`, `SUPERSEDED`, or `DEAD`.
- **Attach evidence:** commits/PRs/deploys/tests for shipped items; current file paths for in-progress items; owner and target repo for not-started items.
- **Consolidate backlog:** move actionable items into one full-7 backlog table; archive superseded/dead docs according to documentation rules.

## Phase 2 — Shared Package Architecture

- **Page builder:** consolidate universal canvas primitives into `@bsuite/page-builder` rather than continuing duplicated `PageGridLayout.tsx` and `usePageGridLayout.ts` copies.
- **Schema registry:** reconcile local `packages/schema-registry` against npm `@bsuite/schema-registry@^0.2.1` before adding relationship/location metadata.
- **Theme:** extend `@bsuite/theme` for `usePlatformLogo()` and runtime branding consumption, preserving OKLCH tokens and D2C vs Braden brand separation.
- **Dry lint:** update `@bsuite/dry-lint` ownership metadata so entity CRUD remains single-owner and cross-app surfaces deep-link instead of duplicate.

## Phase 2A — OAuth Preview Login Blocker

- **Problem:** branch/preview deploys cannot be fully inspected when BS OAuth login returns users to production after authorization.
- **Known current state:** BSU login has sanitized `return_origin` support for preview origins, but the BS OAuth 2.1 PKCE flow uses exact-match `redirect_uri` values from each OAuth client.
- **Safe baseline solution:** establish stable Vercel branch aliases for `development` per app and register exact OAuth callback URIs for those aliases in `auth.oauth_clients`.
- **Client behavior:** update shared `@bsuite/auth` PKCE client and each consumer callback only if needed so `redirect_uri` remains the current origin callback for registered production/development origins.
- **Feature-branch previews:** if arbitrary feature-branch preview login is required, implement a preview-auth broker callback with signed state and strict app/origin allowlisting rather than reintroducing wildcard redirect URIs.
- **Security constraints:** no wildcard OAuth redirect URIs, no arbitrary `return_to`, JWKS verification stays mandatory, PKCE state/nonce validation stays mandatory, and preview origins must be anchored to approved Vercel project/team hostnames.
- **Verification:** prove login from production and development preview deployments returns to the same origin, then visually inspect branch deploys before any merge to `main`.

## Phase 3 — Universal Canvas + In-Place Add UX

- **Responsive columns:** store layouts by breakpoint using `ResponsiveGridLayout`-style `layouts`, `breakpoints`, and `cols`; scale or generate missing layouts deterministically.
- **Resize UX:** implement visible resize handles, pointer/touch support, keyboard-accessible resizing, accessible instructions, and persisted layout updates.
- **In-place add:** add inline creation for fields/components/pages with optimistic save, validation, permission gating, and rollback on failure.
- **Consumer rollout:** wire BSU, CRM7, Conduit, R80.3, and relevant Throughput/Biped surfaces through package imports after package publish/version bump.

## Phase 4 — Relationship and Location UX

- **Natural-language modeler:** replace relationship jargon with directional copy such as “A company has many contacts” and “A contact belongs to one company.”
- **Presets and inverse generation:** seed common relationship presets, auto-create inverse relationships, and validate cardinality.
- **Safety:** add cycle detection, duplicate relationship prevention, search, and graph view using the existing `@xyflow/react` dependency where appropriate.
- **Locations:** model locations as first-class entities with M:M junctions and compliance fields; migrate embedded addresses to records.
- **Ownership:** CRM7 owns location CRUD; other apps read and deep-link per DRY one-shot architecture.

## Phase 5 — Platform Logos and Enterprise White Labeling

- **Platform logos:** BSU dev portal owns light/dark logo uploads, validation, preview, storage/CDN cache busting, versioning, rollback, and realtime update notification.
- **Runtime consumption:** `@bsuite/theme` exposes `usePlatformLogo()` and SSR-safe fallbacks for consumers.
- **Enterprise branding:** implement/verify tenant branding inheritance across `platform_branding`, `tenant_branding`, and `tenant_app_branding`.
- **Guardrails:** enforce locked tokens, OKLCH inputs, WCAG AA checks, colorblind checks, and sanitized custom CSS before persistence.
- **Brand separation:** D2C Neon Electric remains default for BSuite apps; Braden Corporate remains isolated.

## Phase 6 — Red-Team and Verification Gates

Each workstream must pass four evidence gates before being called complete:

- **Code evidence:** diff summary, package version changes, migrations, and owning files.
- **Automated evidence:** relevant `pnpm typecheck`, `pnpm lint`, `pnpm test`, targeted unit/component tests, and build output.
- **Runtime evidence:** authenticated preview smoke tests, browser smoke tests, accessibility checks, responsive screenshots, and console/network error review.
- **Architecture evidence:** DRY ownership validation, RLS/storage policy review, package-consumer version audit, and docs updated.

## Phase 7 — Documentation and Sign-Off

- **Audit ledger:** create/update a full-7 audit document with every item classified and evidence-linked.
- **Architecture docs:** update ownership matrix, package docs, theme docs, schema-builder docs, and operator handoff docs.
- **Operator-only list:** isolate only external-dashboard or credential actions, with exact paths and evidence that code-side work is complete.
- **Final sign-off:** produce one sign-off document containing scope, verification outputs, commit SHAs, deployment notes, and remaining operator actions.

## Phase 8 — Ship Cycle Discipline

- **Pre-merge:** run `ship-all-apps` through orphan sweep, commit/push, preview build monitoring, PR creation, bot feedback, and all verification gates.
- **Hold point:** stop before final `main` merge until authenticated preview deploys have been visually and functionally inspected.
- **Production merge:** merge app PRs first, then parent submodule pointer PR; monitor production deploys and runtime logs.
- **Post-merge reset:** if `development` was deleted, recreate it from `main`; push it; update/bump parent submodule refs; confirm `development == main` before starting the next development phase.

## Research Gates Before Implementation

- **React Grid Layout:** confirm responsive layout persistence and breakpoint generation against current docs.
- **dnd-kit:** confirm keyboard sensor and screen-reader guidance for drag/resize controls.
- **Tailwind CSS v4:** confirm CSS-variable and OKLCH runtime theming strategy.
- **Supabase:** confirm RLS, storage upload, Edge Function, and realtime notification patterns before schema/storage changes.
- **Supabase OAuth 2.1:** confirm exact-match OAuth app redirect URI behavior, OAuth client registration shape, PKCE state/nonce handling, and JWKS token validation before preview-login changes.
- **Next.js 16:** initialize Next DevTools before modifying Conduit and use runtime MCP diagnostics for route/app verification.

## Initial Implementation Order After Approval

1. Reconcile branches/submodules and write the reconciliation evidence note.
2. Fix or formally unblock OAuth preview login so branch deploys can be inspected before production merge.
3. Complete the full-7 audit ledger and classify all roadmap/session/doc items.
4. Repair shared package source-of-truth gaps, starting with `@bsuite/schema-registry` and `@bsuite/page-builder`.
5. Implement canvas responsiveness, resize accessibility, and in-place add flows.
6. Implement relationship/location UX and migrations.
7. Implement platform logo and enterprise white-label runtime support.
8. Run the four-evidence gate, update docs, and prepare final sign-off.

## Primary Risks

- **Branch divergence:** CRM7 and parent repo reconciliation may change implementation order.
- **Preview auth blocker:** OAuth redirect URI exact-match behavior can prevent authenticated branch inspection unless development preview callbacks are registered and verified.
- **Package deployment:** consumers deploy independently, so npm package publishing and lockfile updates must be coordinated.
- **RLS/storage safety:** branding and location migrations must be fail-closed with authenticated tenant-scoped policies.
- **Visual regressions:** canvas and branding changes require multi-breakpoint smoke testing across all active apps.
- **Scope creep:** Biped/edge repo findings must be classified in the audit, but code changes still follow ownership and evidence rules.
