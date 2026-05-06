# Copilot Overnight Delegation — Master Tracking

- **Status:** Working (W)
- **Version:** v1.00W
- **Date:** 2026-05-04 (filed end-of-day, review next morning)
- **Owner:** Buffy (parent agent) — resumes oversight on session resume
- **Scope:** 11 active `copilot-swe-agent` assignments spanning parent bsuite + 4 consumer repos

---

## 1. Purpose

This doc is the single source of truth for what Copilot is working on overnight. On session resume:

1. Read this doc first — it lists every delegated task with issue/PR numbers, repo, branch, and acceptance gates.
2. For each row in §3, run the verification loop documented in `20260504-schema-builder-phase-3-plan-v1.00W.md` §6.
3. Merge the CLEAN PRs via `gh pr merge --admin`; comment on the RED PRs with specific fix asks.
4. Close any Copilot PRs that went seriously off-rails (rare — all 11 bodies have tight allowed-paths whitelists).

---

## 2. Active Task Inventory

| # | Repo | Issue | Draft PR | Workstream | Risk |
|---|------|-------|----------|------------|------|
| 1 | bsuite | [#343](https://github.com/GaryOcean428/bsuite/issues/343) | [#346](https://github.com/GaryOcean428/bsuite/pull/346) | Phase 3A — FieldRow keyboard reorder + `sort_order` col | Low |
| 2 | bsuite | [#344](https://github.com/GaryOcean428/bsuite/issues/344) | [#345](https://github.com/GaryOcean428/bsuite/pull/345) | Phase 3B — ALTER TABLE RENAME COLUMN path | **High — SECURITY DEFINER migration; mandatory human signoff before merge (per Phase 3 plan §6)** |
| 3 | crm7 | [#338](https://github.com/GaryOcean428/crm7/issues/338) | [#339](https://github.com/GaryOcean428/crm7/pull/339) | Phase 3C — seeded E2E tenant | Med (RLS policy addendum) |
| 4 | business-suite-unified | [#234](https://github.com/GaryOcean428/business-suite-unified/issues/234) | [#236](https://github.com/GaryOcean428/business-suite-unified/pull/236) | Theme adopt `usePlatformLogo()` | Low |
| 5 | business-suite-unified | [#235](https://github.com/GaryOcean428/business-suite-unified/issues/235) | [#237](https://github.com/GaryOcean428/business-suite-unified/pull/237) | react-hooks v7 remediation + `--max-warnings 0` | Low |
| 6 | crm7 | [#340](https://github.com/GaryOcean428/crm7/issues/340) | [#343](https://github.com/GaryOcean428/crm7/pull/343) | Theme adopt `usePlatformLogo()` | Low |
| 7 | crm7 | [#341](https://github.com/GaryOcean428/crm7/issues/341) | [#344](https://github.com/GaryOcean428/crm7/pull/344) | Unify `canEditPlatformSchema` / `canEditTenantViews` | Low-Med |
| 8 | crm7 | [#342](https://github.com/GaryOcean428/crm7/issues/342) | [#345](https://github.com/GaryOcean428/crm7/pull/345) | Wire `DynamicFieldRenderer` into funding forms | Low-Med |
| 9 | conduit | [#148](https://github.com/GaryOcean428/conduit/issues/148) | [#149](https://github.com/GaryOcean428/conduit/pull/149) | Theme adopt platform-logo helpers (RSC-safe) | Low-Med (RSC boundary) |
| 10 | R80.3 | [#128](https://github.com/GaryOcean428/R80.3/issues/128) | [#130](https://github.com/GaryOcean428/R80.3/pull/130) | Theme adopt `usePlatformLogo()` | Low |
| 11 | R80.3 | [#129](https://github.com/GaryOcean428/R80.3/issues/129) | [#131](https://github.com/GaryOcean428/R80.3/pull/131) | Training fees docs clarifications | **None — docs-only** |

**Parallelism note:** CRM7 has 4 concurrent Copilot PRs (#339, #343, #344, #345). They are guaranteed file-disjoint by whitelist — #339 touches `crm7/supabase/` + `crm7/tests/e2e/`; #343 touches components/pages rendering logos; #344 creates a new `permissions/` module + replaces `manage_system` call sites; #345 touches `pages/funding/` + `schemas/funding*`. First-merged wins; any subsequent one that lands on a conflict will be rebased by Buffy on resume.

---

## 3. Morning Verification Loop (per PR)

Run this for each of the 11 PRs in order (CLEAN → merge, RED → comment):

```bash
# 1. State snapshot
for pr_spec in 'GaryOcean428/bsuite:346' 'GaryOcean428/bsuite:345' \
  'GaryOcean428/crm7:339' 'GaryOcean428/business-suite-unified:236' \
  'GaryOcean428/business-suite-unified:237' 'GaryOcean428/crm7:343' \
  'GaryOcean428/crm7:344' 'GaryOcean428/crm7:345' \
  'GaryOcean428/conduit:149' 'GaryOcean428/R80.3:130' 'GaryOcean428/R80.3:131'; do
  repo=${pr_spec%:*}; num=${pr_spec#*:}
  printf '%-45s ' "$pr_spec"
  gh pr view $num --repo $repo --json state,isDraft,mergeStateStatus,statusCheckRollup \
    --jq '"draft=\(.isDraft) state=\(.mergeStateStatus) checks=\([.statusCheckRollup[].conclusion] | group_by(.) | map({(.[0]): length}) | add)"'
done

# 2. For each Ready-for-review PR:
#    - gh pr checkout <num> --repo <repo>
#    - pnpm --filter <app> typecheck && pnpm --filter <app> test && pnpm --filter <app> build
#    - code-reviewer-multi-prompt (mandatory security-focus on PR #2 bsuite#345)
#    - gh pr merge <num> --repo <repo> --squash --delete-branch --admin

# 3. Ship-all-apps loop after merges:
#    - bump submodule pointers on parent bsuite feature branch
#    - open parent PR → merge → sync local
```

### Merge policy per task

| # | Auto-merge on CI-green + local-clean? | Why |
|---|---|---|
| 1, 3, 4, 6, 9, 10 | ✅ Yes | Low-risk refactors, no DDL, no SECURITY DEFINER |
| 5 | ✅ Yes | ESLint-only, no runtime behavior changes |
| 7, 8 | ✅ Yes (after code review confirms no DB/RLS touching) | Permission helpers + form wiring — no DDL |
| 11 | ✅ Yes (docs-only) | No code, no risk |
| **2** | ⛔ **Mandatory human signoff** | SECURITY DEFINER `rename_physical_column` + `schema_mutations_audit` table — per Phase 3 plan §6, explicit signoff required beyond CI-green |

---

## 4. NOT DELEGATED — deliberate carve-outs

These items from `docs/OUTSTANDING.md` + `docs/20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md` were intentionally NOT filed for Copilot. Parent agent (Buffy) or human operator must handle.

### Operator / dashboard actions (cannot be delegated to code agent)

- **P0-6 Part C** — Supabase dashboard preview-URL allowlist (5-min click-through). Operator (Braden).
- **P1-84** — Wave 1-C migration apply to live Supabase `tuybltdrdefjblnplpqo`. Operator.
- **TGA operator GUCs** — Add `app.tga_sync_url` + `app.tga_sync_secret` custom Postgres GUCs, then `TGA_SYNC_ENABLED=true`. Operator.
- **Azure `xms_edov` runtime verification** — Requires real M365 sign-in. Operator.
- **Preview OAuth runtime smokes** (CRM7 / Conduit / R80.3 / Throughput / Braden) — Requires real browser + real credentials. Operator.
- **M.6 reserved-prefix RLS policy** on `tenant-logos` bucket. Supabase dashboard click-through. Operator.

### Strategic / cross-cutting architecture (parent-agent judgment required)

- **Branch reconciliation** — crm7 + parent bsuite `development → main` blocked by deep fork history. Destructive, multi-step, needs human judgment. Buffy.
- **Full-7 Plan Phases 0-8 gates** — cross-cutting, multi-app, order-dependent. Buffy.
- **`@bsuite/page-builder` local source extraction** — local source absent; must be reconstructed from consumer duplicates. Too architectural for Copilot. Buffy.
- **`@bsuite/schema-registry` source restoration** — local source absent; reconciliation requires design decision. Buffy.
- **Production promotes** — no `development → main/master` merge without explicit user approval.
- **Master roadmap v5.03W rollup** (P0-15) — doc authoring that touches living reference docs. Buffy.

### Broken / blocked items (preconditions unmet)

- **braden react-hooks v7 warnings** (ledger says ~21) — `pnpm lint` currently broken in braden; needs human investigation before Copilot can measure or remediate.
- **throughput react-hooks v7 warnings** (ledger says ~30) — same blocker. `pnpm lint` broken; needs human investigation first.
- **CRM7 Xero app activation smoke** — secrets present per handoff v4, but Xero developer-portal registration + token-exchange smoke are operator-only verification steps.

### Ambiguous or requires human design decision

- **CRM7 GTO WS-3/4/5/6/7/8/9** — invoicing, timesheets, reports, AVETMISS, standards, security, portals. Each workstream is large enough (multi-week) that it needs a design/planning pass before Copilot decomposition. Candidate for future Phase 4 planning session.
- **BSU Platform Kit Admin subpanels** (6 of them: auth config, users, logs, database, secrets, storage) — each needs a spec pass before Copilot delegation. Candidate for future fan-out.
- **BSU Supabase CRM domain migrations** (inspections, workflow_triggers, report_configs) — RLS + functions; needs human threat-model review before SQL-generating agent touches it.
- **DRY cross-app write-ownership fixes** (7 items in `20260423-cross-app-write-audit-v1.00W.md`) — each requires a design decision about where to move the write surface. Buffy to decompose on a future session.
- **Braden visual editing + version history** — product direction call. Buffy + user.
- **Throughput production readiness** — broad accessibility/testing/logging scope; needs prioritization pass.

---

## 5. Escalation & stall handling

Per Phase 3 plan §5 Rollout policy:

- **No draft PR within 30 min of assignment:** add a comment: "Hey @copilot, are you still working on this? The issue body has the acceptance criteria and allowed-paths whitelist."
- **Stalled in-progress >2h with no commit activity:** re-ping with "@copilot please push your current WIP so we can see the state."
- **CI red twice with same failure and Copilot can't fix:** Buffy takes it in-house — pull the branch, finish the work, push a commit onto Copilot's branch, merge as Buffy.
- **Scope creep (Copilot modifies out-of-whitelist files):** Buffy closes the PR with a comment linking to the whitelist and files a fresh issue for the next attempt.

---

## 6. Morning checklist (fast path)

On session resume, paste this into the first basher call:

```bash
# One-shot state snapshot of all 11 Copilot PRs
for spec in 'GaryOcean428/bsuite:346' 'GaryOcean428/bsuite:345' \
  'GaryOcean428/crm7:339' 'GaryOcean428/crm7:343' 'GaryOcean428/crm7:344' 'GaryOcean428/crm7:345' \
  'GaryOcean428/business-suite-unified:236' 'GaryOcean428/business-suite-unified:237' \
  'GaryOcean428/conduit:149' \
  'GaryOcean428/R80.3:130' 'GaryOcean428/R80.3:131'; do
  repo=${spec%:*}; num=${spec#*:}
  printf '%-50s ' "$spec"
  gh pr view $num --repo $repo --json isDraft,mergeStateStatus,state 2>&1 \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"draft={d.get('isDraft')} state={d.get('state')} merge={d.get('mergeStateStatus')}\")" 2>&1
done
```

If a PR is `isDraft=false` + `mergeStateStatus=CLEAN` → proceed to merge loop.
If still `isDraft=true` → leave Copilot to keep working, check again in 15-30 min.

---

## 7. Related docs

- `docs/20260504-schema-builder-phase-2-signoff-v1.00W.md` — Phase 2 shipped context
- `docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-plan-v1.00W.md` — archived Phase 3 plan with gate definitions
- `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` — source-of-truth roadmap (cross-references)
- `docs/OUTSTANDING.md` — living index the delegation set was derived from
- `docs/20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md` — broader outstanding-work ledger

---

## 8. Sign-off

Filed 2026-05-04. Overnight window begins. Next session resume: verify each PR per §6, execute merge loop per §3.
