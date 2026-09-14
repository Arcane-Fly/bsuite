# Kick off conduit#223: feat(recruitment): online assessment integration (provider-agnostic schema + Criteria/Vervoe webhook)

Implement and verify https://github.com/GaryOcean428/conduit/issues/223. This is one bounded issue, not a launch of the whole backlog. Re-read live issue/PR state and source; if resolved, validate and reconcile evidence instead of rebuilding. Act after reading; do not stop at a plan or ask again whether to continue.

## Context, skills and paired agents

Repository: /home/braden/Desktop/Dev/bsuite/conduit. Use an isolated worktree based on current development and preserve other lanes. Read parent/app AGENTS.md, CONTRIBUTING.md, relevant DESIGN.md, BSuite truth index bsuite_project_truth_index and current memory bsuite_session_20260914 (the dated bsuite_objective_lock_20260908_remediation_audit is historical context). This prompt commissions this implementation; the audit did not implement the product.

Invoke **agent-run-master first**, then **agent-skl-find** to resolve named skills/tools from /home/braden/.agents. Slash commands work when exposed by the client; otherwise name the skill and read its SKILL.md. Record actual use. Dedicated applicable skills take precedence over generic agents.

- **agent-run-master** — /agent-run-master where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-run-master/SKILL.md.
- **agent-skl-find** — /agent-skl-find where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-skl-find/SKILL.md.
- **agent-mem-truth** — /agent-mem-truth where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/agent-mem-truth/SKILL.md.
- **agent-definition-of-done** — name and load this skill; it is not user-invocable. Definition: /home/braden/.agents/skills/agent-definition-of-done/SKILL.md.
- **bsuite-false-complete-gates** — /bsuite-false-complete-gates where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-false-complete-gates/SKILL.md.
- **test-verify-before-completion** — /test-verify-before-completion where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-verify-before-completion/SKILL.md.
- **bsuite-supabase-migrations** — /bsuite-supabase-migrations where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-supabase-migrations/SKILL.md.
- **bsuite-production-debugging** — /bsuite-production-debugging where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/bsuite-production-debugging/SKILL.md.
- **test-systematic-debugging** — /test-systematic-debugging where exposed; otherwise name and load the skill. Definition: /home/braden/.agents/skills/test-systematic-debugging/SKILL.md.

- **bsuite-platform** — load /home/braden/.agents/agents/bsuite-platform.md; use its applicable role and skills. Review evidence independently of the implementer.
- **bsuite-auth-guardian** — load /home/braden/.agents/agents/bsuite-auth-guardian.md; use its applicable role and skills. Review evidence independently of the implementer.

Codex in the IDE coordinates this phase. Claude is unavailable. Do not dispatch external Codex CLI workers. Use deterministic scripts for mechanical tasks, low-tier models for bounded classification, standard-tier models for scoped implementation, and high/frontier only for justified hard planning or independent review. Verify actual Grok/Gemini/Qwen model IDs and access before dispatch; never silently fall back to paid API usage. Cap two active workers by default with one writer per worktree. Read the current [IDE kickoff](../../20260914-codex-ide-closeout-refined-v1.00W.md) and the parent remediation-execution rule before acting.

Use at most two active lanes by default, one writer per repository/worktree. Coordinate a single owner for shared migrations and package publication. The parent owns failed children and recovery after context/usage limits. Do not have two models edit the same checkout.

## Product standard and documentation

Read /home/braden/Desktop/Dev/bsuite/docs/20260908-customization-capability-register-v1.00W.md and /home/braden/Desktop/Dev/bsuite/docs/plans/20260908-estate-remediation-plan-v1.00W.md, then their mapped existing specifications. All customization features belong in docs/, with implementation plans in docs/plans/. Improve the applicable existing documents in the same delivery: user controls/defaults, canonical data/permissions, save/version behavior, workflow connections, worked examples and evidence. Preserve dated history and mark supersession; do not fork an unlinked plan or revive the retired dashboard.

