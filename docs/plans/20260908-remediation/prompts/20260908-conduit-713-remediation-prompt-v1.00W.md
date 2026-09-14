---
kind: plan
authority: engineering
owner: bsuite
evidence:
  - scripts/check-plan-currency-markers.mjs
  - scripts/check-doc-classification.mjs
---

> **Current as of 2026-09-14:** This is an active engineering plan. Refresh its live issue and evidence before execution; this marker does not assert implementation or release completion.

# Kick off conduit#713: supabase/migrations/ does not describe live RLS on r7_candidates or r7_automation_queue — r7_current_tenant_id() doesn't exist in prod

Implement and verify https://github.com/GaryOcean428/conduit/issues/713. This is one bounded issue in the existing canonical BSuite programme, not a launch of the whole backlog and not a replacement backlog. Re-read live issue/PR state and source; if a limb is already resolved, validate and reconcile exact evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, ownership, skills and paired tools

Repository: /home/braden/Desktop/Dev/bsuite/conduit. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, the BSuite truth index `bsuite_project_truth_index`, the current 370-row ledger, preserving the original 340 rows, and the 40-group feedback reconciliation. Objective lock: Preserve all BSuite work, consolidate safely through development then main, and reconcile and execute the existing canonical ledger plus 40 feedback groups without a replacement backlog.

Canonical dispatch owner: `codex-bsuite-closeout-01a09d84`. This row starts `pending`; implementation is unassigned until that owner claims it. Do not launch a duplicate writer. Dependencies/related rows: none recorded; refresh live blockers before dispatch. Feedback groups mapped by this reconciliation: 07. Feature-index and feedback-group counts remain separate denominators from issue rows.

Invoke **agent-run-master first**, then **agent-mem-truth** and **agent-skl-find**. Load and follow the dedicated applicable skills below from `/home/braden/.agents/skills`; record actual invocation receipts and currently available MCP/CLI routes. Current operator routing overrides stale prompt-era model assumptions.

- **agent-run-master** — load `/home/braden/.agents/skills/agent-run-master/SKILL.md` and apply only its relevant scope.
- **agent-mem-truth** — load `/home/braden/.agents/skills/agent-mem-truth/SKILL.md` and apply only its relevant scope.
- **agent-skl-find** — load `/home/braden/.agents/skills/agent-skl-find/SKILL.md` and apply only its relevant scope.
- **plan-roadmapping** — load `/home/braden/.agents/skills/plan-roadmapping/SKILL.md` and apply only its relevant scope.
- **git-github-issues** — load `/home/braden/.agents/skills/git-github-issues/SKILL.md` and apply only its relevant scope.
- **bsuite-supabase-migrations** — load `/home/braden/.agents/skills/bsuite-supabase-migrations/SKILL.md` and apply only its relevant scope.
- **bsuite-rls-authz-red-team** — load `/home/braden/.agents/skills/bsuite-rls-authz-red-team/SKILL.md` and apply only its relevant scope.
- **check-security** — load `/home/braden/.agents/skills/check-security/SKILL.md` and apply only its relevant scope.
- **agent-definition-of-done** — load `/home/braden/.agents/skills/agent-definition-of-done/SKILL.md` and apply only its relevant scope.
- **bsuite-false-complete-gates** — load `/home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md` and apply only its relevant scope.

Use at most two active implementation lanes estate-wide and one writer per repository/worktree. Reviewers remain read-only. Preserve accepted exact-SHA evidence, current production holds, client data, migration history, and unresolved failure paths.

## Issue-specific acceptance

1. Create a forward migration whose policies reproduce the measured live r7_candidates and r7_automation_queue catalog exactly, or execute an explicit operator-approved convergence alternative.
2. Triaging all remaining r7_current_tenant_id references and the stray anon grant is required evidence.
3. Re-query the live catalog after apply; a migration file alone cannot close the issue.

Re-read the full live issue body below before implementation. Treat historical SHAs, paths, counts, screenshots, live-schema claims, and model statements as evidence to refresh, not as current truth. Resolve cited paths and verify live catalog/runtime state where the issue requires it. Credit working limbs and keep missing evidence explicit.

