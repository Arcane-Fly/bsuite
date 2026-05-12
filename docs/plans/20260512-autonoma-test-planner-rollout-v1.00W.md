# Autonoma Test Planner Rollout v1.00W

## Scope

Track and enforce adoption of Autonoma Test Planner outputs across all six BSuite app repos (business-suite-unified, crm7, conduit, R80.3, throughput, braden) while keeping existing Vitest coverage in place.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: `scripts/check-autonoma-adoption.mjs --strict` passes in CI with recursive submodule checkout
- **Cross red-team**: copilot verifies evidence rows before flip-to-done
- **Skills to load**: playwright, verification-before-completion, qa-and-verification, test-driven-development
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

## Acceptance criteria

1. Parent CI contains a dedicated nightly + on-demand workflow that verifies Autonoma artifacts exist for all six apps.
2. Required artifact set is enforced per app:
   - `autonoma/AUTONOMA.md`
   - `autonoma/features.json`
   - `autonoma/scenarios.md`
   - `autonoma/skills/*.md` (at least one file)
   - `autonoma/qa-tests/*.(spec|test).{ts,tsx,js,jsx}` (at least one file)
3. The check is scriptable locally and in CI.
4. Existing Vitest-based unit/component testing remains unchanged.

## Rollout notes

- Pilot app should be **throughput** first because its route surface is materially smaller (~10 routes) than BSU (~50+ routes), making first-pass scenario review faster and lower risk.
- Expand rollout to BSU, CRM7, Conduit, R80.3, and Braden after pilot stability.
- Confirm vendor env mapping before plugin generation: `AUTONOMA_CLIENT_ID`/`AUTONOMA_SECRET_ID` vs `AUTONOMA_API_KEY`/`AUTONOMA_PROJECT_ID`/`AUTONOMA_API_URL`.
- CI strategy: keep expensive Autonoma execution out of every PR; use nightly + manual runs and quarantine flaky scenarios before promoting to required status checks.
- Security rule: never commit `AUTONOMA_SECRET_ID` or any derived secret into repo files.
