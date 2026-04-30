# BSuite — Documentation Reconciliation Classification (v1.00W)

**Status:** Working (framework + high-priority classifications; deep-pass execution in Phase 1)
**Scope:** Every `.md` file across parent `docs/*` (253 files) + 7 submodule `docs/*` folders (~184 files) + submodule top-level status `.md` files (~37 files). Excludes live references (CLAUDE.md, AGENTS.md, CONTRIBUTING.md, README.md, SECURITY.md, MEMORY_PROTOCOL.md, ACCESSIBILITY_STATEMENT.md, `.boltrules`, `.windsurfrules`) and already-archived files under `docs/archive/`.
**Information-preservation rule:** A doc moves to external archive (`/home/braden/Desktop/Dev/archived-repos-docs/`) only if its content is (a) superseded by a newer retained doc, (b) duplicated in another retained doc, or (c) consolidated into a retained doc. Docs with unique information stay in-repo, moved to `docs/archive/` if no longer active.
**Authority chain after sweep:** `20260227-bsuite-master-roadmap-v5.00W.md` (canonical planning) → `20260501-merged-execution-backlog-v1.00W.md` (active queue) → ADRs 0001-0006 (atomic-replace-and-remove decisions).

---

## Disposition legend

- **KEEP** — active reference, stays at current path.
- **PROMOTE** — active reference, move from nested path to top-level `docs/` with a status bump if warranted.
- **IN-REPO-ARCHIVE** — completed / superseded but unique information; move to `docs/archive/<YYYY-MM-DD-bucket>/`.
- **EXTERNAL-ARCHIVE** — superseded + information preserved elsewhere; move to `/home/braden/Desktop/Dev/archived-repos-docs/<bucket>/`.
- **CONSOLIDATE** — content rolled into an existing retained doc; original removed after consolidation PR.
- **DELETE** — reserved for truly trivial artefacts (e.g. accidentally committed scratch files); requires explicit user approval.
- **🔲 Unclassified** — Phase 1 deep-pass pending.

## High-priority classifications (decided Phase 0)

### Parent `docs/` top-level — handoffs / signoffs / ledgers / roadmaps

| File | Disposition | Rationale |
|---|---|---|
| `20260227-bsuite-master-roadmap-v5.00W.md` | KEEP | Canonical planning source of truth (per `docs/README.md`). Update to cite merged backlog as active queue (P0-15). |
| `20260425-bsuite-finish-line-roadmap-v1.00W.md` | KEEP | Still cited heavily; supersession to merged backlog is annotative (add pointer at top), not physical. |
| `20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md` | KEEP | Cited by AGENTS.md; supersession pointer added to merged backlog. |
| `20260501-merged-execution-backlog-v1.00W.md` (new) | KEEP | New authoritative execution queue. |
| `20260425-operator-handoff-v1.00W.md` | EXTERNAL-ARCHIVE | Superseded by v4.00W; v4 fully contains v1's info. |
| `20260428-operator-handoff-v3.00W.md` | EXTERNAL-ARCHIVE | Superseded by v4.00W. |
| `20260428-operator-handoff-v4.00W.md` | KEEP → amend per ADR-0004 | Current handoff. Amend to remove duplicate OAuth allow-list (ADR-0004). |
| `20260428-codex-operator-handoff-v4.00W.md` | KEEP | Separate audience (Codex-specific). |
| `20260425-finish-line-signoff-v1.00W.md` | EXTERNAL-ARCHIVE | Superseded by v3.00W. |
| `20260427-finish-line-review-signoff-v1.00W.md` | EXTERNAL-ARCHIVE | Mid-version review superseded by v3.00W. |
| `20260428-finish-line-final-signoff-v3.00W.md` | KEEP | Current signoff. |
| `20260427-full-7-execution-ledger-v1.00W.md` | IN-REPO-ARCHIVE | Historical execution record; information unique, no live use. Move to `docs/archive/2026-05-01-phase-0-reconcile/`. |
| `20260428-orphan-branch-cleanup-handoff-v1.00W.md` | KEEP | Active handoff for G-7 (gated item). |
| `OUTSTANDING.md` | REPLACE with new top-level `OUTSTANDING.md` pointing to merged backlog | Existing file becomes supersession pointer once BL-015 lands (Phase 6). Phase 0: annotate only. |
| `README.md` | KEEP → update in Phase 6 | Current index. Rewrite in BL-014 post-cleanup. |

### Parent `docs/plans/` — active plans

