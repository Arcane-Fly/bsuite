---
kind: record
authority: none
owner: bsuite
---

# Weekly Gap Assessment — 2026-07-21 → 2026-07-28

> **Recovery note (2026-07-28):** this file was authored untracked and destroyed by a concurrent
> agent's git operation before it was ever committed. Restored from the surviving task briefs in
> `.superpowers/sdd/20260728-weekly-gap-assessment-plan-v1.00F/` and the controller ledger.
> Findings live in [20260728-weekly-gap-register-v1.00F.md](20260728-weekly-gap-register-v1.00F.md).

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Assessment-only plan (read-only). Executed via subagent-driven-development: one assessor per domain.

## Global Constraints

- **Read-only.** No edits, commits, builds, dev servers, or test-suite runs.
- **Evidence or it did not happen.** Every finding cites `file:line`, a commit SHA, a migration
  filename, or command output. No inference-only claims.
- **Distinguish BUILT from WIRED from LIVE.** Code existing ≠ reachable ≠ deployed.
- **Severity**: P0 (broken/data-loss/security in prod), P1 (incomplete/unreachable), P2 (quality/debt).

## Tasks

### Task 1

**Scope:** DB migration application + collision integrity

27 migrations added this window. Verify each was actually APPLIED to the live DB,
not merely committed. Specific known risks to confirm or refute:

- `MIGRATION_FLOOR` is `20260611000000` (`.github/workflows/supabase-migrate.yml:91`).
  `crm7/supabase/migrations/20260306000004_rcti_schema.sql` was added this window but
  is pre-floor — determine whether it was silently skipped and whether its objects exist live.
- Two **post-floor cross-submodule version collisions** added this window:
  - `20260722120000` — crm7 `apprentice_placements_add_suspended_status` vs BSU `r80_to_r8_canonical_slug`
  - `20260726090000` — crm7 `email_message_links` vs R80.3 `funding_offsets`
  Determine from `supabase-migrate.yml` whether the applier keys on version globally
  (silently skipping the second) or per-repo. If global, confirm live which side lost.
- Whether `supabase-migrate` workflow runs succeeded this window for each submodule.


### Task 2

**Scope:** Card-unglue sweep completeness (crm7 burns 1–12, BSU, conduit)

The largest single body of work this window. Assess:
- Are ungued cards genuinely individually movable/persistable via `PageGridLayout`,
  or cosmetically wrapped? Trace one representative page end-to-end.
- Pages "marked legit" (~20 commits): is each justification sound, or is "legit"
  being used to close out pages that should have been decomposed?
- Do the card-unglue contract tests actually fail on a regression, or assert nothing?
- Which pages remain unswept (crm7#479 PageGridLayout rollout, `host-employer portal`
  explicitly deferred at commit ea054ff9).


### Task 3

**Scope:** BSU enterprise licence / seat caps / invites / Xero linkage

Trace DB → RPC → API → UI for `enterprise_licence_events`, seat-cap enforcement on
team invites, the grace `invite_email` DRY exemption, and the claimed Xero linkage.
Identify: unreachable UI, unenforced caps, missing error states, absent Xero wiring.


### Task 4

**Scope:** Conduit STA email ingestion + recruitment→employment handover

Two 5-part features shipped this window. Assess wiring completeness:
- STA: edge fn deployed? `pg_cron` job seeded with a Vault token? per-state parsers
  reachable? manual-confirm queue UI navigable? `confirm_sta_email` RPC used by UI?
- Handover: edge fn ownership moved to crm7 (commit cbf7631) — is the crm7 side present,
  or did removal leave a hole? Document copy + email re-link + candidate_id threading.


### Task 5

**Scope:** R80.3 funding schemes + N-CRIT + money integrity

Compliance-critical. Assess:
- `ca47b14` removed hardcoded award rate fallbacks (FWC API only) — what happens on
  FWC API outage/rate-limit? Is there a user-visible failure path or a silent zero?
- KAP/PHI/funding-offset registry + `resolveSchemeAmount` correctness and test coverage.
- N-CRIT p1–p3 (en-AU dates, attribute selectors, hierarchy picker, manual %, MAPD badge)
  — wired into the calculator UI or built-but-unmounted?
- Money-integrity uniqueness/resolver/financial gate.


### Task 6

**Scope:** Shared package pin train + consumer chain (§12.2)

`@bsuite/ui@1.0.1`, `@bsuite/schema-registry@1.0.0`, `@bsuite/schema-builder@1.0.1`,
plus theme/nav-core/charge-calc. Verify per CLAUDE.md §12.2: published to npm, pinned in
EVERY consumer, no `workspace:*`/`file:` leakage, no version skew, lockfiles valid
(`.:` sole importer), React version policy honoured.


### Task 7

**Scope:** Security fix verification

CORS wildcard→allowlist (braden, throughput), RLS authenticated-scope alignment
(conduit#362), X1 money-integrity RPC allowlist, RT-3/RT-4/RT-5/RT-6 remediations,
`email_vault_token_authz`, `funding_sources_rls_repair`, `case_notes_rls_setof`,
`create_sub_organization_revoke_anon`. Cross-check against the two open linter
false-green issues (crm7#1158 secdef search_path, crm7#1175 revoke-anon) — do those
false greens mean any of this window's security claims are unverified?


### Task 8

**Scope:** Frontend↔backend mapping + UI/UX completeness

Across all 6 apps: routes vs navigation entries (orphan pages), UI surfaces with no
backend, backend RPCs/tables with no UI, landing/legal/manuals discoverability,
theme-token compliance (no raw hex/rgb/hsl/text-white in consumer UI), dead code left
by this window's removals.

## Out of scope for assessors (controller handles)

- Parent `main`/`development` 12/14 divergence.
- Roadmap/dashboard truth reconciliation.

