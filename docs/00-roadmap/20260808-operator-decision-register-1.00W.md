# Operator Decision Register — 2026-08-08

**This file exists because the register was living in agent memory, which Braden cannot
read.** Anything needing your decision belongs here, in the repo, in plain language.
Agent-side copies are mirrors of this file, not the other way round.

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
