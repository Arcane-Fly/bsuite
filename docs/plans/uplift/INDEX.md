# BSuite Uplift Plan — Wave Index

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

This directory holds the canonical 9-wave UI uplift program for BSuite.
Tracker: [bsuite#635](https://github.com/GaryOcean428/bsuite/issues/635).

## Canonical documents

| Document | Path | Purpose |
|---|---|---|
| Red-Team-UX Doctrine | `docs/20260507-red-team-ux-doctrine-v1.00A.md` | Authoritative doctrine for ALL PRs: §1 research mandate, §2 6-role red-team table, §3 16-item UX-DX checklist, §4 cron integration, §5 enforcement (no exceptions), §6 reference patterns. |
| BSuite Uplift Design Language | `docs/plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md` | 12 primitives spec, vocabulary contract (banned developer jargon in default UI), 9-wave rollout (W0–W8), per-surface mappings, cross-link to AUTH_CANONICAL.md. |

## Wave assignments (locked)

| Wave | Scope | Owner | Status | Gating |
|---|---|---|---|---|
| W0 | 12 primitives library at `src/components/uplift/` | claude-code-local | ✅ DONE (BSU#364, sha `9c4e101`) | None (top of dep graph) |
| W1 | Feature Builder full redesign | perplexity-computer | ✅ DONE (BSU#361 merged 2026-05-07T09:48Z) | W0 |
| W2 | Reports CRM7 `/reports/*` | claude-code-local | 🟡 UNBLOCKED — awaiting claude-code-local local session | W0 |
| W3 | Pay Item Groups + 3 sibling settings | perplexity-computer | 🔄 IN PROGRESS (perplexity lane) | W0 |
| W4 | Permissions Editor (replaces BSU#346) | claude-code-local | 🔄 IN PROGRESS — scoping on `main` (`bsuite#681`), BSU impl PR pending merge (`BSU#376`) | W0 |
| W5 | Tenant Admin | perplexity-computer | 🟡 UNBLOCKED — queued | W0 |
| W6 | Branding | claude-code-local | 🔄 IN PROGRESS — BSU cleanup PR pending merge (`BSU#375`) | W0 |
| W7 | Apprentice placements | perplexity-computer | 🟡 UNBLOCKED — queued | W0 |
| W8 | Conduit/Throughput/R80.3/Braden consumer bumps | perplexity-computer | ⏳ BLOCKED pending W7 | W0/W1/W2 baseline + W7 sequencing |

## Hard rules (Doctrine §5.1)

1. PR without §2.2 6-role red-team table cannot merge
2. User-facing PR without §3.2 16-item UX-DX checklist cannot merge
3. PR without §1.2 research_evidence (primary-source citations) cannot merge
4. Vocabulary contract: NO banned developer jargon (tenant_id, RLS, FK, "chips", MCP, migration, JWT, schema) in default UI surfaces — only inside `<TechnicalDetails>` primitive

## Cross-references

- AUTH_CANONICAL.md — auth doctrine (cookie SSO is gone; OAuth 2.1 PKCE + JWKS only)
- bsuite-brand-system skill — D2C Neon Electric (OKLCH) for crm7/conduit/BSU/R80.3; corporate red/gold for braden
- bsuite#635 — wave loop tracker with assignments and per-wave doctrine gates
