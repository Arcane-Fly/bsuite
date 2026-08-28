# Operator notes backlog D-59…D-92 — status against live state

**Document:** `docs/20260817-operator-notes-backlog-d59-d92-status-v1.00W.md`
**Date:** 2026-08-17 · **Version:** 1.00W · **Status:** W — Working

> This is item **G1** in `docs/20260817-estate-completion-ledger-v1.00W.md` — the cluster that
> ledger called *"the largest single omission"*. It closes that gap. It supersedes the status
> columns of `docs/20260814-notes-backlog-verification-register-v1.00F.md`; that register's
> evidence and numbering stay the reference, its verdicts are replaced by these.

---

## 1. The answer

**Of the 34 numbered directives D-59…D-92, 21 are DONE, 8 are PARTIAL, 3 are OPEN, 1 was never a
defect, and 1 is a standing rule now measurably kept.** Of the separate list of thirty items you
told us to file (D-80 §5), **all thirty were filed, 2 have since been fixed, 1 was never a defect,
3 are part-done, and 24 are still open**.

**The register's worst finding no longer holds.** On 14 August, five of the six platform-wide
surface defects — *"the exact class you have raised most often"* — had **no issue in any
repository**. Today all six have one, four of the five are **closed with evidence**, and the
eleven items the register listed as *"not filed anywhere"* are **all filed**. Nothing on that list
remains unfiled.

**What is genuinely left, in one line:** the *mechanism* that makes the platform-wide class come
back is untouched — one shared checker was written, published and adopted by nobody, so four of
five apps still run a blind gate that reports "clean" over a class it cannot see; and inside the
2026-08-13 directive proper only three things are truly open — the report-your-count sweep for
platform-scope leakage, a permanent GitHub credential fix, and the Airtable-style report builder.

### A word on the vocabulary, since this is meant to be read rather than decoded

- **D-number** — the numbered instructions in your 13 August directive. D-59 is the first.
- **§5 / "the thirty"** — the list of thirty defects in that directive's section 5 that you told
  us to file as individual issues.
- **Filed** — an issue exists in the tracker. **Filing is not fixing.** Nothing in this document
  reports a filed issue as an addressed defect.
- **Fixed-but-open** — the defect is gone from the product, but the issue was never ticked shut.
  This estate merges work into a branch called `development`, and GitHub's automatic
  "close this issue" only fires on the *default* branch, `main`. So every closing keyword written
  in this estate does nothing, and issues have to be closed by hand.
- **RLS (row-level security)** — the database's own per-row permission rules. It is what stops one
  client's data being visible to another. It is stronger than a filter in the screen code,
  because it also applies to anything reading the database directly.
- **Migration** — a numbered file that changes the database. Merging one changes nothing; a
  separate process must run it. That gap is this estate's most common false "done".
- **Positive control** — before accepting "we searched and found nothing", we prove the search
  finds a case we already know is there. A broken search and a genuine absence look identical.

### Method

Every verdict below is measured on 2026-08-17, never read off a document. Live SQL against the
production database, live GitHub issue and workflow state, the published package contents
unpacked from the registry rather than read from the repository, and searches at the pinned
submodule commits with a positive control on every zero.

### Scoreboard — the 34 directives

| Verdict | Count | Meaning |
| --- | ---: | --- |
| **DONE** | **21** | Re-measured fixed, with evidence. No work remains. |
| **PARTIAL** | **8** | Half shipped. Real work remains — counted as open below. |
| **OPEN** | **3** | Untouched, or the fix exists but has not reached the running system. |
| **NOT-A-DEFECT** | **1** | Measured; it was never a defect. |
| **Standing rule** | **1** | D-59 — a rule, not a task. Now measurably kept. |
| **Total** | **34** | |

### Scoreboard — the thirty you told us to file (D-80 §5)

| Verdict | Count |
| --- | ---: |
| **DONE** — filed and since fixed | **2** |
| **NOT-A-DEFECT** — measured, never a defect | **1** |
| **PARTIAL** — the surface exists, the capability is unproven | **3** |
| **OPEN** — filed, untouched | **24** |
| **Total** | **30** |

