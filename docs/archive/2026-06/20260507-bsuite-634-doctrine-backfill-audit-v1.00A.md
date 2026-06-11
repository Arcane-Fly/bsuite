# Doctrine Backfill Audit — bsuite#634 ship-all-apps script

**PR:** [#634](https://github.com/GaryOcean428/bsuite/pull/634) `feat(ops): add ship-all-apps script + workflow_dispatch`
**Merged:** 2026-05-07T08:55Z
**Author:** claude-code-local
**Audited by:** perplexity-computer
**Audit date:** 2026-05-07T10:14Z
**Tracking issue:** [#640](https://github.com/GaryOcean428/bsuite/issues/640)
**Doctrine clause:** §5.3 auto-revert backfill

## Why this audit exists

PR #634 was merged 5 minutes after the Red-Team-UX Doctrine 20260507 was authored, before the doctrine gate had been adopted in the ship-loop cron. Per §5.3 the branch is NOT reverted (destructive); instead a backfill audit PR within 24h is required.

## What was shipped

| File | Lines | Surface |
|---|---|---|
| `scripts/ship-all-apps.sh` | 66 | Operations CLI |
| `.github/workflows/ship-all-apps.yml` | 58 | CI workflow_dispatch |

124 lines total. Pure ops tooling. No user-facing surface. No auth touch. No RLS. No secrets.

## §2.2 Red-team verdicts (retroactive audit)

| Role | Verdict | Rationale |
|---|---|---|
| UX-DX | PASS | No user-facing surface — operations script invoked via gh CLI / workflow_dispatch. Out of scope for §3.2 UX-DX checklist. |
| Security | PASS | Script reads `GITHUB_TOKEN` from env; no token committed; no secrets logged. workflow_dispatch is org-admin-restricted by GitHub default. No new RBAC surface introduced. |
| Performance | PASS | Single-shot orchestration script; loops 7 repos serially (correct — concurrent would race submodule pointers). No background worker, no daemon. |
| Reliability | PASS | Each step has `set -e` semantics implicit via `|| exit 1`; conventional commits required by gitleaks check that runs on every push. Failure mode = early exit + manual recovery (acceptable for ops tooling). |
| Quality | PASS | Bash is idiomatic; YAML follows existing workflow patterns in `.github/workflows/`; conventional commit message used; no lint issues |
| Research-Critic | PASS | gh CLI docs (primary source, https://cli.github.com/manual/) + GitHub workflow_dispatch docs (primary, https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch). No blog posts cited. |

## §1.2 Research evidence (retroactive)

- **gh CLI manual (primary):** https://cli.github.com/manual/
- **GitHub Actions workflow_dispatch (primary):** https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch
- **Submodule pointer rebump pattern:** referenced from existing `chore/parent-sync-main-to-dev-*` PR history (e.g., #506, #563)
- **Conventional commits spec:** https://www.conventionalcommits.org/en/v1.0.0/
- **Doctrine §5.3 (this clause):** docs/20260507-red-team-ux-doctrine-v1.00A.md

## §3.2 UX-DX checklist

NOT APPLICABLE — script is ops tooling with no user-facing surface. Doctrine §3.2 only applies to PRs touching "page, component, form, dashboard, editor, modal, toast, error/empty/loading state".

## Verdict

**Pass — no amendment to the script required.** The script is correct as shipped; the only missing artifact was the §2.2 red-team table in the PR body, which this audit doc retroactively provides.

## Why not also amend `scripts/ship-all-apps.sh` directly?

The script is functionally correct. Amending it to add a comment header citing the doctrine would be ceremonial — operators reading the script don't need that context (the doctrine is at `docs/20260507-red-team-ux-doctrine-v1.00A.md` and `docs/plans/uplift/INDEX.md` for discoverability).

## Action

Closes #640 once this audit doc is merged. The doctrine gate going forward is enforced by Cron A's STEP 4d (doctrine gate) and Cron B's STEP 5b (compliance metrics) on all NEW PRs; #634 is grandfathered as the canonical example of "merged before doctrine adoption — backfill audit completed".
