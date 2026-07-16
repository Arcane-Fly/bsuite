# BSuite Completion Program — orchestration plan + team briefs

**Status:** W (Working) · **Owner:** claude-code (orchestrator) · **Created:** 2026-07-16
**Operator directive (2026-07-16):** "all via /subagent-driven-development you orchestrate over the top. first plan, and give each team a clear brief." + "don't stop until everything is complete… if you notice UI or UX bugs, something that isn't compliant with the GTO guidelines documented, or anything else then that gets added to the work list… you DO NOT STOP to prompt me."

## 1. Goal + success condition (loop contract)

**Goal:** BSuite reaches "world class" — 135 open issues across 7 repos triaged to done, with public-facing docs, clean repo, zero known silent-data-loss or wrong-tenant defects.

**Success condition (binary, per issue — NOT "looks done"):**
1. Acceptance criteria in the issue met, verified against **live/deployed** evidence (§12.3), not local CI alone.
2. Tests green (`pnpm typecheck` + relevant vitest) — command + output recorded.
3. Merged to submodule `main`; DB changes applied via floor-gated `supabase-migrate` dispatch and re-verified in the **live catalog** (§12.1.1).
4. Issue closed with an `evidence_url`.
5. A **separate verifier** (maker ≠ checker) confirms 1–4 before flip-to-done.

**Program-level done:** every issue in clusters A–F either closed with evidence, or explicitly re-scoped/declined with a written reason, or parked in cluster E awaiting operator judgment.

## 2. Decomposition (from the real backlog — not invented)

| Cluster | Scope | Backing issues |
|---|---|---|
| **A** | Card / canvas layout system | crm7 #744, bsuite #1588, page-builder ×6, dnd-kit ×3 |
| **B** | Public docs + user guides (4 audiences) | *greenfield — none exist* |
| **C** | P1 UX / data-integrity | crm7 #1123, #1125, #1126, #1124, #1127 |
| **D** | Repo org / hygiene | bsuite #1263, #1227, #1505, #1542; crm7 #836 |
| **E** | Compliance / operator-gated | crm7 #1129 (P0), #1128, #1130 |
| **F** | Infra / auth | bsuite #1322, #1315 |

## 3. Orchestration shape — two-track (operator-approved)

- **Fix-track** (serial per submodule; worktree-isolated when parallel): **C → A → D → F**.
- **Docs-track** (**B**): runs continuously, **trailing the fix-track by one wave** — a surface is only documented once it is fixed and live-verified. *Exception:* audience-4 (operator runbooks) may start immediately; it documents the operator's own process, which isn't changing.
- **E**: not a team. A **surfacing queue** to the operator. Agents MUST NOT auto-fix. #1129 (cross-tenant FK leakage) is explicitly `DO NOT auto-fix; operator sign-off required`.

