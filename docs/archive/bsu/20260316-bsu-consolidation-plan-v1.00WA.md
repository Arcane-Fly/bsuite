# Business Suite Consolidation Plan

This document captures the proposed approach to consolidate the ecosystem:
- CRM7: choose a base and integrate features from ApprenticeTracker - **COMPLETED**: All consolidation finished.
- R8: produce a unified R8 app by merging the best parts of R80.1 and R80.3.
- Apply business-suite-devtools standards across repos.

## Inputs (detected under /external-apps)
- crm7 (Vite + React + Tailwind) - ✅ Active CRM application
- R80.3 (Vite + React + Tailwind) - ✅ Active R8 Calculator base
- throughput (Vite + React + Tailwind) - ✅ Active Throughput productivity app
# Note: R80.1 removed - features successfully consolidated into R80.3
# Note: ApprenticeTracker removed - features successfully consolidated into CRM7

Use scripts:
- node scripts/cross-repo-audit.cjs
- node scripts/plan-crm7.cjs
- node scripts/plan-r8.cjs

## Recommended Bases
- CRM7 Base: `crm7`
  - Rationale: Dedicated CRM7 app, closest to desired target. Integrate selected modules from ApprenticeTracker (workforce-hub features already consolidated into CRM7).
- R8 Base: `R80.3`
  - Rationale: Newer code and docs, clearer structure. Overlay improvements from `R80.1`.

## CRM7 Merge Plan
1. Create a new working directory or branch in the crm7 repo: `feature/consolidation`.
2. Apply devtools standards (see DevTools section below) to crm7 first.
3. Inventory features from ApprenticeTracker to import - **COMPLETED**: All useful ApprenticeTracker features have been successfully consolidated into CRM7.
   - Pages and Components to consider:
     - Pages: dashboard, analytics-like widgets, admin panels
     - Components: header/nav, auth-related UI, reusable inputs
4. Migrate in small PRs:
   - PR1: Devtools, linting, formatting, scripts
   - PR2: Routing unification and navigation shell
   - PR3: Import components
   - PR4+: Feature pages
5. Validate after each PR: build, lint, audit dependencies.

## R8 Merge Plan
1. Create an R8 working directory or branch using R80.3 as base: `feature/r8-consolidation`.
2. Compare `src` trees between R80.1 and R80.3 (see plan-r8 output):
   - Bring forward calculation core, any missing tests, and improved UX bits from R80.1.
3. Normalize naming to “R8” (v0.1 and v0.3 as historical versions in docs).
4. Prepare a standalone deploy target (Vercel) when ready.
5. Integration to CRM7: expose R8 route (e.g., /crm7/r8) and controllers if embedded, else deep-link from Unified.

## DevTools Standards (to apply in crm7 and R8)
- ESLint (typescript-eslint) strict type-check rules
- Prettier with project-wide formatting
- Husky + lint-staged: enforce lint and format on pre-commit
- Scripts: `lint`, `format`, `typecheck`, `test`
- CI: run `yarn install`, `yarn build`, `yarn lint` on PRs

## Unified App Adjustments
- CRM7 card and CTA now point to: `https://crm7.vercel.app/dashboard`
- “R8 Calculator” card present; will point to the standalone R8 once deployed
- Dashboard stats pull from `suite-dashbord` edge function (real data), with fallbacks

## Deliverables
- Consolidated CRM7: base `crm7` with integrated features as PRs
- Consolidated R8: base `R80.3` with `R80.1` improvements
- Devtools standards applied to both

## Next Steps
- Confirm business-suite-devtools repository import to adopt exact configs
- Execute PR sequence for CRM7 and R8 bases
- Set up Vercel deployment for R8 after consolidation