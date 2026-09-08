# Kick off bsuite#2054: [G-6 impl] Xero Payroll AU STP V1 — build the path ratified in the 2026-05-19 ADR (the ticket promised but never filed)

Implement and verify https://github.com/GaryOcean428/bsuite/issues/2054. This is one bounded issue, not a launch of the whole backlog. Re-read live issue/PR state and source; if resolved, validate and reconcile evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, skills and paired agents

Repository: /home/braden/Desktop/Dev/bsuite/. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, BSuite truth index bsuite_project_truth_index and memory bsuite_objective_lock_20260908_remediation_audit. This prompt commissions this implementation; the audit did not implement the product.

Invoke **agent-run-master first**, then **agent-skl-find** to resolve named skills/tools from /home/braden/.agents. Slash commands work when exposed by the client; otherwise name the skill and read its SKILL.md. Record actual use. Dedicated applicable skills take precedence over generic agents.

- **agent-run-master** — /agent-run-master where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-run-master/SKILL.md.
- **agent-skl-find** — /agent-skl-find where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-skl-find/SKILL.md.
- **agent-mem-truth** — /agent-mem-truth where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-mem-truth/SKILL.md.
- **agent-definition-of-done** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/agent-definition-of-done/SKILL.md.
- **bsuite-false-complete-gates** — /bsuite-false-complete-gates where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md.
- **test-verify-before-completion** — /test-verify-before-completion where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-verify-before-completion/SKILL.md.
- **biz-au-award-boot** — /biz-au-award-boot where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/biz-au-award-boot/SKILL.md.
- **bsuite-data-reconciliation** — /bsuite-data-reconciliation where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-data-reconciliation/SKILL.md.
- **check-feature-parity** — /check-feature-parity where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/check-feature-parity/SKILL.md.
- **test-qa-and-verification** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/test-qa-and-verification/SKILL.md.

- **bsuite-platform** — load /home/braden/.agents/agents/bsuite-platform.md; use its applicable role and skills. Review evidence independently of the implementer.
- **bsuite-user-advocate** — load /home/braden/.agents/agents/bsuite-user-advocate.md; use its applicable role and skills. Review evidence independently of the implementer.

Claude Code is the default driver. Grok CLI **grok-4.6** is an operator-approved general-purpose implementation, research or review option. Codex CLI **gpt-6-astra** is the requested escalation for architectural decisions, a bug surviving two grounded fixes, or difficult independent review. A stale skill prohibition on Codex dispatch does not override Braden's explicit request. Pass verified model IDs. Preserve unrelated global model/agent configuration; task-derived skill corrections follow the required evolution contract below.

Use at most two active lanes by default, one writer per repository/worktree. Coordinate a single owner for shared migrations and package publication. The parent owns failed children and recovery after context/usage limits. Do not have two models edit the same checkout.

## Product standard and documentation

Read /home/braden/Desktop/Dev/bsuite/docs/20260908-customization-capability-register-v1.00W.md and /home/braden/Desktop/Dev/bsuite/docs/plans/20260908-estate-remediation-plan-v1.00W.md, then their mapped existing specifications. All customization features belong in docs/, with implementation plans in docs/plans/. Improve the applicable existing documents in the same delivery: user controls/defaults, canonical data/permissions, save/version behavior, workflow connections, worked examples and evidence. Preserve dated history and mark supersession; do not fork an unlinked plan or revive the retired dashboard.

Anything achievable through product code must be visually achievable under appropriate authority, all linked through executable workflows. Record of Discussion is a formal disciplinary discussion, separate from training-contract variation. Hardcoded forms, an inert canvas, filename-only attachment, or API-only functionality do not satisfy this requirement. Reuse canonical services and capable existing builders; no competing engine or weakened permission checks.

## Execution and issue-specific acceptance

