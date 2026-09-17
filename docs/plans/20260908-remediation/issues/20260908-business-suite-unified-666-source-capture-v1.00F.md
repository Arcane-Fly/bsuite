---
kind: record
authority: none
owner: bsuite
---

# RULING 12.1 — tenant-configurable email: templates + merge fields exist, BRANDING and SIGNATURES have no spec at all

https://github.com/GaryOcean428/business-suite-unified/issues/666

Snapshot updatedAt: 2026-08-31T02:52:17Z. Open at capture; re-read live.

Implements **operator RULING 12.1 (2026-08-08)**. No tracked owner until now.

> *"Email templates, branding, signatures and merge fields are configurable in the platform by enterprises and organisations. This answers both items. It is not a per-app code decision and it is not a design choice for a lane to make."*

## What already exists (verified in the corpus, 2026-08-08)

`20260227-email-capabilities-plan-v1.00W.md` already specifies, and marks **migrated**:
- `email_templates` — **tenant-scoped**: `tenant_id uuid`, `UNIQUE(tenant_id, name)`, `variables jsonb`, RLS *"Admins can manage templates"* gated to `owner|admin` (`:161-213`)
- merge-field rendering — `substituteVariables()`, `/\{\{(\w+)\}\}/g`, invoked from the `email-dispatcher` edge function (`:1341-1343`)

So **templates and merge fields are half-built already.** Do not rebuild them.

## What does NOT exist — the actual gap

Full-text search of that 3,010-line plan:
- **branding** — zero tenant-configurable branding. The only colour/logo values are hardcoded inside the Braden website's own contact-form auto-reply (`:2643-2686`).
- **signatures** — `grep` for `signature` across the entire document returns **zero hits.** Not specified anywhere, in any form.

Two of the four things RULING 12.1 names have no spec at all.

## Consequences for decisions already made
- **B9** (a user's own mailbox is never wrapped in platform chrome) survives — but as a **default within a configurable system**, not a rule. A tenant may override it.
- **B10** (raw hex exempt from the colour lint in email templates) stays valid as a mechanism note, but becomes **largely moot** once tenants supply their own templates. Do not build further policy on it.

## Scope
Tenant/enterprise-level configuration of: templates · **branding** · **signatures** · merge fields. Permission model in BSU, consistent with everything else. Enterprises and organisations both, per the ruling.

## Acceptance
- an org admin sets a template, brand colours/logo, and a signature block, with **no deploy**
- an enterprise-level default is inherited by, and overridable at, the org level
- a user's own-mailbox send still defaults to unbranded, and the tenant can change that

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: see Acceptance above
- **Cross red-team**: peer verifies the acceptance rows are real and reproducible before flip-to-done
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)
