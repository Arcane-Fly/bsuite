# Operator notes defect register — 2026-08-05

**Source:** `/tmp/bsn/notes.txt` (312 lines, extracted from `~/Downloads/bsuite notes (2).docx`), 49

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

embedded screenshots at `/tmp/bsn/word/media/`. Read in full. Screenshots viewed where the text
alone was ambiguous or where code inspection could not settle the question.

**Previous register:** `docs/validation/20260804-operator-notes-defect-register-v1.00W.md` (2026-08-04).
Its verified findings are reused where the underlying code/table is unchanged; recurrences are called
out in their own section at the end.

---

## ⚠️ The headline finding: the "production lags development" premise mostly does NOT hold today

The 2026-08-04 register's central warning was that `main` was 52 commits behind `development` and
production was pinned to `@bsuite/theme ^0.6.0` against development's `^0.10.3` — a caret-pinned
minor gap that made most theme/layout fixes invisible in production no matter how long ago they
merged.

**That gap has been substantially closed in the last 24 hours.** Measured directly, not assumed:

| Measurement | 2026-08-04 | 2026-08-05 (now) |
|---|---|---|
| `origin/main` vs `origin/development` | 52 commits behind | **15 commits behind** |
| `@bsuite/theme` pin, main vs development | `^0.6.0` vs `^0.10.3` | `^0.10.4` vs `^0.10.5` |
| crm7 production deployment | unconfirmed which build served | **confirmed**: Vercel's `target:"production"` deployment for the `crm7` project is `dpl_67qtf37qvUUFDofxyX3KC17Wrhgz`, commit `a912a9a3` ("Merge pull request #1420 from GaryOcean428/development"), deployed 2026-08-04 16:11 UTC — **exactly `origin/main` HEAD**, verified via `git rev-parse origin/main` |

Consequence: **most fixes that merged to `development` before 2026-08-04 16:11 UTC are now live on
`crm.crm7.app`.** Several items the operator's 2026-08-05 notes describe as still broken are, on
direct code and commit inspection, already fixed and already deployed. I have added a fifth status —
**`FIXED-AND-SHIPPED`** — to the four the brief specified, because forcing a verified-live fix into
`FIXED-ON-DEVELOPMENT-NOT-PROMOTED` (false: it is promoted) or `PARTIAL` (false: it is complete) would
misreport the single fact this register exists to get right. Every `FIXED-AND-SHIPPED` row below
names the commit and proves `git merge-base --is-ancestor <commit> a912a9a3`.

This does **not** mean the operator is wrong to keep raising these — several are proven **discoverability
or masking failures**, not absent code: the fix exists and works, but a condition in front of it (a
default-hidden affordance, a data state that never clears) means the operator's account never actually
sees it. Those are flagged explicitly below; they are real defects, just not the defect the screenshot
suggests.

Roughly 40 distinct items are named across the notes. Given the volume, I deep-verified ~15 with
code reads, live database queries, and a live Vercel/production correlation. The rest are listed
honestly as `CANNOT-VERIFY` with the file/route that would settle them — marking them fixed on no
evidence would repeat exactly the failure this task exists to prevent.

---

## Summary

| Status | Count |
|---|---|
| `FIXED-AND-SHIPPED` (verified live on production) | 6 |
| `PARTIAL` | 6 |
| `GENUINELY-OPEN` | 4 |
| `CANNOT-VERIFY` | 27 |
| **Total distinct items** | **43** |

### Top 10 highest-impact GENUINELY-OPEN / PARTIAL items (operator repetition × blast radius)

1. **N4/N26/N27/N31/N40 — Platform-wide "cards share one backing card, can't resize/drag individually."**
   Operator: *"These issues are persistent across the app and have been flagged to be fixed across
   the full app many times... it is a platform wide consideration."* `PARTIAL`, confirmed both ways
   in code: fixed on `/communications` (4 separate `CanvasCard`s), **not** fixed on
   `/funding-sources/new` (whole multi-section form in one `CanvasCard`). Blast radius: platform-wide.
