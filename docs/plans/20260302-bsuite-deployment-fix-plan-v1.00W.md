# BSuite Deployment Fix — Cascade Validation & Infrastructure Plan

Cascade owns conduit infrastructure fixes, toolchain alignment for the parent repo, and post-push deployment validation for all 5 projects. CC1 (R80.3 + braden + packages/) and CC2 (BSU + crm7 + conduit submodule migration) handle the rest.

---

## Architecture (Confirmed)

All Vercel projects deploy from the **parent bsuite repo** with rootDir overrides → `../packages/*` workspace resolution **works**. No local charge-calc copies needed.

```
bsuite/ (GaryOcean428/bsuite)        ← ALL Vercel projects source from here
├── conduit/          INLINE (needs submodule migration — CC2)
├── crm7/             SUBMODULE → GaryOcean428/crm7
├── R80.3/            SUBMODULE → GaryOcean428/R80.3
├── braden/           SUBMODULE → GaryOcean428/braden
├── business-suite-unified/  SUBMODULE → GaryOcean428/business-suite-unified
└── packages/
    ├── charge-calc/  CANONICAL — workspace:* resolves from parent
    └── nav-core/     CANONICAL
```

## Root Causes of Deployment Failures

| # | Cause | Owner |
|---|-------|-------|
| 1 | **Vercel dashboard stale**: BSU configured for Node 22 + `npm install` | User (manual) |
| 2 | **pnpm version mismatch**: 10.29.3 / 10.30.2 mixed, target 10.30.3 | All agents |
| 3 | **Conduit missing**: no vercel.json, no .node-version, no engines | Cascade |
| 4 | **charge-calc no build step**: ships raw .ts, may fail in Vercel | CC1 |
| 5 | **braden legacy yarn artifacts**: .yarn/ dir, VERCEL_MANUAL_ACTION_REQUIRED.md | CC1 |
| 6 | **AppSwitcher stale URLs**: crm7.crm7.app → crm.crm7.app | CC2 |
| 7 | **CRM7 charge-calc ref**: `file:../packages/charge-calc` → normalize to `workspace:*` | CC2 |
| 8 | **Supabase client version spread**: 2.39.7 → 2.97.0 across projects | CC1+CC2 |

## Target Versions

| Tool | Version | Where |
|------|---------|-------|
| Node | `24` | `.node-version` (Vercel reads major only) |
| engines | `>=24.0.0` | `package.json` |
| pnpm | `10.30.3` | `packageManager` field |
| npm | `11.9.0` | system-level |
| Python | N/A | No Python deps in any project |
| uv | N/A | No Python deps |

---

## Agent Assignment & File Ownership

### Cascade (Windsurf) — Conduit infra + validation

**Scope**: conduit/ (inline), parent repo root files, deployment validation.

| ID | Task | Files |
|----|------|-------|
| C1 | Create `conduit/.node-version` = `24` | `conduit/.node-version` (NEW) |
| C2 | Add `engines.node` to conduit package.json | `conduit/package.json` |
| C3 | Update conduit `packageManager` to `pnpm@10.30.3` | `conduit/package.json` |
| C4 | Create `conduit/vercel.json` (Next.js config) | `conduit/vercel.json` (NEW) |
| C5 | Fix conduit AppSwitcher URL: `crm7.crm7.app` → `crm.crm7.app` | `conduit/src/components/AppSwitcher.tsx` |
| C6 | Validate `pnpm install && pnpm build` for conduit | terminal |
| C7 | Validate `pnpm typecheck` for conduit | terminal |
| C8 | Update root AGENTS.md toolchain versions | `AGENTS.md` |
| C9 | **Post-push**: Verify all 5 Vercel deployments succeed | Vercel dashboard |
| C10 | **Post-push**: Smoke test deployed URLs (HTTP 200) | browser |
| C11 | **Post-push**: Cross-domain SSO test | browser |

### CC1 — R80.3 + braden + packages/