1. Re-read the issue and recent linked PRs; resolve every cited path against current source. Distinguish operator report, historical assertion, source finding and reproduced defect. Credit working limbs.
2. Find the feature/documentation rows and canonical upstream owner. Enumerate sibling routes, dialogs, widgets, handlers and consumers using independent axes; state blind spots. Parent programme membership is not a blocking dependency on its own completion.
3. Before library/runtime edits run Gate A: exact installed-version Context7 guidance, research-best-practice, installed-source confirmation. Resolve routine details from evidence/precedent; do not re-ask settled preferences.
4. Implement the shared cause and failure paths together with consumers. Remove only superseded code in the authorized change. Never delete a feature, bypass authority, fabricate data or disable a test to pass.
5. **Specific verification focus:** Recover the exact authoritative domain rule and owner; check current official sources where needed. Exercise boundary and negative cases and save/reload through real consumers. No invented financial data.
6. Fulfil every current acceptance criterion below. For user-facing work exercise the actual deployed d.* journey on its exact deployed SHA with the intended role, save/reload and downstream IDs. Test failure/retry, denied permissions, keyboard and responsive use. Count siblings and intent-to-result actions. Ask literally whether finishing requires leaving the page; prefer inline creation or prove automatic lossless return with the new detail applied.
7. Use signed commits and PRs through development; never direct-push main. Verify actual published package/consumer versions and live schema where applicable. Follow current deployment and bot-review gates. Do not expand scope to production data cleanup, real disciplinary decisions or external messages without authorization.
8. Update the same issue and applicable docs with final SHA, routes/roles, exact tests/output, screenshots, saved/run IDs and failure/consumer evidence. Run agent-definition-of-done and bsuite-false-complete-gates; explicitly declare UI impact. Missing runtime evidence is a precise remaining blocker, never a done claim. Parent owns recovery.

## Escalation packet for Grok or Astra

Carry this prompt plus isolated worktree/repo/branch; exact HEAD and dirty status; issue/specification links; reproduced trigger; exact error/output; current relevant paths; attempted fixes and why they failed; tests run; canonical owner/schema evidence; preserved drafts/data; remaining acceptance criteria; and one precise decision to resolve. Stop the prior writer first. Review model output and diffs before accepting; a model verdict does not authorize merge.

## Mandatory release, operational closeout and skill evolution — contract v2

**The destination is production through development, then verified operational closeout.** Launching this implementation prompt carries Braden's direction to complete that sequence for this issue and its affected consumers; do not stop at a development merge or re-ask the already specified destination. This does not authorize unrelated releases, destructive production-data changes, genuine disciplinary decisions or messages to third parties. A real policy/access/approval blocker stops the affected transition and is reported precisely; it is never waived by this text.

### Execute this skill chain

Invoke agent-run-master → agent-mem-truth → agent-skl-find → **ops-open-run** with feature scope and the BSuite profile; record the opening done-contract, issue, owned repositories, affected consumers, skill/MCP/CLI routing and UI impact before edits. Use the dedicated implementation/research/red-team/testing skills matched to the issue. Re-inventory on task-class/module/tool changes.

Then invoke **ops-ship-close-out** as the closeout orchestrator with that same feature scope and done-contract. Its release work invokes **bsuite-ship-visual-promote** and **ops-ship-all-apps** for the affected multi-app/package-consumer release. For a genuinely single-app change, explicitly load ops-ship-all-apps, record its scoped applicability decision, and use bsuite-ship-visual-promote as the single-change driver; do not mass-ship unrelated dirty apps to satisfy a skill name. Never recursively restart completed macro phases.

Load these exact canonical definitions through agent-skl-find: /home/braden/.agents/skills/ops-open-run/SKILL.md; /home/braden/.agents/skills/ops-ship-all-apps/SKILL.md; /home/braden/.agents/skills/ops-ship-close-out/SKILL.md; /home/braden/.agents/skills/bsuite-ship-visual-promote/SKILL.md; /home/braden/.agents/skills/git-github-issue-closeout/SKILL.md; /home/braden/.agents/skills/agent-definition-of-done/SKILL.md; /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md. Use slash commands only where actually exposed and user-invocable; otherwise name/read/execute the skill.

**chains_with and related_skills are discovery metadata, not executed chains.** Explicitly invoke the required macro/micro-skills and record receipts: skill name, phase, inputs, relevant tools, evidence path, verdict and next consumer. Missing Skill-tool support means directly follow the canonical procedure and record that mechanism, not pretend a tool was called. Missing MCP/auth/model capacity requires a verified equivalent or a specific blocker, not skipped coverage.

### Release states — this order overrides conflicting older examples

