# Recruitment Communications + RAMS Lodgement Cluster — Implementation Plan

> **Filename corrected 2026-08-17: `v1.00W` → `v1.00A`.** The body says
> **A (Approved — SHIPPED + signed-in prod-verified 2026-06-24)**, with all four conduit issues
> merged and live-verified. A `Working` marker on a plan that shipped two months earlier invites
> re-execution of finished work.


> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` (or `subagent-driven-development`) to implement this plan phase-by-phase. Each phase is its own PR to conduit `development`.
>
> **Status: A (Approved — SHIPPED + signed-in prod-verified 2026-06-24).** All four issues (conduit #221/#225/#227/#229) built, dual-verified, merged, and live-verified on `conduit.crm7.app`; cron Vault seeded; advisors triaged (conduit#334 done). Post-ship: matcher `r7_jobs` column bug fixed+verified (conduit#336); per-user FO identity link shipped (crm7 `field_officers.user_id` + conduit auto-scope, signed-in-verified). Open follow-ups: conduit#338 (lodgement/match lifecycle, RAMS-contract-gated), crm7#1090 (FO admin-link UI + RLS tightening). Originally superseded the "operator-blocked" framing of conduit#225/#227/#229/#221 — those were **mislabelled**: the credentials are provisioned and the infrastructure exists (see §1).

**Goal:** Finish the recruitment communications + regulated-lodgement cluster in conduit — interview invites actually get delivered, pipeline stages fire automated notifications, offers get e-signed + lodged with RAMS, and rejected candidates can opt into the talent pool — by **wiring conduit into existing shared infrastructure**, not by building new vendors.

**Architecture:** conduit owns no email/SMS/calendar/e-sign infrastructure of its own. It calls **shared BSU edge functions** (`email-dispatcher`, `calendar-integration`, `oauth-google-email`, `oauth-microsoft-email`) on the shared Supabase project `tuybltdrdefjblnplpqo`, **reuses crm7's in-house e-sign** (`documentSigner.ts` + `SignDocumentFlow.tsx`, zero-vendor, AU ETA 1999), and **reuses crm7's deployed `ram-token-exchange` edge function** (RAM M2M → ATO token) for RAMS/AASN lodgement. New work is conduit wiring + one conduit-owned automation edge function + a small extension to the shared `calendar-integration` function.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr`, TanStack Query, server actions, Supabase Postgres + RLS + pg_cron, Deno edge functions, `pdf-lib` + `crypto.subtle` (e-sign), Resend + user-OAuth (email), Google Calendar API / Microsoft Graph (calendar), RAM RS256 JWT → ATO `client_credentials` (RAMS).

---

## §0 — The "not blocked" correction (why this plan exists)

The continuation prompt parked these four as "operator-blocked on calendar/email/RAMS config." That was wrong — verified against `.env.local` + the live edge-function inventory (`feedback_grep_env_first` lesson, re-learned 2026-06-18):

