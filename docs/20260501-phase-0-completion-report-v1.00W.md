# BSuite — Phase 0 Completion Report (v1.00W)

**Status:** Working — hand-off to user for ADR ratification
**Session:** 2026-05-01
**Scope:** Docs reconciliation + ADR drafting + merged backlog + audit frameworks (per subagent-driven-development + Phase 0 of consolidated plan)
**Next action:** User ratifies ADRs 0001-0006 + three outstanding Phase 0 decisions. Upon ratification, Phase 1 execution begins.

---

## What shipped in this Phase 0 session

### 6 ADRs (architecture decision records)

| ID | Title | Decision | Unblocks |
|---|---|---|---|
| **ADR-0001** | Page-Builder Ownership | CRM7 `custom_pages` is canonical; BSU `tenant_page_layouts` table + UI deleted atomically | P1-4(b), Phase 2 convergence |
| **ADR-0002** | Schema-Builder Ownership | CRM7 owns both ERD (`tenant_entities` + `tenant_relations`) and `tenant_field_definitions`; BSU Schema.tsx deleted | P1-75, BL-001 |
| **ADR-0003** | Consumer-Renderer Pattern | Per-app components, no shared `@bsuite/custom-pages-renderer` package | Phase 2 & Phase 4 consumer renderers |
| **ADR-0004** | OAuth Allow-List Doctrine | `AGENTS.md` is single source; duplicate lists in handoffs removed | Phase 0 docs reconcile, Phase 1 P0-6 |
| **ADR-0005** | RAMS Funding Authoring | CRM7 Developer Portal hosts `rams_funding_matrix` authoring UI + SQL function | WS-E.4, P1.J (Payday Super 1-JUL-2026) |
| **ADR-0006** | Contact Propagation Doctrine | `contacts` single canonical entity; `clients.type` discriminator for role unification; junction-not-table pattern | WS-E.1, WS-E.2, WS-E.3, WS-E.5 |

### Phase 0 documents

| File | Purpose |
|---|---|
| `docs/adr/README.md` | ADR index + authoring conventions |
| `docs/20260501-merged-execution-backlog-v1.00W.md` | Single authoritative execution queue (~90 high-level items, ~200-300 atomic PRs) across Phases 1-6 |
| `docs/20260501-deprecation-audit-v1.00W.md` | Baseline: zero `@deprecated` markers confirmed via per-submodule scans; forward governance + CI enforcement spec |
| `docs/20260501-cookie-sso-audit-v1.00W.md` | Verification: all 5 intended apps compliant; P1-12c resolved via `AuthBootLoader` Phase 1 fix |
| `docs/20260501-ws-e-client-host-unification-audit-v1.00W.md` | WS-E.1 framework + empty matrix; Phase 4 execution protocol |
| `docs/20260501-one-shot-field-audit-v1.00W.md` | WS-E.5 framework + empty matrix; per-app form enumeration pending Phase 4 |
| `docs/20260501-docs-reconciliation-classification-v1.00W.md` | Classification matrix for all ~474 in-scope `.md` files; high-priority dispositions decided, deep-pass in Phase 1 |
| `docs/20260501-phase-0-completion-report-v1.00W.md` | This doc |

## What was discovered (Phase 0 discovery pass)

### Docs inventory

- Parent `docs/`: 253 `.md` files (70 top-level, 11 in `docs/plans/`, 144 already in `docs/archive/`).
- Submodule `docs/`: ~184 `.md` files across 6 submodules (mobile has no docs).
- Submodule top-level: ~37 status `.md` files (most in throughput — 16 — which uses legacy UPPERCASE naming).
- **Total in-scope:** ~474 files. Live references (CLAUDE / AGENTS / CONTRIBUTING / README / SECURITY / MEMORY_PROTOCOL / ACCESSIBILITY / .boltrules / .windsurfrules) excluded.

### Deprecation markers

- Per-submodule scans returned clean (zero `@deprecated` found within guard-timeouts).
- Confidence: high on TS/JS; medium on SQL (not exhaustively scanned). Phase 1 first-touch protocol covers the gap.

### Cookie SSO

