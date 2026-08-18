# Edge Function Deploy — Operator Runbook

**Status:** W (Working)
**Audience:** Platform operator (Braden), not an agent
**Workflow file:** [`.github/workflows/supabase-functions-deploy.yml`](../../.github/workflows/supabase-functions-deploy.yml)
**Related guide:** [Database Migration Dispatch](20260716-database-migration-dispatch-guide-v1.00W.md) — same submodule-pointer prerequisite and the same stale-pointer risk applies here

## Why this exists

Edge functions live under `<submodule>/supabase/functions/<name>/` (or `supabase/functions/` at the parent root). Deployment to the shared Supabase project (`tuybltdrdefjblnplpqo`) is handled by a separate workflow from the migration one — deploying a function does not apply a migration, and applying a migration does not redeploy a function, even if both live in the same PR.

## Dispatching a deploy

```bash
gh workflow run supabase-functions-deploy.yml --ref main -f submodule=<name>
```

- `submodule`: `all`, `root`, `crm7`, `R80.4`, `braden`, `business-suite-unified`, `conduit`, `throughput`.
- `force_redeploy`: the input exists in the workflow's `workflow_dispatch` declaration but **is never referenced by any job or step** (verified: `grep -n force_redeploy .github/workflows/supabase-functions-deploy.yml` returns only the input declaration). `true` and `false` behave identically. In practice this doesn't matter for the common case, because any manual dispatch already redeploys **every** function in the resolved scope unconditionally — there is no source-diffing on manual dispatch to begin with. Only a push-triggered run scopes to submodules where `supabase/functions/**` changed in the diff between the last two parent-repo commits. **This is tracked as a workflow bug** (dead input, misleading to anyone reading the dispatch form); don't rely on `force_redeploy` doing anything until the workflow is fixed to honor it or the input is removed.

As with the migration workflow, the checkout step uses `submodules: recursive`, so it clones each submodule at the SHA the parent's gitlink currently points to. **If the parent pointer for a submodule is stale, a manual dispatch will happily redeploy the OLD code** — it deploys everything present in the checked-out tree, not everything present upstream. Bump the pointer first (see the [Parent Pointer Reconcile guide](20260716-parent-pointer-reconcile-guide-v1.00W.md)).

## What the workflow actually does

1. Links the Supabase project (`supabase link --project-ref <SUPABASE_PROJECT_ID>`) inside the resolved working directory for the scope.
2. Iterates every directory under `supabase/functions/`, skipping any directory prefixed with `_` (shared/utility modules, not deployable functions on their own).
3. For each function, checks `supabase/config.toml` for a `[functions.<name>]` section with `verify_jwt = false` and passes `--no-verify-jwt` to the deploy command when present — otherwise the function deploys with JWT verification on by default.
4. Runs `supabase functions deploy <name>` per function and tallies deployed/skipped/failed. **The job fails (`exit 1`) if any function in the scope fails to deploy** — this part is a hard gate, not informational.

## The "local-machine entrypoint" guard — informational only

After deployment, a separate job queries the Supabase Management API (`GET /v1/projects/<ref>/functions`) and checks every function's `entrypoint_path` against patterns like `file:///home/*/Desktop/`, `file:///home/*/Dev/`, `file:///Users/*/Desktop/`, `file:///Users/*/Dev/` — these indicate the function was deployed from someone's local machine rather than from CI (a real incident: 44 functions were found in this state and had to be redeployed from CI, per the workflow's own header comment).

**Verified from the workflow source: this guard currently only warns — it does not fail the job.** If it finds functions with local-machine entrypoints, it prints `::warning::` and the affected function slugs, then exits 0. If you need every function to have a clean CI entrypoint, you have to check this job's log yourself; a green checkmark does not mean zero local-machine entrypoints remain. The workflow's own remediation note: the Supabase CLI's "No change found" shortcut skips metadata updates for byte-identical source, so a function whose code hasn't changed since it was deployed locally won't get a new entrypoint just by re-running deploy — you need to touch a line in its `index.ts` (or use the Supabase MCP `deploy_edge_function` tool, which always writes fresh metadata) to clear it.

## Verifying a deploy actually happened

Don't rely on the workflow's green checkmark alone for a specific function:

1. The final `list-deployed-functions` job runs `supabase functions list` and prints every deployed function — check the function you care about appears and, if you have a version/updated-at column available in the CLI output or the Management API response, that it's recent.
2. Via Supabase MCP: `list_edge_functions` (all functions in the project) or `get_edge_function` (one function's current source/version) — this hits the live project directly, same as the migration guide's "verify the live catalog, not the workflow log" principle.
3. If the function is one that was recently redeployed to fix a bug, exercise the actual code path (call it, or drive the UI flow that calls it) rather than trusting deploy success alone — deploy success only proves the bundle was accepted, not that the fix behaves correctly at runtime.

## Failure modes

- **Workflow green, but the bug you fixed is still live** → check the parent pointer for that submodule first (stale pointer = old code redeployed, not new code). If the pointer is current, check the function's own build/entrypoint and confirm the deploy step actually ran for that function (see "Verifying a deploy actually happened" above) — `force_redeploy` has no effect either way, so it is not a useful diagnostic to check.
- **`supabase link` step fails** → `SUPABASE_ACCESS_TOKEN` secret or `SUPABASE_PROJECT_ID` variable is missing/invalid at the GitHub Actions level; this is distinct from a per-function deploy failure.
- **A specific function's deploy step fails** → the job fails outright (this is a hard gate); check that function's own build/entrypoint for syntax errors — the log shows which function and why.
- **You suspect a function is still running from someone's laptop** → check the `guard-no-local-entrypoints` job log explicitly; it will not fail CI for you.

## Related

- [Database Migration Dispatch guide](20260716-database-migration-dispatch-guide-v1.00W.md) — the sibling pipeline for `supabase/migrations/`
- [Parent Pointer Reconcile guide](20260716-parent-pointer-reconcile-guide-v1.00W.md) — how to bump the pointer before dispatching either workflow
