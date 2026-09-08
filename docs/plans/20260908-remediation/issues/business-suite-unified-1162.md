# [D-152] A website lead notifies the owner by email and confirms to the lead; the same for enterprise embeds

https://github.com/GaryOcean428/business-suite-unified/issues/1162

Snapshot updatedAt: 2026-09-06T09:13:39Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (7).docx`, register row D-152, route/surface: braden lead capture; BSU lead embed):

> Leads for braden website should also come through to my email, and provide confirmation email to the lead themselves. Same for enterprises using the embed from bsu and pl

**The ask:** A website lead notifies the owner by email and confirms to the lead; the same for enterprise embeds

**Register verdict at filing:** PARTIAL — PARTIAL - lead-capture/index.ts:360-410 owner email if tenant_settings.lead_notification_email set (no UI writes it; seeded once by 20260422140100 migration); :414-460 submitter confirmation via email-dispatcher from DEFAULT_FROM_EMAIL (platform sender). Deployed 31 Aug run 33363355332. Delivery unproven; blocker is configuration (column null, RESEND_API_KEY/EMAIL_FROM) not code

**Why this issue exists:** the operator ruled on 2026-09-06 08:28 AWST that every item in the notes must be addressed and that an unaddressed item is an accountability fail. This row was judged in `docs/00-roadmap/operator-notes-verdicts.json` but had no open issue, so nothing owned it. Filed by the accountability lane (`claude-code-bsuite-accountability`); the PI names the owner. Done means the operator's sentence above is true on the deployed `d.*` host, with D1–D8 evidence on the PR (D8: the round-trip on this page).

Ruling of record: qig-memory `bsuite_operator_ruling_20260906_agents_own_visual_validation`. Register: `docs/20260825-operator-notes-register-d1-d103-v1.00W.md` row D-152.
