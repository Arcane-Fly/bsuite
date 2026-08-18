# Operator directive — notes backlog coverage and remediation

**Date:** 2026-08-13
**From:** Operator (Braden)
**To:** all lanes
**Source:** `bsuite_notes.docx` — four dated sections, ~90 distinct defects observed in the live product between the undated first section and 13 August 2026.
**D-series continues from D-58.**

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 0. Coverage verdict

I asked whether everything before today's entries had been addressed. It has not. The measured position:

| | Count |
|---|---|
| crm7 issues **closed** since 9 August | 15 |
| crm7 issues **filed** in the same window | ~130 |
| Notes-document defects **closed** | ~8 |
| Notes-document defects **filed and still open** | ~14 |
| Notes-document defects **never filed at all** | **~40** |
| R80.4 open issues, total, in the entire repo | **3** |

**D-59. The distinction that matters: filing is not addressing.** A large fraction of what I reported was converted into a well-written issue and then left. That is a real improvement over silence and it is not the same as the defect being gone. From here, "addressed" means closed with §9 evidence, and status reports must use the word that way.

**D-60. The unfiled forty are the worse half.** Verified absent from every repo's issue list: the platform-wide card/drag-drop defect, the entire R8 regression cluster, the portal-invitation gap, cross-host supervisor exposure on placements, platform-scope leakage into tenant surfaces, TGA training-provider scope, the funding-claim mechanics, and the ADMS/RAMS question. An unfiled defect cannot be prioritised, assigned or closed — it is invisible to every process this estate runs.

---

## 1. Constraints

**D-61. This directive supersedes the D-34 filing freeze for its own contents.** Filing the §5 set is required work, not an exception to be justified.

**D-62. Fix the class, not the page.** From the notes: *"These issues are persistent across the app and have been flagged to be fixed across the full app many times. Typically the fixing agent fixes that page I've pointed to but I have always said it is a platform wide consideration."* A PR that fixes only the URL I named is a failed PR. Every fix in §4 must state how many surfaces it covers and how the remaining ones were enumerated.

**D-63. Regressions outrank new work.** Anything in §3 marked *was working before* is a regression introduced by a refactor or a repo move. Restoring lost behaviour comes before adding anything.

---

## 2. P0 — this week, before anything else

**D-64. Secrets rendered in the UI.** The Fairwork MAPD card on `d.r8.crm7.app` displays Proxy URL, proxy token and subscription key in the interface. Treat as a credential exposure: remove from the client bundle, rotate the subscription key and proxy token, confirm the key was never committed or shipped in a build artefact, and confirm the server-side proxy is the only holder. The whole point of `auth-fairwork` was that the key never reaches the browser.

**D-65. Cross-host supervisor exposure.** On `/placements/:id/edit`, supervisors belonging to other host employers are selectable. One client can see another client's staff names. Scope the selector to the placement's host, and audit every other selector on that page and its siblings for the same defect — this is an RLS or query-scope fault, not a UI fault, and it will not be alone.

**D-66. Platform scope visible to tenants.** Three instances, same defect: the custom report builder offers platform-wide reporting when signed in as FutureBuild; `/admin/permissions` exposes platform-admin rows to enterprise tenants; `/admin/branding` and `/admin/platform-kit` expose platform-level surfaces. **Nobody but a developer account may hold platform-level visibility of any kind.** Move platform branding and platform kit into the Developer Portal, which already has the capability. Then sweep every feature in every app for the same pattern and report the count — per my note, this is worth a full sweep, not three fixes.

---

## 3. The R8 regression cluster

Largest single block in the notes and almost entirely unfiled. R80.4 carries three open issues for a calculator whose core outputs are wrong.

**D-67. File every item below as its own issue in R80.4 before starting, so the work is visible.**

**Regressions — these worked before the move into submodules:**

- Apprentice % of Standard Rate always displays $29.54 regardless of the award loaded.
- Wages per apprenticeship year always display Yr1 14.725 / Yr2 17.67 / Yr3 20.615 / Yr4 26.505 regardless of award selection.
- All award allowances resolve to Building and Construction regardless of award.
- Allowance percentages per year all display 100% when the award API supplies the real percentages, which are referenced in `R80.4/awards/*`.
- No trade selector for MA000036 — the trade list, allowance bands and clause references shown are MA000020's and do not carry across awards.
- The plumbing award surfaces Building and Construction content.

