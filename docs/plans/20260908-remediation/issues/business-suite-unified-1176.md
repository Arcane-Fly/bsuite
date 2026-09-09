# the onboarding wizard's scrim was masking 2 console errors and 2 403s on user_tenants against the all-zeros tenant UUID

https://github.com/GaryOcean428/business-suite-unified/issues/1176

Snapshot updatedAt: 2026-09-06T13:49:33Z. Open at capture; re-read live.

Measured on `suite.crm7.app` production `9292b84` (asset
`assets/index-BTuXRujg.js`), signed in as `e2e@crm7.app`, route `/`, Chromium.

**BSU opens a 4-step onboarding wizard whose full-screen scrim intercepts
everything.** With the wizard dismissed, the dashboard reports:

- **2 console errors**
- **2 HTTP 403s on `user_tenants`**, against the **all-zeros tenant UUID**
  (`00000000-0000-0000-0000-000000000000`)

The modal was masking them: a run that does not dismiss the wizard sees a clean
console, because nothing behind the scrim gets exercised. That is the part worth
recording independently of the 403 itself — **an overlay that blocks interaction
also blocks the evidence**, so any probe of this route that does not dismiss it
first is reporting on the modal, not on the dashboard.

Two things to establish, in this order:

1. Where the all-zeros tenant id comes from. A sentinel that means "unknown"
   being sent as if it were a real tenant is the shape of
   `feedback_a_null_meaning_unknown_must_never_be_read_as_unrestricted` — the
   403 may be the only reason it is visible.
2. Whether the wizard should be dismissible/skippable at all for an account that
   already has a tenant, since it is what hid this.

Filed, not fixed, from the lane on business-suite-unified#1175 (dark-mode
contrast) — measured on the same route, different class, out of that change's
scope. Not fixed there deliberately rather than folded into an unrelated diff.

