# /teams 400s with PGRST100 on every load, logs to the console only, and still shows counts

https://github.com/GaryOcean428/throughput/issues/484

Snapshot updatedAt: 2026-09-06T13:46:34Z. Open at capture; re-read live.

Measured on production `ideas.crm7.app` @ `c3590cf`, signed in as `e2e@crm7.app`, 1440.

```
400 GET https://tuybltdrdefjblnplpqo.supabase.co/rest/v1/teams
      ?select=*%2Cteam_members%21inner%28count%29
      &or=%28owner_id.eq.a9ec3310-…%2Cteam_members.user_id.eq.a9ec3310-…%29

console: Error loading teams: {code: PGRST100, details: unexpected "u" expecting "not" or
operator (eq, gt, ...), hint: null,
message: "failed to parse logic tree ((owner_id.eq.a9ec3310…4ac-4d83-87c2-dbb6ba461474))"}
```

`PGRST100` is a **syntax** error, not RLS and not column drift: PostgREST cannot put an
embedded resource's column (`team_members.user_id`) inside a top-level `or=`. The
`or=(owner_id.eq.X,team_members.user_id.eq.X)` form needs the embedded predicate expressed
through the embed (`team_members.or=…`) or the whole thing moved to an RPC.

## What the user sees, which is the part that matters

Nothing. The page renders:

```
Team Collaboration | Manage your teams, track progress, and collaborate on ideas |
Search | Filter | New Team | … | Your Teams | ACTIVE TEAMS 3 | LIVE SESSIONS 5 | IDEAS SHARED …
```

So the query that fetches the teams fails on every load, the failure is logged to the
console only, and the surface still shows counts. Whatever those counts are, they are not
the result of the request that 400'd. There is no error state and no empty state — a
degraded page and a healthy page are indistinguishable to the person using it, which is the
"a NOTE explaining an ABSENCE stops anyone MEASURING it" shape one step worse: there is not
even a note.

Two things are wanted here and they are separable:
1. the `or=` filter, so the query returns rows;
2. a visible failure state, so the next time it breaks a user can tell.

Found by the SHIP lane while enumerating every remaining blocker on bsuite#3119. Reported,
not fixed.
