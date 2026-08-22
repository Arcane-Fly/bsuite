<!-- G5-VERDICT-BANNER -->
> **VERDICT (REFERENCE-ONLY) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # 📚 VERDICT: REFERENCE-ONLY — standing doctrine, verified good
>
> Records **operator RULING 4.3 (2026-08-08)**: the GTO National Standards and the Evidence Guide
> do not name any apprenticeship support provider, in any form.
>
> **This is the one document in `docs/recovered/` that was already verified against source and
> ships the commands to re-check itself.** Marker `A` and body agree. No correction needed.
>
> Read it before adding, seeding or restoring any provider table or provider row. It is a
> constraint on future work rather than a description of outstanding work.

---

# FINDING — The GTO National Standards do not name apprenticeship support providers

**Status:** A (Approved — operator ruling) · **Version:** 1.00 · **Date:** 2026-08-08
**Recorded under:** operator RULING 4.3, 2026-08-08
**Audience:** any agent about to add, seed or restore a provider list

---

## Read this before you add a provider table or seed a provider row

**The GTO National Standards and the Evidence Guide do not name any apprenticeship support
provider, in any form.** Not the scheme, not the acronym, not an individual organisation.

If you are about to create `aass_providers`, re-seed it, or add MEGT / BUSY At Work /
Apprenticeship Support Australia as reference data **because the Standards require it** —
they do not. That premise is false. Verify against this note first.

## The operator's ruling

> **RULING 4.3** — *"Confirm and record that the Standards do not name providers. Your
> search of the Evidence Guide and the clauses table returned zero matches. Record that
> finding in the recovery docs so the next agent does not re-add a provider list on its own
> initiative."*

## Evidence, re-verified 2026-08-08

Searched case-insensitively for `AASN`, `AASS`, `ACAP`, `Apprentice Connect`,
`Australian Apprenticeship Support`, `Apprenticeship Support Australia`, `MEGT`,
`BUSY At Work`:

| Source | Matches |
|---|---|
| `docs/references/Evidence Guide for GTOs to Support the National Standards.md` (57,994 bytes) | **0** |
| `crm7/supabase/migrations/20260519100000_gto_standards_clauses.sql` (the clause seed) | **0** |
| `crm7/supabase/migrations/20260519100100_gto_self_assessments.sql` | **0** |

For contrast, the word "provider" appears in the Evidence Guide only twice, and in neither
case as an apprenticeship-support body.

## What this means

`aass_providers` was **never** required by the Standards. It recorded *who* — `name`, `abn`,
`operates_in_states`, `federal_registered`, `website` — and had **no column for what they
do**. So when the scheme was renamed (AASN → AASS → **ACAP**, Apprentice Connect Australia
Provider) and the funding arrangements changed with it, the table's own *name* went stale
and nothing in it captured the durable thing.

Per **RULING 4.1**, that table is deleted and replaced with a **role entity**: *the
intermediary that lodges the training contract and administers employer incentives*. That
function is durable. ACAP is this decade's occupant. Organisations become ordinary editable
records against the role, with **effective dates**, so the next rename is a data edit rather
than a schema change.

**RULING 4.2** applies the same treatment to `state_ir_config` — "the state industrial
relations authority" is the entity; DMIRS is WA's current occupant.

## The trap this note exists to close

Zero matches is a fact that is expensive to re-derive and cheap to assume away. An agent
building a compliance surface will reasonably *expect* the Standards to name the lodging
body, not find it, and conclude the data is missing rather than absent by design — then
"helpfully" re-add a provider list.

**Absence here is the finding, not a gap.**

## Related

- **RULING 1.1** — model the function as an entity; occupants are data.
- `crm7#1473` — the same defect in `fundingProgram`, where `'AASN'` is hardcoded into an
  RPC's `IN (...)` list behind a `RAISE EXCEPTION`, so no current-named program can be
  claimed without a deploy.
- Memory: `feedback_hardcoding_is_the_recurring_defect`,
  `reference_federal_funding_is_date_effective_never_hardcode`,
  `reference_adms_is_linked_not_registered_by_the_gto`.

## Caveat on this directory

`docs/recovered/` is **not a trusted corpus** (operator RULING 1.3). A full read on
2026-08-08 found 8 of its 33 files belong to another project entirely, two of those are
byte-identical duplicates, and `README.md` is a third-party OpenAI demo readme. It also
contains a complete implementation plan for an e-signature vendor that was **rejected the
same day it was written**. Treat every other file here as possibly-live until verdicted
against code. This note is an exception only because its claim was re-verified above and
the commands to re-check it are given.
