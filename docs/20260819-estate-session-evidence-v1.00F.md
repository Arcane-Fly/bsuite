# What was found and fixed on 2026-08-19, and how each one was proved

**Document:** `docs/20260819-estate-session-evidence-v1.00F.md`
**Date:** 2026-08-19 · **Version:** 1.00F · **Status:** F — Working
**Audience:** the operator. Written in plain language; every acronym is glossed on first use.

This is the evidence record for one working session. It exists because "it's fixed" is a claim
and this estate has repeatedly been wrong about that claim in both directions. Every row below
names what was measured, not what was inferred.

---

## 1. The four findings that mattered

### 1.1 A host supervisor could see every job placement in their tenant

**What it means in practice.** A "host supervisor" is a contact at a host employer — the
business where an apprentice is actually placed. They get a login so they can see *their own*
workers. A fix in August narrowed that correctly for the people list. Four days later an
unrelated change — about letting a parent company see its subsidiaries — rebuilt the same rule
for the placements list and, in the process, deleted the supervisor restriction without
replacing it.

Nothing broke. Nothing warned. The people list still narrowed, so the feature *looked* like it
worked. Only the placements list was open.

**Measured on the live database before any change:**

| | |
|---|---|
| Host supervisors on the platform | 1 |
| Placements that person could read | **8** |
| Placements actually theirs | **1** |

**How the fix was proved.** The new rule was applied inside a database transaction that was
then rolled back, while impersonating that real account. Before: 8 readable. After: 1. A count
that had to move, and moved.

**Why it cannot happen again.** The fix ends in an assertion that refuses to apply if the
supervisor restriction is missing from *either* table — including the one that was never
broken, because two tables agreeing for the wrong reason is exactly how this went unnoticed
for three days.

crm7#1864.

---

### 1.2 Adobe was still live infrastructure five months after it was replaced

**You asked why Adobe was even a consideration.** It should not have been.

Adobe Sign was retired on **2026-03-17** and replaced by the e-sign flow built in-house, which
lives in Conduit and is genuinely in use. The retirement is recorded inside the database
itself, in a note attached to one of the columns.

On **2026-08-16**, five months later, an agent found an Adobe webhook endpoint deployed with no
source code anywhere, reconstructed 320 lines of Adobe handling to match it, hardened it
properly, and put it back into service. Every one of those steps was competent work on
infrastructure that should not have existed.

**Measured before removing it:**

| | |
|---|---|
| Signature records in the in-house flow | **5** |
| Rows anywhere carrying Adobe data | **0** |
| Requests to the Adobe endpoint, retained log window | **0** |
| Places in the application that call it | **0** |
| The database column the recovered code queries | **does not exist** |

That last row is the decisive one: the restored function asked the database for a column that
is not there. It could not have worked at any point after the retirement.

**What was done.** The endpoint now answers "410 Gone" and names its replacement. It reads
nothing, writes nothing and holds no secret. The empty Adobe column is dropped. The file
carries, in plain terms, the story above — because this is the thing that stops a fourth agent
"recovering" it.

**Still your call:** the 320-line directory itself is not deleted. Say the word and it goes.

crm7#1862.

---

### 1.3 Four shared code libraries were invisible to every app that used them

**This is the largest finding of the session and it was completely silent.**

The apps share libraries — one for page layouts, one for building forms, one for data grids,
and so on. Each library ships its own styling instructions. The styling tool has a rule: it
does **not** look inside installed libraries unless the app explicitly tells it to.

Each app told it about **two** libraries. Four more were added over time and nobody added them
to that list.

| Shared library | Styling instructions it ships | Was any app told to look? |
|---|---:|---|
| Form builder | 749 | **no** |
| Page layout | 272 | **no** |
| Schema registry | 94 | **no** |
| Data grid | 39 | **no** |

**1,154 styling instructions across four libraries were being thrown away in every app.**

**Why nobody noticed.** A missing instruction is not an error. It is an element that renders
with one less style than the author wrote. Nothing throws, nothing warns, the build is green,
and the page is quietly wrong.

**How it surfaced.** The visual inspection flagged 122 separate failures across three apps, all
the same message: cards in dark mode had no accent glow. Fetching the actual stylesheet each
live site serves showed the glow colour **defined** and **nothing anywhere using it** — because
the instruction that uses it lives inside the page-layout library nobody was scanning.

One of the apps already had a comment describing this exact bug for the two libraries someone
*did* remember to add. The comment was right. The fix was half-applied and stopped.