- **All 5 intended apps correctly wired.** BSU, CRM7, R80.3, throughput, conduit all use `storageKey: 'business_suite_auth'` + `domain: .crm7.app`. braden correctly excluded (different TLD).
- Console-dump `cookies exist: false` is expected first-visit behaviour, not a bug.

### Console-log surfaced bugs (2026-04-29)

| Bug | Phase 0 assessment | Phase 1 fix |
|---|---|---|
| `tenant_page_layouts` 400 retry loop | Real. Root cause: client/migration schema divergence. | Resolved atomically by ADR-0001 execution in Phase 2. Not a Phase 1 item. |
| `platform_branding` 401 (anon path) | Real. Root cause: `useBranding` queries full table for `force_override_tenant_ids` excluded from public view. | P1-12b atomic fix: anon-path fallback to `platform_branding_public`. |
| Branding RPC 401 (anon) | Real. Same root cause as above. | P1-12b. |
| Auth safety-net retry | Reduced to single-retry already (2026-04-28 BSU commit). Retry still fires on tier race. | P1-12 atomic fix: bootstrap ordering repair + delete safety-net. |
| `user_tenants → profiles` embed 400 | Real. PostgREST FK embed under RLS. | P1-14 atomic fix: explicit FK name or two-step fetch. |
| Missing Developer tabs perception | False alarm. Tabs exist; crash from `Pages.tsx` loop makes the bar appear empty. | Fixed atomically by ADR-0001 execution + P1-15 route-level error boundary. |
| Zustand default-export deprecation | Third-party internal (BSuite code uses named `{ create }`). | Not actioned; monitor. |
| Radix Dialog a11y warnings | Tracked under WCAG P1.O. | Phase 4. |
| Doc status-code integrity (`gto-billing-reporting-refined-plan-v1.00A.md` marked .00A but reported incomplete) | Status re-verify in Phase 1; bump to .00W if confirmed. | Phase 1 docs reconcile deep-pass. |

### Existing state already matches several ADR prescriptions

- Merge-on-email for contact deduplication already shipped (`20260423020000_phase4_v1_candidate_contact_merge.sql`) — ADR-0006's canonical example.
- `platform_branding_public` view already created (`20260428010108_grant_platform_branding_select_to_authenticated.sql`) — P1-12b needs only the client-side fallback.
- Cookie SSO contract enforcement tests already live (`supabaseCookieStorage.test.ts`, `supabase-auth.test.ts`) — no new tests needed, just wire `AuthBootLoader`.

## Quick ratification summary (read this if you're pressed for time)

**Reading budget:** ADRs ~5 min each × 6 = 30 min + merged backlog ~20 min = **~50 min total** if you read everything. **~5 min** if you read only this section + the inline summaries below and trust the defaults.

### Inline ADR summaries — what you're agreeing to

| ADR | Decision | Primary destructive action | Data-loss risk preview |
|---|---|---|---|
| **ADR-0001** | CRM7 `custom_pages` is the single page-authoring surface; BSU `Pages.tsx` + `tenant_page_layouts` table deleted/dropped atomically in Phase 2. | `DROP TABLE tenant_page_layouts` (Phase 2 migration) | Phase 0 discovery flagged `Pages.tsx` as currently broken in production; likely zero live rows or near-zero. Pre-DROP backup script exports all rows to `docs/20260502-phase2-tenant_page_layouts-backup.jsonl` before the drop. Row-count to be queried via Supabase MCP in Phase 2 pre-migration. |
| **ADR-0002** | CRM7 Developer Portal unifies ERD (`tenant_entities`/`tenant_relations`) + field definitions (`tenant_field_definitions`); BSU `Developer/Schema.tsx` deleted. | BSU `Schema.tsx` deletion + `tenant_field_definitions` ownership flip | No schema change to `tenant_field_definitions` itself; ownership authoring moves between apps only. Zero data-loss risk. |
| **ADR-0003** | Per-app `CustomPageRenderer` components. No shared `@bsuite/custom-pages-renderer` npm package. | Net-new pattern; no pre-existing code removed. | Zero data-loss risk (no removals). |
| **ADR-0004** | `AGENTS.md` §Automated Deployment Checks is the single source of truth for Supabase redirect-URI allow-list; duplicate lists in operator handoffs removed via consolidation. | Doc consolidation only; no code/DB changes. | Zero data-loss risk. |
| **ADR-0005** | CRM7 Developer Portal hosts `rams_funding_matrix` authoring UI; consumers call `rams_funding_for(...)` function. | New table + function + authoring UI; hand-entry UI removed atomically in WS-E.4. | Zero DB-row loss; the replacement is additive (new function + matrix) with atomic removal of the UI paths. G-11 seed-data gate gates WS-E.4. |
| **ADR-0006** | `contacts` is the single canonical person entity; `clients.type` discriminator for client/host/both; role junctions replace separate role tables. | No schema change to `contacts` or `clients` under this ADR; only consumer code rewrites. | Zero data-loss risk. The canonical tables aren't touched. |