| Claimed blocker | Reality |
|---|---|
| "calendar/email API config" (#225) | `RESEND_API_KEY` set; BSU `email-dispatcher` + `oauth-google-email` + `oauth-microsoft-email` + `calendar-integration` edge functions deployed. Users connect Google/Azure → send/calendar from their mailbox (the intended design). |
| "RAMS API access" (#227) | `RAM_CLIENT_ID` + `RAM_PRIVATE_KEY_PKCS8_B64` + `RAM_CREDENTIAL_ABN` provisioned; crm7 `ram-token-exchange` edge fn deployed + `admsAdapter.ts` exists. |
| "consent copy" (#229) | Resend ready; APP-6/Spam-Act consent copy is draftable, not a hard external dep. |
| "SMS provider" (#221) | Email/in-app buildable now via Resend. **SMS is the one genuine gap** (no Twilio/MessageMedia key) → email-first; SMS is a later add. |

**The only genuine operator inputs needed are in §4.** Everything else is buildable now.

---

## §1 — Verified current state (audit 2026-06-18)

Far more is already shipped than the issue bodies imply (the #312 recruitment-handoff promotion landed the schema + state machines). What remains is mostly **wiring**.

### conduit#225 — FO + workplace-visit + 3-way calendar invite

| Done | Missing |
|---|---|
| FO/host columns on `r7_interviews` + `r7_pipeline_entries` (migration `20260610300000`) | **Email delivery of the ICS invite on schedule** (no call to `sendEmail()` with the invite) |
| `interview_type='workplace_visit'` + CHECK + validation (`interviewRules.ts`) | **`syncToCalendar` UI trigger** (store method exists, no button) |
| FO picker + host picker + host-attendee-emails in `ScheduleDialog` (`interviews/_view.tsx`) | **3-way attendees passed to calendar push** (only `interviewer_emails` sent today) |
| ICS generator + 3-way attendee assembly (`src/lib/recruitment/calendarInvite.ts`: `buildInterviewInviteIcs`, `collectThreeWayAttendees`, `buildGoogleCalendarUrl`) | FO portal `/portal/field-officer` (issue item 5) |
| ICS `.ics` download from row menu (`handleDownloadInvite`) | Auto-assign FO on "Reference Check" stage (item 6 → needs #221) |

### conduit#227 — offer e-sign + RAMS lodgement

| Done | Missing |
|---|---|
| Full `r7_offers` schema + state machine (DB trigger `r7_offers_validate_transition` + TS mirror `offerStateMachine.ts`) — status enum `draft→…→superseded`, ordered signatures, `esign_flow_id`, lodgement cols (migration `20260610300100`) | **Actual e-sign runner** — must reuse crm7 `documentSigner.ts` + `SignDocumentFlow.tsx` + `PdfViewer.tsx` (crm7-local → copy or `@bsuite/esign`) |
| `OfferProgressDialog.tsx` + `offerStore.ts` (`recordSignature`, `recordLodgement`) | **Offer-letter + training-contract PDF generation** (no `generate-document` analog in conduit) |
| `@xyflow/react` installed (used by schema-builder only) | **RAMS lodgement automation** (lodgement is manual entry today; reuse crm7 `ram-token-exchange` + `admsAdapter`) |

### conduit#229 — talent pool consent + re-engagement → **mostly greenfield**
`r7_talent_pools` + `r7_candidate_pool_memberships` exist with **no consent columns**, no opt-in flow, no matcher. Needs migration + opt-in + `/portal/talent-community/join` + matcher pg_cron edge fn. Depends on #221 (rejection auto-action) + a candidate-level consent column.

### conduit#221 — stage automation engine → **greenfield, foundational**
`auto_actions jsonb` exists on `r7_pipeline_stages` but **nothing reads it**; no trigger, no queue, no processor. `r7_communications` table + `communicationService.sendEmail()`/`sendSms()` (→ shared `email-dispatcher`/`sms-dispatcher`) **exist**. Needs `r7_automation_queue` + DB trigger + a conduit-owned processor edge function. **This is the foundation** #225-item-6 and #229's rejection-opt-in depend on.

### Shared infrastructure (the key enabler)
- **No `conduit/supabase/functions/` directory yet** — conduit has zero edge functions. Email/SMS/calendar all proxy to **BSU** edge functions on the shared project.
- BSU edge fns confirmed live: `email-dispatcher` (Resend primary + user-OAuth fallback), `oauth-google-email`, `oauth-microsoft-email`, `email-token-refresh`, `calendar-integration` (Google Calendar + MS Graph).
- crm7 edge fn: `ram-token-exchange` (native Web Crypto RS256, `x5c` header → `https://auth[.evte].ato.gov.au/core2/connect/token`); `admsAdapter.ts` adds `Ocp-Apim-Subscription-Key` for `admsapi.australianapprenticeships.gov.au`.

---

## §2 — Skills + MCP inventory (mapped to workstreams)

| Workstream | Skills | MCPs (and why) |
|---|---|---|
| All phases | `executing-plans`/`subagent-driven-development`, `nextjs-app-router`, `frontend-backend-mapping`, `qa-and-verification`, `verification-before-completion`, `git-workflow`, `dry-one-shot-architecture` | `Supabase` (migrations/RLS/advisors — never trust dashboard counters), `GitHub`/`gh` (issues/PRs), `BrowserBase` (signed-in d.* verify) |
| #225 calendar/email | `supabase` | **`microsoft-docs`** (MS Graph `/events` attendees + Entra scopes — only if extending `calendar-integration`), **`google-dev-knowledge`** (Google Calendar `events.insert` + `sendUpdates` + OAuth scopes), `Vercel` (confirm BSU edge-fn URLs/secrets) |
| #221 automation | `supabase-postgres-best-practices` (trigger + pg_cron), `security-audit` (idempotency, no service-role in browser) | `Supabase` (trigger/queue/advisors), `Context7` (Deno edge-fn + Supabase JS in Deno) |
| #227 e-sign + RAMS | `security-audit` (RAM key handling — server/edge only), `data-export` (pdf-lib) | **`Context7`** (`pdf-lib`, `react-pdf`, `react-signature-canvas`, jose-vs-WebCrypto), **`Tavily`/WebSearch + `firecrawl`** (RAMS/AASN lodgement payload spec, WAAMS training-plan upload), `Supabase` (offer migration + edge-fn deploy) |
| #229 talent pool | `supabase-postgres-best-practices` (pg_cron matcher), `security-audit` (Spam Act unsubscribe, anon token) | `Supabase`, `Tavily`/WebSearch (APP-6 / Spam Act 2003 consent wording) |
| Live verify | `playwright`/`chrome-devtools` (blocked locally — ubuntu 26.04 has no browser build) → **`BrowserBase`** for signed-in d.*/prod | — |

**Gate A is per-phase:** before the first edit of each phase, query the listed MCP for the exact installed-version API + read the installed source. (E-sign: read crm7's `documentSigner.ts` — already done. RAMS payload: research before coding the lodgement call.)

---

## §3 — Phased plan (dependency-ordered)

```
Phase 1  #225-core  (invite delivery)        ─ independent, quick win
Phase 2  #221       (automation engine)      ─ FOUNDATION (unblocks #225-item6, #229 opt-in)
Phase 3  #227       (e-sign + RAMS)           ─ independent of #221, highest business value, largest
Phase 4  #229       (pool consent + matcher)  ─ needs #221 + consent migration
   then  #225-tail  (FO portal, auto-assign)  ─ needs #221
```
Phases 2 and 3 are independent and can be done in either order / parallel. Phase 1 first validates the email+calendar wiring end-to-end cheaply.

---

### Phase 1 — conduit#225 core: deliver the interview invite (S/M, independent)

**Outcome:** scheduling a (workplace-visit or any) interview sends the 3-way ICS invite by email and creates a connected-calendar event for candidate + host attendees + field officer.

**Files:**
- Modify: `conduit/src/stores/interviewStore.ts` (`syncToCalendar` — accept + send the full 3-way attendee list, not just `interviewer_emails`)
- Modify: `conduit/src/app/(dashboard)/interviews/_view.tsx` (add "Send invite" + "Add to calendar" row actions; on schedule, offer to send)
- Create: `conduit/src/lib/recruitment/sendInterviewInvite.ts` (compose ICS via `buildInterviewInviteIcs` + `collectThreeWayAttendees`, call `communicationService.sendEmail()` with the ICS attachment, log to `r7_communications`)
- Test: `conduit/src/lib/recruitment/__tests__/sendInterviewInvite.test.ts`
- Possibly modify (cross-repo, BSU): `business-suite-unified/supabase/functions/calendar-integration/index.ts` (accept an `attendees[]` array if it currently only takes interviewers — **verify first**)

**Gate A:** `google-dev-knowledge` → Google Calendar `events.insert` attendee shape + `sendUpdates=all`; `microsoft-docs` → MS Graph `POST /me/events` `attendees`. Only needed if `calendar-integration` must be extended.

**Tasks (TDD):**
1. Read `business-suite-unified/supabase/functions/calendar-integration/index.ts` — does it accept arbitrary attendees? Record the contract.
2. Write failing test: `sendInterviewInvite(interview)` produces a `sendEmail` payload whose attachment is a valid `VCALENDAR` with all 3 attendee roles. Run → fail.
3. Implement `sendInterviewInvite.ts` (pure compose + the `communicationService.sendEmail` call behind an injectable client for the test). Run → pass.
4. Wire the "Send invite" action in `_view.tsx`; on success toast + `r7_communications` row.
5. Extend `interviewStore.syncToCalendar` to pass `collectThreeWayAttendees(...)`; add the "Add to calendar" button.
6. (If needed) extend `calendar-integration` to accept the attendee array; deploy; re-verify.
7. `pnpm test` + `pnpm typecheck` + `pnpm lint --max-warnings 0` + `pnpm build`.
8. **Live verify (BrowserBase, signed-in d.conduit.crm7.app):** schedule a workplace_visit → Send invite → confirm email received (Resend) + calendar event has candidate+host+FO; DB `r7_communications` row written. Screenshot + DB ground-truth.
9. Commit; PR to `development` with the conduit doctrine blocks (§1.2/§2.2/§3.2/§6/§17) + Evidence; merge; promote; close the **core** of #225 (leave portal+auto-assign sub-tasks tracked).

**Acceptance criteria mapped:** #225 items 3 (workplace-visit — already done) + 4 (three-way invite — completed here). Items 5 (FO portal) + 6 (auto-assign) → Phase 4-tail.

---

### Phase 2 — conduit#221 automation engine (L, FOUNDATION)

**Outcome:** moving a candidate between pipeline stages fires that stage's `auto_actions` (email/SMS/calendar/internal-notify/pool-add), logged to `r7_communications`, idempotently.

**Files:**
- Create migration: `conduit/supabase/migrations/<≥20260611>_r7_automation_queue.sql` — `r7_automation_queue` table (id, tenant_id, pipeline_entry_id, action jsonb, status `queued|processing|done|failed|skipped`, run_after timestamptz, attempts, last_error, created_at) + RLS (tenant isolation via live `user_tenants` subquery — **NOT** `r7_current_tenant_id()`, which is file-only/not-in-live, per `feedback_verify_live_catalog_not_migration_files`) + the `r7_emit_stage_transition_event()` trigger function on `AFTER UPDATE OF stage_id ON r7_pipeline_entries` (+ INSERT) that reads source `on_exit` + dest `on_enter` actions and enqueues rows.
- Create: `conduit/src/lib/automation/autoActions.ts` (Zod schema for the `auto_actions` shape from the issue: `{on_enter:[{kind,template_key,to,delay_minutes,conditions}], on_exit:[]}`) + pure `resolveActions(fromStage, toStage)` + `evaluateConditions`.
- Create: `conduit/supabase/functions/r7-automation-processor/index.ts` — **conduit's first edge function** (Deno). pg_cron-invoked; dequeues `run_after <= now()` rows, executes by kind via the shared `email-dispatcher`/`sms-dispatcher`/`calendar-integration`, writes `r7_communications`, marks status. Idempotent (claim-by-update `queued→processing`).
- Create: pg_cron schedule (in migration) calling the processor every minute.
- Tests: `autoActions.test.ts` (schema + resolve + conditions), processor unit test (mock dispatch).

**Gate A:** `Context7` Supabase-JS-in-Deno + pg_cron `cron.schedule`; `supabase-postgres-best-practices` for the trigger.

**Tasks:** schema/Zod first (TDD) → migration (floor-gated, replay-safe, RLS verified via MCP `pg_policies`) → trigger → processor edge fn → pg_cron → `get_advisors` → live verify (configure a stage's `auto_actions`, move a candidate on d.conduit, confirm email + `r7_communications` + idempotency on re-run). SMS kind: enqueue but no-op-with-log until a provider is configured (see §4.1) — **explicitly logged, not silently dropped**.

**Acceptance mapped:** #221 items 1 (auto_actions schema) + 2 (execution engine). Unblocks #225-item-6 + #229-item-2.

---

### Phase 3 — conduit#227 offer e-sign + RAMS lodgement (L, highest value)

**Outcome:** generate the offer-letter + training-contract PDFs, run the in-house 3-signer e-sign (candidate→host→recruiter), then lodge the signed training contract with RAMS/AASN.

**3a — E-sign reuse (decision in §4.5):**
- Copy `documentSigner.ts` + `SignDocumentFlow.tsx` + `PdfViewer.tsx` from crm7 into `conduit/src/lib/esign/` + `conduit/src/components/esign/` (or create `@bsuite/esign`). Add deps `pdf-lib`, `react-signature-canvas`, `react-pdf`. Add a conduit `document_records`/`document_signatories`/`document_audit_logs` migration mirroring crm7's (or point at shared tables — verify ownership).
- Wire `SignDocumentFlow` into the offer UI; each signer completion calls `offerStore.recordSignature()` (already exists) which writes `*_signed_at` (the state-machine trigger already enforces order).

**3b — PDF generation:**
- Create `conduit/supabase/functions/r7-generate-offer-letter/index.ts` reusing crm7's `generate-document` WIF pattern (Google Docs template merge → PDF → Storage `r7-offers/{tenant}/{offer}/...`), OR client-side `pdf-lib` for a first cut. Record `offer_letter_url` / `training_contract_url`.

**3c — RAMS lodgement (replace manual entry):**
- Gate A: `Tavily`/WebSearch + `firecrawl` → the RAMS/AASN training-contract lodgement payload + the WAAMS "how-to-upload-training-plan" spec + the 5-working-day / 28-day obligations.
- Create `conduit/src/lib/integrations/rams/lodgeTrainingContract.ts` (server action / edge fn) that: calls crm7's deployed `ram-token-exchange` edge fn → Bearer token → POSTs the lodgement to the RAMS/AASN/ADMS endpoint with `Ocp-Apim-Subscription-Key` (reuse `admsAdapter` pattern) → records `lodged_with_sta_at` / `lodgement_reference` / `lodgement_outcome`. **EVTE environment first.**
- The "Lodge with RAMS" button in `OfferProgressDialog` replaces the manual reference entry (keep manual as fallback).

**Gate B (RAM key safety):** all RAM private-key + token-exchange ops are **server/edge only** — never in the browser. conduit calls the crm7 edge fn (which holds the keys); conduit needs the function URL + service auth, **not** the keys.

**Acceptance mapped:** #227 items 1 (schema — done) + 2 (PDF gen) + 3 (in-house e-sign) + 4 (state machine — done) + lodgement.

---

### Phase 4 — conduit#229 talent pool consent + re-engagement (M/L, needs #221)

**Files / tasks:**
- Migration: consent columns on `r7_candidate_pool_memberships` (`consent_at`, `consent_source` CHECK, `withdrawn_at`, `last_engagement_at`, `engagement_score`) + partial index; **+ candidate-level `consent_to_pool` on `r7_candidates`** (the issue's R-2 dep — confirm wording §4.3).
- Opt-in: a #221 automation action `rejection_polite_with_talent_pool_invite` (email with a tokenized link) → `/portal/.../talent-pool/join?token=` server action validates token + writes consent + membership (`consent_source='rejection_opt_in'`, default OPT-OUT).
- Direct signup `/portal/talent-community/join` (anon→auth, explicit consent checkbox, Spam-Act unsubscribe footer).
- Matcher: `conduit/supabase/functions/r7-talent-pool-matcher/index.ts` (pg_cron daily) → open jobs in last 24h → matching pooled candidates (qual/trade/region, `withdrawn_at IS NULL`, `engagement_score>0`) → enqueue `talent_pool_role_match` email, **skip if a `r7_communications` row in last 90 days** (anti-spam).

**Acceptance mapped:** #229 items 1–4. Gate A: `Tavily`/WebSearch → APP-6 + Spam Act 2003 (consent + identification + unsubscribe) wording.

---

### Phase 4-tail — conduit#225 remaining (needs #221)
- FO portal `/portal/field-officer` (recruitment-stage subset of the crm7 FO portal #665) — read-only list of pipeline entries assigned to the FO.
- Auto-assign FO on entry to "Reference Check" stage → a #221 `auto_actions` action `internal_field_officer_assigned`.

---

## §4 — Decisions (RESOLVED by operator + documentation, 2026-06-18)

All six were resolved — five were already documented (operator: "most of these are not questions I had to answer if you read the documentation"):

1. **SMS** → **email-first** (operator-confirmed). SMS has no dispatcher (`sms-dispatcher` doesn't exist); `send_sms` actions enqueue + log "provider not configured" until a provider key is added. No SMS in scope now.
2. **#227 `billing_model`** → reuse `@bsuite/charge-calc` **`BillingModel = 'Standard' | 'ALEX48' | 'W52' | 'Custom'`** (`packages/charge-calc/src/types.ts:83`; `BILLING_MODEL_WEEKS` = 39 (fallback)/48/52/null). **`Custom` IS the "custom mixture"** (operator-confirmed: "standard, ALEX and 52-week are the predefined, but custom mixture of all should be available"). `r7_offers.billing_model` = this enum + a `billable_weeks int` (or `billing_config jsonb`) populated when `Custom`. crm7 `placementSchema.ts:73` already uses this exact 4-value enum — do not invent `('standard','alex','52w')`.
3. **#229 `consent_to_pool`** → **yes** (operator), candidate-level + membership-level consent columns.
4. **#225 FO portal** → **build in sequence** (operator). Recruitment-stage subset on conduit; full FO portal stays crm7#665.
5. **E-sign reuse** → **copy crm7's files into conduit** (operator: "of course"). Mirrors the `@bsuite/stp` call; extract `@bsuite/esign` when a 3rd consumer needs it.
6. **Secrets** → **all in edge functions** (operator). conduit owns NO `RESEND`/Google/Azure/`RAM_*` keys; it proxies to BSU `email-dispatcher`/`calendar-integration` + crm7 `ram-token-exchange`. conduit's own edge fns set secrets via `supabase secrets set --project-ref tuybltdrdefjblnplpqo` (env-var-contributing-rules `20260424` doc).

### The only TWO genuine operator/research gaps (both Phase 3, neither blocks Phase 1–2)
- **ADMS APIM subscription key** (`Ocp-Apim-Subscription-Key`) — a credential SEPARATE from RAM, obtained from `portal.admsapi.australianapprenticeships.gov.au`. RAM creds are provisioned; this APIM key is the one real gap for the final RAMS lodgement HTTP call.
- **"5 working days" STA-notify obligation** — not in any doc; Gate-A research (Tavily/WebSearch) during Phase 3.

## §4a — Documentation-grounded build corrections (2026-06-18 sweep)

- **Phase 1 email/ICS path corrected:** `email-dispatcher` has **no attachment support** (payload + `buildMimeMessage` are text/html only) and routes by a hard `source` split (`platform`→Resend, `user`→connected mailbox). So the `.ics` is **not** emailed as an attachment. Instead: **the connected-calendar event IS the invite** — `calendar-integration` create-event already accepts arbitrary `attendees:[{email,name}]` and Google sends `sendUpdates=all` from the organiser's mailbox, so all three parties get the native provider invite with **zero edge-fn change**. Keep the existing `.ics` download (manual fallback) + add a plain notification email (no attachment) with the calendar deep-link. **Also fix the bug**: `interviewStore.syncToCalendar` reads `result.event?.id` (undefined) — the fn returns `event_id` — so `calendar_event_id` is never persisted (`interviewStore.ts:192-195`).
- **Theme:** conduit primary is **green** `oklch(0.45 0.18 142)` (light) / `oklch(0.70 0.20 142)` (dark), error = electric-purple `oklch(0.568 0.202 283.1)` — use `--color-primary`/`--color-role-error` semantic tokens, never hardcode; `bsuite/no-hardcoded-colours` ERRORs on hex/rgb. The uplift design-language primitives (`StepperShell`/`DataTable`/`FilterBar`/`EmptyState`/`EntityPicker`/`LivePreview`/`TechnicalDetails`) are **W0-Pass-1 stubs** (render `PendingPrimitive`) — do NOT depend on them yet; build new surfaces (FO portal, talent-community join, e-sign flow) with conduit's existing shadcn following the same IA, adopt primitives at Wave W8.
- **RAMS terminology:** AASN/AASS = the support org; **RAMS = the RAM M2M auth layer** (token); **ADMS = the actual lodgement API** (`admsapi.australianapprenticeships.gov.au`). "RAMS lodgement" = RAM-auth → ADMS call. Don't gate `isLodgementReady()` on `rto_signed_at` (WAAMS is WA-only, unordered track).

---

## §5 — Evidence gate (FF-SELF-VALIDATION-20260507, per phase)

Every phase PR carries the conduit doctrine blocks (§1.2 research / §2.2 six-role red-team / §3.2 UX-DX / §6 design-language / §17 cross-app) + the `## Evidence` block. DB phases: floor-gated migration (≥`20260611000000`), RLS verified live via Supabase MCP `pg_policies` (never the dashboard), `get_advisors` triaged. User-facing phases: **signed-in d.conduit.crm7.app evidence via BrowserBase** (local browser blocked on ubuntu 26.04) + DB ground-truth. Issues close only at §12.4 Definition of Done (merged + migrated + live-verified + advisors + deployed-domain evidence).

---

## §6 — Recommended start

**Phase 1 (#225 core — invite delivery).** Smallest, independent, and it validates the email + connected-calendar wiring end-to-end on a real signed-in session before the larger phases lean on it. Then **Phase 3 (#227)** for business value, with **Phase 2 (#221)** as the foundation feeding #229 and #225's tail.
