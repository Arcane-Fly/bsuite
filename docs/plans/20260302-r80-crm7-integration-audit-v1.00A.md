> **SOURCE:** Ported from Claude memory file on 2026-03-16. Original memory file retained for cross-session persistence.

> **STATUS: A (Approved/complete) — re-marked 2026-06-11 by the docs/roadmap closure audit.** Milestones 1–3 delivered: shared calc engine extracted to `@bsuite/charge-calc` (consumed at `^0.5.0` by both crm7 and R80.3 `package.json`); Award IR engine shipped; charge-engine respawn closed via R80.3#248 (closed 2026-05-14).

---

# R80.3 ↔ CRM7 Cross-Functionality Audit — Reference

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Critical Items (Tier 1)

- C1: Shared calc package (`@bsuite/charge-calc`) — DRY violation fix
- C2: Penalty rate calculation (blended rates)
- C3: Overtime rate calculation
- C4: Date-aware super (11.5% → 12% July 2025)
- C5: FWC annual wage review workflow
- C6: Consolidate R80.3 dual engines/stores
- C7: Award interpretation engine (top 10 awards, JSON rule schemas)
- **C8: BOOT (Better Off Overall Test) compliance engine** — ELEVATED from L4 to C-tier (competitive differentiator + union compliance risk)

## High Priority (Tier 2)

- H1-H10: Shift loadings, allowances, PLSL, multi-apprentice quoting, quote→contract→billing lifecycle, billing module, review system, funding model, pipeline segmentation, enterprise cost-only mode

## BOOT Engine Design (C8)

### Why Critical

- User (Braden) is a lawyer who worked in GTO industry — even with legal expertise, making BOOT documentation bulletproof was hard
- Unions drill down on BOOT compliance — this is where EAs get rejected
- Competitors only link one award/EBA at a time, leaving users to figure out BOOT themselves
- Most GTO users don't understand BOOT well enough to do it properly
- Getting this right = huge competitive differentiator / market moat

### What It Does

- Multi-award/EBA simultaneous comparison per employee class
- Scenario analysis across foreseeable roster patterns (typical, worst-case, casual minimum, peak)
- FWC-ready spreadsheet output (Form F17 attachments)
- Marginal pass detection + reconciliation clause recommendations
- GTO multi-placement complexity handling (same apprentice, different hosts, different awards)
- Per-class and per-employee global assessment (holistic, not line-by-line, per s.193A)

### Data Model (shares ~80% with C7 award engine)

- Award config: rates by classification, penalty schedules, OT rates, allowances, leave, hours provisions
- EA config: same structure with proposed terms, loaded rates, absorption clauses
- Employee/class roster data: hours by day, shift type, OT patterns, applicable allowances, years of service
- Calculation: Award annual total vs EA annual total, term-by-term breakdown
- Output: pass/fail/marginal per class, scenario matrix, FWC-ready docs, undertaking recommendations

### Legal Framework

- Fair Work Act 2009 ss.193, 193A, 190-191
- Global/holistic assessment (not line-by-line) — codified by Secure Jobs Better Pay Act 2022
- Only "reasonably foreseeable" working patterns considered (post-June 2023)
- FWC can now amend agreements and reconsider approved ones post-approval
- Reconciliation clauses endorsed by Full Bench for loaded rate agreements

### Phasing

- Foundation (C7 award engine) must be built first — BOOT layers on top
- BOOT engine slots into Phase 2 alongside C7, adds ~3-4 days
- Shares penalty/OT/allowance calculation from C2/C3/H1/H2

## Canonical Calculation Reference

**charge-calculator.jsx** (root of bsuite repo) is the gold standard — extracted from Braden's professional Excel spreadsheets. All implementations must match its formulas.

### Critical Formula Differences Found (calculationUtils.ts vs gold standard)

| Area | Gold Standard | calculationUtils.ts | Impact |
|------|--------------|---------------------|--------|
| Allowances | 5 types + super-applicable flags | Not implemented | BLOCKER |
| Workers Comp scope | Worked + training weeks only | All 52 weeks | Over-charges WC |
| Penalty/OT rates | 2 categories, 8 rate types | Not implemented | BLOCKER |
| Super on OT | Optional boolean flag | Not implemented | BLOCKER |
| Leave loading | Multiplicative: `pay × (1 + %)` | Additive: separate component | Different totals |
| Overhead | % or flat annual | % only | Reduced flexibility |
| Margin | % or flat per-hour | Not shown | Missing |
| Funding application | Per-hour, excludes OT | Per-year, applies to all | Different cost outcomes |
| Annual pay base | Fixed 48 weeks + AL | weeksPerYear (variable) | Structural difference |

### r8Calc.ts status

Type definitions only — no calculation logic. Effectively dead code.

### What calculationUtils.ts does have that gold standard doesn't

- Weighted funding distribution (year1/2/3/4 weights) — good feature, keep it
- Named billing model enum (Standard/ALEX48/W52) — cleaner API than raw week count
- Payroll tax as separate on-cost line — gold standard rolls it into overheads

## Key Architecture Decisions

1. Shared TypeScript calc module + Supabase Edge Function (client for speed, server for audit)
2. Award interpretation is data-driven JSON schemas, not hardcoded
3. Three calc modes: Simple, Blended (estimated shift mix), Actual (timesheet-based)
4. CRM7 = sales/quoting UI, R80.3 = specialist rate management UI
5. Enterprise mode = premium BSU tier
6. Start with top 5-10 awards, expand over time
7. Progressive disclosure UI pattern
8. BOOT engine is the validation/compliance layer on top of the calc engine

## Phase Timeline (Updated)

- Phase 1 (Wk 1-4): Foundation — C1, C6, C4, C2, C3 + test suite
- Phase 2 (Wk 5-8): Compliance — C7, **C8 (BOOT)**, C5, H4, H2, H3
- Phase 3 (Wk 9-14): Lifecycle — H5, H6, H7, M10, M6
- Phase 4 (Wk 15-18): Advanced — H9, H10, H1, H8, M3, M12
- Phase 5 (Ongoing): Polish — remaining medium + low items

## AI Enhancement Layer (Post-Core Implementation)

After the core BOOT engine is functional, integrate with BSuite's cross-system AI (CRM7 AI SDK):

- **AI-assisted EA drafting**: Suggest EA terms that will pass BOOT based on award analysis
- **Natural language BOOT summary**: Generate plain-English explanations of pass/fail results for non-lawyers
- **Risk scoring**: AI-predicted likelihood of FWC rejection based on historical patterns
- **Anomaly detection**: Flag unusual combinations (e.g., loaded rate that looks sufficient on paper but fails edge-case rosters)
- **Union negotiation prep**: AI-generated talking points addressing likely union BOOT objections
- **Auto-classification**: Given job description, suggest correct award + classification level
- **Reconciliation forecasting**: Predict likely top-up amounts for reconciliation clause agreements
- Gated by BSU subscription tier (Professional/Enterprise)

## Red Team Findings

- Shared package approach validated but needs dual strategy (local import + edge function)
- Award engine scoped to top 10 awards, extensible via JSON schemas
- Dual store migration: keep store interface, swap implementation, feature-flag transition
- Three penalty calc modes: simple → blended → timesheet-actual
- Funding UI: progressive disclosure (simple default, advanced toggle)
- Testing: unit + property-based + regression + cross-verification + golden files
- BOOT testing: golden file tests against known Fair Work examples, cross-verification with manual lawyer-reviewed calculations