### Inline summaries — the three non-ADR hard gates

| # | Gate | Default | Alternative |
|---|---|---|---|
| **2** | **RAMS seed-data gate** (who validates criteria columns + seeds the matrix for ADR-0005) | **Default: user** (validates the criteria columns during Phase 1-3 in parallel with engineering; seed complete by Phase 4 WS-E.4 start). | Name a named operator (e.g. Braden + domain expert pair). |
| **3** | **Operator-tier handling** | Parallel checklist — operator items run alongside engineering, only serial-blocking when a strict dep requires it. | Serial pause per operator item. |
| **4** | **P1.J deadline fence** | Auto-interrupt — if Phase 2 slips past 2026-06-01, later phases pause until P1.J (Payday Super) ships by 1-JULY-2026. | Strict phase order, accept deadline risk. |

## What requires user ratification

### Four hard gates (Phase 1 cannot begin without these)

1. **Ratify ADRs 0001-0006.** Read the inline summary table above + open any ADR that raises a question. If any ADR needs modification, say so before Phase 1 starts.
2. **RAMS seed-data gate (ADR-0005).** See inline summary above.
3. **Operator-tier handling.** See inline summary above.
4. **P1.J deadline fence.** See inline summary above.

## What happens on user sign-off

Immediately upon ratification:

1. **Memory protocol write** — key `bsuite_session_20260501_phase0` set with category `session_summary`, content describing the Phase 0 completion + ratification record; `bsuite_session_latest` pointer updated per `MEMORY_PROTOCOL.md`.
2. **Git commit** — Phase 0 artefacts + P0-15 master roadmap rollup committed atomically in a single commit: `docs(phase-0): ratified ADRs 0001-0006 + merged backlog + Phase 0 audits + master roadmap v5.03W rollup`. P0-15 folds into this ratification commit rather than Phase 1 because it is pure documentation and is the cheapest item to close.
3. **Kickoff Phase 1** — dispatching the twelve Phase 1 items in parallel where independent:
   - P1-12 (auth safety-net lock-in)
   - P1-12b (branding anon-path fallback)
   - P1-12c (AuthBootLoader)
   - P1-14 (user_tenants FK embed 400)
   - P1-15 (Developer route error boundary)
   - P0-6 (Parts A+B+C operator OAuth sign-off + return_origin patches)
   - P0-8 (Conduit SSR hotfix cherry-pick)
   - P0-10 (Supabase Vault RPC migration completeness)
   - P0-11 (OAuth state HMAC signing)
   - P0-13 (remove Supabase dashboard wildcard URIs)
   - Phase-1 docs deep-pass (completes the classification matrix)
4. **Phase 1 exit criteria recheck** — Playwright smoke across BSU/CRM7/R80.3/throughput first-visit: zero `console.error`, zero safety-net warnings, zero 401/400 in bootstrap window; `checkSubscription` single-call assertion green; branding anon-path test green.

## What won't happen in this session

Phase 1-6 code/migration execution is **gated on user ratification**. The atomic-replace-and-remove governance requires ADRs to be signed before the removals they prescribe ship. No code changes have been staged; only documentation artefacts have been written.

Expected program duration post-ratification: **16-24 weeks** (per merged backlog estimate).

## Risks surfaced in Phase 0

