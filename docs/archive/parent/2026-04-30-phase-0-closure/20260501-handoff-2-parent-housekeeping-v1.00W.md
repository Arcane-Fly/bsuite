# HANDOFF-2 — parent housekeeping

**Document**: `20260501-handoff-2-parent-housekeeping-v1.00W.md`
**Status**: W (Working)
**Owner**: Codebuff session
**Repo**: parent monorepo `/home/braden/Desktop/Dev/bsuite/`
**Default branch**: `main`
**Active branch**: `development` (4 ahead, 1 behind main; PR #322 already open)

## Goal

The parent `development` branch has:

1. `M AGENTS.md` (small 4-line change, undescribed in any commit)
2. Untracked `docs/20260501-new-session-continuation-prompt-v1.00W.md` (the doc that bootstrapped this batch)
3. Soon: this entire `docs/20260501-handoff-*-v1.00W.md` batch (lead session writes them)
4. **Possibly**: parent `CLAUDE.md` correction for throughput's package manager (depends on HANDOFF-1 result)

Get all of these onto a feature branch, open a PR into `development`, get it green. **Do not touch PR #322** — that's the existing dev→main release PR; user will merge it separately after smoke tests.

## Pre-conditions

- Working directory: `/home/braden/Desktop/Dev/bsuite/`
- Branch: `development`
- Submodules: pointers must remain at their `development` heads — DO NOT bump submodule SHAs in this PR (per § 2.6 of continuation prompt)
- HANDOFF-1 has either completed or definitively failed (so we know the throughput-CLAUDE.md correction question is resolved)

## Step-by-step actions

### Step 1 — Confirm baseline

```bash
cd /home/braden/Desktop/Dev/bsuite
git status --short
git diff --stat AGENTS.md
```

Expected output: `M AGENTS.md`, untracked `docs/20260501-*-v1.00W.md` files (continuation prompt + handoffs), and the `m business-suite-unified` / `m throughput` markers (these are submodule-dirty-worktree markers, NOT pointer drifts — leave them alone).

### Step 2 — Decide whether to amend parent CLAUDE.md

Read the current parent `CLAUDE.md` line that describes throughput:

```bash
grep -A 1 -B 1 "throughput" CLAUDE.md | grep -i "npm\|pnpm" | head -5
```

If HANDOFF-1 verified pnpm migration:

- Find the line that says throughput uses npm (e.g., "throughput | ... | **npm**¹")
- Update to "pnpm"
- Update or remove the footnote `¹ throughput currently uses package-lock.json (npm), divergent from the rest of the suite.`

If HANDOFF-1 halted or proved the migration claim false: **leave parent CLAUDE.md alone**.

### Step 3 — Create feature branch

```bash
git checkout -b chore/parent-housekeeping-20260501
```

### Step 4 — Stage the changes

```bash
# Always
git add AGENTS.md
git add docs/20260501-new-session-continuation-prompt-v1.00W.md
git add docs/20260501-handoffs-readme-v1.00W.md
git add docs/20260501-handoff-1-throughput-trivial-ship-v1.00W.md
git add docs/20260501-handoff-2-parent-housekeeping-v1.00W.md
git add docs/20260501-handoff-3a-bsu-auth-flicker-v1.00W.md
git add docs/20260501-handoff-3b-bsu-fk-embed-fix-v1.00W.md
git add docs/20260501-handoff-3c-bsu-developer-routes-deferred-v1.00W.md
git add docs/20260501-handoff-3d-drop-tenant-page-layouts-v1.00W.md

# Conditional (Step 2)
if [ "<pnpm-migration-verified>" = "yes" ]; then
  git add CLAUDE.md
fi
```

**Critical**: do NOT `git add .` or `git add -A` — that risks staging the dirty submodule worktrees, which would entangle BSU's in-progress feature branch state into this PR. Stage individual files only.

### Step 5 — Commit

```bash
git commit -m "$(cat <<'EOF'
chore(bsuite): parent housekeeping — handoff batch + AGENTS.md fix

Adds the 2026-05-01 ship-all-apps handoff batch (continuation prompt +
6 handoff docs + index) and stages the small AGENTS.md edit that was
dirty on development.

Conditional: parent CLAUDE.md throughput-package-manager correction
included if HANDOFF-1 verified the npm→pnpm migration claim.

Submodule pointers explicitly NOT bumped — submodule PRs from
HANDOFFs 3a / 3b / 3d will run their own pointer-bump cycles
post-merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-2
EOF
)"
```

### Step 6 — Push and open PR

```bash
git push -u origin chore/parent-housekeeping-20260501

gh pr create \
  --base development \
  --head chore/parent-housekeeping-20260501 \
  --title "chore(bsuite): parent housekeeping — handoff batch + AGENTS.md fix" \
  --body "$(cat <<'EOF'
## Summary

Lands the 2026-05-01 ship-all-apps handoff batch onto parent `development`:

- `docs/20260501-new-session-continuation-prompt-v1.00W.md` (already on disk, untracked → tracked)
- `docs/20260501-handoffs-readme-v1.00W.md` (queue index)
- `docs/20260501-handoff-{1,2,3a,3b,3c,3d}-*-v1.00W.md` (six handoff docs)
- `AGENTS.md` — small 4-line edit that was dirty on `development` (verify diff is intentional in review)
- (conditional) `CLAUDE.md` — throughput package-manager correction if HANDOFF-1 verified migration

## Backlog citation

Not a numbered backlog item — operational housekeeping that unblocks the next round of submodule ship PRs.

## ADR compliance

- ADR-0001 through ADR-0006: untouched
- AGENTS.md edit must be reviewed for ADR-0004 (OAuth allow-list SSoT) compliance

## Submodule pointers

**Not bumped in this PR.** BSU's `m` marker is a feature-branch worktree, not a tracked SHA change. Submodule PRs land their own pointer-bumps after merging.

## Verification

- [ ] CI green
- [ ] AGENTS.md diff reviewed (4-line edit must be intentional)
- [ ] All 7 docs render correctly on GitHub
- [ ] User visual smoke test passed

## Stop-short gate

Per continuation prompt § 3.4 — do not merge until user signals smoke test passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-2
EOF
)"
```

### Step 7 — Watch checks

```bash
PR=$(gh pr list --base development --head chore/parent-housekeeping-20260501 --json number --jq '.[0].number')
gh pr checks "$PR" --watch
```

Expected checks: `build-and-test`, `DOM Layout Invariants`, `gitleaks` (per PR #322's existing check rollup).

### Step 8 — Stop and report

```
HANDOFF-2 ready for smoke test.
PR: https://github.com/GaryOcean428/bsuite/pull/<N>
Checks: all green
Throughput-CLAUDE.md correction: included / skipped (per HANDOFF-1 result)
Bot comments: <none / list>
```

**Do not merge.** Wait for user signal.

## Stop conditions

| Condition | Action |
|---|---|
| `git status` shows unexpected files | Halt, report — do not stage anything risky |
| Submodule pointer in `git diff --submodule=log` shows actual SHA change (not dirty marker) | Halt — § 2.6 of continuation prompt |
| AGENTS.md diff is bigger than expected (~4 lines) | Halt and ask user — could be unrelated work |
| `gh pr create` fails | Retry once, then halt |
| CI red | Lead session triages via MCP build log read |

## Done definition

- [ ] PR open into `development`, checks green
- [ ] No submodule pointer changes in the PR
- [ ] All 7 docs visible on GitHub
- [ ] Reported back to lead session
- [ ] Working tree clean on `chore/parent-housekeeping-20260501`
