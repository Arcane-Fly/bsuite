# 2026-04-30 — References (Approved, Reference-Complete)

**Date:** 2026-04-30
**Trigger:** Comprehensive parent-and-submodule docs review (see `/tmp/bsuite-docs-archive-triage-2026-04-30.md`)
**Scope:** A-status / WA-status reference docs with no forward maintenance signals. Several explicitly marked ARCHIVED in their headers, several carry `superseded-by` pointers.

## Manifest

| File | Superseded by / Reason |
|---|---|
| `20260227-auth-map-reference-v1.00A.md` | Reference complete; living auth doctrine now in parent CLAUDE.md "Authentication & OAuth" section. |
| `20260227-bsuite-deep-audit-report-v1.00A.md` | One-shot audit report; findings rolled into `merged-execution-backlog`. |
| `20260227-dry-one-shot-architecture-v1.00A.md` | Superseded by `docs/20260227-dry-one-shot-architecture-v1.02A.md`. |
| `20260228-d2c-theme-specification-v1.00A.md` | Shipped in `@bsuite/theme@0.3.3`; spec is now the package source of truth. |
| `20260228-gto-standards-reference-v1.00A.md` | Reference complete; no forward maintenance. |
| `20260301-crm7-page-inventory-v1.00A.md` | Inventory snapshot; superseded by `crm7/src/config/navigation.ts`. |
| `20260301-crm7-rbac-matrix-v1.00A.md` | RBAC snapshot; superseded by code (`permissionConstants.ts`) + active gap docs. |
| `20260303-bsuite-competitive-landscape-v1.00A.md` | Competitive snapshot; reference complete. |
| `20260303-crm7a-executive-summary-v1.00WA.md` | ARCHIVED in header. |
| `20260303-crm7a-quick-reference-v1.00WA.md` | ARCHIVED in header. |
| `20260303-crm7a-repository-research-v1.00WA.md` | ARCHIVED in header. |
| `20260303-crm8u-code-snippets-v1.00A.md` | Reference complete; no forward maintenance. |
| `20260303-crm8u-github-research-v1.00A.md` | Reference complete; no forward maintenance. |
| `20260304-ram-credential-government-access-map-v1.00A.md` | Reference complete; live RAM impl reference is `crm7/supabase/functions/generate-document/index.ts`. |
| `20260310-fairwork-reference-v1.00A.md` | Reference complete; live integration is in R80.3 + CRM7 src. |
| `20260316-claude-code-prompts-reference-v1.00A.md` | Reference snapshot; superseded by living per-skill prompts. |
| `20260316-compliance-reference-v1.00A.md` | Reference complete; no forward maintenance. |
| `20260316-matrix-reference-v1.00A.md` | SUPERSEDED-BY in header. |
| `20260316-navigation-guide-v1.00A.md` | Superseded by `crm7/src/config/navigation.ts`. |
| `20260316-navigation-reference-v1.00A.md` | SUPERSEDED-BY in header. |
| `20260316-performance-report-v1.00A.md` | Performance snapshot; superseded by `20260407-core-web-vitals-baseline-v1.00A.md` (also archived in audits-closed wave). |
| `20260316-pricing-strategy-v1.00A.md` | Pricing strategy snapshot; reference complete. |
| `20260316-ui-reference-v1.00A.md` | Reference complete; superseded by `@bsuite/theme` + active D2C spec in CLAUDE.md. |

## What was NOT archived

Living references and active authority docs remain in place (see Phase-0 completion report and merged-execution-backlog at the parent docs root, plus `docs/adr/` for ADRs).
