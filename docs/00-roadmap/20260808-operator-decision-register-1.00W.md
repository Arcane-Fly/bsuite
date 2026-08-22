# Operator Decision Register — 2026-08-08

**This file exists because the register was living in agent memory, which Braden cannot
read.** Anything needing your decision belongs here, in the repo, in plain language.
Agent-side copies are mirrors of this file, not the other way round.

---

## Encryption on document categories — a decision for you, not an alarm

**Correction (2026-08-09).** An earlier version of this section led with "🔴 18 identity
documents are stored unencrypted, right now" and treated it as a live breach that had to be
remediated before other work could proceed. **That framing was wrong and it was mine.**

Your **RULING 14.1** says it plainly: *encryption is an option on the document category,
configured by whoever owns the category.* Whether a category requires encryption at rest is a
**super-admin decision**, not something an agent gets to declare an incident about and gate
work behind. Two lanes described it as a live exposure; I amplified that rather than checking
it against your own ruling.

It also sat badly with **RULING 0.3** — the platform holds your determination, it does not
reach one. Calling a configuration choice a breach is the platform taking a position.

### The facts, with no verdict attached

Measured against the live database on 2026-08-09:

| Category | Documents | Without encryption at rest |
|---|---:|---:|
| Driver's licence | 9 | 9 |
| Superannuation choice form *(carries a TFN)* | 7 | 7 |
| Passport | 2 | 2 |

These are facts. Whether that is correct is yours to decide, per category.

### What was actually built for this

