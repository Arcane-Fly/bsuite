# AGENTS.md changelog archive (pre-2026-07-31)

Historical "Recent Changes" blocks removed from `AGENTS.md` during the 2026-07-31 slim-down. Retained verbatim; they record what was true on the dates shown.

## Recent Changes (2026-05-05)

- **Bsuite-wide dependency refresh — every package bumped to its latest compatible version.** All 13 `package.json` files (6 apps + 7 shared packages) regenerated via `pnpm dlx npm-check-updates -u` + isolated-directory lockfile regeneration pattern (importer `.:`, zero `../` paths — Vercel-compatible). Major bumps: TypeScript 5→6, Sentry 9→10 across `@sentry/react` + `@sentry/nextjs` + `@sentry/vite-plugin`, `@platejs` 52→53 (crm7), Vite 6→8 (shared packages), `@vitejs/plugin-react` 5→6, ESLint 9→10 (throughput only). Throughput's backlog also cleared: React Router 6→7, Stripe 14→22, `@stripe/stripe-js` 2→9, LangChain 0.3→1.3, OpenAI 4→6, `@testing-library/react` 14→16, `jsdom` 24→29, `immer` 10→11, `tailwind-merge` 2→3, `dotenv` 16→17. TS 6 `baseUrl` deprecation (TS5101) fixed in 5 tsconfig files across crm7, braden, R80.3 by removing the redundant `baseUrl: "."` under `moduleResolution: "bundler"` (BSU, conduit, throughput already correct). Verification: all 6 apps + 7 shared packages pass `pnpm typecheck`, `pnpm test` (1683 tests total), and `pnpm build`. Shared-package patch bumps published: `@bsuite/auth` 0.1.1, `@bsuite/charge-calc` 0.2.4, `@bsuite/nav-core` 0.5.2, `@bsuite/page-builder` 0.2.2, `@bsuite/schema-builder` 0.7.1, `@bsuite/schema-registry` 0.3.3, `@bsuite/data-export` 0.1.4 — all dev-toolchain-only, no public API changes. Consumer specifier bumps (apps → new shared-package versions) intentionally deferred to a follow-up PR after CI republishes to npm. Two late build fixes: `packages/auth/tsconfig.build.json` gained `rootDir: "./src"` + `exclude` for test files (TS 6 stricter), and `packages/page-builder/src/globals.d.ts` added `declare module '*.css'` for TS 6's tighter ambient-module inference on side-effect CSS imports. No runtime code changes — verified Sentry code already uses v10 functional API (`browserTracingIntegration()`, `replayIntegration()`) and no `langchain/` legacy imports remain. Stripe edge functions pin `stripe@14.14.0` via esm.sh independently of npm and are unaffected.

## Recent Changes (2025-02-27)

**Anti-regression check.** Before opening any auth-related PR, run from the bsuite root:

```bash
rg 'business_suite_auth|cookieStorage|forceRemoveAuthCookies|subscribeToRefresh' \
  -g '*.ts' -g '*.tsx' -g '!node_modules' -g '!packages/nav-core/**'
```

Results should be limited to deprecation comments + `tabCoordinator.ts` historical note. Any hit in a Supabase client, AuthContext, or auth callback file is a regression — reject the PR and link the author to `AUTH_CANONICAL.md`.

- **Auth migration: cookie SSO removed across all apps.** All 5 client apps (BSU, CRM7, R80.3, Throughput, Conduit) previously used a shared `business_suite_auth` cookie on `domain=.crm7.app` for cross-subdomain Supabase session sharing. This was a redundant layer on top of BS OAuth 2.1 PKCE (which handles cross-app SSO correctly via OIDC silent re-auth + JWKS verification). The cookie pattern caused: (a) repeated AI-agent regressions trying to enforce a misleading mandate, (b) preference_key collisions between apps reading the same cookie, (c) tokens leaked across all `.crm7.app` subdomains regardless of consent, (d) didn't work for Braden's different TLD. **Removed**: `cookieStorage`, `domain=.crm7.app`, `storageKey: 'business_suite_auth'`, manual cookie chunking (`key.0` / `key.1`), `forceRemoveAuthCookies`. **Added**: explicit forbidden-pattern list + 'do not revert' guardrail in this AGENTS.md and new [`AUTH_CANONICAL.md`](./AUTH_CANONICAL.md) SSoT. Cross-app SSO continues via BS OAuth 2.1 PKCE only (the Braden pattern, now universal). Banners added to every per-app `AGENTS.md`/`CLAUDE.md`/`.windsurfrules`.

## Recent Changes (2026-04-14)

