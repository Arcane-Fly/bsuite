# Architecture Decision Records (ADRs)

This directory holds the authoritative decisions that govern cross-repo architecture for BSuite. Each ADR is a single-purpose decision document with a clear decision, rationale, consequences, and atomic-replace-and-remove plan.

## Index

| # | Title | Status | Ratified | Supersedes |
|---|-------|--------|----------|-----------|
| [ADR-0001](ADR-0001-page-builder-ownership.md) | Page-Builder Ownership | Accepted | 2026-05-01 | P1-4 (AUDIT MISMATCH entry in finish-line roadmap) |
| [ADR-0002](ADR-0002-schema-builder-ownership.md) | Schema-Builder Ownership | Accepted | 2026-05-01 | — |
| [ADR-0003](ADR-0003-consumer-renderer-pattern.md) | Consumer-Renderer Pattern | Accepted | 2026-05-01 | — |
| [ADR-0004](ADR-0004-oauth-allowlist-doctrine.md) | OAuth Allow-List Doctrine | Accepted | 2026-05-01 | Duplicate allow-lists in operator-handoff-v4 |
| [ADR-0005](ADR-0005-rams-funding-authoring.md) | RAMS Funding Authoring | Accepted | 2026-05-01 | — |
| [ADR-0006](ADR-0006-contact-propagation-doctrine.md) | Contact Propagation Doctrine | Accepted | 2026-05-01 | — |

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
- **Cross-reference:** cite the canonical one-shot spec (`docs/20260227-dry-one-shot-architecture-v1.01A.md`), the finish-line roadmap (`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`), the outstanding-work ledger (`docs/20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md`), and the merged execution backlog (`docs/20260501-merged-execution-backlog-v1.00W.md`) where relevant.

## Authoring a new ADR

1. Pick the next free number.
2. Use an existing ADR as a template. ADR-0001 is the reference for medium-complexity decisions; ADR-0004 is the reference for short doctrine decisions.
3. Include a "What this unblocks" section listing concrete phase/item IDs this ADR gates.
4. Add a row to this index in the same PR.
5. Do not commit an ADR as Accepted until the user has explicitly ratified it. Use Proposed status during discussion.
