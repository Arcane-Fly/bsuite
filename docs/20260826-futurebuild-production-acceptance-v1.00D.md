---
kind: record
authority: none
owner: bsuite
---

# FutureBuild Academy — production acceptance test before the 09:30 demo

**Document:** 20260826-futurebuild-production-acceptance-v1.00D
**Written for:** Braden
**Tested:** `https://crm.crm7.app` — **production**, not a preview
**Measurement window:** 2026-08-25 22:14 – 22:55 AWST (14:14 – 14:55 UTC)
**Status:** D (Draft) — findings are measured; nothing here has been fixed by me

> **Corrected at 22:55 AWST, before delivery.** An earlier draft of this document described the
> outage in D-1 as ongoing. **It was not — it recovered at 22:52:59.** The correction is applied in
> full below rather than appended, because a stale severity is worse than no severity. Both incidents
> in §2 are now closed, and the "what to do before 09:30" list in §5 has changed accordingly.

---

## Plain-English summary

I opened your live CRM as a signed-in user, switched it to FutureBuild Academy, and counted what
actually appeared on the screen — not whether the page loaded, but whether every row and every
field in it was really there.

**The good news, and it is the thing you asked for: the data is fine.**
All eight placements appear, with their fields filled in. So do all eight people, all eight training
contracts, all three timesheets, all four host employers and all five clients. I checked in the light
colour scheme and the dark one, on a wide screen and a narrow one. I found no blank rows, no
"undefined", no error messages in the browser, and no failed data requests.

**Then two things went wrong while I was testing. Both have since stopped, but you need to know
about them, and one has left a mess that still needs cleaning up.**

1. **Something wrote fake test records into FutureBuild's real data** between 22:38 and 22:45 AWST,
   about one a minute, while I watched. Their contacts went from 13 to **23**, and their training
   contracts from 8 to **10**. It has been quiet since 22:45. **I did not do this, I have not deleted
   anything, and the fake records are still sitting there.** Placements, people, timesheets and user
   accounts were never touched.
2. **The login service for the whole platform stopped responding for about seven minutes**
   (roughly 22:45 to 22:53). Nobody could sign in to any app during that window. **It has recovered**
   — I re-tested and the placements page is back to showing all eight rows.

Neither is a bug in the pages I was asked to test. **The outage is over. The fake records are not —
they will be on screen at 09:30 unless somebody removes them.**

### Glossary

Every technical term used in this document, in plain words.

| Term | What it means |
| --- | --- |
| **Production** | The real, live website your clients use — as opposed to a test copy. |
| **Tenant** | One customer's separate compartment of the system. FutureBuild Academy is a tenant; so is Braden Group. Data in one tenant should never appear in another. |
| **Row** | One record — one placement, one person, one contact. |
| **Cell** | One field inside a row — the apprentice's name, the start date, the hourly rate. |
| **Populated** | The cell actually contains a value, rather than being blank. |
| **RLS (Row Level Security)** | The database's own rule about which rows a given user is allowed to see. It is the last line of defence for keeping tenants apart. |
| **Service worker** | A piece of code a website installs in your browser so it works offline. It can serve you yesterday's version of a page. I switched it off so I was measuring today's. |
| **PWA (Progressive Web App)** | A website that can be "installed" like a phone app. This is what the "Install BSuite CRM" prompt is offering. |
| **White-label / branding** | Showing the client's own logo and colours instead of ours. |
| **Stat card** | The four summary boxes at the top of a page ("Active Placements 6"). |
| **Acting-as** | A support feature that lets a platform administrator temporarily view the system as though they were inside a particular client's tenant. |
| **521 / 522** | Error codes meaning "the server behind the front door is not answering". A platform-level outage, not a coding mistake in your apps. |
| **UTC / AWST** | Coordinated Universal Time; Perth time is UTC + 8 hours. |

---

## 1. The acceptance test — surface by surface

