# Full-7 Execution Ledger

Status: W
Date: 2026-04-27
Source plan: [docs/plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md](plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md)

This ledger turns the Windsurf full-7 plan into repo-local execution status. It is intentionally conservative: items are only marked complete when the code, docs, and verification evidence exist in this workspace.

## Current Verdict

The full plan is not complete.

The OAuth preview-login blocker is code-side complete for CRM7 and Conduit, the source plan has been copied into `docs/plans/` and indexed, and the first shared branding package slice has landed in `@bsuite/theme`. The broader page-builder package extraction, schema-registry source restoration, relationship/location work, consumer logo migration, runtime smoke, reconciliation, and ship-cycle phases remain open or blocked.

## Blocking Constraint

Phase 0 reconciliation remains blocked by live workstream divergence. The current evidence note says not to reconcile, merge, reset, delete branches, or update parent submodule pointers until the active integration work finishes.

Evidence:

- [docs/20260427-phase0-reconciliation-evidence-v1.00W.md](20260427-phase0-reconciliation-evidence-v1.00W.md)

## Phase Status

| Phase | Status | Evidence | Next action |
|---|---|---|---|
| Phase 0 - Reconcile before work | BLOCKED | Phase 0 evidence captures branch/submodule drift and says "Do not reconcile yet." | Re-run branch/submodule snapshot only after operator confirms active workstreams are finished. |
| Phase 1 - Audit roadmaps/plans/sessions | IN-PROGRESS | This ledger plus repo-local plan index. | Continue classifying roadmap/gap/session items into this ledger before archive or implementation moves. |
| Phase 2 - Shared package architecture | IN-PROGRESS/BLOCKED | `@bsuite/theme` and `@bsuite/dry-lint` sources exist; `@bsuite/page-builder` source does not exist; `@bsuite/schema-registry` is consumed but its local package source is absent. | Repair package source-of-truth gaps before broad consumer migration. |
| Phase 2A - OAuth preview login | CODE-SIDE COMPLETE | [docs/20260427-oauth-preview-login-evidence-v1.00W.md](20260427-oauth-preview-login-evidence-v1.00W.md) | Run authenticated browser smoke tests after preview deployments settle. |
| Phase 3 - Universal canvas + in-place add | NOT-STARTED PACKAGE EXTRACTION | `PageGridLayout.tsx` and `usePageGridLayout.ts` remain duplicated in app repos. | Create/publish `@bsuite/page-builder`, then migrate consumers by npm version. |
| Phase 4 - Relationship and location UX | NOT-STARTED | Existing graph UI and relationship tables exist, but natural-language modeling, inverse generation, presets, cycle/duplicate checks, and first-class location ownership are not implemented as a completed workstream. | Design migrations and CRM7-owned CRUD/read-deep-link flow after schema-registry source is restored. |
| Phase 5 - Platform logos and white label | IN-PROGRESS | Branding migrations, BSU branding pages, runtime providers, and published `@bsuite/theme@0.3.3` `resolvePlatformLogo()`/`usePlatformLogo()` now exist. | Migrate consumers away from local logo fallback logic when target branches are safe to edit. |
| Phase 6 - Red-team and verification gates | PARTIAL | Automated Conduit and BSU auth verification passed. Full browser/runtime matrix remains outstanding. | Run preview auth smoke and visual/responsive checks for each affected app. |
| Phase 7 - Documentation and sign-off | IN-PROGRESS | Plan copied into repo and indexed; this ledger records current status. | Keep ledger updated and produce final sign-off only after runtime and architecture gates pass. |
| Phase 8 - Ship cycle discipline | NOT-STARTED/BLOCKED | Phase 0 says ship/reconcile actions are unsafe while live workstreams continue. | Resume only after branch/submodule reconciliation is unblocked. |

## Source-Of-Truth Findings

