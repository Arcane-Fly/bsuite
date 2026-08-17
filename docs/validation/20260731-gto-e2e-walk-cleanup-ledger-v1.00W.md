# GTO enquiry-to-billing walk — cleanup ledger

**Date opened:** 2026-07-31 · **Status:** OPEN
**Plan:** `~/.claude/plans/lazy-hopping-nest.md`, Amendment B condition 1

> Every record the walk creates is written here **as it is created**, never
> reconstructed afterwards. A record that is not on this ledger will not be
> cleaned up, because reading the ledger cannot reveal what was never written to
> it. RT-4 therefore reconciles from the **live catalog outward**, not from this
> file inward.

**Tenant:** `bsuite Platform` (`0c514bfc-3a2c-438f-85c2-4653997ccb22`) — the
operator's dev tenant. **No records were created in FutureBuild Academy**, the
real client tenant.

---

## Created

| # | table | id | key fields | created_at (UTC) | removed |
|---|---|---|---|---|---|
| 1 | `charge_rate_quotes` | `7f085339-7d88-4652-bca4-261405fc1dfe` | worker Ryan O'Connor, host PlumbSure WA Pty Ltd, `quote_stage=provisional`, `status=draft`, `charge_rate_hourly=55.2730`, `effective_date=2026-07-31` | 2026-07-31 08:14:01.291501+00 | ☐ |
| 2 | `charge_rate_snapshots` | `5cff529f-aff1-4d35-942f-2f8fad98a1c8` | `charge_rate_quote_id=7f085339…`, `placement_id=NULL` | 2026-07-31 08:14:01.639071+00 | ☐ |

Both were created by a single **Save Charge Rate** action in the UI on
`d.crm.crm7.app/charge-rates/create` — walk link 4. The snapshot is written
automatically by the save path; it is not a separate operator action, but it is
a separate row and is ledgered as one.

## Not created

Nothing else. In particular the walk created **no** apprentices, people,
employers, placements, timesheets, invoices, engagements or host agreements —
every other blocker was reachable without seeding. Links 5b, 5c, 8, 9 and 10 are
blocked by absent entities or an unconnected integration, not by missing test
data, so seeding would not have advanced them.

## Cleanup

```sql
-- Order matters: the snapshot references the quote.
delete from public.charge_rate_snapshots
 where id = '5cff529f-aff1-4d35-942f-2f8fad98a1c8';

delete from public.charge_rate_quotes
 where id = '7f085339-7d88-4652-bca4-261405fc1dfe';
```

**Do not run this yet.** The quote is walk evidence for links 3b/4/5 and is the
only charge rate in the system that was derived rather than typed. Remove it
when the walk closes, then run RT-4 **outward from the catalog**:

```sql
-- RT-4: anything created today that is NOT on this ledger
select 'charge_rate_quotes' t, id, created_at from public.charge_rate_quotes
  where created_at::date = date '2026-07-31'
union all
select 'charge_rate_snapshots', id, created_at from public.charge_rate_snapshots
  where created_at::date = date '2026-07-31'
union all
select 'placements', id, created_at from public.placements
  where created_at::date = date '2026-07-31'
union all
select 'timesheets', id, created_at from public.timesheets
  where created_at::date = date '2026-07-31'
union all
select 'invoices', id, created_at from public.invoices
  where created_at::date = date '2026-07-31'
order by 3;
```

Expected after cleanup: **zero rows**. Any row that appears and is not in the
Created table above is exactly the failure mode this ledger cannot detect on its
own.

## Note on the FutureBuild `state` backfill

Migration `20260731110000` set `employers.state = 'WA'` on FutureBuild Academy's
3 employers. **That is not walk-created data and must NOT be reverted by this
cleanup.** It is a correction of missing production data, made on the operator's
explicit statement that all FutureBuild employers are WA, and it is what keeps
crm7#1341 from blocking quoting for the real client.