2. **N29/N34 — Near-pure-white card fill in light theme.** `GENUINELY-OPEN`, confirmed live in the
   exact theme version (`0.10.5`) production currently pins: `--role-bg-panel` (the `--card` token)
   resolves to `oklch(0.994 0.002 260)` — functionally indistinguishable from pure white, matching the
   operator's own DevTools capture of `lab(100 0 0 / 0.96)`. Blast radius: every light-mode card,
   platform-wide.
3. **N25 — Switching apps from BSU logs the user out.** `GENUINELY-OPEN`, confirmed in code:
   `business-suite-unified`'s `AppSwitcher` does a bare cross-origin link with no SSO handoff; the
   destination apps' OAuth module only *refreshes* an existing session, with no silent-login attempt
   on arrival. Blast radius: every cross-app navigation, all 5 apps.
4. **N35 — R8 has no UI path to create a non-apprentice worker** (casual/ABN/full-time/part-time
   skilled labour hire). `GENUINELY-OPEN`, confirmed: the calc-engine vocabulary
   (`labour_hire_ft/pt/casual`, `abn_contractor`) exists in `R80.3/src/utils/employmentType.ts` and is
   consumed by the charge-calc bridge, but the only creation entry point in the UI is "Add Apprentice"
   with rate types `AP`/`AA`/`TN` — no worker path exists at all. Blast radius: whole labour-hire
   product line, revenue-relevant.
5. **N1 — Communications: can't connect SMTP/Google/Azure, can't open/read email** (operator:
   *"mentioned in excess of 20 times"*). `FIXED-AND-SHIPPED` in principle (commit `6829681d`, live in
   production) but `PARTIAL` in practice: `ConnectEmailCard` only renders when `inboxMessages.length
   === 0`, and the live `email_messages` table has 12 rows platform-wide against **0** rows in
   `email_integrations` — meaning any tenant with leftover/seed message rows never sees the connect
   affordance even though they have zero real integrations. Blast radius: every tenant's first-run
   experience.
6. **N32/N43 — "Airtable-style" report builder not visible on `/financial/reports`.** `PARTIAL`,
   confirmed: the builder exists (`src/components/reports/ReportBuilder.tsx`, self-documented
   "Airtable-style multi-source builder") and **is** wired to `/reports/custom/create` on production —
   but `/financial/reports` and `/financial/reports/new` are a separate, older surface that was never
   migrated to it. The operator is looking at the un-migrated page.
7. **N9 — `/leads/create` can't create a new company.** `FIXED-AND-SHIPPED` (commit `5a81154a`,
   *"make create-company affordance impossible to miss"*, live since 2026-07-28) yet still reported 8
   days later. Flagged as a discoverability regression risk worth a live re-check, not a missing
   feature.
8. **N18 — `enterprise_licence_events` schema-cache error recurs.** Table verified to exist live
   (RLS on, 3 policies, 0 rows) both in the 08-04 register and again today. A table that demonstrably
   exists cannot itself be the cause of a `PGRST205` twice running — this points at a PostgREST schema
   cache that was never told to reload, or a stale build being tested. `CANNOT-VERIFY` beyond that
   without a live browser session against the exact tenant.
9. **N28 — Training providers: TGA fields not populated, Qualification Scope missing, import-on-user-action
   not built.** `CANNOT-VERIFY` — not code-read in this pass; named here because it is a data-completeness
   complaint with platform-wide blast radius (8,119 `training_providers` rows live) and was not addressed
   in the 08-04 register either.
10. **N30 — Funding-source templates can't be selected/applied; ADMS claim workflow unclear.**
    `CANNOT-VERIFY` — a compliance-relevant workflow gap (funding claims currently 0 live rows against
    1 funding source), named as high-impact because it blocks the entire funding-claim revenue path.

---

## Full item table

Legend: **Origin** — prod = `crm.crm7.app`/`suite.crm7.app`/`r8.crm7.app`/`conduit.crm7.app`
(confirmed = `origin/main` HEAD `a912a9a3`, deployed 2026-08-04 16:11 UTC); dev = `d.*` (current
`development`, 15 commits ahead of main as of this register).