**Why docs trail:** documenting a product that silently discards compliance fields (#1125) or writes to the wrong tenant (#1123) yields *confidently wrong docs* — worse than none.

**Why C first:** #1123 and #1125 are the only issues in the backlog that **destroy or misdirect user data**. Severity outranks polish.

## 4. Hard constraints the orchestration must respect

1. **Concurrency ≤ ~2 subagents** — operator runs heavy QIG compute (`feedback_resource_budget_subagents`).
2. **Worktree isolation** — 2+ agents in one submodule need dedicated worktrees (`feedback_parallel_agents_need_worktrees`).
3. **Migration path** — merge → parent pointer bump → `gh workflow run supabase-migrate.yml --ref main -f submodule=<x>` → **verify live catalog**. A migrate run reporting *success* proves nothing if the pointer is stale (burned us 2026-07-16).
4. **Unique migration timestamps across ALL submodules** (`feedback_shared_schema_migrations_version_collision`).
5. **Theme**: `@bsuite/theme` oklch tokens only; braden is corporate-brand exempt (`bsuite-brand-system`).
6. **Never relabel red CI as informational** (`feedback_dont_relabel_failures_as_informational`).

## 5. Model tiering

| Role | Tier |
|---|---|
| Implementer (routine fix) | `sonnet` |
| Implementer (compliance-critical: wage/BOOT/tenant-isolation/data-integrity) | `opus` |
| Verifier / judge (must ≠ implementer) | `haiku`→`sonnet` by risk |
| Docs author | `sonnet` |

## 6. Team briefs

### Team C — P1 UX / data-integrity (WAVE 1, `opus` for #1123/#1125)
- **#1123** multi-tenant arbitrary-tenant landing. Ship a **confirm-your-organisation interstitial** for multi-tenant users on first load per session, AND/OR server-side last-used-tenant persistence. MUST NOT add friction for single-tenant users (the common case). Note F15 (stale `app_metadata.tenant_id` from `home_tenant_id`) is already fixed in main (`e6dcae36`) — this is the upstream UX gap.
- **#1125** hosts/create silently discards Safety Rating + Compliance Status — **no backing columns exist** on `employers`. Decide + self-report: real columns (migration, filterable/reportable — preferred for compliance data under GTO Standards element 2) vs `custom_fields`. Verify by SQL SELECT post-fix.
- **#1126** `LocalisedDateInput` silently blanks ISO input on blur. Either secondary ISO parse or inline error preserving raw text — **never silently clear**. ⚠️ Blocks-adjacent: R80.3's new DOB/commencement inputs use this component.
- **#1124** person-detail ~7s cold load — parallelize the serial `profiles`→`tenants`→`branding_json_for_tenant` chain before entity fetch; add progressive skeleton.
- **#1127** onboarding-pilot UX polish batch (F5/F10/F11/F12/F17/F21).

### Team A — Card/canvas (WAVE 2, `sonnet`) — operator ruling 2026-07-16
Order is mandatory: **(1)** fix #744 (outer card snaps shut on resize; col-width lock; restore 2/3-col intermediate) → **(2)** fix #1588 (drag/resize never persists — persist per-user per-page) → **(3)** default = **expanded on load** → **(4)** user collapse/resize **persists** → **(5)** keep BSU `ColorEditorSheet` progressive-disclosure for dense editors → **(6)** guard perf against #1124 (lazy/virtualize). Do NOT blanket-expand over the broken system.

### Team B — Docs (trailing, `sonnet`) — 4 audiences (operator: "all of the above")
1. GTO staff/admins (CRM7 daily: people, placements, timesheets, award-rates, BOOT, reports)
2. Apprentices + host employers (portals, timesheet approval, leave, training, documents)
3. Public docs site (prospects/MBAWA board; BOOT + compliance explainers)
4. Operator/platform runbooks (migrate dispatch, pointer bumps, vault rotation, tenant switch, branding tiers, #1130) — **may start now**

### Team D — Hygiene (WAVE 3, `haiku`/`sonnet`)
Branch sweeps (#1263/#1227), deps 1–2 majors behind (#836 — never downgrade), deferred hardening (#1505), advisor findings (#1542).

### Team E — Operator-gated (surfacing only, NO auto-fix)
#1129 P0 cross-tenant FK leakage (FutureBuild = **real client**, exemplar-quality, do not break), #1128 54 doc categories (compliance judgment = Braden), #1130 ops checklist.

### Team F — Infra (WAVE 4)
#1322 Supabase → ap-southeast-2 (⚠️ its "before MBAWA board pitch — mid-June 2026" deadline has **already passed**; re-confirm scope), #1315 all apps → BS OAuth PKCE.

## 7. Continuous intake (operator directive)

Any UI/UX bug, GTO-guideline non-compliance, or other defect discovered mid-flight is **filed as a GitHub issue + appended to `bsuite_pending_actions`** via the memory REST API. Never silently dropped, never used as a reason to stop.

> **Transport note:** the `qig-memory` **MCP** is 401 (cannot be authorized non-interactively). The memory **REST API** (`https://qig-memory-api.vercel.app/api/memory`) is reachable via `curl` and is the canonical path per CLAUDE.md — use it.

## 8. Verification (maker ≠ checker)

Every task: implementer subagent → **separate** verifier subagent grades against live evidence → only then flip-to-done. An agent never grades its own work. Verifier checks: live-catalog state for DB changes, deployed-domain evidence for UX, command+output for tests, and that the issue's own "Mandatory before merge" block is satisfied.
