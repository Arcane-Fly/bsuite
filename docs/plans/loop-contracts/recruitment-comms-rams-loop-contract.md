# Loop Contract — Recruitment-Comms + RAMS Cluster

> **External memory** for the engineered loop completing conduit#225/#221/#227/#229.
> Plan + grounding: `docs/plans/20260618-recruitment-comms-rams-cluster-plan-v1.00W.md`.
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
| 3a | #227 e-sign reuse | **DONE — merged dev** | PR #326 | crm7 `documentSigner`+flow copied; `r7_document_records`/`r7_document_signatories`/`r7_document_audit_logs` + private `r7-documents` bucket; wired into `OfferProgressDialog`. Verifier PASS. |
| 3b | #227 billing model | **DONE — merged dev** | PR #327 | `r7_offers.billing_model` CHECK (Standard\|ALEX48\|W52\|Custom) + `billable_weeks` 1..52; `@bsuite/charge-calc` dep; PDF gen + signed-URL read. Verifier PASS. |
| 3c | #227 RAMS lodgement | **DONE — merged dev** | PR #328 (→ dev `da339a6`) | Edge fn `r7-lodge-training-contract` (verify_jwt, proxies crm7 `ram-token-exchange` env `evte`, ADMS POST Bearer + `Ocp-Apim-Subscription-Key` via `Deno.env`, 503 if APIM key absent); server action gates on `isFullySigned`; pure `buildAdmsLodgementPayload`+14 tests. Verifier PASS, 0 blocking. **Promotion-gated:** deploy edge fn + set `ADMS_APIM_SUBSCRIPTION_KEY` (the one genuine credential gap) → live EVTE verify. |
| 4a | #229 consent schema + matcher | **DONE — merged dev** | PR #329 (→ dev `929bdd2`) | `20260618160000` migration (consent cols + 90-day clock + partial-unique queue dedup index). Pure `talentPoolMatcher`+20 tests. Edge fn `r7-talent-pool-matcher` (pg_cron→net.http_post + Vault, matches → **`r7_jobs`**). Staff consent UI. **Adversarial Workflow caught 1 BLOCKING** (consent-withdrawal not gated — Privacy-Act opt-out) **+ idempotency + 3 colour-token** issues; all fixed (`9732286`) + re-verified PASS. LESSON: edge fn INLINES the pure matcher (Deno can't import `src/`) → fixes must touch BOTH copies — see [[feedback_edge_fn_inlined_module_dual_fix]]. **Promotion-gated:** deploy `r7-talent-pool-matcher` + seed Vault `r7_talent_pool_matcher_url`/`_token`. |
| 4b | #229 public opt-in | **DONE — merged dev** | PR #330 (→ dev `bf83db1`) | `20260618170000` migration: `r7_talent_pool_consent_tokens` (SHA-256 hash, expiry, single-use) + 2 SECURITY DEFINER RPCs (redeem=anon-only narrow + non-enumerating; mint=authenticated/service_role, internal authz). Public `src/app/portal/talent-community/join` page; middleware opens ONLY that path. Rejection auto-action mints token + enqueues opt-in email (skips already-consented/withdrawn). **Adversarial Workflow caught 1 BLOCKING** (useSearchParams without `<Suspense>` → Next 16 build failure) **+ 1 HIGH** (processor re-queued after successful send + failed audit insert → up to 3 duplicate emails); both fixed + the recurring [[feedback_dry_lint_hex_in_strings]] `#229`-in-string. CI green. **Promotion: migration only (no edge-fn deploy, no new secret).** |
| 4-tail | #225 tail | **DONE — merged dev** | PR #331 (→ dev `32c46e4`) | Read-only FO portal `/portal/field-officer` (auth-gated; queries r7_interviews + r7_pipeline_entries; ZERO placements/monitoring/timesheets refs — crm7#665 boundary respected) + nav link. Auto-assign FO via #221: pure `pickFieldOfficerForRegion`+17 tests, inlined in processor (dual-copy verified), idempotent (`.is field_officer_id null`). Adversarial Workflow PASS, 0 findings. CI green. Follow-up: no user→field_officer identity link in schema → tenant-scoped per-FO selector, not per-user auto-view. |

## STATUS 2026-06-23 — BUILD COMPLETE

All 5 issues (#225 core+tail, #221, #227 3a/3b/3c, #229 4a/4b) are **built, dual-verified (terminal gates + adversarial Workflow), CI-green, merged to `development`**. PRs #324/#325/#326/#327/#328/#329/#330/#331. Three adversarial Workflows caught real defects before prod: a BLOCKING Privacy-Act consent-withdrawal gap (#229 4a), a BLOCKING Next-16 Suspense build error + a duplicate-email path (#229 4b). Remaining = the **promotion phase** (operator-gated, see below) — the GOAL's "promoted to main + prod-verified" clause.

### PROMOTION RUNBOOK (operator-gated)
1. **Schema apply** — the floor-gated migrations (`20260618160000` consent+matcher index, `20260618170000` consent tokens, plus the earlier `20260618130000/140000/150000` from #221/#227) apply via `supabase-migrate.yml` at conduit promotion to `main` (or a targeted dispatch). All expand-only/replay-safe; advisors to be run post-apply (§12.1.3).
2. **Edge-fn deploys** (Supabase MCP `deploy_edge_function`, project `tuybltdrdefjblnplpqo`): `r7-automation-processor` (#221), `r7-lodge-training-contract` (#227), `r7-talent-pool-matcher` (#229).
3. **Vault secrets** (`vault.create_secret`): `r7_automation_processor_url`+`_token`, `r7_talent_pool_matcher_url`+`_token` (the pg_cron jobs fail-fast until seeded).
4. **`ADMS_APIM_SUBSCRIPTION_KEY`** — the ONE genuine external credential gap (NOT in `.env.local`). `r7-lodge-training-contract` returns `503 adms_apim_key_missing` until set; everything else works without it.
5. **Live-verify** — signed-in d.conduit/prod session (creds `braden.lang77@gmail.com`) through the new surfaces: consent UI, `/portal/talent-community/join` token redemption, `/portal/field-officer`. §12.3 deployed evidence = issue-close gate.

## GROUNDED CONSTRAINTS (do not re-ask — see plan §4/§4a + `reference_recruitment_cluster_grounding`)
- Email-first; `email-dispatcher` routes by `source` (platform=Resend / user=connected mailbox), NO attachments. SMS = no dispatcher → enqueue+log-skip.
- `calendar-integration` accepts arbitrary `attendees:[{email,name}]` (no role) → zero edge-fn change for 3-way.
- conduit owns NO keys → proxies BSU/crm7 edge fns; secrets via `supabase secrets set --project-ref tuybltdrdefjblnplpqo`; Google→WIF.
- conduit primary = green `oklch(0.45 0.18 142)`; error = electric-purple; semantic tokens only (`bsuite/no-hardcoded-colours` ERRORs). Uplift primitives are stubs → use existing shadcn.
- RLS: live `tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id=(SELECT auth.uid()) AND status='active')` — NOT `r7_current_tenant_id()` (file-only, not in live DB).
- conduit branch-protected: feature PRs → `development`; never push protected branches.

## PR REQUIREMENTS (every phase)
conduit doctrine blocks §1.2 research / §2.2 six-role red-team / §3.2 UX-DX / §6 design-language / §17 cross-app + the `## Evidence` block. `Refs #NNN` (not `Closes`) until the live gate.
