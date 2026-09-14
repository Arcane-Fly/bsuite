---
kind: record
authority: none
owner: bsuite
---

# [D-153] Customisable embed form fields outside the developer portal; braden.com.au may use the same embed as

https://github.com/GaryOcean428/business-suite-unified/issues/1163

Snapshot updatedAt: 2026-09-06T09:13:45Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (7).docx`, register row D-153, route/surface: BSU lead embed):

> Embed form fields customizable. Must be outside of developer portal. It may be simpler to just use the embed and use that on my website braden.com.au same as user enterpr

**The ask:** Customisable embed form fields outside the developer portal; braden.com.au may use the same embed as enterpris

**Register verdict at filing:** NOT-DONE — NOT-DONE - two embeds with two fixed field sets: crm7/public/embed/lead-form.html:42-57 (6 fields) and business-suite-unified Embed/LeadForm.tsx:45-66 (4 fields); no field configuration anywhere (grep embed_fields|form_fields = 0); the snippet is issued from Developer/Embed.tsx:351, inside the developer portal he asked it to be outside of.

**Why this issue exists:** the operator ruled on 2026-09-06 08:28 AWST that every item in the notes must be addressed and that an unaddressed item is an accountability fail. This row was judged in `docs/00-roadmap/operator-notes-verdicts.json` but had no open issue, so nothing owned it. Filed by the accountability lane (`claude-code-bsuite-accountability`); the PI names the owner. Done means the operator's sentence above is true on the deployed `d.*` host, with D1–D8 evidence on the PR (D8: the round-trip on this page).

Ruling of record: qig-memory `bsuite_operator_ruling_20260906_agents_own_visual_validation`. Register: `docs/20260825-operator-notes-register-d1-d103-v1.00W.md` row D-153.
