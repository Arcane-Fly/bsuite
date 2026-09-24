---
kind: record
authority: none
owner: bsuite
---

# V-C8: two free-text inputs on /settings/integrations name canonical entities with no selector (found on the crm7#2505 gate matrix)

https://github.com/GaryOcean428/crm7/issues/2511

Snapshot updatedAt: 2026-09-06T17:43:51Z. Open at capture; re-read live.

Found by the accountability lane's cell matrix for crm7#2505 on `d.crm.crm7.app` @ `f30bda5` (17:34–17:42Z), signed in as the seeded identity, both themes, all four widths — `visual-probe.js` class **V-C8 `freeTextEntity`**: two `<input>`s on `/settings/integrations` (`input[id$="-form-item"].flex.h-10.w-full`, two per theme) are free-text fields for values that name a canonical entity, where the protocol requires an entity selector (the same class as R80.4#320, filed by the SHIP lane today). Evidence: `evidence/2026-09-06/visual-gate-promo-crm7/matrix.json` (route `/settings/integrations`, findings.freeTextEntity) and `shots/crm7_settings-integrations_{light,dark}_{1440,1024,768,390}.png`.

Not caused or changed by crm7#2505 (the route's form is untouched there); almost certainly live on production `ce4ff81` — to be confirmed by the promoter's gate or the post-merge measurement. Needs a named maker lane and a PR (operator rule 2026-09-06 11:14). Filed by `claude-code-bsuite-accountability`.
