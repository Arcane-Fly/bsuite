---
kind: record
authority: none
owner: bsuite
---

# [P0][security] Platform-level scope is visible to enterprise tenants in three surfaces — needs a suite-wide sweep

https://github.com/GaryOcean428/bsuite/issues/1960

Snapshot updatedAt: 2026-08-26T15:28:20Z. Open at capture; re-read live.

## The rule

**Nobody but a developer account may hold platform-level visibility of any kind.**

Enterprises control their parent and sub-organisation branding. Organisations control their own branding for white-labelling. Platform-level surfaces belong in the Developer Portal, which already has the capability.

## Three confirmed instances

1. **Custom report builder** — signed in as FutureBuild, the builder offers platform-wide reporting. A client can build a report across the whole platform. Super admins may want to set permissions so a sub-org can only report on itself; **no account below developer should have platform-level reporting at all**.
2. **`/admin/permissions`** (BSU) — exposes platform-admin rows to enterprise tenants and their users. None of them should be able to see, let alone edit, global and universal developer permissions. Default permissions should also show the marked checkbox, which they currently do not.
3. **`/admin/branding` and `/admin/platform-kit`** (BSU) — platform branding and platform kit are visible outside the Developer Portal. Both move.

## Why this is filed as one issue and not three

It is one rule, violated three times, and the operator has asked for a sweep rather than three fixes. Fixing the three named surfaces and stopping is the failure mode called out in D-62 of the same directive: fixing the page that was pointed at rather than the class.

## Required actions

1. Move platform branding and platform kit into the Developer Portal.
2. Gate report scope: platform scope is developer-only; enterprise scope covers the enterprise and its sub-orgs; org scope covers the org. Enforce in RLS as well as UI — a hidden option that the API still honours is not gated.
3. **Sweep every feature in every app** for surfaces that expose platform-level scope, configuration, or data to a non-developer account. Report the count found and the count fixed.

## Acceptance criteria

- [ ] Platform branding and platform kit reachable only from the Developer Portal
- [ ] `/admin/permissions` shows no platform-admin rows to a non-developer account, and default permissions render their checked state
- [ ] Report builder offers no platform scope to a non-developer account, and a direct API call with an enterprise token requesting platform scope is refused
- [ ] Two-account test: enterprise admin and developer, side by side, showing the difference
- [ ] Sweep count reported with the enumeration method

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: both — §9.1 for the API refusal, §9.2 for the surfaces
- **Equivalence target**: enterprise-token API responses before/after; screenshots of each surface under both account types
- **Cross red-team**: peer confirms the API layer refuses platform scope independently of the UI
- **Skills to load**: `supabase-auth-comprehensive`, `dry-one-shot-architecture`, `api-design-validation`
- **Self-report on divergence**: yes

Ref: operator directive 2026-08-13 §2, D-66. Related: crm7#1568 (second report builder), bsuite#1882 (reporting).