The test was not "does the page load". It was: **do the expected rows appear, and are their fields
filled in?** "Expected rows" is the number I counted directly in the database first, so that the
screen could be compared against the truth rather than against a guess.

"Populated" counts only the cells that are actually **visible at that screen width** and that are
supposed to hold text. The tick-box column and the icon-only "Actions" column hold controls, not
text, so they are excluded from the numerator and noted separately — counting them as "empty" would
have produced three false failures.

| Surface | URL | Expected rows | Rendered rows | Populated cells (first 3 rows) | Verdict | Evidence |
| --- | --- | ---: | ---: | --- | --- | --- |
| Placements list | `/placements` | 8 | **8** | 21 of 21 text cells (3 tick-boxes excluded) | **PASS** | `shots/_placements-light-1440.png` |
| Placement detail | `/placements/{id}` | 1 | **1** | all 9 detail fields + both rate cards | **PASS** | `shots/06-placement-detail-light-1440.png` |
| People list | `/people` | 8 | **8** | **30 of 30** | **PASS** | `shots/_people-light-1440.png` |
| Person detail | `/people/{id}` | 1 | **1** | 16 labelled fields, no blanks | **PASS** | `shots/person-detail-light.png` |
| Contacts list | `/contacts` | 13 | **13** | 15 of 15 text cells | **PASS at 22:25**, then contaminated — see §3 | `shots/_contacts-light-1440.png` |
| Training contracts | `/contracts/training` | 8 | **8** | 21 of 21 | **PASS on rows, FAIL on the summary** — see D-4 | `shots/_contracts_training-light-1440.png` |
| Host employers | `/hosts` | 4 | **4** | 15 of 15 | **PASS** | `shots/_hosts-light-1440.png` |
| Clients | `/clients` | 5 | **5** | 18 of 18 | **PASS** | `shots/_clients-light-1440.png` |
| Timesheets | `/timesheets` | 3 | **3** | 15 of 15 text cells (3 icon-only Actions excluded) | **PASS** | `shots/_timesheets-light-1440.png` |

**Every count matches the database exactly. There are no missing placements and no empty rows.**

### Colour scheme and screen width

| Surface | Light 1440px | Dark 1440px | Light 768px | Dark 768px |
| --- | --- | --- | --- | --- |
| Placements | 8 rows, 21/21 | 8 rows, 21/21 | 8 rows, 15/15 | 8 rows, 15/15 |
| People | 8 rows, 30/30 | 8 rows, 30/30 | 8 rows, 30/30 | 8 rows, 30/30 |

At 768px wide the placements table deliberately hides two columns — **Qualification** and
**Billing Rate**. That is the design, not a fault, but it is worth knowing before the demo:
**the hourly charge rate is not visible on any screen narrower than 1280px.** If you present on a
small laptop, that column will simply not be there.

### Other checks

- **Browser errors:** none. Across every page, colour scheme and width, zero JavaScript errors.
- **Failed data requests:** none. No 400, 403 or 500 on any data call. The only network entries were
  four harmless "aborted" markers on the training-contracts page, which is the normal pattern when a
  page cancels a request it no longer needs — the data arrived and rendered regardless.
- **Nonsense values on screen:** none. No "undefined", "NaN", "Invalid Date", "[object Object]" or
  "Unknown Person" anywhere.
- **Loading time:** the first row appeared between 3.9 and 6.5 seconds. I waited 45 seconds before
  measuring, so nothing here is a "I judged it too early" artefact.

---

## 2. Defects found, most serious first

### D-1 · RESOLVED (was a BLOCKER) · The login service went down for about seven minutes

> **Closed at 22:52:59 AWST.** Sign-in works again, and I have re-verified the whole thing end to end:
> the placements page renders all **8 rows**, the tenant name is back in the header, and all 32 data
> requests returned success. This entry is kept because it happened during the demo-eve window and
> because it may recur — not because it is currently broken.

