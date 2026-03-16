> **SOURCE:** Ported from Claude memory file on 2026-03-16. Original memory file retained for cross-session persistence.

---

# BSuite Competitive Landscape & Launch Strategy

## Research Date: 2026-03-03

## Competitor Map

| Competitor | GTO-Specific? | BOOT? | Key Strength | BSuite Advantage |
|-----------|--------------|-------|-------------|-----------------|
| **ReadyTech** | YES (only TPES) | No | 35% GTO market, purpose-built | Modern UX, AI, BOOT automation |
| **Workforce One** | Partial | No | 30yr experience, broad features | UX (theirs is dated), AI, pricing |
| **foundU** | No (labour hire) | YES (export tool) | Award interpretation, $3/user/wk | GTO workflows, deeper BOOT |
| **Entire OnHire** | No (labour hire) | No | Dual mobile apps, payroll | GTO compliance, modern UX |
| **Definitiv** | No (payroll) | No | Drag-and-drop award rules | Full CRM + compliance |
| **Employment Hero** | No (SME HR) | No | 350K businesses, scale | GTO specificity |

## Key Strategic Insights

1. **The GTO gap is real** — ReadyTech and Workforce One own it with dated UIs. foundU/Entire OnHire have modern UX but zero GTO features. BSuite fills the gap: modern UX + GTO-native.
2. **NOBODY does automated BOOT** — foundU has an export tool, nobody else even that. BSuite's BOOT engine (backed by Braden's legal expertise) is a genuine moat.
3. **ReadyTech's TPES accreditation is the highest barrier** — only accredited GTO platform. Path: win underserved GTOs first, build toward TPES long-term.
4. **Pricing transparency is disruptive** — foundU publishes $3/user/week. Everyone else hides pricing. Freemium tier (free for ≤5 apprentices) would be unique.
5. **Host employer portal UX** — no competitor provides GTO-specific host data (training progress, TAFE attendance, field visits) in a modern portal.

## Launch Posture

- **Strategy:** HubSpot playbook — not more features, dramatically better UX
- **Target:** GTO Operations Managers switching FROM a competitor (not from spreadsheets)
- **Differentiators:** BOOT automation, AI assistant, real-time charge rates, GTO Standards dashboard, SSO portal, modern dark-mode design
- **Kill list philosophy:** "If it doesn't work, it doesn't exist" — 61 stubs audited, broken features hidden behind feature flags

## Stub Audit Summary (2026-03-03)

- **61 stubs total** across 6 projects: 9 Critical, 28 High, 15 Medium, 9 Low
- **Most dangerous pattern:** 29+ settings mutations show success toast when nothing persists
- **CRM7:** 43 stubs (7 critical — hardcoded dashboard, settings mutations, host reports)
- **BSU:** 6 stubs (1 critical — analytics service entirely mock data)
- **Conduit:** 4 stubs (1 critical — setTimeout fake save in settings)
- See full audit in `docs/plans/20260303-bsuite-launch-ready-design-v1.00D.md` Appendix A

## Implementation Plan

- `docs/plans/20260303-bsuite-launch-ready-implementation-plan-v1.00W.md`
- Phase 0: Feature flag infrastructure (useFeatureFlags hook, FeatureGate component, nav gating)
- Phase 1: Kill list — hide 61 broken features behind flags
- Phase 2: Empty states on all list pages
- Phase 3: Dashboard + onboarding improvements
- Phase 4: Differentiator polish (Cmd+K, activity timeline)

## Table Stakes from Competitor Analysis

Must match (appear in 4+ competitors): award interpretation, digital onboarding, timesheet→payroll→invoice, host portal, mobile app, STP Phase 2, expiry tracking, reporting, integrated payroll.

GTO-specific table stakes: training contract mgmt, RTO schedule tracking, apprentice lifecycle states, host employer mgmt (tripartite model), field visit recording, completion rate tracking, STA/funding body reporting.
