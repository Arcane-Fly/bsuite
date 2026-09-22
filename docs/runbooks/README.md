# Operator / Platform Runbooks

Durable operational runbooks for the platform owner (Braden) — the recurring, non-agent-facing ops that previously lived only as tribal knowledge scattered across `CLAUDE.md` files and cross-session agent memory. These are written for a competent human operator, not an AI agent: plain prose, real verified commands, and explicit failure modes ("if you see X, it means Y").

Added 2026-07-16. Naming convention: `YYYYMMDD-descriptive-name-guide-vMAJOR.MINOR[STATUS].md`, using the `guide` document type per [`docs/20260227-contributing-standards-guide-v1.01W.md`](../20260227-contributing-standards-guide-v1.01W.md) §4 (the legal type tokens are `architecture`, `guide`, `plan`, `decision`, `changelog`, `roadmap`, `reference`, `migration` — `runbook` is not one of them, corrected 2026-07-16) and root `CLAUDE.md`'s documentation rules (W=Working, D=Draft, R=Review, A=Approved, F=Frozen).

## Contents

| File | Description |
|------|-------------|
| [`20260716-database-migration-dispatch-guide-v1.00W.md`](20260716-database-migration-dispatch-guide-v1.00W.md) | The canonical migration pipeline (merge → parent pointer → floor-gated dispatch → live-catalog verify), `MIGRATION_FLOOR`, cross-submodule timestamp collisions, the frozen-migration rule, and the stale-pointer trap that makes a "successful" dispatch a silent no-op |
| [`20260716-edge-function-deploy-guide-v1.00W.md`](20260716-edge-function-deploy-guide-v1.00W.md) | Dispatching `supabase-functions-deploy.yml`, the `verify_jwt`/`config.toml` mechanics, the informational-only local-machine-entrypoint guard, and how to verify a deploy actually landed |
| [`20260716-parent-pointer-reconcile-guide-v1.00W.md`](20260716-parent-pointer-reconcile-guide-v1.00W.md) | How submodule gitlinks work, why `git status` shows submodules as "modified" most of the time (and why that's usually benign), and the exact commands to bump a pointer cleanly |
| [`20260716-tenant-switching-branding-tiers-guide-v1.00W.md`](20260716-tenant-switching-branding-tiers-guide-v1.00W.md) | The branding precedence stack (`tenant_app_branding` → `tenant_branding` → `platform_branding` → D2C defaults), the per-app Tier 1b gap, who is authorized to switch tenants and to what, and the `tenant_switch_audit` transparency guarantee |
| [`20260813-local-migration-rehearsal-guide-v1.00W.md`](20260813-local-migration-rehearsal-guide-v1.00W.md) | How to try a database change on your own machine **before** it ships — `pnpm supabase:rehearse` builds a throwaway copy of the production schema, replays every migration onto it, and fails any change that reports success while altering nothing (the `CREATE TABLE IF NOT EXISTS` no-op). Includes `--keep` for exercising the app against the resulting schema, which the CI check cannot do |
| [`20260919-migration-symbol-gates-guide-v1.00W.md`](20260919-migration-symbol-gates-guide-v1.00W.md) | bsuite#3136 — catching "migration references a symbol no replay path creates" at AUTHORING time (`scripts/check-migration-symbol-gaps.mjs`, no database, seconds not 45 minutes), how it relates to the rehearsal's membership rule (bsuite#3147), and the live 2-finding census on the estate's `descendants_of` gap |
| [`20260716-secrets-vault-rotation-guide-v1.00W.md`](20260716-secrets-vault-rotation-guide-v1.00W.md) | Where secrets live (Supabase project secrets, GitHub Actions secrets, Vercel env vars, the operator password manager), canonical naming, general rotation procedure, and the live crm7#1130 checklist. Contains no secret values. |

## Related

- Root [`CLAUDE.md`](../../CLAUDE.md) §12 (Supabase Policy & Verification Gates) — the underlying gates these runbooks operationalize
- [`crm7/supabase/migrations/CLAUDE.md`](../archive/README.md) *(archived — was `CLAUDE.md`)* — the full, long-form migration-history ledger these runbooks summarize an operator-facing subset of
- [`20260629-vercel-production-launch-runbook-v1.00W.md`](../20260629-vercel-production-launch-runbook-v1.00W.md) — the sibling deployment/incident-response runbook for the Vercel-hosted apps themselves