**Proved by rebuilding.** Before: the stylesheet had the colour and no consumer. After: the
rule is emitted. That is the equivalence target, and it moved.

**Why it cannot recur.** A new check fails the build whenever a library ships styling
instructions and is not on the app's list. It counts from the shared source rather than from
installed copies, precisely so it still works in an environment where nothing is installed —
otherwise it would find nothing and report a clean result on a thing it never looked at.

crm7#1865 · BSU#791 · throughput#336 · conduit#516 · braden#434 · R80.4#123 · bsuite#2180.

---

### 1.4 A wage cache filled up with the same number for nineteen different awards

The wage calculator reads a cache of award pay rates. It had been empty, which was a known
gap. It is now **not** empty — and that is worse.

| | |
|---|---:|
| Rows | 19 |
| Awards covered | 19 |
| **Distinct weekly rates across all 19** | **1** |
| That value | **$1,119.10** |

All nineteen carry the note "R80.4 bundled engine tables" and none carries a source. These are
a manual seed, not a real sync from the Fair Work Commission.

**Why that is dangerous.** An empty table returns nothing and the calculator correctly refuses.
A uniformly wrong table returns a number and the calculator correctly accepts it — quoting the
same wage for nineteen different awards. The wage calculator lane had built the reading side
and deliberately stopped; they have been told, in writing, not to connect it.

No code change was made here. The finding is the deliverable.

---

## 2. Two things that were reported to you as unfinished and are actually done

Both were re-checked against the live system, not against this estate's own notes.

- **Mail-server passwords stored in plain text.** The live function is now version 44 and reads
  credentials through the secure path. Done.
- **Issue-closing automation that never fired.** The hourly job is running in production right
  now, with multiple successful runs today across all six repositories. Done.

---

## 3. Two mistakes made and corrected in this session

Recorded because the correction is the useful part.

- **I claimed the wage calculator had no styling-library list at all.** It had one. The existing
  line uses single quotes; my search only matched double quotes, so a zero was taken as a fact
  rather than as a question. I had already added a duplicate line before catching it. Corrected,
  and the other app I made the same claim about was re-checked with a quote-agnostic search —
  that one does hold.
- **A guard I wrote failed on its own change.** The parent repository reads each app at a pinned
  version, so a check of app content cannot pass until that pin moves, however correct the app
  is. Sequencing, not a defect — but worth writing down, because the next guard of this shape
  will hit it too.

---

## 4. What is still genuinely with you

Nothing below can be closed by an agent. Each is one decision or one credential.

| What | The question, in one sentence |
|---|---|
| Fair Work data | Can you obtain a Fair Work Commission API credential — and should award pay rates be the same for every client, or set per client? |
| Workers-comp rates | Seven of eight states have no current premium rates; is Western Australia the only supported state for now, so the calculator refuses elsewhere rather than quoting a WA rate? |
| Stripe decision | A 2026-05 decision to read payment data through a direct database connector was accepted, never built, and cannot be applied as written — retire it? |
| Light-mode borders | Should the pale panel border be darkened to pass a formal contrast check, even though it visibly changes the current look? |
| Trade codes | Should a placement's trade be strictly enforced by the database — which also stops a company defining its own custom trade — or stay loosely linked as today? |
| Admin picker | Is there a free-text field in the admin app that should be a picker instead, and which one? |
| Empty table | May an empty, unused table named `custom_fields_legacy_unused` be deleted? |
| 31 files | Modules with no remaining reference, listed in the register, recommended for deletion and **not deleted**. Your go-ahead removes them. |

The last row includes the 320-line Adobe directory from §1.2 and an entire superseded admin
rewrite in the corporate site.

---

## 5. Method — so the negatives can be trusted

Every "0" in this document was produced by asking the live system, not by reading a previous
document. Specifically:

- Database counts came from the production database directly, and policy behaviour was proved
  by impersonating a real account inside a transaction that was then rolled back.
- Deployed-code claims came from the running function's own bundled source and its deployment
  version, not from the repository.
- Stylesheet claims came from fetching what each live site actually serves and parsing it in a
  browser, not from reading the source.
- "Nothing calls this" was checked against an open pull-request search as well as merged code,
  because a merged tree cannot see an unmerged branch — a gap that cost this estate a
  rebuilt-from-scratch fix earlier in the week.

Where something could not be evaluated it is recorded as unknown, never as passed.

---

## Related

- `docs/20260817-estate-completion-ledger-v1.00W.md` — the 88-item ledger, amended today
- `docs/20260819-built-unlanded-and-unwired-register-v1.00F.md` — the built-but-unreachable register, §4.5 added today
