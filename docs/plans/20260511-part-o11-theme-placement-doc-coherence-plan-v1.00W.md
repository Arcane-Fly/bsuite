# Part O.11 Theme, Placement, and Docs Coherence Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Capture the canonical O.11 theming direction and the audit addendum that feeds O.11 theme centralisation, O.12 feature re-placement, and O.13 docs coherence.

**Architecture:** `@bsuite/theme@0.3.3+` is the theme source of truth. D2C apps use the Neon Electric OKLCH baseline; Braden uses a separate corporate OKLCH baseline with the same role/shadcn bridge shape. BSU owns tenant lifecycle, identity, billing, branding, enterprise white-label configuration, sub-organisation setup, cross-app notifications, and platform-admin tools.

**Tech Stack:** React 19, Tailwind v4 theme variables, OKLCH CSS colours, shadcn bridge variables, `@bsuite/theme`, Supabase tenant branding data, Playwright/axe for UI verification.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Mandatory Before Merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: both
- **Equivalence target**: BSU `/login`, `/billing`, `/settings` before/after screenshots plus token/output checks for `@bsuite/theme`
- **Cross red-team**: claude-code verifies evidence rows before flip-to-done
- **Skills to load**: `master-orchestration`, `bsuite-brand-system`, `best-practice-research`, `tailwind`, `shadcn-ui`, `playwright`, `qa-and-verification`, `verification-before-completion`
- **Self-report on divergence**: yes

## Execution Order

1. **O.11 POC first**: centralise theme + enterprise white-label runtime on BSU `/login`, `/billing`, and `/settings`.
2. **O.12 after O.11**: move the tenant/organisation setup wizard out of CRM7 and into BSU only after the white-label `BrandingProvider` exists, because that wizard configures enterprise branding.
3. **O.13 after audit evidence**: reconcile roadmap/docs contradictions and missing ownership entries discovered by the audit.

## Canonical Theme Rules

- D2C apps (`business-suite-unified`, `crm7`, `conduit`, `R80.3`, `throughput`) import `@bsuite/theme/preset-v4.css` and `@bsuite/theme/css`.
- Braden imports `@bsuite/theme/braden-css`, not `@bsuite/theme/css`.
- OKLCH source tokens are mandatory. Hex values are legacy references or browser fallbacks only.
- Consumers use role aliases and shadcn bridge variables; palette names are presentational, not the component contract.
- `--role-error` and `--role-destructive` are purple across both brands. Coral/red is not semantic error/destructive.
- Dark-surface text uses the anti-glare scale capped at `oklch(0.94 ... )`; pure white is not default text on dark surfaces.
- Tenant white-label overrides may change primary/accent/info/success/warning/neutral and logos. Error/destructive are platform-protected and not tenant-overridable.

## Perplexity Audit Addendum

Add these sections after existing audit section G and before output format.

### H. Feature-Placement Boundaries (Code-Level)

**Architectural rule to apply:**

- BSU owns tenant lifecycle, identity and SSO handoff, subscription/billing/plan tier, platform-level branding, enterprise white-label configuration UI, sub-organisation hierarchy setup, cross-app notification centre, and platform-admin tools.
- CRM7 owns apprentices, placements, host employers, charge-rate calculations via `@bsuite/charge-calc`, WHS, funding claims, compliance inspections, GTO-specific reporting, and domain-level role management inside a tenant.
- Conduit owns candidates, jobs, pipelines, recruitment workflows, and recruitment-domain Xero payroll integration.
- R80.3 owns the standalone charge-rate calculator UI.
- Braden is a marketing site and is out of feature-placement scope.
- Throughput purpose must be detected from its README and then classified.

**Known seed:** the organisation/tenant setup wizard currently appears from CRM7 for test tenants such as `braden.lang` and `caris`. Treat that as evidence of a leak only; do not treat those tenants as canonical examples.

Audit requirements:

