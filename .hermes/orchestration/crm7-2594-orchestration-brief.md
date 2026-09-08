# Orchestration brief — crm7#2594 [P1][SMS] Mobile Message inbound replies

**Stamp:** index_key `bsuite_project_truth_index` @ 2026-09-05T11:33Z · silo `bsuite` · pairing source `bsuite_skill_mcp_pairings` @ 858546e
**objective_lock:** crm7#2594 [P1][SMS]: surface Mobile Message inbound replies in CRM conversations/timelines and recover stranded usage rows; one canonical message owner; workflow-event integration; tracked under bsuite#3204, reuses bsuite#3209 workflow catalog.
**parent_task_id:** bsuite#3204 · **task_id:** crm7-2594-sms-inbound · delta: `.hermes/orchestration/crm7-2594-task-delta.json`
**DoD profile:** full_E · completion gate: agent-definition-of-done D1–D7 (+D8: inbox/thread/timeline UI is user-facing)

## Grounded findings (verified this session, not from memory)

1. **Producer/consumer mismatch confirmed.** BSU `supabase/functions/sms-inbound/index.ts` writes `message_usage` (lines 192–207); crm7 `src/components/communications/mail/useMailData.ts` reads `communications` (lines 82–145). No SMS exclusion filter in the mail UI — an inbound `communications` row will render.
2. **A dual-write bridge ALREADY EXISTS — STAGED, NOT COMMITTED** in BSU worktree (`M supabase/functions/sms-inbound/index.ts`, ahead of last commit `1b9bf2d` touching that file = merge of #1141; current branch head `31e9261` = merge of #1200). It inserts into `communications` with direction `inbound`, full `body` (not 500-char preview), `recipient_type` mapping, provider provenance in `custom_fields`, and a `crm7#2594` comment. **Any lane implementing the bridge must adopt/verify this staged work first, not rewrite it.** Check with the BSU lane (`bsuite_lease_*` pattern) before touching that file — ONE mutation lane per repo.
3. **Webhook auth is shared-secret-in-URL** (constant-time compare, `SMS_WEBHOOK_SECRET`), with a logged intent to switch to provider signature verification (`X-MM-Signature` header noted in-file as unverified). Issue AC requires "supported verification" — read https://mobilemessage.com.au/api-documentation in full before changing.
4. **Idempotency gap:** no duplicate-callback guard / durable quarantine visible in the function; usage insert logs failure but still returns 200 (false-success ACK flagged by the issue). Consent (STOP/START) upsert exists against `message_consent` (marketing category only) and reply is still recorded — matches AC intent.
5. **crm7 consumer gaps vs AC:** 200-item query cap/pagination, read/unread state, inline SMS reply with delivery feedback, record-timeline linking — all still open on the crm7 side.
6. **Related-but-separate:** `bsuite_opportunity_life_purpose_australia_phone_sms_20260908` (Life Purpose Australia quote) rules: SMS stays on Mobile Message; the inbound-SMS defect is THIS registered issue — do not act on it from the quote lane.

## Lanes / coordination

- Live registry: `wayne-grokbot` (lead), `hermes-takeover` (lead, scope_claimed `packages/auth`), `backup-lane-…` (orchestrator-only). No active lease on `crm7` or `business-suite-unified` found matching this issue's paths.
- BSU owns the edge fn; crm7 owns UI remediation. **One migration owner** for any shared schema change. Linked PRs; usage stays accounting — `communications` becomes the canonical conversation record (one canonical message owner).
- Dependency: bsuite#3209 (workflow catalog/runtime) — reuse, don't duplicate; must not delay basic inbound visibility.

## Workstreams → pairings (from bsuite_skill_mcp_pairings; every step attached)

| # | Workstream | pairing_id | skills | mcps | cli_route |
|---|---|---|---|---|---|
| W1 | Adopt/verify staged BSU dual-write; provider webhook verification; idempotency/durable receipt/quarantine | `bsuite-supabase-rls-security` | `bsuite-edge-functions`, `bsuite-supabase-migrations`, `bsuite-rls-authz-red-team`, `check-security` | qig-memory, supabase | supabase CLI |
| W2 | crm7 SMS inbox/thread/timeline render, pagination, read-state, inline reply | `bsuite-e2e-visual-qa` + `bsuite-ui-card-layout` | `bsuite-react-testing`, `web-frontend-backend-mapping`, `bsuite-brand-system` | qig-memory, playwright, chrome-devtools | playwright test |
| W3 | Historical `message_usage` inbound-row recovery (idempotent, tenant-safe backfill; report counts) | `bsuite-supabase-rls-security` | `bsuite-supabase-migrations`, `bsuite-reliability-red-team` | qig-memory, supabase | `pnpm supabase:rehearse` |
| W4 | Inbound-SMS workflow event in catalog/runtime (reuses bsuite#3209 engine) | `bsuite-developer-portal` + `bsuite-orchestration` | `general-dry-one-shot-architecture`, `machine-vercel-next-best-practices` (n/a for Vite — skip) | qig-memory | — |
| W5 | Ship/promote: dev→main, visual QA, d.* live verify | `bsuite-deploy-vercel` + `bsuite-done-claim` | `bsuite-ship-visual-promote`, `ops-ship-all-apps`, `git-github-pr-workflow` | qig-memory, vercel, github | `gh pr merge --merge` |
| W6 | Close-out: docs (`docs/` + `docs/plans/`), release contract | `bsuite-done-claim` | `ops-ship-close-out`, `agent-definition-of-done`, `bsuite-false-complete-gates` | qig-memory, playwright | `gate_report.py --evidence` |

**default_always (every brief):** skills `agent-mem-truth`, `agent-definition-of-done`, `test-verify-before-completion`; mcp `qig-memory`; memory keys `bsuite_project_truth_index`, `bsuite_skill_mcp_pairings`.

## Mandated chain (from issue; next skills to invoke)

`agent-run-master` ✅ (this brief) → `agent-skl-find` (validate W1–W6 skill lists against full inventory) → `ops-open-run` (open/intake the run) → `bsuite-edge-functions` / `bsuite-supabase-migrations` / `bsuite-rls-authz-red-team` / `bsuite-react-testing` → `bsuite-ship-visual-promote` (+ `ops-ship-all-apps`) → `ops-ship-close-out` → `agent-definition-of-done`.

## Hard rules carried from index + AGENTS.md

- SR-BS-1 merges to development first; SR-BS-2 no floating FABs; SR-BS-3 RLS `tenant_id IN (SELECT auth_tenant_id())`; SR-BS-4 `gh pr merge --merge` never squash; SR-BS-APPLY-EVERYWHERE cross-app sweep check.
- Never `pnpm install` inside the bsuite tree (lockfile regen via `~/<app>_lockgen`); never `workspace:*` for `@bsuite/*`; Node 24.x floor.
- Never assert policy state from dashboard/migrations — query live catalog (`pg_policies`).
- Provider docs (mobilemessage.com.au/api-documentation) must be read in full before W1 signature/ACK changes — do not copy another provider's assumptions.
- Evidence block required in every PR (`## Evidence`); live verify on `d.*` before done claims; Gate F: exclude `.claude/worktrees` from repo-wide measurements.
- Handset/provider round-trip on deployed development, then production after PR promotion (operator authorization required for real sends).