| Area | Current state | Risk |
|---|---|---|
| `@bsuite/page-builder` | No local package source found under `packages/`; app-local `PageGridLayout.tsx` and `usePageGridLayout.ts` copies remain in BSU, CRM7, Conduit, and R80.3. | Duplicated canvas behavior will keep drifting across apps. |
| `@bsuite/schema-registry` | Consumer imports and package references exist, but local source is not present under `packages/`. | Relationship/location metadata cannot be safely extended from source until the package source is restored or located. |
| `@bsuite/theme` | Local source exists at `packages/theme`; runtime `BrandingProvider`, `useBranding()`, `resolvePlatformLogo()`, and `usePlatformLogo()` exist and `@bsuite/theme@0.3.3` is published to npm. | Logo selection remains partly app-local until consumers migrate to the shared hook. |
| `@bsuite/dry-lint` | Local source exists and supports the `writers` ownership schema. | Ownership map still needs to be kept aligned with new location/branding/page-builder ownership decisions. |
| OAuth clients | BSU guardrails and Conduit routing now treat Conduit as its own distinct OAuth client, not a duplicated registration. | Runtime preview smoke still required before final sign-off. |

## Code-Side Work Completed This Session

- Copied `/home/braden/.windsurf/plans/bsuite-audit-page-builder-branding-relationships-66c734.md` into [docs/plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md](plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md).
- Indexed the plan in [docs/plans/README.md](plans/README.md) and [docs/README.md](README.md).
- Closed the Conduit direct-BSU-login drift by routing sign-in entry points through Conduit's local `/auth/login` initiator for its distinct `@bsuite/auth` OAuth client.
- Updated BSU OAuth guardrails so Conduit is represented as the fifth distinct OAuth client.
- Updated auth docs to remove stale "Conduit does not participate in BS OAuth" guidance.
- Added OAuth evidence and verification details in [docs/20260427-oauth-preview-login-evidence-v1.00W.md](20260427-oauth-preview-login-evidence-v1.00W.md).
- Added `@bsuite/theme` shared platform-logo resolution through `resolvePlatformLogo()` and `usePlatformLogo()`, with support for light, dark, mark, favicon, and slot-specific fallbacks.
- Published `@bsuite/theme@0.3.3` to npm with the compiled logo resolver/hook included in the package tarball.

## Automated Verification Completed

| Project | Command | Result |
|---|---|---|
| Conduit | `pnpm typecheck` | PASS |
| Conduit | `pnpm lint` | PASS; package-type warning only |
| Conduit | `pnpm exec vitest run src/lib/supabase/__tests__/middleware.test.ts src/test/wcag-static.test.ts` | PASS |
| Conduit | `pnpm build` | PASS; Next workspace-root and localstorage warnings only |
| BSU | `pnpm typecheck` | PASS |
| BSU | `pnpm lint` | PASS with pre-existing unrelated warnings; no errors |
| BSU | `pnpm exec vitest run src/pages/oauth/OAuthConsent.test.tsx` | PASS |
| BSU | `pnpm build:noprerender` | PASS |
| Parent | `git diff --check` | PASS |
| `@bsuite/theme` | `pnpm typecheck` | PASS |
| `@bsuite/theme` | `pnpm test` | PASS - 1 file, 4 tests |
| `@bsuite/theme` | `pnpm build` | PASS |
| `@bsuite/theme` | `npm pack --dry-run --json` | PASS - `dist/react/usePlatformLogo.*` included |
| `@bsuite/theme` | `npm publish --access public` | PASS - published `@bsuite/theme@0.3.3` |
| `@bsuite/theme` | `npm view @bsuite/theme@0.3.3 version dist.shasum dist.integrity --json` | PASS - registry shows `0.3.3`, shasum `21106a0fe331ab1dd49632b8d96e35f29c8ee1f0` |

## Remaining Runtime Verification

Authenticated browser smoke tests still need to prove that login from each registered preview origin returns to that same origin:

- CRM7 development and active review aliases.
- Conduit release alias.
- R80.3 development alias.
- Throughput development alias.
- Braden development alias.

## Next Safe Implementation Slice

The next non-reconcile implementation slice is consumer migration planning:

1. Update consumer package versions without using `workspace:*` or `file:` dependencies.
2. Migrate BSU/CRM7/Conduit/R80.3/Throughput logo rendering to `usePlatformLogo()` where branches are safe to edit.
3. Keep reconciliation and parent submodule pointer work blocked until the Phase 0 constraint is lifted.
