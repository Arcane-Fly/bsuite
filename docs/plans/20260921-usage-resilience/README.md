# BSuite continuation across usage outages

This is the current routing/runbook supplement, not a replacement task queue or a claim the estate is complete. [Refined prompt](refined.md), [new Codex kickoff](kickoff.md), [evidence](evidence.md).

## Progress entry point

Open `/home/braden/.agents/state/bsuite-progress/README.md`. It lists all outstanding ledger rows, linked issues and recorded owners, plus discrepancies and source health. `current.json` contains machine-readable rows and GitHub receipts. It is a timestamped snapshot, not a constantly updating dashboard.

Refresh from the checkout containing this script:

```bash
python3 scripts/estate-progress-snapshot.py --output /home/braden/.agents/state/bsuite-progress
```

The command makes no model calls. Its GitHub cache lasts 15 minutes; `--refresh` requests a fresh remote read. Missing issues, access denial and truncated query misses remain UNKNOWN. GitHub closure is not release/D8 evidence. Actual queue mutation remains the sole executor's responsibility under the existing ledger lock. Concurrent report writers are refused using a local lock. Each observation is preserved in content-addressed history; errors or possible query truncation return INCOMPLETE and nonzero. Source timestamps are separate from row/owner changes. The report does not inspect ownership leases or grant ownership.

The source queue is `/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation/hermes-queue.json`. Historical rows remain for audit; report pending/active/completed separately rather than expecting total rows to decrease.

## Routing and recovery

| Work | First route | Escalation trigger |
|---|---|---|
| Counts, caches, receipts, changed-file inventories | Deterministic scripts | Data inconsistency requires investigation |
| Bounded extraction, docs checks, proposal critique | Verified small/efficient model, including Hermes Ollama Cloud | Failed output validation or insufficient task capability |
| Isolated code implementation | Qualified standard tier; explicit model and one worktree | Two failed repairs of the same cause, then diagnostic rebrief |
| Security, architecture, release acceptance | Independent suitable stronger reviewer | Specific unresolved evidence, supervising frontier agent decides |
| Outer supervision | Current Codex owner | Preserve frontier allowance for scope, judgment and corrections |

The 21 September `glm-5.3-flash` request succeeded through Hermes/Ollama Cloud: one API call, 1,661 tokens, 15.66 seconds. This establishes availability for a bounded text review only. Kimi K3 and GLM 5.3 appeared in the live catalogue but were not benchmarked here. Zero estimated dollars with `cost_status: unknown` is not proof of free or unlimited usage.

Workers receive criteria IDs, exact paths/SHAs, relevant skills, permitted tools, excluded writes, a coherent milestone and checkpoint. At most two implementation lanes, one writer per resource, shared DB/release serialized. No default fallbacks to Claude, Codex frontier or a metered provider. Keep credential values out of prompts, logs and argv. Use existing approved skill/CLI routes; the isolated no-tool review is not a template for disabling application gates.

Checkpoint before known budget exhaustion and at meaningful acceptance boundaries. Preserve useful partial work and failed probes, owner/session, actual route, worktree/dirty state, SHAs, receipts, remaining criteria and next executable action. Resume the existing session where supported. Extend productive bounded workers when evidence justifies it; monitor without arbitrary caps only with a live independent watchdog and enforceable spending limits.

On quota exhaustion, distinguish account quota from context exhaustion, capability failure and auth failure. Honor Retry-After/reset when known; no repeated identical requests. Move to an authorized available qualified route after reconciling old worker writes. Keep release review pending if no qualified reviewer is available, and continue independent safe work. No resetting the prior incremental Gemini/Qwen allowance: aggregate current consumption must be reconciled before paid dispatch.

Oversight evaluates changed checkpoints, failures, lease conflicts and proposed release acceptance. Use cached no-change checks before model calls. A 20-minute timer is not permission to re-audit the entire estate every 20 minutes. Review frequency and worker allowance improve from verified outcomes and rework, not response count. No recursively spawned coaches.

## Publisher identity

Owner `Arcane-Fly`, repository `bsuite`; existing filenames are `publish-<package>.yml` for charge-calc, nav-core, theme, auth, ui, schema-registry, dry-lint, page-builder, schema-builder, data-export, dates, jodie, data-grid and workflow-canvas. Operator confirms npm settings updated. Workflow documentation is corrected in this change.

All 14 files exist on main with OIDC permission and Node 24.14.0. Actions API registration currently returns no matching publish workflows, and lookup of `publish-theme.yml` returns 404 despite Actions being enabled. Resolve registration through normal reviewed changes and provider diagnostics before relying on dispatch. Do not publish arbitrary versions as a connectivity probe. Stable releases retain main-only validation; prereleases retain the existing next-tag policy.

## Handoff and hooks

The application handoff cannot bind an unknown future task ID. The new task must claim ownership after a fresh census, bind its exact session, and obtain a real recall/review receipt before application dispatch. This is an executable bootstrap step in [kickoff.md](kickoff.md), not another operator approval.

Current external supervisor is healthy but pinned to ended Claude session `b6ddc034-29d4-4a71-9c93-f4cea504fb80`. Its five Codex context hooks provide recall; they do not constitute the Claude mutating-tool gate. Preserve trust boundaries and use supported runtime adapters. Never silently copy Claude tool matchers or token claims to Codex.

At launch verify the supervisor, conscience, working-memory, learning, task-context and context-retrieval session maps; the canonical queue owner; active tasks; and the independent accountability recipient. Repoint only after new-owner acceptance and no conflicting live writer. Use a backed-up atomic edit under the established owner protocol, then verify actual delivery. Fresh timers alone do not prove supervision. If native delivery is absent, use explicit pre-action/checkpoint review and document the limitation while fixing it; do not label it automatic.

Claude remains available as a worker/reviewer only after fresh quota/lifecycle checks; its return does not silently transfer ownership. Keep the existing independent `Review project task progress` task as accountability; do not create another supervising schedule.