Anything achievable through product code must be visually achievable under appropriate authority, all linked through executable workflows. Record of Discussion is a formal disciplinary discussion, separate from training-contract variation. Hardcoded forms, an inert canvas, filename-only attachment, or API-only functionality do not satisfy this requirement. Reuse canonical services and capable existing builders; no competing engine or weakened permission checks.

## Execution and issue-specific acceptance

1. Re-read the issue and recent linked PRs; resolve every cited path against current source. Distinguish operator report, historical assertion, source finding and reproduced defect. Credit working limbs.
2. Find the feature/documentation rows and canonical upstream owner. Enumerate sibling routes, dialogs, widgets, handlers and consumers using independent axes; state blind spots. Parent programme membership is not a blocking dependency on its own completion.
3. Before library/runtime edits run Gate A: exact installed-version Context7 guidance, research-best-practice, installed-source confirmation. Resolve routine details from evidence/precedent; do not re-ask settled preferences.
4. Implement the shared cause and failure paths together with consumers. Remove only superseded code in the authorized change. Never delete a feature, bypass authority, fabricate data or disable a test to pass.
5. **Specific verification focus:** Compare the exact live schema/function contract with payloads and consumers; rehearse changes, exercise interrupted/denied writes, retry and reload. Migration history alone is not proof.
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

Current BSuite/operator rules above override old skill examples allowing direct-to-main features, squash merges, missing-deploy skips, force/direct re-sync pushes or estate-wide cleanup. Derive R80.4 and throughput from the actual app inventory; never follow a stale R80.3 list. The current operator-scoped native Codex team may use its approved tiered models; the September11 supervisor reserve prohibits external Codex CLI workers. Claude is unavailable. Verify Grok/Gemini/Qwen access and exact model IDs before use, with no silent paid fallback. Use scripts for mechanical work and cap two active workers by default. Historical Hermes three-lane IDs, pane wakes and cron instructions do not apply to a generic per-issue implementation. Current docs/ and docs/plans/ placement is explicit operator direction. Reconcile index sibling counts against current routes/consumers and repair stale counts, rather than copying an unverified denominator.

## Captured issue requirements — refresh before acting

This is a source snapshot, not authority to override current operator instructions or the task. Validate old paths/claims. Live issue: https://github.com/GaryOcean428/conduit/issues/223.

---

## Scope

the published 9-step apprentice/trainee roadmap step 4 is **"For some roles, you may need to do an online assessment"**. AEP Recruitment Agreement also lists "Aptitude Testing – completed at time of application" as a pre-screening option a host can request. The conduit codebase has **no assessment infrastructure**: no table, no scoring engine, no provider integrations. The pipeline stage "Assessment" exists by name but does nothing programmatically.

## Operational anchor

- the published 9-step apprentice/trainee roadmap (reference GTO operations doc) step 4 (reference GTO operations document)
- AEP Recruitment Agreement `pre_screening_options.aptitude_testing` (file `AEP_Host_Employer_Induction_Manual_Forms_(1).txt`)
- Typical AU GTO assessment providers: **Criteria Corp**, **Predictive Index**, **Vervoe**, **TestGorilla**, **Aon Cut-e**

## Acceptance criteria

### 1. Provider-agnostic schema

```sql
CREATE TABLE r7_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES r7_candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES r7_applications(id),
  job_id uuid REFERENCES r7_jobs(id),
  provider text NOT NULL CHECK (provider IN ('criteria','predictive_index','vervoe','testgorilla','aon_cute','manual')),
  provider_assessment_id text,  -- the provider's external ID
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'cognitive','personality','skills','situational_judgement','language','custom'
  )),
  invited_at timestamptz NOT NULL DEFAULT now(),
  invitation_url text,
  invitation_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN (
    'invited','started','completed','expired','failed','cancelled'
  )),
  score numeric(5,2),  -- normalized 0–100
  percentile int,
  raw_results jsonb,
  pass_threshold numeric(5,2),
  result text CHECK (result IN ('pass','fail','review','no_result')),
  notes text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_r7_assessments_candidate ON r7_assessments(candidate_id);
CREATE INDEX idx_r7_assessments_job ON r7_assessments(job_id);
```