1. **PREPARED:** confirm current main/development state and protected-branch rules; preserve production-only work, live lanes and dirty changes. Derive apps from current .gitmodules, identify all affected consumers, and own an isolated development-based feature worktree. Use signed commits; verify signatures across the introduced range, not only the signed merge HEAD. Complete applicable build/lint/type/test, schema/policy, package and adversarial checks. Identify operational dependencies, monitoring and a credible rollback path.
2. **DEVELOPMENT_MERGED:** update the feature branch against its target, resolve actionable human/bot review comments on the final code, pass required checks and merge its PR into development. Use gh pr merge --merge; never --squash, --admin, or --delete-branch on a long-lived branch. Feature → main is forbidden. No direct pushes to protected long-lived branches.
3. **DEVELOPMENT_VERIFIED:** wait for each affected development deployment and match its live SHA to the merge being tested. Resolve actual deployment/project mappings even if local Vercel metadata is missing. Perform authenticated d.* visual/functional verification as the intended roles: both themes, four responsive widths, appropriate tenant/delegation contexts, full create/save/reload/workflow effects, negative authority and failure/retry. Use bsuite-ship-visual-promote and bsuite-false-complete-gates. FAIL, UNKNOWN or INCOMPLETE blocks promotion. Agent-performed evidence is required; never hand the visual test back to Braden. If the tested code/target changes, re-evaluate affected evidence.
4. **PRODUCTION_PROMOTED:** only after development verification, open development → main (or established master) PRs for the owned release. Review the full promotion diff so unrelated unfinished work is not swept in. Update against the target and resolve actionable reviews/checks before each merge; a changed SHA requires fresh relevant validation. Merge commits only, no bypass, no direct production push.
5. **PRODUCTION_VERIFIED:** wait for actual production readiness, verify exact deployed SHA, runtime logs/health, critical user journeys and affected integrations/queues/schedules. Prove schema intent, deployed functions, secrets/config references, published package contents and resolved consumer lockfiles where applicable. A migration ledger, npm export, green build or provider READY alone is insufficient. Use the authorized rollback/recovery path on failure, then re-verify; do not claim done after rollback leaves the issue unresolved.
6. **CLOSED_OUT:** finish ops-ship-close-out correctness, architecture, experience, currency, records, owned-artifact disposal and convergence. Run git-github-issue-closeout; reconcile GitHub issues/PRs, docs/plans, feature/component registries and actual deployment evidence. An issue automatically closed on development merge does not prove production completion: preserve the release evidence/remaining status on the issue or owning programme until production is verified. Use established set-dod-status only after gate APPROVE; never mass-approve untested rows. Compare development/main contents and both log directions: content-identical promotion merge-commit debt is not a reason for endless back-merges. Reconcile genuine divergent changes through protected PRs. Clean only owned, proven-merged, inactive feature branches/worktrees; preserve live/unrelated work and both long-lived branches. Do not rewind gitlinks.

### DoD receipts and final verdict

Run **agent-definition-of-done** and **bsuite-false-complete-gates**, with the skill-owned verifiers and fresh evidence. D1–D7 always; explicitly declare ui_touched and evaluate every applicable D8 limb, including current sibling denominator, real entry/wiring, clarity, powerful common path, lossless round trip, better alternative and action count. D9 requires actual authorized use/consumer resolution/engine run as applicable, with query/results; D10 requires owned temporary-artifact inventory and deletion evidence. Do not invent non-demo production transactions to pass D9.

Pre-promotion readiness is not final completion: production-dependent D9 can only finish after the production state exists. Do not demand a final production-use APPROVE before allowing an otherwise validated promotion, and do not call readiness APPROVE for the whole issue. Final ops-ship-close-out verdict comes from gate_report.py with all required evidence and clean child verdicts. SEND_BACK stays parent-owned with the exact failed gate, retained work and next recovery action. No “done”, “shipped” or issue-scope closure claim before final APPROVE and production proof.

### Skill interoperability and evolution are required work

At start and each major phase, load bsuite_skill_mcp_pairings and /home/braden/.agents/skills/_shared/skill-mcp-pairings.json; route with ops-open-run's route.mjs plan and verify actual connected tools, installed skills, agent paths and model IDs. Map each handoff's producer/output/consumer and acceptance gate; do not rely on chaining beyond the client's stacking limit or on non-user-invocable slash expansion. Keep high-impact actions serial and at most two active lanes by default.