**Where:** every app — `crm.crm7.app`, `suite.crm7.app` and the rest all share one login service.
**What you would have seen:** you could not sign in. If already signed in, pages stopped showing
data. The placements page that showed eight rows at 22:41 showed **zero rows and no tenant name** at
22:49, and was back to eight rows at 22:54.

**What I measured**

| Endpoint | Result |
| --- | --- |
| Login health check | 521 five times, then 522, sampled every 5 seconds for 30 seconds — persistent |
| The actual sign-in call (`token?grant_type=password`) | **522** |
| Data queries (`rest/v1/rpc/...`) | 521 |
| Direct database connection | connection timeout |
| Image/file storage | **200 — fine** |
| The website itself (`crm.crm7.app`) | **200 — fine** |

**What this means.** The website loads, because the pages themselves are served from a fast global
cache. Behind it, the part that checks who you are and fetches your data is not answering. 521 and
522 are "the server behind the front door is not responding" — that is a hosting-platform problem,
not a mistake in your code.

**The trap to avoid:** opening `crm.crm7.app` in a browser shows a normal-looking page and proves
nothing. The test that actually tells you is the sign-in call. Anyone re-checking this must use that,
not a page load.

**Timing.** Production was completely healthy from 22:22 to 22:41 — my whole acceptance run passed
against it. The outage began between 22:45 and 22:49, and cleared at 22:52:59. Total: roughly seven
minutes.

**What I have not concluded.** D-1 and D-2 overlap almost exactly — the fake records stopped arriving
at 22:45:21, which is when the outage started. That is suggestive in *both* directions and I am
treating neither as proof. It may be that whatever was writing caused the outage; it may equally be
that the outage simply killed whatever was writing. **The second reading matters more, because if the
writer was only interrupted rather than stopped, it can start again.** As of 22:57 it has been quiet
for twelve minutes.

**A caution for whoever re-tests this.** Loading `crm.crm7.app` in a browser is not a test. During the
outage the site returned a perfectly normal-looking page, because the page itself comes from a cache
that sits in front of the broken part. The only reliable check is the sign-in call.

---

### D-2 · BLOCKER · Fake test records were written into FutureBuild's real data — and are still there

> **The writing has stopped** (last one 22:45:21, nothing anywhere in the system since). **The records
> have not been removed.** This is the one thing in this document that will still be visible to your
> client at 09:30 if nobody acts.

**Where:** FutureBuild Academy's contacts and training contracts, in the live database.
**What you would see:** **ten** invented contacts, all with `@example.com` email addresses, mixed in
among FutureBuild's thirteen genuine ones — on a screen you are about to show the client — plus two
invented training contracts.

**What I measured**

| Time (AWST) | Event |
| --- | --- |
| 22:14 | Baseline. Contacts 13, placements 8, people 8, training contracts 8, users 3, timesheets 3 — **exactly the numbers in your brief.** |
| 22:19 | 3 records inserted into the *Demo Organisation* tenant. |
| 22:25 | My screen test rendered **exactly 13** FutureBuild contacts. Still clean. |
| 22:38:55 | **First unauthorised insert into FutureBuild.** |
| 22:38 – 22:45:21 | Ten contacts inserted (13 → 23), in two bursts of five. |
| 22:40 and 22:45 | Two training contracts inserted (8 → 10). |
| 22:45:21 onward | **Stopped.** No record has been written anywhere in the system since. |

**Final tally.** Contacts 13 → **23**. Training contracts 8 → **10**. **Placements (8), people (8),
timesheets (3) and user accounts (3) are all exactly as they were.** The three tables that matter most
for your demo were never touched.

**Fingerprint of the writes:** every one of the ten has an `@example.com` address and matches a
test/demo naming pattern. The arrival pattern was two bursts of five, spaced about 21–24 seconds
apart — the rhythm of an automated timer, not of somebody typing.

**It was not me, and I have checked this harder than anyone else is likely to.** I audited every one
of my eight test scripts: they contain **zero** database write calls, **zero** form fills, **zero**
keystrokes, and exactly **three** mouse clicks — all three on the tenant-switching menu in the header.
Every page was reached by typing its address directly; I never opened a "create" screen. My only
change of any kind was switching my own account into "acting-as" mode, which cannot create a contact,
and I have since switched it back.

