# BSuite Documentation

Top-level documentation for the BSuite multi-project workspace. Contains cross-project standards, architecture references, and planning documents shared across all six applications.

> **Navigation:** For the full outstanding-work index, see [`OUTSTANDING.md`](OUTSTANDING.md).  
> For implementation plans, see [`plans/README.md`](plans/README.md).

---

## Development Completion Gates

- `development` is the working branch for completion work. Do not promote to
  `main`/`master` until the user explicitly approves that production step.
- Vercel/CI must be green on the owning app's `development` branch before a roadmap item
  is marked complete.
- One-shot data-entry compliance is a hard gate; see
  [`20260227-dry-one-shot-architecture-v1.01A.md`](20260227-dry-one-shot-architecture-v1.01A.md)
  for the checklist.
- Deployable apps must consume `@bsuite/*` packages by npm semver. `workspace:*` and
  `file:../packages/*` are local-development conveniences only and must not enter Vercel
  deploy lockfiles.

---

## Documentation Authority

- [`20260227-bsuite-master-roadmap-v5.00W.md`](20260227-bsuite-master-roadmap-v5.00W.md) — canonical planning and delivery source of truth
- [`20260227-auth-map-reference-v1.00A.md`](20260227-auth-map-reference-v1.00A.md) — canonical authentication / session-topology reference
- [`20260227-dry-one-shot-architecture-v1.01A.md`](20260227-dry-one-shot-architecture-v1.01A.md) — §1 Entity Ownership Map is the cross-app ownership source of truth
- [`20260424-env-var-contributing-rules-v1.00W.md`](20260424-env-var-contributing-rules-v1.00W.md) — canonical environment-variable naming, scoping, and Vercel branch rules
- `docs/plans/` — feeder implementation plans that reconcile back to the master roadmap
- `docs/archive/` — historical snapshots (read-only reference)

---

## Live Reference Files

| File | Purpose |
|------|---------|
| [`20260227-auth-map-reference-v1.00A.md`](20260227-auth-map-reference-v1.00A.md) | Auth topology — OAuth 2.1, session boundaries, token refresh |
| [`20260227-bsuite-master-roadmap-v5.00W.md`](20260227-bsuite-master-roadmap-v5.00W.md) | **Primary planning source of truth** |
| [`20260227-contributing-standards-guide-v1.00A.md`](20260227-contributing-standards-guide-v1.00A.md) | Code quality, doc naming, commit standards |
| [`20260227-dry-one-shot-architecture-v1.01A.md`](20260227-dry-one-shot-architecture-v1.01A.md) | DRY / one-shot architecture + entity ownership map |
| [`20260228-d2c-theme-specification-v1.00A.md`](20260228-d2c-theme-specification-v1.00A.md) | D2C Neon Electric theme — OKLCH palette, Tailwind tokens, CSS vars |
| [`20260228-gto-standards-reference-v1.00A.md`](20260228-gto-standards-reference-v1.00A.md) | National Standards for GTOs — evidence guide |
| [`20260310-fairwork-reference-v1.00A.md`](20260310-fairwork-reference-v1.00A.md) | Fair Work Act compliance reference |
| [`20260316-claude-code-prompts-reference-v1.00A.md`](20260316-claude-code-prompts-reference-v1.00A.md) | Claude Code prompts for roadmap execution |
| [`20260316-compliance-reference-v1.00A.md`](20260316-compliance-reference-v1.00A.md) | WCAG / data handling / regulatory compliance |
| [`20260316-matrix-reference-v1.00A.md`](20260316-matrix-reference-v1.00A.md) | Feature/requirements matrix |
| [`20260316-mermaid-ui-builder-reference-v1.00A.md`](20260316-mermaid-ui-builder-reference-v1.00A.md) | Mermaid UI builder guide |
| [`20260316-navigation-reference-v1.00A.md`](20260316-navigation-reference-v1.00A.md) | Navigation structure reference |
| [`20260316-pricing-strategy-v1.00A.md`](20260316-pricing-strategy-v1.00A.md) | Subscription + per-seat pricing strategy |
| [`20260316-ui-reference-v1.00A.md`](20260316-ui-reference-v1.00A.md) | UI architecture — canonical component source chain |
| [`20260421-auth-hardening-runbook-v1.00A.md`](20260421-auth-hardening-runbook-v1.00A.md) | Operator runbook — auth hardening, key rotation, RLS checks |
| [`20260422-tga-api-integration-reference-v1.00W.md`](20260422-tga-api-integration-reference-v1.00W.md) | TGA API integration spec reference (live, implementation in progress) |
| [`20260424-env-var-audit-findings-v1.00A.md`](20260424-env-var-audit-findings-v1.00A.md) | 2026-04-24 cross-repo Vercel/env audit findings |
| [`20260424-env-var-audit-matrix-v1.00A.md`](20260424-env-var-audit-matrix-v1.00A.md) | 166-variable × 6-project env declaration/usage matrix |