| File | Disposition | Rationale |
|---|---|---|
| `docs/plans/README.md` | KEEP | Index for plans directory. |
| `docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md` | KEEP | Referenced by ADR-0001, ADR-0002. |
| `docs/plans/20260422-theme-centralisation-v1.00A.md` | KEEP | Referenced for branding context. |
| `docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md` | KEEP → status re-verify | User noted "Incomplete plans" in session. Check actual completion state in Phase 1; if incomplete despite .00A status, bump to .00W. |
| `docs/plans/20260423-bsuite-production-plan-v1.00W.md` | KEEP | Referenced by ADR-0001 context. |
| `docs/plans/20260425-finish-line-session-refined.md` | IN-REPO-ARCHIVE | Session-specific refined plan from prior prompt-enhancer pass; content consolidated into merged backlog. |
| Other `docs/plans/*.md` (~5-6 files) | 🔲 Phase 1 deep-pass | Per-file classification. |

### Parent `docs/` — role-specific (25+ files)

| File pattern | Default disposition | Rationale |
|---|---|---|
| `20260227-*.md` (~10 files, various A/W status) | Generally KEEP | Foundational architecture/doctrine docs. Individual review. |
| `20260415-roadmap-audit-delta-v1.00W.md` | CONSOLIDATE into merged backlog | Delta content merged; source removed. |
| `20260424-env-var-audit-*.md` | KEEP | Active audit reference. |
| `20260424-oauth-preview-redirect-runbook-v1.00W.md` | EXTERNAL-ARCHIVE per ADR-0004 | Content consolidated into AGENTS.md reference. |
| `20260425-colour-token-audit-v1.00W.md` | KEEP | Active audit reference. |
| `20260425-dry-lint-violations-triage-v1.00W.md` | KEEP → status bump after Phase 4 WS-E.5 | Becomes canonical dry-lint tracker. |
| `20260425-universal-canvas-master-execution-plan-v1.00W.md` | IN-REPO-ARCHIVE post Phase 4 completion | Most items shipped per finish-line roadmap (P1.Q); move to archive when P1-84 clears. |
| `20260425-wave5-red-team-qa-report-v1.00W.md` | IN-REPO-ARCHIVE | Historical wave report. |
| `20260427-theme-0.3.0-yank-narrative-v1.00A.md` | IN-REPO-ARCHIVE | Historical incident record. |
| `20260427-bypass-pr-audit-v1.00W.md` | KEEP | Active audit. |
| `20260427-branch-protection-enforcement-v1.00W.md` | KEEP | Active gated item G-2. |
| `20260427-ownership-map-ratification-v1.00W.md` | KEEP → amend per ADR-0001, ADR-0002 | Ownership map needs post-ADR updates. |
| `20260427-phase0-reconciliation-evidence-v1.00W.md` | IN-REPO-ARCHIVE | Historical Phase 0 (prior) evidence. |
| `20260427-oauth-preview-login-evidence-v1.00W.md` | IN-REPO-ARCHIVE | Historical evidence. |
| `20260427-visual-smoke-completion-v1.00W.md` | IN-REPO-ARCHIVE | Historical completion record. |
| `20260421-auth-hardening-runbook-v1.00A.md` | KEEP | Active auth reference. |
| `20260423-cross-app-write-audit-v1.00W.md` | KEEP → status bump after Phase 4 | WS-E audits supersede parts; retain for history but add pointer to merged backlog. |
| `20260423-misplaced-routes-audit-v1.00W.md` | KEEP | Active audit; items under P1.B. |
| `20260422-typescript-6-migration-evaluation-v1.00W.md` | KEEP | Active evaluation. |

### Parent `docs/adr/` (new, Phase 0 output)

| File | Disposition |
|---|---|
| `ADR-0001..0006.md` (6 files) | KEEP |
| `README.md` (index) | KEEP |

### Parent `docs/testing/` (if populated)

| File | Disposition |
|---|---|
| `20260425-cross-app-e2e-runbook-v1.00W.md` | KEEP |
| Other files | 🔲 Phase 1 deep-pass |

### Parent `docs/archive/` (already archived — verify only)

- **Action:** verify archive organisation; ensure each subdirectory has a README.md explaining the bucket's provenance and cite the authority chain.
- **Files inside:** already archived; no further re-classification.

### Submodule `docs/` folders — by submodule