> **A correction to my own first draft, stated rather than quietly fixed.** I initially scored this
> block 5 DONE / 21 OPEN by counting two of the three items you added on **14 August** — the
> subscription tiles and the developer-portal buttons — as members of the thirty. They are not;
> they are separate additions and they belong under D-74 and D-78, where they now sit. Both are
> genuinely closed, so no work is being over-claimed, but the *denominator* was wrong and this is
> exactly the class of count error the completion ledger criticised in the register it replaced.

---

## 2. All 34 directives

Sizes: **S** = hours, **M** = days, **L** = a week or more.

### §0 — the coverage verdict that started this

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-59** | *"Filing is not addressing."* From here, addressed means closed with evidence | **Standing rule — now kept, mechanism still absent** | The practice changed: 12 R80.4 issues closed with evidence on 14 Aug, 15 more estate-wide on 17 Aug, and this document reports no filed issue as an addressed defect. The *mechanism* has not changed — all five repositories still default to `main`, so closing keywords remain inert and the fixed-but-open backlog rebuilds at the same rate. | S |
| **D-60** | *"The unfiled forty are the worse half."* Named eight clusters verified absent from every tracker | **DONE** | Every named cluster now carries an issue. Of the eleven the 14 Aug register listed as "not filed anywhere", **zero** remain unfiled. The five platform-wide items with no issue anywhere now have `bsuite#1995`, `conduit#460` (covers two), `crm7#1727`, `bsuite#1996`; four of those five are **closed**. | — |

### §1 — the standing constraints

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-61** | This directive supersedes the earlier filing freeze; filing §5 is required work | **DONE** | All thirty filed as `crm7#1679–#1705` and `business-suite-unified#706–#712`, with four duplicates closed as not-planned. The freeze was not used as an excuse. | — |
| **D-62** | **Fix the class, not the page.** A PR that fixes only the URL you named is a failed PR | **OPEN** | **This is the one that matters and it is the one still live.** One shared checker was written to end the repeat — it detects five distinct ways a page can glue its cards together, and it is genuinely published: unpacking `@bsuite/page-builder` version 0.9.0 from the public registry shows the checker's compiled files inside. All five apps already depend on that exact version, so nothing blocks them. **No app imports it.** Search across all five app source trees returns zero; the positive control on the same search finds 83 other imports of that package, so the zero is real. All five still run their own hand-written copy, and four of those copies are missing the single check the CRM's own comment calls *"the actual root cause of the operator's platform-wide complaint"*. **Filed today as `bsuite#2055`.** | M |
| **D-63** | Regressions outrank new work | **DONE** | Observed in the order of work: all six R8 regressions (`#38`–`#43`) were closed on 14 August, ahead of the gap items. | — |

### §2 — the three P0s

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-64** | Fair Work credentials rendered in the R8 interface. Remove, rotate, confirm | **DONE in code — rotation is yours** | `R80.4#37` closed 14 Aug. The key field and the direct-fetch path are gone; the credentials are not prefixed for the browser bundle, so none is shipped to a visitor; the token moved into a request header and both proxies now refuse the old query-string form. **Rotating the key is still yours to do and cannot be verified from here** — the code fix does not un-expose a key that was on screen. | S (yours) |
| **D-65** | Supervisors belonging to other host employers are selectable on the placement edit form | **DONE — issue still open** | Both halves are now fixed. The screen half shipped (the narrowing hook is used in seven places including the placement create and edit forms). The **database** half — the one the register said was missing — is live: I read the policy off the production database and it now carries a full host-supervisor limb, so a host supervisor sees only contacts belonging to their own host, while ordinary GTO staff keep tenant-wide visibility. `crm7#1729` closed. **`crm7#1675` is still open and should be closed by hand.** | — |
| **D-66** | Platform-level scope visible to tenants, in three surfaces — plus *"sweep every feature in every app and report the count"* | **PARTIAL** | **Three named surfaces: all three done.** (a) The custom report builder now grants platform scope to a platform *developer* only — the code carries your ruling verbatim and an explicit warning not to re-admit `platform_admin`, super-admin or tester. (b) The Platform Kit gate no longer admits super-admin at all: the check is now purely "does this account hold a platform role", measured in the source. Recall a super admin in this estate is an **enterprise tenant admin with sub-organisations**, not a platform account — so that disjunct was handing an enterprise customer platform surfaces. (c) Platform branding and Platform Kit are relocated into the Developer Portal. **The sweep is not done.** No count has been reported anywhere for "every feature in every app carrying the same pattern", which was the larger half of what you asked for. `bsuite#1960` open. | M |

