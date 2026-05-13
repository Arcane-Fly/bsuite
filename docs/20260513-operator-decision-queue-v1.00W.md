---
title: Operator Decision Queue — 2026-05-13
status: W
version: 1.00
filed_by: bsuite-lead (team `bsuite-backlog-drive-20260513`)
filed_at: 2026-05-13T08:10:00Z
purpose: Single review surface for 6 operator-only decisions blocking BSuite backlog progress
---

# Operator Decision Queue — 2026-05-13

This memo consolidates **all decisions currently blocked on operator input** into one review surface. Each item includes evidence, recommended option with rationale, and the concrete next-action that fires once the decision is made. This replaces fragmented per-issue/per-PR threads.

Estimated review time: **15–20 minutes for all 6 decisions**.

---

## Decision 1 — Brand-token storm winner (4-way overlap)

**Status**: Blocking 4 PRs across 4 repos. design-sheriff analysis in flight at filing time.

### The conflict

Four copilot drops from 2026-05-12 each tackle the same brand-token migration in a different repo, and each invents its own `<StatusBadge />` component. They will drift if all four merge as-is.

| PR | Repo | Title | Surfaces | Mergeable |
|---|---|---|---|---|
| #696 | crm7 | onboarding/WHS/reports | 646 raw-palette + 235 hex | DIRTY |
| #242 | conduit | recruitment | 193 raw-palette + 34 hex | BEHIND |
| #427 | BSU | top-10 admin/developer | 453 raw-palette + 71 hex | DIRTY |
| #229 | R80.3 | apprentice + calculator | 430 raw-palette + 12 hex | BEHIND |

### Three strategies (design-sheriff will recommend one)

- **A** — Extract `StatusBadge` to `@bsuite/theme` (publish bump), then 4 consumer PRs become "import from theme"
- **B** — Extract to NEW `packages/ui` shared package (cleaner separation, larger lift)
- **C** — Pick ONE PR as primary, kill other 3, copy inline per repo

### Operator action

Confirm strategy A / B / C after design-sheriff posts comparison matrix. bsuite-lead then dispatches design-sheriff + platform to execute (publish bump or kill PRs).

---

## Decision 2 — People-wizard 3-way migration prefix collision

**Status**: Blocking crm7#668, #669, #670. Tracked in **crm7#762**.

### The hard conflict

All three PRs claim Supabase migration prefix `20260512023000`. Per `supabase_migrations.schema_migrations.version` constraint, only ONE can claim that prefix. All three also touch `src/pages/people/new.tsx` simultaneously.

| PR | Title | LOC | Mergeable |
|---|---|---|---|
| #668 | RHF wizard rebuild + autosaved drafts | +1472/-826 | DIRTY |
| #669 | host_employer_sites + ABN auto-populate | +994/-50 | DIRTY |
| #670 | Training provider unification + AASS + TGA daily sync | +1341/-36 | DIRTY |

### Three options