**One thing I found that points at me, which you should know about anyway.** The writes followed
*my* view. While my session was pointed at Demo Organisation, three fake contacts appeared in Demo
Organisation; when I switched to FutureBuild, ten appeared in FutureBuild. Same fake-email
fingerprint both times. I cannot explain that, and I have reported it against myself rather than
hand you a clean denial.

**Two tests I ran that argue against my probe being the cause:**

- I suspected that *viewing* a placement might silently create a contact for its supervisor — the
  detail page does pull supervisor records. I checked: **none** of the ten fake contacts matches any
  FutureBuild supervisor's name. That theory is dead.
- After the writing stopped, I loaded the placements page again as a FutureBuild user, waited, and
  watched it make 32 data requests. **The contact count did not move.** So loading that page does not
  create records.

**A correction I owe you.** My first alert said the empty "created by" field proved these came from an
automated process rather than a person using the app. **That was wrong and I withdraw it.** That field
has no automatic default, so it is left empty by *any* code that does not deliberately fill it in,
including the app's own screens. It identifies nobody — including me.

**What I have deliberately not done.** I have not deleted the fake records and I have not written
anything to compensate. Deleting is itself a write to your client's data, it is destructive, and it is
not mine to authorise. They are sitting exactly as I found them, for you to look at.

**The clean-up is simple**, because the bad records are exactly identifiable: FutureBuild's tenant,
created after 22:38 tonight, `@example.com` address. Whoever does it should run it as a *look-only*
query first, confirm that nothing but `example.com` rows come back, then remove them, then confirm the
contact count returns to **13** and training contracts to **8**. The three Demo Organisation records
need the same treatment.

**Before cleaning up, satisfy yourself the writer is genuinely stopped and not merely interrupted** —
see the timing note in D-1. Cleaning up while it is still running would achieve nothing.

---

### D-3 · HIGH · FutureBuild's own logo never appears — a different tenant's logo shows instead

**Where:** the top-left logo and the sidebar logo, on every page.
**What you would see:** the generic BSuite swirl where FutureBuild's own "FutureBuild Academy" logo
should be. In the light colour scheme it is **Braden Group's** logo file; in dark it is the BSuite
platform one. FutureBuild's own logo appears in **neither**.

**Why this is not simply a missing file.** I fetched both of FutureBuild's logo files directly from
storage. Both exist and both download cleanly (light 12 KB, dark 11 KB), and their branding record
correctly points at them. The files are fine; the app is not asking for them.

**What is actually happening.** There are two separate branding lookups running on the same page, and
they disagree about which client you are looking at:

- One asks the database "what branding applies?" **without saying which tenant**. It answers with the
  *earliest client you ever joined* — which for you is Braden Group. That answer supplies the logo,
  and it also carries the company name **"Braden Pty Ltd"**. It is then cached in the browser.
- The other correctly asks for FutureBuild specifically, and supplies the colours. FutureBuild's navy
  and orange (`#06284c` / `#f9a352`) **are** applied correctly.

So the colours are right and the logo is wrong, on the same screen, for the same reason two different
pieces of code answer the same question differently.

**Who this actually affects — this matters.** A real FutureBuild employee belongs to one client only,
so that first lookup returns FutureBuild and *their* branding is correct. **The fault appears only for
someone who switches between clients — which is exactly you, demonstrating FutureBuild.** You are not
a member of their tenant (I checked: all three of their users are their own staff), so switching is
your only way in, and switching is the one thing this lookup ignores.

**Reassurance on severity:** the logo being shown happens to be the plain BSuite swirl, so the client
will read this as "our logo isn't showing", not as "we are looking at another company's brand". And
this is **not** a security hole — the lookup runs with your own permissions and you are entitled to
see Braden Group's branding. It is a wrong-question bug, not a leak.

