# crm7-2594 closeout plan

## Scope and ownership

Planning only for `GaryOcean428/crm7#2594`. The parent owns queue/ledger changes, implementation lanes, migrations, provider-console/security changes, commits, pushes, PRs, releases and issue closure. Do not edit the dirty primary checkouts: parent `development` is behind one commit with unrelated changes; crm7 is detached at `main` with three unrelated untracked files.

## Verified current baseline (2026-09-20)

- Queue row is still `pending`, with the explicit warning that prior closure deferred unread/workflow criteria: `/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation/hermes-queue.json:21-27`.
- Live issue is `OPEN`, last updated 2026-09-11. Commands:
  - `gh issue view 2594 --repo GaryOcean428/crm7 --json state,updatedAt,closedAt,url`
  - `gh issue view 2594 --repo GaryOcean428/crm7 --json comments --jq '.comments[] | [.createdAt,.url,(.body | split("\n")[0:3] | join(" "))] | @tsv'`
- Merged crm7 limbs are present on both current remote trunks: PRs `#2597`, `#2599`, `#2601`, `#2605`, `#2607`, `#2608`; `git branch -r --contains 5bd812a8...` and `--contains 6578fa65...` include `origin/development` and `origin/main`. A merge alone is not acceptance.
- Current source already provides deterministic inbound identity, atomic communication/usage persistence, receipt separation and workflow emission in `business-suite-unified/supabase/functions/sms-inbound/index.ts` and `business-suite-unified/supabase/functions/_shared/sms-inbound.ts`.
- Current crm7 source already provides infinite communications paging, read/unread state, inline unmatched-SMS reply, canonical `sms.inbound` events and workflow authoring in:
  - `crm7/src/components/communications/mail/useMailData.ts`
  - `crm7/src/components/communications/mail/MailClient.tsx`
  - `crm7/src/components/communications/mail/mailReply.ts`
  - `crm7/src/lib/workflows/eventCatalog.ts`
- Do not trust the old “code complete” label. Current code still shows concrete gaps:
  1. STOP/START consent is written separately before `sms_inbound_persist`; a consent failure is logged but acknowledged, so consent and message persistence can diverge (`business-suite-unified/supabase/functions/sms-inbound/index.ts:350-368`).
  2. `useCommunications` has no interval/realtime refresh, while acceptance requires new replies without reload (`crm7/src/components/communications/mail/useMailData.ts:142-151`).
  3. KPI unread totals count only `email_messages`; rail communication counts derive from loaded pages, not the full server count (`useMailData.ts:198-230`, `MailClient.tsx:280-302`).
  4. Assign/link is exposed only for `item.source === 'message'`, excluding inbound SMS communications (`crm7/src/components/communications/mail/ReadingPane.tsx:194-205`).
  5. Record-side correspondence reads only linked email records; contact activity is a separate activity store. SMS is not proven in person/contact/record histories (`crm7/src/components/communications/EntityCorrespondence.tsx`, `crm7/src/components/contacts/ActivityTimeline.tsx`).
- Provider registration was later verified: inbound and status webhooks point at `sms-inbound`. Still unverified: URL-secret equality through real traffic, HMAC signing configuration, an authorised handset round trip, provider-history recovery, and production round-trip evidence.
- Existing implementation plan is stale and must be corrected in place, not forked: `crm7/docs/plans/20260908-crm7-2594-sms-inbound-implementation-v1.00W.md` still lists old PR/release state and a no-op recovery predicate.

## Safe execution sequence

### 1. Re-establish evidence on isolated current-development worktrees

**Skills/tools:** `git-github-issue-closeout`, `bsuite-edge-functions`, `bsuite-supabase-migrations`, `bsuite-rls-authz-red-team`, `bsuite-react-testing`; GitHub, Supabase live catalog/logs and Playwright. Parent assigns one writer per worktree.

1. Pin crm7, BSU and workflow processor SHAs; capture clean/dirty status before any edit.
2. Re-run a two-axis consumer census: imports/routes/components, plus live table/RPC/function callers. Enumerate inbox, unread/KPIs, SMS box, search, notifications, inline reply, linking/reassignment, each record-history surface and workflow UI/runtime.
3. Query live schema/function definitions, ACL/RLS, migration identity by version **and** name, deployed edge-function source/version and redacted logs. Do not infer live state from migration files.
4. Re-check Mobile Message webhook metadata read-only with values redacted. Never print secrets or customer message content.

