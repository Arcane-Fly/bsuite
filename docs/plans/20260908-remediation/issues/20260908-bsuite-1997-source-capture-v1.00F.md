---
kind: record
authority: none
owner: bsuite
---

# SEC-P2: Add Vercel WAF rate limit on conduit /api/public/jobs-feed

https://github.com/GaryOcean428/bsuite/issues/1997

Snapshot updatedAt: 2026-08-24T03:27:58Z. Open at capture; re-read live.

## Finding
The public jobs-feed XML endpoint has no application-layer rate limit. It relies on 30-minute CDN cache only.

**Route:** `/api/public/jobs-feed`
**Risk:** Low — CDN absorbs normal traffic, but no hard guarantee on cache bypass
**Recommendation:** Add Vercel WAF rule ~60 req/min/IP

Found by route inventory security audit (Phase 2, Task 2.1).