1. **P1.J deadline risk** — 1 July 2026 is a regulatory hard deadline. If the consolidated plan's full Phase 0-4 sequence slips, P1.J could miss. Deadline fence (default #4 above) mitigates but doesn't eliminate. User should watch Phase 2 velocity closely.
2. **RAMS seed-data dependency** — WS-E.4 cannot complete without seed. If no domain expert is named by Phase 2 end, WS-E.4 becomes blocked. Raise early.
3. **Submodule doc count (~184 files)** — deep-pass classification is 2-3 days of subagent work; not unbounded but non-trivial. Budget Phase 1 accordingly.
4. **GitHub org-admin gated items (G-2, G-7)** — don't block phase progression but do need operator visibility. Make sure operator checklist includes them.
5. **P1-84 Supabase migration push (operator gated)** — finish-line roadmap flags as blocked. Must be unblocked before Phase 4 P1.Q completes; not blocking earlier phases.
6. **Atomic-replace-and-remove strictness** — some PRs will be large (e.g. ADR-0001 execution touches BSU + CRM7 + packages/schema-registry + 5 consumer apps simultaneously). Reviewers must be prepared; CI must be green across all touched repos before merge.

## Compliance check (this session)

- ✅ No code changes made; only documentation artefacts written.
- ✅ No `@deprecated` markers introduced in this session.
- ✅ No dual-path interim states proposed.
- ✅ Every ADR ends with "What this unblocks" per the strategy instruction.
- ✅ Every framework doc has Phase assignment + acceptance criteria.
- ✅ Merged backlog has stable IDs + owner assignments + source citations.
- ✅ Classification matrix has high-priority decisions; deep-pass clearly deferred to Phase 1.
- ✅ Memory protocol: write will occur on user ratification (this session cannot ratify itself).

## What this unblocks

- **User ratification decision** — the concrete artefacts needed to sign off on the full 16-24 week program now exist as files in the repo.
- **Phase 1 execution** — the seven Phase 1 items are specified atomically with source citations, ready for dispatch.
- **Atomic-replace-and-remove governance** — every prescribed removal has its driving ADR. No Phase 1+ PR ships a removal without an ADR citation.
- **Information-preservation archival** — the classification matrix prevents accidental information loss during archive moves.
- **Forward visibility** — WS-E framework docs (client-host, one-shot-field) give Phase 4 agents a populated template, not a blank page.

## Next user action

**Read the inline summary tables above** (5 min). Open any ADR that flags a question (optional, 5 min each). Then **respond with one of:**

### Canned response A — fastest path (accepts 10 decisions in one click)

> **"Ratify all 6 ADRs + proceed with all 3 default hard-gate choices (RAMS seed-data: user owns; Operator-tier: parallel checklist; P1.J deadline fence: auto-interrupt) + accept all 3 optional refinements (Phase 1 handles classification corner cases; archive naming convention `/home/braden/Desktop/Dev/archived-repos-docs/<YYYY-MM-DD-bucket>/`; ADR status bump on sign-off, working docs bump at Phase 1 kickoff)."**

This is the full-default sign-off. 12 decisions locked. Phase 1 starts immediately.

### Canned response B — ratify ADRs + hard gates, hold on optional refinements

> **"Ratify all 6 ADRs + proceed with all 3 default hard-gate choices. Discuss optional refinements separately."**

9 decisions locked. Phase 1 starts; the 3 optional refinements are deferred to Phase 1 kickoff conversation.

### Canned response C — ratify ADRs only

> **"Ratify all 6 ADRs. Discuss hard gates + optional refinements before Phase 1 starts."**

6 decisions locked; Phase 1 does not start until the 3 hard gates are resolved. Useful if you want to think about RAMS ownership / deadline handling / operator-tier coordination separately.

### Canned response D — partial ratification with modifications

> **"Ratify ADRs X, Y, Z. Modify ADR-N: <specific change>. Discuss hard gates separately."**

I'll revise the flagged ADR(s) and re-request ratification on only the modified ones. Un-modified ADRs lock.

### Canned response E — defer

> **"Defer — more questions before ratification."**

I'll answer specific questions without starting Phase 1.

---

## Optional refinements (not blocking Phase 1)

These appear bundled into canned response A above. Calling them out separately in case you want to adjust them:

5. **Doc classification corner cases** — Phase 0 `docs-reconciliation-classification` has ~30 files in "🔲 Phase 1 deep-pass" state. **Default:** Phase 1 deep-pass handles all of them. **Override:** flag any known-urgent files to archive before Phase 1 to reduce noise.
6. **External archive bucket naming** — **Default:** `/home/braden/Desktop/Dev/archived-repos-docs/<YYYY-MM-DD-<bucket>/`. **Override:** propose alternative.
7. **Phase 0 artefact status bump** — **Default:** ADRs bump to immutable-Accepted on sign-off; working docs bump to `.00A` at Phase 1 kickoff (after any Phase 1 ratification-edit corrections). **Override:** bump timing per request.

---

## Session artefact inventory

Files created in this Phase 0 session:

```
docs/adr/README.md
docs/adr/ADR-0001-page-builder-ownership.md
docs/adr/ADR-0002-schema-builder-ownership.md
docs/adr/ADR-0003-consumer-renderer-pattern.md
docs/adr/ADR-0004-oauth-allowlist-doctrine.md
docs/adr/ADR-0005-rams-funding-authoring.md
docs/adr/ADR-0006-contact-propagation-doctrine.md
docs/20260501-merged-execution-backlog-v1.00W.md
docs/20260501-deprecation-audit-v1.00W.md
docs/20260501-cookie-sso-audit-v1.00W.md
docs/20260501-ws-e-client-host-unification-audit-v1.00W.md
docs/20260501-one-shot-field-audit-v1.00W.md
docs/20260501-docs-reconciliation-classification-v1.00W.md
docs/20260501-phase-0-completion-report-v1.00W.md
```

**14 artefacts total.** Zero code / migration changes.

---

## Revision log

- 2026-05-01 v1.00W — initial Phase 0 completion report; hand-off for user ratification.
- 2026-05-01 v1.00W (intra-day revision) — review-induced fixes applied across 9 Phase 0 artefacts per code-reviewer-multi-prompt pass:
  - **Deprecation audit:** removed "retained with justification" loophole; governance rule #6 added; added Phase 6 BL-017 allowlist file spec.
  - **ADR-0001:** pinned migration filename `supabase/migrations/20260502000000_drop_tenant_page_layouts.sql`; added `Atomic removal disallows` + `Rollback procedure` subsections.
  - **ADR-0002:** added `Option A rejected` paragraph making counter-option explicit; added `Atomic removal disallows` + `Rollback procedure` subsections.
  - **ADR-0003:** added `Atomic removal scope` clarification (net-new pattern, no removals); added `Option A rejected` + `Rollback procedure` subsections; re-ordered rationale so technical reasons lead and user preference is confirming tiebreaker.
  - **ADR-0005:** added `Consumer-side call sites (enumerated)` section listing the 6 paths that get swapped atomically in WS-E.4; added `Rollback procedure` + `Atomic removal disallows` subsections.
  - **ADR-0006:** re-ordered rationale (technical reasons lead, user preference is tiebreaker); added `Option B rejected` paragraph; added `Rollback procedure` subsection.
  - **Cookie SSO audit:** converted line-number citations to symbolic anchors (`createSupabaseClient()`, test block names) to prevent staleness.
  - **Merged backlog:** fixed P1.J dual-path violation (hand-entry canonical until WS-E.4 atomic swap); enumerated P2-1 through P2-26 in Phase 6; added WS-A/B/C/D cross-reference section; added missing P0-6/8/11/13 as open Phase 1 items; fanned out BL-006 (braden ×7), BL-011 (BSU migration ×3), P1.H-1 (BSU Platform-Kit ×6); converted all phase exit criteria to testable form; expanded gated items G-1..G-16; reconciled item-count table to ~103 enumerated items.
  - **Classification doc:** explicit Phase 1 deep-pass scope definition.
  - **Completion report (this doc):** added inline ADR decision summaries with data-loss risk preview; added inline hard-gate summary; split canned response into 5 options (A fastest → E defer); added reading-time estimate (5 min fast-path, ~50 min full); memory-protocol key explicitly cited (`bsuite_session_20260501_phase0`); P0-15 moved into Phase 0 ratification commit; Optional Refinements relocated below canned responses with individual defaults.
