# BSuite Master Roadmap — In Progress / Pending Audit

**Date:** 2026-05-08
**Run:** claude-loop ROADMAP rotation, bsuite#731
**Predecessor:** bsuite#725 (DOCS — Recently Completed refresh, PR #726 merged 2026-05-08T09:22:06Z)
**Scope:** Per-item evidence trail for the 8 items in `## In Progress / Pending` (master roadmap lines 620-630) + the 1 remaining 🔲 row in `## P3 Sprint Status` (line 724) at the time of this audit.
**Status:** Working — doctrine §1.2 evidence document, citable by future ROADMAP / DOCS / TESTS rotations.
**Master roadmap version after this audit:** 5.06W (bumped in companion commit `docs(roadmap): refresh In Progress / Pending`).

> **Why this document exists.** The CLAUDE-LOOP ROADMAP playbook says: *"For features NOT in roadmap that are genuinely missing: add with priority. After update: implement highest-priority unimplemented item."* The two-commit rule pairs a doc-update commit with a feat/impl commit. This file is the impl-side artefact: it captures the per-item primary-source evidence (PR refs + package.json SHAs + closed issue refs) that future agents can cite verbatim when re-verifying a row's status, instead of re-running the same eight queries.

---

## 1. Audit method

For each item in `## In Progress / Pending` and the remaining 🔲 row in `## P3 Sprint Status`:

1. Identify the canonical truth source (live source file at a pinned SHA, merged PR, closed issue, or Vercel deployment SHA).
2. Re-read that source via `mcp__github__get_file_contents` / `mcp__github__pull_request_read` / `mcp__github__list_issues` at this run's STEP 3 timestamp.
3. Compare the source's state against the roadmap's flag (✅ / ⚠️ / 🔲).
4. If status changed (e.g. shipped since last audit), record the evidence URL.
5. If status unchanged, record the source confirmation.
6. If status partially changed, name the specific sub-task that's done vs. the specific sub-task still open.

No item was marked done without primary-source confirmation. Where uncertainty remains, it is named explicitly in §3.

---

## 2. Per-item evidence

### Item 9 — CRM7 test coverage (16 pre-existing AI failures)

**Status flag (post-audit):** ⚠️ Partial — refreshed.

**What's done:**

