# Closeout plan — bsuite-3205

## Goal and boundary

Close **bsuite#3205** and linked **crm7#2602** only after the released shared-package path, CRM7 consumer, live schema, orphan disposition, and full deployed workflow round trip are evidenced. This is a reconciliation/verification plan, not a fresh implementation plan.

The executor must use an isolated worktree from current `origin/development`. Do not reset, clean, stage, merge, publish, migrate, or otherwise reuse the dirty parent checkout or detached dirty CRM7 checkout observed on 2026-09-20. The parent owns commits, merges, releases, migrations, production-data decisions, issue/ledger updates, and final DoD.

## Verified current state (2026-09-20)

- The ledger row remains `pending`; linked acceptance requires live create → edit → reload → publish → activate and orphan-row disposition.
- Shared fix **PR bsuite#3255** merged as `b6f0931ee`: `createDraftVersion` now writes `{}` and duplicate failure performs compensating cleanup. The commit is in both `origin/development` and `origin/main`. See `packages/workflow-canvas/src/service.ts:313-351,448-559`.
- Regression coverage exists at `packages/workflow-canvas/src/__tests__/createDraftVersion.test.ts:90-140` and `packages/workflow-canvas/src/__tests__/duplicateDefinition.test.ts:335-395`.
- `@bsuite/workflow-canvas@0.3.0` is published; the publish workflow succeeded after production PR **bsuite#3236**.
- Current source enumeration finds **one manifest consumer**, CRM7: `crm7/package.json:75`; its lockfile resolves `0.3.0` at `crm7/pnpm-lock.yaml:1172,7593`.
- Consumer delivery is not closed: **crm7#2674** is OPEN and CONFLICTING. Its build/test and E2E checks passed, but Lighthouse provisioning failed/skipped. Do not infer release from the local manifest/lockfile.
- CRM7's local service already applies the same non-null and cleanup contract (`crm7/src/lib/workflows/workflowDefinitionService.ts:417-449,536-599`), and the zero-version UI exposes an honest recovery action (`crm7/src/pages/workflows/[id].tsx:504-547,585-618`).
- Latest recorded production evidence says two orphan definitions remained (`dc760bbf-d19e-4dab-8ea7-1945de35d0d9`, `37fd709f-0d8a-4fc6-8d36-03b1ae247e58`). That is an old claim requiring a fresh read-only query. Any delete/backfill is irreversible production work and remains parent-owned.

## Safe execution plan

### 1. Reconcile the exact artifacts before changing anything

**Skills/tools:** `operator-intent-lock`, `test-systematic-debugging`, GitHub CLI; no worker fan-out.

1. In isolated parent and CRM7 worktrees, fetch only; record `HEAD`, `origin/development`, `origin/main`, branch, and dirty status.
2. Re-read bsuite#3205, crm7#2602, bsuite#3255, bsuite#3236, and crm7#2674.
3. Confirm the published tarball/version and CRM7's manifest + lockfile resolution; compare the installed/published `dist/service.js` behaviour with `packages/workflow-canvas/src/service.ts` rather than trusting version labels.
4. Re-enumerate consumers by manifest and source-import axes. Current denominator is **1 manifest consumer**; a changed denominator invalidates this plan's consumer scope.

Commands:

```bash
git status --short --branch
git rev-parse HEAD origin/development origin/main
gh pr view 3255 --repo GaryOcean428/bsuite --json state,mergeCommit,mergedAt,statusCheckRollup
gh pr view 3236 --repo GaryOcean428/bsuite --json state,mergeCommit,mergedAt
gh pr view 2674 --repo GaryOcean428/crm7 --json state,mergeable,headRefOid,statusCheckRollup
npm view @bsuite/workflow-canvas version dist-tags --json
# Use repository search tooling to enumerate package.json references and source imports.
```

### 2. Close only any residual code/test gap

**Skills/tools:** `test-driven-development`, `bsuite-react-testing`, `check-code-quality`; Context7 + `research-best-practice` only if an actual library/runtime edit becomes necessary.

1. Do not reimplement merged `b6f0931ee`. Port or amend code only if current exact-source/published-artifact comparison proves drift.
2. Preserve both persistence implementations until a separate approved consolidation exists: shared package and CRM7 local service.
3. Ensure tests bite in both directions:
   - omitted, explicit `null`, `{}`, and meaningful `ai_context` payloads;
   - initial create and template duplicate;
   - version insert failure with successful cleanup;
   - cleanup failure surfaces the orphan ID;
   - bounded concurrent version/duplicate behaviour;
   - read-only and other-tenant denial without false success.
4. Run the package and CRM7 targeted suites, typechecks, and builds. A mock-only pass does not satisfy the real-schema criterion.

Commands:

