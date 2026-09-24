---
kind: record
authority: none
owner: bsuite
---

# Decide on PITR (database rewind) — operator flagged for the week of 2026-08-11

https://github.com/GaryOcean428/bsuite/issues/1866

Snapshot updatedAt: 2026-08-24T03:26:08Z. Open at capture; re-read live.

**Operator decision, deferred deliberately on 2026-08-09 to later in the week.** Not a blocker; nothing is waiting on it.

## What it is

A database rewind. Today the project takes **one backup a day** — if something damages the data, you restore last night's copy and lose everything since. Point-in-time recovery records changes continuously, so you can rewind to any second inside a window. Break something at 3:12pm, go back to 3:11pm, lose a minute.

## Cost

| window | price |
|---|---|
| 7 days | **$100/month** |
| 14 days | $200/month |
| 28 days | $400/month |

Current state: `pitr_enabled: false`, `walg_enabled: true`, 8 daily physical backups retained.

## Why it was raised

The 2026-08-09 promotion applied 39 migrations to production. The safety net for that was a **logical dump taken by hand**, which I restore-tested rather than assumed — and the first read of it looked like it was missing two Class A tables, because I read the file while `pg_dump` was still writing it. It restored correctly in the end (10/10 Class A tables, including 2,194 audit rows and 425 document records), but that is several judgement calls standing between the data and its recovery.

## What a day of loss actually costs here

Timesheets submitted and approved, placements created or changed, documents uploaded and verified, apprentice records edited, and the audit trail of who did each. For a GTO a material part of that **is** the compliance evidence — re-entering a timesheet is possible; reconstructing the record that someone approved it at a specific time is not. That exact class of problem was found in production on 2026-08-09: three timesheets asserting an approval with no approver, no timestamp and no audit entry.

## Recommendation

**The $100/month 7-day option.** Not because of a near miss — the promotion went cleanly — but because the current recovery story depends on someone taking a good dump at the right moment and checking it properly.

## If the answer is no

That is defensible, and it should be **written down rather than assumed**: the accepted recovery point is up to 24 hours, and any migration batch should be preceded by a hand-taken, restore-tested dump as it was on 2026-08-09.

Refs bsuite#1845, crm7#1537
