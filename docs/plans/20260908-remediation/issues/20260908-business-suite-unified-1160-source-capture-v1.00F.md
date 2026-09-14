---
kind: record
authority: none
owner: bsuite
---

# [D-148] Enterprise white-label at tenant level cascading to every sub-organisation, or per sub-tenant; never

https://github.com/GaryOcean428/business-suite-unified/issues/1160

Snapshot updatedAt: 2026-09-06T09:13:28Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (7).docx`, register row D-148, route/surface: /branding):

> https://suite.crm7.app/branding - white label option available to enterprise users. Overrides platform logo's and branding for their tenant and sub organisation tenants a

**The ask:** Enterprise white-label at tenant level cascading to every sub-organisation, or per sub-tenant; never braden

**Register verdict at filing:** PARTIAL — PARTIAL - Branding.tsx (1,209 lines) edits the caller's own tenant_branding only (lines 398-431, AccessGuard white_label at 726); no sub-organisation fan-out control exists (grep parent_tenant|subOrg = 0); AdminBranding.tsx's tenant picker lists every tenant (getTenants limit 200) rather than the caller's parent_tenant_id chain. BSU#320 (parent_tenant_id + hierarchical resolve) and #507 are closed

**Why this issue exists:** the operator ruled on 2026-09-06 08:28 AWST that every item in the notes must be addressed and that an unaddressed item is an accountability fail. This row was judged in `docs/00-roadmap/operator-notes-verdicts.json` but had no open issue, so nothing owned it. Filed by the accountability lane (`claude-code-bsuite-accountability`); the PI names the owner. Done means the operator's sentence above is true on the deployed `d.*` host, with D1–D8 evidence on the PR (D8: the round-trip on this page).

Ruling of record: qig-memory `bsuite_operator_ruling_20260906_agents_own_visual_validation`. Register: `docs/20260825-operator-notes-register-d1-d103-v1.00W.md` row D-148.
