# Master roadmap — BSuite (planning layer)

> ## ⚠ SUPERSEDED — 2026-08-17
>
> **This roadmap is no longer the planning source of truth.** It calls itself "Canonical" two lines
> below; that line is now false and is left visible rather than deleted, because the estate's
> convention is to show corrections, not to rewrite history.
>
> **Current authority:** [`../20260814-estate-remaining-work-register-v2.00W.md`](../20260814-estate-remaining-work-register-v2.00W.md)
> — re-measured against live SQL, live GitHub state and the six repos at `development` HEAD.
>
> Two things date it beyond recovery:
> - Its content stops at **2026-07-26**, and the Sydney cutover it excludes as "operator-gated" has
>   been overtaken by events.
> - It plans work against **R80.3** in four places. R80.3 left the submodule set on 2026-08-06
>   (`5e000c35`) and was replaced by **R80.4**, which is a different codebase with a different
>   backlog. Work items aimed at R80.3 have no owner.
>
> Retained for its completed-work record and its red-team history.


> **Canonical.** This is the single suite-wide master roadmap; no companion file exists above it.
> *(corrected 2026-07-28 — the previous companion, `docs/20260227-bsuite-master-roadmap-v5.00W.md`,
> was archived 2026-07-08 and is not to be restored; all 6 submodule `UNIFIED-ROADMAP.md` mirrors
> and `docs/OUTSTANDING.md` now point here directly.)*  
> Last updated: 2026-07-26 · **Sydney cutover (Wed 2026-07-29) is operator-gated and EXCLUDED from this plan**  
> Method: planning-and-roadmapping + multi-agent-red-team-planning (**2 rounds complete**)

## Completed recently (2026-07-25 → 2026-07-26)