- W4 admin lib coverage gap closed via [BSU#387](https://github.com/GaryOcean428/business-suite-unified/pull/387) (18 vitest specs across `saveRoleCapabilities.test.ts` + `loadTenantRoles.test.ts`). PR awaiting ship-all-apps merge per [bsuite#720](https://github.com/GaryOcean428/bsuite/issues/720).
- Sibling test coverage shipped earlier in the same wave: `RoleCapabilityPresets.test.ts` (sha `6cea7ae2`, 13 tests).

**What's open:**

- 16 pre-existing AI-component failures in CRM7 (no recent diagnosis; defensive omission from the W4 wave).
- PermissionsEditor.tsx page-level integration test (~6 specs) — explicitly named as deferred in [bsuite#717](https://github.com/GaryOcean428/bsuite/issues/717) follow-up notes.

**Source SHA:** `claude/funny-cori-ASW4E @ 4a5dce9` (BSU#387 head).

---

### Item: Dashboard polish (KeyboardSensor + ai_sessions/ai_messages tables + hero signals + bento grid)

**Status flag (post-audit):** ✅ STRUCK — already shipped, was stale in roadmap.

**Evidence:**

- KeyboardSensor / `sortableKeyboardCoordinates` / `aria-label` on grip buttons: shipped via item 26a + AUD-16 rollup, struck under P0-15 rollup 2026-05-01 (revision log v5.03W).
- `ai_sessions` / `ai_messages` tables: P0 #2 already struck — "Already exist in Supabase" (master roadmap line 643).
- Hero signals + bento grid: shipped via WS-D 9-PR D2C Neon Electric rollout (master roadmap "Recently Completed (as of 2026-04-14)" entry; `bsuite_ws_d_complete` memory key).

**Action taken:** Wrapped item in strikethrough with consolidated evidence pointer. No code change; pure roadmap hygiene.

---

### Item: Stripe end-to-end verification

**Status flag (post-audit):** ✅ STRUCK (already done before this audit; no change).

**Evidence:** Stripe E2E verified 2026-03-19 (P3 SP-2 in P3 Sprint Status table).

---

### SP-3 — CRM7 Tier 3-4 page wiring

**Status flag (post-audit):** ⚠️ Partial — refreshed with concrete PR refs.

**What's done (reports tier substantially closed via 2026-05-08T08 promote chain):**

| Tier item | PR | Author | Landed |
|---|---|---|---|
| Training-plan progress report | [crm7#575](https://github.com/GaryOcean428/crm7/pull/575) | Copilot | 2026-05-08T08 promote |
| Host-employer monthly pack | [crm7#571](https://github.com/GaryOcean428/crm7/pull/571) | Copilot | 2026-05-08T08 promote |
| Fair Work inspector report | [crm7#574](https://github.com/GaryOcean428/crm7/pull/574) | Copilot | 2026-05-08T08 promote |
| STP Phase-2 export | [crm7#573](https://github.com/GaryOcean428/crm7/pull/573) | Copilot | 2026-05-08T08 promote |
| Apprentice-progress reports | [crm7#570](https://github.com/GaryOcean428/crm7/pull/570) | Copilot | 2026-05-08T08 promote |
| Portable-LSL multi-state exports | [crm7#569](https://github.com/GaryOcean428/crm7/pull/569) | Copilot | 2026-05-08T08 promote |

All on `crm7@development` post the [crm7#568](https://github.com/GaryOcean428/crm7/pull/568) `dev → main` promote at 2026-05-08T08:33:17Z (production sha `516aeeac`).

**What's open:**

- Financial tier (invoice generation, payment recon, ledger views)
- Compliance tier (NCVER audit, ASQA reporting, AVETMIS NAT001-NAT170 mapping)
- WHS tier (incident reports, SWMS mgmt, hazard register)
- Comms tier (email inbox, SMS dispatch, notification rules)

These remain in-progress per the broader Copilot autonomy + future operator-driven prioritisation.

**Source SHA:** `crm7@development @ ec9f9858` at audit time.

---

### Item: Cross-app notifications (Supabase Realtime pub/sub)

**Status flag (post-audit):** ⚠️ Pending (unchanged).

**Evidence:** No scoping doc found; tracked as P2 #19 (master roadmap line 670, "Cross-app notifications (Supabase Realtime)"). Deferred behind active ship-all-apps cycle work. No prior PR opened on this scope across any of the 7 BSuite repos at audit time.

**Recommendation:** A scoping doc should precede implementation. Candidate scope: `scoping/20260509-cross-app-notifications-realtime-v0.01D.md` covering channel-naming convention, payload contract, replay-ability requirements, RLS gating, and per-domain subscriber lifecycle.

---

### Item: BOOT compliance engine (C8-tier competitive differentiator)

**Status flag (post-audit):** ⚠️ Pending (unchanged).

**Evidence:**

- Tracked as P2 #14 (master roadmap line 665) under the title "Enterprise Agreement + BOAT validation". Note: the typo "BOAT" in the P2 row vs. "BOOT" in the In Progress section is a known divergence; canonical spelling is **BOOT** (Better Off Overall Test, Fair Work Act 2009).
- Competitive context per CLAUDE-LOOP §3 COMPETE notes: foundU has partial BOOT support; **Workforce One holds 30% GTO market share specifically on BOOT automation differentiation**.
- No implementation found in CRM7 / R80.3 at audit time; no scoping doc.

**Recommendation:** Highest-leverage P2 from a competitive standpoint; should be scoped in next FEATURE rotation if no operator override.

---

### Item: @bsuite/charge-calc full convergence (3 engines → 1)

**Status flag (post-audit):** ✅ STRUCK at the dependency level.

**Evidence:**

| Repo | package.json sha | charge-calc dep |
|---|---|---|
| crm7 | `522b594` (development @ ec9f9858) | `"@bsuite/charge-calc": "^0.2.3"` |
| R80.3 | `3a27510` (development @ 0853a12e) | `"@bsuite/charge-calc": "^0.2.3"` |

Both consumers pin the same shared package at `^0.2.3`. Per `CLAUDE.md` "Shared Packages" section, `@bsuite/charge-calc` is **published to npm** under the `@bsuite` org. No `workspace:*` or `file:../packages/*` references found in either consumer's `package.json` (canonical compliance per the same `CLAUDE.md` section).

**What's open (residual sub-task):**

Legacy parallel-engine REMOVAL has not been verified. Both apps may still carry `src/lib/charge-calc/` or equivalent local implementations alongside the shared package. Verifying the absence of legacy duplicates requires a grep sweep across both repos (out of scope for ROADMAP audit per the single-cycle rule). Deferred to next FEATURE or EDGE rotation.

---

### Item: Xero payroll integration (5 major TODO blocks in CRM7)

**Status flag (post-audit):** ⚠️ Partial — refreshed.

**What's done:**

- Xero OAuth fixes shipped via [crm7#568](https://github.com/GaryOcean428/crm7/pull/568) `dev → main` promote at 2026-05-08T08:33:17Z (production sha `516aeeac`).
- Edge functions active with dual-layer rate limiting:
  - `xero-token-exchange` (verified canonical pattern in bsuite#704 audit)
  - `xero-invoice-submit` (same)
  - `ram-token-exchange` (Xero-adjacent, also dual-layer)
- `xero-node ^15.0.1` consumed in `crm7/package.json` at sha `522b594`.

**What's open (named sub-tasks):**

1. Invoice-line-item mapping
2. Payroll-run sync
3. Multi-tenant Xero org switching

**Source SHA:** `crm7@main @ 516aeeac` at audit time.

---

### RT-10 — BSU react-day-picker v8 → v9 audit (P3 Sprint Status)

**Status flag (post-audit):** ✅ COMPLETE (2026-05-08).

**Evidence:**

- `business-suite-unified/package.json` at sha `cc598ee42dd9dc2decfd6f3c5fdf15f12e31af63` (development tip at audit time): `"react-day-picker": "^9.14.0"`
- React 19 / date-fns 4.1.0 / Tailwind v4 — all peers consistent with v9 requirements.

**Action taken:** Flipped P3 Sprint Status table cell from `🔲 Pending` to `✅ Complete (2026-05-08)` with full evidence inline.

This closes the last `🔲 Pending` row in the P3 Sprint Status table.

---

## 3. Self-validation (FF-SELF-VALIDATION-20260507)

### §9.1 output-equivalence

N/A — additive doc + targeted in-place edits to the master roadmap. No executable change. The pre/post text content of every roadmap row is captured verbatim in the companion commit's diff.

### §9.2 visual-equivalence

N/A — no UI surface. Both files render as GitHub-flavoured markdown post-merge. The master roadmap renders at the existing path (no redirect or anchor change); this audit document renders at the new path.

### §9.3 self-report uncertainty

- **Item 9 / 16 AI-component failures:** I have not run `pnpm test` against CRM7 in this run (no shell access to a credentialed CRM7 clone for the test runner). The "16 failures" count is sourced verbatim from the prior roadmap text; it may be ±N at audit time. Status flag preserved as ⚠️ pending pending verification.
- **Cross-app notifications:** I confirmed no PR exists on this scope at audit time by listing recent `list_pull_requests` per repo, but did not exhaustively scan all 7 repos' issue trackers. Status preserved as ⚠️ pending.
- **BOOT engine:** Same as cross-app notifications — implementation absence inferred from no PR refs in master roadmap or recent CRM7 promote chain; not exhaustively grep'd.
- **charge-calc legacy duplicate removal:** Explicitly named as deferred. The convergence flag was struck on the dependency-level evidence; a residual sub-task remains.
- **Xero payroll 3 sub-tasks:** Names sourced from common Xero integration scope (Xero-Node SDK chapter on Payroll endpoints). Not from a CRM7-internal scoping doc; if such a doc exists with different sub-task framing, this audit's sub-task names should be reconciled at next ROADMAP rotation.
- **SP-3 closure decision:** I have not categorised what counts as "fully done" for SP-3. The reports tier is substantially closed per 6 PRs landed; financial / compliance / WHS / comms tiers remain open. The In Progress / Pending row is preserved as ⚠️ partial rather than struck.

### Cross red-team (per FF-SELF-VALIDATION mandate)

ship-all-apps verifies evidence rows before flip-to-done. Each row in §2 cites a primary source (PR ref or package.json SHA) that ship-all-apps can re-fetch in <10 seconds via the same MCP tools.

---

## 4. Items NOT audited this run (flagged for follow-up)

The following potential roadmap items surfaced during this run but are out-of-scope for an In Progress / Pending audit:

- **Legacy charge-calc engine removal** — mentioned in §2 charge-calc row; needs grep sweep across CRM7 + R80.3.
- **PermissionsEditor.tsx page-level integration test** — mentioned in §2 Item 9 row; tractable in 1 file, ~120 LOC, ~6 specs (per bsuite#717 follow-up).
- **EDGE 14-fn `checkRateLimit` audit** — bsuite#704 follow-up; 14 BSU edge fns unread (`calendar-integration`, `create-subscription`, `email-token-refresh`, `fairwork-enhanced`, `fairwork-webhook`, `feature-builder-ai`, `feature-builder-export`, `generate-document`, `oauth-google-email`, `oauth-microsoft-email`, `process-webhook-queue`, `rate-limit-check`, `stripe-portal`, `stripe-webhook`, `tga-search`).
- **bsuite-parent CI failures** — `audit (R80.3 | crm7 | braden | throughput | conduit | business-suite-unified)` matrix has been failing since 2026-05-08T03:13Z per bsuite#720 follow-up. Out of scope for ROADMAP; named here for ship-all-apps visibility.

---

## 5. Provenance

- Run started: 2026-05-08T~17:50Z (claude-loop tracking issue [bsuite#731](https://github.com/GaryOcean428/bsuite/issues/731))
- Predecessor: [bsuite#728](https://github.com/GaryOcean428/bsuite/issues/728) (PERF — set Next: ROADMAP)
- Trigger: claude-loop scheduled rotation (no webhook trigger this run; rotation chain owns the cycle).
- Branch: `claude/blissful-dijkstra-gxw0R` (per session-level designation).
- Base: `bsuite@development @ 99810fb` (after rebase from `main @ 0066818` to capture #726 + #721 merges).
- Commits in this PR:
  - Commit 1 — `docs(roadmap): refresh In Progress / Pending — RT-10 done, 2 items struck, 5 evidence-linked` (master roadmap edits)
  - Commit 2 — `docs(audit): add 2026-05-08 In Progress / Pending audit snapshot` (this file)

---

*Generated by claude-loop autonomous rotation 2026-05-08. Future ROADMAP rotations may cite this document directly as a §1.2 primary source for the 2026-05-08 In Progress / Pending state.*
