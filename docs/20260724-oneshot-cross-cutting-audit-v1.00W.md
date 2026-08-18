# One-Shot Cross-Cutting Audit — 2026-07-24

> **Naming:** `20260724-oneshot-cross-cutting-audit-v1.00W.md` · Status **W** · Full cross-cutting DRY one-shot compliance audit of everything shipped 2026-07-22→24 (Documentation Program, STA email ingestion, bug-hunt fixes, email/funding expansion). Policy: `20260227-dry-one-shot-architecture-v1.04A.md`.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Verdict: mostly compliant — 5 genuine violations (all fixed), 4 registration gaps (all closed)

**Clean:** no snapshot/mirror/duplicate tables anywhere; candidate_snapshot handoff token is a transient JSON projection (not a persistent mirror); payrollSourceReader reads live; schemaBuilderService consolidated to shims; funding_offsets is a distinct concept from funding_claims (charge-rate reduction vs claim lifecycle); manuals single-source blocks; charge-calc package has zero DB writes; `tenant_role_permissions` is a crm7-local override table (not a BSU-permissions write).

## Violations found → fixed

| # | Severity | Finding | Fix | Status |
|---|----------|---------|-----|--------|
| 1 | Medium | crm7 `compose.tsx:245` free-text `recipient_id` (UUID paste) | EntitySelector per recipient type | lane `fix/oneshot-crm7-entity-selectors` |
| 2 | Low-Med | crm7 `compose.tsx:195` free-text `recipient_name` (no auto-populate) | auto-populate from selected entity (§4) | same lane |
| 3 | Medium | crm7 `from-candidate.tsx:396` free-text `qualification_code` | QualificationSelector (snapshot code pre-fill) | same lane |
| 4 | **High** | braden direct writes to crm7-owned `clients` (`adminCrudService.ts:76`, `useSiteEditorData.ts:205`) + free-text AddClientDialog | remove client creation from braden; link to crm7 | lane `fix/oneshot-braden-cross-app-writes` |
| 5 | Medium | braden direct writes to `leads` (`adminCrudService.ts:115`, `useSiteEditorData.ts:166`) | route through crm7 `lead-capture` edge fn (owning surface) | same lane |

## Registration gaps → closed

| Gap | Action | Status |
|-----|--------|--------|
| `leads` missing from §1 ownership map | added (CRM7-owned; braden captures via lead-capture) | doc v1.04A |
| `invoices`, `invoice_runs`, `invoice_line_items`, `invoice_run_invoices` missing from dry-lint map | registered (crm7-owned invoices; r8-owned runs/line-items) | lane `fix/oneshot-ownership-map` |
| `funding_offsets` + `award_rate_cache` missing from dry-lint map | registered (r8-owned; shared cache) | same lane |
| `tenant_role_permissions` missing from dry-lint map | registered (crm7-local override) | same lane |

## Architectural note (not a violation)

The handover edge fn writes directly to crm7-owned `document_metadata` + `email_message_links` via the service role (operator-approved *content* — the doc-copy + email re-link), bypassing a crm7-owned RPC boundary. Person creation correctly delegates to crm7's `create_apprentice_from_candidate` RPC. **Improvement noted for a future pass:** a crm7-owned `create_handover_document` RPC so the write authority stays in the owning domain. Not blocking — the content is approved and idempotent.

## Exception documented

The **lifecycle-handover exception** is now codified in the policy doc (v1.04A): one-time ownership-domain transitions (candidate→apprentice) may take an immutable evidence copy with provenance — a migration, not a mirror. This is the operator-approved basis for the W2 document handover and is NOT a one-shot violation.

## Issues touched

- crm7#469/#470/#471 (one-shot spec/propagation/unification audits) — this audit covers the propagation/violation-detection scope for the 2026-07-22→24 ship window; the historical full-suite audit matrix remains open on those issues.
- bsuite#1610 (LocalisedDateInput cross-app) — UI-component duplication (not data duplication); still open, R80.3 DOB wipe is the live instance.
