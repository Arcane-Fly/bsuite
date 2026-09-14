---
kind: record
authority: none
owner: bsuite
---

# avetmiss-export has never worked — it queries columns and a table that do not exist in production

https://github.com/GaryOcean428/crm7/issues/1721

Snapshot updatedAt: 2026-09-06T09:16:15Z. Open at capture; re-read live.

`avetmiss-export` cannot succeed against production's schema. It fails at the **"Fetch source data"** step on every call, before the ZIP is built — so the function has never produced an export.

Found while building an end-to-end rehearsal proof for a *different* defect in the same function (crm7#1678, the undeclared `claims`). That fix is correct and merged, but **the line it repaired is unreachable on the real schema**, so it changes nothing operationally until this is resolved.

## Measured against production `tuybltdrdefjblnplpqo`, read-only

| reference in the function | present in production |
|---|---|
| `apprentices.dob` | **no** |
| `apprentices.postcode` | **no** |
| `apprentices.address_line1` | **no** |
| `qualifications.anzsco_code` | **no** |
| table `subject_enrolments` | **no** — has never existed in any migration |
| storage bucket `avetmiss-exports` | **no** |
| *control:* table `apprentices` itself | yes |

The control matters: the query discriminates, so these zeros are the schema's answer and not a broken probe. The function also references `apprentices.sex`, `state_code`, `country_code` and `suburb`, none of which exist either.

## Why nobody noticed

**BSuite is not RTO software** — AVETMISS data is *captured*, not *reported on* (operator, 2026-08-13). Nothing in the product calls this function in anger, so a total failure produced no signal. That also sets the priority: this is not a live outage anyone is hitting, it is a feature that has never worked.

It is worth correcting the record explicitly, because I got it wrong twice: I first described this function as failing at the *last* step, after the ZIP was built and uploaded, with the lodgement silently unrecorded. Both halves were wrong. It fails at the *first* data step, and there is no lodgement obligation here to miss.

## What resolving it actually requires — a design decision, not a patch

Two distinct questions, and neither should be answered by adding columns to make the query compile:

1. **Where does apprentice demographic data live?** DOB, sex, address and postcode look like `people` fields, not `apprentices` fields — an apprentice is a role a person holds. Sourcing them from `people` is probably right, but that is a schema judgement, not a rename.
2. **Where should unit-level AVETMISS data live?** `subject_enrolments` has never existed. AVETMISS NAT files need per-unit enrolment and outcome records, and the estate already has `/vet/units` as the register and `/competencies` as per-apprentice progress. Whether the export reads those or needs its own table is the real question.

Also: `zip_url` will be null even once the query works, because the `avetmiss-exports` bucket does not exist.

## Rehearsal shim — deliberately not a migration

To isolate and prove the one-line `claims` fix, the rehearsal harness applies `scripts/e2e-rehearsal/avetmiss-export.rehearsal-only-shim.sql` — nullable columns plus a throwaway table, applied **only** to the disposable database.

**It is not a migration and must not become one.** It exists so the crash fix could be positive-controlled (reverted → `HTTP 500 claims is not defined`; fixed → `HTTP 200` with `avetmiss_exports.lodged_by` matching the caller in the DB). Promoting it would encode a schema nobody designed.
