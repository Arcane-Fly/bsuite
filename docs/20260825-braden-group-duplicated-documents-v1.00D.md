---
kind: decision
authority: operator
owner: data-lane
evidence:
  - scripts/remediate-duplicated-documents.mjs
review_by: 2026-09-30
---

# Braden Group holds byte-identical copies of real FutureBuild documents

**Date:** 2026-08-25 · **Status:** D — one decision needed from Braden, in §5.

> **This corrects the record.** Every earlier note called this "161 duplicate documents to
> remove and 20 unique ones to move". That framing made it sound like tidying. It is not.
> Real apprentices' documents were copied onto **test identities**, and ten of them are
> marked sensitive. The count was close — it is 162 — but the description was wrong, and
> the wrong description is why it sat as a housekeeping item for weeks.

## 1. What is actually there

Measured 2026-08-25 against the live database.

| | Braden Group | FutureBuild Academy |
|---|---:|---:|
| `document_metadata` rows | 191 | 233 |
| storage objects present for those rows | 191 / 191 | 233 / 233 |
| people the documents hang off | 9 | 8 |
| people whose email is `example.com` / `testonly.com` | **9 of 9** | 0 |
| people on consumer domains (gmail / icloud / yahoo) | 0 | **8 of 8** |
| tenant members | 2, **both the operator's own accounts** | 3, all third parties |

**162 of Braden Group's 191 rows are byte-identical to a FutureBuild row** — same file
name, same byte length, and the same storage `eTag` (MD5) on the underlying object. Ten of
those 162 carry `is_sensitive = true`.

**All 190 of the Braden Group documents landed on a single day, 2026-07-15**, and seven of
its nine people were created the same day. FutureBuild's people were created 2026-05-12/13,
two months earlier. The direction is not ambiguous: the test tenant received copies of the
real tenant's documents.

## 2. What it is not

- **Not an exposure.** Braden Group has exactly two members and both are the operator's own
  accounts. No third party can see these files. FutureBuild's three members are real
  customers, and their own copies are untouched.
- **Not a tenant-boundary failure.** Every document's `tenant_id` agrees with its person's
  `tenant_id`. Row-level security is doing what it should; the wrong rows were *created*.
- **Not the same people.** There is **zero name overlap** between the two tenants' people.
  These are not duplicate persons — they are fabricated persons holding real people's files.

## 3. The measurement that settles it, and the one that nearly misled

`entity_id` on `document_metadata` does **not** reference `apprentices`. Joining it there
returns zero matches for *both* tenants, which reads as "417 orphaned rows" and is entirely
an artefact of the wrong join. It references `people`. A sweep across every public table
with a `uuid id` column found the single table that actually holds those ids.

Likewise, matching on name and size alone finds 190 pairs — but generic filenames make that
weak evidence. The storage `eTag` is the measurement: it is the object's MD5, so an equal
eTag means equal bytes. That is what reduces 190 to **162 provable duplicates** and leaves
**29 rows holding bytes that exist nowhere else.**

## 4. The 29

Twenty-nine Braden Group rows match nothing in FutureBuild by bytes. They are the only copy
of whatever they contain. **They must not be deleted**, and the remediation script never
selects them — it can only select a row whose identical original it has confirmed present in
the same run.

## 5. The decision needed — one word

`scripts/remediate-duplicated-documents.mjs` is written, dry-run by default, and does exactly
one thing: for each of the 162 rows whose byte-identical FutureBuild original is confirmed
present, it writes a `document_destruction_log` receipt, removes the storage object, then
deletes the row. It refuses if any original is missing at run time, and refuses if the
candidate count has drifted more than 10% from the measured 162.

**Braden decides:** remove the 162 provably redundant copies, or leave them.

Nothing else is proposed. The nine test-identity people are **not** touched by this script —
deleting people is a separate question and a separate decision, and the documents can be
removed without answering it.

## 6. The root cause is unaddressed

Whatever ran on 2026-07-15 copied a real tenant's document set onto fabricated identities in
another tenant. Removing the copies does not stop it recurring. No gate would catch it today:
nothing compares storage eTags across tenants. That is worth building **regardless** of the
decision in §5, and is not blocked by it.