### §3 — the R8 regression cluster (D-67…D-73)

**This section is essentially finished.** Twelve issues closed on 14 August; three remain.

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-67** | File every item below as its own issue before starting | **DONE** | Filed as `R80.4#37`–`#58`. | — |
| — | Rate always $29.54; year wages frozen; allowances always Building & Construction; allowance percentages always 100%; no plumbing trade selector; plumbing shows B&C content | **DONE** — six regressions | `#38`, `#39`, `#40`, `#41`, `#42`, `#43` all closed. | — |
| — | No commercial construction sector | **DONE** | `#44` closed. | — |
| — | Only 3- and 4-year apprenticeships; no casual/ABN/full-time/part-time worker option | **PARTIAL** | `#45` and `#46` open. Three of four now price — an engagement selector, full-time and part-time, casual, and trainee wages all ship with passing tests. **Contractor/ABN is genuinely absent**, and `R80.4#5` already records it as deliberately deprioritised backlog. | S |
| — | Award selection does not sync between the two cards; Standard Rate / % / Source do not update; occupation and qualification not settable; no quote export; "Unsuspended"; wrong shift-loading note | **DONE** — six items | `#47`, `#49`, `#50`, `#51`, `#52` all closed. | — |
| **D-68** | Remove competency-based progression from the calculator; the crm7 half is change-of-year records and notices | **PARTIAL** | Calculator half **done** — `#53` closed, the card and its engine modules deleted with your ruling quoted in the source. **crm7 half:** a change-of-year page exists and is substantial (~1,000 lines with an eligibility scan and a triple sign-off), but the **anniversary reminders and the notices to apprentice and host** are not built — `crm7#1702` open. | M |
| **D-69** | Funding milestones must not be pre-populated | **DONE** | `#54` closed; the default list is empty with field-naming placeholder text and your quote recorded at the declaration. | — |
| **D-70** | Allowance UX — defaults only, everything else added from a source | **DONE** | `#55` closed. | — |
| **D-71** | One card for everything that affects the calculation | **DONE** | `#56` closed. | — |
| **D-72** | Read `charge-calculator-mapd.jsx` before redesigning | **OPEN** | `R80.4#57` open. This is an instruction to read a reference layout before the next redesign, not a defect in shipped code — it becomes live work only when that redesign starts. | S |
| **D-73** | The product is "R8" in all UI | **DONE** | `#58` closed; enforced by a lint rule at error level with zero tolerated violations. | — |

### §4 — the platform-wide surface defects (D-74…D-79)

**The section the register called the worst-covered is now the best-moved.** All six carry issues;
four are closed.

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-74** | Cards share a common backing card, so drag-and-drop moves them as a group | **PARTIAL** | `bsuite#1995` **closed** — the surfaces you named are fixed, and the shared card components were promoted into the package so every app can use one implementation. **What is not done is the class.** See D-62: the shared checker is published and imported by nobody, so roughly ninety surfaces across four apps remain unaudited — not "clean", *unmeasured*. | M |
| **D-75** | Card resize regression; columns do not respect the slider | **DONE** | Three independent causes were found and fixed in the shared package, and the one app that was version-locked out of the fix is no longer locked out: **all five apps now pin version 0.9.0**, conduit included (it was stuck on 0.6.3 — a caret on a `0.x` version silently pins the minor, so it could never resolve the fix). `conduit#460` closed. | — |
| **D-76** | Cards render half cut off on page open | **DONE** | Same fix, same package version, same closed issue. The root cause was a default in the wrong place: sixteen of eighteen pages never opted in to content-fitting height, so every card was pinned to whatever seed height its author guessed and clipped the rest. | — |
| **D-77** | Edit-in-place on the page I am already on | **DONE** | `crm7#1727` closed 14 August. | — |
| **D-78** | Theme, all apps: no pure white cards, gradient headers, accent glow, nav gradient | **PARTIAL** | **The near-white card surfaces are gone.** You identified the culprit in DevTools as `lab(100 0 0 / 0.96)`; it was five app-local declarations of `oklch(0.994 …)` shadowing an already-correct shared value. Searching the stylesheets today returns **only historical comments — zero live declarations** — across all six apps. Four pull requests merged today. **Three things remain**, all small: the card border is set at 9% opacity in three apps and is effectively invisible (what you see as the border is a blurred shadow ring, which is why it reads soft rather than crisp); the gradient underline you pointed at on the tenant switcher exists in **two files, both in the CRM**, so it is unimplementable in the other five apps until it moves into the shared theme; and the app gradient is defined with **zero call sites**. `bsuite#1996` open. | S |
| **D-79** | Airtable-style reporting; `/financial/reports/new` is a second hardcoded builder | **PARTIAL** | **The duplicate builder is retired** — the whole `/financial/reports/*` tree is gone from the app, with the retirement recorded in the routing file and dated 13 August. A design document shipped, and the platform-scope gating you required in D-66 is pinned into the report code. **The Airtable-style builder itself is not built.** `crm7#1568` is **fixed-but-open** and should be closed by hand; `crm7#1711` (P0, the Financial Reports navigation entry leading nowhere) and `crm7#1712` are live. | L |

