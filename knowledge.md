# BSuite — Project Knowledge

Multi-app monorepo (6 submodules) sharing one Supabase project (`tuybltdrdefjblnplpqo`), TypeScript/React stack, and unified standards. Each app deploys independently on Vercel from its own GitHub repo.

> **Canonical docs** — read these before substantive work:
> - [`AGENTS.md`](./AGENTS.md) — universal agent rulebook (SSoT for behaviour)
> - [`AUTH_CANONICAL.md`](./AUTH_CANONICAL.md) — auth architecture (🛑 do not revert to cookie SSO)
> - [`MEMORY_PROTOCOL.md`](./MEMORY_PROTOCOL.md) — cross-session state via QIG Memory API
> - [`docs/20260227-contributing-standards-guide-v1.01W.md`](./docs/20260227-contributing-standards-guide-v1.01W.md) — full quality standards
> - [`docs/20260227-dry-one-shot-architecture-v1.04A.md`](./docs/20260227-dry-one-shot-architecture-v1.04A.md) — entity ownership

**Zero-defer policy (AGENTS.md §1):** Never defer fixes. If you see a lint/type/bug issue, fix it in the same session. No "TODO: implement later" for known problems.

> **R80.3 → R80.4 corrected 2026-08-17.** R80.3 left the submodule set on 2026-08-06 (`5e000c35`,
> operator directive); R80.4 took its place and is what serves `r8.crm7.app` today. This file is one
> of the "canonical docs" agents are told to read before substantive work, so the directory name,
> script description, submodule table, package-consumer lists, and theme app list below are updated
> in place. **Left unverified:** the R80.3 row's OAuth Client ID in the BS OAuth table — this
> session did not check R80.4's registered client ID against Supabase, and copying the old ID across
> if it changed would be worse than leaving the row stale, so it is marked below rather than guessed.
> The `@bsuite/page-builder` row was also corrected — installed version is `0.9.0`
> (`packages/page-builder/package.json`), not `0.4.0`.

## Quickstart

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/GaryOcean428/bsuite.git
git submodule update --init --recursive

# Per-app dev (pnpm is standard everywhere)
cd <app>
pnpm install
pnpm dev        # start dev server
pnpm build      # production build
pnpm test       # vitest (all apps, including conduit)
pnpm lint
pnpm typecheck  # or: pnpm tsc --noEmit

