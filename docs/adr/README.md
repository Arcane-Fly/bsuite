# Architecture Decision Records (ADRs)

This directory holds the authoritative decisions that govern cross-repo architecture for BSuite. Each ADR is a single-purpose decision document with a clear decision, rationale, consequences, and atomic-replace-and-remove plan.

## Index

| # | Title | Status | Ratified | Built? | Supersedes |
|---|-------|--------|----------|--------|-----------|
| [ADR-0001](ADR-0001-page-builder-ownership.md) | Page-Builder Ownership | Accepted | 2026-05-01 | — | P1-4 (AUDIT MISMATCH entry in finish-line roadmap) |
| [ADR-0002](ADR-0002-schema-builder-ownership.md) | Schema-Builder Ownership | Accepted | 2026-05-01 | — | — |
| [ADR-0003](ADR-0003-consumer-renderer-pattern.md) | Consumer-Renderer Pattern | Accepted | 2026-05-01 | — | — |
| [ADR-0004](ADR-0004-oauth-allowlist-doctrine.md) | OAuth Allow-List Doctrine | Accepted | 2026-05-01 | — | Duplicate allow-lists in operator-handoff-v4 |
| [ADR-0005](ADR-0005-rams-funding-authoring.md) | RAMS Funding Authoring | **Superseded** | 2026-05-01 | ❌ **never built — and must not be** | superseded by operator ruling 2026-08-06 (`crm7/src/lib/funding/index.ts`) |
| [ADR-0006](ADR-0006-contact-propagation-doctrine.md) | Contact Propagation Doctrine | Accepted (**org half superseded**) | 2026-05-01 | ⚠️ contacts yes; `clients.type` **never existed** | org half superseded by `crm7/docs/adr/20260525-host-employer-table-canonicalization-v1.00W.md` |
| [ADR-0007](ADR-0007-stripe-fdw-read-doctrine.md) | Stripe FDW Read Doctrine | Accepted — **retirement recommended** | 2026-05-12 | ❌ **never built** (no `wrappers` ext, no `stripe` schema, migration unapplied) | New Stripe read paths implemented as edge-function proxy chains |
| [ADR-0008](ADR-0008-schema-builder-consolidation.md) | Schema Builder Consolidation — `@bsuite/schema-builder` | Accepted | 2026-05-01 | ✅ package published | — (**renumbered from ADR-0004** on 2026-08-17; duplicate-number collision) |
| [ADR-0009](ADR-0009-funding-refinement-semantics.md) | Funding Refinement Semantics — placement replaces, never adds | Accepted | 2026-08-26 | ✅ live in crm7 (separate-ledger); ⚠️ contradicted by unwired `R80.4 applyPlacementFunding` | — (extends ADR-0005's superseding ruling) |
| [ADR-0010](ADR-0010-fix-the-class-not-the-page.md) | Fix the Class, Not the Page | Accepted | 2026-08-26 | ⚠️ policy — mechanism exists (D8.1 + `sibling_class`); 9 classes open | — |

> **The `Built?` column is mandatory.** It was added on 2026-08-17 after an audit found
> that three ratified ADRs had never been implemented and the index gave no way to tell.
> An ADR index that records only *ratification* turns every unbuilt decision into a
> standing false signal — a future lane reads "Accepted" and assumes the substrate
> exists. State the measured build state, and cite the measurement.

### ADRs that live outside this folder

This index historically scanned only `docs/adr/`, which hid ratified decisions filed
elsewhere. Known decisions held in other locations:

| Decision | Location | Status | Built? |
|---|---|---|---|
| Xero Payroll AU — STP Phase 2 path (Option B, passthrough) | [`docs/20260519-xero-payroll-au-stp-path-decision-v1.00A.md`](../20260519-xero-payroll-au-stp-path-decision-v1.00A.md) | **Approved** | ❌ prescribed path unbuilt — see banner in that file |
| STP Xero Passthrough (`pay_runs` passthrough fields) | `crm7/docs/adr/0004-stp-xero-passthrough.md` | Accepted | ⚠️ columns exist; no submission path wired |
| Canonicalize Host Employers to `public.employers` | `crm7/docs/adr/20260525-host-employer-table-canonicalization-v1.00W.md` | Accepted | ✅ live (`employers` + 4 role flags) |
| `@bsuite/charge-calc` as single-source calc engine | `crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md` | Accepted | ✅ live |
| Contacts / Clients / Leads three-table design | `crm7/docs/adr/20260525-contacts-clients-leads-canonical-source-v1.00W.md` | Accepted | ✅ live |

## Status values

- **Proposed** — draft under discussion
- **Accepted** — ratified by user, executing now or in future phase
- **Deprecated** — superseded by a later ADR (cite the successor)
- **Rejected** — considered and declined (kept for future agents to understand why)

Never edit an Accepted ADR in place except to (a) mark it Deprecated with a successor citation, (b) fix typos, (c) add "what unblocks" items as new consequences emerge. Substantive changes write a new ADR.

## Conventions

- **Filename:** `ADR-NNNN-kebab-case-title.md` — four-digit zero-padded number, stable across supersession.
- **Structure:** Context → Decision → Rationale → Consequences (including atomic replace-and-remove list) → What this unblocks → Compliance Gate.
- **Atomic replace-and-remove:** every ADR that prescribes a change must name the atomic PR set that ships the change and the code/tables/docs that get removed in that same PR set. No dual-path interim states. No `@deprecated` markers shipped.
- **Cross-reference:** cite the canonical one-shot spec (`docs/20260227-dry-one-shot-architecture-v1.04A.md`), the finish-line roadmap (`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`), the outstanding-work ledger (`docs/20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md`), and the merged execution backlog (`docs/20260501-merged-execution-backlog-v1.00W.md`) where relevant.

## Authoring a new ADR

1. Pick the next free number.
2. Use an existing ADR as a template. ADR-0001 is the reference for medium-complexity decisions; ADR-0004 is the reference for short doctrine decisions.
3. Include a "What this unblocks" section listing concrete phase/item IDs this ADR gates.
4. Add a row to this index in the same PR.
5. Do not commit an ADR as Accepted until the user has explicitly ratified it. Use Proposed status during discussion.
