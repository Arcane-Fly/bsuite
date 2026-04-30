# Orphan Branch Triage — 2026-04-25

**Workstream:** WS-B (orphan branch discovery / classification / resolution)
**Status:** W (Working — recovery PRs open, awaiting CI)
**Author:** Claude (BSuite session 20260425)

## Scope

Discover, classify, and resolve every orphan remote branch across the seven BSuite repos:

1. `GaryOcean428/bsuite` (parent monorepo)
2. `GaryOcean428/business-suite-unified`
3. `GaryOcean428/crm7`
4. `GaryOcean428/conduit`
5. `GaryOcean428/braden`
6. `GaryOcean428/R80.3`
7. `GaryOcean428/throughput`

Excluded from triage (active work, do NOT touch):
- `business-suite-unified/fix/e2e-hang-rca` (WS-A, PR #190)
- `throughput/chore/throughput-npm-to-pnpm` (WS-C, PR #41)
- `conduit/*cacheComponents*` (WS-F — none currently open)

## Summary

- **Total candidate orphans found:** 12 branches across 6 repos
- **Fully integrated (a):** 8 — deleted
- **Partial (b):** 2 — recovered via cherry-pick + PR
- **Unique valuable (c):** 0
- **Unique abandoned/superseded (d):** 3 — archived + deleted

(Total = 13 because two repos hosted the same `feat/phase9-oidc-nonce` docs branch; counted per-repo.)

## Per-repo discovery

| Repo | Total branches before | Orphans | Branches after |
|------|----------------------|---------|----------------|
| bsuite | 3 | 1 (`feat/phase5-schema-registry`) | development, main, **dev/orphan-recover-phase5-schema-registry** (recovery) |
| business-suite-unified | 6 | 3 | development, main, fix/e2e-hang-rca (WS-A) |
| crm7 | 3 | 1 | development, main |
| conduit | 4 | 2 | development, main |
| braden | 4 | 2 | development, main |
| R80.3 | 4 | 2 | development, main, **dev/orphan-recover-phase5-consumer-r80-embed** (recovery) |
| throughput | 4 | 2 | development, main, chore/throughput-npm-to-pnpm (WS-C) |

## Classification table

| Repo | Branch | Unique commits vs `main` | Class | Action | Evidence |
|------|--------|--------------------------|-------|--------|----------|
| bsuite | feat/phase5-schema-registry | 2 | (b) partial | cherry-pick `fe9e0b3` → PR #269; delete branch | schema-registry commit fully merged via PR #265 (grep `ca88a03 feat(schema-registry): @bsuite/schema-registry@0.1.0` + content `mapd-mapper.ts` present); BUG-1 commit NOT in main (no grep, no content for `÷52`/`isAnnualFrequency`) |
| business-suite-unified | chore/phase6c-dry-lint | 0 | (a) fully integrated | delete | zero commits ahead of main |
| business-suite-unified | feat/claude-md-phase5-docs | 0 | (a) fully integrated | delete | zero commits ahead of main |
| business-suite-unified | feat/phase5-bsu-pagecomposer | 2 | (a) fully integrated via squash PR #168 | delete | grep `e0706ea feat(bsu): Phase 5 PageComposer + NavigationEditor + lockfile (#168)` + content `PageComposer` present in main |
| crm7 | fix/phase0-ci-repair | 5 | (a) fully integrated via squash PR #306 | delete | grep `d38305de fix(ci): Phase 0 CI repair — lint cleanup + RAM parse fix (#306)` + content `maxOutputTokens` (`082d40c5`) and `grok-4.20-reasoning` swap both present in main |
| conduit | docs/phase6-consumer-claude-md | 0 | (a) fully integrated | delete | zero commits ahead of main |
| conduit | feat/phase5-consumer-conduit | 12 | (a) fully integrated via squash PR #97; superseded by Wave-3 PR #108 | delete | grep `414f813 feat(conduit): Phase 5 TenantLayoutSlot + two-layer cache invalidation (#97)` + content `TenantLayoutSlot` present in main; main has moved well past via PRs #99, #108 |
| braden | feat/phase9-oidc-nonce | 1 | (d) unique-but-superseded | archive + delete | grep on "OIDC nonce" returns `e6daad5 security(braden): backport bs-oauth-expired event + add OIDC nonce support` (different commit, same intent); content (this branch's distinctive JSDoc text) not in main; canonical impl moved into `@bsuite/auth` package |
| braden | fix/dom-layout-lint-heredoc-delimiter | 1 | (d) unique-but-superseded | archive + delete | grep `d2d4bc0 fix(braden): DOM Layout Lint workflow — use random delimiter instead of 'EOF' (#148)` + `a782d69` solve same problem in main; this branch's specific `openssl rand -hex 16` patch is NOT in main but the issue is fixed by an equivalent commit |
| R80.3 | feat/phase5-consumer-r80-embed | 2 | (b) partial | cherry-pick `8c10980` → PR #105; delete branch | TenantLayoutSlot commit `1d40660` fully merged via PR #97 (grep `f9ec621` + content `TenantLayoutSlot` present); BUG-4 commit `8c10980` NOT in main (no grep on `BUG-4`, content `apprentice_rate_configs`/`fetchApprenticeRateConfigs` not in main's services/) |
| R80.3 | feat/phase9-oidc-nonce | 1 | (d) unique-but-superseded | archive + delete | identical situation to braden's: `b77804d security(r80): backport bs-oauth-expired event + add OIDC nonce support (#60)` carries equivalent functional + doc coverage |
| throughput | docs/phase6-consumer-claude-md | 0 | (a) fully integrated | delete | zero commits ahead of main |
| throughput | feat/theme-centralise-v0.2 | 4 | (a) fully integrated via `09dcf2e` + superseded by `943ebf8` / `31af00b` | delete | grep `09dcf2e feat(throughput): @bsuite/theme v0.2.0 — ESLint guardrail` + content `no-hardcoded-colours` and `@bsuite/theme` both present in main; main has subsequent demote-to-warn refinement |

## Recovery PRs

| Repo | PR | URL | Commit recovered |
|------|----|-----|------------------|
| bsuite | #269 | https://github.com/GaryOcean428/bsuite/pull/269 | `fe9e0b3` BUG-1 charge-calc annual÷52 normalisation |
| R80.3 | #105 | https://github.com/GaryOcean428/R80.3/pull/105 | `8c10980` BUG-4 apprentice_rate_configs wire-up + BUG-5 superRate JSDoc |

## Archive docs

| Repo | Branch | Archive path |
|------|--------|--------------|
| braden | feat/phase9-oidc-nonce | `docs/archive/braden/2026-04-25-orphan-branch-archive/feat-phase9-oidc-nonce.md` |
| braden | fix/dom-layout-lint-heredoc-delimiter | `docs/archive/braden/2026-04-25-orphan-branch-archive/fix-dom-layout-lint-heredoc-delimiter.md` |
| R80.3 | feat/phase9-oidc-nonce | `docs/archive/R80.3/2026-04-25-orphan-branch-archive/feat-phase9-oidc-nonce.md` |

Each archive contains the full `git log -p <branch> --not main` output for forensic recovery.

## Confirmation (post-action branch list)

```
bsuite                  : dev/orphan-recover-phase5-schema-registry (PR #269), development, main
business-suite-unified  : development, main, fix/e2e-hang-rca (WS-A PR #190 — protected)
crm7                    : development, main
conduit                 : development, main
braden                  : development, main
R80.3                   : dev/orphan-recover-phase5-consumer-r80-embed (PR #105), development, main
throughput              : development, main, chore/throughput-npm-to-pnpm (WS-C PR #41 — protected)
```

Zero orphan branches remain. Only protected branches (main, development), active WS-A/C PR branches, and my own recovery branches (linked to open PRs) are present.

## Methodology — two-signal rule

For every "fully integrated (a)" classification I confirmed BOTH:
1. **grep signal** — `git log origin/main --grep "<distinctive commit message phrase>"` returns the expected squash-merge commit (often containing the original PR number).
2. **content signal** — `git log origin/main -S "<distinctive code/string from diff>"` returns at least one commit, AND/OR the file content shows the change is present.

If only ONE signal hit, the branch was downgraded to (b) partial and any unique commit was cherry-picked. This caught the bsuite parent's `feat/phase5-schema-registry` (schema-registry was integrated, BUG-1 was not) and R80.3's `feat/phase5-consumer-r80-embed` (TenantLayoutSlot was integrated, BUG-4 was not).

## Concerns / open items

None. All 12 candidate branches were classified confidently; no branches required "needs human decision" escalation. The two bug-fix recoveries (BUG-1 and BUG-4) are genuinely valuable functional fixes that would have been lost if the branches were deleted blind.

The only follow-up needed: a human reviewer should merge PRs #269 and #105 once their CI runs green.
