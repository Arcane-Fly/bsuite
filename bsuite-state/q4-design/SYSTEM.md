# Cron A System Routing Spec

## Active routing matrix (severity × effort)

| | XS (<1h) | S (<4h) | M (<1d) | L (>1d) |
|---|---|---|---|---|
| **P0** | jodie-auto-fix · 15 min | @claude · 4h | human-page · 4h | human-page · 4h |
| **P1** | @copilot · 4h | @claude · 4h | @claude · 1d | heavy-queue |
| **P2** | jodie-auto-fix · 1d | @copilot · 1d | @claude · 3d | heavy-queue |
| **P3** | jodie-auto-close · 1d | jodie-auto-close · 1d | @copilot · 1w | heavy-queue |

Implementation source: `packages/jodie/src/routing-matrix.ts`

## Escalation + SLA

- Cron A reads severity/effort classification from q3-03 output.
- Cron A creates `jodie_sla_tracking` rows for cells with an SLA.
- Hourly SLA sweep escalates one severity tier per breach (`P3→P2→P1→P0`).
- `P0` is terminal in the severity ladder; repeated breaches are handled by breach count policy (human page on second breach).
- On second breach, Cron A pages a human and applies label `escalated`.
- Escalation is one-way and breach-counted, preventing escalation loops.

## Auto-merge guardrail

P3-XS auto-close/auto-merge is allowed only when all are true:

1. branch protection is enabled,
2. required CI is green,
3. at least one human approval is present.

No bypass path is allowed.

## Archived flat ladder (deprecated)

The prior flat routing ladder (`VERIFIABLE/MINOR/MEDIUM/HEAVY/EXTERNAL-BLOCKED`) is retired and replaced by the 2D severity×effort matrix above.
