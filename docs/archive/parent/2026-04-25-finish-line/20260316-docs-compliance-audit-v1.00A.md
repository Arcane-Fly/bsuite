# BSuite Documentation Compliance Audit

> **SUPERSEDED-BY:** Per-submodule `docs/OUTSTANDING.md` files (2026-04-23 reconciliation) + WS-H finish-line sweep (2026-04-25)
> **Archived:** 2026-04-25 (WS-H finish-line sweep)
> **Reason:** Mar 2026 audit found 80/375 docs compliant — that work has been carried out per submodule. Each project's `docs/OUTSTANDING.md` (2026-04-23) is now the per-scope authority. Retained for provenance only.

**Date:** 2026-03-16
**Standard:** `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`
**Reference:** `docs/20260227-contributing-standards-guide-v1.00W.md`
**Status:** Working (W)

## Exemptions

The following filenames are permanently exempt and must NEVER be renamed:

- `README.md`
- `CLAUDE.md`
- `AGENTS.md`
- `CONTRIBUTING.md`

---

## Compliance Summary

| Project | Total .md | Compliant | Non-Compliant | Exempt | Compliance % |
|---------|-----------|-----------|---------------|--------|--------------|
| bsuite root | 4 | 0 | 1 | 3 | 0% (1 actionable) |
| docs/ root | 29 | 9 | 20 | 1 | ~31% |
| docs/plans/ | 2 | 1 | 1 | 0 | 50% |
| crm7 root | 10 | 0 | 6 | 4 | 0% (6 actionable) |
| crm7/docs/ (non-archive) | 54 | ~50 | 4 | 4 | ~93% |
| R80.3 root | 6 | 0 | 2 | 4 | 0% (2 actionable) |
| R80.3/docs/ | 11 | 0 | 10 | 1 | 0% |
| braden root | 17 | 0 | 13 | 4 | 0% (13 actionable) |
| braden/docs/ | 16 | 1 | 15 | 1 | ~7% |
| conduit/docs/ | 3 | 2 | 0 | 1 | 100% |
| business-suite-unified root | 6 | 0 | 2 | 4 | 0% (2 actionable) |
| business-suite-unified/docs/ | 9 | 0 | 8 | 1 | 0% |
| **Overall** | **~389** | **~80** | **~82 actionable** | **~100** | **~21%** |

**Notes:**
- "Compliant" counts only files matching `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`
- "Exempt" counts `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`
- `conduit/docs/` is already 100% compliant — no action required
- crm7/docs/ subdirectories (architecture, deployment, guides, operations, reference, troubleshooting) are predominantly compliant; only 4 files in plans/ need action

---

## Full Action Plan

### Legend

| Action | Meaning |
|--------|---------|
| Move | Relocate file to a better-suited directory, renaming to comply |
| Rename | Rename in place to comply with standard |
| Rename (archive) | Rename and move to nearest `archive/` subdirectory |
| Move (archive) | Relocate to `archive/` subdirectory with compliant name |
| Rename+Update | Rename in place and update internal cross-references |
| Create | New file to be created (no existing source) |

---

### Action Table

