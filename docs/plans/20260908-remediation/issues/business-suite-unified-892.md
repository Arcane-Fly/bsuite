# Enterprise licence grace-seat invites: events list fails because the backing table doesn't exist, and there's no notification/countdown system

https://github.com/GaryOcean428/business-suite-unified/issues/892

Snapshot updatedAt: 2026-08-26T12:24:36Z. Open at capture; re-read live.

Two findings, same feature: grace-seat handling for enterprise licences at `suite.crm7.app/admin`.

## What's wrong

- **Grace invite events fail to load — the backing table doesn't exist.** Console error: `Failed to load events: Could not find the table 'public.enterprise_licence_events' in the schema cache` (note.023). This is a hard failure, not a UX gap — a migration is missing or was never applied.
- **No notification system for grace invites.** Needs: an email and in-app notice via the notices system when a grace invite happens, a countdown to when grace ends, an auto-generated Xero invoice, a place to set price per additional seat, and subscription-type selection on grace sign-up. Operator: "I need to receive an email and in app notice via the notices system to alert me to grace invites. Grace users should have a date to notify when grace is ending." (note.024)

## Done means

- `public.enterprise_licence_events` exists in production and the events list loads without error.
- A grace invite triggers an email + in-app notice via the existing notices system, shows a countdown to grace-end, generates a Xero invoice automatically, and grace sign-up offers seat pricing and subscription-type selection.