- **All projects — White-label Three-Tier Hierarchy**: New `useBranding()` hook in crm7 + BSU resolves `tenant_app_branding` → `tenant_branding` → `platform_branding` → hardcoded D2C defaults. Supabase schema (`platform_branding` single-row, `tenant_branding` v2 with light/dark logo URLs, `tenant_app_branding` per-app per-tenant) + RLS initplan-optimised policies. Force-override via `platform_branding.force_override_tenant_ids` for super-admin lock-to-platform. Slot-aware Logo component (`header`/`sidebar`/`auth`/`favicon`). See master roadmap §WL and bsuite#148 / crm7#193 / BSU#60.
- **Conduit — Candidate Portal**: `/portal/candidate` replaced with full authenticated surface (applications, interviews, offers, documents). New `r7_candidate_id_for_auth_user()` security-definer RLS helper + 6 co-existing `FOR SELECT` policies. conduit#46 + #49.
- **Conduit — Public Careers Page**: `/portal/careers` replaced with working job board, JSON-LD `JobPosting` structured data, `r7_jobs.apply_url` + `apply_email` columns. conduit#48.
- **CRM7 — Per-stage Deal Rotting**: Converged with HubSpot/Pipedrive/Salesforce 2026 "stage rotting" feature. New `opportunities.stage_entered_at` column + trigger; pipeline-velocity.ts now uses precise time-in-stage. crm7#191.
- **All Supabase Edge Functions — SEC-EDGE-005 Constant-Time Compares**: BSU centralized `timingSafeEqual` + `isServiceRoleCall` in `_shared/cors.ts`; migrated `verifyInternalAuth`, `send-notification`, `email-dispatcher`, `oauth-google-email`, `oauth-microsoft-email`, `process-webhook-queue`. crm7 migrated `timesheet-reminders` + `compliance-scanner`. Fixed duplicate `checkRateLimit` shadow in `store-ram-credential` + `xero-token-exchange`. BSU#63/#64/#66 + crm7#188/#190.
- **BSU Edge Function Hardening**: `stripe-portal` IDOR closed (customerId now resolved from authenticated user's tenant, client-supplied value accepted only as hint), `lead-capture` wildcard CORS → shared allowlist, `generate-document` added missing rate limiter, `calendar-integration` migrated to shared CORS + shared rate limiter. BSU#58 + #64.
- **Conduit — Perf**: cache()-wrapped `getCurrentUser()` + `getTenantContext()` helpers; branding waterfall (5 queries → 3 parallel). conduit#41.
- **CRM7 Nav + Branding fix**: SidebarProvider as flex-row root fixes main content reflow; CRM7Logo always visible in header; `branding.tsx` now upserts to `tenant_branding` (not disconnected `tenant_settings`). crm7#185.
- **RLS {public} → {authenticated}**: All 5 tenants/user_tenants policies migrated. Applied migration `20260413062306_fix_rls_public_to_authenticated_tenant_policies`.
- **Node 24 alignment**: crm7 `.node-version` 22→24 matching `engines.node: "24"`. crm7#186.
- **BSU OAuth Mandate**: Two-provider canonical spec (Google + Microsoft/Azure only, GitHub intentionally removed) documented in §Mandatory OAuth Providers above.
- **Automated Deployment Checks (Ship-All-Apps cron)**: RLS policy standing audit documented; Supabase URI allow-list locked in.
- **Tier-3 EntitySelectors (crm7)**: AwardRateSelector, PlacementSelector, HostSiteSelector, FieldOfficerSelector, TrainingProviderSelector. crm7#192.
- **R80.3 Wage Source CSV UI**: Download Template + Import CSV File picker in Settings → Award Rates surfaces existing service functions. R80.3#51.
- **R80.3 Fair Work API Reference v1.01W**: Documented actual 3-layer cache & fallback ladder, retry semantics, per-function fallback paths. R80.3#49.
- **R80.3 Test coverage**: `fairworkCacheFallback.test.ts` adds 17 behaviour tests on in-memory → DB fallback ladder. R80.3#48.
- **Type tightening sweep (3 projects)**: crm7 (EntitySelector generic), BSU (mcpDebugger globals, AuthContext row types), R80.3 (debounce never-arg generic, FinancialYearRow inline interfaces). crm7#194 + BSU#57 + R80.3#46.
- **WCAG 2.1 AA A11Y sweep (3 projects)**: BSU Branding/AdminBranding/Notices (BSU#62), Conduit ComposeDialog → Radix Dialog primitive + APG tablist (conduit#40), R80.3 LoginModal dialog role + focus trap + skip-to-main (R80.3#45/#47).

## Recent Changes (2025-02-27)

- **Conduit**: Replaced all native `confirm()` with `ConfirmDialog` component + `useConfirmDialog` hook
- **Conduit**: Added `Breadcrumbs` component to dashboard layout
- **CRM7**: Replaced 260+ raw `console.*` calls with centralized `logger` utility
- **All projects**: Fixed Tailwind v4 deprecation (`flex-shrink-0` → `shrink-0`)
- **BSU**: Removed stale Auth0 references from `.env.example`
- **braden**: Fixed CONTRIBUTING.md (was referencing yarn, now correctly pnpm)

---