**Never worked:**

- No commercial construction sector. It takes residential hours and penalty conditions with civil's industry allowance — that combination exists and is not currently expressible.
- Only 3- and 4-year apprenticeships are offered. Traineeships and labour-hire workers cannot be priced.
- No option for workers who are not apprentices or trainees — casual, ABN, full-time or part-time qualified workers, which is the labour-hire case.
- Selecting an award in "Award, Trade & Qualification" does not populate the award in the Fairwork MAPD card, and the reverse also fails.
- Standard Rate, Apprentice % of Standard Rate, and Source do not update on award selection.
- Occupation and Qualification are not settable in the UI, and it is not clear that setting occupation is what distinguishes bricklaying from carpentry.
- No quote export. Quoting is the product's purpose.

**Corrections to shipped copy:**

- "Unsuspended" is not a word. The states are Active and Suspended.
- The shift-loading note is wrong: commercial construction takes the same shift structure as residential and the same industry allowance as civil.

**Design rulings:**

- **D-68. Remove competency-based progression from the calculator.** I did not approve it and have said repeatedly that it is not the calculator's job. The calculation is point-in-time: what is a 1st, 2nd, 3rd, 4th year apprentice worth *now*. Future award increases are Fair Work's to set and cannot be forecast. Published statutory increases such as the super rate can be. Competency-progression records, anniversary reminders and change-of-year notices belong in crm7 against the person and host records — see D-77.
- **D-69. Funding milestones must not be pre-populated.** Empty, with placeholder text naming the field.
- **D-70. Allowance UX.** Do not display every allowance. Show only those added to base wage by default to derive the ordinary rate, clearly marked as such. Everything else is added from a dropdown of available allowances — award API, EBA, or custom — and each addition creates its own calculation line and expands the card. Same interaction shape as funding, except funding is free text and allowances come from a source.
- **D-71. One card for everything that affects the calculation.** Funding offsets and training hours are currently separate pages; they belong in the calculation itself. Base Rate and Ordinary Rate must be distinguishable, with the header showing occupation and qualification and the contributors to the ordinary rate named — for building and construction, industry allowance and tool allowance.
- **D-72. `/home/braden/Downloads/charge-calculator-mapd.jsx` is the reference layout.** It is a demo, it does not handle bulk creation and its values are hardcoded, but the visual arrangement and the calculation are both better than what shipped. Read it before redesigning.
- **D-73. The product is "R8" in all UI.** The repo is R80.4 because it is version 0.4. Already enforced by `bsuite/no-user-visible-r80`; keep it that way.

---

## 4. The platform-wide surface defects

These are the ones I have raised most often and which keep being fixed one page at a time.

**D-74. Cards share a common backing card, so drag-and-drop moves them as a group.** Present on `/communications`, `/funding-sources/new`, `/people/:id`, `/financial/reports`, and — per D-62 — an unknown number of others. Top-level cards must be individually draggable. The dashboard shows the correct arrangement. Enumerate every surface, state the count, fix them together.

**D-75. Card resize regression.** Individual cards can no longer be resized. This worked. Columns available to move cards into do not respect the columns slider.

**D-76. Cards render half cut off on page open.** Persistent, multiple surfaces.

**D-77. Edit-in-place on the page I am already on.** The dashboard edit action opens the page builder on a new screen and offers only the creation of an entirely new page. We recently had on-page element addition and it has been lost again. Every option should be editable on the current page unless a new page is explicitly wanted.

**D-78. Theme, all apps.** Pure white text on dark surfaces does not match D2C. Dark-theme header text should carry the gradient currently shown only on the CRM7 wordmark. Glow should be the accent colour's glow. Navigation should match the gradient of the tenant-switcher underline. Card and page headers must be themed, never pure white or pure black. No light-theme card may be pure white — the statcard diagnostic in the notes identifies `lab(100 0 0 / 0.96)` as the cause, and lightness near 98 as the fix, but apply it through the theme tokens rather than as literal CSS.