**Gate:** a criterion table marks each C1-C12 limb `verified`, `failed`, `blocked` or `unverified` with SHA/source evidence. Old comments are context only.

### 2. Close durable capture and consent atomicity (C2/C5)

**Likely files:**
- `business-suite-unified/supabase/functions/sms-inbound/index.ts`
- `business-suite-unified/supabase/functions/_shared/sms-inbound.ts`
- `business-suite-unified/supabase/functions/_shared/__tests__/sms-inbound.test.ts`
- `business-suite-unified/supabase/functions/_shared/__tests__/sms-persist.test.ts`
- a **new forward migration** after `20261129000000_sms_inbound_durability_final_hardening.sql`; never rewrite an applied migration
- `business-suite-unified/supabase/functions/_shared/__tests__/sms-durability-concurrency.sh`

Move consent mutation into the same database transaction as inbound persistence (or return retryable failure before acknowledgement). Preserve rolling-deploy caller compatibility until deployed handler and live RPC agree; then retire obsolete overload only through a reviewed forward migration. Tests must cover STOP/START, ordinary Unicode reply, duplicate callback, concurrent replay, receipt/reply separation, out-of-order receipt, consent-write failure, communication-write failure, workflow-emission retry and cross-tenant denial. Reverting the fix must make the failure-path test fail.

### 3. Complete the CRM conversation and record-history journey (C3/C4)

**Likely files:**
- `crm7/src/components/communications/mail/useMailData.ts`
- `crm7/src/components/communications/mail/MailClient.tsx`
- `crm7/src/components/communications/mail/ReadingPane.tsx`
- `crm7/src/components/communications/mail/mailItems.ts`
- `crm7/src/components/communications/EntityCorrespondence.tsx`
- canonical communication-link service/schema selected after the census
- associated existing `*.test.ts(x)` files; add focused tests beside production files

Implement/refine one canonical linkage path for email and SMS; do not create a parallel activity store. An unmatched/ambiguous SMS must remain visible and be linkable/reassignable by an authorised user in place, with explicit ambiguity—not guessed across tenants. Linked inbound/outbound SMS must appear in the relevant record histories and open inline without losing page state. Use `@bsuite/data-grid` for any record list/grid touched; do not add another hand-rolled row list.

Add server-correct unread/total counts independent of loaded pages and live refresh (polling or existing approved realtime pattern) that preserves selection, draft and scroll. Keep current infinite paging and deterministic order. Search must cover full SMS body/counterparty and must not imply unloaded pages were searched if filtering stays client-side.

### 4. Prove visual workflow actuation (C6)

**Likely files (only if current verification fails):**
- `crm7/src/lib/workflows/eventCatalog.ts`
- `crm7/src/components/workflows/WorkflowTriggerConfig.tsx`
- current `@bsuite/workflow-canvas` action editor consumers
- BSU workflow RPC migration/function and Conduit `r7-automation-processor` handler

Reuse the existing workflow runtime—no second engine. Through the deployed canvas UI, author `sms.inbound` and `sms.inbound.unmatched` filters/actions, publish, activate, generate a real isolated event, observe a processor attempt, persisted task/notification linked to the communication, logs, retry and reload. A SQL-seeded definition, manually completed queue row or attempts `0` is a fail. Replay/backfill must not send outbound messages or duplicate actions.

### 5. Reconcile provider history without resending (C7)

Create a reviewed, idempotent reconciliation command only if the provider API/export contains rows absent from the canonical store. It must support `--dry-run`, date bounds and redacted aggregate output; key by deterministic/provider identity and tenant-owned receiving number; route through the same persistence primitive; never resend; report matched/imported/unmatched/ambiguous/conflicting/irrecoverable counts and preserve provenance. Require parent approval before any production write. A database-only count of zero is not provider-retention evidence.

### 6. Verification and closeout handoff (C8-C12)

Run focused checks first, then full app gates:

