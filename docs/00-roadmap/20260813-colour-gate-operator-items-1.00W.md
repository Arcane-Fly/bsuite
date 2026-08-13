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
