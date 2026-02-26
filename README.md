# bsuite — Business Suite Platform

Parent repository for the Business Suite platform. Each application lives in its own submodule with independent version control.

## Submodules

| App | Repo | Description | URL |
|-----|------|-------------|-----|
| **CRM7** | `crm7/` | CRM & apprenticeship management | [crm.crm7.app](https://crm.crm7.app) |
| **R8** | `R80.3/` | Calculation engine (charge rates, payroll) | [r8.crm7.app](https://r8.crm7.app) |
| **BSU** | `business-suite-unified/` | Admin dashboard & OAuth provider | [suite.crm7.app](https://suite.crm7.app) |
| **Braden** | `braden/` | Personal site | [braden.com.au](https://www.braden.com.au) |

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
- **Package Manager**: Yarn 4.9.1 (per-submodule)

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

### Deployments

Each submodule deploys independently via Vercel Git Integration connected to its own repo. The parent repo does not trigger deployments — Vercel watches each submodule repo directly.

## Directory Structure

```
bsuite/
├── .env.local              # Shared environment variables (gitignored)
├── .github/workflows/      # CI/CD for the parent repo
├── crm7/                   # CRM7 submodule
├── R80.3/                  # R8 calculation engine submodule
├── business-suite-unified/ # BSU admin dashboard submodule
├── braden/                 # Personal site submodule
├── docs/                   # Cross-project documentation
└── supabase/               # Shared Supabase config (if any)
```
