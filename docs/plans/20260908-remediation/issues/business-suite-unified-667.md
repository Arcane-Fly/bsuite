# RULING 13.1/13.2 — parent-over-sub-org (NEVER merge): link record, dual consent, scope chosen at link time, clean unlink

https://github.com/GaryOcean428/business-suite-unified/issues/667

Snapshot updatedAt: 2026-08-31T02:52:19Z. Open at capture; re-read live.

Implements **operator RULING 13.1 + 13.2 (2026-08-08)**. No tracked owner until now.

> **13.1** *"Never build merge. Build parent-over-sub-org."*

## The distinction is the whole ruling — do not conflate them

| | **Merge** | **Parent over the top** |
|---|---|---|
| Effect | two organisations become one; one set of records survives | sub-org keeps its own records, admins and agreement |
| Reversible | **no** | yes, via unlink |
| Build it? | **NEVER** | yes, with all four gates below |

## RULING 13.2 — four requirements, all four before anything ships

1. **The parent-child link is its own record**, not an inferred relationship.
2. **Consent captured from both sides**, with who approved and when.
3. **The scope of what the parent can see is chosen at link time. Never assume full visibility.**
4. **Unlink returns the sub-org to standalone without touching its data.**

> *"Without all four you have one client reading another's records on a shared production database with live clients."*

That is not hypothetical — Caris is a real client on this database. Treat any partial implementation as a live cross-tenant exposure, not as progress.

## ⚠ Not in the recovery docs — design fresh

I read the corpus in full on 2026-08-08. Searched for parent-org, enterprise linking, consent, scoped visibility: **zero hits**. RULING 1.2 does not cover this one.

The nearest things are **not** this and must not be mistaken for it:
- `20260304-crm7-comprehensive-gap-analysis-v1.00W.md:101` — *"G21 Multi-Tenant Org Hierarchy | Single org wizard | P3 | 2w"* — a one-line backlog stub, no design.
- `20260301-reconciliation-phase1-implementation.md:706-834` — `user_tenant_links` + entity-scoping RLS. This is **role-based visibility for external portal users inside ONE tenant** (host / training provider / apprentice). It is not an org-over-org hierarchy and reusing it as one would be a cross-tenant hole.

## Why it was deliberately not started (B11, accepted)

All three existing invitation tables (team / tenant / workspace) key on **email + role** — they invite a **person**. None models inviting an existing **organisation**. Starting this half-built is worse than not starting.

## Acceptance
- the link is a row with both parties' approvals and timestamps
- a parent with a **narrow** scope provably cannot read outside it — proved with a **two-tenant negative test that carries a passing positive control** (per B7: a dead engine refuses attacks perfectly)
- unlink leaves the sub-org byte-identical
- no merge path exists anywhere in the codebase

**Test-account rule (B6):** disposable fixtures via the GoTrue admin API. A negative security test may **never** name a real tenant as victim or attacker, and no real account gets an `org_members` row to make a test pass.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: the two-tenant scoped-visibility test, with its positive control passing
- **Cross red-team**: an independent agent attempts to read across the link outside the granted scope and **fails**; the same agent confirms the control write **succeeds**
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

