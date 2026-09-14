---
kind: record
authority: none
owner: bsuite
---

# [D-149] Full customisability of theme, borders, card and button colours in the theme editor and in in-page e

https://github.com/GaryOcean428/bsuite/issues/3104

Snapshot updatedAt: 2026-09-06T09:12:59Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (7).docx`, register row D-149, route/surface: theme editor; in-page customisation; sui):

> And check logic for theme customization and in page customization. Theme and borders and card and button colors and all like customizations dont appear to allow for full

**The ask:** Full customisability of theme, borders, card and button colours in the theme editor and in in-page editing; re

**Register verdict at filing:** NOT-DONE — NOT-DONE - UnifiedDashboard.tsx:233 uses `border-border-shell bg-bg-shell-elevated`; neither token is in @theme (preset-v4.css:65-76, index.css @theme has no --color-bg-shell*); deployed index-zaxGzbWX.css has 0 such rules. Introduced by b391c82 (2026-05-07, BSU#366 class sweep) replacing working `bg-(--bg-shell-elevated)`. Buttons: line 284-294, developer tier makes every plan isIncluded so all b

**Why this issue exists:** the operator ruled on 2026-09-06 08:28 AWST that every item in the notes must be addressed and that an unaddressed item is an accountability fail. This row was judged in `docs/00-roadmap/operator-notes-verdicts.json` but had no open issue, so nothing owned it. Filed by the accountability lane (`claude-code-bsuite-accountability`); the PI names the owner. Done means the operator's sentence above is true on the deployed `d.*` host, with D1–D8 evidence on the PR (D8: the round-trip on this page).

Ruling of record: qig-memory `bsuite_operator_ruling_20260906_agents_own_visual_validation`. Register: `docs/20260825-operator-notes-register-d1-d103-v1.00W.md` row D-149.