### §5 — the thirty (D-80)

**All thirty filed.** Detail in section 3 below.

| # | What you said | Verdict | Measured 2026-08-17 |
|---|---|---|---|
| **D-80** | Each gets its own issue with labels verified first | **DONE** | `crm7#1679–#1705`, `business-suite-unified#706–#712`. Four duplicates were caught and closed as not-planned rather than left to confuse the count. |

### §6 — portals (D-81, D-82)

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-81** | The portals need redesign, not repair | **OPEN — waiting on you** | The brainstorm document exists, is correctly gated (*"No code has been written and none will be until you have ruled"*), and asks you three questions before anything is built. Nothing in the portals has changed since. | L |
| **D-82** | Read the Codehouse document and study their workforce-one layout before proposing a navigation model | **OPEN** | Same gate. | M |

### §7 — blocked on you (D-83, D-84)

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-83** | The 21 frozen placements. Proceed with the nine; **do not touch the twelve `unresolved` rows**; do not drop the constraint | **PARTIAL — one clause was already spent before you wrote it** | **Two of three clauses satisfied.** The nine are recorded as `manual` with their charge rates intact (8 FutureBuild + 1 Braden Group, measured live). The constraint was not dropped — it is live and now genuinely enforcing rather than merely blocking edits. **The third clause could not be honoured:** the twelve bsuite Platform rows had already been rewritten from `unresolved` to `manual` on **6 August, seven days before your directive**, by a migration that swept `unresolved` and blank together because the distinction you later drew had not been stated. All twelve share one timestamp, so it was a single transaction. **No dollar figure changed.** What was lost is the diagnostic that resolution had *run and failed* in your own demo tenant. **This needs a decision from you — see §5.** Filed as `crm7#1778`. | S |
| **D-84** | `/documents/collaborative` must go; instead, upload a Word document, edit it, insert merge fields | **DONE** | The collaborative editor route returns **zero matches anywhere in the app** — it is gone per your ruling. Its replacement is real: a Word-document reader is a declared dependency, and the import dialog, the import service with a round-trip test, and a merge-field catalogue with a parity test all ship. | — |

### §8 — reporting shape

| # | What you said | Verdict | Measured 2026-08-17 |
|---|---|---|---|
| **D-85** | Report per item: closed with evidence, open with an owner and a date, or not started with a reason. Do not report a filed issue as an addressed defect | **DONE** | This document is that report. Every "not filed" claim in the 14 August register was re-checked, and where the estate had already done better than the register said, that is stated in section 4. |

### §9 — the six CI findings (D-86…D-92)

**A "CI gate" is an automatic check that runs before code is allowed in.** Five of these six are
now fixed, which makes this the best-executed block in the directive.