```bash
pnpm --filter @bsuite/workflow-canvas test
pnpm --filter @bsuite/workflow-canvas typecheck
pnpm --filter @bsuite/workflow-canvas build
pnpm --dir crm7 test -- src/lib/workflows/workflowDefinitionService.test.ts src/pages/workflows/'[id].test.tsx'
pnpm --dir crm7 typecheck
pnpm --dir crm7 typecheck:tests
pnpm --dir crm7 build
```

### 3. Reconcile the live schema and orphan rows without mutation

**Skills/tools:** `bsuite-supabase-migrations`, `bsuite-production-debugging`, Supabase MCP; read-only first.

1. Query the live catalog for `workflow_definition_versions.ai_context` nullability/default and relevant constraints/RLS; migration files alone are not evidence.
2. Query all zero-version definitions, not only the two historical IDs, with tenant, creator, timestamps, and related references. Record the query predicate and count.
3. For each orphan, classify `backfill`, `delete`, or `retain` with provenance and collision/retry impact. Do not mutate yet.
4. Return the proposed disposition to the parent. If approved, the parent owns a rehearsed, auditable migration/repair and rollback receipt. Never auto-delete authored work.

Acceptance for this stage: current schema contract is evidenced; every orphan has an explicit disposition; any unapproved production mutation is a precise blocker, not silently waived.

### 4. Deliver the CRM7 consumer through the parent-owned release lane

**Skills/tools:** `bsuite-pnpm-monorepo`, `git-github-pr-workflow`, `ops-ship-visual-promote`; parent-owned.

1. Rebase/recreate the minimal CRM7 package-pin change from current `origin/development`; do not resolve crm7#2674 by overwriting unrelated development work.
2. Regenerate the lockfile only in the documented outside-tree lockgen directory, preserving `pnpm-workspace.yaml`, patches, existing lockfile, and override count.
3. Require clean checks, signed commits, merge to development, and a development deployment whose SHA contains the consumer change. The parent performs merge/promotion; this planning lane does not.

### 5. Prove D8 and issue acceptance on the exact deployed SHA

**Skills/tools:** `test-playwright`, `auth-e2e-sso-testing`, `bsuite-ship-visual-promote`, `bsuite-false-complete-gates`.

Declare `ui_touched: true` because persistence behaviour and zero-version recovery are user-visible. As an authorised tenant author on `d.crm.crm7.app`:

1. New workflow → confirm one definition and one draft with non-null `{}` context.
2. Edit canvas → wait for saved state → reload → confirm graph and context persist.
3. Publish → create a new draft from the published-lock state → edit/reload again.
4. Activate → trigger one safe test process → verify durable run/effect IDs and in-context history.
5. Duplicate a template with absent and meaningful context; reload both results.
6. Force/refuse a draft insert in a non-production test tenant; verify no orphan and no “All changes saved” false success; retry yields exactly one usable workflow.
7. Verify tenant author positive path plus read-only and other-tenant negative paths.
8. Check both themes and responsive widths relevant to the workflow page; capture screenshot, console, network, deployed SHA, row/version/run IDs, and action count.

Round-trip question: **Does finishing require leaving the page?** Expected answer: **no** for create/edit/save/recover/publish/activate. If navigation occurs, draft state and selection must return intact and already applied.

### 6. Parent-owned closeout

**Skills/tools:** `git-github-issue-closeout`, `test-verify-before-completion`, `agent-definition-of-done`, `bsuite-false-complete-gates`.

The parent reconciles bsuite#3205 and crm7#2602, the queue/ledger, existing capability/remediation docs, development and production SHAs, package/consumer versions, orphan-disposition receipt, and D1–D8 evidence. A merged PR, published npm version, green source test, or issue auto-close is insufficient alone.

## Final acceptance criteria

- Published package and deployed CRM7 resolve the corrected shared implementation.
- Blank create, duplicate, new version, human-only and Jodie-assisted paths persist/reload non-null context.
- Failure, retry, concurrency, cleanup-failure, read-only, and cross-tenant cases have fresh evidence.
- No definition is newly orphaned; every pre-existing orphan has an approved, executed disposition receipt or is named as the sole precise blocker.
- Exact deployed-SHA journey proves create → edit → reload → publish → create-next-draft → activate → durable safe effect.
- `ui_touched: true`; sibling denominator and two-axis enumeration are recorded.
- Parent-run `agent-definition-of-done` returns APPROVE; otherwise status remains SEND_BACK/BLOCKED.

## Known blocker requiring parent authority

Disposition of any still-live orphan rows is a production-data decision. This child does not author or execute that mutation. If the fresh query still finds them and no approved disposition exists, report `STATUS: BLOCKED` for closure while preserving the already-merged code evidence.