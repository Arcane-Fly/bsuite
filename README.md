# bsuite — Business Suite Platform

Parent repository for the Business Suite platform. Each application lives in its own submodule with independent version control.

Current work and product acceptance live in the [BSuite Linear project](https://linear.app/braden-pty-ltd/project/bsuite-delivery-and-roadmap-806afbd51657). Read the [work-tracking contract](docs/20260924-linear-work-tracking-v1.00W.md) before interpreting GitHub merges or older roadmaps as completion. [BRA-46](https://linear.app/braden-pty-ltd/issue/BRA-46/centralize-bsuite-work-in-linear-and-retire-conflicting-tracking) tracks migration coverage and remaining source gaps.

## Submodules

| App | Repo | Description | URL |
|-----|------|-------------|-----|
| **CRM7** | `crm7/` | CRM & apprenticeship management | [crm.crm7.app](https://crm.crm7.app) |
| **Conduit** | `conduit/` | Recruitment ATS | [conduit.crm7.app](https://conduit.crm7.app) |
| **R8** | `R80.4/` | Calculation engine (charge rates, payroll) | [r8.crm7.app](https://r8.crm7.app) |
| **BSU** | `business-suite-unified/` | Admin dashboard & OAuth provider | [suite.crm7.app](https://suite.crm7.app) |
| **Braden** | `braden/` | Corporate website | [braden.com.au](https://www.braden.com.au) |
| **Throughput** | `throughput/` | Idea management platform (Groq AI assist) | [ideas.crm7.app](https://ideas.crm7.app) |

> **Where the suite over-delivers vs. typical GTO software** (cross-cuts multiple submodules — see [`docs/CONSISTENCY-REPORT.md`](docs/CONSISTENCY-REPORT.md) and [`docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md`](docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md)):
>
> 1. **BOOT Assessment Engine** (`@bsuite/charge-calc/boot`) — full Fair Work Act s.193 Better Off Overall Test (comparator, failure detector, GTO variant, F17 export).
> 2. **20-component AI Assistant suite** in CRM7 (`src/components/ai/`, Cmd+K palette, Vercel AI SDK 6); plus AI in Conduit (`/api/ai/chat`) and Throughput (Groq GPT-OSS-120B).
> 3. **Visual schema builder** (`@bsuite/schema-builder`) — React Flow ER editor with real-time Supabase sync, used by CRM7, BSU, Conduit, R80.4.
> 4. **Offline-first PWA** in CRM7 — SQLite WASM + IndexedDB + bi-directional Supabase sync with conflict resolution.
> 5. **Multi-tenant sub-organisation hierarchy + runtime OKLCH branding** in BSU (`src/pages/Admin/SubOrganizations.tsx`, `BrandingProvider`).

## Getting Started

```bash
# Clone with all submodules
git clone --recurse-submodules https://github.com/GaryOcean428/bsuite.git

# If already cloned without submodules
git submodule update --init --recursive

# Pull latest for all submodules
git submodule update --remote --merge
```

## Shared Configuration

- **Environment**: Root `.env.local` is the single source of truth for all Supabase credentials. Each submodule's `vite.config.ts` reads from `../` via `envDir`.
- **Supabase Project**: `tuybltdrdefjblnplpqo`
- **Package Manager**: pnpm (per-submodule)

## Testing

Each submodule uses Vitest for unit + integration tests. Run the suite from inside the submodule directory:

```bash
# All tests in the current submodule
pnpm exec vitest run

# Single file
pnpm exec vitest run src/lib/__tests__/foo.test.ts

# Pattern match (e.g. all auth tests)
pnpm exec vitest run --testNamePattern auth

# Watch mode for active development
pnpm exec vitest
```

### IDE sidebar caveat (tracked in [bsuite#606](https://github.com/GaryOcean428/bsuite/issues/606))

The Windsurf-Next "Vitest Explorer" VS Code extension (v1.50.4) is currently **incompatible with Vite 6** — it bundles `@vitejs/plugin-react@6.0.1` which imports `vite/internal` (a private subpath not exposed by Vite 6.4.2's `exports` map). Symptom:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './internal' is not defined by "exports" in vite/package.json
```

This is **not a BSuite bug** — the extension's bundled dependency is incompatible with our Vite version. **CLI vitest works perfectly**; use the commands above. The extension issue is tracked for monitoring; once Vitest Explorer ships a release with `@vitejs/plugin-react` 5.x or 6.0.2+, the IDE sidebar will work again.

## CI/CD

### Supabase Migrations (`.github/workflows/supabase-migrate.yml`)

Automatically applies database migrations when changes to any `*/supabase/migrations/` directory are pushed to `main`. Can also be triggered manually via workflow dispatch.

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database password for the linked project |

**Required GitHub Variables:**

| Variable | Description |
|----------|-------------|
| `SUPABASE_PROJECT_ID` | Project ref: `tuybltdrdefjblnplpqo` |

### Edge Function Deployment (`.github/workflows/supabase-functions-deploy.yml`)

Deploys edge functions when source files in any `*/supabase/functions/` directory change and are pushed to `main`. Includes a **CI guard** that queries the Supabase Management API after deployment and fails if any function still has a local-machine `entrypoint_path` (e.g. `file:///home/braden/...`).

**To re-deploy all functions at once** (e.g. to fix entrypoints deployed from a local machine):

1. Navigate to **Actions → Deploy Supabase Edge Functions**
2. Click **Run workflow**
3. Set `submodule` = `all`, `force_redeploy` = `true`
4. Click **Run**

This redeploys every function across all submodules and root, then verifies clean CI entrypoints.

**Webhook functions (`verify_jwt: false`):** Detected automatically from each submodule's `supabase/config.toml`. If the config marks a function with `verify_jwt = false`, the workflow passes `--no-verify-jwt` when deploying.

### Deployments

Each submodule deploys independently via Vercel Git Integration connected to its own repo. The parent repo does not trigger deployments — Vercel watches each submodule repo directly.

## Directory Structure

```
bsuite/
├── .env.local              # Shared environment variables (gitignored)
├── .github/workflows/      # CI/CD for the parent repo
├── crm7/                   # CRM7 submodule
├── conduit/                # Conduit recruitment ATS submodule
├── R80.4/                  # R8 calculation engine submodule
├── business-suite-unified/ # BSU admin dashboard submodule
├── braden/                 # Corporate website submodule
├── throughput/             # Throughput idea management platform submodule
├── mobile/                 # Mobile app workspace
├── packages/               # Shared @bsuite/* npm packages — see knowledge.md for the published set (auth, charge-calc, nav-core, page-builder, schema-builder, schema-registry, data-export, theme, ui)
├── docs/                   # Cross-project documentation
└── supabase/               # Shared Supabase config (if any)
```

All six apps (CRM7, Conduit, R80.4, BSU, Braden, Throughput) are registered as git submodules in [`.gitmodules`](.gitmodules).