The three-state category model shipped today (crm7#1505). Encryption is now a **per-category
setting** alongside sensitivity, exactly as 14.1 specified — so this stops being a one-off
question and becomes a setting a super admin holds and can change.

Two properties worth knowing, because they are not symmetrical:

- **Changing a sensitivity flag is retroactive.** Effective sensitivity is *computed* from the
  category plus any per-document override, never copied onto the row, so there is no stale
  copy to go and fix.
- **Changing an encryption flag is not.** A flag cannot reach into bytes already written. Files
  already stored stay as they are until something re-writes them. That gap is now *named* by
  the `documents_pending_encryption` view rather than being invisible.

### If you decide a category should be encrypted

`crm7/scripts/reencrypt-sensitive-documents.mjs` applies it to files already stored. Dry-run by
default, round-trip verified before it overwrites anything. It needs the migrations applied
first, because it reads the category settings those migrations create.

```
node crm7/scripts/reencrypt-sensitive-documents.mjs           # shows what it would touch
node crm7/scripts/reencrypt-sensitive-documents.mjs --apply
```

**Do not trust a clean result without checking the count.** An earlier version of that script
printed "nothing to do" across all eighteen files — it was reading a flag the unapplied
migration sets, so it looked finished while doing nothing.

### What this is not

It is not a blocker on anything. Nothing is waiting on it, and no other work was gated behind
it — the earlier version of this section implied otherwise.

---

## The self-promotion hole is closed. It went to production this morning.

**2026-08-09, 02:40 UTC.** Under your ruling D-23 I pulled the privilege-escalation
fix out of the twenty-one-migration bundle and shipped it on its own.

Before: any signed-in person could give themselves platform-developer access by editing
their own account record. One safeguard stood in the way, and it was the kind a
technical session can step around.

After, checked against the live database rather than the pipeline:

| | Before | Now |
|---|---:|---:|
| Privileged fields a signed-in user could rewrite | 7 | **0** |
| Fields a signed-in user may edit on their own record | all 21 | **14** |
| Fields a signed-out visitor could rewrite | 21 | **0** |
| The safeguard | skippable | **always on** |

Nothing else applied with it. One migration, verified alone.

**Nobody's ordinary work changed.** Before merging I checked every place in all six
apps that writes to a user record — 19 of them — plus the five background jobs and the
four database routines. None of them touches a field I removed. The tester-licence
process still works, because it runs with elevated rights rather than a user's.

---

## Why nothing had reached the database for two days, and what I found looking

Three separate pieces of the promotion machinery were broken, and all three were
invisible for the same reason: **they only misbehave on a promotion, and promotions are
rare.**

1. The thing that applies database changes could not see a promotion at all. Fixed
   earlier by another lane.
2. The thing that previews what a promotion will do **crashed on every single run** —
   not just promotions — so no pull request has ever received a preview. Then, once
   fixed, it still answered *"no database changes required"* for a promotion carrying
   twenty of them. Both closed.
3. The check that compares safety scripts across repositories was **guaranteed to fail
   on every promotion**, because it read the wrong branch. A check that is always red
   when it matters is not a check. Closed.

All three are now demonstrated working on a real promotion pull request, not argued.

---

## The remaining twenty: three of them would have caused harm

I had a 33-agent audit read every file, then a second adversarial pass whose job was to
prove the first wrong. Three findings survived, and all three are now fixed **before
anything ran**:

- One file would have **stopped the whole batch** at file six of twenty, tripping over a
  single test record somebody made on 6 August. I narrowed the check rather than delete
  the record. Renaming a table takes its contents with it; the record was never at risk
  from the change, only from the obvious shortcut.
- One file would have **published a list of your most sensitive documents**. It created
  a report of files still stored unencrypted — 9 driver's licences, 2 passports and 7
  superannuation forms carrying tax file numbers — and, as written, that report was
  readable by anyone on the internet with the app's public key, without signing in. The
  file exists to flag the gap. It would have advertised it.
- One file had a window in which a **"restricted guest" permission would have granted
  everything** — read, add and delete on every person record in the organisation —
  because the switch was turned on 1,150 lines before the restriction it depends on. The
  file's own written instruction forbade that ordering.

Your D-29 ruling is what surfaced all three. Asking "which of these touches irreplaceable
data, and what happens if it stops halfway" is the question that found them.

**Verdict on your ruling: no migration in the batch destroys or damages irreplaceable
data when it applies.** Your charge-rate trap was right and worth catching — a signed
quote is evidence of an agreement, not a calculation to be re-run. There are 13 of them,
plus 3 invoices and 5 invoice lines, and they are all read-only in this batch.

## What I could not do

**I cannot take a database backup, and I cannot prove one would restore.** The tools this
session has do not offer it, and the only honest test of a restore is to perform one —
which on your live database is not a test, it is the accident.

So your D-31 is **not met**, and I am not going to write that it is. What I did instead:
counted every irreplaceable record before the batch — **1,038 of them across 25 tables** —
and wrote a checker that says plainly, afterwards, whether any went missing. That tells
you *whether* you need a backup. It does not replace *having* one.

To close D-31 properly someone needs to restore the most recent backup into a **separate
copy — never over the live one** — and run that checker against it. Until somebody has
actually done that, the backup is a belief.

---


## Nothing I built this week is in the database yet

> **Partly superseded, 2026-08-09 02:40 UTC.** The self-promotion hole named below
> is now CLOSED in production — see the section above. The other four rows of that
> table are still accurate: they remain merged and unapplied, pending your decision on
> bsuite#1845.

**Correction, 2026-08-09.** I told you three live security defects were closed and that the
permission product, the interpretation surface and the developer-reads-all grant were
delivered. **They are merged. They are not applied.** I checked the live database instead of
the pull requests, and it has none of it.

The last database change applied is from **2026-08-07**. Twenty have piled up behind it since
— mine and other lanes'.

| I told you this was done | The database says |
|---|---|
| A signed-in user can no longer promote themselves to platform developer | **Still possible.** `authenticated` still holds write access to `is_super_admin` |
| Four overlapping "platform admin" checks reduced to one | **No.** All of them still exist |
| The permission product (who may read and edit what) | **No.** Its tables do not exist |
| The interpretation-rules surface (RULING 10.2) | **No.** Its table does not exist |
| The repaired save path | **No.** Which is why Undo does not appear in the workspace |

### Why

Database changes only apply when the **parent repo's `main`** branch moves. Everything this
week went to `development`, which runs the tests and touches nothing real. Every pipeline was
green throughout — green means the file is valid, not that the database changed.

### What I have done about it

One button, staged and deliberately not pressed: **bsuite#1845**, the promotion that applies
all twenty. I checked the riskiest one myself — the change narrowing who may write to user
profiles — against every place in all six apps that writes a profile. Nothing breaks.

I have not pressed it because **twelve of the twenty are other lanes' work** I have not
reviewed, and another lane is repairing faults in that same set right now (crm7#1514).
Applying someone else's unreviewed change to the database Caris and FutureBuild use is not a
call I should make alone.

**What I need from you:** a yes to press it, or a name to review the other twelve first.

---

## The data workspace never showed data — and now it does

Same day, same lesson. `/admin/data` → **Browse** rendered five rows and three columns with
**every single cell blank**, and every save failed. Not just for tenant admins — for everyone,
including you. It had never worked in a browser.

I found it by signing in to the deployed site and using it, which nobody had done. The tests
passed because they counted rows and columns and never once read what was *in* a cell.

Fixed and live on the dev site (crm7#1512, crm7#1513). Verified by opening it: real contact
records on screen, personal details correctly withheld from a non-privileged admin, and an
edit that reached the database. **`data_change_sets` is no longer zero.**

Undo still does not appear — that one needs the promotion above.

---


## Plain-language key to the task codes

The implementation plan uses codes. Here is what they mean.

| Code | In plain words |
|---|---|
| **T0** | Spend ten minutes on `/settings/data` and tell us what stopped you. |
| **T1a** | **Safety.** Three security holes that are live right now. Ships on its own, this week. |
| **T2** | **Fix the save button.** The engine that writes your edits has real bugs — a half-failed paste looks like a total failure, undo can hit someone else's change, and one missing line means a tenant check can be raced. |
| **T3** | **The actual spreadsheet.** Browse any of the 84 data types, click a cell, change it, undo it, save the view, paste from Excel. This is the thing you have been asking for. |
| **T1b** | **The admin tiers.** Make developer / super admin / org admin mean what you say they mean, everywhere. Moved to *after* T3 — see below. |
| **T4** | **Who can see and edit what.** The permission product: you decide who gets which fields and which rows. |
| **T5** | **Alarms.** Right now every one of these failures is silent. Nobody would notice. |
| **T6 / T7 / T8** | Colour, chips, formulas, cross-app links. Explicitly not the first release. |

**Why T3 comes before T1b.** The first version of this plan put the whole admin-tier rebuild
first. That is weeks of work where you see nothing, standing in front of the only task that
puts a working spreadsheet in front of you. Your developer account already has full access
inside the three organisations it belongs to — so an editable grid **for you** needs none of
the tier work. You get the tool first; the tier plumbing follows.

---

## RULING RECEIVED 2026-08-08 — developer scope

> **"developer reads all. edits all. elects which what and scope."**

Recorded as settled. It changes the plan, and the honest answer is that it costs more than
the previous draft assumed.

**What we found when we checked it properly:**

- The query engine refuses any organisation you are not a member of. Your developer accounts
  are members of **3 of 7**.
- Deeper than that: of the **84** data types in the catalogue, **exactly 1** has a
  row-security rule that lets a platform developer read across organisations. The other 83
  block it at the database level, underneath the engine.

So "developer reads all" is not a switch that exists and is turned off. It has never been
built.

**Three ways to deliver it, and which we are taking:**

| Option | Verdict |
|---|---|
| Give the developer accounts membership rows in all 7 organisations | **No.** That grants developers access under *every* rule in the shared database — conduit, throughput, braden, BSU, R80.4 — not just this tool, and it makes a developer indistinguishable from an ordinary member in the audit trail. |
| Make the query engine bypass row-security | **No.** Independently identified by the security review as the single most likely way this program causes a cross-organisation leak. A bug in the query builder would stop being an empty result and start being someone else's data. |
| **Add an explicit "or you are a platform developer" clause to the read rule on each of the 83 catalogued tables** | **Yes.** More work, but it is explicit, auditable per table, reviewable in one migration, and it grants exactly the scope you named — nothing wider. |

**"Elects which, what and scope"** is T4, and your ruling settles a question that was open:
the developer is the top of the grant chain and can grant anywhere. Super admin is capped at
their enterprise and its sub-orgs; org admin at their one organisation. Nobody can grant
what they do not hold.

---

## What has actually SHIPPED (2026-08-08)

> **Read this with the correction above.** Everything below that needed a database
> change is merged but **not applied**. Shipped here means the code is written and
> reviewed, not that the database has it.

Merged to `development`, all checks green. This is the "decision 1" work — the
live security holes — plus two defects found while testing.

| PR | What it closed |
|---|---|
| [crm7#1486](https://github.com/GaryOcean428/crm7/pull/1486) | The **phantom "1 descendant org"**. You have zero sub-orgs; the page invented one |
| [crm7#1488](https://github.com/GaryOcean428/crm7/pull/1488) | **All three live security holes** from decision 1 — self-promotion, the shadowable sensitivity flag, and the world-readable custom fields |
| [crm7#1489](https://github.com/GaryOcean428/crm7/pull/1489) | The **save engine**: a forgeable audit trail, an undo that could hit someone else's edit, a tenant check that could be raced, and error messages that leaked another client's data |
| [crm7#1491](https://github.com/GaryOcean428/crm7/pull/1491) | Renumbering, after two of the above collided with other teams' work |

**A fourth hole was found and closed on the way:** an ordinary signed-in user could
**set their own subscription tier**. The guard that protects the developer flags covers
only those two fields — nothing was watching billing. Nothing in any of the six apps
writes those fields from the browser, so closing it cost nothing.

### Two things worth knowing about how that went

**The first version of the security fix did not work, and the tests caught it.**
Revoking permission on *specific columns* does nothing while a permission on the *whole
table* exists — so the fix was cosmetic and the old trigger was still the only thing
standing there, which was the exact problem being fixed. Four test assertions went red in
CI and forced the real fix. Without those assertions it would have merged looking correct.

**One mistake was mine and is worth recording.** Before merging I ran a check for whether
another team had claimed the same migration number. It printed a warning. The merge went
ahead anyway, because I had written the check and the merge as one command — so the merge
never actually depended on the check's answer. *A check whose result nothing acts on is
not a gate; it is a printout.* Nothing was lost (the affected step runs from `main`, and
none of this had reached `main`), and it is corrected — but it is the same shape as the
"1 descendant org" bug fixed that morning: a guard written correctly that could not fire.

---

## The spreadsheet now exists — go and look

**`/admin/data` → the new "Browse" tab.** Pick a data type, see your rows straight
away, click a cell, change it, undo it.

That is the thing you have been asking for, and it is the first time this estate
has had it. It is deliberately narrow — no filters or saved views in that first
slice, and it is switched on for your developer login only until the permissions
product exists. But the loop works end to end.

**Why the earlier pages felt so bad, precisely:** they never showed you data.
Both opened on an empty "choose a data type" box and then asked you to upload a
file or build a query. One is an import wizard, the other a query console.
Airtable opens showing you a table; those opened showing you a form. That was
the whole gap, and no amount of renaming would have closed it — which is what
your ten minutes proved.

### Also shipped since the last update

| What | Why it matters to you |
|---|---|
| **Developer reads all, edits all** | Your ruling. It had never been built — of 84 data types, **not one** let a platform developer read another organisation's rows. Now all of them do, and the query engine lets you through. |
| **The sub-org that did not exist** | The page claimed "1 descendant org". You have none. It was counting your own organisation. |
| **The false capability badge** | It claimed you could read and change any organisation's data. The database refused that on 83 of 84 data types. Rather than softening the words, the capability was built — so the claim is now true. |
| **Alarms** | `/admin/observability`. Every failure in this area was silent: a refusal and an empty table looked identical. The database was already recording every blocked attempt to grant yourself developer access, and **nothing had ever read that table.** |
| **Blank row numbers** | When a bulk edit rejected a row, "which row?" came back empty, and multi-batch imports were writing nonsense row numbers into the error log. |

### Two more security holes closed on the way

- An ordinary signed-in user could **set their own subscription tier**. The guard protecting the developer flags covered only those two fields — nothing was watching billing.
- Two duplicate admin functions with the same meaning have become one. A second one was calling a third from inside its body, where nothing tracks the dependency — deleting it would have broken tenant switching at runtime rather than at deploy.

---

## Everything is filed

Nothing below lives only in this document. The work is tracked:

| Issue | What it is |
|---|---|
| [crm7#1478](https://github.com/GaryOcean428/crm7/issues/1478) | **T1a** — the three live security holes in decision 1 |
| [crm7#1479](https://github.com/GaryOcean428/crm7/issues/1479) | **T2** — fix the save engine |
| [crm7#1477](https://github.com/GaryOcean428/crm7/issues/1477) | **T3** — the actual spreadsheet |
| [bsuite#1833](https://github.com/GaryOcean428/bsuite/issues/1833) | **T1b** — the admin tiers + "developer reads all, edits all" |
| [crm7#1481](https://github.com/GaryOcean428/crm7/issues/1481) | **T4** — who can see and edit what |
| [crm7#1482](https://github.com/GaryOcean428/crm7/issues/1482) | **T5** — alarms |
| [crm7#1480](https://github.com/GaryOcean428/crm7/issues/1480) | The two false claims found on the data pages |
| [crm7#1483](https://github.com/GaryOcean428/crm7/issues/1483) | RULING 10.2 — the interpretation surface |

---

## T0 is ANSWERED — the pages are a form, not a grid

You opened both. The hypothesis that they were merely badly *named* is **refuted**, and
that is the useful outcome — it kills the cheap fix and confirms the real work.

**Neither page ever shows you your data.** Both open on an empty "Choose an entity"
dropdown. To get anywhere you must already know which of 84 entities you want, pick it
blind, and then either upload a file or build a query. One is an import wizard; the other
is a query console. Airtable opens showing you a table. These open showing you a form.

Two things on those screens are also false, both verified:

- **"1 descendant org"** — there are zero. Every tenant has no parent. The function counts
  the root itself and the page reads that as a sub-org. That page's own header says the
  banner is hidden when empty, citing your instruction not to fake that dimension — but the
  result is never empty, so the guard never fires.
- **"You may read and change data for any tenant on the platform"** — the database refuses
  this on 83 of the 84 data types. The badge claims the capability your ruling requires;
  the capability has not been built.

---

## Decisions still sitting with you

### 1 · Ship the live security fixes now, ahead of everything?  *(most time-sensitive)*

Three things are true in production today. They have nothing to do with the spreadsheet.

**(a) Any signed-in user can make themselves a platform developer — if one trigger is off.**
The database currently lets any logged-in person write to their own "am I a developer" and
"am I a super admin" fields. The only rule checked is "is this your own record" — there is no
restriction on *which* fields. One trigger stands in the way, and it is the type that does
not run during replication, restores, or the test harness.
*Fix: remove the permission, and make the trigger the always-on kind.*

**(b) A staff-level user can switch off a "this field is sensitive" flag.** They can insert a
second, organisation-specific copy of a field definition that wins. The equivalent table next
to it has the uniqueness rule that would prevent this; this one does not.
*Fix: add the two missing uniqueness rules; narrow who can write field definitions.*

**(c) Every custom field is readable by every member of that organisation.** All 22 places
where custom fields are stored are flagged non-sensitive and readable by any member —
including on apprentices, WHS incidents and candidates. Anything anyone has ever typed into a
custom field is already visible org-wide.
*Fix: turn off filtering on those 22 until the custom-field ruling below is made.*

**Recommendation: yes, ship all three this week as their own change.** We verified no part of
any of the six apps writes to those fields, so removing the permission breaks nothing.

**Why you and not me:** (a) changes a permission in production — quiet when right, loud when
wrong. You should know it is happening.

---

### 2 · Ten minutes on `/settings/data`

Two pages already exist in your navigation:

- **Settings → "Data Import & Bulk Update"**
- **"Enterprise Data Console"**

Both are wired to a real bulk-edit engine with preview, commit and undo. Your account can
open both today. **They have never been used — not once.**

**My hypothesis:** neither name says *"browse and edit all your data like a spreadsheet"*.
One reads as a one-off CSV import wizard, the other as an admin diagnostic. You may have
scrolled past both for months while asking for exactly this.

**What I need:** open one, try one real edit, tell me what stopped you. If it is the naming,
this is hours of work. If it genuinely cannot do the job, that tells us precisely what to
build first instead of guessing — which is what every previous attempt did.

---

### 3 · Is the super-admin tier real yet?

**Zero** organisations have a parent. No sub-organisation has ever existed.

Do you want a real enterprise with sub-orgs modelled now, or is that tier still hypothetical?
It decides how much of the tier work is worth building — the cascade, the descendant scoping
and the grant chain are all machinery for a structure that has never held a single row. I
have provisionally scoped it down on that basis. Say so if that is wrong.

---

### 4 · Should a placement or timesheet record *which site*?  *(domain question — yours)*

Neither `placements` nor `timesheets` has a site field. Not un-catalogued — **the column does
not exist.** Sites link only to employers.

So "give this coordinator access to only Sarah's site" cannot be expressed for the two things
a GTO would most want to scope. The closest available is "everything at that employer", which
is wider than intended, and nothing would warn the person granting it.

Beyond permissions: if a host has three sites and an apprentice is at one of them, site
visits, incidents and WHS duties attach to a site the placement record never names.

**I have not assumed this is a defect.** You may deliberately place at employer level and
track site through site visits. You will know in seconds. If it is a gap, it should be settled
before the permission work is built around its absence.

---

### 5 · Which custom-fields system is the real one?

Two already exist: a proper typed registry with its own admin page, and ad-hoc "custom
fields" blobs bolted onto tables like apprentices with no registry at all.

**Why it matters:** sensitivity is recorded per *column*, and one of those blobs is a single
column holding many fields. A custom field added into a blob inherits the blob's sensitivity —
so someone adding "Medicare number" to a container marked non-sensitive gets no protection at
all from the checks that are the entire backbone of the system.

**Recommendation:** extend the typed registry, and give every custom field its own catalogue
entry so sensitivity applies per field, never per blob.

---

### 6 · Document categories — sensitivity and expiry  *(carried over)*

An agent added 54 document categories and, by its own admission, **guessed** which are
sensitive and which expire — including legal advice, medical reports and workers' compensation
claims. It shipped without review on 2026-07-28.

Checked against the live file: 80 categories, 22 sensitive, 21 expiring. All seven
privileged/health categories *are* marked sensitive. **The one that looks wrong: Photography
Consent Form shipped as NOT sensitive** — that is the record of a person's consent to their
image being used, often an apprentice, sometimes a minor.

Your later ruling — that sensitivity is configured in the UI by developer / super admin / org
admin, with a "discretionarily sensitive" state — supersedes the hardcoded list as the target
design. This decision is now about the 80 rows that ship as its starting data.

---

### 7 · Reference data into git  *(carried over)*

Five tables' rows are needed as seed data. Once in git history it is effectively permanent.
**Your answer so far: only `gto_standards_clauses` is a yes.** The other four stand refused
pending your word: `report_templates` (23), `state_ir_config` (8), `storage.buckets` (19),
`aass_providers` (6).

Noted from your own comment: `aass_providers` is named for a superseded acronym
(AASN → AASS → now **ACAP**). Model the function, not the current occupant.

---

### 8 · Org Documents is built and completely unused  *(carried over)*

Settings → Org Documents is a real editor with templates, acknowledgements, assignments and a
staff-facing reader. **Zero rows.** It still fails your bar for one specific reason: the
editor has **no toolbar** — no bold button, no headings, no tables, formatting only via
shortcuts nobody could discover.

Also, you were on the wrong page: `/documents/collaborative` is Monaco, VS Code's *code*
editor. It felt like coding because it is.

**Did you not know it was there, or did you try it and it failed?** Never knew → discoverability
plus a toolbar. Tried and failed → we need the specific failure, because nothing in the code
explains a zero-row table on a feature this complete.

**Same shape as decision 2.** A complete feature, zero rows, nobody asked why. That is now the
first question asked of any "missing" capability.

---

## Decisions I made for you (yours to overturn; I will not re-ask)

| Decision | Why | What informed it |
|---|---|---|
| **No new `/data` page** — build into `/settings/data` and `/admin/data` | crm7 already has six "data"-named destinations and three of them collide | Two reviewers found it independently; `/admin/data`'s own header already assigns those pages to the tiers |
| **T3 (the spreadsheet) before T1b (the tiers)** | The tier work is weeks where you see nothing, in front of the only task that gives you the tool | Your developer account already has full access in its 3 organisations, so the grid needs none of it |
| **Delegation chains cut** | They were the source of two privilege-escalation paths, and they are machinery for a hierarchy with zero rows | Scope and security reviewers agreed separately; security *improves* by cutting it |
| **The query engine never bypasses row-security** | It is the most likely route to a cross-organisation leak, and not by anyone deciding to — by an implementer taking the one-function shortcut over the 83-table one | Enforced by an automated check that fails the build if someone flips it |
| **No second saved-views table** | One already exists and has zero rows; a second would make two dead tables | The exact pattern this plan diagnoses |
| **Formula columns cut from v1** | Results are capped at 1,000 rows, so a formula total would sit beside a correct total, look identical, and be wrong | Verified in the query builder |
| **Fix the save engine before building on it** | Four live defects including a forgeable audit trail | Each verified against the live database |

---

*Full technical plan: [`20260808-data-workspace-implementation-plan-1.00W.md`](./20260808-data-workspace-implementation-plan-1.00W.md)*
