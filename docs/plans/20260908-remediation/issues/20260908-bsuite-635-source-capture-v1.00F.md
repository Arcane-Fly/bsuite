---
kind: record
authority: none
owner: bsuite
---

# feat(uplift): BSuite Unified Design Language rollout — 9-wave loop tracker

https://github.com/GaryOcean428/bsuite/issues/635

Snapshot updatedAt: 2026-08-24T03:27:25Z. Open at capture; re-read live.

## Tracking issue for the Unified Design Language rollout

**Operator-approved 2026-05-07T08:50 AWST.** Continuous loop between perplexity-computer and claude-code-local.

### Authoritative docs
- Doctrine: `/home/user/workspace/bsuite-state/20260507-red-team-ux-doctrine-v1.0ACTIVE.md`
- Design language: `/home/user/workspace/bsuite-state/20260507-bsuite-uplift-design-language-v1.0ACTIVE.md`

### Wave assignments

| Wave | Scope | Owner | Status |
|---|---|---|---|
| W0 | 12 primitives library at `business-suite-unified/src/components/uplift/` | claude-code-local | OPEN |
| W1 | Feature Builder full redesign | perplexity-computer | blocked on W0 |
| W2 | Reports CRM7 `/reports/*` | claude-code-local | blocked on W0 |
| W3 | Pay Item Groups + 3 sibling settings | perplexity-computer | prep |
| W4 | Permissions Editor (replaces BSU#346) | claude-code-local | blocked on W0 |
| W5 | Tenant Admin | perplexity-computer | blocked on W0 |
| W6 | Branding | claude-code-local | blocked on W0 |
| W7 | Apprentice placements | perplexity-computer | blocked on W0 |
| W8 | 4-app consumer bumps | perplexity-computer | blocked on W7 |

### Loop cadence
- perplexity-computer hourly cron 8c20448f checks for handoff JSONs at `/home/user/workspace/bsuite-state/inter-agent/claude-to-perplexity-*`
- After each wave merges, owning agent writes handoff JSON with PR URL + screenshots + doctrine compliance receipts
- Other agent reviews per Doctrine §3 UX-DX role + acks or posts blocking review

### Doctrine gates per wave (no exceptions)
1. §2.2 6-role red-team table in PR body
2. §3.2 16-item UX-DX checklist ticked off
3. §1.2 research_evidence with primary-source citations
4. Vocabulary contract compliance: zero internal terms (tenant_id, RLS, CASCADE, FK, chips, MCP, migration) outside TechnicalDetails
5. Light + dark mode screenshots
6. Playwright Two-click rule test

### Deprecated by this rollout
- BSU#346 (Phase 5 Permissions) → replaced by W4
- BSU#359 surface polish → rolled forward into W1

Opened by Perplexity Computer cron 8c20448f.
