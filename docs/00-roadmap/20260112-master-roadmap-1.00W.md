# Master roadmap — BSuite (planning layer)

> Companion to `docs/20260227-bsuite-master-roadmap-v5.00W.md`  
> Last updated: 2026-07-26 · **Sydney cutover (Wed 2026-07-29) is operator-gated and EXCLUDED from this plan**  
> Method: planning-and-roadmapping + multi-agent-red-team-planning (**2 rounds complete**)

## Completed recently (2026-07-25 → 2026-07-26)

- [x] Excellence close-out W1–W6 (ui sanitize publish 1.0.1, enterprise Jodie list/create, KAP resolveSchemeAmount AU-day, funding UNIQUE+upsert+financial gate, pin train ^1.0.1 ×5 apps, parity matrix truth, manuals Jodie honesty)
- [x] Host capacity gate + Jodie leave/FO tools (crm7#1207)
- [x] Field-officer portal route — **verified already registered** (`App.tsx:3194`); excavation P0-2 stale

## In Progress

- (none — awaiting plan approval)

---

## Planned — NOW (week 1: live bugs + hygiene)

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