**The fix is one database function**, changed to ask "which client am I currently acting as?" before
falling back to "which did I join first?" — the same order the rest of the app already uses. I have
not made that change: it is a shared-branding component, it needs its own visual sign-off, and it is
not this lane's to touch.

---

### D-4 · HIGH · "Total Contracts 397" on a client who has eight

**Where:** `/contracts/training`, the fourth summary box.
**What you would see:** FutureBuild's training contracts page correctly lists their 8 contracts, and
then a large box announcing **397 Total Contracts**.

**What that number is.** 397 is (near enough) **every training contract in the entire system, across
all three clients** — I counted 399 in the database moments later. It is not FutureBuild's number and
it never was.

**Why.** The four summary boxes are built from four counting queries that ask the database for a
total **with no client filter at all**. They bypass the mechanism the rest of the page uses to stay
inside one client. The only thing narrowing them is the database's own permission rule — and because
your account is a platform developer, that rule lets you see everything.

**Who this affects.** A normal FutureBuild user would see 8, because the permission rule would narrow
it for them. **You, presenting, will see 397.** It is still a genuine defect either way: a query with
no client filter is one permissions change away from showing that number to everyone, and it already
shows it to every administrator.

**Scope check.** I searched the whole of crm7 for this pattern and found it in **9 files**. I am
deliberately *not* claiming all nine are broken — several are portal pages that filter by employer
instead, and reporting a search count as a finding is exactly how false alarms get written. I have
proved one, and named the class so someone can check the other eight properly.

**A near-miss worth recording:** the "Active Contracts 6" box on the same page is *also* unfiltered,
but it happens to read correctly — because all six active training contracts in the whole system
belong to FutureBuild. A correct-looking number from a broken query.

---

### D-5 · HIGH · "0 apprentices placed" underneath six active placements

**Where:** `/placements`, the first summary box.
**What you would see:** **"Active Placements 6"**, and directly beneath it, **"0 apprentices placed"**
— while eight named apprentices are listed in the table immediately below.

**Why.** The system has two ways of linking a placement to a person: an older "apprentice" link and a
newer "person" link. **All eight of FutureBuild's placements use the newer link and have the older one
empty.** The table body was fixed for this some time ago and correctly shows every name. The summary
box was not — it still counts only the old link, finds nothing, and prints 0.

**Why nobody caught it.** Your Demo Organisation data uses the *old* link, so this box reads correctly
there. **It is wrong only on the real client's data** — which is precisely why testing against
FutureBuild was worth doing.

---

### D-6 · HIGH · One of the eight placements is in none of the summary totals

**Where:** `/placements`, the summary boxes and the badges beneath them.
**What you would see:** Active 6, Pending 0, Completed 0, and badges reading "6 Successful" and
"1 On Hold/Terminated". That is **seven**. The fourth box on the same screen correctly says
**"8 total placements"**. Two numbers on one screen disagree.

**Why.** FutureBuild's eight placements are 6 active, 1 **suspended**, 1 terminated. The summary
counts active, pending, completed, on-hold, cancelled and terminated — **but not "suspended"**. It is
a perfectly valid status the system uses; nothing counts it. The filter buttons (All / Active /
Pending / Completed) cannot reach it either.

**To be clear: the row itself renders correctly in the table.** This is a wrong summary, not a
missing placement.

---

### D-7 · MEDIUM · The "Install BSuite CRM" prompt sits on top of the client's data

**Where:** every page, bottom-left.
**What you would see:** a panel offering to install the app, **overlapping the first row of the
placements table** and hiding the apprentice's name. Present in both colour schemes.

It appears on a browser that has not seen the site before — which describes a demo laptop, or anyone
you hand the screen to. Your own browser has probably dismissed it already, which is exactly why it
is easy to miss.

---

### D-8 · MEDIUM · A stale "acting-as" session is set to expire *during* your demo

