---
kind: record
authority: none
owner: bsuite-lane
---

# Every doc in the estate, and what state it is in

**Date:** 2026-08-22 · **Status:** W · **Scope:** all 7 roots — parent + six submodules

**Regenerate, never hand-edit:**

```
node scripts/audit-doc-completion.mjs . crm7 business-suite-unified conduit braden throughput R80.4 --inventory
```

A hand-written inventory is correct on the day it is typed and wrong the first time
anyone adds a document. This table is produced by the auditor that gates the corpus, so
it cannot disagree with the gate — and if it goes stale, regenerating is one command.

Two self-inflicted defects while producing it, both worth the space:

- The first generation **omitted this file**, because the table was produced before the
  file existed. An inventory missing one document is the same defect it exists to close.
- The second took the summary and the table from **two separate runs** and they landed one
  row apart — a document disagreeing with its own evidence. Both halves now come from a
  single invocation.

## The counts

```
  475 doc(s); 276 gate/workflow file(s) form the evidence layer
  already marked complete in the filename        2
    ...of those, citing NO live gate             2   <-- the claim rests on nothing
  CITE a gate or workflow that EXISTS            49   <-- the only docs that can ever be marked
  cite a gate that NO LONGER EXISTS              0   <-- citing a ghost; reads as evidence
  cite nothing checkable                         426
  historical records (by path or banner)         43
  BINDABLE — these name a gate that exists, so their claim is checkable:
    docs/00-roadmap/20260725-excellence-closeout-implementation-plan-v1.00W.md
        publish-ui.yml
    docs/00-roadmap/20260809-class-a-baseline-before-the-batch-v1.00W.md
        verify-class-a-preservation.mjs
    docs/00-roadmap/20260810-theme-ui-ux-outstanding-register-v1.00W.md
        verify-esm-imports.sh, codemod-inline-colour-styles.mjs, audit-applied-tokens.mjs
    docs/00-roadmap/20260812-estate-remaining-work-register-v1.00W.md
        ci.yml
    docs/00-roadmap/20260812-pi-run-handback-v1.00W.md
        ci.yml
    docs/20260227-contributing-standards-guide-v1.01W.md
        development-merge-issue-closer.yml
    docs/20260227-dry-one-shot-architecture-v1.04A.md
        audit-one-shot.mjs, dry-lint.yml
    docs/20260629-bsuite-world-class-audit-tracker-v1.00W.md
        check-vercel-production-readiness.mjs
    docs/20260629-bsuite-world-class-feature-inventory-v1.00W.md
        check-vercel-production-readiness.mjs
    docs/20260724-migration-fk-index-checklist-v1.00W.md
        check-migration-fk-indexes.mjs, migration-fk-index-lint.yml
    docs/20260724-recurring-bugs-and-blindspots-v1.00W.md
        check-migration-fk-indexes.mjs, check-doc-naming.mjs, db-lint.yml
    docs/20260727-docs-deep-dive-inventory-v1.00W.md
        e2e.yml
    docs/20260731-platform-operations-reference-v1.00W.md
        check-own-package-freshness.mjs, check-shared-package-reach.mjs, check-shared-package-reach.py, shared-package-reach-lint.yml
    docs/20260802-d2c-theme-compliance-audit-v1.00A.md
        audit-d2c-theme.sh, publish-eslint-config.yml
    docs/20260810-plan-dashboard-retirement-v1.00F.md
        verify-class-a-preservation.mjs
    docs/20260813-operator-directive-notes-backlog-remediation-v1.00D.md
        theme-conformance.yml, inline-eslint-rule-parity.yml, publish-eslint-config.yml
    docs/20260814-notes-backlog-verification-register-v1.00D.md
        theme-conformance.yml
    docs/20260817-built-unlanded-and-unwired-register-v1.00W.md
        check-hook-suppression-ratchet.mjs, audit-routes.sh, check-placement-rate-provenance.mjs, cron-job-health-audit.yml, hook-suppression-ratchet.yml
    docs/20260817-coverage-gap-closure-v1.00W.md
        check-colour-ban-reaches-converters.mjs, check-recovered-doc-verdicts.mjs, audit-d2c-theme.sh, check-guard-self-reporting.mjs, theme-conformance.yml
    docs/20260817-estate-completion-ledger-v1.00W.md
        db-lint.yml
    docs/20260817-estate-remaining-work-register-v3.00W.md
        ci.yml
    docs/20260819-built-unlanded-and-unwired-register-v1.00W.md
        check-hook-suppression-ratchet.mjs, audit-routes.sh, check-placement-rate-provenance.mjs, cron-job-health-audit.yml, hook-suppression-ratchet.yml
    docs/20260821-airtable-class-data-surface-plan-v1.00D.md
        check-shared-package-reach.mjs, check-table-reach.mjs
    docs/20260821-atmosphere-evaluation-v1.00D.md
        check-shared-package-reach.mjs
    docs/20260822-border-elevation-token-system-spec-v1.00D.md
        audit-oklch-lightness.py, theme-conformance.yml, dark-variant-strategy-lint.yml, tailwind-source-registration-lint.yml
```

## What the four states mean, and what moves a doc out of each

| State | Meaning | What moves it |
|---|---|---|
| **DEAD-CITATION** | names a gate that does not exist | correct the citation, or record the gate as retired. **Currently zero.** A doc naming a deleted gate reads as *evidence*, which is worse than citing nothing. |
| **BINDABLE** | names a gate or workflow that exists | run the cited gate. Passing is limb (b) of the operator’s bar — necessary, never sufficient. |
| **UNBOUND** | cites nothing checkable | name the artifact that would prove it. Until then no completion claim about it can ever be tested. |
| **RECORD** | archival by path, or self-declared a point-in-time snapshot | nothing. A record is finished by being a record, and deliberately cannot earn a completion marker — otherwise filing a doc away would promote it. |

