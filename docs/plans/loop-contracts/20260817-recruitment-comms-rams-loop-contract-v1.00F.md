# Loop Contract — Recruitment-Comms + RAMS Cluster

> **External memory** for the engineered loop completing conduit#225/#221/#227/#229.
> Plan + grounding: `docs/plans/20260618-recruitment-comms-rams-cluster-plan-v1.00A.md`.
> Resumable: any context reads this + the plan, picks the first phase whose status ≠ DONE, runs the Maker→Verifier loop below.

## GOAL (binary, observable, bounded)
All four issues reach **merged-to-`development` + all gates green + live-verified on d.conduit** (and where applicable, promoted to main + prod-verified). `gh issue list` shows #225/#221/#227/#229 with their core scope closed (tails tracked).

## LOOP (per phase)
```
Maker (subagent, worktree)  → implement + run gates + FIX until green + COMMIT + PUSH + report branch
Verifier (separate subagent)→ checkout branch, re-run gates independently + adversarial review → {pass, issues[]}
Orchestrator (me)           → if pass: PR (doctrine blocks + Evidence) → merge → live-verify (BrowserBase d.conduit) → next phase
                              if fail: send issues[] back to a Fix subagent; re-verify (≤2 iterations) else ESCALATE
```
**Maker ≠ Verifier** (separate models/agents). Verifier re-runs `pnpm typecheck && eslint --max-warnings 0 && vitest run && pnpm build` itself — never trusts the maker's self-report.

## STOPPING CONDITIONS (per phase)
- **Success:** typecheck clean · eslint 0 warnings · all new tests pass · `pnpm build` green · (DB) migration floor-gated ≥`20260611000000` + replay-safe + RLS verified live via Supabase MCP `pg_policies` + `get_advisors` triaged · PR merged · d.conduit live-verify captured.
- **Failure/escalate:** verifier fails twice on the same issue · missing credential the edge fn genuinely needs · a decision not covered by the plan/grounding.
- **Budget:** ≤2 fix iterations per phase; escalate to operator rather than loop in circles.

## VERIFIER GATE (the success command)
`cd <worktree> && pnpm typecheck && pnpm exec eslint <changed> --max-warnings 0 && pnpm exec vitest run <new tests> && pnpm build` → all exit 0. Plus: Supabase MCP `pg_policies`/`get_advisors` for DB phases; BrowserBase signed-in d.conduit for UI.

## STATE / BACKLOG
| Phase | Issue | Status | Branch / PR | Notes |
|---|---|---|---|---|
| 1 | #225 core (3-way invite) | **DONE — merged dev** | PR #324 (squashed → dev `13175f8`) | Live-verify on d.conduit pending the dev deploy. Tail (FO portal, auto-assign) = Phase 4. |
| 2 | #221 automation engine | **DONE — merged dev** | PR #325 (squashed → dev `91d1daf`) | Maker→Verifier loop (Verifier PASS, 0 blocking). queue + trigger + conduit's FIRST edge fn + pg_cron. **Prod-apply at promotion** (operator-gated): deploy `r7-automation-processor` (Supabase MCP `deploy_edge_function`) + seed Vault `r7_automation_processor_url`+`_token`. Lesson: dry-lint flags `#NNN` in string literals — [[feedback_dry_lint_hex_in_strings]]. |
| 3a | #227 e-sign reuse | **NEXT** | — | copy crm7 `documentSigner.ts`+`SignDocumentFlow.tsx`+`PdfViewer.tsx` → conduit; `document_records`/`document_signatories`/`document_audit_logs` migration; wire `SignDocumentFlow` into `OfferProgressDialog` → `offerStore.recordSignature()` (exists); record `esign_flow_id`. |
| 3b | #227 billing model | pending | — | `r7_offers.billing_model` = `@bsuite/charge-calc` `BillingModel` (Standard\|ALEX48\|W52\|Custom) + `billable_weeks` for Custom; UI. |
| 3c | #227 RAMS lodgement | pending | — | Copy crm7 `documentSigner.ts`+`SignDocumentFlow.tsx`+`PdfViewer.tsx` → conduit; offer/contract PDF gen; RAMS lodgement via crm7 `ram-token-exchange` (APIM key read from `Deno.env.get('ADMS_APIM_SUBSCRIPTION_KEY')` — EVTE first); `r7_offers.billing_model` = `@bsuite/charge-calc` `BillingModel` (Standard\|ALEX48\|W52\|Custom) + `billable_weeks` for Custom. |
| 4 | #229 pool consent + matcher | pending | — | consent cols on `r7_candidate_pool_memberships` + `r7_candidates.consent_to_pool` (opt-out default); rejection opt-in (via #221); `/portal/talent-community/join`; `r7-talent-pool-matcher` pg_cron edge fn (90-day anti-spam). |
| 4-tail | #225 tail | pending | — | FO portal `/portal/field-officer` (read-only recruitment subset — must NOT read apprentice_placements/monitoring_visits/timesheets, those are crm7#665) + auto-assign FO via #221 auto_actions. |

## GROUNDED CONSTRAINTS (do not re-ask — see plan §4/§4a + `reference_recruitment_cluster_grounding`)
- Email-first; `email-dispatcher` routes by `source` (platform=Resend / user=connected mailbox), NO attachments. SMS = no dispatcher → enqueue+log-skip.
- `calendar-integration` accepts arbitrary `attendees:[{email,name}]` (no role) → zero edge-fn change for 3-way.
- conduit owns NO keys → proxies BSU/crm7 edge fns; secrets via `supabase secrets set --project-ref tuybltdrdefjblnplpqo`; Google→WIF.
- conduit primary = green `oklch(0.45 0.18 142)`; error = electric-purple; semantic tokens only (`bsuite/no-hardcoded-colours` ERRORs). Uplift primitives are stubs → use existing shadcn.
- RLS: live `tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id=(SELECT auth.uid()) AND status='active')` — NOT `r7_current_tenant_id()` (file-only, not in live DB).
- conduit branch-protected: feature PRs → `development`; never push protected branches.

## PR REQUIREMENTS (every phase)
conduit doctrine blocks §1.2 research / §2.2 six-role red-team / §3.2 UX-DX / §6 design-language / §17 cross-app + the `## Evidence` block. `Refs #NNN` (not `Closes`) until the live gate.
