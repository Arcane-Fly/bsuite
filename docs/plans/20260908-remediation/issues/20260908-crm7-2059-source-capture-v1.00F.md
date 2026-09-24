---
kind: record
authority: none
owner: bsuite
---

# Leads flow: cannot create a new company from the leads form, and conversion doesn't carry sections through to contact/client

https://github.com/GaryOcean428/crm7/issues/2059

Snapshot updatedAt: 2026-09-06T09:16:19Z. Open at capture; re-read live.

Two findings on the same leads-to-client pipeline.

## What a user cannot do

- **Create a new company from the leads-create form** — only an existing company can be selected, which breaks the user flow for a genuinely new lead. Operator: "Cant create new company in leads, can only select existing. This wrecks user flow. They should be able to create a new company/client from here." (note.013)
- **Carry data through on conversion.** Converting a lead should carry the relevant sections through to contact and client via the opportunity chain, and currently doesn't. Operator: "Leads convert relevant sections to contact and client through opportunity etc chain." (note.128)

## Done means

- The leads-create form supports creating a brand-new company inline, not just selecting an existing one.
- Converting a lead to a contact/client carries the relevant captured sections through the opportunity chain with no re-entry — a one-shot-policy requirement, consistent with crm7#1685/crm7#1688 elsewhere in this backlog.