# Root orchestration scripts (5 apps only — throughput + mobile excluded from loop)
pnpm lint:all          # crm7 R80.4 braden business-suite-unified conduit
pnpm test:all          # same 5
pnpm build:all         # same 5
pnpm typecheck:all     # same 5
pnpm test:packages     # shared @bsuite/* packages
```

- **Node:** 24 (pinned via `.node-version` + `engines.node`)
- **pnpm:** `10.30.3` (via corepack)
- **Lockfile gotcha:** NEVER run `pnpm install` inside a submodule from the bsuite tree — pnpm embeds `../packages/*` paths that break Vercel. Regenerate from `~/<app>_lockgen/` (see AGENTS.md §"pnpm Lockfile Generation"). Copy `package.json` + `patches/` (if it exists) + the existing `pnpm-lock.yaml` as base, then run `pnpm install --lockfile-only --no-frozen-lockfile` — the base lockfile prevents ~900 lines of transitive dep churn (bsuite#1612).

## Architecture

### Submodules (6 apps)

| App | Path | Stack | Prod URL | Dev preview |
|-----|------|-------|----------|-------------|
| **CRM7** | `crm7/` | React 19 + Vite + AI SDK | [crm.crm7.app](https://crm.crm7.app) | `d.crm.crm7.app` |
| **Conduit** | `conduit/` | Next.js 16 App Router | [conduit.crm7.app](https://conduit.crm7.app) | `d.conduit.crm7.app` |
| **R8** | `R80.4/` | React 19 + Vite (wage calc) | [r8.crm7.app](https://r8.crm7.app) | `d.r8.crm7.app` |
| **BSU** | `business-suite-unified/` | React + Vite + Stripe (OAuth server) | [suite.crm7.app](https://suite.crm7.app) | `d.suite.crm7.app` |
| **Braden** | `braden/` | React + Vite (corporate site) | [braden.com.au](https://www.braden.com.au) | `d.braden.com.au` |
| **Throughput** | `throughput/` | React 19 + Vite + Groq | [ideas.crm7.app](https://ideas.crm7.app) | `d.ideas.crm7.app` |

### Shared `@bsuite/*` packages (published to npm, NOT workspace:*)

| Package | Latest | Consumers |
|---------|--------|-----------|
| `@bsuite/auth` | `0.2.4` | CRM7, Conduit, R80.4, Braden, Throughput, BSU |
| `@bsuite/charge-calc` | `0.4.0` | CRM7, R80.4 |
| `@bsuite/nav-core` | `0.7.0` | all 6 apps |
| `@bsuite/page-builder` | `0.9.0` | BSU, CRM7, Conduit, R80.4, braden, Throughput |
| `@bsuite/schema-builder` | `0.7.0` | BSU, CRM7, Conduit, R80.4 |
| `@bsuite/schema-registry` | `0.3.2` | all 6 apps |
| `@bsuite/data-export` | `0.1.4` | CRM7, R80.4, BSU |
| `@bsuite/dates` | `0.1.0` | all 6 apps |
| `@bsuite/theme` | `0.3.3` | CRM7, R80.4, BSU, Conduit, Throughput |
| `@bsuite/ui` | `0.2.0` | R80.4, BSU, Throughput |
| `@bsuite/dry-lint` | `0.4.0` | all 6 apps (devDep) |

_Last suite-wide bump: 2026-06-01 (PRs crm7#932, R80.3#297 — R80.3's own PR number, historical; renamed R80.4 2026-08-06 — braden#312, BSU#531, conduit#297, throughput#199, bsuite#1340)._

Vercel clones only the individual submodule repo → `workspace:*` and `file:../packages/*` both break. Always use caret npm ranges (`^0.1.0`). After editing a package: build → bump → merge the package release workflow to `main` → publish via npm Trusted Publishers (GitHub Actions OIDC, no `NPM_TOKEN`) → bump consumers.

### Suite-wide over-deliveries vs. typical GTO software

Five capabilities exceed anything in Codehouse Workforce One / OTS — surfaced because `docs/` and several submodule READMEs historically under-described them (see `docs/CONSISTENCY-REPORT.md` § Codehouse parity audit):

1. **BOOT Assessment Engine** (`@bsuite/charge-calc/boot`) — Fair Work Act s.193 BOOT with comparator, failure detector, GTO variant, F17 export, annual value calculator. 10 test files. No Codehouse equivalent.
2. **20-component AI Assistant suite** in CRM7 (`src/components/ai/`) — `AICommandPalette` (Cmd+K), `AISidePanel`, plugin system, Vercel AI SDK 6 streaming. Plus Conduit `/api/ai/chat` (Anthropic + Google) and Throughput Groq GPT-OSS-120B with browser search + Python execution.
3. **Visual schema builder** (`@bsuite/schema-builder` v0.7.1) — React Flow ER editor with real-time Supabase sync, used in CRM7, BSU, Conduit, R80.4 (11 test files).
4. **Offline-first PWA** in CRM7 — `src/lib/sqlite-db.ts` (sql.js WASM) + `sync-service.ts` (bi-directional Supabase sync with conflict resolution) + `offline-db.ts` (IndexedDB via `idb`).
5. **Multi-tenant sub-organisation hierarchy + runtime OKLCH branding** in BSU (`src/pages/Admin/SubOrganizations.tsx`, `BrandingProvider`) — parent/child tenant trees and per-tenant branding inside one OAuth authority.

### BS OAuth Client IDs (registered with the BSU OAuth server)

| App | Client ID | OAuth client file |
|-----|-----------|-------------------|
| CRM7 | `30f76744-3e0b-40bf-abb8-8c587389802e` | `crm7/src/lib/business-suite-oauth.ts` |
| R80.4 *(client ID unverified — see banner)* | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `R80.4/src/lib/business-suite-oauth.ts` |
| Braden | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `braden/src/lib/business-suite-oauth.ts` |
| Throughput | `35f0db49-ef62-4115-baba-7b961f034cc3` | `throughput/src/lib/business-suite-oauth.ts` |
| Conduit | `da925c19-8f32-40a0-b74d-4eb9540c422f` | `conduit/src/lib/business-suite-oauth.ts` |

### Data flow

- **Supabase** (`tuybltdrdefjblnplpqo`): auth, Postgres, Storage, Edge Functions, Realtime — shared across all 6 apps
- **BSU** = OAuth 2.1 server (consent screen at `/oauth/consent`); the other 5 apps are PKCE clients via `@bsuite/auth`
- **Cross-app SSO** = OIDC silent re-auth (`prompt=none`), NOT cookies — works across any TLD
- **DRY one-shot:** each entity has exactly ONE owning app for CRUD; others read via Supabase and link

## Conventions

### Code

- TypeScript **strict** mode; no untyped `any`
- **No-Regex-by-Default:** only anchored literals ≤30 chars; use parsers (URL, Zod, date-fns) for structured data
- Barrel exports for directories with 3+ exports
- React 19 across all apps; shared `@bsuite/*` packages must be bumped in the same or next PR when consumer React bumps (CI enforces).
- Tailwind v4: use `shrink-0` not `flex-shrink-0`; arbitrary z-index utilities must be `z-[N]` literal (safelist not generated otherwise)
- **crm7 AI Gateway:** default `xai/grok-4.20-reasoning`, fallback `anthropic/claude-sonnet-4.6`, complex `anthropic/claude-opus-4.6` — never downgrade without explicit user approval.
- **Protected files:** each app has protected files (auth/supabase/calc-engine) listed in `<app>/CONTRIBUTING.md` — check before editing.

### Commits

Conventional Commits — see AGENTS.md.

### Testing

- Vitest in every app; co-located `*.test.ts` / `*.spec.ts`
- 70% minimum coverage on critical paths (calc engine, auth, AI)

### Theme

- **D2C Neon Electric** (business-suite-unified, crm7, conduit, R80.4): Electric Blue `#2563eb`, Cyan `#00cec9`, dark navy `#0a0e1a`
- **Corporate** (braden only): Braden Red `#ab233a`, Gold `#cbb26a` — never apply D2C here

### Auth (see `AUTH_CANONICAL.md` — DO NOT REVERT)

- **Forbidden:** `cookieStorage`, `domain=.crm7.app`, `storageKey: 'business_suite_auth'` — removed 2025-02-27
- **Required:** per-domain `localStorage`, `flowType: 'pkce'`, verify via `supabase.auth.getClaims()` (never `getSession()` for auth decisions)
- **Mandatory OAuth providers (exactly TWO, suite-wide):** Google + Microsoft (`azure`). **GitHub is intentionally disabled** — do not re-add. Both modals must match; order Google → Microsoft.
- **BS OAuth → Supabase bridge:** after callback, call `supabase.auth.setSession({access_token, refresh_token})` or PostgREST drops to anon (RCA 2026-05-06)

### Docs naming

`YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md` (W=Working, D=Draft, R=Review, A=Approved, F=Frozen).

## Gotchas

1. **Lockfiles:** regenerate outside bsuite tree (see Quickstart) — lockfiles with `..` importers ⇒ Vercel `ERR_PNPM_OUTDATED_LOCKFILE`
2. **Migrations:** never `supabase db push` locally against prod — use PR+CI or MCP `apply_migration` only. Name the recorded migration to match the file path.
3. **RLS policies:** the 5 tenant/user_tenants policies must stay `{authenticated}`, never `{public}` — ship-all-apps cron auto-repairs + files issues
4. **Mixed render roots:** `<main>` is implicitly `role=main` — never add `role="main"`. Sticky elements require no `overflow:hidden` on any ancestor up to the scroll container.
5. **AI SDK (crm7 is canonical):** always use `DefaultChatTransport` + `toUIMessageStreamResponse()` + `convertToModelMessages()`. `UIMessage` content lives in `parts[]`, never `.content`. Set `maxDuration = 30` + rate limiting on every AI route.
6. **Google APIs:** WIF only (pool `supabase-edge-functions`, provider `supabase-auth`) — service account JSON keys are BANNED
7. **Preview aliases:** only `d.<app>.crm7.app` / `d.braden.com.au` are in Supabase's redirect allowlist. Feature-branch `*.vercel.app` URLs are NOT — merge to `development` or add a one-off PR to ADR-0004.
8. **Parent branch:** working branch is `development` everywhere (most apps default to `main`, BSU defaults to `master`)
9. **Memory API:** write to `bsuite_session_latest_v2` — `bsuite_session_latest` PUTs return HTTP 500 (server-side bug, 2026-05-04)

## Global MCP servers (`~/.agents/mcp.json`)

Verified present: `ag-mcp`, `context7`, `filesystem` (scoped to `~/Desktop/Dev`, `~/Documents`, `~/Downloads`), `google-developer-knowledge`, `memory`, `next-devtools`, `perplexity-ask`, `playwright`, `puppeteer`, `shadcn`, `stripe`, `supabase`, `tavily`, `twentyfirst-magic`, `vercel`.
