# BSuite Documentation Program — Design

> **Filename corrected 2026-08-17: `v1.00D` → `v1.00A`.** The body's naming line contradicted
> itself in a single sentence — `Status **D** (Draft → Approved by operator 2026-07-23)` — recording
> the approval while keeping the Draft letter.


> **Naming:** `20260723-bsuite-documentation-program-design-v1.00A.md` · Status **D** (Draft → Approved by operator 2026-07-23) · Feeds `writing-plans` → execution.
> **Source:** capability matrix (`20260723-bsuite-capability-matrix-v1.00W.md`) + operator approvals across 4 design sections.

## Intent

World-class, never-stale documentation for BSuite in two layers: (1) **global public manuals** for every audience, platform-authored and kept current by doctrine; (2) **org-specific documents** authored by org admins (employee manuals, apprentice handbooks, host guides, policies, templates) with role/individual assignment and acknowledgement tracking.

## Layer 1 — Global public manuals (platform-authored)

| Manual | Audience | Host | Content seed |
|---|---|---|---|
| Developer / Platform Admin | developer | docs site | Feature Builder, Page Builder, nav editor, branding cascade, tenant provisioning (Option B), publish/deploy, OAuth 2.1 ops, security gates |
| Enterprise Admin | enterprise super admin | docs site | Sub-orgs, tenant mgmt, enterprise feature assignment, platform reports, branding inheritance, billing |
| Org Admin | org admin | docs site + in-app link | Timesheets approval, pay periods/streams, placements, hosts, award/charge-calc, leave, documents, reports, notifications, org branding, **roles & permissions assignment + quoting profit-floor guardrails** |
| Field Officer | field officers | docs site + in-app link | Mobile field visits, case notes, incidents, monitoring, competency, apprentice progress |
| Employee / Apprentice | end users | docs site + in-app link | Sign in, enter timesheet, apply leave, payslips/documents, portal, profile |
| Host / Client (Line Manager) | host employers | docs site + in-app link | Approve/reject timesheets, placements, supervise apprentices, portal, notifications |
| Payroll / Finance | payroll officers | docs site + in-app link | charge-calc rate setup, pay item config, pay runs, STP, invoicing (RCTI when built), Xero, reconciliation, **BOOT + custom-rate testing** |

**Contextual linking:** each relevant in-app page deep-links to its manual section ("Learn more" affordance per feature). No per-tenant copies of global manuals.

**Gap feedback loop:** missing content → user sends to **support** OR **asks Jodie** → Jodie files a GitHub issue on the docs repo (AI-licence-gated).

**Anti-stale doctrine:**
1. Single-source content blocks (write once, include into each manual chapter).
2. Docs-touching-code = docs-touching-commit (PR-template checklist + CI lint flags manual-referenced file changes without a docs diff).
3. Freshness metadata (`last-verified` + owning role per page) + drift-scan flags pages stale vs their source features.
4. Playwright auto-screenshots on deploy (UI change that breaks a screenshot fails the gate).

**Jodie parity:** every workflow chapter ends with an "Ask Jodie to do this" box (natural-language equivalent, from the Jodie tool map). Everything a user can do in the UI is Jodie-achievable for AI-licensed users.

## Layer 2 — Org-specific documents (org-admin authored)

- **Org Documents surface** (crm7): org admins author internal documents with the existing **Plate.js DocumentEditor** (`src/components/common/DocumentEditor` — blocks, h1–h3, lists, tables, JSONB storage, textarea fallback).
- **Document types:** employee manuals, apprentice/worker handbooks, host-equivalent guides, org policies, reusable **templates** (clone for new intakes).
- **Assignment model:** assign to roles or individuals in the org (e.g. all apprentices → Apprentice Handbook; all hosts → Host Guide).
- **Acknowledgement tracking (operator-approved compliance feature):** per-document toggle; users mark-as-read, admin sees who hasn't acknowledged — for compliance handbooks.
- **Rendering:** JSONB renders read-only for assigned users; org admins get the full block editor.

## Cross-cutting: Roles & permissions (org-admin-assignable + guardrails)

- Default role set is the baseline; **every role/permission for an org is manually re-assignable** by that org's admin to suit their responsibility chain.
- Worked example (canonical recipe): grant field officers marketing capacity (`rates.create` / `quotes.create`) → FOs build charge rates to market to clients. **Guardrails:** org-configurable **base-minimum oncosts** and/or **percentage floor** so quoting stays flexible but never goes below the profit line (enforced in the quoting service).

## Cross-cutting: Award interpretation (corrected scope)

- **charge-calc BOOT engine is the interpretation CORE** (`boot/compare.ts`, EATerms vs AwardSchedule, per-scenario weeklyBreakdown, non-monetary, F17 export).
- **EBAs arrive pre-BOOT-approved (FWC-ratified)** — the engine does NOT re-test them.
- The engine BOOT-tests **custom rates**: informal host/worker arrangements trading award provisions for compensation elsewhere (e.g. +$X/h flat for foregoing allowances) — legal only if better off overall, award as fallback. Global assessment per Secure Jobs, Better Pay reforms.
- Gap vs AnyTime: a **per-shift conditional interpreter** (start/end-time, day-of-week, break-detection, auto-coding) feeding the BOOT engine. (Separate ledger item; not in this program's build scope.)
- Jodie: BOOT checks, custom-rate creation, interpretation exposed as Jodie tools (AI-licence-gated).

## Build plan (lane-decomposed, per subagent-orchestration doctrine)

| Lane | Repo(s) | Scope | Packages |
|---|---|---|---|
| L1 | business-suite-unified | Manual content model + seed content for Developer + Enterprise Admin manuals (docs site source, `docs/manuals/`) | none |
| L2 | crm7 | Org Documents surface: `org_documents` + `org_document_assignments` + `org_document_acknowledgements` tables (RLS), Org Documents admin UI (Plate editor + assignment + ack dashboard), assigned-user read view + mark-as-read, templates (clone), contextual "Learn more" links to global manual sections | none (Plate editor exists) |
| L3 | packages/jodie + crm7 | Jodie docs tools: flag-doc-gap → GitHub issue; (BOOT/custom-rate tools are a separate ledger item) | @bsuite/jodie |
| L4 | business-suite-unified | Docs-site scaffolding for global manuals (Docusaurus/MkDocs or in-app render), single-source content blocks, freshness metadata | none |

**Migration (L2):** `20260724XXXXXX_org_documents.sql` — idempotent (IF EXISTS/to_regclass guards), `auth_tenant_id()` SETOF RLS pattern, applied via `db query --linked` + repair (shared DB, no `db push`).

**Gates per lane:** typecheck + lint + tests green; contract tests for RLS + ack flow; docs-naming + README index updates.

## Verification (loop stop-condition)

- All lanes merged to development per doctrine (--no-ff, dev-first).
- Per-repo gates green (crm7 4718+, BSU 730+, jodie package tests).
- Manual skeleton pages reachable at `/p/docs-<role>` on d.crm (visual verify).
- Org Documents surface: create → assign → ack flow works end-to-end (visual verify + contract test).
- OAuth 2.1: no auth-pattern drift (any auth-touching code follows `supabase-auth-comprehensive`).
