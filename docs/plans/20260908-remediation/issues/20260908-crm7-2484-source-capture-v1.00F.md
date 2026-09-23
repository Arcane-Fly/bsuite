---
kind: record
authority: none
owner: bsuite
---

# /reports and /settings/form-layouts stack sparse full-width cards 1-up at 1440 and 1024 — the density bar is 2-up/3-up

https://github.com/GaryOcean428/crm7/issues/2484

Snapshot updatedAt: 2026-09-06T09:15:32Z. Open at capture; re-read live.

Measured on `crm.crm7.app` serving `c3c37b3` (read-only Playwright, seeded e2e identity, loaded state, 2026-09-06 00:5xZ). Evidence: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/evidence/2026-09-06/visual-gate-3102/report.md` (Density table), `shots/crm7_reports_light_1440.png`, `shots/crm7_settings-form-layouts_light_1440.png`.

| route | width | cards in main column | per-row profile | full-width cards |
|---|---|---|---|---|
| `/reports` | 1440 | 5 | [1, 1, 1, 1, 1] | 4 |
| `/reports` | 1024 | 5 | [1, 1, 1, 1, 1] | 4 |
| `/settings/form-layouts` | 1440 | 2 | [1, 1] | 1 |
| `/settings/form-layouts` | 1024 | 2 | [1, 1] | 1 |

For comparison on the same build: `/dashboard` 4-up at 1440 / 2-up at 1024, `/people` 4-up, `/deals` 4-up — those meet the bar. On `/reports` the "Build a report" card (one paragraph and one button) and the "Report catalogue" card (one search box and a filter button) each take the full 1080px main column; screenshot attached in the evidence dir. The operator's bar (Wayne vision pack ce261594 A, operator ruling 2026-09-06): full-width sparse cards default to 2-up/3-up.

**Done means:** the two sparse cards share a row at ≥1024 (the table keeps full width), the same on `/settings/form-layouts`, the density numbers re-measured on `d.crm.crm7.app` and posted on the PR, and the sibling surfaces counted — every route whose loaded main column shows ≥2 consecutive full-width cards under 200px tall, with the method stated. Filed by the accountability lane; PI names the owner.
