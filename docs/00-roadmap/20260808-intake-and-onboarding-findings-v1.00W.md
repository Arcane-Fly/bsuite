# Applicant flow, apprentice documents, direct onboard — what I found and what I changed

**Date:** 2026-08-08
**Branches:** crm7 `fix/intake-requirements-registry-20260808` (PR #1487) · conduit
`fix/apply-routing-candidate-upload-20260808` (PR #422)
**Status:** merged to neither main nor development yet. Migrations are NOT applied to
production — the applier only runs on `main`.

---

## The short version

The report I was given was accurate on all ten of its claims. I verified each one against
the source and the live database before touching anything, and found **four more defects it
had not reached**. Three of those are worse than anything in the original list.

The headline: **a check that told you nothing was missing had never once looked.**

---

## What was wrong, in plain terms

### 1. The "missing documents" check at conversion has never worked

When you convert a hired candidate into an apprentice, the system reports which required
documents are missing. It has always reported **none**.

Not "we chose not to block" — it genuinely never looked. It asked the database for the
list of required documents using a filter that could never match anything, got back an
empty list, and correctly concluded that an empty list of requirements has nothing
missing. Then it showed you a green light.

Worse, the thing it was asking was never a list of documents at all. It was reading the
database's own column names — `created_at`, `file_name`, `id`, `title` — and treating them
as if they were document types.

**Why this matters to you:** every conversion you have ever done has been signed off as
document-complete by a check that was not running. If you have relied on that green light,
it told you nothing.

**Fixed:** it now reads the real requirements registry (below) and reports truthfully. It
still does not *block* the conversion — the person is already hired, and stranding a
legitimate hire over paperwork helps nobody — but the blocking now happens where the
consequence actually is: at placement and at pay run.

### 2. Nothing in the platform knew what a complete employee record is

This is the root cause of most of the rest, and it is why "direct onboard" could not exist.
You cannot build an intake wizard when nothing can answer *"what do we need from this
person, given their employment type?"*

Every list of required things was either compiled into the code or simply absent:

- `/people/onboarding` tracked **seven** steps hardcoded into the page. Its "Employment
  Documents" step went green the moment a single yes/no box (`tax_file_number_declared`)
  was ticked. Bank details, super choice, emergency contact, right-to-work evidence and
  award classification were not steps at all.
- That same seven-step list applied identically to an apprentice and to your internal
  staff, who need materially different things.

**Fixed:** requirements are now **data, not code**. There are tables holding what each
employment type needs, when it took effect, and — critically — whether a missing item
stops a *placement* or stops a *pay run*. These are different questions: a missing white
card should stop someone going to site; missing bank details should stop them being paid;
neither should stop the other.

I seeded the Australian employer floor for all seven worker types. I deliberately did
**not** seed white cards, licences, police checks or medicals — those depend on the role
and the state, not the employment type, and guessing them would repeat exactly the mistake
this registry replaces. Those are yours to add, once, and then they apply everywhere.

### 3. You cannot pay anyone from the system, and now the page says so

Bank, tax and super existed only as scanned images. There was no account number, no BSB,
no fund anywhere in the database. Meanwhile crm7 contains a complete, working bank payment
file generator that nothing calls — because there was nowhere for the account details to
live.

**Fixed (the data half):** there are now proper tables for bank accounts, super choices,
tax declarations and emergency contacts. Tax file numbers and account numbers are held in
Supabase's encrypted vault, with only the last few digits stored in the clear so your staff
can confirm the right account without decrypting anything.

**Not fixed (the form half):** the tables exist; the screens to fill them in do not yet.
The payment file generator is still uncalled. See "What I did not do".

When I ran the new check against your real people, active apprentices come back **4 of 17
complete, with 4 items that specifically prevent them being paid**. The page now shows a
"Cannot Be Paid" count. That number was previously invisible.

### 4. Eight real people were locked out of their own documents

`/portal/my-documents` only recognised apprentices and trainees who were currently
*active*. Everyone else got "we couldn't find an active apprentice/trainee record".

On your live data that is 8 of 48 people: 2 internal staff, 2 suspended apprentices, one on
probation, one completing, and two who had completed.

I dropped the status filter entirely rather than extending it. A suspended worker still
needs their own records — arguably more than usual — and a finished apprentice needs their
qualification evidence, which you are obliged to hold for seven years after they leave
anyway.

**Fixed.** Coverage measured 42 → 50 people.

### 5. Candidate documents have never worked at all — for anyone

This one surprised me. The storage container the whole candidate-document system points at
**does not exist**. Not misconfigured — absent.

So:

- Your recruiters cannot upload a candidate document. The code even has a special error
  message telling whoever hits it to go create the container in the Supabase dashboard.
  That has evidently been the normal outcome rather than an edge case.
- Candidates could not upload anything, which the report correctly identified — but that
  was a *symptom*, not a separate problem.
- `resume_url` having no producer anywhere was the same defect again.
- The conversion step copies documents *from* that container, so it could never have
  carried anything across.

Confirmed by counting: zero candidate documents, zero resumes, zero files, ever.

**Fixed:** the container is created (private, with proper access rules), candidates can now
upload their own licence/visa/qualification during screening, and recruiters can too. Both
view paths were also linking a dead URL — I fixed that as well.

### 6. Passports and driver's licences were stored unencrypted

Six document categories were flagged "not sensitive" and therefore stored in the clear:
passport, driver's licence, work driver's licence, birth certificate, working-with-children
check, and the **superannuation choice form** — which carries a tax file number.

**18 live documents are affected**: 9 driver's licences, 7 super choice forms, 2 passports.

**Partly fixed.** All six are now correctly classified, so anything uploaded from here on is
encrypted. **The existing 18 are still unencrypted.** Re-encrypting already-stored files
means downloading, encrypting and re-uploading each one, which is a data operation on live
compliance evidence and does not belong in an unattended migration. I have made the
outstanding set queryable so it cannot quietly be forgotten:

```sql
SELECT id, document_category, storage_bucket, storage_path
FROM document_metadata WHERE is_sensitive AND NOT is_encrypted;
```

**This is the item I would action first.** It is the only finding here that is a live
privacy exposure rather than a broken feature.

### 7. The conversion step would have hidden every document it copied

When you convert a candidate, the system copies their documents to the apprentice record —
and files them under a label that nothing in the platform reads. The copy would report
success, count the documents, and then they would be invisible to the person, to your
document hub, and to the portal.

This has not bitten you yet only because the conversion has never been run in production
(zero conversions to date). It would have fired on the first one.

**Fixed.**

### 8. The visible cosmetic bug

`/people/onboarding` displayed a line of programmer's notation as visible text next to "All
Complete". **Fixed** — and the note was obsolete anyway.

---

## Applicant flow — the one piece of good news

The apply → screen → offer → convert path is genuinely well built, and the report was right
to say so. The public apply form runs everything in one transaction: job-open check, rate
limiting, duplicate detection, consent-gated demographics, versioned privacy notice,
source attribution, and pipeline entry.

One flaw: **a single optional field could turn it off**. If a job had `apply_url` set, the
Apply button went to the employer's own site instead — no candidate record, no pipeline
entry, none of the above. The in-system form was the *fallback*, reached only when both
that field and `apply_email` were empty. Nothing in the screen disclosed this, and there is
no editor that sets those fields, so it could only ever have been switched on by accident.

Zero live jobs currently set it, so this was a landmine rather than a fire.

**Fixed:** the in-system form is now always offered; an employer's own link appears
underneath it as an *additional* option. Wanting an external link is reasonable; silently
switching off your applicant pipeline is not, and they were the same setting.

---

## Second pass — what was added after the first report

The first version of this document listed six things as not done. Five are now
built.

**You can now pay people.** The bank account, tax declaration, superannuation
choice and emergency contact all have real entry screens, on a new **Payroll**
tab on each person's page. The account number and the TFN go straight into
encrypted storage and are never shown again — you see the last four digits of
the account and the last three of the TFN, which is enough to confirm you have
the right record without anything being decrypted.

The bank payment file generator now has its first caller in five months. It
refuses to do three things quietly: a person with no bank account is **named**
in a skipped list rather than dropped from the run; someone with split pay
across two accounts is refused rather than paid one of them; and if bank
details cannot be read at all the whole run fails rather than producing a file
that looks complete. A pay run that silently omits somebody is the worst thing
this could do.

Decrypting an account number is **org-admin only and always logged** — the
decryption and the audit record happen inside the same database function, so
there is no way to get the number without leaving a trace. The TFN has no read
path at all: it goes in and is never retrievable, because nothing in the
platform needs it back and storing it retrievably would be risk with no use.

**Direct onboard now exists.** `/people/onboard` — "Onboard Someone" in the
People menu. Pick the employment type and state, and it shows you immediately
what will be required of that person, read live from the registry. Then it
creates the record and hands you to their page, where the payroll tab and
documents finish the job with progress tracked against that same list. If a
worker type has no requirements defined, it says so rather than showing an
empty checklist — an empty list reads as "nothing needed", which is the exact
failure this work exists to end.

**The re-encryption is now one command**, not a paragraph asking someone to
sort it out:

```
node crm7/scripts/reencrypt-sensitive-documents.mjs              # shows what it would do
node crm7/scripts/reencrypt-sensitive-documents.mjs --limit 1 --apply   # do one, check it opens
node crm7/scripts/reencrypt-sensitive-documents.mjs --apply            # the rest
```

It encrypts each file, immediately decrypts it, and compares the result to the
original **before** replacing anything. A file that does not survive that round
trip is skipped, not overwritten — an encrypted file you cannot open is worse
than an exposed one.

Worth knowing: run against production today it printed *"nothing to do"*, over
18 unencrypted documents. The queue is defined by the classification flag the
migration sets, and the migration has not landed, so everything looked clean.
It now cross-checks the categories directly and refuses to say clean when it
isn't. **This must be run after the migrations apply, not before.**

## What is still not done

| Item | Status |
| --- | --- |
| Apply the migrations | **Not done.** They run when the branch reaches `main`. Everything is verified against the production *schema* but is not live. |
| Encrypt the 18 exposed documents | **Script written and verified; not yet run.** It cannot run until the migrations apply. This is still the item I would action first. |
| Split pay across multiple accounts | **Not done.** The database models it; the payment file builder refuses those people by name rather than half-paying them. |
| Unify the internal document labelling | **Not done deliberately.** Person documents are filed under "apprentice", which fits internal staff and labour hire poorly. Changing it means migrating 417 records plus a dozen screens — its own job. |
| Virus scanning on candidate uploads | **Not done.** The apprentice pipeline has it; the new candidate path does not. Worth doing before you promote that surface. |
| Browser testing | **Not done.** None of this can be exercised in a browser until the migrations apply. Database-level and unit verification only. |

---

## Answers to your three questions

**Can a job applicant go apply → screen → offer → convert → place?**
Yes, and it is the strongest thing in the platform. Two fixes applied: the field that could
silently divert applicants off-platform, and the document container that never existed.

**Can an apprentice provide everything an Australian employer needs?**
Yes, as of the second pass. The documents were always well handled; the missing half was
the **data** — you could hold a photograph of someone's bank details and still not pay
them. Bank, tax, super and emergency contact are now captured as real fields, encrypted
where they should be, and the payment file generator reads from them.

**Can someone be onboarded directly?**
Yes. `/people/onboard`. It tells you up front what that worker type will require, creates
the record, and tracks what is left. The reason it was impossible — nothing could say what
a complete record is — was the thing that had to be fixed first.

---

## Verification

Every migration was applied to the **production schema** inside a guaranteed rollback and
then exercised against real rows before being committed. No production data was changed.

Measured, not asserted: 4/17 requirement completeness on real apprentices · 42 → 50
self-service coverage · 18 documents reclassified · 417 documents on the label that the
conversion step was about to bypass · 0 candidate documents ever · 0 conversions ever.

Regression guards were confirmed to actually fail against the old code before being
accepted — for the apply-routing fix, 4 of 7 new tests fail against the previous
implementation and all 7 pass against the fix. A test that has never been seen failing is
not a guard.

Test suites: conduit 1,184 passing; crm7 touched suites passing; typecheck and lint clean
on both.