| ID | Task |
|----|------|
| CC1-1 | R80.3 + braden: `packageManager` → `pnpm@10.30.3` |
| CC1-2 | charge-calc: add build step (tsconfig.build.json → dist/) |
| CC1-3 | nav-core: add build step (same pattern) |
| CC1-4 | braden: delete `.yarn/`, `VERCEL_MANUAL_ACTION_REQUIRED.md` |
| CC1-5 | R80.3: fix CORS whitelist in edge functions |
| CC1-6 | R80.3 + braden: `pnpm install && build:noprerender && test` |
| CC1-7 | Push submodules, update parent refs |
| CC1-8 | Resume remaining sweep items |

### CC2 — BSU + crm7 + conduit submodule

| ID | Task |
|----|------|
| CC2-1 | BSU + crm7: `packageManager` → `pnpm@10.30.3` |
| CC2-2 | crm7: normalize `file:../packages/charge-calc` → `workspace:*` |
| CC2-3 | **Conduit submodule migration**: create GitHub repo, extract, add to .gitmodules |
| CC2-4 | BSU + crm7: fix AppSwitcher URLs (crm7.crm7.app → crm.crm7.app) |
| CC2-5 | BSU: fix sessionHandoff.ts URL |
| CC2-6 | CRM7: fix Stripe redirect URL in create-subscription edge fn |
| CC2-7 | BSU: fix CORS whitelist in edge functions |
| CC2-8 | Create .vercelignore for BSU |
| CC2-9 | Create conduit jest.config.ts + jest.setup.ts |
| CC2-10 | All 3 projects: `pnpm install && build && test` |
| CC2-11 | Push submodules, update parent refs |

---

## Execution Phases

```
Phase 0: USER — Fix Vercel dashboard settings (Node 24, pnpm, install commands)
         USER — Remove braden ENABLE_EXPERIMENTAL_COREPACK env var from Vercel
   ↓
Phase 1: Cascade — C1-C8 (conduit infra + toolchain)     ← START NOW
   │     CC1 — CC1-1 through CC1-6 (R80.3/braden/packages)
   │     CC2 — CC2-1 through CC2-10 (BSU/crm7/conduit migration)
   ↓
Phase 2: CC1 — Push (CC1-7)
   │     CC2 — Push (CC2-11)
   │     Cascade — Push conduit changes + parent repo
   ↓
Phase 3: Cascade — Deployment validation (C9-C11)
   ↓
Phase 4: All agents — Resume feature work
```

## Cascade Validation Checklist (Phase 3)

For each of the 5 projects, after all agents push:

1. Vercel build log — no errors, correct Node version, pnpm install
2. Deployment status — "Ready" state
3. HTTP 200 on production URLs:
   - `https://suite.crm7.app` (BSU)
   - `https://crm.crm7.app` (CRM7)
   - `https://r8.crm7.app` (R80.3)
   - `https://www.braden.com.au` (braden)
   - `https://conduit.crm7.app` (conduit — URL TBC after Vercel project creation)
4. Cross-domain SSO: login at suite → navigate to crm → still authenticated
5. AppSwitcher: CRM7 link → `crm.crm7.app` (not `crm7.crm7.app`)
6. `packageManager` field = `pnpm@10.30.3` in all 5 package.json files
7. `.node-version` = `24` in all 5 projects

## User Manual Actions Required

Before agents can validate deployments:

1. **Vercel Dashboard → BSU**: Change Node to 24.x, install command to `corepack enable && pnpm install`
2. **Vercel Dashboard → braden**: Remove `ENABLE_EXPERIMENTAL_COREPACK` env var from all environments
3. **Vercel Dashboard**: Create conduit project (after CC2 creates the GitHub repo)

---

## conduit/vercel.json (Cascade will create)

```json
{
  "version": 2,
  "framework": "nextjs",
  "installCommand": "corepack enable && pnpm install",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```