| # | What you said | Verdict | Measured 2026-08-17 | Size |
| --- | --- | --- | --- | --- |
| **D-86** | The migration-rehearsal check has no assertion that the six apps were actually fetched — without the credential it rehearses nothing and reports green | **PARTIAL** | **The assertion exists.** The workflow now fails loudly and names what is missing if the apps did not check out, and it separately verifies every declared scope is present and readable before accepting an empty result. It also refuses the credential on outside contributions, as you asked. **Two of your five instructions remain:** replacing the long-lived credential with a short-lived, repository-scoped **GitHub App token** — the durable answer for every workflow using this pattern; and reporting the **count** of other workflows carrying the same missing-assertion defect. Twenty-four workflows use that credential and no count has been published. `bsuite#1961` open. | M |
| **D-87** | The theme baseline is a working-copy number and will fail the gate shut | **DONE — issue still open** | The baseline is 7 and the workflow now records *why* 7 is correct here, citing two specific CI runs two hours apart, one of which printed the wrong number and was the evidence that settled it. Your second instruction — a self-check that fails if the committed baseline disagrees with a clean run — is implemented as an **equality** gate: above the baseline is a regression, below it is an un-banked improvement, and both fail. `bsuite#1963` is **fixed-but-open**. | — |
| **D-88** | Changed-migration gating must fail closed | **DONE** | `bsuite#1964` closed today. The tolerate-and-continue path is gone, the pipe no longer swallows the refusal, and — the part worth noting — the refusal is **exercised against planted cases before it is trusted**: one diffable, one diffable only after a fetch, and two undiffable for two different reasons. The workflow's own comment states the principle: *"A gate never seen to fail is not a gate."* | — |
| **D-89** | Branch-tip fetching must resolve the real default branch, not guess names | **DONE** | The guessed branch names and the suppressed error are gone; each app's own default branch is now resolved from the remote and errors are surfaced. | — |
| **D-90** | Shell safety in the publish workflows | **DONE — with a live sibling** | All publish workflows now use the strict setting, with deliberate exceptions made explicit. **The sibling problem you tied to it is still live:** `@bsuite/eslint-config` still returns "not found" from the public registry, so that publish step still fails on every promotion. `bsuite#1908` open. | S |
| **D-91** | Add a one-line comment explaining why the schema-builder path has no bare entry | **DONE** | The comment is in the file, in the terms you asked for. | — |
| **D-92** | **A gate that cannot distinguish "checked nothing" from "found nothing" is not a gate.** Sweep every gate against that rule and report the count | **PARTIAL** | **The sweep exists as a permanent mechanism, which is better than a one-off count.** A watcher-of-watchers workflow runs every registered check and fails any that exits successfully while reporting nothing numeric about what it examined. Its own header names the three historic cases that motivated it. **43 checks are registered against 54 workflows**, and **the count you asked for has never been reported** — so it is not yet possible to say how many gates fail the rule. `bsuite#1966` open. | S |

---

## 3. The thirty (D-80 §5) — where each one stands

Six of the thirty have moved since filing. The rest are filed and untouched — which, per D-59, is
**not** addressed.

### Fixed since filing — 2

| § | Item | Issue | Evidence |
| --- | --- | --- | --- |
| 5-2 | `/portal` redirects to the dashboard; no way to send anyone their personal portal | `crm7#1680` **closed** | The redirect is skipped for owner/admin/manager, a share-portal card renders, an invitation action exists with tests, and there is a redemption route for the link. |
| 5-24 | `/branding` only saves after "Show preview" is clicked | `BSU#708` **closed** | Fixed and regression-locked by a test that fails if the change is reverted. |

### Never a defect — 1

| § | Item | Issue | Evidence |
|---|---|---|---|
| 5-22 | `enterprise_licence_events` missing; the licence grace-seat panel fails to load | `BSU#706` **closed** | **Not reproducible.** The table, its permissions and the exact foreign key the screen's join names all exist. It was a stale database cache, not a missing table. |

### The three items you added on 14 August — separate from the thirty

Counted under D-74 and D-78, not here. Recorded so they are not lost between the two lists.

| Item | Issue | State |
| --- | --- | --- |
| (a) Subscription tiles share a common backing card | `BSU#720` **closed** | The "cannot be split without a registration mechanism" objection was false and the CRM already disproved it. |
| (b) App-tile heading text must use the D2C gradient | `BSU#721` **open** | The gradient class exists; the tiles were never wired to it. |
| (c) Developer portal buttons bypass the shared button contract | `BSU#722` **closed** | A lint rule now exists at error level. **Caveat:** its configuration explicitly exempts the ten files that still contain raw buttons, so it currently polices everything except the remaining violators. |

### Part-done — the surface exists, the capability is unproven — 3

