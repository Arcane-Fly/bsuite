# SEC-P1: No CAPTCHA on BSU embed forms (/embed/lead-form, /embed/contact)

https://github.com/GaryOcean428/bsuite/issues/2000

Snapshot updatedAt: 2026-08-24T03:28:01Z. Open at capture; re-read live.

## Finding
Both embed forms are fully scriptable with the public anon key. /embed/lead-form has a client-side 10/min counter (trivially bypassed). /embed/contact has NO throttle at all.

An attacker with any tenant UUID can flood leads tables.

**Action:** Add Cloudflare Turnstile with server-side siteverify in the lead-capture edge function.

Found by route inventory security audit (Phase 2, Task 2.3).
