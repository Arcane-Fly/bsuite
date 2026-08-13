# Colour gate — two things that need you, 2026-08-13

Two items came out of the colour-rule consolidation (bsuite#1945 and the five
submodule PRs that merged with it). Neither is a bug I can just fix. One is a
process hole, one is a contradiction in the contract that only you can settle.

Everything else from that work is done and needs nothing from you.

**Glossary, once.** *The colour rule* is the automated check that stops anyone
writing a raw colour like `#ffffff` into the apps instead of using a named theme
token. *A waiver* is a written note saying "this app is allowed to skip the rule
for now, because it has N violations that must be fixed first". *The gate* is the
CI job that blocks a merge when a rule is broken.

---

## 1. A waiver kept its number long after the number was wrong

**What happened.** Two apps were excused from the colour rule with a written
reason and a count:

| app | the waiver said, 2026-08-11 | what was actually there, 2026-08-13 |
| --- | --- | --- |
| business-suite-unified | 27 violations, all in email HTML | **2**, and none of them in email |
| conduit | violations in three chart files | **0** |

Neither number was wrong when it was written. In both cases *a different lane*
went and fixed the violations over the following two days — the email templates
were migrated, the chart colours were cleaned — and neither lane came back to
update the waiver, because nothing connects "I fixed the last violation" to "go
and edit that list".

**Why it matters more than a stale number.** The waiver list is a ratchet: it is
supposed to only ever shrink, and the count is what tells you how much debt is
left. For two days it claimed the estate was three times worse than it was. The
opposite failure is the dangerous one — the same mechanism would let a waiver
that has *grown* sit unchallenged, and a gate that nobody re-measures stops
meaning anything at all.

**What I already did (free, no decision needed).** The list now states in writing
that whoever clears the last violation in an app owns removing its entry, and
each removed entry records the before/after measurement so the next person can
see the shape of the failure.

**What I did NOT do, and why it needs your call.** The real fix is to make the
number self-checking, and there are two ways:

- **Measure it automatically.** The check would run the colour rule against each
  waived app and report the live violation count next to the waiver. *I
  recommend against this.* The parent repository cannot run five separate apps'
  lint setups faithfully — each has its own config and its own list of ignored
  files — so it would produce a number that is close but not the app's real one.
  A check that reports a *falsely low* count would quietly retire a waiver that
  is still needed. That is worse than the problem.
- **Put a clock on it.** Every waiver carries the date it was last measured, and
  the check fails if any entry is older than, say, 14 days without being
  re-measured. Cheap, cannot produce a false zero, and it converts "stale
  forever" into "stale for at most a fortnight".

**My recommendation: the clock, at 14 days.** The cost is that roughly once a
fortnight someone has to re-run a lint and either update a date or delete an
entry — which is exactly the work that did not happen here. The risk is the one
this estate keeps writing down: a gate that goes red on a calendar, that nobody
can act on quickly, gets switched off. Fourteen days is long enough that it only
fires on genuine neglect.

**Decision needed:** clock at 14 days, a different number, or leave it as the
written ownership rule only.

---

## 2. The audit rejects the two colours the contract tells people to use

**What happened.** There is a check that says: a colour may only appear in the
shared packages if it is written down in one of the two theme documents
(`packages/theme/docs/d2c-theme-source-of-truth.html` and the Braden Corporate
equivalent). Those two documents are the source of truth — your ruling, 2026-08-03.

Separately, the colour rule tells developers, in its own error message, that when
they must not use pure white or pure black they should use the estate's
near-white **`#f8f9fa`** and near-black **`#0a0e1a`**.

Those two values are **not in either document.** So the check rejects the exact
two colours the rule instructs people to reach for.

**What this looks like in practice.** A developer hits the pure-white ban, reads
the error, does what it says, and their build fails on a different gate. There is
no way to comply with both at once except by annotating an exemption — which
means the prescribed fix ships as a documented exception every single time.

**Why I did not just fix it.** The fix is to add the two values to the theme
document, and your standing ruling is that *the document is the source of truth,
not the code*. Adding a colour to the contract is a contract change. The other
route — quietly exempting those two values in the checker — is the papering-over
that ruling exists to prevent, so I have not done it.

**Decision needed:** should `#f8f9fa` and `#0a0e1a` be written into the theme
source-of-truth documents as the sanctioned near-white and near-black? If yes I
will add them and the contradiction disappears. If they should *not* be in the
contract, then the colour rule's error message is wrong and should name
something else — tell me what, and I will change the message instead.