| § | Item | Issue | Measured |
| --- | --- | --- | --- |
| 5-30 | No clear way for a client to connect their own email and send from it. *"Raised more than twenty times."* | `crm7#1705` open | **The surface exists and is routed.** `/settings/email-accounts` offers Google, Microsoft and IMAP/SMTP with full host, port and credential fields. **But `email_integrations` holds zero rows** — no tenant has ever connected an account, so the flow has never once been exercised end to end. Separately, the deployed inbox-sync function still reads a password column that no longer exists, so the receiving half would fail on first use. |
| 5-26 | Switching apps from inside BSuite lands signed-out on the target app's marketing page | `BSU#710` open | Improved from one app to four: the silent re-authentication call is now wired in application code in conduit (4 sites), throughput (2), the CRM (1) and braden (1). **R80.4 still has none**, so a bare-URL visit there still renders logged-out. |
| 5-21 | Change-of-year records, wage-anniversary reminders, notices to apprentice and host | `crm7#1702` open | A change-of-year page exists and is substantial — an eligibility scan and a triple sign-off, ~1,000 lines. **The reminders and the notices are not built.** |

### Filed and untouched — 24

Two carry a fresh measurement worth recording even though nothing has moved:

| § | Item | Issue | Measured today |
| --- | --- | --- | --- |
| 5-16 | Training-provider records leave TGA fields empty; qualification scope missing entirely | `crm7#1696` | **8,119 provider rows; zero carry any qualification scope.** Confirmed with numbers. |
| 5-17 | All TGA providers should be importable on user action, **not pre-loaded** | `crm7#1697` | **8,119 rows are pre-loaded.** Confirmed with numbers. |

The remaining 22, untouched:

`crm7` — 1679 (`/leads/create` cannot create a company — confirmed, no inline creation exists),
1681 (`/portal/worker` job-ad link), 1682 (`/settings/module-visibility` — **a fix is open as
`crm7#1776`; see §6. Not merged, so it is counted here as open**), 1683 (`/payroll/award-rates`),
1684 (`/engagements/create` funding framing), 1685 (training-plan units on the apprentice),
1686 (people card borders, stray `/u`), 1687 (`/pipeline/kanban` not pulling from conduit),
1688 (client-to-host half-linked), 1690–1694 (the five funding-mechanics items), 1698 and 1700
(TGA import depth), 1701 (database identifiers shown as the user-facing ID), 1703
(`fairwork-enhanced` returns 503).

`business-suite-unified` — 707 (grace invites), 709 (Jodie logo), 711 (documentation screenshots),
712 (`/developer/tables`).

---

## 4. What was never a defect

Stated with the measurement, so it is not re-litigated.

**The 23 platform-scope report templates readable by every logged-in user. NOT A DEFECT.**
The 14 August register raised this as a live P0 against your D-66 ruling — 23 platform-scope rows
readable by anyone. I read the live permission rule today and it has since been narrowed: reading
a platform-scope template now additionally requires that it be flagged as a **system** template.
I then read the rows. All 23 are system templates with no owning tenant, and their names are the
product's shipped starter reports — *Apprentice Register*, *AVETMISS Statistical Summary*,
*Funding Claims Report*, *GTO National Standards Audit Pack*, and so on. These are report
**definitions** every tenant is meant to run, not anybody's data; the rows a template returns are
still filtered per tenant by the database's own rules. The `is_system` condition is exactly the
line that separates a shipped starter from a future platform-authored template, and it is drawn
correctly. `crm7#1728` was closed as not-planned, and that was the right call.

**The placement edit form does not re-freeze a record. NOT A DEFECT — my own search was wrong
first.** The 6 August migration warned that without an accompanying code change, editing a
placement could re-freeze it. Searching the edit page for the field name returns **zero**, which
reads exactly like the code half never landed. It did — the rule lives in a shared helper called
from the edit page, with the reasoning in a comment directly above the call. **A zero from a
search is a hypothesis until something known-present proves the search works.** Recorded here
because it nearly became a filed defect.

### Counts the 14 August register got wrong

Both figures shown; the right-hand column is current.

| Item | Register, 14 Aug | Measured 2026-08-17 | Direction |
| --- | ---: | ---: | --- |
| Notes defects never filed anywhere | 11 | **0** | better |
| §4 platform-wide items with no issue in any repo | 5 of 6 | **0 of 6** | better |
| §4 items closed with evidence | 0 | **4 of 6** | better |
| Fixed in code but issue still open ("close these") | 14 | **0** | better |
| Conduit's shared-package version | `^0.6.3`, locked out | **`^0.9.0`, all five apps** | better |
| Live near-white card tokens | 5 across 3 apps | **0 live; comments only** | better |
| Apps importing the shared card checker | *(not measured)* | **0 of 5** | the class defect survives |
| Pre-loaded training providers | *(not measured)* | **8,119, none with qualification scope** | worse than described |