## The honest position on "mark the docs complete"

**Only the BINDABLE docs can ever be marked**, because only those name something
checkable. The rest are not failures — most are working documents doing their job — but a
completion claim about them would rest on nothing, and the marker is a filename every
future reader trusts at a glance.

The marker itself is `F`, defined by the estate’s own convention as *"Frozen: finalized,
immutable"*. See
`precedent__bsuite__20260822__the_completion_marker_is_F_and_the_convention_already_had_it`.
18 docs carry it as of today; before today, **zero of 306 status-suffixed docs did**.

**Eligibility is not a verdict.** This table reports which docs *could* be assessed. Limb
(a) of the operator’s bar — that a doc is superseded, or described a non-best-practice
since corrected — is a judgement about document CONTENT, and nothing here reads content.

## The inventory

| doc | state | marked | cites |
|---|---|---|---|
| `crm7/docs/audits/20260811-colour-drift-full-tree-audit-v1.00D.md` | BINDABLE |  | lint-ratchet.mjs |
| `crm7/docs/audits/20260811-pgtap-evidence-integrity-v1.00D.md` | BINDABLE |  | pgtap.yml |
| `docs/00-roadmap/20260725-excellence-closeout-implementation-plan-v1.00W.md` | BINDABLE |  | publish-ui.yml |
| `docs/00-roadmap/20260809-class-a-baseline-before-the-batch-v1.00W.md` | BINDABLE |  | verify-class-a-preservation.mjs |
| `docs/00-roadmap/20260810-theme-ui-ux-outstanding-register-v1.00W.md` | BINDABLE |  | verify-esm-imports.sh, codemod-inline-colour-styles.mjs, audit-applied-tokens.mjs |
| `docs/00-roadmap/20260812-estate-remaining-work-register-v1.00W.md` | BINDABLE |  | ci.yml |
| `docs/00-roadmap/20260812-pi-run-handback-v1.00W.md` | BINDABLE |  | ci.yml |
| `docs/20260227-contributing-standards-guide-v1.01W.md` | BINDABLE |  | development-merge-issue-closer.yml |
| `docs/20260227-dry-one-shot-architecture-v1.04A.md` | BINDABLE |  | audit-one-shot.mjs, dry-lint.yml |
| `docs/20260629-bsuite-world-class-audit-tracker-v1.00W.md` | BINDABLE |  | check-vercel-production-readiness.mjs |
| `docs/20260629-bsuite-world-class-feature-inventory-v1.00W.md` | BINDABLE |  | check-vercel-production-readiness.mjs |
| `docs/20260724-migration-fk-index-checklist-v1.00W.md` | BINDABLE |  | check-migration-fk-indexes.mjs, migration-fk-index-lint.yml |
| `docs/20260724-recurring-bugs-and-blindspots-v1.00W.md` | BINDABLE |  | check-migration-fk-indexes.mjs, check-doc-naming.mjs, db-lint.yml |
| `docs/20260727-docs-deep-dive-inventory-v1.00W.md` | BINDABLE |  | e2e.yml |
| `docs/20260731-platform-operations-reference-v1.00W.md` | BINDABLE |  | check-own-package-freshness.mjs, check-shared-package-reach.mjs, check-shared-package-reach.py |
| `docs/20260802-d2c-theme-compliance-audit-v1.00A.md` | BINDABLE |  | audit-d2c-theme.sh, publish-eslint-config.yml |
| `docs/20260810-plan-dashboard-retirement-v1.00F.md` | BINDABLE |  | verify-class-a-preservation.mjs |
| `docs/20260813-operator-directive-notes-backlog-remediation-v1.00D.md` | BINDABLE |  | theme-conformance.yml, inline-eslint-rule-parity.yml, publish-eslint-config.yml |
| `docs/20260814-notes-backlog-verification-register-v1.00D.md` | BINDABLE |  | theme-conformance.yml |
| `docs/20260817-built-unlanded-and-unwired-register-v1.00W.md` | BINDABLE |  | check-hook-suppression-ratchet.mjs, audit-routes.sh, check-placement-rate-provenance.mjs |
| `docs/20260817-coverage-gap-closure-v1.00W.md` | BINDABLE |  | check-colour-ban-reaches-converters.mjs, check-recovered-doc-verdicts.mjs, audit-d2c-theme.sh |
| `docs/20260817-estate-completion-ledger-v1.00W.md` | BINDABLE |  | db-lint.yml |
| `docs/20260817-estate-remaining-work-register-v3.00W.md` | BINDABLE |  | ci.yml |
| `docs/20260819-built-unlanded-and-unwired-register-v1.00W.md` | BINDABLE |  | check-hook-suppression-ratchet.mjs, audit-routes.sh, check-placement-rate-provenance.mjs |
| `docs/20260821-airtable-class-data-surface-plan-v1.00D.md` | BINDABLE |  | check-shared-package-reach.mjs, check-table-reach.mjs |
| `docs/20260821-atmosphere-evaluation-v1.00D.md` | BINDABLE |  | check-shared-package-reach.mjs |
| `docs/20260822-border-elevation-token-system-spec-v1.00D.md` | BINDABLE |  | audit-oklch-lightness.py, theme-conformance.yml, dark-variant-strategy-lint.yml |
| `docs/20260822-data-surface-consolidation-decision-v1.00D.md` | BINDABLE |  | check-doc-classification.mjs |
| `docs/20260822-estate-doc-inventory-v1.00W.md` | BINDABLE |  | audit-doc-completion.mjs, verify-class-a-preservation.mjs, verify-esm-imports.sh |
| `docs/20260822-knowledge-classification-standard-v1.00A.md` | BINDABLE |  | check-doc-classification.mjs, check-required-field-markers.mjs, phantom-migrations.yml |
| `docs/20260822-session-findings-register-v1.00W.md` | BINDABLE |  | audit-doc-completion.mjs, check-doc-citations-resolve.mjs, check-table-reach.mjs |
| `docs/CONSISTENCY-REPORT.md` | BINDABLE |  | check-oauth-boot-wiring.mjs, estate-invariants.yml |
| `docs/OUTSTANDING.md` | BINDABLE |  | verify-class-a-preservation.mjs |
| `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` | BINDABLE |  | check-unmet-peer-deps.mjs, check-published-peer-ranges.mjs, check-lockfile-hygiene.mjs |
| `docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` | BINDABLE |  | audit-routes.sh, check-shared-package-reach.mjs |
| `docs/plans/20260513-bsuite-consolidated-hardening-v1.00W.md` | BINDABLE |  | check-supabase-client-init.mjs |
| `docs/plans/20260728-gap-remediation-plan-v1.00W.md` | BINDABLE |  | prod-migration-history-audit.yml |
| `docs/plans/20260803-theme-conformance-dod-v1.00W.md` | BINDABLE |  | audit-d2c-theme.sh, audit-palette-whitelist.py, audit-token-ownership.sh |
| `docs/plans/20260805-plan-triage-open-work-register-v1.00W.md` | BINDABLE |  | audit-applied-tokens.mjs, audit-routes.sh |
| `docs/plans/20260806-reporting-bulk-data-tiered-schema-program-v1.00D.md` | BINDABLE |  | check-report-catalog-drift.mjs, db-lint.yml |
| `docs/plans/20260810-people-organisations-onboarding-implementation-v1.00W.md` | BINDABLE |  | verify-class-a-preservation.mjs |
| `docs/plans/20260814-nav-route-remediation-v1.00D.md` | BINDABLE |  | route-inventory.yml |
| `docs/plans/20260814-portals-and-surface-class-remediation-v1.00D.md` | BINDABLE |  | theme-conformance.yml |
| `docs/plans/STATUS.md` | BINDABLE |  | check-lockfile-hygiene.mjs |
| `docs/README.md` | BINDABLE |  | check-migration-fk-indexes.mjs |
| `docs/runbooks/20260716-database-migration-dispatch-guide-v1.00W.md` | BINDABLE |  | prod-migration-history-audit.yml |
| `docs/runbooks/20260716-secrets-vault-rotation-guide-v1.00W.md` | BINDABLE |  | secret-naming-drift.yml, secret-scan.yml |
| `R80.4/docs/00-roadmap/20260812-r804-branch-model-v1.00W.md` | BINDABLE |  | verify.yml |
| `R80.4/docs/00-roadmap/20260819-r804-production-completion-plan-v1.00A.md` | BINDABLE |  | check-eslint-rule-parity.mjs |
| `braden/docs/20260316-braden-architecture-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-bot-protection-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-csp-security-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-environment-setup-dev-guide-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-getting-started-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-qa-configuration-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-rls-policies-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-ui-ux-best-practices-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260519-csp-policy-reference-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260723-schema-builder-registry-consolidation-chore-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/20260723-theme-canonicalisation-decision-v1.00W.md` | UNBOUND |  | — |
| `braden/docs/CONSISTENCY-REPORT.md` | UNBOUND |  | — |
| `braden/docs/DEPENDENCY-BUMP-CHECKLIST.md` | UNBOUND |  | — |
| `braden/docs/FEATURE-SURFACE.md` | UNBOUND |  | — |
| `braden/docs/PARENT-DOCS.md` | UNBOUND |  | — |
| `braden/docs/plans/STATUS.md` | UNBOUND |  | — |
| `braden/docs/STACK-AUDIT.md` | UNBOUND |  | — |
| `braden/docs/UNIFIED-ROADMAP.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-crm7-rbac-rls-reference-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-crm7-supabase-audit-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-debug-guide-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-deployment-notes-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-inventory-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-maintenance-guide-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-schema-diagram-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-security-reference-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260316-bsu-supabase-apply-runbook-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260418-auth-dashboard-hardening-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260421-platform-kit-admin-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260421-wcag-aa-audit-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260519-csp-policy-reference-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260723-developer-portal-remaining-work-feature-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/20260819-jodie-pr-notify-webhook-setup-runbook-v1.00W.md` | UNBOUND |  | — |
| `business-suite-unified/docs/CONSISTENCY-REPORT.md` | UNBOUND |  | — |
| `business-suite-unified/docs/FEATURE-SURFACE.md` | UNBOUND |  | — |
| `business-suite-unified/docs/INDEX.md` | UNBOUND |  | — |
| `business-suite-unified/docs/PARENT-DOCS.md` | UNBOUND |  | — |
| `business-suite-unified/docs/plans/2026-05-04-adopt-dnd-dashboard.md` | UNBOUND |  | — |
| `business-suite-unified/docs/plans/2026-05-04-adopt-entity-selectors.md` | UNBOUND |  | — |
| `business-suite-unified/docs/plans/feature-builder-execution-sequence.md` | UNBOUND |  | — |
| `business-suite-unified/docs/plans/STATUS.md` | UNBOUND |  | — |
| `business-suite-unified/docs/README.md` | UNBOUND |  | — |
| `business-suite-unified/docs/STACK-AUDIT.md` | UNBOUND |  | — |
| `business-suite-unified/docs/UNIFIED-ROADMAP.md` | UNBOUND |  | — |
| `conduit/docs/20260519-csp-policy-reference-v1.00W.md` | UNBOUND |  | — |
| `conduit/docs/20260629-supabase-auth-comprehensive-verification-v1.00W.md` | UNBOUND |  | — |
| `conduit/docs/20260723-schema-builder-registry-consolidation-chore-v1.00W.md` | UNBOUND |  | — |
| `conduit/docs/20260725-training-contract-status-email-ingestion-feature-v1.00W.md` | UNBOUND |  | — |
| `conduit/docs/20260726-recruitment-employment-handover-feature-v1.00W.md` | UNBOUND |  | — |
| `conduit/docs/CONSISTENCY-REPORT.md` | UNBOUND |  | — |
| `conduit/docs/DEPENDENCY-BUMP-CHECKLIST.md` | UNBOUND |  | — |
| `conduit/docs/FEATURE-SURFACE.md` | UNBOUND |  | — |
| `conduit/docs/INDEX.md` | UNBOUND |  | — |
| `conduit/docs/PARENT-DOCS.md` | UNBOUND |  | — |
| `conduit/docs/plans/2026-05-04-adopt-entity-selectors.md` | UNBOUND |  | — |
| `conduit/docs/plans/2026-05-04-shadcn-init.md` | UNBOUND |  | — |
| `conduit/docs/plans/STATUS.md` | UNBOUND |  | — |
| `conduit/docs/README.md` | UNBOUND |  | — |
| `conduit/docs/STACK-AUDIT.md` | UNBOUND |  | — |
| `conduit/docs/UNIFIED-ROADMAP.md` | UNBOUND |  | — |
| `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260316-crm7-ai-strategic-vision-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260316-crm7-document-storage-implementation-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260316-crm7-document-storage-setup-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260512-portal-cross-app-sso-architecture-decision-v1.00A.md` | UNBOUND |  | — |
| `crm7/docs/20260512-xero-node-sdk-deno-compat-decision-v1.00A.md` | UNBOUND |  | — |
| `crm7/docs/20260519-csp-policy-reference-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260706-email-sending-architecture-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260706-xero-integration-setup-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260730-placements-classification-fixed-id-review-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/20260813-documents-ux-design-v1.00D.md` | UNBOUND |  | — |
| `crm7/docs/20260813-report-builder-design-v1.00D.md` | UNBOUND |  | — |
| `crm7/docs/20260818-sub-org-consent-links-design-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/adr/0004-stp-xero-passthrough.md` | UNBOUND |  | — |
| `crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/adr/20260525-contacts-clients-leads-canonical-source-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/adr/20260525-host-employer-table-canonicalization-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/architecture/20260316-crm7-ai-sessions-schema-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/CONSISTENCY-REPORT.md` | UNBOUND |  | — |
| `crm7/docs/DEPENDENCY-BUMP-CHECKLIST.md` | UNBOUND |  | — |
| `crm7/docs/FEATURE-SURFACE.md` | UNBOUND |  | — |
| `crm7/docs/INDEX.md` | UNBOUND |  | — |
| `crm7/docs/operations/20260610-migration-history-post-baseline-drift-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/operations/20260811-file-all-issues-agent-prompt-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/operations/README.md` | UNBOUND |  | — |
| `crm7/docs/PARENT-DOCS.md` | UNBOUND |  | — |
| `crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/plans/20260423-ws3-to-ws9-implementation-plan-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/plans/20260805-portal-persona-jobs-to-be-done-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/plans/README.md` | UNBOUND |  | — |
| `crm7/docs/plans/STATUS.md` | UNBOUND |  | — |
| `crm7/docs/README.md` | UNBOUND |  | — |
| `crm7/docs/reference/20260310-crm7-magicui-pattern-guide-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/reference/20260310-crm7-reference-surface-pack-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/reference/20260317-crm7-boot-assessment-ui-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/reference/20260317-crm7-feature-flags-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/reference/20260317-crm7-xero-integration-v1.00W.md` | UNBOUND |  | — |
| `crm7/docs/reference/README.md` | UNBOUND |  | — |
| `crm7/docs/STACK-AUDIT.md` | UNBOUND |  | — |
| `crm7/docs/troubleshooting/README.md` | UNBOUND |  | — |
| `crm7/docs/UNIFIED-ROADMAP.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260112-master-roadmap-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260725-qwen-excellence-integration-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260808-data-workspace-implementation-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260808-intake-and-onboarding-findings-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260808-operator-decision-register-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260809-autonomous-run-report-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260809-pre-apply-capture-bsuite-1845-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260810-crm7-audit-remediation-decision-record-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260810-dashboard-scope-ruling-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260810-document-provenance-who-creates-what-v1.00D.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260810-four-axis-identity-model-and-backlog-sequence-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260810-r804-carryover-register-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260811-crm7-full-spectrum-review-register-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260811-financial-reports-retire-recommendation-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260811-persona-review-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260811-retention-operator-rulings-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260811-scheduled-job-coverage-investigation-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260811-security-signal-analysis-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260812-pi-orchestration-brief-v1.00W.md` | UNBOUND |  | — |
| `docs/00-roadmap/20260813-colour-gate-operator-items-v1.00W.md` | UNBOUND |  | — |
| `docs/20260424-env-var-contributing-rules-v1.00W.md` | UNBOUND |  | — |
| `docs/20260427-conduit-auth-doctrine-investigation-v1.00W.md` | UNBOUND |  | — |
| `docs/20260427-dev-main-fork-rca-v1.00W.md` | UNBOUND |  | — |
| `docs/20260427-security-definer-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/20260428-operator-verification/03-oauth-state-secret.md` | UNBOUND |  | — |
| `docs/20260428-operator-verification/04-tga-gucs.md` | UNBOUND |  | — |
| `docs/20260428-operator-verification/05-tga-sync-enabled.md` | UNBOUND |  | — |
| `docs/20260428-operator-verification/README.md` | UNBOUND |  | — |
| `docs/20260504-bsuite-documentation-hub-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-apprentice-placement-form-schema-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-apprentice-placement-state-machine-canon-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-cross-app-auth-bug-rca-v1.00A.md` | UNBOUND |  | — |
| `docs/20260506-dependency-bump-checklist-v1.00A.md` | UNBOUND |  | — |
| `docs/20260506-file-export-adapters-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-integrations-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-leave-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-pay-periods-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-reports-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-supabase-linter-action-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-table-usage-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/20260506-timesheet-entry-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260507-admin-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260507-comms-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260507-ff-self-validation-doctrine-v1.00W.md` | UNBOUND |  | — |
| `docs/20260507-red-team-ux-doctrine-v1.00A.md` | UNBOUND |  | — |
| `docs/20260507-timesheet-approval-parity-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/20260507-w4-permissions-editor-scoping-v1.00A.md` | UNBOUND |  | — |
| `docs/20260519-rpc-report-page-security-review-v1.00A.md` | UNBOUND |  | — |
| `docs/20260519-storage-rls-four-persona-matrix-v1.00A.md` | UNBOUND |  | — |
| `docs/20260519-xero-payroll-au-stp-path-decision-v1.00A.md` | UNBOUND |  | — |
| `docs/20260629-bsuite-role-rls-subscription-parity-matrix-v1.00W.md` | UNBOUND |  | — |
| `docs/20260629-vercel-production-launch-runbook-v1.00W.md` | UNBOUND |  | — |
| `docs/20260722-developer-portal-investigation-v1.00W.md` | UNBOUND |  | — |
| `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` | UNBOUND |  | — |
| `docs/20260723-bsuite-capability-matrix-v1.00W.md` | UNBOUND |  | — |
| `docs/20260724-bsuite-vercel-env-inventory-v1.00W.md` | UNBOUND |  | — |
| `docs/20260724-oneshot-cross-cutting-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/20260725-backlog-closeout-loop-v1.00A.md` | UNBOUND |  | — |
| `docs/20260725-excellence-program-master-ledger-v1.00W.md` | UNBOUND |  | — |
| `docs/20260725-headroom-learn-notes-v1.00W.md` | UNBOUND |  | — |
| `docs/20260725-sta-email-samples-checklist-v1.00W.md` | UNBOUND |  | — |
| `docs/20260725-sydney-migration-readiness-v1.00W.md` | UNBOUND |  | — |
| `docs/20260727-extreme-poor-agent-items-execution-v1.00W.md` | UNBOUND |  | — |
| `docs/20260727-multiapp-agent-blindspot-investigation-ledger-v1.00W.md` | UNBOUND |  | — |
| `docs/20260727-schema-package-pin-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/20260728-migration-idempotency-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/20260728-operator-ux-bug-register-v1.00W.md` | UNBOUND |  | — |
| `docs/20260728-overnight-worldclass-closeout-v1.00W.md` | UNBOUND |  | — |
| `docs/20260728-weekly-gap-register-v1.00W.md` | UNBOUND |  | — |
| `docs/20260729-unified-authoring-qa-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/20260730-competitor-parity-matrix-v1.00W.md` | UNBOUND |  | — |
| `docs/20260731-agent-engineering-patterns-v1.00W.md` | UNBOUND |  | — |
| `docs/20260731-frontend-layout-zindex-standards-v1.00W.md` | UNBOUND |  | — |
| `docs/20260731-supabase-verification-gates-v1.00W.md` | UNBOUND |  | — |
| `docs/20260806-schema-authoring-and-tenancy-scope-v1.00A.md` | UNBOUND |  | — |
| `docs/20260813-portals-redesign-brainstorm-v1.00D.md` | UNBOUND |  | — |
| `docs/20260814-phase0-scope-remediation-delivery-v1.00W.md` | UNBOUND |  | — |
| `docs/20260814-portals-operator-rulings-v1.00A.md` | UNBOUND |  | — |
| `docs/20260815-vercel-platform-audit-and-res-regression-v1.00W.md` | UNBOUND |  | — |
| `docs/20260817-au-compliance-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/20260817-award-coverage-real-placement-scope-v1.00W.md` | UNBOUND |  | — |
| `docs/20260817-completion-proof-v1.00W.md` | UNBOUND |  | — |
| `docs/20260817-operator-notes-backlog-d59-d92-status-v1.00W.md` | UNBOUND |  | — |
| `docs/20260817-po-portal-verification-v1.00W.md` | UNBOUND |  | — |
| `docs/20260817-recovered-verdict-backlog-v1.00W.md` | UNBOUND |  | — |
| `docs/20260819-estate-session-evidence-v1.00W.md` | UNBOUND |  | — |
| `docs/20260820-datum-directive-to-bsuite-lane-v1.00W.md` | UNBOUND |  | — |
| `docs/20260822-schema-builder-ux-remediation-spec-v1.00D.md` | UNBOUND |  | — |
| `docs/adr/ADR-0001-page-builder-ownership.md` | UNBOUND |  | — |
| `docs/adr/ADR-0002-schema-builder-ownership.md` | UNBOUND |  | — |
| `docs/adr/ADR-0003-consumer-renderer-pattern.md` | UNBOUND |  | — |
| `docs/adr/ADR-0004-oauth-allowlist-doctrine.md` | UNBOUND |  | — |
| `docs/adr/ADR-0006-contact-propagation-doctrine.md` | UNBOUND |  | — |
| `docs/adr/ADR-0007-stripe-fdw-read-doctrine.md` | UNBOUND |  | — |
| `docs/ai/architecture/README.md` | UNBOUND |  | — |
| `docs/ai/CONTRIBUTING.md` | UNBOUND |  | — |
| `docs/ai/development/README.md` | UNBOUND |  | — |
| `docs/ai/diagrams/README.md` | UNBOUND |  | — |
| `docs/ai/features/20260227-feature-map-complete-v1.00W.md` | UNBOUND | yes | — |
| `docs/ai/features/README.md` | UNBOUND |  | — |
| `docs/ai/integrations/README.md` | UNBOUND |  | — |
| `docs/ai/pricing/README.md` | UNBOUND |  | — |
| `docs/ai/README.md` | UNBOUND |  | — |
| `docs/ai/reference/README.md` | UNBOUND |  | — |
| `docs/audits/20260725-action-plan-from-audits-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-bsu-braden-throughput-deep-bug-excavation-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-bsu-braden-throughput-docs-code-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-conduit-r80-deep-bug-excavation-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-conduit-r80-docs-code-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-crm7-deep-bug-excavation-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-crm7-docs-code-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-dead-duplicate-code-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260725-jodie-parity-matrix-v1.00W.md` | UNBOUND |  | — |
| `docs/audits/20260813-bsuite-world-class-brainstorm-v1.00D.md` | UNBOUND |  | — |
| `docs/email-templates/README.md` | UNBOUND |  | — |
| `docs/nav/findings.md` | UNBOUND |  | — |
| `docs/NEW_ISSUES_FOUND.md` | UNBOUND |  | — |
| `docs/operator-screenshots/README.md` | UNBOUND |  | — |
| `docs/plans/20260302-r80-crm7-integration-audit-v1.00A.md` | UNBOUND |  | — |
| `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md` | UNBOUND |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-visual-feature-builder-spec-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260506-codehouse-parity/README.md` | UNBOUND |  | — |
| `docs/plans/20260507-feature-builder-ux-red-team-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260510-universal-canvas-capability-implementation-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260521-reports-w2-uplift-implementation-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260609-production-readiness-next-steps-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260617-product-tails-continuation-prompt-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260618-recruitment-comms-rams-cluster-plan-v1.00A.md` | UNBOUND |  | — |
| `docs/plans/20260629-bsuite-remaining-work-roadmap-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260629-remaining-work-continuation-prompt-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260701-docs-plans-closure-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260703-gto-e2e-gap-map-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260703-unified-authoring-surface-plan-v1.03A.md` | UNBOUND |  | — |
| `docs/plans/20260709-hermes-deep-dive-audit-prompt-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260716-bsuite-completion-program-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260723-bsuite-documentation-program-design-v1.00A.md` | UNBOUND |  | — |
| `docs/plans/20260723-completion-program-refined-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260724-bsuite-1322-region-migration-runbook-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260724-bsuite-1322-supabase-region-migration-scope-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260724-conduit-338-training-contract-status-email-ingestion-plan-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260724-email-funding-expansion-scope-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260724-recruitment-employment-handover-design-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260724-recurring-bugs-blindspots-refined-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260725-docs-deadcode-archive-refined-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260725-gto-excellence-program-refined-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260725-gto-persona-excellence-design-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260727-escalation-council-multiapp-investigation-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260728-billing-model-label-truthfulness-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260728-r8-as-rates-engine-architecture-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260728-ux-implementation-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260728-ux-implementation-round2-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260728-weekly-gap-assessment-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260729-qa-backlog-execution-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260729-r8-rates-engine-xero-product-corrections-plan-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260729-unified-authoring-redteam-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260730-gto-enquiry-to-billing-make-rates-real-plan-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260802-d2c-theme-compliance-audit-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260805-operator-register-completion-program-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260807-data-platform-completion-program-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260810-people-organisations-onboarding-design-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/20260811-award-engine-to-zero-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260811-dataplatform-completion-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260811-feature-builder-world-class-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260811-post-persona-execution-refined-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/20260817-estate-completion-plan-v1.00D.md` | UNBOUND |  | — |
| `docs/plans/codehouse-parity/PARITY-569-pay-item-groups-spec.md` | UNBOUND |  | — |
| `docs/plans/loop-contracts/20260703-gto-e2e-cycle-loop-contract-v1.00W.md` | UNBOUND |  | — |
| `docs/plans/loop-contracts/recruitment-comms-rams-loop-contract.md` | UNBOUND |  | — |
| `docs/plans/README.md` | UNBOUND |  | — |
| `docs/plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md` | UNBOUND |  | — |
| `docs/plans/uplift/INDEX.md` | UNBOUND |  | — |
| `docs/recovered/00-READ-THIS-FIRST-corpus-health.md` | UNBOUND |  | — |
| `docs/recovered/20260225-cascade-claude-upgrade-coordination-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260226-prerender-seo-marketing-plan-v1.0.0-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260226-recruit7-candidate-sourcing-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260226-report-comprehensive-qa-v1.00A.md` | UNBOUND |  | — |
| `docs/recovered/20260226-report-implementation-summary-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260227-ai-assistant-plugin-system-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260227-e2e-flows-google-azure-setup-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260227-email-capabilities-plan-v1.00W.md` | UNBOUND |  | — |
| `docs/recovered/20260228-conduit-ai-tools-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260301-phase1-coordination-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260301-reconciliation-phase1-implementation-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260302-vercel-deployment-fix-cc2-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260304-crm7-document-lifecycle-design-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260304-crm7-document-lifecycle-implementation-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260304-document-esign-best-practice-research-v1.00W.md` | UNBOUND |  | — |
| `docs/recovered/20260304-gto-document-templates-guide-v1.00W.md` | UNBOUND |  | — |
| `docs/recovered/20260305-wif-migration-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260306-workforce-one-parity-analysis-v1.00W.md` | UNBOUND |  | — |
| `docs/recovered/20260317-document-esigning-architecture-v1.00A.md` | UNBOUND |  | — |
| `docs/recovered/20260630-cross-app-auth-validation-dev-deploy-test-plan-v1.00F.md` | UNBOUND |  | — |
| `docs/recovered/20260808-standards-do-not-name-providers-finding-v1.00A.md` | UNBOUND |  | — |
| `docs/recovered/cozy-stirring-teacup-agent-a38474b.md` | UNBOUND |  | — |
| `docs/recovered/gleaming-fluttering-coral.md` | UNBOUND |  | — |
| `docs/recovered/idempotent-baking-tarjan-agent-ac048d4.md` | UNBOUND |  | — |
| `docs/recovered/reactive-growing-waterfall-agent-a8e1b8c.md` | UNBOUND |  | — |
| `docs/recovered/reactive-growing-waterfall.md` | UNBOUND |  | — |
| `docs/recovered/README.md` | UNBOUND |  | — |
| `docs/recovered/rustling-mapping-lemon.md` | UNBOUND |  | — |
| `docs/recovered/tranquil-weaving-robin.md` | UNBOUND |  | — |
| `docs/recovered/wf1-ots-parity-implementation-229a69.md` | UNBOUND |  | — |
| `docs/references/20260729-xero-api-docs-v1.00W.md` | UNBOUND |  | — |
| `docs/references/20260729-xero-field-map-v1.00D.md` | UNBOUND |  | — |
| `docs/references/20260730-elements-of-rate-calculation-v1.00W.md` | UNBOUND |  | — |
| `docs/references/20260730-gto-enquiry-to-billing-process-flow-v1.00D.md` | UNBOUND |  | — |
| `docs/references/20260730-rdo-flexibility-v1.00W.md` | UNBOUND |  | — |
| `docs/references/codehouse_kb_crawl_results.md` | UNBOUND |  | — |
| `docs/references/codehouse-knowledgebase-crawl.md` | UNBOUND |  | — |
| `docs/references/Evidence Guide for GTOs to Support the National Standards.md` | UNBOUND |  | — |
| `docs/references/README.md` | UNBOUND |  | — |
| `docs/research/20260725-gto-compliance-ux-research-v1.00W.md` | UNBOUND |  | — |
| `docs/runbooks/20260716-edge-function-deploy-guide-v1.00W.md` | UNBOUND |  | — |
| `docs/runbooks/20260716-parent-pointer-reconcile-guide-v1.00W.md` | UNBOUND |  | — |
| `docs/runbooks/20260716-tenant-switching-branding-tiers-guide-v1.00W.md` | UNBOUND |  | — |
| `docs/runbooks/20260813-local-migration-rehearsal-guide-v1.00W.md` | UNBOUND |  | — |
| `docs/runbooks/README.md` | UNBOUND |  | — |
| `docs/testing/20260425-cross-app-e2e-runbook-v1.00W.md` | UNBOUND |  | — |
| `docs/testing/20260513-e2e-integration-autonoma-removal-v1.00W.md` | UNBOUND |  | — |
| `docs/testing/README.md` | UNBOUND |  | — |
| `docs/validation/20260731-gto-e2e-walk-cleanup-ledger-v1.00W.md` | UNBOUND |  | — |
| `docs/validation/20260731-gto-enquiry-to-billing-walk-results-v1.00W.md` | UNBOUND |  | — |
| `docs/validation/20260804-operator-notes-defect-register-v1.00W.md` | UNBOUND |  | — |
| `docs/validation/20260804-plans-closure-audit-v1.00W.md` | UNBOUND |  | — |
| `docs/validation/20260805-operator-notes-defect-register-v1.00W.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260811-developer-advocate-review-v1.00W.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260811-user-advocate-review-v1.00W.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260812-r804-save-persistence-2.4-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260818-r804-master-roadmap-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260819-r8-operator-notes-verification-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260820-datum-directive-to-r8-lane-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260820-r8-against-the-operator-notes-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260820-r8-state-of-play-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/00-roadmap/20260822-rates-permission-and-delegation-model-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/20260807-award-modelling-next-stage-brief-v1.00W.md` | UNBOUND |  | — |
| `R80.4/docs/handoff/20260804-r804-to-pi-v1.00W.md` | UNBOUND |  | — |
| `R80.4/docs/methodology/20260802-award-pattern-matrix-reference-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/methodology/20260802-clause-tracing-methodology-guide-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/methodology/20260802-data-units-reference-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/methodology/20260802-r8-engine-design-architecture-v1.00A.md` | UNBOUND |  | — |
| `R80.4/docs/methodology/INDEX.md` | UNBOUND |  | — |
| `R80.4/docs/NEXT-STEPS.md` | UNBOUND |  | — |
| `R80.4/docs/PACT-REFERENCE.md` | UNBOUND |  | — |
| `R80.4/docs/PARENT-DOCS.md` | UNBOUND |  | — |
| `R80.4/docs/QUEUE-COMPLETE.md` | UNBOUND | yes | — |
| `R80.4/docs/README.md` | UNBOUND |  | — |
| `R80.4/docs/reference/20260730-elements-of-rate-calculation-v1.00W.md` | UNBOUND |  | — |
| `R80.4/docs/reference/20260730-rdo-flexibility-v1.00W.md` | UNBOUND |  | — |
| `R80.4/docs/reference/mapd-api-integration-best-practices-guide.md` | UNBOUND |  | — |
| `R80.4/docs/reference/modern-awards-pay-database-guide.md` | UNBOUND |  | — |
| `throughput/docs/20250511-throughput-api-reference-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20250511-throughput-troubleshooting-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20250511-throughput-user-guide-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20250829-throughput-roadmap-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-component-alert-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-component-badge-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-component-card-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-component-documentation-template-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-component-input-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-component-textarea-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-components-guide-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-navigation-ux-guide-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20251014-throughput-quality-improvements-implementation-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20260425-throughput-outstanding-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20260430-throughput-component-button-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20260430-throughput-component-docs-quick-reference-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20260430-throughput-component-modal-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20260519-csp-policy-reference-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/20260805-throughput-ai-gateway-architecture-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/CONSISTENCY-REPORT.md` | UNBOUND |  | — |
| `throughput/docs/DEPENDENCY-BUMP-CHECKLIST.md` | UNBOUND |  | — |
| `throughput/docs/FEATURE-SURFACE.md` | UNBOUND |  | — |
| `throughput/docs/INDEX.md` | UNBOUND |  | — |
| `throughput/docs/PARENT-DOCS.md` | UNBOUND |  | — |
| `throughput/docs/plans/20260504-adopt-canonical-patterns-plan-v1.00W.md` | UNBOUND |  | — |
| `throughput/docs/plans/STATUS.md` | UNBOUND |  | — |
| `throughput/docs/README.md` | UNBOUND |  | — |
| `throughput/docs/STACK-AUDIT.md` | UNBOUND |  | — |
| `throughput/docs/UNIFIED-ROADMAP.md` | UNBOUND |  | — |
| `braden/docs/20260316-braden-roadmap-v1.00W.md` | RECORD |  | — |
| `braden/docs/archive/README.md` | RECORD |  | — |
| `braden/docs/INDEX.md` | RECORD |  | — |
| `braden/docs/plans/archive/README.md` | RECORD |  | — |
| `braden/docs/README.md` | RECORD |  | — |
| `business-suite-unified/docs/archive/README.md` | RECORD |  | — |
| `conduit/docs/archive/README.md` | RECORD |  | — |
| `crm7/docs/00-roadmap/20260226-crm7-master-roadmap-v1.00A.md` | RECORD |  | — |
| `crm7/docs/00-roadmap/README.md` | RECORD |  | — |
| `crm7/docs/adr/README.md` | RECORD |  | — |
| `crm7/docs/architecture/README.md` | RECORD |  | — |
| `crm7/docs/archive/README.md` | RECORD |  | — |
| `crm7/docs/audits/20260811-ci-guards-deferred-items-v1.00D.md` | RECORD |  | lint-ratchet.mjs, check-migration-fk-indexes.mjs, lint-sql-migrations.mjs |
| `crm7/docs/audits/20260811-ci-guards-that-cannot-fail-v1.00D.md` | RECORD |  | lint-sql-migrations.mjs, check-report-catalog-drift.mjs, check-postgrest-embeds.mjs |
| `crm7/docs/deployment/README.md` | RECORD |  | — |
| `crm7/docs/guides/README.md` | RECORD |  | — |
| `crm7/docs/plans/archive/README.md` | RECORD |  | — |
| `docs/00-roadmap/20260809-shipped-to-production-v1.00W.md` | RECORD |  | — |
| `docs/20260814-estate-remaining-work-register-v2.00W.md` | RECORD |  | audit-d2c-theme.sh, theme-conformance.yml |
| `docs/adr/ADR-0005-rams-funding-authoring.md` | RECORD |  | — |
| `docs/adr/ADR-0008-schema-builder-consolidation.md` | RECORD |  | check-migration-parity.sh, estate-invariants.yml |
| `docs/adr/README.md` | RECORD |  | — |
| `docs/archive/2026-07/20260731-agents-md-changelog-archive-v1.00W.md` | RECORD |  | — |
| `docs/archive/20260506-plan-completion-dashboard/README.md` | RECORD |  | — |
| `docs/archive/20260805-stash-cleanup-manifest-v1.00W.md` | RECORD |  | — |
| `docs/archive/README.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-braden-marketing-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-bsu-admin-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-bsu-tenant-admin-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-conduit-candidate-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-conduit-careers-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-conduit-employer-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-conduit-recruiter-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-crm7-internal-v1.00W.md` | RECORD |  | — |
| `docs/plans/20260506-codehouse-parity/20260506-portal-r80-3-calculator-v1.00W.md` | RECORD |  | — |
| `docs/plans/inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00W.md` | RECORD |  | — |
| `docs/plans/inputs/20260814-portals-lane-kickoff-prompt-v1.00W.md` | RECORD |  | theme-conformance.yml |
| `docs/recovered/20260303-bsuite-launch-ready-design-v1.00F.md` | RECORD |  | — |
| `docs/recovered/20260304-crm7-comprehensive-audit-report-v1.00F.md` | RECORD |  | — |
| `docs/recovered/20260304-crm7-comprehensive-gap-analysis-v1.00F.md` | RECORD |  | — |
| `docs/recovered/20260425-universal-canvas-master-execution-plan-v1.00F.md` | RECORD |  | — |
| `throughput/docs/archive/README.md` | RECORD |  | — |
| `throughput/docs/plans/archive/README.md` | RECORD |  | — |

  NOTHING WAS RENAMED. Eligibility is not a verdict — the cited gates must be RUN.
  AND: eligibility is only LIMB (b) of the operator bar. Limb (a) — that a doc is
  SUPERSEDED, or described a non-best-practice since corrected — is a judgement about
  the document CONTENT. Nothing here reads that, and no marker may be applied without it.
  VACUITY: a doc citing zero gates has zero FAILING gates. That is not a pass. Scoring
  code downstream of this tool MUST require at least one PASSING citation, not merely
  the absence of a failing one.