There is no urgency on this one: nothing is currently blocked by it. It is a trap
waiting for the next person who follows the instructions.

---

## What needed nothing from you

For completeness, so this reads as a short list rather than a summary of a big
day: the colour rule is now one implementation across all six apps, every copy
matches it byte for byte, the two apps that were excused no longer need to be,
and the pure white/black count across the estate fell from 16 to 7. All of that
merged to `development`. Nothing has gone to production — that still waits on
your visual sign-off, as always.

---

## Correction, same day, added when the sixth app landed

**The paragraph directly above was written one app early.** When it said "all six
apps, every copy matches it byte for byte", five matched. **crm7 did not** — it was
still carrying the older 428-line rule against an 814-line source, and it was the
one app where that mattered most. It is fixed now (crm7#1674, parent bsuite#1970),
and the sentence is true as you read it. I am leaving the original wording visible
rather than editing it silently, because this document's own subject is a number
that outlived its measurement.

**What crm7's old copy could not see.** `pdf-lib` and `@react-pdf/renderer` write
colour channels on a 0–1 scale, so in those files `rgb(1,1,1)` **is** pure white —
the same banned value as `#ffffff`, just in the notation a PDF engine uses. crm7's
old rule read it as an ordinary "prefer a token" complaint, and both of the
document-format exemptions switch that complaint off. Measured on the tree, not
inferred: in a file that genuinely imports the PDF renderer, and again in a file
marked as email HTML, `rgb(1,1,1)` was **not reported at all**. Under the new rule
it is reported in both, as banned outright.

That is the part worth your attention: **crm7 is the app that emits the
e-signature certificate and the client invoice email** — the two files that carry
exactly those exemption markers. The check that was blind to pure white in a PDF
was the one running inside the app that writes the PDFs.

**Nothing is waived any more.** The excused list is now empty and its ceiling is
zero, so the next app that diverges fails the build instead of being added to a
list. That is the end state item 1 above was asking about — the ownership rule and
your decision on a clock still apply to whatever gets waived *next*, but there is
nothing outstanding for them to be stale about today.

---

## A third finding — nothing for you to decide, but you should know

Landing the rule in crm7 turned over a rock. **Seventeen pure whites were sitting
in the PDF documents your clients actually receive**, and no check has ever
reported one of them:

| document | pure whites |
| --- | --- |
| NSGTO Standard 2 compliance pack | 5 |
| Invoice PDF | 4 |
| **Charge-rate quote — the PDF the signing page produces** | **4** |
| Apprentice report | 1 |
| F17 | 1 |
| Fair Work retention | 1 |
| Guardian-consent signature canvas | 1 |

They are fixed (crm7#1674), replaced with the near-white crm7's own stylesheet
already uses. Nothing looks different to the eye — that is the point of a
near-white — but the ruling is absolute and these were breaking it.

**Why nothing caught them.** Two separate checks missed them for two unrelated
reasons, which is the part that should worry you more than the seventeen.

The *build check* looks for a colour where a colour normally sits. These were
written as an argument handed to a small converter function, because the PDF
engine cannot read the modern colour notation and needs it translated first. That
is the *right* way to write them — it is why the PDF code uses proper tokens
instead of raw hex — and it happens to be the one place the check does not look.

The *estate-wide count* — the "16 down to 7" number in the paragraph above — did
find all seventeen, and then filed them as **excused**, because its excuse list
matches on file names and every one of these files is called something like
`renderInvoicePdf` or `PdfDocument`. Measured: crm7's row read `1 / 32` before the
fix and `1 / 15` after. The 7 never moved, and it was never wrong — it was
answering a question these values had been excluded from.

That list is doing two jobs under one name. "A test file, not product" is a fair
reason to skip something. "A PDF, which cannot take a modern colour token" is a
reason to relax the *format*, not the ban on pure white — the same distinction the
build check already makes correctly. Splitting it is part of bsuite#1962.

**Why I did not widen the check today.** It is one shared implementation, so
widening it changes all six apps at once, on the same day five of them went green
and every excuse-ceiling reached zero. Widening before anyone has measured what it
finds in the other five would turn the whole estate red with nowhere left to park
it — which is exactly how this rule got switched off the first time. It is written
up with the measurement and the test it needs, as bsuite#1962, to be done the way
the last one was: measure each app, fix, then widen.

**Nothing is needed from you on this one.** It is here because "your signed quotes
contained a banned colour for their whole life" is not something you should read
in a commit message.
