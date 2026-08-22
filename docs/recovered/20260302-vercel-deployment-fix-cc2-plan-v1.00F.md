---
kind: record
authority: none
owner: bsuite-lane
verdict: delivered
---

<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED
>
> The 2026-03-02 Vercel deployment breakage (stale dashboard settings, Node version drift, pnpm
> mismatch, Conduit missing `vercel.json`, hardcoded URLs) is long resolved — all six apps deploy
> from CI today, and the estate has since moved through several further deployment hardening
> passes.
>
> **Do not re-apply the specific remedies below.** They target a 2026-03 toolchain: Node and pnpm
> floors, Supabase client versions and build commands have all moved since. Current deployment
> doctrine lives in `AGENTS.md` and the `vercel-ops` skill.
>
> **Marker defect:** `W` on delivered work; also a session-scoped coordination doc ("CC1 handles
> R80.3 … zero file overlap") whose partner session no longer exists.

---

# CC2: Vercel Deployment Fix — BSU, CRM7, conduit

**Session**: Claude Code 2
**Owns**: business-suite-unified, crm7, conduit
**Branch**: `development`
**Coordination**: CC1 handles R80.3, braden, packages/ — zero file overlap

---

## Context

Vercel deployments on `development` are failing. Root causes: stale dashboard settings (BSU shows Node 22 + `npm install`!), pnpm version mismatch, conduit missing vercel.json, inconsistent Supabase client versions, wrong hardcoded URLs. This plan is one half of a two-session parallel fix.

### Target Versions
- Node: `24` in .node-version, `>=24.0.0` in engines
- pnpm: `10.30.3`
- TypeScript: `~5.7.3`
- @supabase/supabase-js: `^2.98.0` (align with CC1's R80.3)

### CRITICAL: BSU Vercel Dashboard is STALE
BSU's `.vercel/project.json` shows:
```json
{
  "installCommand": "npm install",     // WRONG — should be "corepack enable && pnpm install"
  "nodeVersion": "22.x",              // WRONG — should be 24.x
  "buildCommand": "tsc -b && vite build"  // WRONG — should be "pnpm run build:noprerender"
}
```
These MUST be fixed in the Vercel dashboard before deployment will succeed.

---

## Phase 0: Pre-Flight

### 0.1 Verify Git State
```bash
cd /home/braden/Desktop/Dev/bsuite
git status && git submodule status
```

### 0.2 Verify Vercel Dashboard (Playwright MCP) — CRITICAL
For ALL three projects (BSU, CRM7, conduit):
- [ ] **Node version** = 24.x (BSU currently at 22.x!)
- [ ] **Install command** = `corepack enable && pnpm install` (BSU currently at `npm install`!)
- [ ] **Build command** = as specified in each vercel.json
- [ ] **Root directory** = correct submodule path within bsuite parent repo
- [ ] **Framework** = Vite (BSU, CRM7) / Next.js (conduit)

### 0.3 Conduit Submodule Status
Conduit is NOT yet a git submodule — it's directly tracked in the bsuite repo. For Vercel deployment:
- Option A: Create GitHub repo `GaryOcean428/conduit`, extract, add as submodule
- Option B: Keep in-repo and set Vercel project to use bsuite repo with rootDir `conduit/`
- **Recommend Option B** for now — simpler, matches how other projects deploy

---

## Phase 1: Version Alignment

### 1.1 business-suite-unified/package.json
- Set `"packageManager": "pnpm@10.30.3"` (currently 10.29.3)
- Update `"typescript": "~5.7.3"` in devDependencies (currently ~5.6.2)
- Update `"@supabase/supabase-js": "^2.98.0"` (currently ^2.56.0)

### 1.2 crm7/package.json
- Set `"packageManager": "pnpm@10.30.3"` (currently 10.29.3)
- Update `"typescript": "~5.7.3"` in devDependencies (currently ~5.6.3)
- Update `"@supabase/supabase-js": "^2.98.0"` (currently ^2.75.0)
- **Change**: `"@bsuite/charge-calc": "file:../packages/charge-calc"` → `"@bsuite/charge-calc": "workspace:*"`

### 1.3 conduit/package.json — DEFERRED TO CASCADE
Cascade (Windsurf) owns conduit infrastructure tasks (C1-C7):
- `packageManager`, `engines`, `.node-version` → Cascade C2, C3, C1
- CC2 handles ONLY: Supabase version bump, `@supabase/ssr` update, eslint-config-next alignment
- Update `"@supabase/supabase-js": "^2.98.0"` (currently ^2.49.1)
- Update `"@supabase/ssr"` to latest compatible (currently ^0.5.2)
- **Do NOT touch**: `packageManager`, `engines`, `.node-version` (Cascade owns these)

### Verification
```bash
grep packageManager business-suite-unified/package.json crm7/package.json conduit/package.json
grep -r supabase business-suite-unified/package.json crm7/package.json conduit/package.json | grep version
```

---

## Phase 2: Structural Fixes (BLOCKERS)

### 2.1 Create conduit/vercel.json — DEFERRED TO CASCADE

Cascade owns this (task C4). Do NOT create this file.

### 2.2 Create conduit test config — DEFERRED TO CASCADE

Cascade may handle test config as part of conduit infra. CC2 should NOT create jest.config.ts or jest.setup.ts.

### 2.3 Fix CRM7 Stripe fallback URLs
**File:** `crm7/supabase/functions/create-subscription/index.ts`

Find and replace ALL occurrences:
- `pj11b73dgt69.space.minimax.io` → `crm.crm7.app`

Also check for compiled `.js` version in same directory.

**Verification:** `grep -rn minimax crm7/supabase/functions/create-subscription/`

### 2.4 Fix AppSwitcher URLs (4 files)

**Change in ALL:** `crm7.crm7.app` → `crm.crm7.app`

1. `business-suite-unified/src/components/AppSwitcher.tsx` (line ~43)
2. `business-suite-unified/src/lib/sessionHandoff.ts` (line ~46)
3. `crm7/src/components/AppSwitcher.tsx` (line ~40)
4. ~~`conduit/src/components/AppSwitcher.tsx`~~ — **CASCADE owns this (task C5)**

**Verification:** `grep -rn 'crm7\.crm7\.app' business-suite-unified/src/ crm7/src/ conduit/src/`

### 2.5 Create .vercelignore for BSU (NEW)
**File:** `business-suite-unified/.vercelignore`
```
node_modules
.pnpm-store
.env.local
.env.*.local
dist
.vscode
.idea
*.swp
.DS_Store
docs
*.md
!README.md
**/*.test.*
**/*.spec.*
coverage
.tmp
```

### 2.6 Fix CORS whitelist in BSU edge functions (3 files)
Add production origins to ALLOWED_ORIGINS in:
1. `business-suite-unified/supabase/functions/calendar-integration/index.ts`
2. `business-suite-unified/supabase/functions/oauth-microsoft-email/index.ts`
3. `business-suite-unified/supabase/functions/oauth-google-email/index.ts`

Production origins to add:
```typescript
"https://suite.crm7.app",
"https://crm.crm7.app",
"https://r8.crm7.app",
"https://conduit.crm7.app",
"https://www.braden.com.au",
```

### 2.7 Fix conduit eslint-config-next version mismatch
**File:** `conduit/package.json`
- `"eslint-config-next": "15.1.6"` → `"eslint-config-next": "^16.0.0"` (or latest compatible with Next.js 16)
- If no v16 exists, install `@next/eslint-plugin-next` directly

---

## Phase 3: Dependency Updates

### Red-Team Rules
- Use `pnpm update` (semver), NOT `pnpm update --latest`
- Preserves React 18 in BSU and CRM7, React 19 in conduit
- Do NOT delete pnpm-lock.yaml — incremental update only
- Supabase MUST match CC1's R80.3 target (~2.98.x)

### 3.1 Update BSU
```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
pnpm update
pnpm run typecheck
```

### 3.2 Update CRM7
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm update
pnpm run typecheck
```

### 3.3 Update conduit
```bash
cd /home/braden/Desktop/Dev/bsuite/conduit
pnpm update
pnpm run typecheck
```

---

## Phase 4: Build Verification

### 4.1 Full build + test for all CC2 projects
```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && pnpm run build:noprerender
cd /home/braden/Desktop/Dev/bsuite/crm7 && pnpm run build:noprerender && pnpm test
cd /home/braden/Desktop/Dev/bsuite/conduit && pnpm run build
```

### Go/No-Go Gate
- [ ] CRM7: 1,707 tests passing
- [ ] All 3 builds exit 0
- [ ] No TypeScript errors

**STOP if any build fails. Do not proceed to commit.**

---

## Phase 5: Commit + Push (CC2 goes AFTER CC1)

**Wait for CC1 to push first** (submodule pointers + packages must be updated first).

### 5.1 Commit submodules
```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
git add -A
git commit -m "chore(bsu): align pnpm 10.30.3, TS 5.7.3, Supabase ^2.98, fix AppSwitcher URL, add .vercelignore, fix CORS"
git push origin development

cd /home/braden/Desktop/Dev/bsuite/crm7
git add -A
git commit -m "chore(crm7): align pnpm 10.30.3, TS 5.7.3, Supabase ^2.98, workspace:* charge-calc, fix Stripe URLs, fix AppSwitcher"
git push origin development
```

### 5.2 Commit parent repo (conduit + submodule pointers)
```bash
cd /home/braden/Desktop/Dev/bsuite
git add conduit/ business-suite-unified crm7
git commit -m "chore: CC2 deployment fix — conduit vercel.json, version alignment, URL fixes"
git push origin development
```

---

## Phase 6: Deployment Validation (after BOTH CC1 and CC2 push)

Use Playwright MCP to verify:
- [ ] BSU Vercel build succeeds
- [ ] CRM7 Vercel build succeeds
- [ ] conduit Vercel build succeeds
- [ ] `https://suite.crm7.app` returns HTTP 200
- [ ] `https://crm.crm7.app` returns HTTP 200
- [ ] `https://conduit.crm7.app` returns HTTP 200
- [ ] Cross-domain SSO: login at suite.crm7.app → navigate to crm.crm7.app → still authenticated
- [ ] AppSwitcher: CRM7 link shows `crm.crm7.app` (not `crm7.crm7.app`)
- [ ] Stripe: test subscription flow redirects to correct domain

---

## Files Modified (CC2 ownership — no overlap with CC1)

| File | Action |
|------|--------|
| `business-suite-unified/package.json` | Edit: pnpm, TS, Supabase versions |
| `business-suite-unified/.npmrc` | Edit: remove legacy-peer-deps, shamefully-hoist |
| `business-suite-unified/.vercelignore` | NEW |
| `business-suite-unified/pnpm-lock.yaml` | Regenerated by pnpm update |
| `business-suite-unified/src/components/AppSwitcher.tsx` | Edit: crm7.crm7.app → crm.crm7.app |
| `business-suite-unified/src/lib/sessionHandoff.ts` | Edit: crm7.crm7.app → crm.crm7.app |
| `business-suite-unified/supabase/functions/calendar-integration/index.ts` | Edit: CORS origins |
| `business-suite-unified/supabase/functions/oauth-microsoft-email/index.ts` | Edit: CORS origins |
| `business-suite-unified/supabase/functions/oauth-google-email/index.ts` | Edit: CORS origins |
| `crm7/package.json` | Edit: pnpm, TS, Supabase, charge-calc workspace:* |
| `crm7/.npmrc` | Edit: remove legacy-peer-deps, shamefully-hoist |
| `crm7/pnpm-lock.yaml` | Regenerated by pnpm update |
| `crm7/src/components/AppSwitcher.tsx` | Edit: crm7.crm7.app → crm.crm7.app |
| `crm7/supabase/functions/create-subscription/index.ts` | Edit: minimax.io → crm.crm7.app |
| `conduit/package.json` | Edit: Supabase, ssr, eslint-config-next ONLY (Cascade owns packageManager/engines) |
| `conduit/.npmrc` | Edit: remove legacy-peer-deps, shamefully-hoist |
| `conduit/pnpm-lock.yaml` | Regenerated by pnpm update |
| ~~`conduit/.node-version`~~ | **CASCADE** (task C1) |
| ~~`conduit/vercel.json`~~ | **CASCADE** (task C4) |
| ~~`conduit/jest.config.ts`~~ | **CASCADE** (deferred) |
| ~~`conduit/jest.setup.ts`~~ | **CASCADE** (deferred) |
| ~~`conduit/src/components/AppSwitcher.tsx`~~ | **CASCADE** (task C5) |

---

## Red-Team Warnings for CC2

| Risk | Action |
|------|--------|
| **R-3**: Supabase v2.91.0 auth breaking change | Test OAuth login on BSU + CRM7 after update |
| **R-4**: eslint-config-next 15 vs Next.js 16 | Verify or update in Phase 2.7 |
| **R-6**: React 18→19 jump | Use `pnpm update` NOT `--latest` |
| **R-12**: SSO cookie compatibility | BSU + CRM7 + R80.3 must ALL be at same Supabase version |
| **R-17**: @supabase/ssr compatibility | Update ssr alongside supabase-js for conduit |
