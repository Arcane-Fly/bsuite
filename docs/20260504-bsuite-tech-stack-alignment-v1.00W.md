# BSuite Tech-Stack Alignment — Canonical Baseline

> **⚠️ SUPERSEDED (2025-02-27, auth section only):** This document describes the cookie-SSO architecture (storage key `business_suite_auth`, `domain=.crm7.app`) that was the active pattern at the time of writing. Cookie SSO has since been **removed suite-wide**. Cross-app SSO now rides exclusively on **BS OAuth 2.1 PKCE + JWKS** via `@bsuite/auth`. All non-auth content in this doc remains accurate. See [`AUTH_CANONICAL.md`](../AUTH_CANONICAL.md) for the current auth architecture.

**Doc ID:** 20260504-bsuite-tech-stack-alignment-v1.00W
**Status:** W (Working — active baseline; promote to A once all apps land the remediation table)
**Scope:** All six BSuite apps (`business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, `throughput`) + all 14 `@bsuite/*` shared packages
**Authority:** This document is the canonical tech-stack baseline. All consumers must converge on the versions and patterns here. Deviations require an ADR in `docs/adr/`.
**Supersedes (partially):** tech-stack sections of `20260423-bsuite-production-plan-v1.00W.md` Phase 10, `20260420-react-hooks-v7-tech-debt-v1.00W.md`
**Companions:** `20260504-bsuite-documentation-hub-v1.00W.md` (cross-submodule docs index), `20260227-contributing-standards-guide-v1.01W.md` (code standards)

---

## 1. Target Baseline (Aspirational — Required Convergence Target)

Every D2C app (BSU, CRM7, Conduit, R80.3, Throughput) must converge on this baseline. Braden diverges only on **brand colours** (Corporate palette instead of D2C Neon Electric) — everything else is identical.

| Concern | Required Version / Choice | Rationale |
|---|---|---|
| **React** | `^19.1.x` | Current stable; React 19 transitions + concurrent features are the assumed runtime across all apps |
| **React DOM** | `^19.1.x` | Pin must match `react` |
| **TypeScript** | `^5.9.x` (strict) | Strict mode MANDATORY in every app — see §5 gaps |
| **Node** | `24.x` (`.node-version` = `24`) | Aligns with Vercel build context and `engines.node` |
| **Package manager** | `pnpm@10.30.3` (`packageManager` field) | Enforced via corepack; never run from within the bsuite tree (see AGENTS.md lockfile recipe) |
| **Vite** | `^7.x` (non-Next.js apps) | |
| **Next.js** | `^16.2.3+` (Conduit only) | `^16.2.3` closes CVE-2026-23869 RSC DoS |
| **Tailwind CSS** | `^4.x` | v4 CSS-variable engine; consumes `@bsuite/theme/preset-v4.css` |
| **shadcn/ui** | Latest registry; `components.json` with `cssVariables: true` | `@bsuite/ui` is the primitive home (Button, Dialog, EmptyState, ErrorBoundary, Logo) |
| **Radix UI primitives** | Latest v1.x per primitive | Consumed indirectly via `@bsuite/ui` or direct import |
| **Zustand** | `^5.x` (latest) | Global client state — auth, theme, sidebar, per-app feature stores |
| **TanStack Query** | `^5.90+` | Server-state caching + realtime invalidation |
| **TanStack Table** | `^8.21+` (D2C apps) | Headless tables; AG Grid only where data-density demands it |
| **TanStack Router** | `^1.131+` (where adopted) | File-based routing for Vite apps planning migration off react-router |
| **React Router DOM** | `^7.x` | BSU still on v6 — see §5 gaps |
| **@dnd-kit/core** | `^6.3+` | Drag-drop primitive — dashboard widgets, kanban, sortable |
| **@dnd-kit/sortable** | `^10.x` | |
| **@dnd-kit/modifiers** | `^9.x` | |
| **React Flow** | `@xyflow/react@^12.10+` | Relationship graphs, schema-builder diagrams. **Never** use legacy `reactflow` package. |
| **React Hook Form** | `^7.54+` | Form state |
| **Zod** | `^4.x` (latest) | Schema validation — Braden (`^3.24`) and Throughput (`^3.25.76`) need upgrade |
| **Framer Motion** | `^12.x` | Animation |
| **Sonner** | `^2.x` | Single toast library. `react-hot-toast` is BANNED; BSU still has a remnant (see §5). |
| **Lucide React** | Latest | Single icon library |
| **cmdk** | `^1.x` | Command palette primitive |
| **Supabase JS** | `^2.103+` | `@supabase/supabase-js` — Throughput on `^2.39.7` needs upgrade |
| **Supabase SSR** (Conduit only) | `^0.7+` | `@supabase/ssr` for server-component auth |
| **AI SDK** | `ai@^6.x` + `@ai-sdk/react@^2.x` | Consumed by CRM7 + Conduit. `DefaultChatTransport` + `toUIMessageStreamResponse()` only — see AGENTS.md §AI Implementation Standards |
| **`@bsuite/theme`** | `^0.3.3` | oklch tokens, `preset-v4.css`, `usePlatformLogo()` |
| **`@bsuite/ui`** | `^0.1.0` | Primitives home (in-progress migration) |
| **`@bsuite/auth`** | `^0.1.0` | Canonical OAuth 2.1 PKCE client (apps still on per-app copies — see §5) |
| **`@bsuite/charge-calc`** | `^0.2.3` | CRM7 + R80.3 wage/charge engine |
| **`@bsuite/page-builder`** | `^0.2.0` | Universal canvas (PageGridLayout) — 4 consumers migrated |
| **`@bsuite/schema-builder`** | `^0.7.0` | Tenant schema admin UI |
| **`@bsuite/schema-registry`** | `^0.3.1` | Entity + field definitions |
| **`@bsuite/nav-core`** | `^0.5.0` | Shared navigation primitives |
| **`@bsuite/data-export`** | `^0.1.3` | xlsx/csv/pdf export utilities |
| **`@bsuite/dry-lint`** | `^0.3.0` | ESLint plugin — ownership + no-raw-entity-select (error level in all 6 apps) |
| **`@bsuite/design-tokens`** | `^0.1.0` | Primitive token layer |
| **`@bsuite/theme-codemod`** | `^1.0.0` | Hex → oklch migration |
| **`@bsuite/eslint-config`** | `^0.2.0` | Shared ESLint flat config |
| **`@bsuite/tsconfig`** | `^0.1.0` | Shared tsconfig base |

### Theme baseline (D2C Neon Electric)

- All colour tokens expressed in **oklch** — no hex literals in component code
- Enforced via `@bsuite/theme/preset-v4.css` + `@bsuite/dry-lint` + custom `no-hardcoded-colours` ESLint rules
- Dark mode: class-based (`.dark` on `<html>`), FOUC-prevention inline script in every entrypoint
- See `docs/20260228-d2c-theme-specification-v1.00A.md` for the canonical spec
- **Braden exception:** Corporate palette (`#ab233a` Braden Red, `#cbb26a` Braden Gold, `#2c3e50` Braden Navy) in Braden's own token layer — still expressed in oklch at runtime

### Cross-cutting runtime invariants

- **State management:** Zustand for global client state (auth, theme, sidebar). No Redux, no MobX, no `next-themes` (BSU exception being actively removed).
- **Forms:** React Hook Form + Zod resolver everywhere. No Formik.
- **Data fetching:** TanStack Query for Supabase queries; `@bsuite/ui` Loading/Error boundaries around every async surface.
- **Auth:** BS OAuth 2.1 PKCE for `.crm7.app` SSO + Braden (different TLD). Conduit uses Supabase SSR session directly. All other apps share the `business_suite_auth` cookie on `domain=.crm7.app`.
- **A11y:** WCAG 2.1 AA minimum. `role="main"` is redundant on `<main>` — never add. Dialog components require `<DialogTitle>` (visually-hidden acceptable).
- **Z-index ladder:** see AGENTS.md §Frontend Layout & Z-Index Standards — canonical table.
- **DRY one-shot architecture:** see `docs/20260227-dry-one-shot-architecture-v1.02A.md`. Single owning app for CRUD; others read via Supabase + link. Enforced by `@bsuite/dry-lint`.

---

## 2. Per-App Current State Matrix

**Provenance:**

- **Freshly verified 2026-05-04** (via direct `package.json` inspection this session): Zod versions, `@xyflow/react` versions, Radix primitive counts, and full `@bsuite/*` shared-package consumption per app (§2.5 auth column + §2.6).
- **Inherited from 2026-04-23 production plan audit** (`docs/plans/20260423-bsuite-production-plan-v1.00W.md`): React / TypeScript strict / Node / pnpm / Vite / Next / Tailwind / Zustand / TanStack / React Hook Form / Framer Motion / Supabase-JS per-app versions, Sonner + react-hot-toast status. These rows should be re-verified before Wave B execution (see §5.2) — tracked as `SHARED-10` in §5.1.

A planned `scripts/verify-tech-stack-matrix.sh` will diff each app's `package.json` against this baseline so future refreshes are one-command.

### 2.1 Core runtime

| App | React | TypeScript strict | Node | pnpm | Build tool |
|---|---|---|---|---|---|
| business-suite-unified | 19 ✅ | enabled ✅ | 24 ✅ | 10.30.3 ✅ | Vite ^7 ✅ |
| crm7 | 19 ✅ | enabled ✅ | 24 ✅ | 10.30.3 ✅ | Vite ^7 ✅ |
| conduit | 19 ✅ | enabled ✅ | 24 ✅ | 10.30.3 ✅ | Next 16 ✅ |
| braden | 19 ✅ | enabled ✅ | 24 ✅ | 10.30.3 ✅ | Vite ^7 ✅ |
| R80.3 | 19 ✅ | ❌ not strict | 24 ✅ | 10.30.3 ✅ | Vite ^7 ✅ |
| throughput | 19 ✅ | ❌ not strict | 24 ✅ | 10.30.3 ✅ | Vite ^7 ✅ |

### 2.2 UI stack

| App | Tailwind | shadcn primitives | Radix count | Sonner | react-hot-toast | lucide-react |
|---|---|---|---|---|---|---|
| business-suite-unified | v4 ✅ | consumed ✅ | 27 | ✅ | ❌ still present (P1-J05) | ✅ |
| crm7 | v4 ✅ | consumed ✅ | 28 | ✅ | ✅ removed | ✅ |
| conduit | v4 ✅ | consumed ✅ | 15 | ✅ | ✅ removed | ✅ |
| braden | v4 ✅ | consumed ✅ | 27 | ✅ | ✅ removed | ✅ |
| R80.3 | v4 ✅ | minimal ⚠️ 1 | 1 | ✅ | ✅ removed | ✅ |
| throughput | v4 ✅ | none ❌ 0 | 0 | ⚠️ | ✅ removed | ✅ |

**Notes:**
- R80.3 has only 1 Radix primitive because its UI surface is narrow (calculator, settings, login). It still must consume `@bsuite/ui` primitives.
- Throughput has **zero** Radix/shadcn primitives. Tailwind is now v4, so the remaining high-impact UI gap is shared primitive adoption.

### 2.3 State + data + forms

| App | Zustand | TanStack Query | TanStack Table | React Hook Form | Zod |
|---|---|---|---|---|---|
| business-suite-unified | ^5 ✅ | ^5.90+ ✅ | ^8.21+ ✅ | ^7.54+ ✅ | `^4.3.6` ✅ |
| crm7 | ^5 ✅ | ^5.90+ ✅ | ^8.21+ ✅ | ^7.54+ ✅ | `^4.3.6` ✅ |
| conduit | ^5 ✅ | ^5.90+ ✅ | ^8.21+ ✅ | ^7.54+ ✅ | `^4.3.6` ✅ |
| braden | ^5 ✅ | ^5.90+ ✅ | ^8.21+ ✅ | ^7.54+ ✅ | **`^3.24.0` ❌** |
| R80.3 | ^5 ✅ | ^5.90+ ✅ | ^8.21+ ✅ | ^7.54+ ✅ | `^4.3.6` ✅ |
| throughput | ^5 ✅ | ^5.90+ ✅ | ^8.21+ ✅ | ^7.54+ ✅ | **`^3.25.76` ❌** |

### 2.4 Drag, flow, animation

| App | @dnd-kit/core | React Flow (`@xyflow/react`) | Framer Motion |
|---|---|---|---|
| business-suite-unified | ^6.3+ ✅ | `^12.10.2` ✅ | ^12 ✅ |
| crm7 | ^6.3+ ✅ | `^12.10.1` ✅ | ^12 ✅ |
| conduit | ^6.3+ ✅ | `^12.10.1` ✅ | ^12 ✅ |
| braden | ^6.3+ ✅ | **missing ❌** | ^12 ✅ |
| R80.3 | ^6.3+ ✅ | `^12.10.1` ✅ | ^12 ✅ |
| throughput | ^6.3+ ✅ | **missing ❌** | ^12 ✅ |

### 2.5 Supabase + auth

`@supabase/supabase-js` versions below are from the 2026-04-23 audit and should be re-verified. `@bsuite/auth` adoption was freshly verified 2026-05-04 — **adoption is much further along than prior plans assumed**: every client app now lists `@bsuite/auth@^0.1.0` as a dependency. Per-app OAuth client `business-suite-oauth.ts` files may still coexist; migration to the shared package is a follow-up.

| App | `@supabase/supabase-js` | Cookie SSO | `@bsuite/auth` installed |
|---|---|---|---|
| business-suite-unified | ^2.103+ ⚠️ (2026-04-23) | sets cookie ✅ | ❌ n/a (is the OAuth server) |
| crm7 | ^2.103+ ⚠️ (2026-04-23) | reads ✅ | ✅ `^0.1.0` |
| conduit | ^2.103+ ⚠️ (2026-04-23) | n/a (SSR cookies) | ✅ `^0.1.0` (alongside `@supabase/ssr`) |
| braden | `^2.99.3` ⚠️ (2026-04-23) | n/a (different TLD) | ✅ `^0.1.0` |
| R80.3 | ^2.103+ ⚠️ (2026-04-23) | reads ✅ | ✅ `^0.1.0` |
| throughput | **`^2.39.7` ❌** (2026-04-23) | reads ✅ | ✅ `^0.1.0` (previously 0-byte file — now resolved) |

### 2.6 Shared @bsuite/* consumption (freshly verified 2026-05-04)

Directly verified against each app's `package.json` on `development`. Version cells show the exact pinned version as of 2026-05-04, with Tailwind status refreshed on 2026-05-11. ❌ means the package is not installed. n/a means the app has no use case for the package.

| App | theme | ui | page-builder | schema-builder | schema-registry | nav-core | data-export | dry-lint | charge-calc | auth |
|---|---|---|---|---|---|---|---|---|---|---|
| business-suite-unified | ✅ `^0.3.3` | ✅ `^0.1.0` | ✅ `^0.2.0` | ✅ `^0.7.0` | ✅ `^0.3.0` | ✅ `^0.5.0` | ✅ `^0.1.3` | ✅ `^0.2.0` | n/a | ❌ n/a (OAuth server) |
| crm7 | ✅ `^0.3.3` | ❌ | ✅ `^0.2.0` | ✅ `^0.7.0` | ✅ `^0.3.0` | ✅ `^0.5.0` | ✅ `^0.1.3` | ✅ `^0.2.0` | ✅ `^0.2.3` | ✅ `^0.1.0` |
| conduit | ✅ `^0.3.3` | ❌ | ✅ `^0.2.0` | ✅ `^0.7.0` | ✅ `^0.3.0` | ✅ `^0.5.0` | ❌ | ✅ `^0.2.0` | n/a | ✅ `^0.1.0` |
| braden | ❌ (Corporate palette direct) | ❌ | n/a | n/a | ✅ `^0.3.0` | ✅ `^0.5.0` | n/a | ✅ `^0.2.0` | n/a | ✅ `^0.1.0` |
| R80.3 | ✅ `^0.3.3` | ✅ `^0.1.0` | ✅ `^0.2.0` | ✅ `^0.7.0` | ✅ `^0.3.0` | ✅ `^0.5.0` | ✅ `^0.1.3` | ✅ `^0.2.0` | ✅ `^0.2.3` | ✅ `^0.1.0` |
| throughput | ✅ `^0.3.3` | ✅ `^0.1.0` (limited use — zero Radix) | ❌ | ❌ | ❌ | ✅ `^0.5.0` | ❌ | ✅ `^0.2.0` | n/a | ✅ `^0.1.0` |

**Version-drift observations:**

- All apps consume `@bsuite/schema-registry@^0.3.0`; source is at `0.3.1` (minor drift — safe)
- All apps consume `@bsuite/dry-lint@^0.2.0`; source is at `0.3.0` (one-minor drift — new gap `SHARED-11` in §5.1; the `no-raw-entity-select` rule added in 0.3.0 is not yet enforced)
- All other consumer versions match source exactly

---

## 3. Shared Package Inventory (source of truth)

| Package | Source | Current version (local) | Purpose |
|---|---|---|---|
| `@bsuite/auth` | `packages/auth/` | 0.1.0 | OAuth 2.1 PKCE client + JWKS verification + token refresh |
| `@bsuite/charge-calc` | `packages/charge-calc/` | 0.2.3 | Wage/charge calculation engine (CRM7 + R80.3) |
| `@bsuite/data-export` | `packages/data-export/` | 0.1.3 | xlsx / csv / pdf export helpers |
| `@bsuite/design-tokens` | `packages/design-tokens/` | 0.1.0 | Primitive token layer (oklch base) |
| `@bsuite/dry-lint` | `packages/dry-lint/` | 0.3.0 | ESLint plugin — DRY one-shot ownership + no-raw-entity-select |
| `@bsuite/eslint-config` | `packages/eslint-config/` | 0.2.0 | Shared flat ESLint config |
| `@bsuite/nav-core` | `packages/nav-core/` | 0.5.0 | Navigation primitives (currently braden; D2C apps use per-app) |
| `@bsuite/page-builder` | `packages/page-builder/` | 0.2.0 | Universal canvas — PageGridLayout + mobile reflow |
| `@bsuite/schema-builder` | `packages/schema-builder/` | 0.7.0 | Tenant schema admin UI |
| `@bsuite/schema-registry` | `packages/schema-registry/` | 0.3.1 | Entity + field definitions + relationship metadata |
| `@bsuite/theme` | `packages/theme/` | 0.3.3 | oklch tokens, `preset-v4.css`, `usePlatformLogo()` |
| `@bsuite/theme-codemod` | `packages/theme-codemod/` | 1.0.0 | Hex → oklch migration codemod |
| `@bsuite/tsconfig` | `packages/tsconfig/` | 0.1.0 | Shared tsconfig base |
| `@bsuite/ui` | `packages/ui/` | 0.1.0 | Primitives home (Button, Dialog, EmptyState, ErrorBoundary, Logo — migration in progress) |

### Publication doctrine

- All `@bsuite/*` packages published to **public npm** under the `@bsuite` org
- Consumers **never** use `workspace:*` or `file:` — always caret-pinned npm versions (`^X.Y.Z`)
- Vercel clones only the individual submodule repo, so the parent `packages/` folder does not exist in the build context
- Lockfile regeneration for consumer apps **must** be run from outside the bsuite tree (see AGENTS.md §pnpm Lockfile Generation)
- Version bump coordination: when any app bumps React, shared packages must bump within the next PR (CI gate on React-version skew in progress)

---

## 4. Feature Parity Matrix (like-for-like expectations)

Except where a feature is intentionally out-of-scope for an app, every BSuite app must implement these patterns identically.

| Feature | BSU | CRM7 | Conduit | Braden | R80.3 | Throughput | Owner package / reference |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **Theme system (oklch, light/dark, FOUC-prevention)** | ✅ | ✅ | ✅ | ✅ (Corporate) | ✅ | ✅ Tailwind v4 | `@bsuite/theme` + `docs/20260228-d2c-theme-specification-v1.00A.md` |
| **shadcn primitives via `@bsuite/ui`** | ⚠️ migrating | ⚠️ migrating | ⚠️ migrating | ⚠️ migrating | ⚠️ migrating | ❌ | `@bsuite/ui` |
| **Universal canvas (PageGridLayout)** | ✅ 8 pages | ⚠️ ~40% | ⚠️ 0/8 views | n/a (overlay mode) | ⚠️ 0/views | ❌ | `@bsuite/page-builder` |
| **Dashboard dnd-kit widgets** | ✅ | ✅ canonical | ❌ | n/a | ❌ | ❌ | `@bsuite/page-builder` |
| **Schema builder admin** | ⚠️ DB ready, UI 0% | ⚠️ consumer | ⚠️ consumer | n/a | ⚠️ consumer | n/a | `@bsuite/schema-builder` |
| **Page builder / PageComposer** | ✅ shipped | ✅ consumer | ✅ consumer | n/a | ✅ consumer | n/a | `@bsuite/page-builder` |
| **Relationship graph UI** (`@xyflow/react`) | ⚠️ | ⚠️ planned | ⚠️ planned | ❌ n/a | ⚠️ planned | ❌ | `@bsuite/schema-registry` + `@xyflow/react` |
| **Navigation (sidebar + breadcrumbs + mobile drawer)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | per-app + `@bsuite/nav-core` (braden) + `docs/20260316-navigation-reference-v1.00A.md` |
| **DRY one-shot EntitySelectors** | ⚠️ Tier-3 live | ✅ Tier-3 + base | ⚠️ partial | n/a | ⚠️ partial | n/a | `@bsuite/schema-registry` + `docs/20260227-dry-one-shot-architecture-v1.02A.md` |
| **Platform logo (`usePlatformLogo`)** | ✅ owns tiers | ✅ consumer | ✅ consumer | ✅ consumer | ✅ consumer | ⚠️ consumer | `@bsuite/theme` |
| **Tenant branding (3-tier)** | ✅ owns UI | ✅ consumer | ✅ consumer | corporate fixed | ✅ consumer | ✅ consumer | `platform_branding` → `tenant_branding` → `tenant_app_branding` |
| **BS OAuth 2.1 PKCE** | ✅ server | ✅ client | n/a (SSR) | ✅ client | ✅ client | ⚠️ client (was broken) | `@bsuite/auth` (migration pending) |
| **Cookie SSO (`business_suite_auth`)** | ✅ sets | ✅ reads | n/a | n/a (diff TLD) | ✅ reads | ✅ reads | `src/lib/supabase.ts` per app |
| **Data export (xlsx/csv/pdf)** | ⚠️ | ✅ | ⚠️ | n/a | ✅ | ⚠️ | `@bsuite/data-export` |
| **AI assistant (streamText, tool calls)** | ❌ n/a | ✅ canonical | ✅ | ❌ n/a | ❌ n/a | ⚠️ Groq | `ai` + `@ai-sdk/react` + AGENTS.md §AI |
| **WYSIWYG schema-driven UX** | planned | planned | planned | n/a | planned | n/a | `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` |
| **A11y: WCAG 2.1 AA** | ✅ swept | ⚠️ DialogTitle gap (81 files) | ✅ swept | partial | ✅ swept | partial | `docs/20260407-d2c-wcag-contrast-audit-v1.00A.md` |
| **Sentry monitoring** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | planned Phase 13 |
| **Playwright E2E** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | planned Phase 13 |

---

## 5. Gap Register + Remediation (actionable)

Each row is a concrete remediation action. Priorities align with `20260423-bsuite-production-plan-v1.00W.md`.

| ID | App | Gap | Remediation | Priority |
|---|---|---|---|---|
| TS-01 | throughput | Tailwind v4 floor | ✅ Resolved 2026-05-11; `tailwindcss` and `@tailwindcss/vite` are v4, with `pnpm lint:tailwind-v4` guarding against regression | Done |
| TS-02 | throughput | Zero Radix primitives / no shadcn | After TS-01: install `@bsuite/ui`; consume shared primitives | P1 |
| TS-03 | throughput | `@supabase/supabase-js` on `^2.39.7` | Upgrade to `^2.103+`; re-run supabase-js integration smoke | P1 |
| TS-04 | throughput | `business-suite-oauth.ts` was 0 bytes (partially mitigated) | Migrate to `@bsuite/auth`; wire `startBSTokenRefresh()` in AuthProvider | P0 |
| TS-05 | throughput, braden | `@xyflow/react` missing — cannot render relationship graphs | Evaluate need per app; install if schema-builder consumer | P2 |
| TS-06 | braden | Zod on `^3.24.0` | Bump to `^4.3.6`; fix breaking resolver types | P1 |
| TS-07 | throughput | Zod on `^3.25.76` | Bump to `^4.3.6`; fix breaking resolver types | P1 |
| TS-08 | braden | `@supabase/supabase-js` on `^2.99.3` | Bump to `^2.103+` | P2 |
| TS-09 | R80.3, throughput | `strict: true` not enabled in tsconfig | Enable strict; fix resulting type errors | P1 |
| TS-10 | business-suite-unified | `react-router-dom` on v6 | Migrate to v7 (loaders/actions API changes) | P1 |
| TS-11 | business-suite-unified | `react-hot-toast` remnant | Remove dependency; migrate all usages to `sonner` | P1 |
| TS-12 | business-suite-unified | `next-themes` used in Vite app | Replace with Zustand-based `useTheme` (CRM7 pattern) | P1 |
| TS-13 | business-suite-unified | `react-day-picker@8.10.1` | Bump to `^9.14` (rewrite API) | P2 |
| TS-14 | all 5 clients | Per-app `business-suite-oauth.ts` copies | Migrate to `@bsuite/auth` (CRM7 first → R80.3 → braden → throughput → BSU) | P1 |
| TS-15 | crm7 | 81 files missing `<DialogTitle>` | Codemod/AST sweep to add visually-hidden `<DialogTitle>` | P1 |
| TS-16 | all 5 clients | Per-app logo rendering logic | Migrate to `<Logo slot=... appSlug=... />` from `@bsuite/theme` / `@bsuite/ui` | P2 |
| TS-17 | all | `@bsuite/ui` primitives not fully centralised | Migrate Button, Dialog, EmptyState, ErrorBoundary, Logo into `@bsuite/ui`; migrate consumers | P2 |
| TS-18 | all | No Sentry monitoring | Install `@sentry/react` (5 apps) + `@sentry/nextjs` (conduit); wire DSN per env | P2 |
| TS-19 | all | No Playwright E2E suite | Install `@playwright/test` per app; author critical-path smoke tests | P2 |
| TS-20 | all | Sidebar `localStorage` key inconsistent | Unify key name (`bsuite_sidebar_collapsed`) across all apps | P2 |
| TS-21 | 5 apps | `vercel.json` missing `Cache-Control: immutable` for `/assets/*` | Add cache header rules in each `vercel.json` | P2 |
| TS-22 | all | OIDC nonce missing in authorization requests | Add nonce to `signInWithBusinessSuite`; verify in token exchange | P1 |
| TS-23 | BSU | `AdminBranding` writes to Tier 2 instead of Tier 1 | Wire platform tab to `platform_branding` singleton upsert | P1 |
| TS-24 | all 6 | `@bsuite/dry-lint` version drift — consumers on `^0.2.0`, source at `0.3.0` (`no-raw-entity-select` rule unenforced) | Bump all 6 consumer apps to `^0.3.0` in coordinated sweep; verify `pnpm lint` green everywhere | P2 |
| TS-25 | all 6 | Per-app tech-stack rows in §2.1–2.5 are inherited from 2026-04-23 audit — needs re-verification | Script `scripts/verify-tech-stack-matrix.sh` to diff each `package.json` against baseline | P2 |
| TS-26 | all 6 | No CI check enforces byte-identity of the shared section of `{submodule}/docs/PARENT-DOCS.md` — reviewer caught divergence 2026-05-04 (Braden/Conduit/R80.3 inline drift) | Add CI script `scripts/verify-parent-docs-sync.sh` that diffs the shared section (lines between the two `---` separators around "Living Authority") across all 6 files and fails on divergence | P2 |

---

## 5.1 Gap Register by Owner (cross-reference)

The TS-XX IDs in §5 are the authoritative identifiers. This subsection rekeys them by **owning app** to make per-app checklists easy to extract. Owner-prefixed IDs below map 1:1 to a TS-XX row.

| Owner-prefixed ID | TS-XX | Short description | Priority | Named owner |
|---|---|---|:-:|---|
| **BSU-01** | TS-10 | `react-router-dom` v6 → v7 | P1 | BSU maintainer |
| **BSU-02** | TS-11 | Remove `react-hot-toast`; migrate to `sonner` | P1 | BSU maintainer |
| **BSU-03** | TS-12 | Replace `next-themes` with Zustand `useTheme` | P1 | BSU maintainer |
| **BSU-04** | TS-13 | `react-day-picker` 8 → 9 | P2 | BSU maintainer |
| **BSU-05** | TS-23 | `AdminBranding` platform-tier upsert fix | P1 | BSU maintainer |
| **CRM7-01** | TS-15 | `<DialogTitle>` sweep (81 files) | P1 | CRM7 maintainer |
| **CND-01** | (ongoing) | Keep Next.js ≥16.2.3 (CVE tracking) | P0 | Conduit maintainer |
| **BRD-01** | TS-06 | Zod `^3.24.0` → `^4.3.6` | P1 | Braden maintainer |
| **BRD-02** | TS-08 | `@supabase/supabase-js` `^2.99.3` → `^2.103+` | P2 | Braden maintainer |
| **R80-01** | TS-09a | Enable TS `strict: true` in R80.3 | P1 | R80.3 maintainer |
| **TP-01** | TS-01 | Tailwind v4 floor regression guard | Done | Throughput maintainer |
| **TP-02** | TS-02 | Install `@bsuite/ui` + shadcn primitives | P1 | Throughput maintainer |
| **TP-03** | TS-03 | `@supabase/supabase-js` `^2.39.7` → `^2.103+` | P1 | Throughput maintainer |
| **TP-04** | TS-04 | Migrate to `@bsuite/auth` | P0 | Throughput maintainer |
| **TP-05** | TS-07 | Zod `^3.25.76` → `^4.3.6` | P1 | Throughput maintainer |
| **TP-06** | TS-09b | Enable TS `strict: true` in Throughput | P1 | Throughput maintainer |
| **TP-07** | TS-05b | Install `@xyflow/react` if schema-builder consumer | P2 | Throughput maintainer |
| **SHARED-01** | TS-14 | Migrate all 5 clients to `@bsuite/auth` | P1 | Shared packages lead + per-app maintainer |
| **SHARED-02** | TS-16 | Migrate per-app logo rendering to `<Logo>` from `@bsuite/ui` | P2 | Shared packages lead |
| **SHARED-03** | TS-17 | Centralise Button, Dialog, EmptyState, ErrorBoundary, Logo in `@bsuite/ui` | P2 | Shared packages lead |
| **SHARED-04** | TS-18 | Install Sentry across all 6 apps | P2 | Platform lead |
| **SHARED-05** | TS-19 | Author Playwright E2E suite per app | P2 | QA lead |
| **SHARED-06** | TS-20 | Unify sidebar `localStorage` key | P2 | Shared packages lead |
| **SHARED-07** | TS-21 | `Cache-Control: immutable` headers in 5 `vercel.json` | P2 | Per-app maintainer |
| **SHARED-08** | TS-22 | OIDC nonce in authorization requests | P1 | Shared packages lead |
| **SHARED-09** | TS-05a | `@xyflow/react` install audit (Braden optional) | P2 | Shared packages lead |
| **SHARED-10** | TS-25 | Re-verify inherited per-app tech-stack rows + script the check | P2 | Shared packages lead |
| **SHARED-11** | TS-24 | Bump all 6 consumers to `@bsuite/dry-lint@^0.3.0` | P2 | Shared packages lead |
| **SHARED-12** | TS-26 | CI check for PARENT-DOCS.md shared-section byte-identity | P2 | Shared packages lead |

---

## 5.2 Execution Waves

Group the gap register into four execution waves to sequence effort. Each wave can land across multiple PRs; the wave itself closes when every ID inside it is flipped to ✅.

### Wave A — P0 Security + Critical Runtime (blocks production)

- **TP-04** — Throughput OAuth migration (was 0-byte `business-suite-oauth.ts`)
- **CND-01** — Keep Conduit on Next.js ≥16.2.3 (ongoing CVE tracking)

**Exit criteria:** every app authenticates end-to-end; no known CVEs in production deps.

### Wave B — P1 Tech-Debt Remediation (consumer alignment)

- **BSU-01..03, BSU-05** — BSU router/toast/theme/branding migrations
- **BRD-01, BRD-02** — Braden Zod + Supabase bumps
- **R80-01, TP-06** — Enable TypeScript strict mode
- **TP-02..03, TP-05** — Throughput shadcn + supabase-js + Zod bumps
- **CRM7-01** — DialogTitle sweep
- **SHARED-01** — `@bsuite/auth` adoption (CRM7 → R80.3 → Braden → Throughput → BSU order)
- **SHARED-08** — OIDC nonce across all clients

**Exit criteria:** per-app matrix in §2 shows zero ❌ rows; only ⚠️ partial remains.

### Wave C — Design-System Consolidation (`@bsuite/ui` completion)

- **SHARED-02** — Shared `<Logo>` component adoption
- **SHARED-03** — Button/Dialog/EmptyState/ErrorBoundary/Logo centralisation
- **SHARED-06** — Sidebar `localStorage` key unification
- **BSU-04** — `react-day-picker` v9 migration
- **SHARED-09, TP-07** — `@xyflow/react` install audit

**Exit criteria:** `@bsuite/ui` consumed at ✅ level across all 6 apps; no per-app duplicates remain for the migrated primitives.

### Wave D — Observability + Hygiene (production hardening)

- **SHARED-04** — Sentry monitoring in all apps
- **SHARED-05** — Playwright E2E smoke suites
- **SHARED-07** — `Cache-Control: immutable` headers

**Exit criteria:** every app emits Sentry events to production; every app has at least one green Playwright smoke on `development` and `main`.

---

## 6. Validation Commands (per-app)

Every app must pass these before a merge to `development` or `main`:

```bash
pnpm typecheck    # strict TS — must be zero errors
pnpm lint          # must include @bsuite/dry-lint no-cross-app-write + no-raw-entity-select at error level
pnpm test          # Vitest unit + component tests
pnpm build         # Vite / Next build must succeed
```

Conduit additionally:

```bash
pnpm next:validate  # Next 16 RSC + route-type validation
```

---

## 6.1 Verification — What "Aligned" Means

A gap (TS-XX / owner-prefixed ID) is considered **closed** only when all five of the following are true:

1. **Lockfile clean** — `pnpm-lock.yaml` regenerated per the AGENTS.md out-of-tree recipe; Vercel build context has no `..` references; no `workspace:*` or `file:` entries for `@bsuite/*` deps
2. **All four quality gates green** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass on the affected app on a clean clone (not just locally)
3. **Preview deploy green** — the `d.<app>.crm7.app` (or equivalent alias) preview deploy is READY on the Vercel dashboard; authenticated smoke via cookie SSO succeeds
4. **Backlog row flipped** — the TS-XX row in §5 (and owner-prefixed row in §5.1) is annotated with ✅ + landed-PR link; if the gap has an entry in `docs/20260501-merged-execution-backlog-v1.00W.md` or `docs/plans/20260423-bsuite-production-plan-v1.00W.md`, that row is also updated in the same PR
5. **Matrix row flipped** — the per-app row in §2 (and/or feature parity row in §4) is updated in the same PR; if a ❌ becomes ✅, the change log entry here records the flip

Partial fixes (e.g., one primitive migrated of many) do not flip the row — add a ⚠️ note with remaining scope instead. A gap is not closed until its wave's exit criteria are fully met.

---

## 7. Deviation Policy

Deviations from this baseline require:

1. An ADR in `docs/adr/` explaining the deviation, alternatives considered, and sunset path (if the deviation is temporary)
2. A link from the affected app's README to the ADR
3. CI alerts (via `@bsuite/dry-lint` or a version-skew check) if the deviation drifts further

The only permanent deviation sanctioned today is **Braden corporate brand colours** — every other divergence is a gap to close.

---

## 8. Cross-References

- **Master roadmap:** `docs/20260227-bsuite-master-roadmap-v5.00W.md`
- **Finish-line roadmap (execution order):** `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`
- **Merged execution backlog:** `docs/20260501-merged-execution-backlog-v1.00W.md`
- **Audit source:** `docs/plans/20260423-bsuite-production-plan-v1.00W.md` (Phase 10 Dependency & Build Standardisation)
- **DRY architecture:** `docs/20260227-dry-one-shot-architecture-v1.02A.md`
- **D2C theme:** `docs/20260228-d2c-theme-specification-v1.00A.md`
- **Auth map:** `docs/20260227-auth-map-reference-v1.00A.md`
- **Contributing standards:** `docs/20260227-contributing-standards-guide-v1.01W.md`
- **Documentation hub (this doc's companion):** `docs/20260504-bsuite-documentation-hub-v1.00W.md`

---

## 9. Change Log

| Version | Date | Change |
|---|---|---|
| 1.00W (rev-2) | 2026-05-04 | Added TS-26 / SHARED-12 gap for CI enforcement of PARENT-DOCS.md shared-section byte-identity after reviewer caught Braden/Conduit/R80.3 inline drift in first draft. |
| 1.00W | 2026-05-04 | Initial canonical tech-stack baseline. Consolidates Phase 10 of `20260423-bsuite-production-plan` + tech-stack sections of `20260420-react-hooks-v7-tech-debt`. §2.5–2.6 (auth + shared `@bsuite/*` consumption) freshly verified 2026-05-04 against each app's `package.json`. Other §2 rows inherited from 2026-04-23 audit (marked with provenance annotation; TS-25/SHARED-10 tracks re-verification). Added §5.1 owner-prefixed gap register, §5.2 four-wave execution ordering, §6.1 "aligned" verification criteria, TS-24/SHARED-11 for dry-lint version drift, TS-25/SHARED-10 for re-verification script. Correction: `@bsuite/auth` is installed in all 5 client apps (previously assumed per-app copies only). |
