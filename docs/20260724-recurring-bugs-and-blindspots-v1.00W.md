# Recurring Bugs & Unexamined Blindspots — BSuite

> **Naming:** `20260724-recurring-bugs-and-blindspots-v1.00W.md` · Status **W** · Discovery only (no fixes in this pass). Refined via prompt-enhancer Standard tier (`docs/plans/20260724-recurring-bugs-blindspots-refined-v1.00F.md`). Evidence window: 2026-07-22→24 ship + remaining open GH issues as of 2026-07-24.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## 1. Executive summary

The monorepo is **not randomly buggy** — it has a small set of **recurring classes** that reappear whenever a new surface is added without the permanent control that would have blocked them. The 2026-07-22→24 window closed a large batch (docs program, 48 REAL bugs, email/funding expansion, one-shot audit) but deliberately left **process debt**, **reports pipeline**, **CI false-greens**, **shared-component copy-paste**, and **auth/CSP/advisor** workstreams largely untouched.

**Top five permanent controls still missing or incomplete:**
1. Migration template / CI that **requires a leading btree index on every new FK** (pgTAP A1 caught this 3× in one session).
2. **Canonical shared UI package** for `LocalisedDateInput` (and similar) — 6 divergent copies; only crm7 fixed (#1610 still open).
3. **CI free-text-where-FK** actually blocking PRs (scripts exist per-app; still ship free-text forms).
4. **WCAG e2e that authenticates** and scans real pages (#1157 vacuous suite).
5. **Ownership-map + dry-lint as merge gate** on every new table (map updated to 84 tables this session; still lags new work).

**Top five unexamined product risks:**
1. Reports empty-params / multi:* deadlock / no direct tests (#1161–1169, #1162–1163).
2. Auth consolidation to BSU OAuth 2.1 PKCE across siblings (#1315).
3. Onboarding-360 operator + compliance checklist (#1130, #1128).
4. Gitleaks allowlist never worked (#570) — secret scanning is a false sense of safety.
5. Advisor/SECDEF backlog (#1261, #1542) + CSP tighten (#1139).

Sydney migration (#1322) is **scheduled**, not unexamined (Wed 2026-07-29 07:00).

---

## 2. HALF A — Recurring bug classes

| # | Class | Evidence (≥2) | Root pattern | Why it recurs | Permanent control |
|---|-------|---------------|--------------|---------------|-------------------|
| **R1** | **pgTAP A1 FK-index miss** | org_documents (20260724100000 backfill); email_message_links `created_by` (20260726100000 backfill); same class on earlier tables | New migration adds FK columns + some indexes, **forgets** `created_by` / secondary FKs | No migration checklist item; pgTAP only fails in CI after PR | **Migration template** section "every FK → `CREATE INDEX IF NOT EXISTS idx_<t>_<col>`"; optional pre-commit SQL lint that greps new FKs vs indexes in the same file |
| **R2** | **Free-text where entity/FK exists** (one-shot §3) | compose `recipient_id`/`recipient_name` (crm7#1199 fix); from-candidate `qualification_code` (same); braden AddClientDialog (braden#352); dry-free-text scripts exist in **all 5 apps** but still ship | Forms built with `<Input>` for IDs/names that live in tables | Selectors exist but aren't the default path; lint scripts not CI-blocking | Make `dry-free-text-where-fk-lint.sh` a **required CI job** per app; EntitySelector as the only approved pattern in AGENTS.md |
| **R3** | **RLS `TO` clause source↔prod drift** | conduit#362 (policies default `TO PUBLIC`, prod re-scoped by crm7#1164); fixed 20260725094000 | Authoring omits `TO authenticated`; later ops fix prod only | Dashboard edits / sibling migrations don't update source | Migration doctrine: **always explicit `TO authenticated`**; CI catalog diff on `pg_policies.roles` vs source SQL |
| **R4** | **Ownership-map lag** | funding_offsets, award_rate_cache, invoices/runs, tenant_role_permissions missing until dry-lint 1.0.1; leads was "shared" vs crm7 debate | New tables ship without dry-lint registration | Map is manual; no "new migration → map entry" gate | PR checklist / script: new `CREATE TABLE` must appear in `ownership-map.json` or CI fails |
| **R5** | **Copy-pasted shared UI diverges** | `LocalisedDateInput` in crm7, R80.3, conduit, BSU, braden, throughput (6 copies); only crm7 fixed ISO-on-blur (bsuite#1610, crm7#1126); R80.3 DOB wipe still real | "Copy the component" instead of `@bsuite/ui` | Fast local ship; package publish friction | Extract to `@bsuite/ui` (or dates package); delete app copies; contract test per app import path |
| **R6** | **Vitest load-dependent flakes** | people/new.test.tsx crm7#1159 (8/8 isolated, fails full suite); historical encryptionService/documentService watch class; braden jsdom flake fixed mid bug-hunt | Shared mocks / unstable refs / timing under parallel load | Full suite is the only real gate; isolated green lies | Mark load-sensitive files; run them serial or with stable `useAuth` hoist; flake quarantine job |
| **R7** | **WCAG e2e vacuity** | crm7#1157 — suite scans Supabase-not-configured error page, never a real authenticated surface | E2E without auth preflight / real route | Green CI, zero a11y signal | Playwright preflight login + target real routes; fail if title/body matches error shell |
| **R8** | **SQL linter false-greens** | crm7#1175 revoke-anon greened on `REVOKE FROM public` while anon keeps direct grant; crm7#1158 secdef search_path full-tree false green via stale-signature ALTER | Linter matches substring, not effective privilege state | Engineers trust green | Rewrite checks against live `pg_proc`/`aclexplode` semantics (or pgTAP), not source greps alone |
| **R9** | **Cross-app write / dual ownership path** | braden→clients (fixed #352); handover fn in conduit writing crm7 tables (moved crm7#1200); R80 invoices writers ambiguity | Service-role convenience + "shared project" | Works until ownership audit | dry-lint no-cross-app-write as **required** CI; edge fns live in **owning** app's `supabase/functions/` |
| **R10** | **Agent/process recurrence** | max-turns mid-lane (salvage protocol used 5+ times); Claude weekly limit mid-close-out; 6 stale worktrees outside bsuite; codehouse files written to Desktop/Dev | Lanes over-scoped; artifacts not path-constrained | Speed over hygiene | Briefs: path-scoped commits + max-turns budget; **artifacts only under bsuite/**; worktree cleanup after merge |
| **R11** | **Report params empty string vs NULL** | crm7#1161 (timesheet_summary, hours_by_work_type); related #1162 multi:* deadlock, #1163 no direct tests, #1169 delivery strip | Form seeds optional fields as `''`/`[]` instead of omitting | SchemaDrivenFilterForm spread pattern | One fix in updateField + contract tests per template; treat as **class** not one-off |
| **R12** | **Brand/a11y token drift** | braden#342–344 cluster (destructive, footer AA); crm7 chat bubble / MarkdownContent oklch literals (fixed); glow-shell dead tokens (fixed) | Hardcoded colours / arbitrary oklch instead of semantic tokens | New UI under time pressure | eslint no-hardcoded-colours + no raw oklch in JSX as CI; design-token only |

---

## 3. HALF B — Unexamined / under-looked clusters

| Cluster | Open evidence | Why it matters | Risk if ignored | Next step |
|---------|---------------|----------------|-----------------|-----------|
| **B1 Reports pipeline** | crm7#1161, #1162, #1163, #1169, #744 grid resize | Core GTO reporting; "No results" in prod with real data | Silent data miss / user distrust | **Fix lane** — SchemaDrivenFilterForm empty→NULL + multi:* + direct tests |
| **B2 CI / security instruments** | crm7#1175, #1158, #1157, #1173; BSU#570 gitleaks | Green CI that doesn't catch real issues | False confidence; secrets may slip | **Investigate then fix** gitleaks first (broken allowlist); then WCAG e2e auth; then SQL linter semantics |
| **B3 Shared date input** | bsuite#1610; R80.3 DOB wipe | Wage-floor / age-sensitive fields silently wrong | Compliance + pay errors | **Fix lane** — package extract + R80.3 DOB + delete copies |
| **B4 Onboarding-360 ops** | crm7#1130 vault key, rotate conduit; #1128 54 doc categories flags; #1127 UX polish | Production readiness for real tenants | Ops incident / compliance gap | **Operator checklist** (#1130) + compliance review (#1128) before more features |
| **B5 Auth architecture** | bsuite#1315 OAuth 2.1 PKCE across siblings | Shared Supabase user sessions across apps | Session bleed / confused deputy | **Design + phased plan** (not a drive-by fix) |
| **B6 Advisor / SECDEF / CSP** | bsuite#1261, #1542, #1139 | Security posture | Advisor noise + real SECDEF surface | **Batch allowlist + tighten** CSP as staged PRs |
| **B7 Domain products not started** | conduit#223 online assessment; R80.3#320 STP extract; attendance/MYOB backlog | Competitive capability gaps | Lost sales / manual work | **Backlog** — scope when product prioritises; not "bugs" |
| **B8 Developer portal north-star remainder** | BSU#416 nav red-team; #303 ADR-0002 schema unify; page-builder #937–940 | Portal completeness | Developer still codes | **Feature backlog** — after reports + date input |
| **B9 Sydney region** | bsuite#1322 | Latency AU + board pitch | Latency only at current size | **Scheduled** 2026-07-29 07:00 — runbook ready |
| **B10 Workflow / docs hygiene** | bsuite#1607 force_redeploy dead; #1606 doc naming 83%; #1612 lockfile churn | Agent/CI footguns | Wrong DB migrate / doc debt | **Small chores** — cheap, high leverage for agents |
| **B11 Host safety rating semantics** | crm7#1142 domain ruling | Product meaning of 7/10 | Wrong UX colour / urgency | **Operator domain ruling** only |
| **B12 Dependency majors** | crm7#836 | Supply chain / features | Slow rot | Scheduled bump windows, not emergency |

---

## 4. Recommended next 5 investigations (ordered)

| Priority | Item | One-line why |
|----------|------|--------------|
| **1** | **Reports empty-params class** (#1161 + #1162 + #1163) | User-visible prod wrongness; one form fix unblocks multiple templates |
| **2** | **LocalisedDateInput → shared package** (#1610) | Active data-corruption class (DOB wipe) across wage/age surfaces |
| **3** | **Gitleaks allowlist actually works** (BSU#570) | Security instrument is currently theatre |
| **4** | **Migration FK-index template + CI** (R1 permanent control) | Stops the 3×-per-session pgTAP failure mode forever |
| **5** | **WCAG e2e real-page auth** (#1157) + **free-text lint as required CI** | Makes a11y + one-shot §3 enforceable instead of aspirational |

Honourable mentions after those five: Onboarding-360 ops checklist (#1130), SQL linter false-green rewrite (#1175/#1158), auth OAuth plan (#1315).

---

## 5. Explicit non-goals (already closed — do not re-open)

| Closed class | Where |
|--------------|--------|
| Documentation Program L1–L4 | suite.crm7.app/docs, org docs, Jodie gap tool, contextual links |
| STA email ingestion + watcher | conduit#338, migrations + cron |
| Email entity assignment + Jodie link | crm7#1197 |
| Recruitment→employment handover + fn ownership in crm7 | conduit#372, crm7#1198/#1200 |
| Funding offsets | R80.3#345 |
| Bug-hunt 48 REAL + 35 FIXED/STALE | 6 promotion PRs |
| One-shot audit violations + reserved Feature Builder names | audit v1.00W, BSU#582, braden#352, crm7#1199 |
| Xero multi-tenant connect "block" | done ages ago; #479 closed |
| FK "leakage" FutureBuild | not a bug; closed |
| BSU VITE_STRIPE missing | false positive; closed |
| r8 slug canonicalisation | packages 1.0.0 |

---

## 6. Process blindspots (agent-caused, not product)

| Pattern | Mitigation already used | Still missing |
|---------|------------------------|---------------|
| Max-turns / weekly limit mid-lane | Salvage protocol; glm escalation | Smaller briefs; turn budget per part |
| Artifacts outside bsuite | Cleanup 2026-07-24; rule in audit | Enforce in every lane brief path list |
| Dual edge-fn ownership | Moved handover to crm7 | Checklist: "which app owns the tables this fn writes?" |
| pgTAP A1 after merge | Manual backfill migrations | Template + pre-merge SQL check |
| Trusting lane summary | Direct git + gates | Keep forever |

---

## 7. Suggested response shapes (for when you want action)

- **"Fix reports class"** → one crm7 lane on SchemaDrivenFilterForm + tests for #1161–1163.
- **"Shared dates"** → packages lane extract LocalisedDateInput + R80.3 DOB + app deletions.
- **"Make instruments real"** → gitleaks #570 + WCAG e2e auth + free-text CI job.
- **"Stop FK index misses"** → migration template + optional lint (no product UI).
- **"Run Sydney"** → already cron'd Wed 07:00; only intervene if runbook needs update.

---

*End of discovery. No code was changed in this pass beyond this document + the refined prompt plan.*


## 8. Close-out status (2026-07-24 evening)

| Item | Status | Evidence |
|------|--------|----------|
| 1 Reports empty-params | **SHIPPED** | crm7#1201, sanitizeReportParams, #1161 closed |
| 2 LocalisedDateInput shared package | **PARTIAL** | ISO blur fixed in 5 lagging apps; full @bsuite/dates extract deferred |
| 3 Gitleaks allowlist | **SHIPPED** | BSU#583, #570 closed |
| 4 FK-index migration template+CI | **SHIPPED** | check-migration-fk-indexes.mjs + crm7 db-lint.yml + docs checklist |
| 5 WCAG e2e + free-text CI | **PARTIAL** | Body-text fail-closed added (#1157 comment); migration free-text dry-lint already required CI |


## 9. World-class continuation (2026-07-24 night)

| Item | Status | Evidence |
|------|--------|----------|
| Reports multi:* deadlock #1162 | **SHIPPED** | MultiEntityIdPicker + crm7#1202 |
| Reports required-param tests #1163 | **SHIPPED** | SchemaDrivenFilterForm.multi.test.tsx |
| Report delivery empty params #1169 | **SHIPPED** | stripEmptyReportParams in report-delivery |
| force_redeploy / migrate ref #1607 | **SHIPPED** | default false + PROJECT_ID guard; bsuite#1635 |
| Doc naming CI #1606 | **SHIPPED (warn-only)** | check-doc-naming.mjs + workflow |
| Gitleaks #570 | **SHIPPED** | earlier |
| WCAG vacuity #1157 | **CLOSED** | body-text + markers + key fix |
| Braden eslint path #571 | **CLOSED** | already isBradenSubmoduleFile |
| Env #607 | **CLOSED** | false positive |
| Dates ISO blur #1610 | **SHIPPED (partial extract)** | tryParseIsoFallback all apps + tryParseCalendarDateToIso in @bsuite/dates@0.1.1 |
| Secret-naming CI | **FIXED** | ANON→PUBLISHABLE handover; api allowlist docs-gap |
| E2E schema-builder auth flake | **FIXED** | skip on oauth redirect |
| Full LocalisedDateInput package extract | **DEFERRED** | needs shared calendar/popover in @bsuite/ui |
| Feature backlog (page-builder, STP, assessment, OAuth #1315, Sydney #1322) | **OPEN product** | not bug debt — schedule separately |
| SQL linter false-greens #1175/#1158 | **OPEN** | next instrument pass |
| people/new flake #1159 | **OPEN** | load-sensitive quarantine next |
| Advisor/SECDEF/CSP #1261/#1542/#1139 | **OPEN** | security backlog |