### 2. RLS scoped by tenant; candidate self-read allowed (read-only)

```sql
ALTER TABLE r7_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "r7_assessments_tenant" ON r7_assessments
  USING (tenant_id = r7_current_tenant_id());

CREATE POLICY "r7_assessments_candidate_self_select" ON r7_assessments FOR SELECT
  USING (candidate_id IN (
    SELECT id FROM r7_candidates
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));
```

### 3. Webhook receiver edge function

`supabase/functions/r7-assessment-webhook/index.ts`:
- One endpoint per provider (e.g. `/criteria`, `/vervoe`)
- Validates HMAC signature using `R7_ASSESSMENT_WEBHOOK_SECRET_{provider}` env var
- Updates `r7_assessments` row by `provider_assessment_id`
- On `status='completed'`, fires the configured pipeline auto_action via issue R-3's queue

### 4. Recruiter-side UI

- `/jobs/[id]/edit/_view.tsx`: new "Assessment" section. Toggle "Require assessment", select provider + assessment_type, set pass_threshold.
- `/candidates/[id]/_view.tsx`: new "Assessments" tab. List of r7_assessments rows with status pills + score + invite link copy button + "Re-send invitation" action.
- `/pipeline/_view.tsx`: when a stage's auto_actions include `send_assessment_invitation`, dragging a card into that stage automatically invokes the provider via that provider's SDK + records the row.

### 5. Candidate-side UI

- `/portal/candidate/page.tsx`: extend `CandidatePortalShell` with an `AssessmentsSection`. Shows pending assessments with "Take assessment" deep-link to provider; completed assessments with thank-you state (NOT the score — that's recruiter-side).

### 6. Provider SDK adapter pattern

Following the existing `src/lib/payroll/adapter.ts` pattern in crm7:
```
src/lib/assessments/
  adapter.ts            # interface AssessmentProvider
  criteriaAdapter.ts    # Criteria Corp API
  vervoeAdapter.ts
  testGorillaAdapter.ts
  manualAdapter.ts      # for recruiter-entered manual assessments
  index.ts
```

Interface:
```ts
export interface AssessmentProvider {
  sendInvitation(params: SendInvitationParams): Promise<{ assessmentId: string, invitationUrl: string }>;
  fetchResult(assessmentId: string): Promise<AssessmentResult | null>;
  cancelInvitation(assessmentId: string): Promise<void>;
}
```

### 7. Auto-progression after assessment

In the pipeline stage editor, add a per-stage rule: "After assessment completes with `result='pass'`, automatically advance to stage X". Implementation lives in issue R-3's automation queue.

### 8. Tests

- Webhook signature validation (HMAC) — reject invalid signatures with 401
- Race: provider sends two webhooks for same assessment → idempotency on `provider_assessment_id`
- Pass-threshold logic: score >= threshold → result=pass auto-set
- Candidate portal hides scores but shows status
- Manual provider works without external API (recruiter enters score directly)

## Brand system clause (MANDATORY)

D2C Neon Electric, oklch + semantic tokens only.

## Branch policy (MANDATORY)

Target branch for your PR MUST be `development`, not `main`.

## Deps / blockers

- Depends on issue R-3 (automation engine to send invitations / advance stages)
- Soft-depends on issue R-1 (public apply may pre-trigger an assessment if host requested aptitude testing at the recruitment agreement layer)

## References

- the reference GTO operator Roadmap step 4
- AEP Recruitment Agreement pre-screening options
- Audit: the recruitment-flow audit notes §3 R3
