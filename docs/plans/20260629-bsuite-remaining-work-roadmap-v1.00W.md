# BSuite Remaining-Work Roadmap

> **SUBORDINATED (2026-07-27):** The canonical master is `docs/00-roadmap/20260112-master-roadmap-1.00W.md`. This 0629 doc is retained for historical phase context only; its open items have been re-validated in the 2026-07-27 full close-out sweep. Do not execute from this doc without checking the master first.

> **Naming:** `20260629-bsuite-remaining-work-roadmap-v1.00W.md` · Status **W** (Working) · Authority for "what's left" across all 7 repos as of 2026-06-29.
> **Source-of-truth pairing:** this doc curates the prioritised plan; the live dashboard (`docs/dashboard/`) + `gh issue list` per repo are the machine-truth. Reconcile both when items move.
> **Skill to execute each item:** `executing-plans` / `subagent-driven-development`; per-item skills are named inline. Every DB item = floor-gated migration + `get_advisors` triage; every user-facing item = §12.3 deployed signed-in verify.
> **Staleness note (2026-06-29 post-regression):** §0 state claims were written before the submodule-pointer regression was discovered and fixed (PR #1558/#1559). Re-verify all alignment claims before relying on them. The verification recipe must check BOTH branch SHAs AND parent gitlinks — see continuation prompt.

---

## 0. State as of 2026-06-29 (what is DONE)

- **Recruitment-comms + RAMS cluster (conduit #221/#225/#227/#229)** — SHIPPED + signed-in prod-verified; all 4 closed. Cron Vault seeded; advisors clean.
- **Post-ship batch (2026-06-24):** conduit#334 (revoke EXECUTE on `r7_emit_stage_transition_event`) done; conduit#233 (all `r7_*.status` CHECK + TS enums) verified+closed; **matcher latent bug fixed** (conduit#336 — queried non-existent `r7_jobs.qualification_area/trade`, 500 on any populated tenant; now resolves the linked qualification; live-verified); **per-user FO identity link shipped** (crm7 `field_officers.user_id` #1089 + conduit FO portal auto-scope #337, signed-in-verified).
- **Branch hygiene (2026-06-29):** all 7 repos `development == main` aligned; 17 cron-log/claude-loop artifact issues closed; cluster plan promoted W→A.
- **RBAC parity (2026-06-29, Batch D fixes):** all five world-class-audit parity gaps **WC-008…WC-012 fixed in code** (operator-approved). WC-008 migration drops the dead `super_admin` branch in `is_platform_admin()`; WC-009 aligns crm7 `isPrivileged` to `{developer,tester,platform_admin}` (= conduit + DB); WC-010 renames the portal-role token `host_employer`→`host_contact` suite-wide (the tenant_type `host_employer` is unchanged); WC-011 adds `worker`/`viewer` to the app `PortalRole` union + routes `worker`; WC-012 switches conduit tenant-context reads (`useTenantId`/`getTenantContext`/`middleware`) to canonical `portal_role`. Evidence: audit tracker §WC-008…012 + parity matrix §3/§3.1. Batch E live `d.*` validation gates any merge to main.
- **Auth (2026-06-29):** `supabase-auth-comprehensive` audit verdict **COMPLIANT** — all 6 apps pass the canonical doctrine (no forbidden patterns, `flowType:'pkce'`, callback `setSession`+`getSession`-poll bridge, `startBSTokenRefresh` wired, `oauth-contract.test.ts` present, BSU-only consent, `@bsuite/auth` uniformly exact-pinned `0.2.6`, `oauth-callback-must-bridge` lint wired). Minor non-security drift only → see §5.

Open-issue counts (post-cleanup): bsuite 30, crm7 ~31 (incl. #1090), conduit 5, BSU 4, R80.3 3, braden 3, throughput 0.

---

## 1. NOW — autonomous (unblocked, no human review needed)

### Task: conduit recruitment intake chain (#219 → #218 → #231)

- **Owner (DRY):** conduit (recruitment); #231 cross-reads CRM7.
- **Description:** #219 candidate schema (APP consents + working rights + EIS demographics) → unblocks #218 public in-portal apply form (anon capture + dup detection) → #231 CRM7 reads conduit candidate data via Supabase cross-schema view or API (DRY-compliant — no snapshot/mirror table).
- **Rationale:** completes the front of the recruitment funnel; #231 is the DRY cross-app read to CRM7 placements.
- **Dependencies:** #218/#231 depend on #219.
- **Acceptance:** candidate schema migration live + Zod/TS mirrors; public apply form submits + dedups; CRM7 reads the full candidate+application tree via cross-schema view/API (no copied data); CRM7 placements surface the candidate.
- **Validation loop:** §9.1 (schema/dedup) + §9.2 (public form, mobile 375/768/1440) + §12.3 signed-in.
- **Skills:** `nextjs-app-router`, `forms-and-validation`, `dry-one-shot-architecture`, `supabase`, `supabase-postgres-best-practices`, BrowserBase.
- **Complexity:** High. **Status:** Not started.

### Task: BSU developer-nav rebuild to Red-Team UX Doctrine (#416, P1)

- **Owner:** business-suite-unified.
- **Acceptance:** §9.2 visual-equivalence vs doctrine; nav discoverable, mobile-usable.
- **Skills:** `bsuite-design-sheriff`, `ui-ux-pro-max`, `shadcn-ui`. **Complexity:** Medium. **Status:** Not started.

---

## 1b. NOW — requires Braden domain review (do NOT proceed without review)

### Task: CRM7 entity-entry wizards (#659 people, #660 host-employers, #661 RTO unify, #662 units of competency)

- **Owner:** CRM7.
- **Description:** RHF + draft-autosave wizards; host ABN auto-populate + multi-site; RTO unify + non-TGA inline-create + AASS provider entity; surface units of competency.
- **Rationale:** P1 data-entry UX; DRY "enter once" entity ownership.
- **Acceptance:** each wizard persists via the owning entity's CRUD; no duplicate free-text entity fields; inline-create works.
- **Validation loop:** §9.2 (wizard flow) + §9.1 (persistence) + §12.3.
- **Skills:** `forms-and-validation`, `tanstack-query`, `dry-one-shot-architecture`, `shadcn-ui`, `best-practice-research` (domain rules — Braden review).
- **Complexity:** High. **Status:** Blocked on Braden domain review.

### Task: CRM7 forward-year charge schedule + annual-review gate (#678)

- **Owner:** CRM7 (+ `@bsuite/charge-calc`).
- **Description:** forward-year charge schedules with FWC/EBA annual-review-only re-approval gate.
- **Rationale:** compliance-critical billing (BOOT-adjacent); Braden domain review required.
- **Acceptance:** §9.1 output-equivalence vs current charge calc on a representative set; re-approval gate blocks unreviewed rate changes.
- **Skills:** `best-practice-research`, `dry-one-shot-architecture`, `supabase`. **Complexity:** High. **Status:** Blocked on Braden domain review.

---

## 2. NEXT (queued; depends on a Now item or is P1 but lower-leverage)

### Task: CRM7 GTO compliance reports (#528 Portable LSL, #530 host monthly pack, #531 NSGTO Std 2, #532 STP2 allowances, #533 s.535 retention)

- **Owner:** CRM7. **Rationale:** GTO catalogue P1 gaps; competitive + audit value.
- **Acceptance:** each report generates from live data (no mocks); §9.1 against a seeded dataset; export formats validated.
- **Skills:** `data-export`, `supabase`, `best-practice-research` (Fair Work / NSGTO / ATO specs). **Complexity:** High (each M/L). **Status:** Not started.

### Task: R80.3 payroll/invoicing chain (#320 → #321 → #233)

- **Owner:** R80.3 + shared `@bsuite/stp`.
- **Description:** extract `@bsuite/stp` (DRY STP Phase 2 code tables) → hydrate R80.3 payroll composer from CRM7 via personId → GTO per-host weekly invoicing.
- **Dependencies:** #321 depends on #320 (package); follows §12.2 consumer-chain on publish.
- **Acceptance:** package published + consumed; payroll composer reads CRM7 source (DRY, no mirror); invoice runs match charge calc.
- **Skills:** `dry-one-shot-architecture`, `charge-calc`, package publish chain. **Complexity:** High. **Status:** Not started.

### Task: conduit#338 — lodgement + talent-match outcome lifecycle  ⚠ EXTERNAL-DEP

- **Owner:** conduit. **Blocker:** needs the RAMS/AASN lodgement **status-check / callback API contract** (endpoint, auth=RAM M2M, payload, status enum) — not in `.env.local`/docs. **Do not build speculatively.**
- **Acceptance:** a fixture RAMS response flips `r7_offers.lodgement_outcome` pending→final, idempotent. Interim: manual staff status-transition path.
- **Skills:** `best-practice-research`/`firecrawl`/`Tavily` (RAMS/WAAMS contract), `supabase` (edge-fn + pg_cron), `security-audit`. **Complexity:** Medium. **Status:** Blocked (external contract).

### Task: crm7#1090 — FO admin-link UI + tenant-scope the loose `field_officers` RLS

- **Owner:** CRM7. **Description:** admin UI to set `field_officers.user_id`; tighten `authenticated_manage_field_officers` (currently `auth.uid() IS NOT NULL`, NOT tenant-scoped) to tenant scope; optional conduit selector restriction for linked non-admins.
- **Acceptance:** §9.1 pgTAP (tenant A cannot read tenant B's FOs; auto-scope still works); §9.2 admin link UI; advisor sweep clean.
- **Skills:** `supabase`, `bsuite-auth-guardian`, `shadcn-ui`, `dry-one-shot-architecture`, BrowserBase. **Complexity:** Medium. **Status:** Not started.

### Task: conduit#223 — online assessment integration (provider-agnostic)

- **Owner:** conduit. **Skills:** `supabase`, `dry-one-shot-architecture`, `best-practice-research`. **Complexity:** Medium. **Status:** Not started.

---

## 3. LATER (P2 / infra / integrations)

- **CRM7 Xero cluster (#556–#565)** — idempotency keys, webhooks, audit log, shared rate-limit, stale-connection detection, multi-org UI. **Gated on operator unblocking #479 (Xero app registration).** Skills: `xero-integration`, `security-audit`.
- **CRM7 portal/FO-KPI children (#665, #667 + child issues #723–#734)** — portal-role OAuth scopes, FO KPI rollup, state incentive adapters, completion-rate analytics. Skills: `supabase-auth-comprehensive`, `supabase`, `dry-one-shot-architecture`.
- **bsuite#1315** — move all siblings fully onto BS OAuth PKCE tokens (eliminate shared Supabase user session). Skills: `supabase-auth-comprehensive`, `security-audit`.
- **bsuite#1139** — tighten CSP from permissive baseline. Skills: `security-audit`.
- **bsuite#635** — Unified Design Language 9-wave rollout. Skills: `bsuite-design-sheriff`, `ui-ux-pro-max`.
- **bsuite#1505** — deferred hardening Phase 1/3/4. Skills: `code-quality-enforcement`, `supabase`.
- **bsuite page-builder feats (#937/#938/#939/#556)** + **#557/#940 Jodie GitHub App**. Skills: `vercel-ai-sdk`, `supabase`.
- **braden visual layout editor (#264 DnD, #265 permissions, #266 publish)** — BL-008 children. Skills: `dnd-kit`, `shadcn-ui`, `bsuite-auth-guardian`.
- **BSU #508 branding cascade, #432 org self-delete, #303 ADR-0002 schema unify.**
- **CRM7 #619 scroll regression, #659 wizard scroll, #744 grid resize, #664 billing traceability, #480/#481/#475/#476/#477/#484/#485 Phase-2 wiring.**
- **bsuite#691 Stripe FDW, #570/#572 payroll/timesheet parity (MYOB/Astute adapters, geo-fence kiosk).**

---

## 4. BACKLOG / PARKING LOT

- E2E testing re-evaluation (Autonoma removed 2026-05-13; alternatives: Playwright smoke, Vercel Agent Review).
- crm7#836 dependency hygiene (6 packages 1–2 majors behind).
- crm7 #866 fair-work-inspector access bug (dev), #1029/#1030/#1031 dev-smoke findings (re-verify; may be stale).

---

## 5. AUTH HYGIENE FOLLOW-UPS (from the 2026-06-29 compliance audit — non-security)

- **D1 (conduit):** installed `@bsuite/dry-lint` lags `package.json` (0.4.0 vs 0.5.0); lockfile correct → `pnpm install` from outside the bsuite tree (lockfile-generation discipline). **Low.**
- **D2 (R80.3 `AuthCallback.tsx:11`, conduit `auth/callback/page.tsx:23–44`):** stale JSDoc says "sessionStorage" but runtime correctly uses `localStorage` for `bs_oauth_state` (PKCE Storage Doctrine 0.2.2+). **Cosmetic doc fix.**
- **F1 (conduit/R80.3/throughput):** no custom `storageKey` → share the default `sb-tuybltdrdefjblnplpqo-auth-token` (vs CRM7 `sb-crm7-auth`, BSU `BSU_STORAGE_KEY`). Not a security issue (separate subdomains) but no native-session isolation. Decide whether to standardise per-app `storageKey` across all clients. **Low/design.**

---

## 6. OPERATOR-BLOCKED (cannot self-resolve)

- **bsuite#1322** — migrate Supabase to ap-southeast-2 (Sydney) before the MBAWA board pitch (P1, data-residency).
- **crm7#479** — Xero app registration + flip `feature_flags.xero_integration` (unblocks the Xero cluster).
- **bsuite#607** — BSU missing `VITE_APP_URL` + `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel env (P1, quick add).
- **conduit#338** — RAMS lodgement status-check/callback contract (see §2).

---

## 7. Execution doctrine (every item)

1. Project family = BSuite; invoke `master-orchestration` first; re-inventory skills/MCPs per phase.
2. DB → floor-gated migration (≥`20260611000000`) via the `supabase-migrate.yml` psql pipeline; verify live catalog; `get_advisors` triage + allowlist new SECURITY DEFINER fns. **Rollback:** if a migration breaks a tenant, `supabase migration repair --status reverted <migration_id>` then re-apply the prior floor; document the rollback procedure in the PR description BEFORE applying to prod.
3. **Parent commit discipline:** before ANY parent commit, run `git diff --cached --stat` and verify ONLY the intended files are staged. `git commit -m` without a pathspec silently stages drifted submodule gitlinks (caused a real regression 2026-06-29). Always use `git commit -m '...' -- <pathspec>` or verify `--cached --stat` first.
4. **Alignment verification (both axes):** every cycle, verify (a) app-repo `dev == main` via `gh api repos/GaryOcean428/<repo>/branches/<b> --jq .commit.sha` AND (b) parent gitlink SHA matches app-repo HEAD via `gh api repos/GaryOcean428/bsuite/contents/<submodule> --jq '.sha'`. Branch SHA equality alone does NOT prove the parent gitlink is correct.
5. User-facing → §12.3 deployed signed-in verify on `d.*`/prod via BrowserBase (test creds: `braden.lang77@gmail.com`); seed REAL data and exercise the populated path ([[feedback_prod_validation_catches_empty-data_bugs]]).
6. Cross-app reads (DRY one-shot) — owning app provides CRUD; others read + link.
7. Parent pointers don't auto-track app dev→main; reflect via `update-index` + commit index (no pathspec) per [[feedback_parent_pointer_reconcile_gotchas]].
8. Maker → independent Verifier → merge; `--merge` not squash for sync PRs.
