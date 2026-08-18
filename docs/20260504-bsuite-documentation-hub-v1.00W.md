# BSuite Documentation Hub — Cross-Submodule Index

**Doc ID:** 20260504-bsuite-documentation-hub-v1.00W
**Status:** W (Working — promote to A after first cross-link sweep of all 6 submodule READMEs is merged)
**Scope:** Parent bsuite repo + all six submodule `docs/` folders
**Purpose:** Single entry point for finding any BSuite documentation. Like-for-like mapping across apps. Every document in every repo must be discoverable from here or from an app's `docs/README.md`.
**Companions:** `20260504-bsuite-tech-stack-alignment-v1.00W.md` (tech baseline), `docs/README.md` (parent docs index), `docs/adr/README.md` (ADR index)

> **R80.3 → R80.4 corrected 2026-08-17.** R80.3 left the submodule set on 2026-08-06 (`5e000c35`,
> operator directive) to `~/Desktop/Dev/archived-repos-docs/R80.3`; R80.4 took its place and is what
> serves `r8.crm7.app` today. This is a living cross-submodule index (Status: W), so app-name
> mentions below — the topology tree, the like-for-like mapping tables, the cross-cutting ownership
> table — are updated to R80.4 in place. **§3.5 is different and is banner-only, not renamed:** its
> whole content is a verified-2026-05-04 file listing for `R80.3/docs/`, a folder that no longer
> exists at that path. Renaming it to `R80.4/docs/` would assert this session confirmed R80.4 ships
> the same files at the same paths, which it did not — so §3.5 is marked superseded instead. The
> same caution applies to every *specific dated file path* under `R80.3/docs/` referenced elsewhere
> in this document (the Fair Work row in §2.2 and §4, the §3.5 cross-links, and the closing index) —
> those are marked unverified rather than repointed to a guessed R80.4 path.

---

## 1. Documentation Topology

BSuite documentation lives in **seven** `docs/` folders:

```
bsuite/                          ← parent repo
├── docs/                        ← parent canonical docs (master roadmap, ADRs, architecture)
├── business-suite-unified/docs/ ← BSU (portal + OAuth server + platform admin)
├── crm7/docs/                   ← CRM7 (CRM + AI + canonical AI-SDK patterns)
├── conduit/docs/                ← Conduit (ATS — Next.js)
├── braden/docs/                 ← Braden (corporate site — corporate theme)
├── R80.4/docs/                  ← R80.4 (wage calculator — compliance-critical; was R80.3/docs/ until 2026-08-06)
└── throughput/docs/             ← Throughput (idea management — Groq AI)
```

**Hierarchy:**

- **Parent `docs/`** = canonical source of truth for cross-app concerns (architecture, tech stack, roadmaps, ADRs)
- **Parent root docs** (`AGENTS.md`, `CLAUDE.md`, `MEMORY_PROTOCOL.md`) = living authority for agent-facing conventions (auth topology, OAuth allowlist, zero-defer policy)
- **Submodule `docs/`** = app-specific references that must not contradict parent canon. Cross-link back to parent for shared concerns.
- **Archive folders** (`docs/archive/` in parent + per-submodule archive sections) = historical reference, never deleted, never authoritative for forward work

**Authority precedence** when docs conflict:

1. ADRs in `docs/adr/` (governance decisions)
2. `AGENTS.md` / `CLAUDE.md` at repo root (living agent conventions)
3. Packages in `packages/` (e.g., `@bsuite/theme` for theme tokens, `@bsuite/schema-registry` for entity definitions)
4. W-status / A-status parent `docs/` files
5. Submodule `docs/` files
6. Archived snapshots (reference only)

---

## 2. Parent Canonical Documents (bsuite/docs/)

Full list in `docs/README.md`. Canonical sources are split into **Living Authority** (actively maintained) and **Archived Reference Snapshots** (reference-complete, superseded by code or newer docs).

### 2.1 Living Authority (actively maintained)

