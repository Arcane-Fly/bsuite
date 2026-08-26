---
kind: record
authority: engineering
owner: bsuite-lane
---

> **POINT-IN-TIME RECORD — as at 2026-08-26 08:00 AWST. Not maintained.**
>
> An account of what was and was not on production at one moment, written for a
> 09:30 demo. It asserts nothing about the present and cites no gate deliberately:
> no check could pass or fail to keep it true, because what it describes has
> already happened.
>
> Everything it names was addressed the same day — the promotion it was waiting on
> merged, and the card-frame regression it reports was fixed and verified live
> across nine pages. Read it as history.


# Morning ledger — 2026-08-26, 08:00 AWST

Written for Braden. Demo at 09:30. Read the first section and nothing else if you are short of time.

---

## THE ONE THING YOU NEED TO DECIDE

**Production does not have last night's fixes. Your 09:30 demo will show the bugs you reported.**

Twenty-five commits sit on `development` and not on `main`. They include every complaint you
raised between 06:17 and 07:10. The promotion PR (crm7 #2008) is written, mergeable, and has
zero failing checks — but its last checks (`build-and-test`, `e2e`, `Coverage floor`) were still
running at 08:00:04, and **08:00 is the freeze you set**. I held it rather than promote four
minutes into your own stability window.

**What is stranded off production right now:**

| Fix | What you see today on prod without it |
|---|---|
| A grid inside a grid drags as one block | Government Claims cards stuck to one backing card, dragging together — your 06:17 report |
| The Rates card offered nothing to do | Placement rates card is a dead end with no action |
| Quote this placement in R8 | No button; you re-enter every particular by hand |
| Send the quote to the host for signature | Not there |
| Probation date read 04/18/2026 | US date format shown to Australian users |
| An invitation was created and no email sent | Invites silently never arrive |
| Every dispatcher call had the same missing credential | More silent email failures |
| /settings/users could never show a name or email | Blank member list |
| Card widths 285 pages were authored for | Layout drift |

**Your call, and it is genuinely yours:**

- **Say "promote"** and I merge #2008 the moment it goes green. You get the fixes, but production
  changes under you maybe 30–60 minutes before the demo, and your spot-check window shrinks.
- **Say nothing** and production stays exactly as it is now. Stable, predictable, and carrying the
  bugs you reported. The fixes land at 11:00 when your window reopens.

I am not promoting without a word from you, because the freeze exists precisely to stop this.

---

## VERIFIED-DONE — checked by a lane other than the one that claimed it

**BSU card frames restored, on production.** Two pages (`Analytics`, `GTO`) lost every card frame
when the page-builder package changed its default. PR #871 merged 23:45 and deployed. The sweep
lane measured `/analytics` at 10 of 10 slots borderless *before* the deploy and framed *after* —
a before/after on the same live page, not a code reading.

**No other page in the estate lost its frames.** A separate lane measured the rendered page on
38 route-states across four apps, in both light and dark, at 1440px, signed in, with the service
worker blocked — 76 measurements. It found nothing further to fix and therefore opened no PR.
It also threw away its own first metric after screenshots contradicted it in both directions,
which is the reason I trust the second one.

**Two dead admin screens are alive.** `tenant_invitations` and `tester_licenses` could never be
read by any signed-in user. Fix applied to the live database and behaviour-verified.

**A security hole is closed.** `is_platform_admin` was reachable by anonymous callers. Now 401.

## CLAIMED-DONE — landed, but no second lane has checked it

- **crm7 #2003** — the grid-inside-a-grid fix. Merged to `development` 23:10.
- **crm7 #2014** — a new `/financial/placements` ledger for payroll and accounts. Checks still running.
- **crm7 #2011** — placements now appear as a table on the placed person's record. Auto-merge armed.
- Six always-true database policies scoped so a signed-in user can no longer read another tenant's rows.

## IN-PROGRESS

- **BSU admin audit log** — a lane is fixing it now, to `development` only. See the finding below.

## BLOCKED — with the named unblock

- **crm7 #2008, the promotion.** Unblock: your word, or 11:00, whichever comes first.

---

## A NEW FINDING, and it is a compliance one

BSU's `/admin` → **Audit Log** tab crashes to the error boundary. That is the visible half.

The invisible half matters more: the function that records admin actions writes to five columns
that **do not exist** on the live table. So it is not that the audit log displays badly — **admin
actions have been silently not recorded at all.** For you specifically, an audit trail that
quietly holds nothing is a different category of problem from a broken screen.

A lane is fixing the service to match the live table. I told it not to migrate the table: a schema
change is a bigger decision than one lane should take under a freeze, and rewriting the service
restores the record without touching data.

---

## WHAT I GOT WRONG LAST NIGHT

- I broke the crm7 test suite. I added a `useQueryClient` call to the placement rates card and its
  test had no provider, so fourteen tests died on import and blocked every crm7 PR for a stretch.
  Another lane fixed it (#2015) before I got to it.
- I removed a git worktree while a lane was still working inside it. I restored it, but that lane
  had to be rescued rather than simply finishing.
- **I told you production had frozen when it had not.** You caught it. That one misled you about
  the state of your own estate, which is worse than the other two.

## WHAT I DID NOT DO

- **No deployed-UX pass on the new work.** The financial placements ledger and the person-record
  placements table are proven by unit tests and a clean production build. Neither has been opened
  in a browser as a signed-in tenant user. Do not treat them as demo-ready.
- **Not built:** R8 pushing a finished quote back into the placement; paper-signature PDF upload
  with attestation; and in-place visual card composition — adding, deleting and composing cards on
  the page you are already on, without being taken somewhere else. That last one is the root of
  four separate complaints you made, and it is the biggest thing still outstanding.

## FUTUREBUILD ACADEMY — untouched

Measured before and after every dispatch, by two lanes independently:

| contacts | placements | people | training_contracts | timesheets | incidents |
|---|---|---|---|---|---|
| 13 | 8 | 8 | 8 | 3 | 0 |

Identical at both ends. `max(placements.updated_at)` still 2026-08-24. No write path touched it.