- **A** — Merge order #668 → #669 → #670; force #669/#670 to rebase with fresh timestamps after #668 lands
- **B** — Pick most foundational (#669 host_employer_sites is foundational because RTO + apprentice both reference host site)
- **C** — Kill 2 of 3 (recommended for codebuff-lane drafts; spawn signature matches)

### bsuite-lead recommendation

**Option C with #669 as survivor**:
1. #669's host_employer_sites schema is the foundational layer referenced by both #668 (wizard) and #670 (RTO)
2. Closing #668, #670 prevents wasted rebase work for parallel-exploration drafts
3. Wizard rebuild (#668) and RTO unification (#670) can be re-spawned as fresh PRs once host_sites is on main, with current-timestamp migrations and clean baseline

### Operator action

Confirm Option A / B / C in crm7#762 thread. Wave-2 dispatch then closes 2 of 3 with redirect comments.

---

## Decision 3 — People-wizard non-conflicting wave sequencing (5 PRs)

**Status**: Independent of decision 2; can be reviewed in parallel after decision 2 resolves the wizard collision.

### Five PRs that don't conflict with each other

| PR | Title | LOC | Files | Independent of wizard? |
|---|---|---|---|---|
| #671 | units of competency + WAAMS export scaffolding | +1292/-73 | 9 | Yes (training schema only) |
| #672 | training_day_pattern_periods | +1209/-23 | 10 | Yes (training schema only) |
| #673 | apprentice → invoice-line traceability + docs/billing-flow.md | +1474/-38 | 5 | Yes (billing/docs) |
| #674 | cross-app SSO portals (host/worker/training/field officer) | +1627/-69 | 6 | Yes (portals) |
| #679 | forward-year charge schedule + annual-review re-approval gate | +1970/-26 | 9 | Yes (rates) |

### Proposed merge sequence

1. #671 (units of competency) — schema-only, foundational for downstream training reports
2. #672 (training_day_pattern_periods) — extends #671 with block-release periods
3. #679 (forward-year charge schedule) — depends on training-pattern data from #672
4. #673 (billing reverse traceability) — pure read-side feature, no schema dependency on above
5. #674 (cross-app SSO portals) — independent; can interleave anywhere in the sequence

### Operator action

Approve sequence (or reorder). bsuite-lead dispatches platform + design-sheriff for sequenced review starting with #671.

---

## Decision 4 — HF-4 pgTAP RLS harness gating

**Status**: Tracked as bsuite#866. Currently INFORMATIONAL check that fails on most PRs.

### The question

Should `Anon-context RLS tests` (pgTAP harness from HF-4) be promoted from informational to **required** check on PRs targeting `development` and `main`?

### Tradeoffs

- **PRO required**: forces every schema-touching PR to verify RLS doesn't regress; prevents 2026-05-13 RLS regressions like crm7#740 / #741 from landing again
- **CON required**: harness still partially blocks per crm7#758 schema-reconciliation; making it required would pause virtually all crm7 work until #758 lands

### bsuite-lead recommendation

**Keep informational until crm7#758 closes**, then flip to required in a single coordinated PR. Wait time est: 1–2 weeks per #758 plan.

### Operator action

Confirm "informational until #758 closes" OR pick alternative gating policy.

---

## Decision 5 — Xero app registration (10 dependent PRs/issues)

**Status**: Per `bsuite_pending_actions` memory, this has been operator-blocked for an extended period.

### Blocked items

| Item | Title |
|---|---|
| crm7#544 | [P0] Encrypt refresh_token at rest (pgsodium / Supabase Vault) |
| crm7#545 | [P0] UNIQUE(tenant_id) blocks multi-Xero-org tenants |
| crm7#548 | [P1] Add PKCE to OAuth init |
| crm7#549 | [P1] Validate id_token + add nonce for OIDC |
| crm7#553 | [P1] Migrate edge fn to xero-node SDK |
| crm7#554 | [P1] Race condition on refresh — no row lock |
| crm7#555 | [P1] Custom Connections (client_credentials) for M2M |
| bsuite#712 | Xero hardening P0 — encrypt at rest |
| bsuite#713 | Xero hardening P0 — relax UNIQUE(tenant_id) |
| bsuite#714 | Xero hardening P0 — reconcile scopes on every refresh |

Plus crm7#891 (`[WIP] Add encryption for access_token and refresh_token in xero_connections`) which can't be tested without a registered Xero app.

### Operator action

Register the BSuite Xero app per the Xero Partner Portal flow. Once registered:
1. Provide client_id + client_secret to populate Supabase Vault entries
2. bsuite-lead dispatches platform to unblock the 10 P0/P1 items in priority order

---

## Decision 6 — crm7#758 source/prod schema reconciliation scope

**Status**: Multi-day strategic plan. 3 strategic options exist per session memory.

### The problem

Source migrations (in `supabase/migrations/`) have diverged from production schema due to out-of-band applies. pgTAP CI is partially blocked. The 33 unqualified `current_role()` call sites (bsuite#873) are part of this divergence.

### Three strategic options (already in #758 thread)

- **A** — Reconcile source to match production (rebase migrations, mark history as frozen)
- **B** — Reconcile production to match source (risky — would require schema rollback)
- **C** — Snapshot current production as a new baseline migration; freeze all prior migrations as "historical" (declarative path)

### Recommended

Per session memory, **Option A** is the recommended path. This is a 2–4 day workstream requiring focused operator + platform-specialist time.

### Operator action

Confirm Option A scope and authorize bsuite-lead to dispatch a multi-PR reconciliation workstream led by platform-specialist + plans-keeper.

---

## Footer — Codebuff-lane drafts (no action required)

Per session memory `bsuite_session_20260513`, the following 12 drafts from the 2026-05-12T15:29Z burst spawn are **deliberate parallel-exploration drafts**. Per operator's stated intent, they remain OPEN as drafts and require NO review/merge action this cycle:

**Page-builder wave (5):**
- bsuite#874 (Layers panel), #877 (routing matrix), #879 (breakpoint switcher), #880 (Global Symbol), #881 (prompt-to-section AI)

**Jodie GitHub App chain (4):**
- bsuite#876 (issue classifier), #878 (MCP wiring), #882 (webhook ingestion), #888 (Autonoma audit)

**Other 2026-05-12 spawn (3):**
- crm7#675 (per-tenant locations) — **EMPTY PR, will be closed by plans-keeper**
- crm7#676 (GTO compliance dashboard) — **EMPTY PR, will be closed by plans-keeper**
- crm7#691 (zero-caller edge fn audit), #689 (delete adobe-sign-webhook), #654 (page layout editing)

If operator intent on any specific draft has shifted (e.g. "I actually want #874 promoted"), flag it in this doc's PR comments.

---

## Resolution log (filled in as decisions land)

| Decision | Operator pick | Resolved at | Follow-up dispatch |
|---|---|---|---|
| 1 — Brand-token storm | _pending_ | | |
| 2 — People-wizard collision | _pending_ | | |
| 3 — Non-conflicting wave sequence | _pending_ | | |
| 4 — HF-4 pgTAP gating | _pending_ | | |
| 5 — Xero app registration | _pending_ | | |
| 6 — crm7#758 reconciliation | _pending_ | | |

---

*Filed by bsuite-lead during BSuite backlog drive (team `bsuite-backlog-drive-20260513`) on 2026-05-13. Cross-references: bsuite_session_20260513 + bsuite_session_20260513_backlog_drive memory keys at https://qig-memory-api.vercel.app/api/memory.*