- **H1:** For each app, list top-level routes from `App.tsx` or the Next `app/` directory and classify each as correctly placed, mis-placed with target app, or ambiguous.
- **H2:** For every mis-placed route, identify touched tables/RPCs, data scope, duplicate UI, and current-link breakage risk.
- **H3:** Search for duplicated tenant settings, billing, notification centre, user-management, branding upload, and tenant-configuration wizard flows. Report both paths with line references.
- **H4:** Confirm BSU implements each BSU-owned concern; flag missing features such as sub-organisation hierarchy setup.
- **H5:** Trace BSU to CRM7 to Conduit SSO/session handoff, including token/session/cookie path and file references.

### I. Documentation Coherence

Read the master roadmap, prompt reference, CRM7 page inventory, gap report, roadmap audit delta, and every doc whose filename contains `feature-`, `plan-`, `placement-`, or `scope-`.

Audit requirements:

- **I1:** List the docs read, including archived references when the active index points there.
- **I2:** For each feature/route mentioned, report whether the owning app is stated, whether two docs disagree, whether code is missing for documented features, and whether code exists without a documented plan.
- **I3:** Check roadmap version drift from v5.00W to the proposed v5.03W; list missing v5.01/v5.02 trails if absent.
- **I4:** Confirm Part O.1 through O.10 plus new O.11 are documented somewhere; list streams with no doc trail.
- **I5:** Search for the platform -> enterprise -> sub-org tenant hierarchy in docs and schema, including `parent_tenant_id` or equivalent migrations.

## Output Tables Required From The Audit

### O.11 Scope Input

Every P0/P1 finding from sections A-G that relates to theme, tokens, shadcn, OKLCH, white-label, logos, typography, or cross-cutting theme architecture must also appear here.

| Finding ID | Section | Short title | App(s) affected | Effort sense (S/M/L) |
|------------|---------|-------------|-----------------|----------------------|

Do not include P2 items.

### Mis-Placement Register

| Route/Feature | Current app | Target app | Data-scope (platform/tenant/domain) | Duplication? | Breakage risk if moved |
|---------------|-------------|------------|-------------------------------------|--------------|------------------------|

## What The Audit Must Not Do

- Do not propose the mechanism for moving mis-placed code. Identify what is mis-placed and where it should go; execution sequencing is separate.
- Do not treat `braden.lang` or `caris` as canonical tenants. Use them only as evidence that the wizard leak exists.
- Do not expand scope to apps outside this monorepo. The mobile app is out of scope unless it is a submodule in this checkout; detect and confirm.

## Task 1: O.11 BSU POC

**Files:**
- Modify: `packages/theme/src/css/vars.css`
- Modify: `packages/theme/src/css/braden.css`
- Modify: `packages/theme/src/react/BrandingProvider.tsx`
- Modify: `business-suite-unified/src/index.css`
- Test: `packages/theme/src/react/*.test.ts`

**Acceptance criteria:**
- BSU `/login`, `/billing`, and `/settings` consume role tokens only.
- Enterprise primary/accent/logo override affects one tenant and does not leak to another tenant.
- `--role-error` / `--role-destructive` stay purple and non-overridable.
- Before/after Playwright screenshots exist for mobile and desktop, light and dark.

## Task 2: O.12 Feature Re-Placement

**Files:**
- Inspect: `crm7/src/**`
- Inspect: `business-suite-unified/src/**`
- Inspect: `docs/plans/**`

**Acceptance criteria:**
- Tenant/organisation setup wizard has one BSU owner.
- CRM7 contains only GTO-domain setup concerns after the move.
- Links that previously opened the wizard redirect or hand off to the BSU owner route.

## Task 3: O.13 Docs Coherence

**Files:**
- Modify: `docs/20260227-bsuite-master-roadmap-v5.00W.md`
- Modify: `docs/plans/README.md`
- Modify: `docs/plans/STATUS.md`
- Modify: relevant per-app docs identified by the audit

**Acceptance criteria:**
- Part O.1 through O.13 have an indexed doc trail.
- Every platform-owned feature has BSU as owner.
- Every domain-owned feature has its domain app as owner.
- Contradictions have a chosen source of truth and archived superseded wording.
