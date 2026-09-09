# A person points at a host employer owned by a different tenant (people.current_host_employer_id -> clients)

https://github.com/GaryOcean428/bsuite/issues/2611

Snapshot updatedAt: 2026-08-31T02:49:38Z. Open at capture; re-read live.

## The finding

Measured against production on 2026-08-28 by `scripts/check-cross-tenant-references.mjs`:

```
297 foreign-key pair(s) examined, 5 carrying cross-tenant rows, 21 row(s) total
    8  training_contracts.qualification_id->qualifications
    8  training_plans.qualification_id->qualifications
    3  charge_rate_snapshots.charge_rate_quote_id->charge_rate_quotes
    1  leads.contact_id->contacts
    1  people.current_host_employer_id->clients        <- NEW, above baseline
```

**One `people` row names a `clients` parent owned by a different tenant.** The gate's own
words for why that matters: under RLS the owning tenant's data renders EMPTY, and on any
`service_role` path it is VISIBLE to the wrong tenant.

## Why it went unseen

The gate was **wired to nothing**. Its only reference anywhere in the estate was a line in
`docs/00-roadmap/bsuite-feature-index.json`; no workflow invoked it, so it had never run in
CI. Its sibling `audit-cross-tenant-duplicate-objects` has had a workflow and a nightly
schedule all along. bsuite#2610 wires this one on the same pattern.

## What I did NOT do, deliberately

The baseline is **not** re-banked and the row is **not** edited.

Banking it would waive a live cross-tenant reference to make a number green. And the row is
client data: the FutureBuild ratification (precedent 2026-08-26 §1) covers removing rows an
automated suite provably planted, and is expressly *"not authority for writing to a client
tenant generally"*. So the gate will be red on its first scheduled run — correctly, and on
something actionable rather than structural.

## What resolving it needs

A decision on the single row: is it a data-entry error (repoint or clear `current_host_employer_id`),
or a legitimate arrangement where a person is placed with a host owned by another tenant — in
which case the model, not the row, is what needs to change. Once resolved, re-bank the baseline
for that pair at its new floor.

The other four pairs are at baseline and unchanged; the two `qualifications` pairs (8 each) look
like shared reference data rather than a leak, but they have not been re-examined here.
