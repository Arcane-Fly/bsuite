# 20260506 — Codehouse Parity Sub-Plans

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Sub-plans of the parent index [`../20260506-codehouse-parity-and-platform-360-v1.00W.md`](../20260506-codehouse-parity-and-platform-360-v1.00W.md). Each portal sub-plan defines roles, source-routes, parity matrix coverage, and the WS-D Platform-360 capability gap closure for that surface.

**Permissions baseline:** [`../../../AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md) — OAuth 2.1 PKCE + JWKS + Supabase RLS. **No new RBAC/ABAC framework** is introduced by these plans.

**Status codes:** W=Working, D=Draft, R=Review, A=Approved, F=Frozen.

## Active sub-plans

| File | Type | Owner App | Description |
|------|------|-----------|-------------|
| [`20260506-portal-bsu-admin-v1.00W.md`](./20260506-portal-bsu-admin-v1.00W.md) | portal-sub-plan | business-suite-unified | Platform admin portal — OAuth server, tenant lifecycle, sub-organisation hierarchy, runtime OKLCH branding, `/dev/feature-builder` (WS-E). |
| [`20260506-portal-bsu-tenant-admin-v1.00W.md`](./20260506-portal-bsu-tenant-admin-v1.00W.md) | portal-sub-plan | business-suite-unified | Tenant-scoped admin portal — per-tenant user/role management, branding, billing, sub-organisation tree, feature flags. |
| [`20260506-portal-conduit-candidate-v1.00W.md`](./20260506-portal-conduit-candidate-v1.00W.md) | portal-sub-plan | conduit | Candidate self-service portal — apply, track applications, schedule interviews, sign offers, complete onboarding. |
| [`20260506-portal-conduit-careers-v1.00W.md`](./20260506-portal-conduit-careers-v1.00W.md) | portal-sub-plan | conduit | Public unauthenticated careers / job-board portal — search, view detail, apply (anonymous → candidate on submit). |
| [`20260506-portal-conduit-employer-v1.00W.md`](./20260506-portal-conduit-employer-v1.00W.md) | portal-sub-plan | conduit | Employer (host / client) portal — submit job orders, review candidates, approve placements, sign timesheets at host level. |
| [`20260506-portal-conduit-recruiter-v1.00W.md`](./20260506-portal-conduit-recruiter-v1.00W.md) | portal-sub-plan | conduit | Recruiter dashboard — candidate pipeline, drag-and-drop kanban, interview scheduling, offers, ATS reporting. |
| [`20260506-portal-crm7-internal-v1.00W.md`](./20260506-portal-crm7-internal-v1.00W.md) | portal-sub-plan | crm7 | Internal portal for consultants/coordinators/payroll officers — timesheets, placements, pay-item groups, BOOT compliance, AI assistant, offline-first PWA. |
| [`20260506-portal-r80-3-calculator-v1.00W.md`](./20260506-portal-r80-3-calculator-v1.00W.md) | portal-sub-plan | R80.3 | Wage calculator portal — apprentice wage / charge / margin / BOOT preview. Compliance-critical (Fair Work Act). Reader-only on CRM7-owned apprentice records. |
| [`20260506-portal-braden-marketing-v1.00W.md`](./20260506-portal-braden-marketing-v1.00W.md) | portal-sub-plan | braden | Corporate marketing site (braden.com.au) — public CMS-driven content + CSP-hardened. Corporate red/gold branding — D2C theme NOT applied. |
| [`20260506-visual-feature-builder-spec-v1.00W.md`](./20260506-visual-feature-builder-spec-v1.00W.md) | spec | business-suite-unified | WS-E spec for the dev-account-only `/dev/feature-builder` route in BSU. Three panels (Entity / Page / AI). Output is a "feature bundle" exported as a PR. |

## Cross-references

- Parent plan: [`../20260506-codehouse-parity-and-platform-360-v1.00W.md`](../20260506-codehouse-parity-and-platform-360-v1.00W.md)
- Master roadmap: [`../../20260227-bsuite-master-roadmap-v5.00W.md`](../../archive/README.md) *(archived — was `20260227-bsuite-master-roadmap-v5.00W.md`)* — Cross-Project Initiatives § Codehouse Parity & Platform 360
- Auth doctrine: [`../../../AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md)
- Red-team doctrine: [`../../20260507-red-team-ux-doctrine-v1.00A.md`](../../20260507-red-team-ux-doctrine-v1.00A.md)
- Uplift design language: [`../uplift/20260507-bsuite-uplift-design-language-v1.00A.md`](../uplift/20260507-bsuite-uplift-design-language-v1.00A.md)
- Refined-prompt provenance: `../codehouse-parity/inputs/` (parity matrix workpapers, out-of-repo)
