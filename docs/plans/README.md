# Plans

Implementation plans for BSuite features and enhancements. Each plan follows the `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md` naming convention.

**Note:** The bulk of historical implementation plans live in the top-level `docs/` folder (not in this subdirectory). This `plans/` folder contains the most recent active plans.

**Status codes:** W=Working, D=Draft, R=Review, A=Approved, F=Frozen

## Development-branch completion policy

This plans index is the reconciliation point for the current `development` completion
cycle. A task is not complete just because a code PR merged: the owning app's
`development` branch must be green in Vercel/CI, the one-shot compliance gate in
[`../20260227-dry-one-shot-architecture-v1.01A.md`](../20260227-dry-one-shot-architecture-v1.01A.md)
must pass for changed data flows, and no production promotion may happen until the user
explicitly approves a merge from `development` to `main`/`master`.

Published-package constraint: deployable consumers of `@bsuite/*` packages must depend on
published npm semver ranges. `workspace:*` and `file:../packages/*` are allowed only for
isolated local package development and must not be present in consumer lockfiles used by
Vercel.

## Active plans

| File | Status | Description | Shipped so far |
|------|--------|-------------|----------------|
| `20260423-bsuite-production-plan.md` | active | Development completion tracker: Phase 6 security/infrastructure hardening, Phase 7 one-shot completion, schema/page-builder admin UI, observability, and final production gates | Current local source of truth for remaining blockers. Phase 6 requires Vercel/CI green on `development` before any production merge discussion. Operator actions are tracked in local docs/runbooks, not memory keys. |
| `../../crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` | W | CRM7 execution overlay for schema/page-builder foundations + GTO billing/payroll/reporting | Checked for reconciliation. Root gates in this index apply to its execution: development-first, Vercel-green, one-shot compliance, and published `@bsuite/*` semver consumption. |
| `20260423-phase5-schema-pagebuilder-implementation-v1.00W.md` | W | Phase 5 — schema/page-builder/navigation uplift across 6 apps. 7 PR chain (5.0 → 5.6) | PR 5.0 DB pre-conditions MERGED · PR 5.1 `@bsuite/nav-core@0.5.0` MERGED+PUBLISHED · PR 5.2 `@bsuite/schema-registry@0.1.0` MERGED+PUBLISHED · PR 5.3 BSU PageComposer/NavigationEditor MERGED · PR 5.4 crm7 consumer MERGED (#282) · PR 5.5 conduit consumer MERGED · PR 5.6 R80.3 + braden + embed route MERGED. Conduit SSR/Vercel follow-up is tracked in production-plan Phase 6.0. |
| `20260422-entity-linkage-schema-builder-uplift-v1.02W.md` | W | Entity linkage + one-shot enforcement + schema/page-builder uplift across 6 apps | Candidate→contact merge and CRM7 canonical lead-capture path shipped per DRY §11. Remaining work reconciles through production-plan Phase 7: FK/UI one-shot completion, EntitySelector/EntityLinker coverage, and any BSU duplicate cleanup still called out by the production plan. |
| `20260422-theme-centralisation-v1.00A.md` | A (approved) | 2,542-hardcoded-colour blast-radius remediation + 3-layer branding (platform → tenant → app) + runtime white-label | Phases 0–4 shipped: `@bsuite/theme@0.2.0` published, BrandingProvider wired, `no-hardcoded-colours` ESLint rule at ERROR in D2C apps, 3-tier branding tables + SECURITY DEFINER RPCs live. Phase 5 (consumer migration across 5 D2C apps) + Phase 6 (docs refresh + F status promotion) remaining |
| `20260227-boot-compliance-engine-specification-v1.00W.md` | W | BOOT compliance engine specification — GTO competitive differentiator. Legal/SME input required (Braden) | Spec complete; implementation deferred to post-C7-award-engine cycle |
| `20260302-r80-crm7-integration-audit-v1.00W.md` | W | R80.3 ↔ CRM7 integration audit + shared charge-calc engine | Milestones 1–3 shipped, 18 C-tier + H-tier items remaining (separate cycle) |
| `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` | W | CRM7 broad UI refresh (D2C Neon theme, 9 modules) | Subsumed into the theme-centralisation plan Phase 3 — track there |

## Reference data

| File | Description |
|------|-------------|
| `CRM7_entity_inventory_v2.xlsx` | CRM7 entity inventory spreadsheet (v2) |

## Archived plans (moved to `docs/archive/`)

| File | Archived | Reason |
|------|----------|--------|
| `20260311-d2c-theme-remediation-plan-v1.00W.md` | 2026-04-07 | All theme remediation items confirmed complete in gap report v2 |
| `20260316-bsuite-entity-reconciliation-plan-v1.00W.md` | 2026-04-07 | SP-4 entity crosswalk delivered (gap report v2 Section 9) |
| `20260316-crm7-dashboard-grid-fix-plan-v1.00W.md` | 2026-04-07 | PageGridLayout wired on all apps (gap report v2 Section 2) |
| `20260316-crm7-ui-fix-plan-v1.00W.md` | 2026-04-07 | All UI fix items confirmed done (gap report v2 Section 2) |

---

## Outstanding-work summary (2026-04-23)

Pinned for next-cycle planning:

**Next-session quick closes** (≤1 day each):
- Conduit SSR prerender guard follow-up from production-plan Phase 6.0; required for Vercel green on `development`
- BSU lead-capture duplicate cleanup if PR #171 is still open in the owning repo
- One-shot Phase 7 FK/UI completion: remaining FK migrations + EntitySelector/EntityLinker coverage
- Entity-linkage Phase 6 — ESLint `no-free-text-fk` rule + docs refresh

**Multi-week efforts** (need dedicated cycle + stakeholder input):
- BOOT compliance engine implementation (post-C7-award-engine)
- R80.3 ↔ CRM7 C-tier + H-tier integration (18 items)
- CRM7 broad UI refresh (9 modules — subsumed into theme-centralisation Phase 3)

**Operator-only** (no agent can do — tracked in local runbooks/docs, not memory keys):
- OAUTH_STATE_SECRET + edge-fn redeploys
- Supabase migration applies (phase6_11, phase12_*)
- pg_cron + pg_net extensions
- Azure `xms_edov` claim enable
- Wildcard redirect URI cleanup
- HS256 Previous JWK revoke
- Disable "Automatically delete head branches" on 4 repos (crm7/R80.3/braden/bsuite parent)

Primary local references: [`../20260421-auth-hardening-runbook-v1.00A.md`](../20260421-auth-hardening-runbook-v1.00A.md),
[`../20260424-env-var-audit-findings-v1.00A.md`](../20260424-env-var-audit-findings-v1.00A.md),
and [`../20260424-env-var-contributing-rules-v1.00W.md`](../20260424-env-var-contributing-rules-v1.00W.md).