Someone — not me — put the `braden.lang77@gmail.com` account into "acting-as FutureBuild Academy" mode
at 22:07 AWST. It is set to expire at **10:07 tomorrow morning**. Your demo is at 09:30.

Two consequences worth knowing. If you present on that account you will be locked to FutureBuild's
view whether you intend it or not — which is probably what you want, but not by choice. And if the
demo runs past 10:07, that scope **expires mid-demo** and the view will change underneath you.

---

### D-9 · LOW · Two columns are blank for every row, because the data was never entered

Not display faults — the fields are genuinely empty in the database, and the pages are honestly
showing a dash. But they are blank in *every* row, which reads as broken:

- **Training contracts → "Registration #"** is empty on all 8. It is the **first column**, so it is
  the first thing the eye lands on. A populated "contract number" field *does* exist on all 8 and
  could be shown instead.
- **Timesheets → "Submitted"** is empty on all 3.

These need a decision from you, not a code fix — and note that filling them in would mean writing to
the client's data, which is forbidden tonight.

---

### D-10 · INFORMATIONAL · Wording on the placement detail page

The placement detail page is otherwise **excellent** — employer, qualification, award code,
supervisor, dates, charge rate ($36.50/hr) and pay rate ($26.24/hr) all present and clearly laid out,
with honest explanations where a figure was not recorded. Two phrases will draw questions in a demo:
"year of apprenticeship not recorded", "Trade Not recorded", and a margin section reading
"Not stored". These are accurate statements about the client's own data, not faults.

Also: the footer reads **"A Braden Group Company"** on FutureBuild's screens. That is your platform's
attribution and is arguably correct — but it is worth deciding deliberately whether a client's
white-labelled view should carry it.

---

## 3. What this probe structurally could not see

Stated plainly, because a test that does not admit its blind spots invites more confidence than it
earned.

1. **I could not test as a real FutureBuild user.** All three of their user accounts belong to their
   own staff, and there is no credential for any of them on this machine — and creating one would
   have meant writing to their data. I tested as a platform developer switched into their tenant.
   **The consequence is specific and important: a permissions fault that hides rows from FutureBuild's
   own three users would be invisible to me**, because a platform developer's access bypasses the
   per-client rule entirely. My test proves the pages *render* their data correctly. It does not prove
   their own staff can *see* it. Anyone who can obtain their consent should re-run the row counts as
   one of their users.

2. **Two of my findings are the mirror image of that.** D-4 (397) and D-5 (0 apprentices) may look
   different to a normal user. I have said so in each. D-4 in particular would probably read as "8"
   for their staff and "397" for you.

3. **The contacts verdict has a timestamp on it, not a tick.** Contacts were correct at 22:25. They
   were being contaminated from 22:38. My PASS describes 22:25 and nothing later.

4. **The final counts were re-verified after service returned**, at 22:57:34 AWST: contacts **23**,
   training contracts **10**, and placements **8**, people **8**, timesheets **3**, users **3** —
   all four of those still exactly at baseline. Nothing anywhere in the system had been written since
   22:45:21.

5. **I did not test:** business-suite-unified, conduit, braden, R80.4 or throughput; the mobile
   width (390px); any create, edit or delete flow; card drag-and-drop or layout saving; printing or
   export. Several of these were excluded *deliberately* — they mutate data, and this tenant is
   read-only tonight.

6. **Controls I deliberately avoided,** because a "read-only" browser test can still change real
   user state: row tick-boxes, every "Actions" menu, all create and edit buttons, the search boxes,
   the status filters, notification bells, card drag/resize (which saves a layout), and the density
   selector. I also did not dismiss the install prompt.

7. **I did not verify that the deployed code matches the latest source.** The usual method needs
   endpoints that are currently returning 521.

8. **A note on how one finding was nearly reported wrongly.** My automatic scan flagged nine fields on
   the placement detail page as "empty". Looking at the screenshot, they were all populated — the scan
   was matching label elements that legitimately hold no value of their own. **The screenshot corrected
   the measurement.** Had I trusted the scan, this report would have carried nine false failures on
   your most important page.