```bash
# crm7
pnpm exec vitest run \
  src/components/communications/mail/communicationsPagination.test.ts \
  src/components/communications/mail/mailItems.test.ts \
  src/components/communications/mail/mailReply.test.ts \
  src/components/communications/mail/ComposeForm.sms.test.tsx \
  src/components/communications/mail/ReadingPane.test.tsx \
  src/components/communications/EntityCorrespondence.test.tsx \
  src/components/workflows/WorkflowTriggerConfig.test.tsx \
  src/lib/workflows/eventCatalog.test.ts
pnpm typecheck
pnpm typecheck:tests
pnpm ratchet:test-typecheck
pnpm lint
pnpm build

# BSU edge/database boundary
cd business-suite-unified
# Use the repository's Deno configuration/import map.
deno test supabase/functions/_shared/__tests__/sms-inbound.test.ts \
  supabase/functions/_shared/__tests__/sms-persist.test.ts \
  supabase/functions/_shared/__tests__/sms-provider.test.ts
bash supabase/functions/_shared/__tests__/sms-durability-concurrency.sh
pnpm typecheck
pnpm lint
pnpm build

# Parent-owned migration rehearsal/live verification
pnpm supabase:rehearse
```

After parent-controlled development deployment, match exact deployed SHAs, then use Playwright plus an authorised handset/provider test account to prove: inbound Unicode/long SMS → visible unread count/list/full body → mark/read/reload → inline reply feedback without losing draft → in-place link/reassign → linked record history → visually authored workflow run/effect/retry. Repeat STOP and START; verify delivery receipt never renders as inbound or starts a workflow. Exercise intended and denied roles and a second tenant. Test 768/1024/1440 widths and both themes; `crm7#2600`/`bsuite#3231` remain dependencies where their defects block D8, not excuses to waive it.

Production promotion and verification remain parent-owned. Update the existing implementation plan and provider/communications/workflow docs with current SHAs, live results, redacted IDs/timestamps, counts, rollback and monitoring. Parent then runs `bsuite-false-complete-gates`, `ops-ship-close-out` and independent `agent-definition-of-done`; only an APPROVE with production evidence permits issue/queue closure.

## Acceptance criteria for closeout

1. **Capture:** one provider reply yields one full canonical communication and one accounting record; retry/concurrency cannot duplicate either.
2. **Security/tenancy:** secret/signature behavior is verified, service RPCs are not executable by anon/authenticated, tenant resolution uses the owned receiving number, and cross-tenant link/read/write is denied.
3. **Failure behavior:** persistence/consent failures return retryable status without false success; retry recovers; receipts remain separate and monotonic.
4. **Conversation UX:** inbound/outbound SMS is chronological, searchable, paginated, live-refreshing, full-body, correctly counted, read/unread durable and replyable without draft loss.
5. **Linking/history:** unmatched/ambiguous messages remain visible and can be authorisedly linked/reassigned in place; linked SMS appears on every enumerated relevant record-history sibling after reload.
6. **Consent:** STOP/START remains visible and atomically updates supported consent; suppression holds; no receipt/replay/backfill triggers duplicate automation or send.
7. **Workflows:** UI-authored → published → activated → real inbound event → processor attempt → meaningful persisted linked effect/log; retry is observable and idempotent.
8. **Recovery:** provider retention/export is actually queried or precisely blocked; dry-run and applied before/after counts reconcile, provenance is retained, and no historical message is resent.
9. **Real-world evidence:** authorised development handset/test-provider round trip and post-promotion production verification are tied to exact deployed SHAs with redacted evidence.
10. **Release/records:** focused/full tests pass, applicable migrations/functions are live and inspected, docs are current, child findings are resolved, and independent DoD approves. A merged PR or database-only zero is insufficient.

## Precise external blockers

- An authorised person/provider test account is required for the real inbound handset round trip; no agent should send to a real customer number without explicit authorisation.
- Mobile Message credentials/retention access are required for `GET /v1/inbound` historical recovery.
- Enabling/changing `SMS_SIGNING_SECRET`, matching URL secrets, applying migrations, deploying edge functions and any production reconciliation are security/production actions owned by the parent/operator.
