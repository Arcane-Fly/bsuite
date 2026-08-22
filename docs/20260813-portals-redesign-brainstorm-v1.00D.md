# Portals — redesign brainstorm

**Document:** `docs/20260813-portals-redesign-brainstorm-v1.00D.md`
**Status:** D — Draft. This is a brainstorm for you to read and rule on. **No code has been
written and none will be until you have.**
**Answers:** operator directive 2026-08-13, D-81 (portals need redesign, not repair) and D-82
(read the Codehouse document first).

---

## Acronyms and codes used in this document

Glossed once here so the rest reads plainly.

| Term                              | Means                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GTO**                           | Group Training Organisation — us. Employs the apprentice, places them with a host.                                                                                    |
| **Host / host employer**          | The business the apprentice works at day to day. Our client, not our employee's employer.                                                                             |
| **RTO**                           | Registered Training Organisation — the college/TAFE delivering the qualification.                                                                                     |
| **WHS**                           | Work Health and Safety.                                                                                                                                               |
| **AnyTime / Workforce One (WF1)** | Code House's products. WF1 is the back-office system; AnyTime is its online timesheet front end for employees and clients. This is the Codehouse document D-82 names. |
| **RLS**                           | Row Level Security — the database's own rule about which rows a given signed-in person may read. The real security boundary, as opposed to which page they landed on. |
| **Route**                         | A web address inside the app, e.g. `/portal/worker`.                                                                                                                  |
| **Shell**                         | The frame around a page — sidebar, header, page chrome. The thing that tells you where you are.                                                                       |
| **Persona**                       | A type of user described by what they are trying to get done, not by their database role.                                                                             |
| **Portal role**                   | A value stored on the person's membership record that decides which portal they land on.                                                                              |

---

## 1. What you must decide (read this section only, if you read nothing else)

Nothing below should be built until you rule on these three. Everything else in the document
is either evidence for them or work that follows from them.

**Decision 1 — Is a field officer a member of staff, or an external portal user?**
My recommendation: **staff.** Retire the walled field-officer portal; keep the page as their
work-day home _inside_ the main app, and enforce their caseload in the database rather than by
which page they landed on. Reasoning and the consequences of the alternatives are in §5. This
decision gates everything else, because it determines whether we are designing four external
portals or three.

**Decision 2 — How much of the money may a host see?**
Your words were "see invoices and the charges behind them". The charge rate contains our
margin. There is a genuine fork here and it is commercial, not technical: does a host see (a)
the invoice and the hours behind each line, (b) that plus the charge rate per hour, or (c) that
plus the build-up of the charge rate — wage, on-costs, overhead, margin? I will not guess at
this. It is also the single biggest driver of how much work the host portal is.

**Decision 3 — May a host ask for a worker directly, or must it go through us?**
A host portal that shows placements but has no way to say "I need another second-year" pushes
the request back to phone and email, which is where the current process already leaks. But
letting a host raise a vacancy that lands in our pipeline unreviewed is a policy change, not a
screen. This was flagged on 5 August and is still undecided.

**Three more that can wait a week but not a month:** whether the portal is the system of record
for payslips or merely displays what payroll issued (§10); whether we ask WHS questions at the
moment a timesheet is submitted and approved, the way AnyTime does (§7, lesson 9) — that is a
process change for hosts, not just a feature; and whether bank/tax-file-number/superannuation
capture is in scope at all this quarter (§10 — it is the highest-risk item on your list).

---

## 2. Was the Codehouse document found and read? Yes — and the last pass missed it

**Yes. It was found and read in full.**

`docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` — 2,390 lines, "AnyTime User Guide for
Administrators", Code House, Level 1, 311 Angas Street Adelaide. It has been sitting in `docs/`
since 23 July.

This matters more than a tick in a box, and I want to correct the record rather than let the
work be repeated:

- On **5 August** a previous pass answered this same instruction. It searched for the Codehouse
  document, found only `docs/references/codehouse-knowledgebase-crawl.md` — a list of 205
  support-article _titles_ scraped from Code House's public help site — and reported, in
  writing, that "there is no visual reference to copy" and "no richer WF1 UX reference to mine"
  (`crm7/docs/plans/20260805-portal-persona-jobs-to-be-done-v1.00W.md`, lines 21–42).
- That was wrong. The actual administrator manual was already in the parent monorepo's `docs/`
  folder, twelve days old at the time. It describes the screens, the tabs, the statuses, the
  access model and the notification machinery in detail.
- So **D-82 was not satisfied on 5 August**, which is very likely why you have re-issued it. It
  is satisfied now. §7 is the study.

The 5 August pass was not wasted — it did real persona work and shipped a navigation change, and
I have built on it rather than around it (§3, §4, §6). But its central conclusion, that there was
nothing to learn from Code House about layout, was a false negative caused by not finding the
file.

---

## 3. What exists today

All of this is read from the code on `development` as at 2026-08-13. Every claim carries a file
and, where useful, a line. **Nothing here was verified by signing in and clicking** — this is a
documentation deliverable and no live testing was done (see §12).

### 3.1 The routes

Eleven portal routes exist in crm7, plus one portal-shaped page that lives outside `/portal`.
Router is defined in `crm7/src/App.tsx`.

