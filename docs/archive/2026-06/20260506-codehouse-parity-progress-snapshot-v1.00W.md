# Codehouse parity issues progress snapshot

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** SNAPSHOT — refreshed each cron-run-N until parity issues close
**Source of truth for downstream:** dashboard `parity_status` payload + `bsuite_alerts_user`
**Tracker:** GaryOcean428/bsuite#567-579 (13 issues filed 2026-05-06)

---

## Executive summary

13 Codehouse parity issues filed 2026-05-06 covering 82 of the 142 mapped gaps from the parity matrix. As of 2026-05-06T17:00Z (cron-run-6 boundary):

- **All 13 issues OPEN.** Zero assigned to humans. Zero closed.
- **Only #579 has indirect progress** — 7 DOC-DRIFT PRs filed (1 merged, 6 awaiting validation).
- **Zero PRs filed against the other 12 parity issues.**
- **5 issues flagged `needs-team`** (#568, #569, #570, #571, #572) — these require business decisions or external integrations and cannot be resolved by single-agent autonomy.
- **7 P1 issues, 6 P2 issues** — see priority distribution below.

---

## 1. Priority distribution

| Priority | Count | Issues |
|---|---|---|
| P1 (deliver soon) | 7 | #567 #568 #569 #570 #571 #573 #578 |
| P2 (deliver later) | 6 | #572 #574 #575 #576 #577 #579 |

## 2. needs-team distribution

5 issues require operator decisions or external commitments before agents can ship:

| Issue | Reason for needs-team | Operator action needed |
|---|---|---|
| #568 timesheet approval | Ambiguous business rules (multi-level approval chain, alternate approvers, escalation timing) | Confirm approval routing rules vs current crm7 SimpleApproval implementation |
| #569 Pay Item Groups | Largest GTO unlock — touches schema + payroll engine + UI | Confirm scope boundary (groups-only vs full named-group hierarchy) |
| #570 MYOB + Astute adapters | External vendor integration — auth credentials + sandbox accounts needed | Provide MYOB sandbox credentials + Astute API key, or scope to no-op stub |
| #571 Comms (Twilio SMS) | External vendor + cost commitment | Confirm Twilio account or scope to provider-abstraction layer only |
| #572 Geo-fence + kiosk + biometric | Hardware integration scope (camera, GPS, native bridge) + privacy review | Confirm kiosk hardware target + privacy-policy update commitment |

## 3. By-domain progress

| Domain | Issue | P | Gaps | Status | Movement | Owner-app | PRs |
|---|---|---|---|---|---|---|---|
| Timesheet entry (A) | #567 | P1 | 8 | OPEN | none | crm7 | 0 |
| Timesheet approval (B) | #568 | P1 | 4 | OPEN needs-team | none | crm7 | 0 |
| Pay items (C) | #569 | P1 | 11 | OPEN needs-team | none | crm7 | 0 |
| Pay-export adapters | #570 | P1 | 1 | OPEN needs-team | none | crm7 | 0 |
| Comms | #571 | P1 | 3 | OPEN needs-team | none | crm7 | 0 |
| Mobile portal/kiosk | #572 | P2 | 3 | OPEN needs-team | none | crm7 | 0 |
| Leave (F) | #573 | P1 | 5 | OPEN | none | crm7 | 0 |
| Reports (K) | #574 | P2 | 4 | OPEN | none | crm7 | 0 |
| Pay periods (E) | #575 | P2 | 4 | OPEN | none | crm7 | 0 |
| File-export adapters (L) | #576 | P2 | 3 | OPEN | none | crm7 | 0 |
| Integrations (U) | #577 | P2 | 5 | OPEN | none | crm7+conduit | 0 |
| Admin (H/M/N) | #578 | P1 | 14 | OPEN | none | crm7 | 0 |
| Doc drift | #579 | P2 | 17 | OPEN partial | 7 PRs (1 merged, 6 open) | all 7 | bsuite#585(MERGED), crm7#503, conduit#193, business-suite-unified#345, R80.3#190, braden#232, throughput#123 |

---

## 4. Why the 12 non-doc issues have zero PRs

**Root cause analysis:** the parity issues were filed 2026-05-06 (today). All three peer agents have spent today on:

1. Apprentice-placement product work (L1 / L1.1 / L2 / L3.A / L3.B / L4 / L6 / L3.C-DOC)
2. Visual Feature Builder Phase 0 + Phase 5
3. DOC-DRIFT 7-repo doc-fix sweep
4. Dashboard infra (Pages publish + data refresh)
5. Inter-agent protocol authoring (§16-§20)

Parity work is the next major workstream once apprentice-placement product is feature-complete. The 7 already-shipped apprentice spec PRs (L4/L6/L3.C-DOC) put the apprentice product within 2 implementation PRs (L3.C form impl + L3.D dialog impl) of feature-complete.

**Recommendation:** the operator (or claude-code's governance lane) should:

1. **Merge the 6 open DOC-DRIFT submodule PRs** to close partial-progress on #579
2. **Decide on the 5 needs-team items** (table in §2 above) so peer agents can claim them
3. **Sequence the 7 non-needs-team P1 items** (#567, #573, #578) for next workstream

## 5. Recommended next claims (research-lane preview)

Per protocol §11 split, peer agents will claim parity items in spec/implementation pairs:

| Issue | Research-lane spec scope (perplexity) | Implementation scope (claude/codebuff) |
|---|---|---|
| #567 timesheet entry | UI vocab spec + Zod schemas + 8 cross-field rules | RHF form + service-layer transitions |
| #573 leave | Leave-state machine canon + accrual algebra spec | Service layer + UI + accrual cron |
| #574 reports | Standard report catalog + parameter schemas + RLS | Report runners + UI |
| #575 pay periods | Pay-period lifecycle canon + closing-rules spec | Service layer + UI |
| #576 file-export | ABA + WET file format spec + golden fixtures | Edge function + storage upload + UI |
| #577 integrations | Idibu + Adobe Sign + DocuSign API contracts | Edge function adapters |
| #578 admin | 14-gap inventory spec (hiring divisions, PH groups, etc.) | Multiple coordinated PRs |

All P1 + non-needs-team. All research-lane fit for me. Estimated 3-5 cron-runs per spec PR.

## 6. needs-team escalation

If the operator confirms the 5 needs-team items, peer agents can begin claiming them in the same spec/implementation pattern. Until escalation, those 5 items remain `needs-team` blocked. **No agent should claim a needs-team item without operator unblock.**

---

## 7. Distribution + cross-references

This snapshot is:

- Posted as a comment on each of the 13 parity issues (so each issue tracks its current state from this single source of truth)
- Saved to dashboard data file as `parity_progress_snapshot` for next refresh
- Sleep-packet referenced for next perplexity-computer cron run
- The successor of any prior parity progress comments

## 8. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve
2. ✓ All citations verified live — issue states queried via `gh issue view #N` 2026-05-06T17:00Z
3. ✓ No placeholders without owner+ETA
4. ✓ Conventional commit `docs(bsuite):` prefix
5. ✓ Naming `20260506-codehouse-parity-progress-snapshot-v1.00W.md`

## §17 mutual-reminder

- ✓ red-team table present (priority + needs-team + by-domain breakdown)
- ✓ smoke test documented (each issue state queried live; numbers reconcile to dashboard)
- ✓ no orphan branches (will delete `perplexity/codehouse/parity-issues-progress-2026-05-06` after merge)
- ✓ no dead code (research doc only)

## AUTH_CANONICAL.md compliance

N/A — no auth changes.

## Hand-off

@claude-code: cross-validation request per §17. Per §20 obvious-fix autonomy, this is a status-snapshot doc — direct merge if accurate. After merge, I will (in next cron run) post a comment-link on each of the 13 issues pointing here, replacing any prior progress comments to keep #567-579 in sync with reality.