| Doc | Status | Purpose |
|---|---|---|
| `../AGENTS.md` | Living | Agent/developer guide — project-wide conventions, auth topology, OAuth allowlist (ADR-0004 SSoT), pnpm lockfile recipe, AI Implementation Standards, Frontend Layout & Z-Index Standards |
| `../CLAUDE.md` | Living | Claude-facing agent brief — mirrors AGENTS.md content |
| `../MEMORY_PROTOCOL.md` | Living | QIG Memory API persistent session protocol |
| `00-roadmap/20260112-master-roadmap-1.00W.md` | W (authoritative) | Master roadmap — SSoT for planning and delivery *(repointed 2026-07-28; previous v5 file archived 2026-07-08)* |
| `20260425-bsuite-finish-line-roadmap-v1.00W.md` | W | Finish-line roadmap — 154-item P0/P1/P2 execution order |
| `20260501-merged-execution-backlog-v1.00W.md` | W (active queue) | Active phase-ordered queue post-Phase-0 ratification — single execution queue |
| `20260227-contributing-standards-guide-v1.01W.md` | W | Universal quality + doc standards (supersedes v1.00A) |
| `20260227-dry-one-shot-architecture-v1.04A.md` | A | DRY one-shot policy — single owning app per entity |
| `archive/2026-06/20260317-bsuite-gap-report-v2.00W.md` | W | Gap report v2 — current authority (with §11 finish-line reconciliation) |
| `archive/2026-06/20260319-entity-crosswalk-v1.00D.md` | D | CRM7 entity crosswalk + traceability |
| `20260424-env-var-contributing-rules-v1.00W.md` | W | Environment variable conventions |
| `archive/2026-06/20260501-phase-0-completion-report-v1.00W.md` | W | Phase-0 ratification evidence |
| `20260504-bsuite-tech-stack-alignment-v1.00W.md` | W | **Canonical tech-stack baseline** (this hub's companion) |
| `20260504-schema-builder-phase-3-plan-v1.00W.md` | W | Schema builder phase 3 plan |
| `20260504-schema-builder-phase-3-signoff-v1.00W.md` | W | Schema builder phase 3 signoff |
| `OUTSTANDING.md` | Living | Parent-level outstanding items |
| `NEW_ISSUES_FOUND.md` | Living | Recent issues discovered during audits/deploys |
| `adr/` | Index in `adr/README.md` | Architectural Decision Records (ADR-0001 through ADR-0006) |
| `plans/` | Index in `plans/README.md` | Active implementation plans |

### 2.2 Code- and Package-Based Authority

Some concerns no longer have a living markdown spec — the **package** or **code** is the source of truth.

> **No version numbers appear in this section, deliberately.** Naming a version here
> creates a SECOND source of truth beside the package, and it is the one that never gets
> updated. Measured 2026-08-18, every pin this table carried had drifted, several by
> whole majors:
>
> | named here | actually published |
> |---|---|
> | `@bsuite/theme@0.3.3` | 1.0.0 |
> | `@bsuite/schema-registry@0.3.1` | 1.0.2 |
> | `@bsuite/charge-calc@0.2.3` | 0.14.0 |
> | `@bsuite/schema-builder@0.7.0` | 1.3.1 |
> | `@bsuite/page-builder@0.9.0` | 1.0.0 |
>
> The row's whole claim is that the PACKAGE is authoritative. `npm view @bsuite/<name>
> version` answers "which version" in one command and cannot go stale; a number typed
> into prose can only ever be right on the day it was typed.

| Concern | Authoritative source | Reference snapshot (archive) |
|---|---|---|
| D2C theme tokens + preset | `packages/theme/` (@bsuite/theme) — `preset-v4.css`, oklch tokens | `docs/archive/parent/2026-04-30-references-approved/20260228-d2c-theme-specification-v1.00A.md` |
| Authentication + session topology | `AGENTS.md` §Authentication & OAuth + `CLAUDE.md` mirror | `docs/archive/parent/2026-04-30-references-approved/20260227-auth-map-reference-v1.00A.md` |
| Navigation structure | `crm7/src/config/navigation.ts` (runtime source of truth) | `docs/archive/parent/2026-04-30-references-approved/20260316-navigation-reference-v1.00A.md`, `20260316-navigation-guide-v1.00A.md` |
| UI architecture + source chain | `packages/ui/` (in progress) + `packages/theme/` | `docs/archive/parent/2026-04-30-references-approved/20260316-ui-reference-v1.00A.md` |
| Entity + field definitions | `packages/schema-registry/` (@bsuite/schema-registry) | `docs/archive/2026-06/20260319-entity-crosswalk-v1.00D.md` (living) |
| RBAC + permissions | `business-suite-unified/docs/20260316-bsu-crm7-rbac-rls-reference-v1.00W.md` + CRM7 `permissionConstants.ts` | `docs/archive/parent/2026-04-30-references-approved/20260301-crm7-rbac-matrix-v1.00A.md` |
| Fair Work API integration | *unverified 2026-08-17 — was `R80.3/docs/20260304-r80-fairwork-api-reference-v1.01W.md` (canonical) + R80.3 + CRM7 src; R80.3 archived, R80.4 equivalent not confirmed* | `docs/archive/parent/2026-04-30-references-approved/20260310-fairwork-reference-v1.00A.md` |
| GTO National Standards | CRM7 compliance code | `docs/archive/parent/2026-04-30-references-approved/20260228-gto-standards-reference-v1.00A.md` |
| RAM credential + gov API access | `crm7/supabase/functions/generate-document/index.ts` (live impl) | `docs/archive/parent/2026-04-30-references-approved/20260304-ram-credential-government-access-map-v1.00A.md` |
| WCAG contrast audit | Living tokens in `@bsuite/theme` | `docs/archive/parent/2026-04-30-audits-closed/20260407-d2c-wcag-contrast-audit-v1.00A.md` |
| Colour-token audit | Living | `docs/archive/parent/2026-04-30-audits-closed/20260425-colour-token-audit-v1.00W.md` |

### 2.3 Archived Reference Snapshots

Historical references retained for context. Do **not** consult these for forward-looking work — use the "Authoritative source" column above instead.

- [`docs/archive/parent/2026-04-30-references-approved/README.md`](./archive/README.md) — 24 approved reference docs archived 2026-04-30 (auth map, D2C theme, UI/nav/matrix/compliance references, fairwork reference, GTO standards, RAM credential, pricing, competitive landscape, CRM7A research, CRM8U research)
- [`docs/archive/parent/2026-04-30-audits-closed/README.md`](./archive/parent/2026-04-30-audits-closed/) — closed-loop audits (WCAG contrast, colour-token, Web Vitals baseline)
- [`docs/archive/parent/2026-04-25-finish-line/README.md`](./archive/parent/2026-04-25-finish-line/) — WS-H sweep (pre-finish-line consolidation)
- [`docs/archive/2026-05-04-doc-unification/README.md`](./archive/README.md) — this session's archive (Codex Phase 2 shared-packages plan)
- [`docs/archive/README.md`](./archive/README.md) — full archive index

### 2.4 Active Plans

See `docs/plans/README.md` for the live index. Active plans as of 2026-05-04:

- `20260227-boot-compliance-engine-specification-v1.00A.md` — BOOT compliance engine spec
- `20260302-r80-crm7-integration-audit-v1.00A.md` — R80.3 ↔ CRM7 integration audit
- `archive/2026-06/20260316-crm7-broad-ui-refresh-plan-v1.00W.md` — CRM7 broad UI refresh (D2C Neon)
- `archive/2026-06/20260423-bsuite-production-plan-v1.00W.md` — Refreshed audit + full production plan
- `20260423-gto-billing-reporting-refined-plan-v1.00A.md` — Billing / STP2 / Payday Super (Approved)
- `archive/2026-06/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` — Full-7 audit + UX upgrade
- `20260501-universal-wysiwyg-schema-ux-v1.00W.md` — Universal WYSIWYG + schema-driven UX

### 2.5 Other parent folders

- `ai/` — CRM7 AI assistant documentation
- `archive/` — historical plans; organised by submodule and by date
- `crm13-docs/` — imported CRM13 donor documentation (reference-only)
- `email-templates/` — Supabase email template HTML
- `operator-screenshots/` — operator handoff screenshots
- `superpowers/` — D2C theme remediation design specs
- `testing/` — cross-app testing reference (if present)

---

## 3. Submodule Docs Index

### 3.1 business-suite-unified (BSU) — Portal + OAuth server

**Folder:** `business-suite-unified/docs/` | **README:** `business-suite-unified/docs/README.md` | **Cross-links:** `business-suite-unified/docs/PARENT-DOCS.md`

Actual files (verified 2026-05-04):

| Doc | Purpose |
|---|---|
| ~~`OUTSTANDING-SYSTEM.md`~~ | Removed 2026-05-19 (bsuite#488); content merged into parent `docs/20260501-merged-execution-backlog-v1.00W.md` |
| ~~`OUTSTANDING-PLANS.md`~~ | Removed 2026-05-19 (bsuite#488); content merged into parent `docs/20260501-merged-execution-backlog-v1.00W.md` |
| `20260316-bsu-debug-guide-v1.00W.md` | Debug guide |
| `20260316-bsu-security-reference-v1.00W.md` | Security reference (CSP, auth hardening) |
| `20260316-bsu-schema-diagram-v1.00W.md` | Unified schema ERD |
| `20260316-bsu-unified-schema-migration-guide-v1.00W.md` | Migration guide to unified schema |
| `20260316-bsu-deployment-notes-v1.00W.md` | Deployment-topology notes |
| `20260316-bsu-inventory-v1.00W.md` | Workspace inventory |
| `20260316-bsu-maintenance-guide-v1.00W.md` | Maintenance guidelines |
| `20260316-bsu-crm7-rbac-rls-reference-v1.00W.md` | RBAC + RLS policies (canonical) |
| `20260316-bsu-crm7-supabase-audit-v1.00W.md` | Supabase audit — UI-to-backend mapping |
| `20260316-bsu-supabase-apply-runbook-v1.00W.md` | Runbook for applying schema + RLS |
| `20260316-bsu-idea-hub-feature-v1.00W.md` | `/ideas` route design |
| `20260418-auth-dashboard-hardening-v1.00W.md` | Dashboard hardening (`xms_edov`, allowlist) |
| `20260425-e2e-hang-rca-v1.00A.md` | WCAG E2E hang RCA (Approved) |
| `crm7_openapi.yaml`, `llm_openapi.yaml`, `payments_openapi.yaml` | OpenAPI specs |

**Cross-app role:** OAuth server for all `.crm7.app` apps, platform admin, billing (Stripe), tenant management, schema-builder + page-composer admin UI owner.

**Target gaps (not yet present as dedicated docs):** dedicated OAuth runbook, schema-builder admin guide, page-composer admin guide, BSU ↔ Conduit sync patterns. Currently these concerns are embedded in the runbooks above or tracked in OUTSTANDING.

---

### 3.2 crm7 — CRM + AI

**Folder:** `crm7/docs/` | **README:** `crm7/docs/README.md` | **Cross-links:** `crm7/docs/PARENT-DOCS.md`

Actual structure (verified 2026-05-04) — richest submodule docs folder:

| Doc / subfolder | Purpose |
|---|---|
| ~~`OUTSTANDING.md`~~ | Removed 2026-05-19 (bsuite#488); content merged into parent `docs/20260501-merged-execution-backlog-v1.00W.md`. `crm7/docs/reference/OUTSTANDING.md` (per-area audit) is retained — outside bsuite#488 scope |
| `20260316-crm7-ai-strategic-vision-v1.00W.md` | AI roadmap and strategic direction |
| `20260421-xero-oauth-runbook-v1.00W.md` | Xero OAuth activation runbook |
| `20260309-crm7-gto-owner-flow-completeness-matrix-v1.00W.md` | GTO owner flow completeness matrix |
| `architecture/` | System design + AI sessions schema + one-shot entry roadmap |
| `deployment/` | Vercel deployment + Stripe config + deployment checklists |
| `guides/` | Best practices + migration guides |
| `operations/` | QA + smoke tests |
| `plans/` | BSuite GTO master plan + WS3–WS9 implementation plan + UX one-shot deep dive |
| `reference/` | Routes, DB schema, auth, accessibility, boot assessment UI, feature flags, Xero integration |
| `troubleshooting/` | SIGILL, browser crash monitoring, auth fixes, dependency audit |
| `archive/` | Historical reports and completion summaries |

**Cross-app role:** CRM7 is the canonical reference for **AI SDK patterns**, **dashboard dnd-kit widgets**, **Tier-3 EntitySelectors**, and **`@bsuite/charge-calc` consumption**. Other apps port from here. Navigation SSoT: `crm7/src/config/navigation.ts`.

---

### 3.3 conduit — ATS (Next.js)

**Folder:** `conduit/docs/` | **README:** `conduit/docs/README.md` | **Cross-links:** `conduit/docs/PARENT-DOCS.md`

Actual files (verified 2026-05-04):

| Doc | Purpose |
|---|---|
| ~~`OUTSTANDING.md`~~ | Removed 2026-05-19 (bsuite#488); content merged into parent `docs/20260501-merged-execution-backlog-v1.00W.md` |
| `20260303-rbac-architecture-design-v1.00W.md` | RBAC architecture — portal roles, Conduit roles, 69 permissions |
| `20260303-theme-system-design-v1.00W.md` | D2C Neon Electric theme implementation for Conduit |
| `archive/` | Archived per-feature specs |

**Cross-app role:** Only Next.js app. Canonical reference for **SSR auth** (`@supabase/ssr`), **server components**, **Next 16 App Router patterns**, **AI routes** (`DefaultChatTransport`, `toUIMessageStreamResponse` — documented in parent `AGENTS.md` §AI Implementation Standards).

---

### 3.4 braden — Corporate site (braden.com.au)

**Folder:** `braden/docs/` | **README:** `braden/docs/README.md` | **Cross-links:** `braden/docs/PARENT-DOCS.md`

Actual files (verified 2026-05-04):

| Doc | Purpose |
|---|---|
| ~~`OUTSTANDING.md`~~ | Removed 2026-05-19 (bsuite#488); content merged into parent `docs/20260501-merged-execution-backlog-v1.00W.md` |
| `20260316-braden-roadmap-v1.00W.md` | Website customisation roadmap |
| `20260316-braden-architecture-v1.00W.md` | Architecture + core components |
| `20260316-braden-bot-protection-v1.00W.md` | Vercel BotID integration |
| `20260316-braden-corporate-theme-reference-v1.00W.md` | Corporate brand reference |
| `20260316-braden-csp-security-v1.00W.md` | CSP configuration |
| `20260316-braden-environment-setup-dev-guide-v1.00W.md` | Environment variable setup |
| `20260316-braden-getting-started-v1.00W.md` | Getting started guide |
| `20260316-braden-qa-configuration-v1.00W.md` | QA tooling |
| `20260316-braden-rls-policies-v1.00W.md` | RLS + storage policies |
| `20260316-braden-ui-ux-best-practices-v1.00W.md` | UI/UX best practices + API coverage matrix |
| `20260316-braden-yarn-lockfile-maintenance-v1.00W.md` | Lockfile hygiene (legacy yarn reference) |
| Brand asset images | `GoldSquare.png`, `noBgBlack.png`, `noBgGold.png`, `noBgWhite.png`, `no_padding.png` |
| `archive/` + `archive/2026-04/` | Historical docs |

**Cross-app role:** Corporate marketing site. Uses **Corporate palette** (not D2C Neon). Uses **BS OAuth** (different TLD, no cookie SSO). Primary `@bsuite/nav-core` consumer.

---

### 3.5 R80.3 — Wage calculator — **SUPERSEDED 2026-08-17**

> R80.3 left the submodule set on 2026-08-06 (`5e000c35`, operator directive); **R80.4** now serves
> `r8.crm7.app`. This section is left as a historical record of what `R80.3/docs/` held on
> 2026-05-04 rather than repointed to `R80.4/docs/` — this session did not check out R80.4 to
> confirm it carries an identical file list, and a guessed rename would be a fabricated reference.
> Treat every path below as **archived, not live**.

**Folder:** `R80.3/docs/` (archived) | **README:** `R80.3/docs/README.md` (archived) | **Cross-links:** `R80.3/docs/PARENT-DOCS.md` (archived)

Actual files (verified 2026-05-04, R80.3 — pre-archive):

| Doc | Purpose |
|---|---|
| `20260304-r80-unified-schema-summary-v1.00W.md` | Implementation summary of unified schema |
| `20260304-r80-unified-schema-v1.00W.md` | Unified BSuite schema documentation |
| `20260304-r80-unified-schema-diagram-v1.00W.md` | ERD for unified schema |
| `20260304-r80-unified-schema-implementation-v1.00W.md` | Implementation guide |
| `20260304-r80-unified-schema-quickstart-v1.00W.md` | Quick start for developers |
| `20260304-r80-billing-models-reference-v1.00W.md` | Three billing models |
| `20260304-r80-external-wage-sources-reference-v1.00W.md` | Wage source CSV import |
| `20260304-r80-fairwork-api-reference-v1.01W.md` | Fair Work API reference + 3-layer cache ladder (canonical) |
| `20260304-r80-roadmap-v1.00W.md` | Archived roadmap (points to master) |
| `20260304-r80-training-fees-feature-v1.00W.md` | Training fees annual distribution |
| `20260418-payday-super-feature-v1.00W.md` | Payday Super calculator (1 Jul 2026 regulatory change) |
| `20260304-r80-deploy-guide-v1.00W.md` | Deployment guide |
| `sample-wage-data.csv` | Sample wage data |
| `archive/` + `plans/` | Historical docs + active plans |

**Cross-app role:** Compliance-critical wage calculator. Canonical for **Fair Work API integration** and **`@bsuite/charge-calc` consumption** (alongside CRM7).

---

### 3.6 throughput — Idea management (Groq AI)

**Folder:** `throughput/docs/` | **README:** `throughput/docs/README.md` (created 2026-05-04) | **Cross-links:** `throughput/docs/PARENT-DOCS.md`

Key documents: 20+ per-component docs (alert, badge, button, card, input, modal, textarea) + system architecture, Groq architecture/integration, RLS, roadmap, user guide, troubleshooting, navigation UX guide, development, outstanding, quality improvements, conversation map, components guide. See [`throughput/docs/README.md`](../throughput/docs/README.md) for the complete list.

**Cross-app role:** Idea hub + Groq AI experimentation. Tailwind has been brought to v4; remaining tech-stack gaps are zero Radix/shadcn adoption, outdated Supabase-JS/Zod, and strict-mode work. See `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md` §5 TS-02 → TS-04.

---

## 4. Like-for-Like Document Mapping

Every shared concern should be documented in each submodule where it applies, with identical structure and a cross-link back to the parent canonical doc or authoritative source (code/package). This is the target state. Gaps are tracked in `docs/OUTSTANDING.md`.

| Concern | Authoritative source | BSU | CRM7 | Conduit | Braden | R80.4 | Throughput |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| OUTSTANDING | `docs/OUTSTANDING.md` (SSoT — `docs/20260501-merged-execution-backlog-v1.00W.md` is the active execution queue) | ❌ removed 2026-05-19 (bsuite#488) | ❌ removed 2026-05-19 (bsuite#488); `docs/reference/OUTSTANDING.md` is per-area audit and retained | ❌ removed 2026-05-19 (bsuite#488) | ❌ removed 2026-05-19 (bsuite#488) | ❌ removed 2026-05-19 (bsuite#488) | `20260425-throughput-outstanding-v1.00W.md` (throughput-local, out of bsuite#488 scope) |
| Roadmap | `docs/00-roadmap/20260112-master-roadmap-1.00W.md` *(repointed 2026-07-28; previous v5 file archived 2026-07-08)* | ✅ cross-link | ✅ `ROADMAP.md` | n/a (lives in parent) | n/a | n/a | `20250829-throughput-roadmap-v1.00W.md` ✅ |
| Auth topology | `AGENTS.md` §Auth + `CLAUDE.md` mirror (archived snapshot: `archive/parent/2026-04-30-references-approved/20260227-auth-map-reference-v1.00A.md`) | ⚠️ cross-link gap | ⚠️ cross-link gap | ⚠️ cross-link gap | ⚠️ cross-link gap | ⚠️ cross-link gap (R80.4) | ⚠️ cross-link gap |
| Theme tokens | `@bsuite/theme` package source | ⚠️ cross-link gap | ⚠️ cross-link gap | ⚠️ cross-link gap | Corporate brand ✅ in `20260316-braden-corporate-theme-reference` | ⚠️ cross-link gap (R80.4) | ⚠️ cross-link gap |
| Navigation | `crm7/src/config/navigation.ts` (runtime SSoT) | ⚠️ cross-link gap | ✅ (code owner) | ⚠️ cross-link gap | `@bsuite/nav-core` consumer ✅ | ⚠️ cross-link gap (R80.4) | `20251014-throughput-navigation-ux-guide-v1.00W.md` ✅ |
| Component library | `packages/ui/` (in progress) | ⚠️ gap | ⚠️ gap | ⚠️ gap | ⚠️ gap | ⚠️ gap (R80.4) | full component docs ✅ (20+ files) |
| DRY architecture | `docs/20260227-dry-one-shot-architecture-v1.04A.md` | ⚠️ cross-link only | ✅ `ENTITY-SELECTORS.md` | ⚠️ cross-link only | n/a | ⚠️ cross-link only (R80.4) | n/a |
| Tech stack | `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md` | ⚠️ cross-link only | ⚠️ cross-link only | ⚠️ cross-link only | ⚠️ cross-link only | ⚠️ cross-link only (R80.4) | ⚠️ cross-link only |
| Charge calc | `@bsuite/charge-calc` package | n/a | `CHARGE-CALC.md` ✅ | n/a | n/a | `CHARGE-CALC.md` — unverified in R80.4 | n/a |
| Compliance | R80.3 `20260304-r80-fairwork-api-reference-v1.01W.md` + CRM7 code (archived — R80.4 equivalent unverified) | ⚠️ | ✅ (referenced) | n/a | n/a | ✅ canonical impl (R80.4) | n/a |
| AI integration | CRM7 code + `AGENTS.md` §AI Implementation Standards | n/a | ✅ canonical | ✅ consumer | n/a | n/a | ✅ Groq-specific |
| Schema builder | `@bsuite/schema-builder` | ✅ UI owner | ⚠️ consumer | ⚠️ consumer | n/a | ⚠️ consumer | n/a |
| Page builder | `@bsuite/page-builder` | ✅ admin UI | ⚠️ consumer | ⚠️ consumer | n/a | ⚠️ consumer (R80.4) | n/a |

**Gaps (⚠️) are the cross-link sweep backlog.** Each submodule has a dedicated `docs/PARENT-DOCS.md` file linking back to the Living Authority docs in §2.1 and the archived snapshots in §2.3. The shared section of those files is intentionally **byte-identical** across all 6 submodules except for the app-specific trailer — any divergence is a bug flagged by the monthly audit. The sweep was performed 2026-05-04 — see `docs/archive/2026-05-04-doc-unification/README.md`.

**Naming-convention exception:** `PARENT-DOCS.md`, `OUTSTANDING.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `MEMORY_PROTOCOL.md` are sanctioned deviations from the `YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md` convention. These files are identified by role-based names so contributors can locate them without knowing creation dates. All other documentation must follow the dated-versioned convention.

---

## 4.1 Cross-Cutting Feature Ownership

For each cross-app feature, exactly one app is the **owner** (canonical implementation + CRUD UI). All other apps are **readers** that deep-link rather than duplicate. This table is the authoritative ownership map — enforced by `@bsuite/dry-lint` at error level.

| Domain / Feature | Owning app | Readers | Canonical reference |
|---|---|---|---|
| Platform admin + OAuth server | BSU | all clients | `business-suite-unified/docs/` + `AGENTS.md` §Auth |
| Tenant branding (3-tier) | BSU | all clients | `business-suite-unified/docs/` + `@bsuite/theme` package |
| Platform logo (`usePlatformLogo`) | BSU (DB owner) + `@bsuite/theme` (runtime) | all clients | `packages/theme/` |
| Schema builder admin UI | BSU | all clients (as consumers) | `packages/schema-builder/` |
| Page composer admin UI | BSU | all clients (as consumers) | `packages/page-builder/` |
| Universal canvas (PageGridLayout) | `@bsuite/page-builder` | BSU, CRM7, Conduit, R80.4 | `packages/page-builder/` |
| Dashboard dnd-kit widget pattern | CRM7 (canonical) | BSU, R80.4 | CRM7 dashboard source |
| AI SDK patterns (streamText, tool calls) | CRM7 (canonical) | Conduit, Throughput | CRM7 AI source + `AGENTS.md` §AI Implementation Standards |
| Tier-3 EntitySelectors | CRM7 | BSU, R80.4, Conduit | CRM7 components + `docs/20260227-dry-one-shot-architecture-v1.04A.md` |
| Contact CRUD | CRM7 | all other apps read via Supabase | `docs/archive/2026-06/20260319-entity-crosswalk-v1.00D.md` |
| Client CRUD | CRM7 | all other apps read via Supabase | `docs/archive/2026-06/20260319-entity-crosswalk-v1.00D.md` |
| Apprentice / Placement CRUD | CRM7 | R80.4, Conduit | `docs/archive/2026-06/20260319-entity-crosswalk-v1.00D.md` |
| Vacancy / Candidate / Application CRUD | Conduit | CRM7 (reads for hire flow) | Conduit source |
| Public careers page (JobPosting JSON-LD) | Conduit | — | Conduit source |
| Wage calculation engine | `@bsuite/charge-calc` | CRM7, R80.4 | `packages/charge-calc/` |
| Fair Work API integration | R80.4 (canonical) | CRM7 (reads) | *unverified — was `R80.3/docs/20260304-r80-fairwork-api-reference-v1.01W.md` (archived)* |
| Billing / Stripe | BSU | CRM7 (reads plan) | `business-suite-unified/docs/` |
| Corporate marketing surface | Braden | — | `braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md` |
| Idea management + Groq AI | Throughput | — | `throughput/docs/20250509-throughput-system-architecture-v1.00W.md` |
| Navigation primitives (shared components) | `@bsuite/nav-core` | Braden (primary); D2C apps migrating | `packages/nav-core/` |
| Data export (xlsx/csv/pdf) | `@bsuite/data-export` | CRM7, R80.4 (primary); all eligible | `packages/data-export/` |
| Shared auth client (OAuth 2.1 PKCE + JWKS) | `@bsuite/auth` | all 5 clients (migration in progress) | `packages/auth/` |
| DRY one-shot ownership enforcement | `@bsuite/dry-lint` | all 6 apps (error level) | `packages/dry-lint/` + `docs/20260227-dry-one-shot-architecture-v1.04A.md` |

**Disputes:** if two apps claim ownership of the same domain, raise an ADR in `docs/adr/` and resolve before merging any related code.

---

## 5. Documentation Standards (summary)

Full standards in `docs/20260227-contributing-standards-guide-v1.01W.md`. Essentials every agent must follow:

- **Naming:** `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`
- **Status codes:** W=Working, D=Draft, R=Review, A=Approved, F=Frozen
- **Every `docs/` folder has a README.md index**
- **Cross-link from submodule → parent for shared concerns** (tech stack, DRY, governance)
- **Never duplicate parent canonical content** in a submodule — link to it instead
- **Archive, do not delete.** When content is superseded, move to `docs/archive/[<scope>/]<date>-<reason>/` with an archive note. Scope segment is optional — use `parent` for parent-level archives, `<app>` for app-scoped archives, or omit if the sweep spans scopes (e.g., `docs/archive/2026-05-04-doc-unification/`).
- **Update roadmaps + execution backlog in the same PR** that ships the work — do not let roadmap and code drift apart. Items shipped from `docs/20260501-merged-execution-backlog-v1.00W.md` must be struck through in the same PR, and only then eligible for archival in the next quarterly pass.

---

## 6. ADR Index

See `docs/adr/README.md` for the canonical ADR index. Key ADRs:

| ADR | Decision |
|---|---|
| 0001 | Working branch = `development`, default = `main` |
| 0002 | `@bsuite/*` packages published to public npm; consumers use caret-pinned npm versions |
| 0003 | pnpm lockfile regeneration must happen outside the bsuite tree |
| 0004 | AGENTS.md is the SSoT for Supabase redirect-URI allowlist |
| 0005 | Zero-defer policy — fix discovered issues in the same session |
| 0006 | OAuth providers: Google + Microsoft (Azure) only; GitHub intentionally absent |

---

## 7. Maintenance Protocol

This hub must be updated when:

- A new submodule is added
- A new `@bsuite/*` package is published
- A new cross-app concern emerges that needs like-for-like coverage
- A parent canonical doc is created, superseded, or archived
- A submodule `docs/` structure changes materially

The doc review cycle:

- **Monthly** — reconcile the like-for-like matrix (§4) against actual submodule docs/README.md contents
- **Per PR** — if a PR adds a new shared concern, update §4 in the same PR
- **Quarterly** — archive pass: move superseded plans from `docs/plans/` to `docs/archive/`, **only after** the backlog entries for those plans have been struck through

The active execution queue is `docs/20260501-merged-execution-backlog-v1.00W.md` — consult it before archiving any plan to confirm all items are shipped.

---

## 7.1 Audit Cadence

| Cadence | What gets reviewed | Who runs it | Evidence artifact |
|---|---|---|---|
| **Weekly** | `docs/OUTSTANDING.md`, `docs/NEW_ISSUES_FOUND.md`, per-submodule `OUTSTANDING*.md` | Platform lead | Weekly triage note appended to `docs/OUTSTANDING.md` |
| **Per-release** | `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` + `docs/20260501-merged-execution-backlog-v1.00W.md` | Release captain | Release notes + roadmap strike-throughs in the promotion PR |
| **Monthly** | `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md` §2/§4/§5 matrices | Shared packages lead | Change Log entry in the tech-stack alignment doc |
| **Monthly** | Submodule `docs/PARENT-DOCS.md` files (verify byte-identical shared section; CI diff script) | Shared packages lead | Diff note in `docs/OUTSTANDING.md` |
| **Quarterly** | Archive pass — move superseded plans from `docs/plans/` → `docs/archive/[<scope>/]<date>-<reason>/` | Platform lead | Archive README with archival rationale (see `docs/archive/2026-05-04-doc-unification/README.md` as template) |
| **Per-PR** | If PR adds a new cross-app concern → update §4 + §4.1 in same PR | PR author | File diff in PR |
| **Per-PR** | If PR bumps a shared `@bsuite/*` version → update tech-stack alignment §3 in same PR | PR author | File diff in PR |
| **Per-PR** | If PR ships a merged-backlog item → strike through the item in the backlog in same PR | PR author | Backlog diff in PR |

Any audit that surfaces a new gap must flow into §5 of `docs/20260504-bsuite-tech-stack-alignment-v1.00W.md` (as a TS-XX row) **and** into the owner-prefixed register (§5.1 of that doc) in the same PR.

---

## 7.2 Authority Matrix — Who Decides What

| Decision | Authority | Escalation | Documented in |
|---|---|---|---|
| Add / remove `@bsuite/*` package | Shared packages lead | Platform lead via ADR | `docs/adr/` |
| Bump a shared package major version | Shared packages lead + affected app maintainers | Platform lead | Tech-stack alignment §3 + Change Log |
| Tech-stack baseline change (React, TS, Tailwind major versions) | Platform lead | Owner | ADR in `docs/adr/` |
| Theme deviation (non-Braden exception) | Owner | — | ADR (must cite sunset path) |
| New cross-app ownership claim | Platform lead via ADR | Owner | `docs/adr/` + hub §4.1 |
| OAuth provider list change | Owner only | — | AGENTS.md §Mandatory OAuth Providers (hard constraint) |
| Supabase redirect-URI allowlist change | Platform lead | Owner | AGENTS.md §Preview Deployments (ADR-0004) |
| RLS policy change on shared tables | Platform lead + security reviewer | Owner | Migration in owning repo + audit in `docs/` |
| Archive a plan from `docs/plans/` → `docs/archive/` | Platform lead | — | Archive README with evidence + backlog strike-through confirmation |
| Promote doc W → A status | Author + at least one reviewer | Platform lead | Change Log entry in the doc itself |
| Enforce `@bsuite/dry-lint` error at new level | Shared packages lead | Platform lead | Rule published in `packages/dry-lint/` + per-app consumer PR |

Decisions without a recorded authority default to the Platform lead. Any "Owner" decision (tech-stack baseline, OAuth providers) is non-delegable.

---

## 7.3 Quick Links

Fast navigation for agents and contributors. Bookmark this section.

### Governance

- [Master roadmap (SSoT)](./00-roadmap/20260112-master-roadmap-1.00W.md) *(repointed 2026-07-28; previous v5 file archived 2026-07-08)*
- [Finish-line roadmap](./20260425-bsuite-finish-line-roadmap-v1.00W.md)
- [Active execution backlog](./20260501-merged-execution-backlog-v1.00W.md)
- [Tech-stack baseline](./20260504-bsuite-tech-stack-alignment-v1.00W.md)
- [Contributing standards](./20260227-contributing-standards-guide-v1.01W.md)
- [Parent AGENTS.md](../AGENTS.md)
- [Parent CLAUDE.md](../CLAUDE.md)
- [ADR index](./adr/README.md)

### Per-submodule entry points

- [BSU docs](../business-suite-unified/docs/README.md) · [cross-links](../business-suite-unified/docs/PARENT-DOCS.md)
- [CRM7 docs](../crm7/docs/README.md) · [cross-links](../crm7/docs/PARENT-DOCS.md)
- [Conduit docs](../conduit/docs/README.md) · [cross-links](../conduit/docs/PARENT-DOCS.md)
- [Braden docs](../braden/docs/README.md) · [cross-links](../braden/docs/PARENT-DOCS.md)
- [R80.4 docs](../R80.4/docs/README.md) · [cross-links](../R80.4/docs/PARENT-DOCS.md) *(was `../R80.3/docs/`, archived 2026-08-06)*
- [Throughput docs](../throughput/docs/README.md) · [cross-links](../throughput/docs/PARENT-DOCS.md)

### Architecture + governance

- [DRY one-shot architecture (Approved)](./20260227-dry-one-shot-architecture-v1.04A.md)
- [Entity crosswalk](./archive/2026-06/20260319-entity-crosswalk-v1.00D.md)
- [Gap report v2](./archive/2026-06/20260317-bsuite-gap-report-v2.00W.md)
- [Env var rules](./20260424-env-var-contributing-rules-v1.00W.md)
- [Phase-0 completion report](./archive/2026-06/20260501-phase-0-completion-report-v1.00W.md)

### Living trackers

- [Parent OUTSTANDING](./OUTSTANDING.md)
- [New issues found](./NEW_ISSUES_FOUND.md)
- [Plans index](./plans/README.md)

### Archive

- [Archive index](./archive/README.md)
- [2026-05-04 doc-unification archive](./archive/README.md)
- [2026-04-30 references-approved snapshots](./archive/README.md)
- [2026-04-30 audits-closed snapshots](./archive/parent/2026-04-30-audits-closed/)
- [2026-04-25 finish-line archive](./archive/parent/2026-04-25-finish-line/)

---

## 8. Change Log

| Version | Date | Change |
|---|---|---|
| 1.00W | 2026-05-04 | Initial canonical cross-submodule documentation hub. Verified against all 7 `docs/` folders on `development` branch. §2 restructured into Living Authority (2.1) + Code/Package Authority (2.2) + Archived Reference Snapshots (2.3) to avoid dangling links to archived canonical docs — the auth-map, D2C theme spec, UI/nav/matrix/compliance references, fairwork reference, GTO standards, RAM credential map, WCAG contrast audit, and colour-token audit all moved to `docs/archive/parent/2026-04-30-*/` on 2026-04-30; their living authority is now in `AGENTS.md`/`CLAUDE.md` + packages + code. §3 uses actual filenames. §4 matrix updated to point at authoritative sources (not archived docs). §4.1 cross-cutting feature ownership, §7.1 audit cadence, §7.2 authority matrix, §7.3 quick links, naming-convention exception note for PARENT-DOCS.md / OUTSTANDING.md / etc. Throughput `docs/README.md` created this session. §5 archive path scope made optional to match existing `docs/archive/2026-05-04-doc-unification/` convention. §7 + §7.1 reinforced requirement to strike through merged-backlog items in same PR as implementation. |