---

## Working / Incomplete Files

See [`OUTSTANDING.md`](OUTSTANDING.md) for full remaining-action tables.

| File | Status | Summary |
|------|--------|---------|
| [`20260317-bsuite-gap-report-v2.00W.md`](20260317-bsuite-gap-report-v2.00W.md) | W | Living gap register; v5.03W roadmap bump pending |
| [`20260319-entity-crosswalk-v1.00D.md`](20260319-entity-crosswalk-v1.00D.md) | D | 198-entity inventory; P1 EntitySelectors outstanding |
| [`20260415-roadmap-audit-delta-v1.00W.md`](20260415-roadmap-audit-delta-v1.00W.md) | W | Confirms 4 `#26` subtasks done; rollup into master roadmap pending |
| [`20260420-react-hooks-v7-tech-debt-v1.00W.md`](20260420-react-hooks-v7-tech-debt-v1.00W.md) | W | 47 BSU + 21 braden react-hooks v7 warnings; remediation in progress |
| [`20260421-k8-retroactive-audit-v1.00W.md`](20260421-k8-retroactive-audit-v1.00W.md) | W | K.8 checklists for 7 pre-plan commits; K.8 now mandatory going forward |
| [`20260421-storage-rls-reserved-prefixes-v1.00W.md`](20260421-storage-rls-reserved-prefixes-v1.00W.md) | W | M.6 RLS reserved-prefix policy; 5-min Dashboard update pending |
| [`20260421-supabase-realtime-blocks-rollout-v1.00W.md`](20260421-supabase-realtime-blocks-rollout-v1.00W.md) | W | G.3 rollout plan; 3 blocks (chat, cursor, monaco) not yet installed |
| [`20260422-typescript-6-migration-evaluation-v1.00W.md`](20260422-typescript-6-migration-evaluation-v1.00W.md) | W | N.7.c evaluation; all 6 apps GO — gated on TS 6.0 GA + eslint-compat |
| [`20260423-cross-app-write-audit-v1.00W.md`](20260423-cross-app-write-audit-v1.00W.md) | W | Superseded as a suite-wide one-shot signal by the 2026-04-24 audit; use `docs/plans/README.md` and the DRY one-shot gate for current violations |
| [`20260423-misplaced-routes-audit-v1.00W.md`](20260423-misplaced-routes-audit-v1.00W.md) | W | Phase 12.1; 6 route moves deferred pending Phase 7 merge |
| [`20260424-env-var-contributing-rules-v1.00W.md`](20260424-env-var-contributing-rules-v1.00W.md) | W | Forward-looking env/Vercel rules extracted from the 2026-04-24 audit |

---

## Subdirectories

| Directory | Description |
|-----------|-------------|
| [`ai/`](ai/README.md) | CRM7 AI Assistant documentation — architecture, features, pricing, integrations |
| [`archive/`](archive/README.md) | Archived per-project roadmaps and point-in-time reports (read-only reference) |
| [`archive/2026-04/`](archive/2026-04/) | 19 files archived 2026-04-23 (see `OUTSTANDING.md §3` for archive log) |
| [`crm13-docs/`](crm13-docs/README.md) | Imported CRM13 donor documentation — feature parity reference, not active status truth |
| [`email-templates/`](email-templates/README.md) | Supabase email template HTML files (signup, invite, magic link, etc.) |
| [`plans/`](plans/README.md) | Implementation plans for upcoming features — authoritative plan index |
| `superpowers/` | D2C theme remediation design specs |
