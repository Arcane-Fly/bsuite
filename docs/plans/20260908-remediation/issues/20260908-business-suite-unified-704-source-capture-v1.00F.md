---
kind: record
authority: none
owner: bsuite
---

# BSU's edge rate limiter has never limited anything, and its bucket key is caller-forgeable

https://github.com/GaryOcean428/business-suite-unified/issues/704

Snapshot updatedAt: 2026-08-31T02:52:21Z. Open at capture; re-read live.

## Two defects, one file

`business-suite-unified/supabase/functions/_shared/rate-limiter.ts` is live and does not limit anything, and its bucket key is chosen by the caller.

### 1. The counter cannot accumulate (whole estate)

It counts in a module-level `Map`. Measured on this Supabase project from its own `function_logs` / `function_edge_logs`:

| Measurement | Value |
| --- | --- |
| Isolate lifetime, Boot→Shutdown | p50 **200,019 ms**, max 400,004 ms |
| Rate-limit window | 60,000 ms |
| Requests in one minute from a **single** `cf-connecting-ip` | 85 |
| Distinct isolates that served them | **74** |
| Most requests ever served by ONE isolate in 24h | **6** (threshold 30) |

The runtime spreads consecutive requests across many simultaneously-live isolates in a single region. The count is not expiring — it is **sharded**. A threshold of 30 is unreachable by construction, so **any** in-memory counter in a Supabase edge function is dead on arrival. Making isolates live longer or shrinking the window fixes nothing.

*Positive control:* the same query reports 2–6 for the 66 isolates that did serve more than one request, so the measurement is not structurally pinned at 1.

### 2. The bucket key prefers a header the caller writes

From the **deployed** source of the `generate-document` slug (v79, entrypoint `business-suite-unified/...`):

```js
const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
const cfIp = req.headers.get("cf-connecting-ip")?.trim();
const key = forwardedFor || cfIp || `unknown:${crypto.randomUUID()}`;
```

`x-forwarded-for`'s first hop is written by the caller and is **preferred over** the edge-set `cf-connecting-ip`. Rotating one header defeats the throttle outright. crm7 closed this same defect on 2026-08-12; BSU's copy never got it.

### Also: the "platform" limiter is dead too

`rate-limit-check` uses Upstash only when `KV_REST_API_URL` **and** `KV_REST_API_TOKEN` are set. **Neither is set on this project** — checked live against the 65-name secret list on 2026-08-13 — so it falls back to its own in-memory `Map`, defect #1. `_shared/rate-limit-enforce.ts` then **fails open** on every error path, so nothing is refused even when the counter is reachable.

Net: **there is currently no working edge rate limiting anywhere in this estate.**

### The fix already exists

crm7 PR GaryOcean428/crm7#1673 lands `public.edge_rate_limit_hit` + `public.edge_rate_limit_buckets` (migration `20260814070000`) on the **shared** Supabase project — row-per-bucket keyed `(scope, sha256(identity))`, one atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` where the increment IS the check, `service_role`-only, fail-closed with an explicit `EDGE_RATE_LIMIT_FAIL_OPEN` kill switch.

Proved live: 32 requests at limit 30 → request 31 denied; 40 distinct clients → 40 buckets, 0 denied; **8 concurrent sessions × 20 calls at limit 100 → exactly 100 allowed**, where a read-modify-write variant under the same load allowed all 160.

Because it lives in the shared database, BSU can adopt it by porting `_shared/rate-limiter.ts` from crm7 — no new table, no new migration, no new vendor.

### Suggested scope

- [ ] Port crm7's `_shared/rate-limiter.ts` (durable + `cf-connecting-ip`-only key) into BSU; `await` the ~17 call sites.
- [ ] Decide `rate-limit-check`'s fate: point it at `edge_rate_limit_hit` or delete it. Its Upstash path is unreachable as configured.
- [ ] Reconsider `_shared/rate-limit-enforce.ts` failing open — that is what makes an absent limiter invisible.

Filed by the crm7 lane that measured this. Not fixed here: BSU is not that lane's repo, and `generate-document` is BSU's deployed slug.