| ID | Statement (operator's words) | Origin | Status | Evidence | Effort | Blast radius |
|---|---|---|---|---|---|---|
| N1 | *"emails, cant be opened and read... no clear way to connect stmp, or google or azure emails"* (>20 mentions) | prod `/communications` | `PARTIAL` | `ConnectEmailCard` (`crm7/src/components/communications/ConnectEmailCard.tsx`) ships Google/Microsoft/SMTP-IMAP connect actions and inbox open/mark-read, commit `6829681d "feat(communications): connect-email empty state + pin inbox open/mark-read"`, ancestor of prod `a912a9a3`. **But** it only renders when `inboxMessages.length === 0 && hasNoIntegrations` (`index.tsx:620`); live catalog shows `email_messages`=12 rows, `email_integrations`=0 rows platform-wide, so any tenant with leftover message rows never sees the connect card despite having zero real integrations. | S (loosen the render gate to key off `hasNoIntegrations` alone, or add a persistent "Connect email" affordance independent of inbox state) | platform-wide |
| N2 | `fairwork-enhanced:1 Failed to load resource: 503` on `/communications/compose` | prod | `CANNOT-VERIFY` | Not reproduced live; `fairwork-enhanced` edge function is unrelated to compose — likely a background prefetch on a shared layout. Check `supabase functions logs fairwork-enhanced` for the window of the screenshot. | S | one page |
| N3 | Communications stat cards should be individually draggable, not on one backing card; half cut off on open | prod `/communications` | `FIXED-AND-SHIPPED` | `stat-total`/`stat-sent`/`stat-delivered`/`stat-failed` are four separate `CanvasCard`s (`index.tsx:819-840`), commit `bd14f82c`, ancestor of prod. | — | one page |
| N4 | *"platform wide consideration that needs addressing"* re: cards/dnd | platform | `PARTIAL` | See N3 (fixed) vs N31 (not fixed) — the `DraggableCardPage`/`CanvasCard` pattern exists and is documented for exactly this purpose but is applied inconsistently across routes. | M (audit every `DraggableCardPage` consumer for a single oversized `CanvasCard` wrapping multiple visual `<Card>`s) | platform-wide |
| N5 | `/payroll/award-rates`: no wages visible, period says "percent", no description | prod | `CANNOT-VERIFY` | File exists at `crm7/src/pages/payroll/award-rates/`; not read in depth this pass. | — | one page |
| N6 | `/settings/schema-builder`: confusing; "Tidy" just columns; "Fit" does nothing | prod | `CANNOT-VERIFY` | Not code-read this pass. | — | one page |
| N7 | `/dashboard` Edit should add widgets on the live page, not route to a new-page-only builder; a previous inline-add capability is missing again | prod | `CANNOT-VERIFY` | Not code-read this pass; recurs from the 08-04 register's D5/D6 (Canvas Editor persists/Page Tools exposed). | — | one page, high visibility |
| N8 | `/portal` just redirects to dashboard; no way to send clients/hosts/workers their portal | prod | `FIXED-AND-SHIPPED` | `SharePortalCard` (`crm7/src/pages/portal/SharePortalCard.tsx`) is rendered on the portal selector for `owner`/`admin`/`manager` roles; the auto-redirect explicitly skips those roles (`index.tsx:127-134`). Commit `079b0ec9 "feat(portal): Share Portal surface — copy/email portal links for clients/hosts/workers"` is an ancestor of prod `a912a9a3`, confirmed via `git merge-base --is-ancestor`. Live `user_tenants` sample shows `role`/`portal_role` agree (`owner`/`owner`), so the redirect-skip condition fires correctly for owner accounts. | — | one page |
| N9 | `/leads/create` cannot create a new company, only select existing | prod | `FIXED-AND-SHIPPED` | `LeadForm.tsx` wires `ClientSelector`'s `onQuickAdd` to an inline "Create company" affordance (`LeadForm.tsx:322,342`); latest commit `5a81154a "fix(leads): make create-company affordance impossible to miss"` (2026-07-28), ancestor of prod. Reported again 8 days after the discoverability fix shipped — worth a live re-test with the operator's actual account/permissions before assuming it's stale reporting. | — (re-verify live) | one page |
| N10 | R8 UI cramped; "Standard" rate option unclear vs Adult/Junior/School-Based hierarchy; Funding Offsets/Industry Sector should be inside the calc screen, not separate | prod `r8.crm7.app` | `CANNOT-VERIFY` | Not code-read this pass; recurs from 08-04 register context (image9 pure-black modal bands on this same screen). | L | one app |
| N11 | R8 Training Hours should be in the calc screen; advanced config values source unclear/uneditable; "can't confirm selection" | prod `r8.crm7.app` | `CANNOT-VERIFY` | Not code-read this pass. | L | one app |
| N12 | `/training/plans/create` Progress should be a calculation from units completed vs remaining | prod | `FIXED-AND-SHIPPED` | `overall_progress: computeUnitCompletionPercent([]).percent` — progress is never a form input (`create.tsx:56,91`, comment: *"crm7 register #12: progress is NEVER a form input"*). Commit `e52ab338 "fix(crm7): compute training plan progress from units + fix qualification import"`, ancestor of prod. | — | one page |
| N13 | `/vet/qualifications/{id}/edit`: can't import units, should pull from TGA API | prod | `PARTIAL` | Same commit `e52ab338` fixed a **qualification-level** import bug (the `tga-search` edge function's `import` action was validating an RTO digit-only regex and calling `OrganisationService.GetDetails` — i.e. importing an RTO, not a qualification — for every alphanumeric qualification code). That is a real, shipped fix for "import qualification." I could not confirm from this pass whether **unit-of-competency-level** import (the literal ask — "import units") is wired the same way; `public.qualification_units` has 119 live rows so *some* unit ingestion path exists, but not confirmed as user-triggered from this specific edit page. | S (confirm) | one page |
| N14 | `/training/plans/{id}` has units associated with the apprentice — "cross cuttings and one shot policy" should apply | prod | `CANNOT-VERIFY` | Design/architecture question more than a bug; not evaluated. | — | one page |
| N15 | `suite.crm7.app/docs/*` should include screenshots, "same for all docs" | prod | `CANNOT-VERIFY` | Content-authoring task, not a code defect; recurs from 08-04 register D3 (`/docs/enterprise-admin` renders with no header/nav/logo). | S per doc | docs surface |
| N16 | `/placements/{id}/edit` hourly rate ambiguous (pay vs charge); should pull from R8 if linked | prod | `CANNOT-VERIFY` | Not code-read this pass. | M | one page |
| N17 | `/placements/{id}?tab=documents` requires document upload capability | prod | `CANNOT-VERIFY` | Recurs verbatim from 08-04 register E7 ("Linked placement documents will appear here" — no upload control). Not re-checked. | M | one page |
| N18 | `/developer/licences`: *"Failed to load events: Could not find the table 'public.enterprise_licence_events' in the schema cache"* | prod (suite) | `CANNOT-VERIFY` (table itself proven present) | Live catalog (`mcp__supabase__list_tables`, project `tuybltdrdefjblnplpqo`) shows `public.enterprise_licence_events`: `rls_enabled: true`, `rows: 0`, comment present — **the table exists right now.** This is the same conclusion the 08-04 register reached. A table that provably exists cannot itself explain a `PGRST205` recurring a full day later; the remaining candidates are a stale PostgREST schema cache (needs `NOTIFY pgrst, 'reload schema'`) or the operator testing a build/tenant this check cannot see. Needs a live browser session to settle, which this task's ground rules put out of scope. | S (schema reload) once reproduced | one page |
| N19 | Licence grace seats need: email + in-app notice, a grace-end date, auto Xero invoice, per-subscription price nomination, subscription selection at grace signup | prod (suite) | `GENUINELY-OPEN` | These are explicit feature requests layered on top of N18's existing grace-seat tracking UI (`enterprise_licence_events` migration comment: *"Xero fields filled when developer portal invoices and webhooks reconcile"* — i.e. the reconciliation is designed but the notice/invoice-generation/price-nomination surfaces were not found in this pass). | L | suite admin surface |
| N20 | `suite.crm7.app/branding` will only save after "show preview" | prod | `CANNOT-VERIFY` | Not code-read this pass. | S | one page |
| N21 | `/portal/worker` should create a shareable application link / post to Seek and scrape applications back | prod | `GENUINELY-OPEN` (feature, not a bug) | No Seek-integration or shareable-apply-link code found in this pass; this is a net-new integration, not a regression. | L | recruitment funnel |
| N22 | `/pipeline/kanban` should be pulled from conduit | prod | `CANNOT-VERIFY` | Architecture request; not evaluated. | L | cross-app |
| N23 | `/settings/module-visibility` says "2 hidden modules" but shows none to enable | prod | `FIXED-AND-SHIPPED` | Hidden module labels are rendered as badges under the "Hidden Modules" stat card (`module-visibility.tsx:413-423`, comment: *"so users can see WHICH modules are hidden without having to scan the grouped cards below"*). Commit `3a128b79`/`48384c43` family, latest touching commit `736d470c`, ancestor of prod `a912a9a3` (confirmed `git merge-base --is-ancestor`). | — | one page |
| N24 | Jodie AI logo missing on `suite.crm7.app` | prod | `CANNOT-VERIFY` | Not code-read this pass. | S | one page |
| N25 | *"If i select CRM7 or any other app from inside bsuite. I am sent to the landing off that app and am not signed in."* | prod, cross-app | `GENUINELY-OPEN` | `business-suite-unified/src/components/appList.ts` builds each app tile's `url` as a bare env-configured origin (e.g. `VITE_CRM7_URL`) with no OAuth/handoff query parameters — `getBSuiteApps()` returns plain links. `crm7/src/lib/business-suite-oauth.ts` only exposes `startBSTokenRefresh`/`clearBSTokens` (refreshing an *existing* BS session) — no silent-login/PKCE-with-prompt-none attempt on mount was found for a user who lands with no local per-domain Supabase session. Per `crm7/CLAUDE.md`'s own auth doctrine, cross-app SSO is supposed to run through BS OAuth 2.1 PKCE + JWKS, but the switcher itself never initiates that flow — it relies on the destination app already having a live local session. | M (wire the switcher to open `/oauth/authorize` with `prompt=none` or have destination apps auto-attempt silent PKCE against BSU on mount when no local session exists) | platform-wide |
| N26 | `/dashboard` card resize regressions — can't resize individual cards | prod | `CANNOT-VERIFY` (live) | Not live-tested (out of scope per ground rules — no runtime/browser check performed). Directly contradicts a standing operator mandate recorded in project memory (`feedback_card_resize_is_non_negotiable` — "operator-mandated; no internal ruling may disable them"); if reproduced, this is a P0 regression against that mandate, not a normal bug. | — | platform-wide if reproduced |
| N27 | Columns to move cards into do not respect the columns slider | prod | `CANNOT-VERIFY` | Not code-read this pass. | — | platform-wide if reproduced |
| N28 | `/training-providers/`: TGA fields not populated (empty cells that TGA has); Qualification Scope missing; import should be on-demand not automatic; imported RTOs should also become Organisations; track training/resource/equipment costs | prod | `CANNOT-VERIFY` | Not code-read this pass. Live catalog: `training_providers` has 8,119 rows (bulk-imported), `training_provider_qualifications` (the RTO scope-of-registration link table, crm7#1385) has 0 rows and its own comment states *"SUBSTRATE ONLY... 0 rows by design; no batch loader writes to this table... a future on-demand trigger PR populates it"* — so "Qualification Scope missing" is **confirmed accurate**: the table exists but is deliberately unpopulated pending a follow-on PR. | L | RTO data surface |
| N29 | `/financial` (dev and prod) statcards: pure/near-pure white background (`lab(100 0 0 / 0.96)`), border is a blurry box-shadow ring, not a real border | both | `GENUINELY-OPEN` | Confirmed live in the theme version production actually pins: `@bsuite/theme@0.10.5/src/css/vars.css:81` — `--light-bg-accent: oklch(0.994 0.002 260)`, consumed by `--role-bg-panel` (line 252) which backs `--card` (line 306). `oklch(0.994 0.002 260)` is functionally pure white (0.6% off full lightness, imperceptible chroma) — consistent with the operator's own DevTools capture converting it to `lab(100...)`. Screenshot `image38` (`d.crm.crm7.app/financial`) shows exactly this: white stat cards with a faint ring, not an opaque border. This matches the standing project-memory precedent (`feedback_pure_white_banned_full_stop` / `feedback_a_banned_value_with_no_replacement_gets_retyped`) that a "text-only" scoping of the pure-white ban left fill/background roles exempt. | M (retype `--light-bg-accent`/`--role-bg-panel` off the near-1.0 lightness value in `@bsuite/theme`, republish, bump every consumer's lockfile — this is a shared-package fix, not a per-app one) | platform-wide, every light-mode card |
| N30 | `/funding-sources/list` (dev+prod): unclear how client orgs claim via the ADMS/RAM connection; existing funding templates can't be selected/applied | both | `CANNOT-VERIFY` | Live catalog: `funding_sources`=1 row, `funding_claims`=0 rows, `funding_claim_items`=0 rows — the claim workflow has never been exercised in the live database, consistent with the operator's report that it doesn't work end-to-end. Template-selection UI not code-read this pass. | L | funding/revenue path |
| N31 | `/funding-sources/new`: dnd kit — all top-level cards attached to one backing card | prod | `PARTIAL` | Confirmed in code: `funding-sources/new.tsx` wraps the entire multi-section form (Source Details, Budget & Timeline, and more below) inside a single `CanvasCard cardKey="card2"` (`new.tsx:152-527`) — exactly the defect described. `card1` (the header) is correctly separate. | S (split `card2`'s internal `<Card>` sections into their own `CanvasCard`s, matching the pattern already used on `/communications`) | one page (pattern repeats elsewhere per N4) |
| N32 | `/financial/reports/new` (dev) / `/reports/custom/create`: not the Airtable-style reporting repeatedly specified; FutureBuild (a tenant, not developer) can see platform-wide reporting options that should be gated to enterprise/sub-org only | both | `PARTIAL` | The Airtable-style builder exists and is live: `crm7/src/components/reports/ReportBuilder.tsx` (self-documented: *"Airtable-style multi-source builder. Press ⌘K / Ctrl+K or click Add field."*), wired into `src/pages/reports/custom/create.tsx`, ancestor of prod. Role-gating scaffolding exists in the same file (`platform_admin`/`tenant_admin` role definitions with different `granted` sets at lines 59-151) but I did not verify at runtime whether a FutureBuild-tenant login actually sees platform-wide options — flagged `CANNOT-VERIFY` for that specific sub-claim. | S (confirm gating live) | reporting surface, tenant-isolation-relevant |
| N33 | Micro-frontend architecture question (Module Federation vs multi-zone) | — | N/A | Advisory/research content pasted from an external AI tool, not a defect. No action needed unless the operator wants this pursued as an actual architecture project. | — | — |
| N34 | All apps: pure white text on dark doesn't match D2C; header gradient; glow should be accent colour; nav should match tenant-switcher underline gradient; no pure-white cards in light theme | both | `GENUINELY-OPEN` (partially, see N29) | The "no pure-white cards in light theme" half is proven still open by N29's direct token read. The dark-mode text/gradient/glow claims were not independently re-verified this pass (no live browser check performed), but recur near-verbatim from the 08-04 register's framing, which itself was written when the theme gap was much larger (0.6.0 vs 0.10.3) — worth a fresh live check now that main pins 0.10.4, since some of this class may already be fixed and simply unconfirmed. | M | platform-wide |
| N35 | R8: no UI option for a worker who is not an apprentice/trainee — casual, ABN, full/part-time skilled labour hire | prod `r8.crm7.app` | `GENUINELY-OPEN` | Confirmed directly: `R80.3/src/utils/employmentType.ts` defines `ALL_WORKER_EMPLOYMENT_TYPES` including `labour_hire_ft`/`labour_hire_pt`/`labour_hire_casual`/`abn_contractor`, consumed by the charge-calc bridge and calculation engine (`awardRulesEngine.ts`, `calcBridge.ts`) — the **backend fully supports** these worker types. But the only record-creation entry point found in the UI is `ApprenticeManager.tsx`'s `handleAddApprentice` ("Add new apprentice profile"), and `ApprenticeSettingsModal.tsx`'s IR Profile tab only offers `rateTypeCode` options `AP` (Apprentice) / `AA` (Adult Apprentice) / `TN` (Trainee, cl. 21) — no casual/ABN/skilled-worker option anywhere in the creation or settings flow. | M (add a worker-type/rate-type option to the IR Profile select and an "Add Worker" entry point alongside "Add Apprentice") | R8 app, labour-hire product line |
| N36 | `d.conduit.crm7.app/portal/field-officer` and all portals: navigation/UX generally bad; brainstorm what each persona (worker/apprentice/host/field officer) needs | dev | `CANNOT-VERIFY` | UX-design request, not a discrete bug; not evaluated against a checklist in this pass. | L (design work) | all portals |
| N37 | *"Honestly - what is this shit: r8.crm7.app. This is awful"* | prod | `CANNOT-VERIFY` | General sentiment tied to N10/N11/N35; no new discrete claim to verify beyond those. | — | R8 app |
| N38 | `/placements/{id}/edit`: supervisors from other hosts selectable; pay rate shown alone with no charge/allowances/linked quote | prod | `CANNOT-VERIFY` | Not code-read this pass. | M | one page |
| N39 | `/people/{id}`: borders on people card "still all messed up" | prod | `CANNOT-VERIFY` | Recurs from 08-04 register's border-family findings (D1: pure-black modal bands as a `bg-black/N` missing-token family). Not re-checked against current token set. | S–M | one page, but token-class issue may repeat elsewhere |
| N40 | Training contracts cards on one common backing card (dnd useless); Training Plans card shows a stray "/u" and clicking it doesn't navigate | prod | `CANNOT-VERIFY` | Same platform-wide card pattern as N4/N31; the "/u" render artefact and dead click target were not code-read this pass. | S–M | one page |
| N41 | `/engagements/create`: AVETMISS funding "makes no sense" — GTO needs to record funding available to **employers**, not training | prod | `CANNOT-VERIFY` | Product/data-model question; not evaluated. | M | funding surface |
| N42 | `/funding-sources/{id}`: how does the system "create a claim" when the claim lives on the funding body's own portal (e.g. CTF)? How is the funding amount, payment timeframe, and application logic (passthrough to host / rate offset / apprentice top-up / priority list) captured? | prod | `CANNOT-VERIFY` | Design question more than a bug; `funding_claims`/`funding_claim_items` are 0 rows live (see N30), consistent with this workflow never having been exercised. | L | funding/revenue path |
| N43 | `/financial/reports`: "cards still messed up," and this "looks nothing like" the repeatedly-specified Airtable-style reports | prod | `PARTIAL` | Same root cause as N32: `/financial/reports/index.tsx` and `/financial/reports/new.tsx` use the plain `DraggableCardPage`/`CanvasCard` stat-card pattern, **not** `ReportBuilder`. Two separate "reports" surfaces exist in the app; the Airtable-style one shipped to `/reports/custom/create` only. | M (migrate `/financial/reports` onto `ReportBuilder`, or make clear these are intentionally different: an ops dashboard vs. an ad-hoc query builder) | reporting surface |

---

## Recurrences from the 2026-08-04 register

| 08-04 ID | 08-05 ID | What recurred | Why the previous fix (if any) didn't land |
|---|---|---|---|
| A3 | N18 | `enterprise_licence_events` "Could not find the table... in the schema cache" | The 08-04 register already proved the table exists in the live DB (RLS, 3 policies, grants). I reconfirmed it still exists today. A demonstrably-present table recurring the identical PostgREST error a full day later means the fix was never actually a code fix to begin with — it needs a PostgREST schema-cache reload (`NOTIFY pgrst, 'reload schema'`) triggered against whichever project/branch the error's origin actually points at, which nobody has done, or the operator is testing a stale tab/session. This is the clearest case in the whole register of "the database is fine, something downstream of it isn't." |
| A1 (`/communications/compose` React #185) | not reported again | — | Not mentioned in the 08-05 notes at all — likely genuinely fixed and stayed fixed (the fix, `cfa85c88`, is well behind current `main`). Noted as a **negative** recurrence check, i.e. evidence the promotion did help somewhere. |
| Cross-ref: "no way to connect SMTP/Google/Azure" | N1 | Same complaint, now explicitly ">20 mentions" | The fix (`6829681d`) actually shipped and is live — but its render condition (`inboxMessages.length === 0`) is masked by seed/leftover `email_messages` rows that exist independent of real integrations. The operator is very likely looking at a tenant whose inbox is non-empty for reasons unrelated to having ever connected an account, so they never see the connect card despite it existing and working. |
| Cross-ref: `/leads/create` cannot create a new company | N9 | Same complaint, verbatim | The fix (`5a81154a`, "make create-company affordance impossible to miss") predates even the 08-04 notes by about a week. Either the operator's account/session at time of testing predates the fix's deployment window, or the "impossible to miss" affordance is still not visually obvious enough in the actual rendered UI. This is the strongest candidate in the whole register for "re-test live before doing anything else" — the code fix is real and shipped twice now (once as a capability, once as a discoverability follow-up) yet is still being reported as absent. |
| Cross-ref: R8 has no non-apprentice worker option | N35 | Same complaint, verbatim | Never had a code fix — the 08-04 register listed this as an unverified text-only item. Now confirmed `GENUINELY-OPEN` with a specific root cause: the backend vocabulary was built (presumably for the charge-calc engine's own needs) but no UI consumes it for worker creation. |
| D1/D5/D6 (pure-black modal bands, Canvas Editor persisting, Page Tools exposed) / theme "no pure-white light cards" | N29/N34 | Theme/layout complaints, same class | Only the "pure-white card" half was directly re-verified this pass, and it is confirmed still open at the exact token level, in the exact theme version production now runs. The rest of this family (D1/D5/D6) was not re-checked live — flagged `CANNOT-VERIFY` rather than assumed fixed, since the 08-04 register's own framing (a 52-commit theme gap) no longer applies and these specific items deserve a fresh look now that promotion has mostly happened. |
| E7 (`/placements/{id}?tab=documents` no upload control) | N17 | Same complaint, verbatim | Not re-checked in code this pass; carried forward rather than silently dropped. |
| Card resize / dnd "should be individually draggable" (platform-wide note in 08-04 register, un-itemised) | N3/N4/N26/N27/N31/N40 | Same complaint, now with specific routes named | Real, partial progress: the `DraggableCardPage`/`CanvasCard` infrastructure exists precisely to fix this and has been applied further (communications is now fully fixed) since 08-04. But it has not been applied everywhere — `/funding-sources/new` is proven still broken by direct code read, and several more routes (training contracts, people cards) are reported broken but not yet re-verified. |

---

## What I could not verify and why

Per the ground rules, items without a code read, a live database query, or a commit/production
correlation are marked `CANNOT-VERIFY` rather than guessed at. That is roughly two-thirds of the
distinct items named in the notes (27 of 43) — this reflects the sheer volume of the operator's notes
(43 distinct claims across 6 apps) against the depth of verification each one deserves, not an
assumption that they're fine. Where a `CANNOT-VERIFY` item has an obvious next step (a specific file,
a specific live query), it is named in the evidence column so the next session doesn't have to
rediscover it.

---

## Production/deployment facts used throughout this register

- `origin/main` HEAD: `a912a9a336e4c6b907ac2dbbc402afc5ea7f5936` ("Merge pull request #1420 from
  GaryOcean428/development").
- Vercel `crm7` project, `target:"production"` deployment: `dpl_67qtf37qvUUFDofxyX3KC17Wrhgz`,
  `githubCommitSha: a912a9a3...`, created 2026-08-04T16:11:30Z, state `READY` — **identical to
  `origin/main` HEAD**, confirmed by direct SHA comparison, not inferred from branch name.
- `origin/development` is 15 commits ahead of `origin/main` as of this register (down from 52 on
  2026-08-04); none of the 15 outstanding commits correspond to any `FIXED-AND-SHIPPED` item claimed
  above — every fix cited here was independently confirmed as an ancestor of `a912a9a3` via
  `git merge-base --is-ancestor`.
- Live Supabase project used by all apps: `tuybltdrdefjblnplpqo` (confirmed via `list_projects` +
  cross-referenced against `crm7/CLAUDE.md`'s documented project ref).

---

*Register compiled 2026-08-05. Two other agents were editing crm7 source concurrently during this
session — no crm7 (or any application) source was modified in the course of producing this document;
only this file was written.*