---

## 5. What needs a decision from you

Three. None can be closed by measurement.

> **A fourth was withdrawn during this pass, and the reason is worth more than the item was.** I
> had listed *"set two repository secrets so anything visual can be proven"*, on the strength of a
> test run showing 111 of 126 tests skipped for want of a credential. **That run was from 16
> August at 15:38. The fix merged at 04:23 on 17 August** — I measured a commit thirteen hours
> older than the state I was reporting on, which is this estate's defining failure, committed
> inside the document that warns about it. See §7.

### 1. The twelve `unresolved` placements in your demo tenant (D-83)

**What happened.** You ruled on 13 August: do not touch the twelve, because `unresolved` means
resolution ran and failed and that is a real signal. Measured today: **zero rows carry
`unresolved` anywhere in the database**; the twelve read `manual`, all updated in a single
transaction on **6 August — seven days before your ruling**, by a migration that swept
`unresolved` and blank together. No money figure changed. What was lost is the ability to tell,
in your own demo tenant, which placements had a *failed resolution attempt* rather than a
hand-typed rate.

- **Option A — accept the loss and record it. Recommended.** Restoring the label now re-creates
  the exact P0 the migration cured: the constraint is enforcing, so writing `unresolved` back onto
  a row that carries a charge rate would be rejected outright by the database. To restore the
  label the rates would have to be deleted first — losing real data to recover a diagnostic, in a
  demo tenant with no client exposure.
- **Option B — restore the signal without re-freezing.** Record the historical failure in the
  existing charge-rate audit log, then re-run the resolver against the twelve and let it write a
  truthful current result. One small migration plus a resolver run. Choose this if the *resolver
  failure* is what you want to know, rather than the label.
- **Option C — restore `unresolved` literally.** Requires deleting twelve charge rates or dropping
  the constraint. Not recommended; your own ruling says do not drop the constraint.

Filed as `crm7#1778` so the decision survives this document.

### 2. The three portal questions (D-81)

Unchanged and still first in line, because they decide how much work the portals are:

1. **Is a field officer staff, or an external portal user?** This decides whether we design four
   external portals or three.
2. **How much of the money may a host see?** Invoice and hours; or that plus charge rate per hour;
   or that plus the full build-up. Commercial decision, not technical.
3. **May a host request a worker directly, or must it go through us?** Flagged 5 August, still
   undecided.

### 3. The permanent credential fix for the CI checks (D-86)

Your instruction was to replace a long-lived personal credential with a short-lived,
repository-scoped GitHub App token — *"the durable answer for every workflow in the estate using
this pattern, not just this one"*. Twenty-four workflows use the current credential.

- **Option A — do it as you specified. Recommended**, but it needs you to create the GitHub App
  and install it on the six app repositories; that step cannot be done from here.
- **Option B — keep the current credential and add the missing assertion to the other twenty-three
  workflows.** Cheaper, reversible, and leaves the blast radius unchanged.

---

## 6. What was fixed and what was filed in this pass

**Filing is not fixing.** These are stated separately on purpose.

### Fixed — one, small and unambiguous

**`/settings/module-visibility` said "2 hidden modules" and listed nothing you could click.**
Your words in the notes: *"how can I enable modules without being able to select them?"*
(`crm7#1682`, D-80 §5-5).

The cause is an exact arithmetic match to the symptom. There are **38** feature switches in the
code, but the page renders **35** rows. The "hidden" number counts the *switches*; the list below
it renders the *rows*; nothing reconciled the two. The three that existed only as switches were
Xero integration, Jodie AI and the RTO extension — and **Jodie AI and the RTO extension are the
only two switches that are off by default**. So the page counted exactly two hidden modules and
had no row for either.

Fixed by giving each of the three a row, in the section it belongs to. Deliberately not the other
way round: making the *count* agree by deriving it from the rows would have made the number look
right while leaving three modules permanently unreachable — which is the complaint, not the fix.

A structural test now fails the build if a switch is ever added without a row, or a row without a
switch. **Verified as a gate, not assumed:** deleting one of the three new rows fails the suite
and the failure message names the missing module. Typecheck clean.

