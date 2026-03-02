# CC1: Vercel Deployment Fix — R80.3, braden, packages/

**Session**: Claude Code 1 (this session)
**Owns**: R80.3, braden, packages/charge-calc, packages/nav-core
**Branch**: `development`
**Coordination**: CC2 handles BSU, CRM7, conduit — zero file overlap

---

## Context

Vercel deployments on `development` are failing. Root causes: stale dashboard settings (Node 22 + npm), pnpm version mismatch, charge-calc has no build step, inconsistent Supabase client versions, missing .vercelignore files. This plan is one half of a two-session parallel fix.

### Target Versions
- Node: `24` in .node-version, `>=24.0.0` in engines
- pnpm: `10.30.3`
- TypeScript: `~5.7.3`
- @supabase/supabase-js: `^2.98.0` (align with CC2's BSU + CRM7)

---

## Phase 0: Pre-Flight

### 0.1 Verify Git State
```bash
cd /home/braden/Desktop/Dev/bsuite
git status && git submodule status
```

### 0.2 Verify Vercel Dashboard (Playwright MCP)
For R80.3 and braden projects:
- [ ] Node version = 24.x
- [ ] Install command = `corepack enable && pnpm install`
- [ ] Build command matches vercel.json
- [ ] **braden**: Remove `ENABLE_EXPERIMENTAL_COREPACK=1` env var from ALL environments

### 0.3 Clean Up braden Yarn Artifacts
```bash
rm -rf /home/braden/Desktop/Dev/bsuite/braden/.yarn/
rm -f /home/braden/Desktop/Dev/bsuite/braden/.yarnrc.yml
rm -f /home/braden/Desktop/Dev/bsuite/braden/yarn.lock
rm -f /home/braden/Desktop/Dev/bsuite/braden/VERCEL_MANUAL_ACTION_REQUIRED.md
```

---

## Phase 1: Version Alignment

### 1.1 R80.3/package.json
- Set `"packageManager": "pnpm@10.30.3"`
- Update `"typescript": "~5.7.3"` in devDependencies
- Update `"@supabase/supabase-js": "^2.98.0"` (currently `^2.39.7` — 59 versions behind!)

### 1.2 braden/package.json
- Set `"packageManager": "pnpm@10.30.3"` (currently 10.30.2)

### 1.3 packages/charge-calc/package.json
- Update `"typescript": "~5.7.3"` in devDependencies

### 1.4 packages/nav-core/package.json
- Update `"typescript": "~5.7.3"` in devDependencies

### 1.5 .node-version files
- Verify `R80.3/.node-version` contains `24`
- Verify `braden/.node-version` contains `24`
- Update `braden/.nvmrc` to `24` if it exists

### Verification
```bash
grep packageManager R80.3/package.json braden/package.json packages/*/package.json
```

---

## Phase 2: Structural Fixes (BLOCKERS)

### 2.1 Add build step to packages/charge-calc

**Files to modify/create:**

`packages/charge-calc/package.json` — add build script, update exports:
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./types": { "import": "./dist/types.js", "types": "./dist/types.d.ts" },
    "./awards": { "import": "./dist/awards/index.js", "types": "./dist/awards/index.d.ts" },
    "./boot": { "import": "./dist/boot/index.js", "types": "./dist/boot/index.d.ts" }
  }
}
```

`packages/charge-calc/tsconfig.build.json` (NEW):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "noEmit": false
  },
  "include": ["src"],
  "exclude": ["src/__tests__"]
}
```

`packages/charge-calc/.gitignore` (NEW):
```
dist/
```

**Verification:**
```bash
cd packages/charge-calc && pnpm run build && ls dist/ && pnpm test
```

### 2.2 Add build step to packages/nav-core (same pattern)
- CSS exports stay pointing to `src/tokens/*.css` (no compilation needed)
- Only TypeScript files get compiled

### 2.3 Fix CORS whitelist in R80.3 edge functions
**File:** `R80.3/supabase/functions/get-fairwork-api-key/index.ts`

Add production origins to ALLOWED_ORIGINS:
```typescript
"https://r8.crm7.app",
"https://suite.crm7.app",
"https://crm.crm7.app",
"https://conduit.crm7.app",
"https://www.braden.com.au",
```

