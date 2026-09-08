# crm7#2594 — Mobile Message inbound SMS implementation plan

**Status:** Working (in delivery) · **Date:** 2026-09-08  
**Parent:** bsuite#3204 · **Reuse:** bsuite#3209 workflow catalog/runtime (no second engine)

## Outcome
Incoming Mobile Message SMS replies are visible and actionable in crm7 conversations/timelines, with durable capture, tenant-safe correlation, unread state, pagination past the old 200-row ceiling, consent-safe STOP/START, workflow auto-start via `sms.inbound`, and historical recovery where data exists.

## Architecture (one canonical message owner)
| Layer | Owner | Role |
|---|---|---|
| Webhook + dual-write | BSU `sms-inbound` edge fn | Provider auth, receipt vs reply separation, consent, usage ledger, **communications** insert |
| Schema | crm7 migration `20261126000000` / live apply | `is_read`, `received_at`, `provider_message_id` |
| UI | crm7 mail client | Infinite query, Load more, inbox merge of inbound SMS, mark-read |
| Workflows | `workflow_emit_event` + `trigger_config.events` | `sms.inbound` / `sms.inbound.unmatched`; activations opt-in |
| Accounting | `message_usage` | Remains billing/consent audit — **not** the conversation record |

## Configuration
1. Provider webhook URL → `…/functions/v1/sms-inbound?secret=<SMS_WEBHOOK_SECRET>`
2. Optional stronger auth: set edge secret `SMS_SIGNING_SECRET` (Mobile Message account signing secret). Headers: `X-MM-Timestamp`, `X-MM-Signature` = HMAC-SHA256 of `{ts}.{raw_body}`.
3. Outbound SMS already sends `custom_ref` as `tenant:user:entity` via email-dispatcher.
4. Workflow: publish a definition with `trigger_config.events` including `"sms.inbound"` (and/or `"sms.inbound.unmatched"`), then enable via `workflow_definition_activations`.

## Visual workflow example
1. Settings → Integrations → webhook events: tick **sms.inbound**.
2. Workflows → new/edit definition → trigger config events array includes `sms.inbound`.
3. Activate for tenant.
4. Inbound reply dual-writes communications row → edge calls `workflow_emit_event` → run appears under Workflow runs when activation matches.

## Backfill / recovery
- SQL: BSU `20261125000000_backfill_inbound_sms_to_communications.sql` (idempotent).
- Live probe 2026-09-08: `message_usage` empty on all predicates → backfill is validated no-op.
- Provider `GET /v1/inbound` full-text recovery: requires MM credentials; disclose gap if unavailable.

## Monitoring
- Edge response body: `usage_ok`, `communications_ok`, `duplicate`, `unmatched`, `workflows_started`, `signature`.
- Logs: `[sms-inbound] …` on insert/emit failure (HTTP still 200 for durable partial writes).
- Unread rail + Load more on `/communications`.

## Rollback
1. Redeploy previous `sms-inbound` version from dashboard/CLI.
2. Columns are additive IF NOT EXISTS — leave in place (safe); stop dual-write by redeploying older function if required.
3. Disable workflow activations for `sms.inbound` rather than deleting definitions.

## PRs
| Repo | PR | Content |
|---|---|---|
| crm7 | #2597 | read-state migration, inbox merge, infinite Load more, event catalog |
| BSU | #1216 (merged) | signature helpers + handler wiring |
| BSU | (workflow emit branch) | `workflow_emit_event` after dual-write |

## Remaining for full C1–C12 close
- d.* authenticated visual journey on deployed SHA
- Operator-authorised handset round trip
- Production promote + verify
- Independent supervisor review + DoD gate_report APPROVE
- Optional: confirm `SMS_SIGNING_SECRET` set; provider inbound history scan if credentials available