| Route                          | Renders                           | File                                                                                                         |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/portal`                      | Portal chooser + share-links card | `crm7/src/pages/portal/index.tsx` (App.tsx:3699)                                                             |
| `/portal/worker`               | Worker / apprentice home          | `crm7/src/pages/portal/worker-portal.tsx` (App.tsx:3655)                                                     |
| `/portal/host-employer`        | Host home                         | `crm7/src/pages/portal/host-employer.tsx` (App.tsx:3645)                                                     |
| `/portal/field-officer`        | Field officer home                | `crm7/src/pages/portal/field-officer.tsx` (App.tsx:3660)                                                     |
| `/portal/training-provider`    | RTO home                          | `crm7/src/pages/portal/training-provider.tsx` (App.tsx:3640)                                                 |
| `/portal/workplace`            | Direct-hire employer home         | `crm7/src/pages/portal/workplace-portal.tsx` (App.tsx:3694)                                                  |
| `/portal/my-documents`         | Own document upload/view          | `crm7/src/pages/portal/my-documents.tsx` (App.tsx:3666)                                                      |
| `/portal/org-documents`        | Org manuals and policies          | `crm7/src/pages/portal/org-documents.tsx` (App.tsx:3682)                                                     |
| `/portal/onboarding`           | Onboarding requirements           | `crm7/src/pages/portal/onboarding.tsx` (App.tsx:3675)                                                        |
| `/portal/apprentice/reports`   | Apprentice progress reports       | `crm7/src/pages/portal/apprentice-reports.tsx` (App.tsx:3688)                                                |
| `/portal/accept-invite/:token` | Invite acceptance (public)        | `crm7/src/pages/portal/accept-invite/[token].tsx` (App.tsx:1284)                                             |
| `/host/reports`                | Host monthly report packs         | `crm7/src/pages/portal/host-reports.tsx` (App.tsx:3650) — **file sits in the portal folder, route does not** |

Every one of these pages queries real data. **There are no "coming soon" placeholders in the
portals.** That is worth saying because "the portals do not work" could mean empty shells, and
they are not — the problem is orientation and shape, not emptiness.

### 3.2 Two things in your notes that have moved since you wrote them

I would rather correct these than have someone rebuild what exists.

**"`/portal` redirects to the dashboard"** (issue crm7#1680) — this is now true only for _our own
staff_. The routing logic is at `crm7/src/pages/portal/index.tsx:52-66`: an apprentice, worker,
host contact, field officer or training provider is sent to their own portal; only a user whose
tenant is a GTO, labour-hire or combined business and who holds no portal role falls through to
`/dashboard` (lines 62–63). An owner, admin or manager gets a "Choose your portal" screen
instead (lines 129, 160–208). So the symptom you saw is real for the account you were signed in
as, and misleading as a description of the whole surface.

**"There is no way to send an external user their portal link"** (also crm7#1680) — two
mechanisms now exist:

1. A proper single-use invite: `crm7/src/lib/portalInvite.ts` mints a token via a database
   function `portal_invite_mint`, the recipient accepts at `/portal/accept-invite/:token`, and
   accepting binds their sign-in to their person record. The button is
   `crm7/src/components/portal/InvitePortalAction.tsx`, used from the people-onboarding page
   (`crm7/src/pages/people/onboard.tsx:42`) and the candidate-to-apprentice conversion
   (`crm7/src/pages/apprentices/from-candidate.tsx:36`).
2. A plainer "copy the portal link" card: `crm7/src/pages/portal/SharePortalCard.tsx`, shown on
   `/portal` to owners/admins/managers.

**crm7#1680 is therefore substantially stale and should be re-scoped rather than worked as
written.** What is genuinely missing is not the ability to send a link — it is that sending one
is buried inside two specific staff workflows rather than being a normal thing you can do from
any person or host record. That is a small, cheap fix. I have not closed the issue; that is
yours to direct.

### 3.3 The roles that actually exist

Stored on the membership record, list at `crm7/src/lib/roleMappingService.ts:17-20`:

`owner, admin, manager, staff, field_officer, training_provider, host_contact, apprentice,
worker, viewer`

Two consequences:

- **There is no "trainee" role and there should not be one.** A trainee is a person whose
  employment type is trainee, sitting under the same worker/apprentice persona. "Trainee portal"
  is a _label_, not a fifth system. Worker and apprentice are already collapsed to one identical
  permission set and one identical portal in `crm7/src/hooks/usePermissions.ts`
  (`normalizeRole`). You were right that these are the same shape; the code already agrees.
- **There is no separate "supervisor" role**, and per §7 there needs to be a way to express one —
  a host contact who may only see the workers they personally supervise, as distinct from a
  manager who sees everyone at that host. Today `host_contact` is one flat thing.

### 3.4 The security boundary, stated plainly

There is a component called `PortalScopeGate` wrapped around the portal pages. It is currently
**not enforcing anything**: when the sign-in token carries no scope claim — which is the current
state, deliberately — it renders the page anyway and defers to the database
(`crm7/src/components/portal/PortalScopeGate.tsx:38-44`). The real boundary is RLS plus the
permission table. That is an acceptable design, but it means **any redesign must be reviewed
against the database rules, not against which page a persona can reach.** I flag it here because
a redesign that moves surfaces around while assuming the gate protects them would be building on
sand.

---

## 4. Where the constant re-orientation actually comes from

This is the finding I would most like you to read, because it is measurable and it is the direct
cause of the experience you described.

**Every page in crm7 — portal or internal — is wrapped in the same shell.** `MainLayout` is
mounted once around the whole app (`crm7/src/App.tsx:3848`) and it always renders the internal
GTO sidebar (`crm7/src/layouts/MainLayout.tsx:108`). There is no portal layout. The thing named
`DashboardShell` that portal pages use is, literally, a `div` with padding
(`crm7/src/components/dashboard-shell.tsx:9`).

The 5 August pass mitigated this by curating a shorter sidebar for two roles
(`crm7/src/config/navigation.ts:441-538`). That was the right instinct and it is a real
improvement. **But look at where the curated menu items point.**

**Apprentice / worker menu — 9 destinations:**

| Menu label          | Goes to                      | Is that a portal page?              |
| ------------------- | ---------------------------- | ----------------------------------- |
| Portal Home         | `/portal/worker`             | Yes                                 |
| Submit Timesheet    | `/timesheets/create`         | **No — internal**                   |
| Timesheet History   | `/payroll/timesheets`        | **No — the payroll module**         |
| My Training Plan    | `/people`                    | **No — the staff people directory** |
| My Progress Reports | `/portal/apprentice/reports` | Yes                                 |
| Leave               | `/leave/request`             | **No — internal**                   |
| My Documents        | `/portal/my-documents`       | Yes                                 |
| Manuals & Policies  | `/portal/org-documents`      | Yes                                 |
| My Profile          | `/settings`                  | **No — the app settings page**      |

**Host menu — 11 destinations:**

| Menu label             | Goes to                 | Is that a portal page?               |
| ---------------------- | ----------------------- | ------------------------------------ |
| Portal Home            | `/portal/host-employer` | Yes                                  |
| Workers on Site        | `/apprentices`          | **No — internal**                    |
| Placements             | `/placements`           | **No — internal**                    |
| People                 | `/people`               | **No — internal**                    |
| Timesheets             | `/payroll/timesheets`   | **No — the payroll module**          |
| WHS Incidents          | `/whs/incidents`        | **No — internal**                    |
| Risk Assessments       | `/whs/risk-assessments` | **No — internal**                    |
| Progress Reviews       | `/progress-reviews`     | **No — internal**                    |
| Monthly Reports        | `/host/reports`         | Portal-shaped, but outside `/portal` |
| Invoicing              | `/financial/invoicing`  | **No — the finance module**          |
| Field Officer Contacts | `/field-officers`       | **No — internal**                    |

**Of the 20 destinations in the two curated portal menus, 6 are portal-shaped and 14 drop the
user into a page built for our own staff.**

That is the re-orientation. An apprentice clicks "My Training Plan" and lands in the staff
directory of every person in the tenant. A host clicks "Timesheets" and lands in the payroll
module. The sidebar says "Worker Portal" and the page underneath says something else entirely,
with different columns, different vocabulary, different filters and a different mental model.
The user has to work out, on every single click, whose software they are now looking at.

The sidebar was tidied. **The destinations were not rebuilt.** That is precisely the distinction
you drew in D-81 between repair and redesign, and it is why I think you are right that this needs
a redesign.

A second, smaller contributor: `/host/reports` is a host page that lives outside `/portal`, so
the host's address bar changes shape mid-journey. Cosmetic, but it adds to the sense of being
shuffled between systems.

---

## 5. The field-officer question, answered

> _"Field officers hold GTO access like any other GTO employee — I am not clear what a separate
> field-officer portal achieves, and that question should be answered before it is rebuilt."_

### The short answer

**A separate field-officer portal achieves nothing, and it costs us. Merge it.** Keep
`/portal/field-officer` as the field officer's _work-day home page_ inside the main app — the
same way any staff role has a landing dashboard — and stop treating it as a walled portal.

### Why

**1. Their permissions already say they are staff.** A field officer holds roughly thirty
permissions (`crm7/src/hooks/usePermissions.ts`, field-officer grant) including compliance
dashboards, WHS incidents and inspections, reports, contacts, calendar, tasks and site
assessments. An apprentice holds about eleven, all "my own". A host holds about eighteen, all
"at my site". The field officer is not in that family. They are staff with a caseload.

**2. The work they do already lives in the main app, and duplicating it is the actual cost.**
There is a full set of field-officer surfaces under `/field-officers/*` — actions, case notes,
competency assessments, incidents, site visits, site assessments — and a whole nav section for
them (`crm7/src/config/navigation.ts:307-320`). A walled portal would either have to link out to
those pages (which is exactly the re-orientation problem in §4) or rebuild them. Two copies of a
case-note screen is how compliance records end up in two places.

**3. Code House does not do it either, and their model is instructive.** In AnyTime the
distinctions that look like separate portals are not portals at all — they are _scopes and access
levels applied to the same screens_:

- A client-side **Line Manager** sees everyone at their company; a **Supervisor** sees only the
  employees they are named against in the hiring record (guide lines 120–126, 2290–2299). Same
  screens. Different rows.
- An administrator with **Consultant access** sees only timesheets and placements; full access
  sees everything (guide lines 846–860). Same screens. Fewer tabs.

That is the correct shape for a field officer: **the field officer is a scope (their caseload)
applied to staff surfaces**, not an audience needing its own building.

### What the alternatives cost you

| Option                                        | What it means                                                                                                                                                                                           | Consequence                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Merge (recommended)**                    | Retire the walled-portal framing. `/portal/field-officer` becomes their landing dashboard in the main app; nav stays the standard permission-filtered one, trimmed by observing what they actually use. | Cheapest. No duplicate surfaces. **The real work is that their caseload scope must be enforced in the database, not by page.** A field officer sees case notes, incidents and language/literacy/numeracy assessments about other people — that is sensitive personal information and the limit on _which_ apprentices must be an RLS rule. If it is only a page filter, it is not a limit at all. |
| **B. Keep a separate walled portal**          | Build portal-shaped versions of case notes, site visits, WHS logging, competency and LLN capture.                                                                                                       | Duplicates seven existing surfaces. Creates a second place compliance records can be written, and a second thing to audit. Buys nothing a scoped staff view does not. I recommend against.                                                                                                                                                                                                        |
| **C. Neither — treat it as a device problem** | Accept that the field officer's job is done standing in a workshop on a phone, and build a mobile task view over the _same_ data.                                                                       | This is a genuinely separate and real need, and it is **orthogonal to the portal question**. It should be considered on its merits after Decision 1, not used as a justification for a walled portal.                                                                                                                                                                                             |

**My recommendation is A, with C considered separately and later.** Option A is what the 5 August
pass also concluded, from the permissions evidence alone; the Code House study independently
supports it, which is why I am stating it as a recommendation rather than an option.

**One thing to be careful of if you accept A:** merging means field officers keep the full staff
navigation, which is a lot of menu. Do not fix that by guessing at a shorter list. Trim it by
looking at what they actually open, or ask two of them.

---

## 6. What each person is trying to get done

In their language, in the order they would care about it. Your list is the starting point; I have
extended it where the domain obviously demands. **"Exists" means the code is there — not that it
has been seen working by a real user.**

### 6.1 Worker / apprentice / trainee — one persona, three labels

The thing they open the app to do, on a Sunday night or in a lunch break, on a phone.

| #   | "I want to…"                                                             | Exists today                                                                                           | Notes                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Put my hours in for this week                                            | Yes — but the button sends them to an internal page (`/timesheets/create`)                             | The single most frequent action in the whole system. It should be the first thing on the page, not a menu item.                                                                                                                                    |
| 2   | Know if last week's hours were approved, and chase it if not             | Partially                                                                                              | They can see status. There is no "your supervisor hasn't approved yet" prompt.                                                                                                                                                                     |
| 3   | See my payslip and what I've been paid                                   | Partially — pay history exists; the download button routes to the internal payroll page, not a payslip | Real gap. Money surface, see §10.                                                                                                                                                                                                                  |
| 4   | See how much leave I have and ask for some                               | Yes — balances shown; request goes to an internal page                                                 |                                                                                                                                                                                                                                                    |
| 5   | Upload the documents you keep asking me for                              | **Yes, fully built** — `/portal/my-documents`                                                          | This was named as the biggest gap; it exists. It was invisible because `/portal` was blank until early August.                                                                                                                                     |
| 6   | Give you my bank, tax file number and super details now I've started     | **No**                                                                                                 | Named in your list. Highest-risk item here — see §10.                                                                                                                                                                                              |
| 7   | Know where I'm working, for whom, and who my supervisor is               | Yes                                                                                                    |                                                                                                                                                                                                                                                    |
| 8   | See where I'm up to in my apprenticeship — units done, units left        | Yes — training plan and progress reports                                                               | An apprentice also has a **training contract** with a nominal term and a probation period, and a **training plan** signed by three parties. They should be able to see both and see who has and hasn't signed. Partially built (signatures exist). |
| 9   | Know when my next block of training at the RTO is                        | Yes                                                                                                    |                                                                                                                                                                                                                                                    |
| 10  | Know when my field officer is next visiting                              | Yes                                                                                                    |                                                                                                                                                                                                                                                    |
| 11  | Read the policies and manuals you told me to read, and prove I read them | Yes — `/portal/org-documents` with acknowledgement                                                     |                                                                                                                                                                                                                                                    |
| 12  | Look at other jobs going and put my hand up                              | **No**                                                                                                 | Named in your list. An employed apprentice wanting a transfer has nowhere to look. Note: an _external_ candidate is a different persona owned by conduit — see §8.                                                                                 |
| 13  | Update my address, phone and emergency contact                           | Routes to the generic settings page                                                                    | Should be a short, worker-shaped form.                                                                                                                                                                                                             |
| 14  | Get my hours in when I'm on a site with no signal                        | **No**                                                                                                 | Not in your list; raising it because it is the most common real-world complaint about timesheet apps in trades. Worth a decision, not necessarily a build.                                                                                         |

### 6.2 Host employer

Two distinct people wear this badge and today the system does not distinguish them — see §7,
lesson 2, and §3.3.

| #   | "I want to…"                                                                                                                    | Exists today                                                                                                                   | Notes                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Approve this week's timesheets, fast, on a phone                                                                                | Yes — approve/reject wired                                                                                                     | The single most frequent host action. Deserves to be the whole home page during the approval window and nearly invisible outside it.                                                                                                                 |
| 2   | See who's rostered to me and who's on leave or at training                                                                      | Partially                                                                                                                      | A host being surprised that their apprentice is at TAFE is a recurring, real friction.                                                                                                                                                               |
| 3   | See what I'm being charged and why                                                                                              | Partially — routes to the internal invoicing module                                                                            | **Gated on Decision 2.**                                                                                                                                                                                                                             |
| 4   | Get my monthly pack — spend, compliance, progress                                                                               | Yes — `/host/reports`                                                                                                          |                                                                                                                                                                                                                                                      |
| 5   | Say who at my company can approve, and for whom                                                                                 | **No**                                                                                                                         | You named "manage supervisors". This is the missing supervisor concept (§3.3). It is also a control that reduces our admin load, because today supervisor changes come to us.                                                                        |
| 6   | Meet my WHS obligations — record an incident, keep inductions and safe-work-method statements current, confirm the site is safe | Partially — incident and risk-assessment pages exist but they are internal pages; **there is no host document-upload surface** | Statutory surface, see §10. The host has WHS duties for the apprentice on their site; a GTO also has non-delegable duties. The platform's job is to make recording easy and to keep the audit trail — **not to decide whether a duty has been met.** |
| 7   | Ask for another worker                                                                                                          | **No**                                                                                                                         | **Gated on Decision 3.**                                                                                                                                                                                                                             |
| 8   | Talk to my field officer                                                                                                        | Links to the internal field-officer directory                                                                                  | Should be "here is your field officer, here is their number", not a directory.                                                                                                                                                                       |
| 9   | Sign off a progress review                                                                                                      | Yes                                                                                                                            |                                                                                                                                                                                                                                                      |
| 10  | Keep my own record of who's been inducted on my site                                                                            | **No**                                                                                                                         | Not in your list; it is a normal host expectation and it is the host side of item 6.                                                                                                                                                                 |

### 6.3 Field officer

Assuming Decision 1 goes to "merge", this is a staff work-day list, not a portal list.

| #   | "I want to…"                                                         | Exists today                                                                                                             |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | See who's on my caseload and who I've not seen recently              | Yes                                                                                                                      |
| 2   | See where I'm going today and log the visit while I'm standing there | Partially — site visits exist; mobile capture does not                                                                   |
| 3   | Write a case note before I forget it                                 | Yes — but on an internal page, several clicks away                                                                       |
| 4   | Record an incident or a safety concern                               | Yes                                                                                                                      |
| 5   | Co-sign a training plan                                              | Yes                                                                                                                      |
| 6   | Record a language, literacy and numeracy assessment                  | Yes                                                                                                                      |
| 7   | See which of my apprentices is behind on units or hours              | Partially                                                                                                                |
| 8   | See which of my hosts is behind on timesheet approvals               | **No** — and this is the highest-value thing on this list, because a field officer is the person who can actually fix it |

### 6.4 Training provider (RTO) and workplace

Not named in D-81 but they have portal routes and are part of "the same shape" question. Both are
thin today. The RTO needs: which of our apprentices are enrolled with them, results in, and unit
completions out. The workplace portal serves a direct-hire employer using crm7 for their own
workforce — a different commercial arrangement, and I would park it rather than redesign it in
this pass.

---

## 7. What Code House actually does — the layout study D-82 asked for

Read from `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md`. Line references are to that file.
This is a 2022 web application, so I am not proposing we copy its looks. What is worth copying is
its _structure_, and the structure is unusually disciplined.

**Lesson 1 — One system, three user types, not three systems.** (lines 102–130) AnyTime has
Administrators, Clients and Employees signing into the same application; "based on the type of
User accessing the system, the level of functionality and information visible will differ
slightly." Not "differ entirely". The screens are the same screens.

**Lesson 2 — What looks like a role is usually a scope.** (lines 120–126, 2290–2299) A client's
Line Manager sees the whole company's timesheets; a Supervisor sees only the employees they are
named against in the hiring record. Same screens, different rows. Likewise Consultant vs Full
Access on the admin side (846–860). **This is the single most transferable idea in the document**
and it is the answer to both the field-officer question (§5) and the missing-supervisor gap
(§6.2 item 5).

**Lesson 3 — Access is a flag on the master record, not a separate account system.** (lines
2211–2216 for employees, 2256–2280 for client contacts) You tick "AnyTime Employee: YES" on the
person's record in Workforce One, give them an email address, and the next sync sends them a
welcome email with their sign-in details. Portal access is an attribute of a person we already
have, switched on where we already work. **Our equivalent should be a toggle on the person and
host-contact records, not a special invite workflow buried in two pages** (§3.2).

**Lesson 4 — The portal never owns master data.** (lines 838–840, verbatim) "User details cannot
be amended within AnyTime. Any changes to names, email addresses and mobile numbers will need to
be made in Workforce One." One owning system per fact. This is the same doctrine BSuite already
holds internally, and it should be stated explicitly for the portals: a portal is a place to
_transact_ and to _see_, not a second place data lives.

**Lesson 5 — The pay period is the spine.** (lines 230–240) Every timesheet screen defaults to
the current pay period; you change period from one dropdown that stays put. The user is never
asked "which week are you looking at?" by the absence of an answer.

**Lesson 6 — Status is a filter on one list, never a set of separate pages.** (lines 210–228)
Submitted, Rejected, Approved, Not Ready to Upload, Ready to Upload, Did Not Work, All — one
screen, seven filters. **Contrast our approach, where the equivalent states are reached through
different modules at different addresses.** This is a large part of why our experience requires
re-orientation and theirs does not.

**Lesson 7 — The placement is the second spine, and it is load-bearing.** (lines 763–779) The
placement carries the employee, the client, the dates, the pay rules, the default supervisor, the
stream and the purchase order number — and a timesheet can only exist against a placement whose
dates cover the pay period. Everything hangs off it. Our data model has the same object; our
portal navigation does not treat it as the spine.

**Lesson 8 — Chasing is a first-class feature, not an afterthought.** (lines 148–152, and the
supervisor-notification screens around 637–655) There is a Missing Timesheets list that emails
and texts the employees on it, and an Awaiting Approval list that emails and texts the
supervisors on it, in bulk, from the screen you are already looking at. **A GTO's actual weekly
pain is chasing.** We have none of this.

**Lesson 9 — WHS is attached to the transaction, not parked in a module.** (lines 2052–2078,
552–555) You configure questions that the employee must answer _before submitting_ a timesheet
and/or the supervisor must answer _before approving_ one; each question can be text, yes/no, or
yes/no-with-text; a question can be marked supervisor-only; answers are emailed to a nominated
WHS contact. Administrator-entered timesheets skip the questions and that exception is documented.

This is an elegant piece of design and it fits our doctrine exactly: **the platform asks the
question, routes the answer and keeps the record — the GTO and the host decide what a bad answer
means.** It would need to be an operator decision (§1) because it changes what hosts have to do
each week.

**Lesson 10 — Everything that touches money is audited.** (lines 2085–2092, 944–959) A full
history log of who signed in and every action affecting submission or approval; unsubmitting an
approved timesheet or leave application requires a typed reason and notifies both the supervisor
and the employee. Nothing about a payment-triggering approval is quiet.

**Lesson 11 — Leave and timesheets are one workflow.** (lines 880–899) Leave applications go
through the same submit/approve/reject/unsubmit machinery, and an approved leave application
auto-fills the hours on the timesheet for that period. We treat these as two modules.

**Lesson 12 — Entry ergonomics matter more than features.** (lines 558–575) 24-hour times, hours
calculated not typed, copy-down across the week, and a "copy last timesheet" button. A person
entering the same 38 hours for the fortieth time should press one button.

**And one thing not to copy.** (lines 180–183, 191–192) AnyTime's sign-in screen makes the user
choose their User Type from a dropdown before entering a password — and the forgotten-password
screen asks again. That is making the user do the system's job. We know who they are once they
sign in; we should never ask.

---

## 8. What should be shared and what should not

Your observation that the five portals are "largely the same shape" is correct, and the code
agrees with you more than it looks: they share one shell, one card vocabulary, and one data
layer already.

**Recommendation: one portal surface, role-scoped, with a distinct home page per persona.** Not
five applications; not one undifferentiated page.

What that means concretely:

**Shared — build once:**

- The shell. One portal layout that is _not_ the GTO's internal sidebar, with a persona name in
  it so the user always knows whose software they are in.
- The pay-period selector and the "current period" concept (lesson 5), sitting in the header and
  persisting as you move around.
- The "what needs me" strip — the portal's version of Missing Timesheets and Awaiting Approval
  (lesson 8). Same component, different query per persona.
- Documents: upload, view, acknowledge. A host uploading a safe-work-method statement and an
  apprentice uploading a licence are the same interaction. The upload machinery already exists
  and is shared (`crm7/src/components/documents/DocumentHub.tsx`).
- Notifications and the chase mechanism.
- The audit log behind every approval (lesson 10).

**Not shared — genuinely different:**

- The home page. A worker's home is "this week's hours and my pay"; a host's home is "who needs
  approving"; an RTO's home is "results in, completions out". These are different questions and
  they should look different.
- Money. A worker sees their own pay; a host sees what they are charged. These must never be the
  same component, because the failure mode of getting it wrong is a worker seeing our margin or a
  host seeing another host's rates.
- The approval action. Only a host approves; only a worker submits. Do not build a generic
  "approve thing" component.

**Explicitly outside this portal — do not fold in:**

- **The candidate.** An external applicant has no account and no person record with us. That
  persona lives in conduit at `/portal/careers` (public job board) and `/portal/candidate`
  (authenticated). Pointing a job advertisement at `/portal/worker` — which is what crm7#1681
  asks for — **would not work**: that route requires an existing signed-in worker, so an applicant
  would hit a sign-in wall. The right target is conduit's careers board. This was correctly
  identified on 5 August and I agree with it.
- **Our own staff's dashboard.** If Decision 1 goes to "merge", the field officer's home is a
  staff dashboard, not a portal page, and it should stop being described as a portal.

**So: four external portal personas** (worker/apprentice/trainee, host, RTO, workplace),
**one candidate surface elsewhere**, and **field officer as staff**. That is the shape I would
build to.

---

## 9. The navigation model

The instruction was to remove the constant re-orientation. Re-orientation happens for three
reasons, and each has a fix.

**Cause 1: the user is put somewhere that was not built for them** (§4 — 14 of 20 menu
destinations). **Fix:** a hard rule — _no navigation item in a portal may point outside
`/portal`_. Every destination is a portal page or it is not in the menu. If a portal page for
some task does not exist, the honest answer is that the task is not yet supported, not a link into
the payroll module.

**Cause 2: the user loses the thread of "which week / which placement"** — because each module
has its own filters and its own default. **Fix:** lessons 5 and 7. The pay period and the
placement live in the portal header and persist across every page. A worker with one placement
never sees a placement selector at all.

**Cause 3: things that are one job are split across pages** — status by module, leave separate
from timesheets. **Fix:** lessons 6 and 11. One list, filter chips. Leave and hours in one place.

### The shape I would propose

A portal home that answers, above the fold and without a click:

1. **What needs me right now.** Nothing else competes with this. For a worker in the submission
   window: "Your hours for week ending 17 Aug are due." For a host on a Monday: "6 timesheets
   waiting for you." Outside those windows it collapses to a quiet line.
2. **Where I am.** Worker: my placement, my host, my supervisor. Host: my site, my workers.
3. **The recent history of the thing I do most.** Last four weeks of hours and their status, as a
   list with filter chips — not four separate pages.

Then a short, flat menu. **Five items maximum, all inside `/portal`.** For a worker something
close to: My work · My pay · My training · My documents · My details. For a host: Approvals ·
My workers · Safety · Invoices · My contacts. Names are the persona's words, not our module
names — "My pay", never "Payroll"; "Safety", never "WHS & Compliance".

No nested submenus. If something needs a submenu, it is probably a staff surface that has drifted
into the portal.

### Three ways to implement that, and my recommendation

| Option                                   | What it is                                                                                                                                                                                                                     | Cost                                                                                                              | Verdict                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Keep curating**                     | Keep the existing shell; keep trimming `PORTAL_NAV_SECTIONS`; rebuild the 14 misrouted destinations as portal pages one at a time.                                                                                             | Low per step, and it never finishes — the portal still renders inside a shell built for staff.                    | This is what 5 August did. It is repair.                                                                                                                              |
| **2. A real portal shell (recommended)** | One `PortalLayout` component. Portal users never render the internal sidebar at all. The persona's home page, the pay-period header, and the "what needs me" strip live in it. Destinations rebuilt as portal pages behind it. | Moderate. The shell itself is small; the work is the destinations, and that work is unavoidable under any option. | **Recommend.** It makes the §4 rule enforceable rather than aspirational — if the internal sidebar cannot render, a link into an internal page becomes visibly wrong. |
| **3. A separate portal application**     | Its own deployment and sub-domain.                                                                                                                                                                                             | High. New sign-in path, new deployment, a second place every shared component must be kept current.               | Reject. It buys separation we can get from a layout component, and the estate deliberately moved away from cross-application session sharing.                         |

---

## 10. Money, statutory obligations and personal data

Flagged deliberately, because these are the parts where a UX improvement can become a legal
problem.

**Timesheet approval is a payment trigger.** A host approving a timesheet is the event that leads
to an apprentice being paid and a host being invoiced. Consequences for the redesign: an approval
must be attributable to a named person with a timestamp; it must be visible in an audit log that
the approver themselves cannot alter; reversal must be possible but must require a typed reason
and must notify both sides — Code House does exactly this (§7, lesson 10) and it is the right
standard. And it must be genuinely hard to do accidentally: "approve all" on a phone, with no
confirmation, is a real risk if we optimise this screen purely for speed.

**Payslips and entitlements are the employee's statutory record.** Whatever the portal shows must
be what payroll issued — displayed, never recalculated in the interface. If two numbers can
disagree, one of them is wrong and we own the difference. **This is Decision 4** (§1): is the
portal the system of record for the payslip document, or a viewer over payroll's? I would
strongly prefer viewer.

**Bank details, tax file number and superannuation choice are the highest-sensitivity data in
this entire scope.** Your list says "provide financial details once employed", and that sentence
is one line in a directive and a substantial compliance build. A tax file number in particular
attracts specific handling obligations. My advice: **do not build this as part of a navigation
redesign.** Capture-once, write straight through to the payroll system, never display back in
full, never log, never cache in the browser. It deserves its own piece of work with its own
review. It is the one item on your list I would explicitly carve out.

**WHS is where "facilitates, does not determine" matters most.** A host has duties for a worker
on their site; a GTO has duties it cannot delegate to the host. If we build the Code House
question flow (§7, lesson 9), the platform asks the questions, routes the answers to a nominated
person and keeps the record — **it must not block a timesheet, close an incident, or state that
an obligation has been met.** A screen that says "WHS compliant" is a determination and we should
never draw it.

**Whose rows can each person see.** Two specific hazards:

- A host contact must see only their own placements. A supervisor, if we introduce the concept,
  must see only the workers they supervise. Cross-host exposure on placements is already noted as
  an unfiled concern in your own directive (D-60).
- A field officer sees case notes, incidents and language/literacy/numeracy assessments about
  people. If Decision 1 goes to "merge", **the caseload limit must be a database rule.** A page
  filter is not a privacy control.

**Guardians.** A first-year apprentice may be under eighteen, in which case a parent or guardian
has a role in the training contract and consents. Consent records exist in the data today. Worth
a decision on whether a guardian ever gets portal access, because if they do it is a fifth
external persona and it carries its own privacy questions.

---

## 11. Sequencing — what is cheap, what is not

**Nothing starts until Decisions 1–3.** Decision 1 changes whether field officer is in scope at
all. Decision 2 changes the size of the host portal by a large factor. Decision 3 changes whether
a host portal is a viewing surface or a transacting one.

**Cheap, and worth doing regardless of how the decisions land:**

- Make "invite this person to the portal" available from any person and host-contact record,
  rather than only from two workflow pages (§3.2). The mechanism already exists.
- Re-scope crm7#1680 to what is actually missing, and correct crm7#1681's target from
  `/portal/worker` to conduit's careers board.
- Rename the misleading menu labels — "My Training Plan" must not point at the staff directory.
- Move `/host/reports` under `/portal` so a host's address stays in one place.
- Stop describing "trainee" as a separate portal.

**Moderate, and the core of the redesign:**

- The portal shell, the pay-period header, and the "what needs me" strip (§9, option 2).
- Rebuilding the worker's four most-used destinations as portal pages: submit hours, hours
  history, leave, my details.
- Rebuilding the host's approval queue as a portal page rather than the payroll module.
- The supervisor concept — a host contact scoped to the workers they supervise (§7, lesson 2).
  This is a database change as well as a screen.

**Not cheap — each needs its own piece of work:**

- The host's money view. Gated on Decision 2 and it is the difference between showing an invoice
  and exposing a rate build-up.
- A worker-shaped payslip. Gated on Decision 4.
- Bank, tax file number and superannuation capture. Carve out entirely (§10).
- Chasing — the missing-timesheet and awaiting-approval lists with email and SMS (§7, lesson 8).
  High value for the GTO's actual weekly workload, and a genuine build including message
  templates and a sending path.
- WHS questions at submission and approval. Gated on Decision 5 because it changes what hosts do.
- Mobile capture for field officers, and offline entry for workers on sites with no signal.
- The internal "browse open roles" surface for an already-employed apprentice, which needs a
  decision about which system owns a job advertisement.

**Risks to name before anyone starts:**

- The largest is doing option 1 again — trimming menus, calling it a redesign, and leaving the 14
  destinations pointing into staff pages. That is the failure mode this document exists to
  prevent.
- The second is building the shell and not the destinations, which produces a beautiful frame
  around the same problem.
- The third is scope creep through the money surfaces. Every one of them is gated on a decision
  only you can make, and they should not be started before those decisions.

---

## 12. What I did not verify, and what I do not know

Stated plainly so nothing here is read as more certain than it is.

- **No live testing.** Nothing in this document was verified by signing in as a worker, a host or
  a field officer and using the portal. Every claim about current behaviour is read from source
  code on `development` at 2026-08-13, with the file and line given. Claims about what a page
  _feels_ like to use — including my reading of where the re-orientation comes from — are
  inferences from route and layout structure, not observations. **The route destinations in §4
  are a matter of record and I am confident in them; the experience they produce is an inference.**
- **No user research.** There is none in this document. Where I have said what a persona wants, it
  comes from your directive, from the domain, or from the data model. I have not spoken to a
  worker, a host or a field officer, and I have not invented anything that suggests I have. The
  places I most want to be corrected: the worker's priority order in §6.1, and whether a host's
  real weekly pain is approving or being told what things cost.
- **No screenshots or mockups.** Deliberately. Producing a picture of a portal that does not exist
  would make this look more settled than it is.
- **Not verified:** that the invite database functions (`portal_invite_mint`, `portal_invite_accept`)
  have actually been applied to the live database. The application code calls them; I did not
  check the migration. If they have not been applied, the invite path in §3.2 does not work and
  crm7#1680 is less stale than I have said.
- **Not verified:** what a host or worker actually sees when they land on the internal pages the
  menu points at. Database rules may hide most of it, in which case some of those 14 destinations
  render as near-empty admin tables rather than as other people's data. **Either outcome is a bad
  experience, but they are different bugs**, and which one it is should be checked before anyone
  designs the replacement.
- **Assumption:** that `/portal/workplace` serves a direct-hire employer using crm7 for its own
  workforce. That is read from the routing logic, not from a product statement.
- **Age of the Code House manual:** it is dated 2022 and describes AnyTime as it then was. Code
  House will have moved on. I have drawn structural lessons from it, not a feature list.

---

## Sources

**Primary, per D-82:**

- `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` — Code House, AnyTime User Guide for
  Administrators, 2,390 lines. Read in full; line references throughout §7.

**Prior work built on rather than repeated:**

- `crm7/docs/plans/20260805-portal-persona-jobs-to-be-done-v1.00W.md` — the 5 August persona pass
  and the navigation change it shipped. Its Codehouse-document conclusion is corrected in §2.
- `docs/plans/20260506-codehouse-parity/` — nine per-portal parity sub-plans.
- `docs/20260730-competitor-parity-matrix-v1.00W.md` — crm7 timesheets against AnyTime.
- `docs/references/codehouse-knowledgebase-crawl.md` — the article-title crawl that was mistaken
  for the Codehouse document on 5 August.

**Code read for §3, §4, §5:**

- `crm7/src/App.tsx` (route table), `crm7/src/pages/portal/*`, `crm7/src/pages/portal/index.tsx`
  (routing logic), `crm7/src/config/navigation.ts` (nav sections and portal menus),
  `crm7/src/layouts/MainLayout.tsx`, `crm7/src/components/dashboard-shell.tsx`,
  `crm7/src/components/portal/PortalScopeGate.tsx`, `crm7/src/lib/portalInvite.ts`,
  `crm7/src/lib/roleMappingService.ts`, `crm7/src/hooks/usePermissions.ts`,
  `crm7/src/hooks/usePortalContext.ts`.

**Issues:** crm7#1680, crm7#1681 (both open; §3.2 and §11 recommend re-scoping both).