Pull request **crm7#1776**, into `development`. Not merged by me.

### Filed — two, both genuinely absent from every tracker

1. **`bsuite#2055` — the shared card checker is published, reachable, and adopted by nobody.**
   This is the D-62 mechanism. Four of five apps run a gate that is structurally blind to the
   class you have raised most often, so they report an empty ledger that means *"my checker has no
   detector for this"*, not *"this app is clean"*. Filed with the full measurement, the positive
   control, a copy-pasteable reproduction, and a four-point definition of done that includes
   **reporting the finding count each app produces on first adoption** — a number nobody outside
   the CRM has ever measured.

2. **`crm7#1778` — the twelve `unresolved` placements (D-83).** Filed as a decision with the three
   options above and a recommendation, not as a guess to be built.

**Neither is fixed by having been filed.** `bsuite#2055` is roughly a week of work across five
apps; `crm7#1778` is hours, once you have chosen.

---

## 7. A mistake I made writing this, and what it cost

I am recording this in full because it is the estate's defining failure and I committed it inside
the document that warns about it.

**What I published.** A paragraph in §8 and a fourth operator decision, both saying the automated
browser tests skip 111 of 126 cases for want of two repository secrets, that *"the credential
itself was never set"*, and that setting them was yours to do. I quoted a real log line and a real
count. Every number was accurate.

**Why it was wrong anyway.** The run I read was from **2026-08-16 at 15:38**, at commit
`3f2843c5`. The fix merged at **2026-08-17 at 04:23** as `crm7#1768`. **I measured a commit
thirteen hours older than the state I was reporting on** — the *"recorded is not applied"* trap,
inverted: applied, and I read the record from before it was.

**What is actually true, measured on this document's own pull request rather than on a stale
branch.** The test job on `crm7#1776` now runs a step called *"Assert the E2E credentials actually
resolved"* and **that step passes**. A second new step, *"Report how many specs actually
executed"*, exists specifically so a suite can never again report success over tests it skipped.
The suite has been running for forty-five minutes rather than the twenty-five seconds it took when
it was skipping — which is what genuinely executing 126 browser tests looks like.

**The real diagnosis was better than either prior account.** `crm7#1768`'s own title says it:
*"the E2E credentials were set and no workflow read them"*. Not invalid, as the completion ledger
recorded. Not missing, as I recorded. **Present, and unread** — a third failure mode neither of us
considered, and the only one that explains a green tick over 111 skips.

**What it cost.** An operator decision was put in front of you asking you to supply something you
had already supplied. That is the most expensive kind of wrong: it spends your attention on work
that was done.

**What prevents the repeat.** Before reporting a CI fact, read the run that belongs to the commit
under discussion, not the newest run on a branch — a run is dated, and a branch moves under it.
The same rule the ledger applies to migrations applies to workflow runs.

---

## 8. Suggested sequence

1. **Close the fixed-but-open issues by hand** — `crm7#1675`, `crm7#1568`, `bsuite#1963`. Minutes,
   and it stops the next status report understating the estate again.
2. **`bsuite#2055`** — adopt the shared checker in all five apps and publish the counts. This is
   the single change that makes *"we fixed the page you named"* structurally impossible to repeat,
   which is D-62, which is the complaint you have made most often.
3. **D-66's sweep** — report the count of features carrying platform-scope leakage. The three
   named surfaces are fixed; the number you actually asked for does not exist.
4. **D-78's three small residuals** — the invisible border, the gradient underline promotion, the
   unused app gradient. All S, all in one pass.
5. **D-83 decision**, then the twelve rows, whichever way you rule.
6. **The portal questions**, which gate everything in §6 of the directive.
7. **D-79** — the Airtable-style builder, the only L-sized item left inside the directive proper.

---

## 9. What this pass could not settle

- **Whether the Fair Work key was rotated (D-64).** Only you can do it and only you can confirm it.
- **Anything visual.** No browser was driven for this document. Every theme verdict is measured at
  the stylesheet and source level, and your original complaints were visual.

  **This limitation is smaller than it was this morning — and I published the wrong version of it
  first. See §7.**
- **Whether the closed issues stay closed.** Twelve R80.4 issues and four platform-wide issues were
  closed in the last three days. This document verifies the code behind them, not the deployed
  screens.