---

## 4. What I changed, and what I did not

**I made no change to FutureBuild's data. No records created, altered or deleted.**

One state change of any kind, declared in full: I used the product's own Super Admin Tenant Switcher
to view FutureBuild — the only route available, since no account here belongs to that tenant. I read
the underlying function before using it: it writes exactly two records, both about *my own* account
(a "currently acting as" marker and an audit-trail entry), in platform-owned tables. It cannot touch
placements, people, contacts, training contracts, timesheets or memberships.

I cleared that marker at the end of the run. My first attempt failed because of the outage in D-1; the
retry at 22:53 succeeded, and I have confirmed my account no longer carries any acting-as scope. The
**only** remaining acting-as marker in the system is the one described in D-8, which is not mine.

I deleted nothing, changed no client record, and wrote no compensating change of any kind.
No file in this repository was modified other than this document. Nothing was committed.

---

## 5. What should happen before 09:30

In order. **The only genuinely blocking item is the first one.**

1. **Remove the fake records from FutureBuild (D-2), and confirm what created them.** This is the one
   thing your client will see. Ten fake contacts and two fake training contracts, all identifiable by
   their `@example.com` addresses and tonight's timestamps. Confirm the writer is genuinely stopped
   first, then clean up, then confirm the counts read **13 contacts / 8 training contracts /
   8 placements / 8 people / 3 timesheets / 3 users**.
2. **Decide whether the seven-minute outage (D-1) needs chasing.** It has cleared and sign-in works. If
   it was a hosting-platform blip it needs nothing; if it recurs before the morning it changes the
   picture entirely. Re-test with the sign-in call, never with a page load.
3. **Decide on D-3, D-4, D-5 and D-6.** All four are wrong numbers or a wrong logo on the two screens
   most likely to be demonstrated. None risks data loss. All four are small, contained code changes —
   but the promotion window closes at 07:59 and anything shipped needs its own visual check on a
   platform that has just had an unexplained outage. **My honest recommendation: treat these as things
   to steer around during the demo rather than things to fix before it.** Specifically — avoid the
   "Total Contracts" box, and if the client asks about the logo, you have a one-line answer: their
   branding is configured correctly, it is the admin view that resolves it wrongly.
4. **Dismiss the install prompt (D-7) and clear the stale acting-as session (D-8)** on whatever machine
   you present from. Both are one-minute jobs and both are visible to the client. D-8 in particular:
   it expires at 10:07, and your demo starts at 09:30.

---

## 6. The bottom line

**On the question you actually asked — do FutureBuild's eight placements appear, with their fields
filled in — the answer is yes.** Eight placements, eight people, eight training contracts, three
timesheets, four hosts, five clients, thirteen contacts. Counted on the live site, in both colour
schemes, at two screen widths, with no blank rows, no errors and no failed requests.

The system renders your client's real data correctly.

**What went wrong was the environment around it, not the pages.** A process wrote twelve fake records
into their account, and the login service dropped out for seven minutes. **The outage has cleared and
I have re-verified the site end to end. The fake records have not been cleared, and that is the one
item still standing between you and a clean 09:30.**

The six defects on the screens themselves (D-3 to D-8) are all real and all worth fixing — but not one
of them hides a placement, empties a row, or loses data. They are wrong summary numbers, a logo
resolving to the wrong client, and two pieces of on-screen furniture. You could demo tomorrow with
every one of them present, provided the fake contacts are gone.

---

*Evidence: `/tmp/claude-1000/-home-braden-Desktop-Dev-bsuite/08108081-3a6c-4f82-81b7-848dba9bb8bd/scratchpad/futurebuild/` — 30 screenshots under `shots/`, raw measurements in `phase4.json`, `phase5-branding.json`, `phase6-detail.json`, outage log in `outage.log`.*
*No personal information from FutureBuild Academy appears in this document or in any measurement file: counts, field lengths and column names only.*
