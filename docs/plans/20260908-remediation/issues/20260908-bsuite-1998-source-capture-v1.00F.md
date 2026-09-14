---
kind: record
authority: none
owner: bsuite
---

# SEC-P2: Add Cloudflare Turnstile CAPTCHA to conduit apply form

https://github.com/GaryOcean428/bsuite/issues/1998

Snapshot updatedAt: 2026-08-24T03:27:59Z. Open at capture; re-read live.

## Finding
`/portal/careers/:jobId/apply` has server-side rate limiting (3/IP/job/hour) but no CAPTCHA.
Automated browsers are not challenged.

**Route:** `/portal/careers/[jobId]/apply`
**Risk:** Low — rate limit is strong, but CAPTCHA adds defence-in-depth
**Recommendation:** Add Cloudflare Turnstile before submit button

Found by route inventory security audit (Phase 2, Task 2.1).
