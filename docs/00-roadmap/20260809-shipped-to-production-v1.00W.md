# Shipped to production — 2026-08-09

Everything is live. All seven repositories are level with production and all six sites
are serving. This is what changed, what it fixed, and the one decision still sitting
with you.

---

## The one thing that needs you

**Point-in-time recovery is still switched off.** I did not turn it on, because it is a
recurring bill — $100/month for a 7-day window, $200 for 14 days, $400 for 28 — and
committing you to a subscription is not part of "finish the work".

It matters because of what today's safety net actually was. Before applying anything I
took a backup and then **restored it into a clean database to check it worked**, which is
the only way to know a backup is real. It restored every irreplaceable table exactly —
2,194 audit records, 425 documents, 50 people, 34 placements, 14 timesheets. But that is a
file on a laptop, taken by hand. With PITR on, you can rewind the database to any second;
without it, the fallback is a snapshot that can be up to a day old.

**Nothing is broken and nothing is waiting on this.** It is the difference between a bad
day costing minutes and costing a day of work.

---

## What went live

**39 database changes**, then the applications — in that order, deliberately. The reverse
would have shipped five features that query tables which did not exist yet, and you would
have seen five empty screens with no error to explain them. That exact failure happened
this morning on a smaller scale, which is how the ordering rule got written.

### Things that were wrong and are now fixed

**Anyone signed in could have wiped the audit trail.** Not through the app — there is no
button for it — but the database permission was there, on 353 tables including the 2,194-row
audit log. The cause was a default that grants everything on every new table, so fixing the
tables alone would have been undone by the next one created. Both are fixed.

**Team admins could not send invitations.** At all. The rule permitting it had silently
disappeared from the database at some point after early May, most likely through a
dashboard edit that wrote no record of itself. One invitation has ever been created, which
is why nobody reported it.

**Three timesheets said "approved" with nobody having approved them.** No approver, no
date, no trace in the audit log — in a real client's records. They now read "awaiting a
decision", which is what the evidence supports. I did not invent an approval date to tidy
it up; that would have manufactured the exact evidence that was missing.

**Two access rules had quietly reverted** to a wider setting than a July fix had put them
at. Same signature as the invitations one: changed directly in the database, no record.

**A list of unencrypted sensitive files was about to become publicly readable.** A change
in this very batch rebuilt that list and dropped both of its protections. Caught before it
shipped; the migration now refuses to run if either protection is ever dropped again.

**The funding programme dropdown works again** — four options where there were none. And to
answer what you asked directly: **nothing is hardwired.** Amounts and conditions are empty
on every row, so entitlements stay user-entered, as R80.4 was designed.

### Things that are now testable that never were

**23 recruitment tables** existed in production and were written down nowhere. No test
could touch them, no rebuild could recreate them, and two were public web endpoints — the
job application form and the candidate consent link — running with full database
privileges. They are now in source and covered by the test suite.

---

## New alarms that did not exist this morning

Three of today's problems were found **by accident**, which is not a system.

- A scheduled check now catches an access rule reverting to a wider setting — the shape
  that hit twice today. Its self-test fails the build if the check stops working, because
  a silent alarm is worse than none.
- The migration test suite can no longer report success over a failure. It had been
  swallowing them since roughly May; 17 broken migrations surfaced the moment it was
  fixed, and it caught five more things on its first day, three of them mine.
- The shipping process itself listed a repository archived earlier today and **left one
  application out entirely** — so that app had never been shipped by it. It now reads the
  list from the repository rather than from a line someone typed once.

---

## Still open, deliberately

- **The workspace selection bug.** A confirmed cause is fixed and covered by tests. I could
  not reproduce the one-in-three symptom on demand, so the issue stays open until someone
  sees a clean run on the live site. Closing it on a fix I cannot demonstrate would be the
  thing that reads as progress and is not.
- **Whether other database objects are undocumented like those 23 tables were.** The two
  found today were found because they happened to be publicly callable and stood out. A
  full comparison has never been run.
- **A detector for a rule that vanishes** (as the invitations one did). I built one, found
  it flagged 40 correct designs to catch a single fault, and removed it rather than ship an
  alarm everyone would learn to ignore. The design that would work is written down.