For any user-facing or page-consumed change, declare `ui_touched`, enumerate sibling surfaces by more than one axis, and perform the deployed exact-SHA D8 journey with the intended role, save/reload, negative authority, failure/retry, responsive widths, both themes, and a lossless return. For infrastructure, CI, security, or migration work, use positive controls that prove the guard bites and verify the actual consumer/runtime result.

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

Run the verifier documented in each edited skill's SKILL.md and the relevant trigger/chain evaluations; update agent discovery/sync only when the change requires it. Log actual use/steer/false_complete through skill-event.sh. Run ops-open-run's route.mjs learn against supported real session evidence, even outside Claude when available; check what transcripts it actually consumed. No Claude-only Stop-hook assumption in Grok/Codex, no fabricated co-use or successful-learning claim from an empty scan. If the session format is unsupported, record actual invocation receipts and the adapter gap for the next routing improvement.

Promote proven BSuite corrections through agent-mem-comms into the BSuite truth/pairing records and session/sleep packet; read back writes. Final evidence includes skills executed, tools unavailable/recovered, chain defects found, changes and tests, learning result and any explicitly owned follow-up. Do not churn skills when no improvement is justified: an evidenced no-change result is valid.

### Known interoperability resolutions for this pack

Current BSuite/operator rules above override old skill examples allowing direct-to-main features, squash merges, missing-deploy skips, force/direct re-sync pushes or estate-wide cleanup. Derive R80.4 and throughput from the actual app inventory; never follow a stale R80.3 list. The current operator-scoped native Codex team may use its approved tiered models; the September11 supervisor reserve prohibits external Codex CLI workers. Claude is unavailable. Verify Grok/Gemini/Qwen access and exact model IDs before use, with no silent paid fallback. Use scripts for mechanical work and cap two active workers by default. Historical Hermes three-lane IDs, pane wakes and cron instructions do not apply to a generic per-issue implementation. Current docs/ and docs/plans/ placement is explicit operator direction. Reconcile index sibling counts against current routes/consumers and repair stale counts, rather than copying an unverified denominator.

## Captured issue requirements — refresh before acting

This is the live GitHub issue body captured during the 2026-09-14 records reconciliation. It does not override later operator instructions or current repository rules. Live issue: https://github.com/GaryOcean428/conduit/issues/713. Captured GitHub updatedAt: 2026-09-11T01:21:25Z.

---

Follow-up to two independent checks of PR #707 (`codex/candidates-editable-grid`, `ebf1debc`, worktree `~/tmp/conduit-candidates-grid`). Both claims below were settled against the **live** production database (Supabase project `tuybltdrdefjblnplpqo`) with read-only `execute_sql` — `pg_proc`/`pg_policy`/`information_schema` queried directly, never inferred from an RPC exit code (an RLS-denied UPDATE/DELETE is silent and returns zero rows; only reading the catalog is trustworthy).

## Claim 1 — opt-in RPC: RETRACTED (function is not live)

`supabase/migrations/20260909230000_r7_enqueue_rejection_optin_email_rpc.sql` defines `public.r7_enqueue_rejection_optin_email(uuid)` as `SECURITY DEFINER` with `GRANT EXECUTE ... TO authenticated`, but the file's own header says `-- ── DRAFTED ONLY — NOT APPLIED to any environment ───`.

```sql
SELECT n.nspname, p.proname, p.prosecdef, pg_get_function_identity_arguments(p.oid), p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'r7_enqueue_rejection_optin_email';
-- → []  (zero rows)

SELECT grantee, privilege_type FROM information_schema.routine_privileges
WHERE routine_name = 'r7_enqueue_rejection_optin_email';
-- → []  (zero rows)
```

**Verdict: the function does not exist in production.** The header is accurate. Nobody holds EXECUTE on it because it doesn't exist to hold EXECUTE on. This is a good outcome and needs no fix — noted only because the acceptance criteria below require it stated either way.

## Claim 2 — CONFIRMED, and the drift is larger than stated

The original claim was "`r7_current_tenant_id()` does not exist in production, and three of the four live RLS policies on `r7_candidates` have no counterpart in `supabase/migrations/`." Measured result: **`r7_current_tenant_id()` does not exist live** (confirmed), and it is **four of four**, not three of four. The migrations directory does not describe the deployed schema for these two tables.