- [x] Excellence close-out W1–W6 (ui sanitize publish 1.0.1, enterprise Jodie list/create, KAP resolveSchemeAmount AU-day, funding UNIQUE+upsert+financial gate, pin train ^1.0.1 ×5 apps, parity matrix truth, manuals Jodie honesty)
- [x] Host capacity gate + Jodie leave/FO tools (crm7#1207)
- [x] Field-officer portal route — **verified already registered** (`App.tsx:3194`); excavation P0-2 stale

## Completed 2026-07-27 (NOW-lane, shipped + promoted)

- [x] N0 platform-kit gates + fail-soft (BSU#591) — caris 403 class closed
- [x] N1 leave/FO Jodie 404 (crm7#1214)
- [x] N2 dirty files (parent)
- [x] N3 email vault authz-inside-fn + authenticated grant (crm7#1214; allowlist)
- [x] N4 funding_sources RLS repair + TO-authenticated fix (crm7#1214)
- [x] N-CRIT phase 1: en-AU dates, NO hardcoded rate fallbacks, attribute selectors (R80#356)
- [x] Advisor allowlist vault RPC (parent)
- [x] RT remediation round (crm7#1215 case_notes RLS+schema, BSU#592 super_admin bypass + FunctionDetail, R80#357 selector refetch + dead-writer delete)
- [x] RT-2 live E2E — case note insert verified against live schema (placement+subject, cleaned)
- [x] fairwork-enhanced 503 root cause + fix + redeploy (getApiKey phantom api_keys columns) — BSU#593


## Completed 2026-07-28 (full-goal continuation — unglue/OAuth/manuals)

- [x] Card-unglue zero Legacy on crm7 main (burns 1–12; Fragment flatten; ledger 39 legit-only)
- [x] Conduit card-unglue contract ledger 0; BSU residual 9→4 dynamic catalogues with specific WHY
- [x] OAuth live verify: JWKS ES256×2; discovery auth_code+refresh; PKCE localStorage; Xero PKCE TTL; no cookie SSO
- [x] Money: funding claim approve/reject atomic RPCs wired in fundingService
- [x] Schema-builder/registry 1.0.x pins all apps; delete_branch_on_merge false on long-lived branches
- [x] Manuals program content expansion
- [x] developer-nav uplift rebuild (SortableList/RoutePicker/EmptyState/TechnicalDetails) — #609/#610 on main (funding claims, OAuth, card layout, FO/host/employee how-tos) — PR on BSU
- [x] N0/N1/N3/N4/N-CRIT p1–p2 verified already shipped (no redo)
- [x] N-CRIT p3 MAPD validation badge (R80#363/#364 on main) — validateApprenticeSchedule + AwardRateSelector badge
- [ ] Team invites + seat caps (BSU#611/#612) — **partial, not complete**: `evaluateSeatCap` + the TeamMembers UI gate shipped (developer uncapped; enterprise 30d grace; billing CTA), and the `invite_team_member_guarded` RPC exists and enforces the cap when called. But verified live (2026-07-28) that `team_members` and `team_invitations` both carry INSERT policies (`team_members_admin_insert`, `team_invitations_admin_insert`) with `WITH CHECK (auth.role() = 'authenticated' AND is_team_admin(team_id, auth.uid()))` — the same admin predicate as the RPC, with **no seat-cap check**. Any team admin can `POST /rest/v1/team_members` (or `/team_invitations`) directly via PostgREST and bypass the cap entirely; the RPC is not the only write path. Tracked as **business-suite-unified#620 (P0, open)**. Do not re-tick `[x]` until a server-side seat-cap check is enforced at the RLS/trigger layer, not just inside the RPC.
- [ ] Xero invoicing for grace seats + developer-portal client invoices (operator EPIC remainder; Xero cluster)
- [ ] Page-builder north-star residuals (edit-page widget catalogue, schema-builder UX)
- [ ] Open product issues: crm7#659/#660/#662/#678, R80#320, conduit#223, page-builder #937–939, etc.

## Operator notes batch (2026-07-27 doc) — SHIPPED (crm7#1216, R80#358)

- [x] email open/read pinned + mark-read test + ConnectEmailCard empty state (Google/Microsoft/SMTP)
- [x] payroll/award-rates graceful degradation (error card + DB rows when service 503s) + human unit labels
- [x] leads/create inline company — capability existed (EntitySelector + row + handleQuickAddClient); label clarified to "Create new company"
- [x] communications cards individual + card-autoheight-contract test; half-cut pages listed for platform sweep (BSU Analytics/UnifiedDashboard, conduit analytics/_view candidates)
- [x] N-CRIT p2 PART 1+2: hierarchical award→variant picker + manual % entry with July-1 review toast
- [x] N-CRIT p3 (phase 3): MAPD validation badge (validateApprenticeSchedule) — R80#363/#364
- [ ] NEXT: schema-builder UX (tidy/fit icons useless) — redesign
- [ ] NEXT: dashboard edit-page in-place element/widget/entity adding (regression — was available)
- [ ] NEXT: portal send/share links for clients/hosts/workers (currently just redirects)

## EPIC — Team invites + licence caps + Xero invoicing (2026-07-27, operator)

- **Team invites + seat caps (BSU Admin/TeamMembers):** invite flow with seat enforcement — `subscriptions.seat_count` vs active members. Developer licence = uncapped. Cap reached → block + redirect to subscription page with increase-seats CTA.
- **Enterprise/annual-plan grace (e.g. FutureBuild/MBAWA):** invites beyond cap succeed with a 1-month grace window; developer notified (email); invoice for additional licences via Xero; mark paid reconciles via xero-webhook.
- **Enterprise licence tracking table:** SHIPPED (`enterprise_licence_events`, BSU#613/#614) — grace_invite recorded from TeamMembers; Xero paid stamps still open.
- **Developer portal client invoicing → Xero:** surface in BSU developer portal to create tenant invoices and submit via existing xero-invoice-submit edge fn; status tracking via webhook.
- **Automated email:** notify developer on grace invite + on paid reconciliation.

## PROGRAM — Card-unglue sweep (operator 2026-07-27: "no cards anywhere glued")

- Evidence contract: `crm7/src/__tests__/card-unglue-contract.test.ts` — statically fails any page with multi-card-packed widgets; PENDING_UNGLUE_EXCLUSIONS ledger = the burn-down list (~50 pages).
- Doctrine: every logical card = individually movable CanvasCard with own cardKey; autoHeight default; slightly-transparent backing so dots show through (all apps).
- Status: module-visibility DONE (crm7#1219); analytics kpiCards DONE; conduit analytics DONE; BSU Analytics/UnifiedDashboard + ~50 crm7 pages in burn-down lanes.
- Cross-app: same contract test needed for BSU + conduit + R80 pages.

## Lane-E follow-ups (from lane final report, 2026-07-27)

- [x] **kpiCards packed-widget fix (analytics/index.tsx)** — 4 individual movable widgets (crm7#1217)
- [x] **Modern Awards detail: base-wage classifications** — Classifications & base wages table (crm7#1217)
- [x] **React #185 compose crash** — useShallow on selectActiveIntegrations + contract test (crm7#1217)
- [x] **Schema-builder tidy/fit** — grid fallback for disconnected graphs + fit always re-frames (@bsuite/schema-builder 1.0.1, bsuite#1662)
- [ ] **Cross-app backing-card sweep** — BSU `Analytics.tsx` + `UnifiedDashboard.tsx`, conduit `analytics/_view.tsx` use raw `PageGridLayout` with stat-tile packing (no DraggableCardPage abstraction); apply the individual-movable pattern or port the abstraction.
- [ ] **Edit-page built-in widget catalogue** — entity adds already land in-place via `crm7-add-entity-widget`; built-in palette widgets (stat/chart/etc.) have no grid renderer yet. Needs a generic widget catalogue in @bsuite/page-builder widget map (feature build).
- [ ] **Portal share links** — role portals exist (/portal/host-employer, /portal/worker, /portal/field-officer, /portal/workplace); /portal itself redirects. Needs an admin "share portal" surface (copy links + email send) (feature build).
- [ ] **Google OAuth app verification** — operator action: submit Google app verification to remove the "unverified app" screen on Google email connect.

## In Progress

- N-CRIT phases 1–3 complete on main (hierarchy, manual %, MAPD badge)
- N6 Sydney pre-flight (dry-run evidence — operator-gated cutover Wed)
- **Data Workspace program — PLANNED, red-teamed twice, awaiting operator gates.**
  Plan: [`20260808-data-workspace-implementation-plan-1.00W.md`](./20260808-data-workspace-implementation-plan-1.00W.md).
  Answers the standing "Airtable-style reports and data manipulation" ask. Key finding:
  `/settings/data` and `/admin/data` **already exist**, are nav-registered and wired to the
  bulk-write engine — and have never been used (`data_change_sets` = 0). Ruling: build into
  those, **no new `/data` route**. Blocked on OP-E..OP-I in `bsuite_operator_tasks` rev 3.

---

## Planned — NOW (week 1: live bugs + hygiene)

### N7. Data-workspace T1a — live security posture (parent/crm7) — **verified live defects, S**

Split out of the data-workspace plan on Round 2's recommendation so it does not wait behind a
multi-week authz refactor. All three verified directly against production, none dependent on
the rest of that program:

- **N7.1** `authenticated` **and `anon`** hold column-level `UPDATE` on
  `profiles.platform_role` / `profiles.is_super_admin`; the only UPDATE policy is
  `auth.uid() = id` with **no column restriction**. Sole control is
  `trg_guard_profiles_privileged_columns` at `tgenabled='O'` — does not fire under
  `session_replication_role='replica'`. Fix: `REVOKE` both columns + `ENABLE ALWAYS`.
  Round 2 verified **no client code in any of the six apps writes `profiles`**, so the revoke
  breaks no supported path.
- **N7.2** `report_catalog_fields` has **no unique index** on `(entity_id, column_name)` while
  its sibling `report_catalog_entities` has both partial uniques; the write policy admits
  `is_gto_staff` and the resolver prefers the tenant row — so a staff user can shadow a
  platform field row with `is_pii=false` and unmask all 39 PII fields. Fix: the two partial
  uniques + narrow the policy to `is_gto_admin`.
- **N7.3** All **22** catalogued `custom_fields` JSONB columns are `is_filterable`,
  `is_pii=false`, `min_role='tenant_member'` — including `apprentices`, `whs_incidents`,
  `r7_candidates`. Any tenant member can read the whole blob today. Fix: `is_filterable=false`.

**Accept:** self-promotion as a disposable account fails, **and still fails with the trigger
disabled** (proving the revoke, not the trigger, is the control); duplicate catalogue field
row raises `23505`. Each shown failing first.

### N-CRIT. R8 apprentice rate correctness epic (R80.3) — **live money-wrongness in production quotes**
- **Evidence (user PACT check 2026-07-27):** under-21 1st-year carpentry apprentice, residential, no underground → Fair Work PACT **$17.22/hr**; R8 shows **$23.47/hr** (~36% high). Charge quotes built on this overcharge hosts.
- **Root cause (verified):** `awardTemplateService.ts` `DEFAULT_AWARD_TEMPLATES` hardcodes year1=$23.47 etc. — flat blanket rates that ignore each award's **clause-19 apprentice schedule**. MAPD guide §3.1.1: apprentice/junior rates are **calculated base rates** (percentage of another classification), award-specific — available via the FWC/MAPD API classifications record. Actual MA000020 pay guide (1 Jul 2026) shows per-occupation, per-cohort, per-year-12 variants (e.g. 4-yr carpenter 1st year: $16.91 no-year-12 / $18.38 year-12 completed; 3-yr residential $18.70), rates **include industry + tool allowances**.
- **Also broken (user report):** date renders US format (should be en-AU); no junior/adult (under-21) selector; no year-12-completion selector; no occupation/job-title selector; no employment-arrangement selector (FT/PT/school-based for apprentices; FT/PT/**casual** for workers — casual not available for apprentices).
- **Fix plan:**
  1. **Consume MAPD calculated base rates** as source of truth (classifications record, percentage-formula rows) per award × classification × cohort — not blanket fallbacks. Verify `$17.22` fixture against PACT for the user's exact parameters.
  2. **Attribute selectors:** apprentice type (junior <21 / adult), year-12 completion, occupation (award's classification list), employment arrangement with rule: apprentices→{full-time, part-time, school-based}, workers→{full-time, part-time, casual}; casual excluded for apprentices. Feed into X5b hierarchical award→variant picker.
  3. **Fallback discipline (operator ruling 2026-07-27: NO hardcoded rate fallbacks — none):** source-of-truth chain is MAPD API → award pay-guide extraction (structured per award) → **manual percentage entry** saved per award with a **1 July yearly toast** to re-check. If none resolve, the UI must show an explicit **"rate unavailable — verify via PACT"** state (blocking, not a number). Delete `DEFAULT_*` rate tables from `awardTemplateService` as rate sources (keep only structural metadata); a hardcoded rate may never render as a pay figure anywhere.
  4. **Allowances:** model industry/tool allowances per pay guide (or label rate as base-only clearly).
  5. **Date locale:** hunt the US-format leak; enforce en-AU via @bsuite/dates everywhere.
- **AC:** PACT-parity fixtures (under-21 1st-yr carpenter residential = $17.22; year-12-completed variant differs correctly; adult differs); no blanket template rate overrides API rows; all four selectors present and feeding rate resolution; date renders DD/MM/YYYY; July-1 toast schedules yearly.

### N0. Platform-kit gate mismatch — tester renders page, proxy 403s (BSU) — **live prod break, enterprise client**
- **Evidence (verified 2026-07-27):** `caris@mbawa.com` (`platform_role='tester'`, `is_super_admin=false`) on `suite.crm7.app/admin/platform-kit/auth` → page renders, every `platform-kit-proxy` call → `403 {"error":"Forbidden"}` (console spam "Failed to load users: Proxy 403").
- **Root cause:** `PlatformKitAuthRoute.tsx:25` `ALLOWED_ROLES = {platform_admin, developer, tester}` — the 'tester' entry rests on a **factually wrong comment** ("proxy checks is_super_admin which maps to tester" — false; proxy gates `platform_admin|developer|is_super_admin`, and tester is neither).
- **Same class sweep (verified):** `PlatformKitStorage.tsx:278` page-gates `platform_role === 'platform_admin'` **only** — reverse mismatch (proxy allows developer; developer is blocked at page level). `Admin/index.tsx:40` gates developer/platform_admin.
- **Fix:**
  1. Align **all** platform-kit route gates to the proxy gate exactly: `platform_admin | developer | is_super_admin`. Remove 'tester' from `PlatformKitAuthRoute`.
  2. Fail-soft UI: `managementApi` 403 → single AccessDenied state (no repeated console spam, no retry loop) — "Failed to load users: Proxy 403" becomes a rendered permission notice.
  3. Regression test per route: role matrix (tester→denied-before-fetch; developer→allowed) asserting **zero** `platform-kit-proxy` calls when denied.
- **Adjacent (same plan item, verify don't build):** enterprise superadmin's actual need is **tenant-scoped** user admin (FutureBuild users), not platform-wide Management API — verify the tenant-scoped users/admin surface works for caris (platform-kit is correctly developer/platform-only). If tenant-scoped user admin is broken for enterprise superadmin, that's a separate P1 feature gap.
- **AC:** tester sees clean access-denied (no proxy calls); developer/platform_admin pass end-to-end; no 403 console spam; caris's tenant user-admin path documented.

### N1. Jodie leave/FO tools live-404 — allowlist 3 tables (crm7) — **bug, live, S**
- **Evidence:** `submit_leave_request`/`create_case_note`/`check_host_capacity` call `/api/db/leave_requests|case_notes|host_capacity_assessments`; none in `ALLOWED_TABLES` → 404.
- **Safety verified:** `leave_requests_select` uses `USING (tenant_id IN (SELECT public.auth_tenant_id()))` (SETOF form ✓); case_notes tenant-isolation present; body `tenant_id` is context-derived server-side and RLS-enforced.
- **AC:** allowlist ⊇ 3 tables; contract test asserts set membership; leave/FO tool succeeds on d.crm.crm7.app.

### N2. Dirty parent files triage (parent) — **hygiene, S**
- `.markdownlint.json` (MD001:false) + AnyTime Admin-Guide header reflow — commit benign edits; tree clean.

### N3. Email vault token path (crm7/BSU) — **P0-class, M** *(re-framed by RT Round 1)*
- **Truth (RT-verified):** `email_integration_get_decrypted_token(uuid,text)` **exists** (BSU migs 20260418/20260423) — excavation's "missing function" was stale. Real faults: **(a)** no ownership/authz inside the SECDEF body (RLS-bypass oracle); **(b)** browser client calls it as `authenticated` while crm7 migs 20260512/20260521 revoked EXECUTE from `authenticated` (service_role only) → 403.
- **Fix (chosen):** (1) new migration adds `AND user_id = auth.uid()` ownership check **inside** the function (or tenant-membership equivalent); (2) re-grant `authenticated` EXECUTE; (3) advisor allowlist entry same PR; (4) live decrypt verify. Edge-function-only path deferred (bigger; vault secrets never to browser is already true via RPC return-field selection).
- **AC:** email integration token decrypt works end-to-end; non-owner ID → error; pgTAP ownership test.

### N4. `funding_sources` RLS repair (crm7) — **live broken policy, S–M** *(promoted by RT Round 1)*
- **Evidence:** policy `funding_sources_tenant_isolation` has `tenant_id = auth.uid()` branch (always false — type mismatch) and nullable `tenant_id` (orphan-invisible rows possible).
- **Fix:** `ALTER COLUMN tenant_id SET NOT NULL` (after null audit) + policy rewrite to `tenant_id IN (SELECT ut.tenant_id FROM user_tenants WHERE user_id = auth.uid())`.
- **AC:** pgTAP cross-tenant deny; no null rows.

### N5. Funding tool consumer decision (R80.3) — **dead-surface, S**
- `createFundingTools` requires `canManageFinancial` but no consumer supplies it. Decide: wire an R80 AI surface with full context, or mark NOT_WIRED in parity matrix. (Amount-vs-resolver validation already shipped in W1.)

### N6. Sydney **pre-flight** (parent; NOT cutover) — **Wednesday-gated, M** *(hardened by RT)*
- Ordered dry-run: dump → restore (`--single-transaction ON_ERROR_STOP=1`) → vault root-key import → **named-secret verify** (`SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='xero_client_refresh_token'` returns plaintext — GATE: stop if fail) → storage rclone → edge fns → crons → OAuth clients → row-count/RLS/PKCE verify → env prestage (not deploy).
- **Key hygiene (S5):** tmpfs scratch dir wiped after; `HISTFILE=/dev/null` for key-handling session; dry-run project key destroyed post-verify; runbook secrets scan (no DSNs) — SEC-09.
- **AC:** readiness doc RUNBOOK_READY → READY_FOR_OPERATOR with dry-run evidence.

## Planned — NEXT (week 2: money + UX + hardening)

### X1a. Optimistic-lock lane (crm7, client-only) — **P1 batch A**
- leave approve `.update().eq('id',id).eq('status','pending')` (count=1 required); timesheetWorkflow `.eq('state', fromState)`; `recordPayment` returns **re-fetched DB balances** (not client math) — RT Issue 7.
- **AC:** concurrency sims (`Promise.all([approve,approve])`) no double-effect.

### X1b. DB RPC lane (crm7, one migration) — **P1 batch B**
- `approve_funding_claim(claim_id)` atomic RPC: pending check → `WHERE remaining_budget >= amount` decrement → status → timeline; `reject_funding_claim` **restores** budget (RT Issue 2 lifecycle); payment `INSERT…SELECT WHERE amount_due >= $amount`; RCTI sequence/advisory lock.
- **AC:** pgTAP: approve $8k of $10k → $2k; reject → $10k; concurrent payments never overpay.

### X1c. Billing atomicity lane (crm7) — **P1 batch C**
- invoice+line-items in one transaction (or SECDEF RPC); zero-rate invoice guard (block generate when any group chargeRate ≤ 0).
- **AC:** forced line-item failure leaves no orphan; zero-rate blocked with clear error.

### X2. Money UX bugs (crm7)
- charge-rate detail zeros (rehydrate provenance / re-run calc) · expense form Zod finite-positive · (RCTI covered in X1b).

### X3. Missing routes batch (crm7)
- `/compliance/{induction,whs-audits,monitoring-visits,lln-assessments}` · `/leads/scoring` · `/reports/deliveries` · `/documents/templates/new` (or retarget) + portal CTA retargets. Route-table contract test.

### X4. Grid/scroll UX (crm7)
- #744 grid resize card snap · #619 multi-section form scroll.

### X5. Quote path consumes `resolveSchemeAmount` (R80.3)
- Built-in schemes pre-fill/clamp from resolver; custom keys free-typed.

### X5b. Hierarchical award selector (R80.3 `AwardRateSelector`) — **R8 UX defect**
- **Evidence (user screenshot 2026-07-27):** dropdown shows 4 same-code rows flat: `Building and Construction Award`, `(Adult)`, `(Civil)`, `(Commercial)` — all `MA000020`, all badge 2027. User can't tell which applies.
- **Data model (verified):** one code with discriminators on `award_templates`: `is_adult`, `sector: residential|commercial|civil`, `has_completed_year12`. `filterType` is derived from apprentice attributes (`isAdult`/`hasCompletedYear12`/`sector` props) but the standard list leaks variant rows.
- **Fix:** two-level selection — **Level 1: award** (dedupe by `code`, base name only, e.g. "Building and Construction Award · MA000020") → **Level 2: variant** (only if >1 for the code: Base / Adult / Civil / Commercial / Year 12 Completed, each labelled by its discriminator). Auto-pick the variant matching apprentice attributes when derivable; never mix variants into the top-level list. Year badge stays on the award row.
- **AC:** one row per award code at top level; variant step only for codes with variants; searching "building" shows the single B&C row; selecting it then shows its 4 variants with rate differences visible; tests cover dedupe + hierarchy + auto-variant.

### X6. Jodie + security hardening (crm7/parent)
- Tool denylist snapshot test (forbid `*migration*`/raw-SQL tool names — SEC-08) · **stored prompt-injection fencing** for LLM-read user content (case notes etc. — S9) · CSS adversarial allowlist suite (SEC-05) · **CSP report-only headers all 6 apps** (S10, promoted) · linter false-greens #1175 + #1158 · flake #1159 · STA dual-site PROVEN constant (R11) · advisor live-baseline doc (R10/#1542) · **role-gate alignment sweep beyond platform-kit** (route gates vs edge-fn gates across all admin surfaces — N0 class).

### X7. Hygiene
- Subordinate `docs/plans/20260629-bsuite-remaining-work-roadmap-v1.00W.md` to this master (coverage lane: 16/22 items missing there) · SECDEF handoff #1261 consolidation.

## Planned — LATER (2–4 weeks)

- **L1.** Feature-flag Jodie control plane: `tenant_settings.feature_flags` + hierarchy + **security-safe flag allowlist** (`ui.*`/`beta.*`; deny `security|rls|auth|vault` prefixes — S6) + `auth_tenant_id_with_role(['owner','admin'])` + audit log.
- **L2.** Payslip document model + Jodie view tool.
- **L3.** Timesheet entry/submission via Jodie (employee trio).
- **L4.** STA live-email samples → PROVEN_STATES promotion.
- **L5.** LocalisedDateInput package extract (@bsuite/dates).
- **L6.** Hot-path `auth_rls_initplan` top-N only (#1542).
- **L7.** CSP enforcement (after report-only telemetry) · dep hygiene #836 · lockfile-regen doc #1612 · hardening phases #1505 · WebKit CI target #1173.

## Backlog (tracked, not scheduled)

- Conduit intake chain (#219→#218→#231, L epic) · BSU dev-nav #416 · page-builder #937–940 · MYOB/Astute #570 · AI gateway #550 · nav dnd #544 · design language #635 · assessment conduit#223 · domain features #678/#662/#661/#660/#659.
- **Operator-gated:** #1128 doc categories · #1130 onboarding-360 ops · #1142 WHS threshold · #1127 onboarding UX · portal CAT hook.
- a11y batch · upgrade-CTA dead button · budget-form persistence · import/export tenant filter · invoice number sequence.

## Parking lot (rejected/deferred with rationale)

- `auth_rls_initplan` mass rewrite (hot-path only).
- Full EBA re-test pipeline (BOOT doctrine).
- `set_current_tenant` as Jodie tool (prompt-injection pivot).
- `get_email_integration_token` as NEW authenticated RPC (would duplicate existing fn name + oracle risk — fix is authz-inside-existing-fn, N3).
- **Hardcoded pay-rate fallbacks (operator ruling 2026-07-27):** rate figures may only come from MAPD API / award pay-guide / user-entered-with-review-date. No `DEFAULT_*` rate tables as pay sources — missing rate = blocking "verify via PACT" state, never a fabricated number.

---

## Red-team report

### Round 1 (deleg_7686b3f9: security / reliability / coverage)

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| S1 | Crit | Email vault: fn exists; browser 403; new authenticated RPC = oracle | **N3 re-framed** — authz inside existing fn + re-grant |
| S2 | High | `/api/db` tenant must derive from JWT; allowlist static set | Verified: leave RLS is SETOF; body tenant is context-derived; contract test added to N1 |
| S3 | High | Funding amount must validate vs resolver server-side | Already shipped W1 (tool binds resolver); noted in N5 |
| S4 | High | Money batch erodes review — split 7a/7b | **X1 split into X1a/X1b/X1c** |
| S5 | High | Sydney key hygiene protocol missing | **N6 hardened** (tmpfs/HISTFILE/destroy) |
| S6 | Med | Feature-flag tool namespace + role gate | Folded into L1 design |
| S7 | Med | leave RLS must be SETOF not ownership | Verified line 201 SETOF ✓ (no change) |
| S8 | Med | SECDEF grant audit on touched migrations | Advisor allowlist ceremony already mandatory; noted X6 |
| S9 | Med | Stored prompt injection via case-note bodies | Folded into X6 fencing |
| S10 | Low | CSP report-only now | **Promoted to X6** |
| R1 | — | 6 races not batchable; 3 lanes + restore-on-reject | **X1a/b/c** |
| R2 | — | funding_sources policy broken (`= auth.uid()` + nullable) | **N4 promoted to NOW** |
| R3 | — | recordPayment client-computed return | Folded into X1a |
| R4 | — | FO portal route already fixed | Removed from NOW (stale finding) |
| R5 | — | Sydney named-secret verify gate + order | Folded into N6 |
| C1 | — | 16/22 items missing from 0629 roadmap | **X7 subordination** |
| C2 | — | Cut conduit intake + dev-nav from NOW | Moved to Backlog |
| C3 | — | Park page-builder/MYOB/gateway | Backlog (already) |

### Round 2 (challenge pass)

1. *Is N3 minimal fix sufficient vs edge-fn?* Yes for the oracle class (ownership inside fn kills cross-user reads; browser never gets service_role). Edge-fn move logged as optional hardening under LATER security sprint.
2. *Is NOW overloaded?* 6 items (S,S,M,S–M,S,M) — N6 is the only M+ and is time-gated. Acceptable; N4/N5 are small.
3. *Does X1 splitting add PR overhead without benefit?* No — each lane has independent tests and revert isolation (RT requirement).
4. *Any unresolved issue not logged?* SEC-05 CSS adversarial + SEC-08 denylist sit in X6 (NEXT) not NOW — accepted: no active exploit path today; Jodie tools are permission-gated. Live-baseline advisor doc in X6.
5. *Stale findings check:* FO portal (fixed) and email-vault-missing (stale) removed — roadmap carries only live evidence.

## Doctrine

development first · `--merge` never squash · FF after merge · one mutation lane per repo · publish before pins · manuals = how-tos · RLS SETOF · SECDEF allowlist ceremony · no Sydney cutover without operator · no fake STA promotion · funding R80-owned · no set_current_tenant/apply_feature_migration Jodie tools