For each missing capability, bad trigger, conflicting instruction, broken pairing or repeat failure uncovered, record the concrete example and improve the appropriate canonical layer in the same task: deterministic check first; shared script/reference next; SKILL.md judgment only when neither suffices. Update relevant related_skills/chains_with/suggested_agents or routing pairings when supported by evidence; do not create a second skill copy or weaken the gate. Read the hub's instructions/protection policy before editing global skills; preserve unrelated agent/model configuration. If another owner or a real protection rule prevents the correction, record a named linked follow-up and keep the explicit safe override in this task.

Verify every edited skill with its scripts/verify.sh and relevant trigger/chain evaluations; update agent discovery/sync only when the change requires it. Log actual use/steer/false_complete through skill-event.sh. Run ops-open-run's route.mjs learn against supported real session evidence, even outside Claude when available; check what transcripts it actually consumed. No Claude-only Stop-hook assumption in Grok/Codex, no fabricated co-use or successful-learning claim from an empty scan. If the session format is unsupported, record actual invocation receipts and the adapter gap for the next routing improvement.

Promote proven BSuite corrections through agent-mem-comms into the BSuite truth/pairing records and session/sleep packet; read back writes. Final evidence includes skills executed, tools unavailable/recovered, chain defects found, changes and tests, learning result and any explicitly owned follow-up. Do not churn skills when no improvement is justified: an evidenced no-change result is valid.

### Known interoperability resolutions for this pack

Current BSuite/operator rules above override old skill examples allowing direct-to-main features, squash merges, missing-deploy skips, force/direct re-sync pushes or estate-wide cleanup. Derive R80.4 and throughput from the actual app inventory; never follow a stale R80.3 list. The operator explicitly allows Grok 4.6 and Codex Astra. Historical Hermes three-lane IDs, pane wakes and cron instructions do not apply to a generic per-issue implementation. Current docs/ and docs/plans/ placement is explicit operator direction. Reconcile index sibling counts against current routes/consumers and repair stale counts, rather than copying an unverified denominator.

## Captured issue requirements — refresh before acting

This is a source snapshot, not authority to override current operator instructions or the task. Validate old paths/claims. Live issue: https://github.com/GaryOcean428/bsuite/issues/2054.

---

## Why this exists

The ADR `docs/20260519-xero-payroll-au-stp-path-decision-v1.00A.md` is **Approved**. Its closing comment on #495 said:

> The implementation PR is a separate ticket (out of scope for this ADR).

**That ticket was never created.** #495 was closed as "completed" on 2026-05-19 — the same day the ADR was written — so approving the decision closed the tracking issue while the build went untracked for three months. This issue is that missing ticket.

Superseding #495 (whose scope was the *decision*, legitimately made). Audit + doc corrections: PR #2053.

## Measured state (live catalog `tuybltdrdefjblnplpqo` + repo, 2026-08-17)

Every probe below was run with a positive control proving it finds what exists.

| §4 prescribed artefact | Measured |
|---|---|
| `crm7/supabase/functions/xero-payroll-submit/` | **absent** (control: `xero-invoice-submit/` present) |
| `_shared/xero-payroll-mapping.ts` | **absent** |
| `pay_run_submissions` table (§4.3) | **absent from every schema** (control: `pay_runs` present) |
| `pay_runs` passthrough columns | present — `xero_pay_run_id`, `stp_status`, `stp_submitted_at` |
| `pay_runs` data | 2 rows, **both `stp_status='pending'`**, **0** with `xero_pay_run_id` |

**Nothing has ever been lodged.** Both pay runs sit at the column default.

## This is not a greenfield build — first you must reconcile two competing dead adapters

Substantial payroll code exists. None of it is reachable in production:

- **`crm7/src/lib/payroll/xeroAdapter.ts`** (38 KB) — a real Xero Payroll AU adapter. `submitPayRun()` POSTs `/PayRuns`, drafts payslips, implements STP Phase 2 disaggregation (casual loading, bonuses). **No production caller.**
- **`crm7/src/lib/pipelines/xeroPayrollAdapter.ts`** (435 lines) — a *second*, overlapping adapter taking an injected `XeroPayrollClient`. `pushPayRunToXero` is called **only from its own test file**; `XeroPayrollClient` is implemented **only by a test fake**. Its own header comment acknowledges the sibling.
- **`crm7/src/pages/payroll/index.tsx`** imports only `eofyFinalisation` + `stpEofyStatus` — status display, **no submission path**.
- **`crm7/src/lib/payroll/providerCredentials.ts`** supports `'myob' | 'astute'` **only — Xero is not a supported payroll credential provider.**

**Decide which adapter survives before writing anything new.** Shipping a third implementation alongside two dead ones is the failure mode to avoid.

## The ADR's own safety argument rests on tables that do not exist

§3.5 justifies the design as safe because *"BSuite retains the canonical `pay_runs` / `pay_run_lines` audit trail"*, with rationale written to `pay_audit_events`.

**`pay_run_lines` and `pay_audit_events` do not exist in any schema.**

Consequences:
- The stated Xero-outage fallback (BSuite-side data survives; re-submission is straightforward) is currently unfounded.
- §4.4's acceptance criterion — Xero YTD totals reconciled **to the cent** against `pay_run_lines` — **is not executable**. The table it reconciles against is absent.

Either these tables are part of this build, or §3.5/§4.4 need a ratified replacement. Do not declare the acceptance criterion met against a table you created solely to satisfy it without operator sign-off on the shape.

## Compliance framing — precise, not inflated

STP is an ATO **on-or-before-payday** reporting obligation, so an Approved-but-unbuilt lodgement path is a compliance matter, not tidiness. Measured honestly:

- **NOT a live breach today.** Pilot scale only — 7 tenants, 34 placements, 14 timesheets, 2 pay runs, 0 funding claims. No employer currently relies on BSuite to lodge STP, so no deadline is being missed.
- **IS an absolute go-live gate.** The moment one real employer runs one real pay run through BSuite, an ATO obligation attaches immediately with no lodgement path, no credential provider, and no audit trail. There is no partial-credit position: a pay event is either reported on time or it is not.

**Therefore: do not enable BSuite payroll for any production tenant until this ships or a replacement is ratified.**

## Scope (from ADR §4.5)

1. Reconcile the two adapters — pick one, delete the other (no dual-path interim state).
2. Migration: `pay_run_submissions` per §4.3, plus a ruling on `pay_run_lines` / `pay_audit_events`.
3. Pure mapping helpers + vitest unit tests.
4. Edge function `xero-payroll-submit` on the proven `xero-invoice-submit` pattern (vaulted tokens, refresh-on-expire, idempotent batches, per-user rate limit, generic error responses).
5. Xero payroll credential path (`providerCredentials.ts` currently excludes Xero).
6. Client wiring: submit action + TanStack Query mutation + filing-status polling.
7. Docs + dashboard row.

**Migration authoring note:** floor `20260611000000`; re-check version collisions against `origin/development` **and every open PR branch** immediately before committing — the check goes stale in about an hour. Any new public function reaches `anon` by two routes (this DB's `ALTER DEFAULT PRIVILEGES` and Postgres's built-in `EXECUTE TO PUBLIC`), so issue **both** `REVOKE ALL … FROM PUBLIC` and `REVOKE ALL … FROM anon`, then `GRANT`, then assert the ACL back in a `DO` block that `RAISE`s.

## Still-open operator questions (unanswered since 2026-05-19)

1. **ADR §6.1 / V3+** — commit to a long-term Direct-STP (Option A) roadmap, or treat passthrough as permanent?
2. **ADR §6.2** — confirm the V2 trigger thresholds (10 tenants / 3 outages / regulatory signal) before they become operational metrics.
3. **ADR §6.3** — tenant-facing positioning: name Xero explicitly, or stay provider-opaque?

## Acceptance criteria

- One adapter, one path. No `@deprecated` markers, no dual-path interim state.
- A pay run posts to Xero and returns a real filing status; `pay_runs.xero_pay_run_id` populated and `stp_status` advances off `pending`.
- §4.4 output-equivalence proven against a real reconciliation target, or a ratified replacement criterion.
- Lint, typecheck, tests, build green on `development`; PR cites this issue with verification evidence.