| Project | Current Path | New Path | Action | Status |
|---------|-------------|----------|--------|--------|
| **bsuite root** | | | | |
| bsuite | `20260310-fairwork.md` | `docs/20260310-fairwork-reference-v1.00W.md` | Move | Pending |
| **docs/ root** | | | | |
| docs | `docs/AUTH-MAP.md` | `docs/20260227-auth-map-reference-v1.00W.md` | Rename | Pending |
| docs | `docs/DRY-ONE-SHOT-ARCHITECTURE.md` | `docs/20260227-dry-one-shot-architecture-v1.00W.md` | Rename | Pending |
| docs | `docs/CRM7A-EXECUTIVE-SUMMARY.md` | `docs/archive/20260303-crm7a-executive-summary-v1.00WA.md` | Rename (archive) | Pending |
| docs | `docs/CRM7A-QUICK-REFERENCE.md` | `docs/archive/20260303-crm7a-quick-reference-v1.00WA.md` | Rename (archive) | Pending |
| docs | `docs/CRM7A-REPOSITORY-RESEARCH.md` | `docs/archive/20260303-crm7a-repository-research-v1.00WA.md` | Rename (archive) | Pending |
| docs | `docs/claude-code-prompts.md` | `docs/20260316-claude-code-prompts-reference-v1.00W.md` | Rename | Pending |
| docs | `docs/compliance.md` | `docs/20260316-compliance-reference-v1.00W.md` | Rename | Pending |
| docs | `docs/matrix.md` | `docs/20260316-matrix-reference-v1.00W.md` | Rename | Pending |
| docs | `docs/mermaid-ui-builder.md` | `docs/20260316-mermaid-ui-builder-reference-v1.00W.md` | Rename | Pending |
| docs | `docs/navigation-guide.md` | `docs/20260316-navigation-guide-v1.00W.md` | Rename | Pending |
| docs | `docs/navigation.md` | `docs/20260316-navigation-reference-v1.00W.md` | Rename | Pending |
| docs | `docs/performance-report.md` | `docs/20260316-performance-report-v1.00W.md` | Rename | Pending |
| docs | `docs/pricing-strategy.md` | `docs/20260316-pricing-strategy-v1.00W.md` | Rename | Pending |
| docs | `docs/ui.md` | `docs/20260316-ui-reference-v1.00W.md` | Rename | Pending |
| docs | `docs/20260303-crm8u-code-snippets.md` | `docs/20260303-crm8u-code-snippets-v1.00W.md` | Rename | Pending |
| docs | `docs/20260303-crm8u-github-research.md` | `docs/20260303-crm8u-github-research-v1.00W.md` | Rename | Pending |
| docs | `docs/00-master-roadmap.md` | `docs/20260227-bsuite-master-roadmap-v5.00W.md` | Rename+Update | Pending |
| **docs/plans/** | | | | |
| docs/plans | `docs/plans/2026-03-11-d2c-theme-remediation.md` | `docs/plans/20260311-d2c-theme-remediation-plan-v1.00W.md` | Rename | Pending |
| **R80.3/docs/** | | | | |
| R80.3/docs | `R80.3/docs/UNIFIED_SCHEMA_SUMMARY.md` | `R80.3/docs/20260304-r80-unified-schema-summary-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/billing-models.md` | `R80.3/docs/20260304-r80-billing-models-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/external-wage-sources.md` | `R80.3/docs/20260304-r80-external-wage-sources-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/fairwork-api.md` | `R80.3/docs/20260304-r80-fairwork-api-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/roadmap.md` | `R80.3/docs/20260304-r80-roadmap-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/training-fees-feature.md` | `R80.3/docs/20260304-r80-training-fees-feature-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/unified-schema-diagram.md` | `R80.3/docs/20260304-r80-unified-schema-diagram-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/unified-schema-implementation.md` | `R80.3/docs/20260304-r80-unified-schema-implementation-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/unified-schema-quickstart.md` | `R80.3/docs/20260304-r80-unified-schema-quickstart-v1.00W.md` | Rename | Pending |
| R80.3/docs | `R80.3/docs/unified-schema.md` | `R80.3/docs/20260304-r80-unified-schema-v1.00W.md` | Rename | Pending |
| **R80.3 root** | | | | |
| R80.3 | `R80.3/README-DEPLOY.md` | `R80.3/docs/20260304-r80-deploy-guide-v1.00W.md` | Move | Pending |
| R80.3 | `R80.3/README-CONSOLIDATION.md` | `R80.3/docs/archive/20260304-r80-readme-consolidation-v1.00WA.md` | Move (archive) | Pending |
| **braden root** | | | | |
| braden | `braden/ACCESSIBILITY_AUDIT_REPORT.md` | `braden/docs/archive/20260316-braden-accessibility-audit-report-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/ADMIN_FIX_MIGRATION_GUIDE.md` | `braden/docs/archive/20260316-braden-admin-fix-migration-guide-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/ADMIN_FIX_README.md` | `braden/docs/archive/20260316-braden-admin-fix-readme-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/BROWSER_COMPATIBILITY_FIX.md` | `braden/docs/archive/20260316-braden-browser-compatibility-fix-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/CODE_QUALITY_ANALYSIS.md` | `braden/docs/archive/20260316-braden-code-quality-analysis-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/FIX_SUMMARY.md` | `braden/docs/archive/20260316-braden-fix-summary-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/IMPLEMENTATION_SUMMARY.md` | `braden/docs/archive/20260316-braden-implementation-summary-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/MIDDLEWARE_FIX_DOCUMENTATION.md` | `braden/docs/archive/20260316-braden-middleware-fix-documentation-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/PROJECT_AUDIT_COMPLETE.md` | `braden/docs/archive/20260316-braden-project-audit-complete-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/SECURITY_MIGRATION_SUMMARY.md` | `braden/docs/archive/20260316-braden-security-migration-summary-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/SECURITY_SUMMARY.md` | `braden/docs/archive/20260316-braden-security-summary-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/SOLUTION_SUMMARY.md` | `braden/docs/archive/20260316-braden-solution-summary-v1.00WA.md` | Move (archive) | Pending |
| braden | `braden/VERIFICATION_SUMMARY.md` | `braden/docs/archive/20260316-braden-verification-summary-v1.00WA.md` | Move (archive) | Pending |
| **braden/docs/** | | | | |
| braden/docs | `braden/docs/ARCHITECTURE.md` | `braden/docs/20260316-braden-architecture-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/BOT_PROTECTION.md` | `braden/docs/20260316-braden-bot-protection-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/CSP_SECURITY_DOCUMENTATION.md` | `braden/docs/20260316-braden-csp-security-documentation-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/ENVIRONMENT_SETUP.md` | `braden/docs/20260316-braden-environment-setup-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/GETTING_STARTED.md` | `braden/docs/20260316-braden-getting-started-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/IMPLEMENTATION_SUMMARY.md` | `braden/docs/archive/20260316-braden-docs-implementation-summary-v1.00WA.md` | Rename (archive) | Pending |
| braden/docs | `braden/docs/PROGRESS_TRACKING.md` | `braden/docs/archive/20260316-braden-progress-tracking-v1.00WA.md` | Rename (archive) | Pending |
| braden/docs | `braden/docs/QA_CONFIGURATION.md` | `braden/docs/20260316-braden-qa-configuration-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/RLS-POLICIES.md` | `braden/docs/20260316-braden-rls-policies-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/ROADMAP.md` | `braden/docs/20260316-braden-roadmap-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/SQL_MIGRATION.md` | `braden/docs/20260316-braden-sql-migration-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/SUPABASE_FIXES.md` | `braden/docs/20260316-braden-supabase-fixes-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/UI_UX_BEST_PRACTICES.md` | `braden/docs/20260316-braden-ui-ux-best-practices-v1.00W.md` | Rename | Pending |
| braden/docs | `braden/docs/YARN_LOCKFILE_MAINTENANCE.md` | `braden/docs/archive/20260316-braden-yarn-lockfile-maintenance-v1.00WA.md` | Rename (archive) | Pending |
| braden/docs | `braden/docs/corporate_braden_theme.md` | `braden/docs/20260316-braden-corporate-theme-v1.00W.md` | Rename | Pending |
| **business-suite-unified root** | | | | |
| BSU | `business-suite-unified/DEBUG.md` | `business-suite-unified/docs/20260316-bsu-debug-guide-v1.00W.md` | Move | Pending |
| BSU | `business-suite-unified/SECURITY.md` | `business-suite-unified/docs/20260316-bsu-security-reference-v1.00W.md` | Move | Pending |
| **business-suite-unified/docs/** | | | | |
| BSU/docs | `business-suite-unified/docs/SCHEMA_DIAGRAM.md` | `business-suite-unified/docs/20260316-bsu-schema-diagram-v1.00W.md` | Rename | Pending |
| BSU/docs | `business-suite-unified/docs/UNIFIED_SCHEMA_MIGRATION_GUIDE.md` | `business-suite-unified/docs/20260316-bsu-unified-schema-migration-guide-v1.00W.md` | Rename | Pending |
| BSU/docs | `business-suite-unified/docs/business_suite_deployment_notes.md` | `business-suite-unified/docs/20260316-bsu-deployment-notes-v1.00W.md` | Rename | Pending |
| BSU/docs | `business-suite-unified/docs/business_suite_inventory.md` | `business-suite-unified/docs/20260316-bsu-inventory-v1.00W.md` | Rename | Pending |
| BSU/docs | `business-suite-unified/docs/business_suite_maintenance_guide.md` | `business-suite-unified/docs/20260316-bsu-maintenance-guide-v1.00W.md` | Rename | Pending |
| BSU/docs | `business-suite-unified/docs/crm7_rbac_rls.md` | `business-suite-unified/docs/20260316-bsu-crm7-rbac-rls-v1.00W.md` | Rename | Pending |
| BSU/docs | `business-suite-unified/docs/crm7_supabase_audit.md` | `business-suite-unified/docs/20260316-bsu-crm7-supabase-audit-v1.00W.md` | Rename | Pending |
| BSU/docs | `business-suite-unified/docs/supabase_apply_runbook.md` | `business-suite-unified/docs/20260316-bsu-supabase-apply-runbook-v1.00W.md` | Rename | Pending |
| **crm7 root** | | | | |
| crm7 | `crm7/AI_STRATEGIC_VISION.md` | `crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md` | Move | Pending |
| crm7 | `crm7/DEPLOYMENT_STATUS.md` | `crm7/docs/deployment/20260316-crm7-deployment-status-v1.00W.md` | Move | Pending |
| crm7 | `crm7/DOCUMENT_STORAGE_IMPLEMENTATION.md` | `crm7/docs/20260316-crm7-document-storage-implementation-v1.00W.md` | Move | Pending |
| crm7 | `crm7/DOCUMENT_STORAGE_SETUP.md` | `crm7/docs/20260316-crm7-document-storage-setup-v1.00W.md` | Move | Pending |
| crm7 | `crm7/PRE-EXISTING-ISSUES.md` | `crm7/docs/archive/20260316-crm7-pre-existing-issues-v1.00WA.md` | Move (archive) | Pending |
| crm7 | `crm7/STANDALONE_EXTRACTION_PLAN.md` | `crm7/docs/archive/20260316-crm7-standalone-extraction-plan-v1.00WA.md` | Move (archive) | Pending |
| **crm7/docs/ non-compliant** | | | | |
| crm7/docs | `crm7/docs/plans/wise-bouncing-map.md` | `crm7/docs/archive/20260316-crm7-wise-bouncing-map-v1.00WA.md` | Move (archive) | Pending |
| crm7/docs | `crm7/docs/plans/2026-03-11-visual-relational-builder.md` | `crm7/docs/plans/20260311-crm7-visual-relational-builder-plan-v1.00W.md` | Rename | Pending |
| crm7/docs | `crm7/docs/red-team-issues.md` | `crm7/docs/archive/20260316-crm7-red-team-issues-v1.00WA.md` | Move (archive) | Pending |
| crm7/docs | `crm7/docs/red-team-round1-summary.md` | `crm7/docs/archive/20260316-crm7-red-team-round1-summary-v1.00WA.md` | Move (archive) | Pending |
| **New files to create** | | | | |
| docs | — | `docs/20260316-docs-compliance-audit-v1.00W.md` | Create | **In Progress** |
| docs | `docs/AUTH-MAP.md` (renamed) | `docs/20260227-auth-map-reference-v1.00W.md` | Create | Pending |
| docs | — | `docs/20260303-bsuite-competitive-landscape-v1.00W.md` | Create (from memory) | Pending |
| docs/plans | — | `docs/plans/20260227-boot-compliance-engine-specification-v1.00W.md` | Create (from memory) | Pending |
| docs/plans | — | `docs/plans/20260302-r80-crm7-integration-audit-v1.00W.md` | Create (from memory) | Pending |
| docs/plans | — | `docs/plans/20260316-crm7-ui-fix-plan-v1.00W.md` | Create (port from Windsurf) | Pending |
| docs/plans | — | `docs/plans/20260316-crm7-dashboard-grid-fix-plan-v1.00W.md` | Create (port from Windsurf) | Pending |
| docs/plans | — | `docs/plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md` | Create (port from Windsurf) | Pending |
| docs/plans | — | `docs/plans/20260316-bsuite-entity-reconciliation-plan-v1.00W.md` | Create (port from Windsurf) | Pending |
| docs | — | `docs/20260316-conduit-candidate-documents-v1.00W.md` | Create (missing feature doc) | Pending |
| docs | — | `docs/20260316-bsu-idea-hub-v1.00W.md` | Create (missing feature doc) | Pending |
| docs | — | `docs/20260316-crm7-ai-sessions-schema-v1.00W.md` | Create (missing feature doc) | Pending |

---

## External Plans Inventory

The following plans exist OUTSIDE the official `docs/` structure and require consolidation.

### Windsurf Plans (`/home/braden/.windsurf/plans/`)

| Current Filename | Target Path | Action | Status |
|-----------------|-------------|--------|--------|
| `crm7-ui-fix-c6b71e.md` | `docs/plans/20260316-crm7-ui-fix-plan-v1.00W.md` | Port to docs/ | Pending |
| `dashboard-grid-fix-07fa37.md` | `docs/plans/20260316-crm7-dashboard-grid-fix-plan-v1.00W.md` | Port to docs/ | Pending |
| `crm7-broad-ui-refresh-ec965f.md` | `docs/plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md` | Port to docs/ | Pending |
| `bsuite-reconciliation-07fa37.md` | `docs/plans/20260316-bsuite-entity-reconciliation-plan-v1.00W.md` | Port to docs/ | Pending |
| `p0-p1-sweep-07fa37.md` | — | Archive (all items complete) | Pending |

### Claude Memory Files (`/home/braden/.claude/projects/-home-braden-Desktop-Dev-bsuite/memory/`)

| Current Filename | Target Path | Action | Status |
|-----------------|-------------|--------|--------|
| `competitive-landscape.md` | `docs/20260303-bsuite-competitive-landscape-v1.00W.md` | Copy to docs/ | Pending |
| `boot-test-research.md` | `docs/plans/20260227-boot-compliance-engine-specification-v1.00W.md` | Copy to docs/ | Pending |
| `r80-crm7-audit.md` | `docs/plans/20260302-r80-crm7-integration-audit-v1.00W.md` | Copy to docs/ | Pending |

**Note:** Memory files should be COPIED (not moved) to docs/, as memory/ serves a different runtime purpose.

---

## Missing Feature Documentation

The following features are implemented and production-ready but lack formal documentation in `docs/`:

| Feature | Project | Route / Table | Missing Doc Target | Priority |
|---------|---------|---------------|--------------------|----------|
| Candidate Documents Tab | conduit | Route: `candidates/[id]/documents/`, Table: `r7_documents` | `docs/20260316-conduit-candidate-documents-v1.00W.md` | High |
| Idea Hub | business-suite-unified | Route: `/ideas`, Table: `ideas` | `docs/20260316-bsu-idea-hub-v1.00W.md` | Medium |
| AI Sessions Schema | crm7 | Tables: `ai_sessions`, `ai_messages` | `docs/20260316-crm7-ai-sessions-schema-v1.00W.md` | High |

---

## Verification

After completing all actions in this audit, run the following command to confirm zero remaining non-compliant files:

```bash
# Check remaining non-compliant files (should return 0 actionable results after remediation)
find /home/braden/Desktop/Dev/bsuite -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -name "README.md" \
  -not -name "CLAUDE.md" \
  -not -name "AGENTS.md" \
  -not -name "CONTRIBUTING.md" \
  | grep -Ev "[0-9]{8}-[a-z0-9-]+-v[0-9]+\.[0-9]+[WDRAF]" \
  | sort
```

**Expected result after full remediation:** empty output (zero results).

**Baseline result (2026-03-16, before remediation):**

```
20260310-fairwork.md
docs/00-master-roadmap.md
docs/AUTH-MAP.md
docs/CRM7A-EXECUTIVE-SUMMARY.md
docs/CRM7A-QUICK-REFERENCE.md
docs/CRM7A-REPOSITORY-RESEARCH.md
docs/DRY-ONE-SHOT-ARCHITECTURE.md
docs/claude-code-prompts.md
docs/compliance.md
docs/matrix.md
docs/mermaid-ui-builder.md
docs/navigation-guide.md
docs/navigation.md
docs/performance-report.md
docs/plans/2026-03-11-d2c-theme-remediation.md
docs/pricing-strategy.md
docs/ui.md
docs/20260303-crm8u-code-snippets.md
docs/20260303-crm8u-github-research.md
R80.3/README-CONSOLIDATION.md
R80.3/README-DEPLOY.md
R80.3/docs/UNIFIED_SCHEMA_SUMMARY.md
R80.3/docs/billing-models.md
R80.3/docs/external-wage-sources.md
R80.3/docs/fairwork-api.md
R80.3/docs/roadmap.md
R80.3/docs/training-fees-feature.md
R80.3/docs/unified-schema-diagram.md
R80.3/docs/unified-schema-implementation.md
R80.3/docs/unified-schema-quickstart.md
R80.3/docs/unified-schema.md
braden/ACCESSIBILITY_AUDIT_REPORT.md
braden/ADMIN_FIX_MIGRATION_GUIDE.md
braden/ADMIN_FIX_README.md
braden/BROWSER_COMPATIBILITY_FIX.md
braden/CODE_QUALITY_ANALYSIS.md
braden/FIX_SUMMARY.md
braden/IMPLEMENTATION_SUMMARY.md
braden/MIDDLEWARE_FIX_DOCUMENTATION.md
braden/PROJECT_AUDIT_COMPLETE.md
braden/SECURITY_MIGRATION_SUMMARY.md
braden/SECURITY_SUMMARY.md
braden/SOLUTION_SUMMARY.md
braden/VERIFICATION_SUMMARY.md
braden/docs/ARCHITECTURE.md
braden/docs/BOT_PROTECTION.md
braden/docs/CSP_SECURITY_DOCUMENTATION.md
braden/docs/ENVIRONMENT_SETUP.md
braden/docs/GETTING_STARTED.md
braden/docs/IMPLEMENTATION_SUMMARY.md
braden/docs/PROGRESS_TRACKING.md
braden/docs/QA_CONFIGURATION.md
braden/docs/RLS-POLICIES.md
braden/docs/ROADMAP.md
braden/docs/SQL_MIGRATION.md
braden/docs/SUPABASE_FIXES.md
braden/docs/UI_UX_BEST_PRACTICES.md
braden/docs/YARN_LOCKFILE_MAINTENANCE.md
braden/docs/corporate_braden_theme.md
business-suite-unified/DEBUG.md
business-suite-unified/SECURITY.md
business-suite-unified/docs/SCHEMA_DIAGRAM.md
business-suite-unified/docs/UNIFIED_SCHEMA_MIGRATION_GUIDE.md
business-suite-unified/docs/business_suite_deployment_notes.md
business-suite-unified/docs/business_suite_inventory.md
business-suite-unified/docs/business_suite_maintenance_guide.md
business-suite-unified/docs/crm7_rbac_rls.md
business-suite-unified/docs/crm7_supabase_audit.md
business-suite-unified/docs/supabase_apply_runbook.md
crm7/AI_STRATEGIC_VISION.md
crm7/DEPLOYMENT_STATUS.md
crm7/DOCUMENT_STORAGE_IMPLEMENTATION.md
crm7/DOCUMENT_STORAGE_SETUP.md
crm7/PRE-EXISTING-ISSUES.md
crm7/STANDALONE_EXTRACTION_PLAN.md
crm7/docs/plans/2026-03-11-visual-relational-builder.md
crm7/docs/plans/wise-bouncing-map.md
crm7/docs/red-team-issues.md
crm7/docs/red-team-round1-summary.md
```

---

## Progress Tracker

Update this section as remediation tasks complete. Each row in the action plan table should move from `Pending` to `Complete` with a completion date.

| Phase | Scope | Items | Complete | Remaining |
|-------|-------|-------|----------|-----------|
| 1 | bsuite root + docs/ root | 18 | 0 | 18 |
| 2 | docs/plans/ | 1 | 0 | 1 |
| 3 | R80.3 root + R80.3/docs/ | 12 | 0 | 12 |
| 4 | braden root | 13 | 0 | 13 |
| 5 | braden/docs/ | 15 | 0 | 15 |
| 6 | BSU root + BSU/docs/ | 10 | 0 | 10 |
| 7 | crm7 root + crm7/docs/ | 10 | 0 | 10 |
| 8 | New file creation | 13 | 1 | 12 |
| 9 | External plan consolidation | 8 | 0 | 8 |
| **Total** | | **100** | **1** | **99** |

---

*This document is the master reference for the BSuite documentation compliance remediation. All subsequent tasks in the remediation should update the Status column in the action plan table and the Progress Tracker above.*
