# HANDOFF-1 — throughput trivial ship

**Document**: `20260501-handoff-1-throughput-trivial-ship-v1.00W.md`
**Status**: W (Working)
**Owner**: Codebuff session
**Submodule**: `throughput` (`/home/braden/Desktop/Dev/bsuite/throughput/`)
**Default branch**: `main`
**Package manager**: **claimed pnpm** (verify in Step 1) — divergent doc was npm pre-2026-04-25
**Vercel project**: `throughput` (ID `prj_???`, see § 6 of continuation prompt)

## Goal

`throughput`'s `development` branch is 1 commit ahead of `main` (a `reconcile(throughput): merge main back to development` commit). Working tree has `M CLAUDE.md` claiming the repo migrated from npm → pnpm in PR #41 on 2026-04-25. Verify the claim, commit the doc update if true, then open a `development → main` PR. **Stop short of merge.**

## Pre-conditions

- Working directory: `/home/braden/Desktop/Dev/bsuite/throughput`
- Branch: `development`
- Working tree: only `CLAUDE.md` should be modified — anything else means another session has been at this submodule; halt and report
- `gh` CLI authenticated as `GaryOcean428` (already verified by lead session)
- For pnpm: `corepack enable && pnpm install` should work; for npm: `npm install`

## Step-by-step actions

### Step 1 — Verify the pnpm migration claim

The CLAUDE.md change asserts: "Migrated from npm in PR #41, merged 2026-04-25". Verify before committing the doc:

```bash
cd /home/braden/Desktop/Dev/bsuite/throughput
ls -la pnpm-lock.yaml package-lock.json 2>&1
gh pr view 41 --json mergedAt,title,state 2>/dev/null
```

**Decision tree**:

- **Both lockfiles present** → migration is in flight or stalled. **Halt** — do not commit CLAUDE.md, report finding to lead session, ask user.
- **Only `pnpm-lock.yaml` present** + PR #41 shows merged ≥ 2026-04-25 → claim is verified. Proceed to Step 2.
- **Only `package-lock.json` present** → claim is false. **Halt** — `git restore CLAUDE.md`, report to lead session, do not open the PR.
- **Neither lockfile present** → halt, report, this is broken state.

### Step 2 — Commit the doc update (only if Step 1 verified)

```bash
git add CLAUDE.md
git commit -m "docs(throughput): document npm→pnpm migration completion (PR #41)"
```

### Step 3 — Push to development

```bash
git push origin development
```

### Step 4 — Open the dev→main PR

```bash
gh pr create \
  --base main \
  --head development \
  --title "release(throughput): development → main 2026-05-01" \
  --body "$(cat <<'EOF'
## Summary

Promotes the `reconcile(throughput): merge main back to development` commit to `main`. CLAUDE.md updated to reflect the npm→pnpm migration that completed in PR #41 (2026-04-25).

## Backlog citation

None — this is a routine reconcile + doc tidy, not a backlog item from `docs/20260501-merged-execution-backlog-v1.00W.md`.

## Verification

- [x] `pnpm-lock.yaml` present, `package-lock.json` absent (verified per HANDOFF-1 Step 1)
- [x] PR #41 merged (per HANDOFF-1 Step 1)
- [ ] Vercel preview deploy renders the ideas portal correctly
- [ ] User visual smoke test passed

## Stop-short gate

Per continuation prompt § 3.4 — **do not merge** until user signals smoke test passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-1
EOF
)"
```

### Step 5 — Watch checks

```bash
PR=$(gh pr list --base main --head development --json number --jq '.[0].number')
gh pr checks "$PR" --watch
```

If any check fails, fetch the build log via Vercel CLI fallback (lead session can also use Vercel MCP):

```bash
vercel logs <preview-url-from-Vercel-bot-comment>
```

Common failures:
- **Lockfile mismatch on Vercel**: throughput uses **npm** historically per AGENTS.md; if the actual PR build expects pnpm, then verify `vercel.json` `installCommand` matches the lockfile present.
- **Node version mismatch**: throughput should be on Node 24 per AGENTS.md.

### Step 6 — Stop and report

Once all checks are green and Vercel preview renders:

1. Capture the preview URL (visible in Vercel bot comment on the PR)
2. Report back to lead session in this format:

```
HANDOFF-1 ready for smoke test.
PR: https://github.com/GaryOcean428/throughput/pull/<N>
Preview: https://throughput-<hash>-garyocean428.vercel.app
Checks: all green
Bot comments: <none / list>
```

3. **Do not merge.** Wait for user signal.

## Stop conditions (early exit)

| Condition | Action |
|---|---|
| Step 1 returns conflicting state | Halt, restore CLAUDE.md, report to lead session |
| `pnpm install` (or `npm install`) fails locally | Halt, report; do not push uninstalled state |
| `gh pr create` fails | Retry once, then halt and report |
| Vercel build fails 2+ times for the same reason | Halt, escalate to lead session for MCP-driven log analysis |
| Any change to a file other than CLAUDE.md or `pnpm-lock.yaml` | Halt — out of scope for HANDOFF-1 |

## Done definition

- [ ] PR open, checks green, preview deploy renders, awaiting user smoke test
- [ ] Reported back to lead session with PR URL + preview URL
- [ ] Working tree clean on `development`