| Submodule | Doc count | Phase 0 summary decision |
|---|---|---|
| `crm7/docs/` | 107 | Heavy archive-candidate review in Phase 1; many historical AI-phase plans can externalize if completed. `crm7/docs/OUTSTANDING.md` + `crm7/docs/reference/OUTSTANDING.md` consolidation. |
| `business-suite-unified/docs/` | 17 | Low count; Phase 1 per-file classification fast. OUTSTANDING-SYSTEM / OUTSTANDING-PLANS consolidate to single `OUTSTANDING.md` citing merged backlog. |
| `throughput/docs/` | 29 + 16 top-level | UPPERCASE naming convention non-compliance noted in `throughput/docs/OUTSTANDING.md`; Phase 5 BL-009 handles renaming + consolidation. Phase 1 just adds pointers to merged backlog. |
| `R80.3/docs/` | 14 | Small; Phase 1 per-file review fast. Payday Super + training-fees plans remain active per P1.J. |
| `braden/docs/` | 13 | Small; Phase 1 per-file review. Visual editor plans remain active per BL-008. |
| `conduit/docs/` | 4 | Two LIVE-REFERENCE docs (rbac-architecture, theme-system) per `conduit/docs/OUTSTANDING.md`; retain. |
| `mobile/` | 0 | No docs directory. Skip. |

### Submodule top-level `.md` files (status docs, summaries, runbooks)

| Submodule | Files | Notes |
|---|---|---|
| `throughput/` | 16 `.md` files (ACCESSIBILITY_STATEMENT, AUTH_FIX_SUMMARY, CLAUDE, DEPLOYMENT_CHECKLIST, etc.) | Bulk renaming to date-versioned format per BL-009 (Phase 5). Phase 0 keeps in place. |
| Others | 4 each (CLAUDE.md, AGENTS.md, CONTRIBUTING.md, README.md) | Excluded from scope per header. |

## Phase 1 deep-pass protocol

### Scope definition (explicit)

The Phase 1 deep-pass covers **every in-scope `.md` file NOT classified in the high-priority tables above.** Specifically:

- Every `.md` under parent `docs/` not explicitly listed in the high-priority parent tables (estimated: 20-30 files, mostly historical audits + wave reports + runbooks).
- Every `.md` under each submodule's `docs/` folder (estimated: crm7 ~107, BSU ~17, throughput ~29, R80.3 ~14, braden ~13, conduit ~4 = ~184 files total).
- Every `.md` at each submodule's top level NOT excluded by the header (estimated: ~16 throughput UPPERCASE files + scattered others).
- Any `.md` under parent `docs/plans/` not explicitly classified above.
- Any `.md` under parent `docs/testing/` not explicitly classified above.
- Any `.md` under parent `docs/archive/` that lacks a bucket-provenance README (verification pass, not re-classification).

Count estimate for deep-pass: ~220-250 files. Budget 2-3 days of subagent passes (file-picker + read + classify + commit).

### Steps

1. **File-picker enumerate** every in-scope file.
2. **Per-file classification** — open each file, read header/metadata, check for cited-by references in retained docs, classify per disposition legend.
3. **Batch archive moves** — one PR per bucket (e.g. `docs/archive/2026-05-01-phase-0-reconcile/`, `/external/2026-05-01-superseded-handoffs/`). Atomic; `git mv` in same commit as the classification matrix update here.
4. **Matrix fill** — this doc is the live tracker; each archived file gets its entry populated with target path.
5. **Authority-chain amendments** — in the same PR batch, any retained doc that supersedes another gets a header note: "Supersedes: <list>. Merged backlog: `docs/20260501-merged-execution-backlog-v1.00W.md`."

## Consolidation PRs (not just moves)

When a file is CONSOLIDATE rather than ARCHIVE, the PR must show the content rolling into the target doc as an edit, not just a move. Reviewer verifies no information is lost. Source file removed in the same PR.

## Acceptance criteria (classification complete)

1. Every in-scope `.md` classified with a disposition.
2. Archive moves executed; target directories exist and contain README.md explaining bucket provenance.
3. Authority chain amendments live in retained docs.
4. `docs/README.md` rewritten (BL-014, Phase 6) reflecting post-cleanup state.
5. Submodule OUTSTANDING files consolidated (BL-015, Phase 6) — eventually only merged backlog remains as execution queue.

## What this unblocks

- **Clean docs layer** — readers don't have to triangulate across 253 parent + 184 submodule docs to find authoritative current guidance.
- **Phase 6 BL-014 / BL-015** — `docs/README.md` rewrite + OUTSTANDING consolidation depend on this classification being filled.
- **Information-preservation guarantee** — every archived file has a target path with a citation; no loss.
- **AGENTS.md reference accuracy** — future agents reading AGENTS.md can follow cited paths without hitting superseded content.

## Open tasks

- Phase 1 deep-pass × ~474 files. Expected execution: 2-3 days of subagent passes (file-picker + read + classify + commit).
- External archive bucket naming convention: propose `/home/braden/Desktop/Dev/archived-repos-docs/<YYYY-MM-DD-bucket-name>/`. Each bucket gets a README.md citing source.

---

## Revision log

- 2026-05-01 v1.00W — framework + high-priority classifications. Deep-pass in Phase 1.