### 2a. `r7_current_tenant_id()` — does not exist, in any schema

```sql
SELECT n.nspname, p.proname, p.prosecdef, pg_get_function_identity_arguments(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'r7_current_tenant_id';
-- → []  (zero rows, no schema filter)
```

It was created by `20260304040000_add_rls_to_r7_tables.sql` (`SECURITY DEFINER`, used via dynamic `format()` in a single `FOR ALL` policy named `<table>_tenant_isolation` for 16 `r7_*` tables including `r7_candidates`), and patched for `search_path` by `20260504010000_fix_r7_current_tenant_id_search_path.sql`. It is still referenced by name in **10** migration files' policy predicates. Whether those other 9 tables' live policies still call a function that no longer exists — which would mean their RLS silently errors on every row access — is **UNVERIFIED**; this issue's live queries covered only `r7_candidates` and `r7_automation_queue`.

### 2b. `public.r7_candidates` — all 4 live policies, verbatim

```sql
SELECT pol.polname, pol.polcmd, pol.polroles::regrole[],
       pg_get_expr(pol.polqual, pol.polrelid), pg_get_expr(pol.polwithcheck, pol.polrelid)
FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'r7_candidates';
```

| polname | cmd | roles | USING | WITH CHECK |
|---|---|---|---|---|
| `r7_candidates_select` | SELECT | `{authenticated}` | `(tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE ((user_tenants.user_id = (SELECT auth.uid())) AND (user_tenants.status = 'active'::text)))) OR (id = r7_candidate_id_for_auth_user()) OR is_platform_developer()` | — |
| `r7_candidates_tenant_delete` | DELETE | `{authenticated}` | `tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE ((user_tenants.user_id = (SELECT auth.uid())) AND (user_tenants.status = 'active'::text)))` | — |
| `r7_candidates_tenant_insert` | INSERT | `{authenticated}` | — | `tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE ((user_tenants.user_id = (SELECT auth.uid())) AND (user_tenants.status = 'active'::text)))` |
| `r7_candidates_tenant_update` | UPDATE | `{authenticated}` | `(tenant_id IN (...)) OR is_platform_developer()` | same as USING |

`relrowsecurity = true`, `relforcerowsecurity = false`. `is_platform_developer()` and `r7_candidate_id_for_auth_user()` both exist live (`SECURITY DEFINER`) — the live policies are functionally coherent, just untracked.

### 2c. `public.r7_automation_queue` — 1 live policy + grants

```sql
-- policy
r7_automation_queue_tenant_select | SELECT | {authenticated}
USING: (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants
        WHERE ((user_tenants.user_id = (SELECT auth.uid())) AND (user_tenants.status = 'active'::text))))
        OR is_platform_developer()

-- information_schema.role_table_grants
authenticated: SELECT
postgres, service_role: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- (no INSERT/UPDATE/DELETE grant to authenticated, no grant to anon — matches migration's explicit REVOKEs)
```

### 2d. Drift count, both directions, with method

**Live → migrations** (`grep -rli "<exact live polname>" supabase/migrations/*.sql`, worktree `/home/braden/tmp/conduit-candidates-grid`):

| live policy | files matched |
|---|---|
| `r7_candidates_select` | 0 |
| `r7_candidates_tenant_delete` | 0 |
| `r7_candidates_tenant_insert` | 0 |
| `r7_candidates_tenant_update` | 0 |
| `r7_automation_queue_tenant_select` | 1 (`20260618130000_r7_automation_queue.sql`) |

**4 of 5 live policies (all 4 on `r7_candidates`) have zero occurrences of their own name anywhere in `supabase/migrations/`.** The one name-match (`r7_automation_queue_tenant_select`) is itself a partial match: the migration's `USING` clause has no `OR is_platform_developer()`, but the live row does — so even the matched policy's predicate text differs from what's on disk.

**Migrations → live** (every `CREATE POLICY` statement — literal or via the `format()`/array loop in `20260304040000` — that targets `r7_candidates` or `r7_automation_queue`, checked against the live policy list in 2b/2c and against any `DROP POLICY` for the same name anywhere in the tree):