**D-79. Airtable-style reporting.** Specified in docs, planned, and directed repeatedly. `/financial/reports`, `/financial/reports/new` and `/reports/custom/create` are none of it, and `/financial/reports/new` is a second hardcoded report builder (crm7#1568). Reference implementations for study are listed in the notes; nocodb is the closest. Report scope must be gated per D-66.

---

## 5. File these — verified absent from every repo

**D-80. Each gets its own issue with labels verified first.** Grouped by owner.

**crm7 — data and flow**
1. `/leads/create` cannot create a new company, only select an existing one. Breaks the flow at the point of first contact.
2. `/portal` redirects to the dashboard. There is no way to send a client, host employer, worker, apprentice or trainee their personal portal. This is a whole missing capability, not a routing bug.
3. `/portal/worker` should generate a link that can be placed in a job advertisement and carry a candidate into an application — or post directly to SEEK and equivalents with profile scraping and application import.
4. `/pipeline/kanban` should pull from conduit rather than holding its own.
5. `/settings/module-visibility` reports two hidden modules and shows nothing selectable. There is no way to enable a module.
6. `/payroll/award-rates` shows no wages, "percent" as the period, and no description.
7. `/engagements/create` — AVETMISS funding framing is wrong. A GTO records funding available to *employers*, not to training.
8. Training-plan units appear associated to the apprentice — cross-cutting and one-shot policy both apply.
9. Client-to-host update bug; leads-to-clients-to-host-employers one-shot compliance.
10. People card borders are broken; the training-plans card shows a stray `/u` and does not navigate.

**crm7 — funding**
11. How does the system "create a claim" when the claim lives on CTF's portal? Only federal claims have a direct connection, via ADMS.
12. No way to enter the funding amount, payment timeframes and dates, or how it is applied — passthrough to host, offset against rates, passthrough to apprentice, wage top-up, or custom priority categories.
13. RAMS is configured for ADMS. How do client organisations use our connection to claim for their apprentices? Requires research into the federal ADMS data specification.
14. How is funding continuously validated as priorities and sources change over time?
15. Existing funding templates cannot be selected or applied.

**crm7 — TGA and training providers**
16. Training-provider records leave TGA-available fields empty. Qualification scope — what the RTO actually delivers — is missing entirely.
17. All TGA providers should be importable on user action, not pre-loaded.
18. Imported providers should become Organisations with additional contacts and detail beyond the TGA payload, and should track training costs per registered apprentice plus resource and equipment costs.
19. The most recent entry per qualification type is authoritative and should be importable into R8 during rate calculation.

**crm7 — identity and records**
20. Database UUIDs display as the user-facing ID. Once placed, an Employee ID exists; Training Contract ID and USI should also be available as primary identifiers.
21. Change-of-year records, wage-anniversary reminders and notices to apprentice and host — the crm7 half of D-68.

**business-suite-unified**
22. `enterprise_licence_events` does not exist in the schema cache; the licence grace-seat panel fails to load.
23. Grace invites need an email and an in-app notice through the notices system, an end-date warning to the grace user, an auto-generated Xero invoice, a place to set the price of additional seats per subscription type, and subscription-type selection at grace signup.
24. `/branding` only saves after "Show preview" is clicked.
25. Jodie AI logo missing on suite; should match crm7.
26. Selecting another app from inside BSuite lands on that app's marketing page, signed out. Session must persist across app switches.
27. Documentation pages need screenshots — all of them.
28. `/developer/tables` needs the treatment described in the notes.

**Cross-app**
29. `fairwork-enhanced` returns 503 from `/communications/compose`.
30. There is still no clear way for a client to connect SMTP, Google or Azure email and send from their own account. Raised more than twenty times.

---

## 6. Portals — a brainstorm, not a fix list

**D-81. The portals need redesign, not repair.** My words: the navigation and UX are bad and the portals do not work. Field officer, host, worker, apprentice and trainee portals are largely the same shape and should be reasoned about together.

Take the persona of each external user and work out what they need to accomplish. Workers and apprentices: upload employment documentation, provide financial details once employed, submit timesheets, browse and apply for roles, see payslips and entitlements. Hosts: approve timesheets, see invoices and the charges behind them, manage placements and supervisors, meet WHS obligations. Field officers hold GTO access like any other GTO employee — I am not clear what a separate field-officer portal achieves, and that question should be answered before it is rebuilt.

**D-82. Read the Codehouse document and study how they lay out their workforce-one system** before proposing a navigation model. The current experience requires constant re-orientation between pages.

---

## 7. Blocked on me

**D-83. The frozen placements.** The 31 July `NOT VALID` CHECK constraint has frozen 21 rows against any update, including eight FutureBuild placements — every placement Caris has. The analysis in the notes is sound: the eight snapshots carry `source = 'custom'`, no engine version, no wage, overhead or margin, and `calc_inputs` reading `_reconstructed`. They were typed by a human, so recording them as `manual` states what happened rather than inventing a resolution.

**Proceed with the nine NULL-status rows** — eight FutureBuild plus one Braden Group — dry run first, output for review before commit. **Do not touch the twelve `unresolved` rows in bsuite Platform**: `unresolved` means resolution ran and failed, and that is a real signal in my own demo tenant. **Do not drop the constraint.** The rule is correct; only its application was wrong.

**D-84. Documents.** Users must not have to know code, and markdown is too much. `/documents/collaborative` must go per RULING 5.2. What is needed instead: upload an existing Word document, edit it, insert merge fields. This needs a deep read of the existing specs and a full UX pass before any code.

---

## 8. Sequence and reporting

1. §2 — three P0s. Credential rotation first.
2. §3 — R8 regressions before R8 gaps.
3. §4 — the platform-wide surface defects, each fixed as a class with a stated surface count.
4. §5 — file the thirty. Filing is this week's work; fixing is scheduled after.
5. §6 — brainstorm, produce a document, no code until I have read it.

**D-85. Report in the same shape I gave you.** Per item: closed with evidence, open with an owner and a date, or not started with a reason. Do not report a filed issue as an addressed defect. If an item in this directive is already fixed and I missed it, say so and link the evidence — I would rather be corrected than have work repeated.

---

## 9. CI and workflow hardening (added 2026-08-13)

Six findings from workflow review. I have verified each against `bsuite@development` before writing it in. **Two of the six recommend the wrong fix**, and in both cases the real defect is larger than the one reported — read D-86 and D-87 before touching anything.

### D-86. Migration-rehearsal checkout: keep the PAT, add the assertion the workflow is missing

**Reported:** `token: ${{ secrets.BSUITE_CROSS_REPO_PAT || secrets.GITHUB_TOKEN }}` on `pull_request` grants broader access than needed; prefer `GITHUB_TOKEN` by default.

**Do not apply that fix.** `theme-conformance.yml` records why, in the estate's own words: *"Every app is a PRIVATE submodule, so the default GITHUB_TOKEN cannot clone them — it fails with a bare 'Repository not found', which reads like a typo rather than a permissions problem."* `GITHUB_TOKEN` is scoped to the current repository only. Preferring it would make `submodules: recursive` silently fetch nothing, and the rehearsal would replay the parent's 22 migrations and none of the other 754.

**The real defect is the sibling bug the review missed.** `theme-conformance.yml` follows its PAT checkout with an explicit assertion that all six submodules are present, because *"the scanner would report a LOW count for missing apps — a false pass, which is worse than a failure."* **`supabase-migration-rehearsal.yml` has no such assertion.** If the PAT is absent, expired, or unavailable, the rehearsal checks out no submodules, replays almost nothing, finds no problem, and reports green. A migration-rehearsal gate that passes when it rehearsed nothing is the exact failure class in §1 of the stabilisation directive, in the workflow built to cure it. This also connects to bsuite#1781, where the PAT gap already makes two other workflows never run.

**Do:**
1. Add the submodule-presence assertion to the rehearsal workflow, copying the pattern from `theme-conformance.yml`. Fail loudly, naming the missing scopes and the PAT.
2. Keep `persist-credentials: false` — already correct.
3. Gate PAT usage behind `if: github.event.pull_request.head.repo.fork == false`.
4. Reduce blast radius properly: replace the PAT with a **GitHub App installation token** scoped to the six submodule repositories with `contents: read`. Short-lived and repo-scoped, which a PAT is not. This is the durable answer for every workflow in the estate using this pattern, not just this one — sweep them together.
5. Audit every other workflow using `BSUITE_CROSS_REPO_PAT` for the same missing-assertion defect and report the count.

### D-87. Theme baseline: the committed value is from the wrong tree, and it fails the gate shut

**Reported:** baseline moved 10 → 7 while the workflow comment says 10 → 11; risks making the gate "incorrectly permissive."

**The direction of the risk is backwards, and the cause is documented in the file.** The gate fails when `total > baseline`. If CI measures 11 against a baseline of 7 it goes red on every PR — permanently, and for a reason unconnected to the change under review. That is worse in practice than permissive, because a gate that is always red gets worked around rather than fixed.

**Where 7 came from.** The workflow comment records the author making this precise mistake once already: *"Measured against the submodules' origin/development TIPS the totals were 7 (broken filter) and 8 (fixed) … This job reads the submodules at their PINNED gitlink SHAs, which is a DIFFERENT TREE, and there the totals are 10 and 11."* **7 is the working-copy number.** Someone measured locally and committed the local figure over a value the comment explicitly warns against.

**Do:**
1. Set the baseline to the number this job measures at the pinned gitlink SHAs. The comment says 11; verify by reading an actual CI run rather than trusting either number.
2. Add the self-check the review asks for: fail if the committed baseline disagrees with what the audit reports on a clean run. A baseline that can silently diverge from the gate is not a ratchet.
3. When LANE-R804 clears R80.4's single pure endpoint, ratchet to 10. The ratchet only shrinks; the one raise to 11 is admitting an app that was silently outside the count because the filter still said `R80.3`.

### D-88. Changed-migration gating must fail closed

Confirmed present. When a submodule pointer moves but the two commits cannot both be resolved locally, the workflow emits `::warning::cannot diff $dir pointers — its changed migrations will be replayed but NOT gated` and continues. `CHANGED_LIST` then feeds `--changed`, so those migrations are replayed and judged against nothing.

This matters more than its severity label suggests for two reasons. First, it is the same silent-degradation class as D-86, in the same file. Second, the fetch that precedes it is `git -C "$dir" fetch -q origin "$OLD_SHA" 2>/dev/null || true` — fetching by bare SHA is refused by default on most GitHub configurations, so this path is likely to be taken routinely rather than rarely.

**Do:** fail the job when a pointer moved and the diff cannot be computed. If a fallback is wanted instead of a hard failure, gate **every** migration in that scope above `MIGRATION_FLOOR` — over-gating is recoverable, under-gating is invisible. Either way, print how the decision was reached. Also fix the underlying fetch so the common case does not rely on the fallback at all.

### D-89. Branch-tip fetching must resolve the real default branch

`inline-eslint-rule-parity.yml` runs `git submodule foreach 'git fetch -q origin development main master || true'`. Hardcoded names with errors suppressed: a submodule whose default branch is anything else keeps stale refs, and `--check-tips` compares against them while the workflow reports success.

**Do:** resolve each submodule's remote HEAD (`git symbolic-ref refs/remotes/origin/HEAD`) or run `git fetch -q origin --prune`, then resolve the comparison ref per submodule. Do not suppress the error — if a fetch fails, the comparison that follows is not advisory, it is wrong.

### D-90. Shell safety in the publish workflows

`publish-eslint-config.yml` and its sibling use `set -uo pipefail` without `-e`. A failing command substitution — `PKG_NAME=$(node -p "require('./package.json').name")` — can pass through and still write `skip=` outputs, producing an incorrect publish decision.

Relevant context: bsuite#1908 records that publish fails on every promotion because `@bsuite/eslint-config` has never existed on npm. Fix the shell safety and that issue together; a workflow that swallows failures is why a permanently broken publish step was able to run unnoticed on every promotion.

**Do:** `set -euo pipefail`, with intentionally-tolerated failures wrapped in explicit conditionals as the `npm view` probe already is.

### D-91. `packages/schema-builder` trigger path

The rehearsal workflow triggers on `packages/schema-builder/supabase/migrations/**` but lists no bare gitlink path for it, while the six real submodules each have one. `packages/schema-builder` is a directory in the parent repository, not a submodule, so the current configuration is correct.

**Do:** add a one-line comment saying so, next to the existing gitlink block that explains why the bare paths are there. The next reviewer will ask the same question, and the answer should be in the file rather than in a review thread.

### D-92. Standing rule from this batch

**A CI gate that cannot distinguish "checked nothing" from "found nothing" is not a gate.** D-86, D-87 and D-88 are three instances in two files. Every gate in this estate must assert that its inputs were actually present before it reports a verdict, and must fail closed when it cannot. Sweep the workflow directory against that rule and report the count of gates that currently do not meet it.
