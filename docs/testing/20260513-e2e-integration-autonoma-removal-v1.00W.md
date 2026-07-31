# E2E Testing — status: NO active integration

**Status:** Working · **Decided:** 2026-05-13 · **Relocated from `CLAUDE.md` 2026-07-31**

The Autonoma Vercel integration was **removed on 2026-05-13** after evaluation. Reason: deployment-checks fire on every PR but require pre-authored tests in the Autonoma dashboard to pass; without tests, the check defaults to FAILURE and pollutes the PR queue. The plugin install (for local test authoring) was also blocked by an upstream Prisma server-side bug (`Null constraint violation on prisma.apiKey.create`). Autonoma was uninstalled from the Vercel integrations across all 6 apps; per-app `AUTONOMA_CLIENT_ID` + `AUTONOMA_SECRET_ID` env vars were auto-removed from Vercel by the integration uninstall.

## Local cleanup performed

- `.env.local` at the monorepo root: `AUTONOMA_*` lines removed
- The `CLAUDE.md` section: rewritten as a removal note, then relocated here (2026-07-31)
- `docs/20260227-bsuite-master-roadmap-v5.00W.md`: Autonoma adoption section marked as removed
- `.gitleaks.toml`: defensive `autonoma-client-secret` detection rule **kept** as a guard against accidental future re-introduction
- `docs/archive/2026-06/20260507-cron-log-claude-scheduled-v1.00W.md` and other historical activity logs: **NOT edited** (they record what was true on the date they were written)

## If a future evaluation revisits e2e testing

- Alternatives in scope: Playwright (already in BSuite stack), Vercel Agent Review (passive AI code review, currently passes via a different check), self-hosted lightweight smoke tests in CI
- If reconsidering Autonoma specifically, gate adoption on: (a) plugin install no longer hitting the Prisma bug, (b) at least one smoke test authored per app BEFORE re-enabling the deployment-checks integration
- Re-add the env-var section + restore `.env.local` entries from the operator's password manager / Vercel integration auto-provision

## See also

- [`20260425-cross-app-e2e-runbook-v1.00W.md`](./20260425-cross-app-e2e-runbook-v1.00W.md) — the manual cross-app E2E runbook that remains in force
- `AGENTS.md` §9.2 — visual-equivalence loop (Playwright is the sanctioned tool)