### 2.4 Create .vercelignore for R80.3 and braden
**New files:** `R80.3/.vercelignore`, `braden/.vercelignore`
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

---

## Phase 3: Dependency Updates

### Red-Team Rules
- Use `pnpm update` (semver), NOT `pnpm update --latest` — preserves React 18 in R80.3
- Do NOT delete pnpm-lock.yaml — incremental update only
- Supabase MUST match CC2's target (~2.98.x) for SSO cookie compatibility

### 3.1 Build charge-calc first (consumed by R80.3)
```bash
cd /home/braden/Desktop/Dev/bsuite/packages/charge-calc
pnpm install && pnpm run build
```

### 3.2 Update R80.3
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3
pnpm update
pnpm run typecheck
```

### 3.3 Update braden
```bash
cd /home/braden/Desktop/Dev/bsuite/braden
pnpm update
pnpm run typecheck
```

---

## Phase 4: Build Verification

### 4.1 Full build + test for all CC1 projects
```bash
cd /home/braden/Desktop/Dev/bsuite/packages/charge-calc && pnpm run build && pnpm test
cd /home/braden/Desktop/Dev/bsuite/packages/nav-core && pnpm run build
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm run build:noprerender && pnpm test
cd /home/braden/Desktop/Dev/bsuite/braden && pnpm run build:noprerender
```

### Go/No-Go Gate
- [ ] charge-calc: 637 tests passing
- [ ] R80.3: 230 tests passing
- [ ] All builds exit 0

**STOP if any build fails. Do not proceed to commit.**

---

## Phase 5: Commit + Push (CC1 goes FIRST)

### 5.1 Commit submodules
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3
git add -A
git commit -m "chore(r80): align pnpm 10.30.3, TS 5.7.3, Supabase ^2.98, add .vercelignore, fix CORS"
git push origin development

cd /home/braden/Desktop/Dev/bsuite/braden
git add -A
git commit -m "chore(braden): align pnpm 10.30.3, remove Yarn artifacts, add .vercelignore"
git push origin development
```

### 5.2 Commit parent repo (packages + submodule pointers)
```bash
cd /home/braden/Desktop/Dev/bsuite
git add packages/ R80.3 braden
git commit -m "chore: CC1 deployment fix — charge-calc build step, version alignment, CORS"
git push origin development
```

**Then signal CC2 to proceed with their commits.**

---

## Phase 6: Deployment Validation (after CC2 also pushes)

Use Playwright MCP to verify:
- [ ] R80.3 Vercel build succeeds
- [ ] braden Vercel build succeeds
- [ ] `https://r8.crm7.app` returns HTTP 200
- [ ] `https://www.braden.com.au` returns HTTP 200
- [ ] Cross-domain SSO: login at suite.crm7.app → navigate to r8.crm7.app → still authenticated

---

## Files Modified (CC1 ownership — no overlap with CC2)

| File | Action |
|------|--------|
| `R80.3/package.json` | Edit: pnpm, TS, Supabase versions |
| `R80.3/.node-version` | Verify: `24` |
| `R80.3/.npmrc` | Edit: remove legacy-peer-deps, shamefully-hoist |
| `R80.3/.vercelignore` | NEW |
| `R80.3/pnpm-lock.yaml` | Regenerated by pnpm update |
| `R80.3/supabase/functions/get-fairwork-api-key/index.ts` | Edit: CORS origins |
| `braden/package.json` | Edit: pnpm version |
| `braden/.node-version` | Verify: `24` |
| `braden/.npmrc` | Edit: remove legacy-peer-deps, shamefully-hoist |
| `braden/.vercelignore` | NEW |
| `braden/pnpm-lock.yaml` | Regenerated by pnpm update |
| `braden/.yarn/` | DELETE |
| `braden/.yarnrc.yml` | DELETE |
| `braden/VERCEL_MANUAL_ACTION_REQUIRED.md` | DELETE |
| `packages/charge-calc/package.json` | Edit: build script, exports, TS version |
| `packages/charge-calc/tsconfig.build.json` | NEW |
| `packages/charge-calc/.gitignore` | NEW |
| `packages/nav-core/package.json` | Edit: build script, exports, TS version |
| `packages/nav-core/tsconfig.build.json` | NEW |
| `packages/nav-core/.gitignore` | NEW |