| migration-defined policy | source | exists live? | DROPped in-repo? |
|---|---|---|---|
| `r7_candidates_tenant_isolation` | `20260304040000` (dynamic, `FOR ALL`, calls `r7_current_tenant_id()`) | no | no |
| `r7_candidates_portal_self_select` | `20260414040000` | no | no |
| `r7_candidates_anon_insert` | `20260629060100` | no | **yes** — `20260702060100_r1_public_apply_secdef.sql:28` |
| `r7_automation_queue_tenant_select` | `20260618130000` | yes | n/a |

**2 of the 4 distinct policy names ever created for `r7_candidates` across the migration history (`r7_candidates_tenant_isolation`, `r7_candidates_portal_self_select`) exist on disk but not live, with no `DROP POLICY` anywhere in the tree accounting for their removal.** (`r7_candidates_anon_insert` is not counted as drift — its own later migration drops it, so the repo's history is internally consistent about that one.)

**Net: replaying `supabase/migrations/` in order against a fresh database would not reproduce the live `r7_candidates` RLS surface.** It would create `r7_current_tenant_id()` and a single `r7_candidates_tenant_isolation` policy that calls it — neither of which is what production actually runs today. Whoever changed prod to the current 4-policy, inline-subquery scheme did so outside the migration flow captured in this repo (the same "MCP-era drift class" `20260725094000_align_rls_authenticated_scope.sql` already names and partially remediated for five *other* policies — this issue is two more tables the same remediation never reached).

### Also observed (not scored as a separate defect here)

`public.r7_candidates` table grants include `anon: SELECT` (`information_schema.role_table_grants`). It's neutralised today because all 4 live policies are scoped `TO authenticated` only (anon gets zero rows via RLS regardless), but `r7_automation_queue`'s migration explicitly `REVOKE ALL ... FROM anon` as "belt-and-suspenders" — `r7_candidates` has no equivalent revoke on record. Flagging for whoever picks up the backfill; not asserting current exploitability.

## Acceptance criteria

- [ ] A new migration is authored that either (a) `DROP`s the dead `r7_current_tenant_id()` function and formally documents/recreates the 4 `r7_candidates` policies + the 1 `r7_automation_queue` policy verbatim as measured above (including the `is_platform_developer()` clauses), or (b) if the operator prefers reverting prod to the function-based scheme, does that instead — either way, **source and live converge**.
- [ ] After the migration is applied (or after a dry-run replay against a scratch/branch database), `pg_policy` for `r7_candidates` and `r7_automation_queue` matches the migration text byte-for-byte (see Validation loop).
- [ ] The 10 other migration files that still reference `r7_current_tenant_id()` are triaged: for each, confirm by live `pg_policy` query whether the deployed policy still calls the missing function (which would mean it errors on every access) or was independently migrated off it like `r7_candidates`/`r7_automation_queue` were. Out of scope for this issue's fix, but must be logged as a follow-up (or a sibling issue) rather than dropped.
- [ ] `r7_candidates`'s stray `anon: SELECT` table grant is either revoked (matching `r7_automation_queue`'s pattern) or explicitly justified in a comment.

---

**Validation loop:** §9.1 output-equivalence — this is a migration/schema-source change where the *deployed behaviour must not change*, only the source-of-truth gap must close.
**Equivalence target:** live `pg_policy` rows for `public.r7_candidates` and `public.r7_automation_queue` as pasted verbatim in §2b/§2c above (captured 2026-09-10 against `tuybltdrdefjblnplpqo`) — the post-fix migration replay must reproduce these rows exactly, not merely "similar" ones.
**Cross red-team:** a second agent re-runs the same `pg_policy`/`information_schema` queries against live after the fix migration is applied (not just against the migration file) and independently greps `supabase/migrations/` for the policy names before flip-to-done.
**Skills to load:** `bsuite-supabase-migrations`, `bsuite-rls-authz-red-team`, `supabase:supabase-postgres-best-practices`.
**Self-report on divergence:** yes (mandatory; do not rationalise gaps) — in particular, do not close this issue on the strength of the migration file alone; re-query live.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
