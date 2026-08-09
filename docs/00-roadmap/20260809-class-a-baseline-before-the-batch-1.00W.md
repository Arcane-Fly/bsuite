# Class A baseline — taken before the 20-migration batch applies

**Operator rulings D-28, D-29, D-31.** Captured 2026-08-09 02:5x UTC against the
live database, before any of the twenty remaining migrations on bsuite#1845 was
applied.

## Why this file exists, and what it is not

D-31 asks for *"a restore point before the batch applies, verified restorable,
not merely taken."* This is not that, and does not pretend to be — see
**What I could not establish** below.

It is the other half of the same concern, and the half that is reachable:
a census of every Class A table taken **before**, so that afterwards
*"did we lose anything?"* has an arithmetic answer rather than an opinion.
A backup tells you how to recover. This tells you whether you need to — which
is the question you actually have at 2am.

Check it with:

```bash
node scripts/verify-class-a-preservation.mjs --check \
  docs/00-roadmap/20260809-class-a-baseline-before-the-batch-1.00W.json
```

Exit 1 means a Class A table lost rows. That is a D-29 breach and the batch
stops.

## The census

| Table | Rows | Class |
|---|---:|---|
| `document_metadata` | 425 | A — documents and their verification events |
| `training_plan_units` | 195 | A — training contract detail |
| `contacts` | 79 | A — person particulars |
| `people` | 50 | A — person particulars |
| `placements` | 34 | A — who was placed with whom, on what terms |
| `tenant_switch_audit` | 30 | A — access log |
| `clients` | 24 | A — host employer records |
| `data_change_sets` | 21 | A — audit trail |
| `apprentices` | 20 | A — apprentice particulars |
| `training_plans` | 19 | A |
| `data_change_set_items` | 17 | A — audit trail |
| `employers` | 17 | A |
| `profiles` | 14 | A — identity |
| `sites` | 14 | A — host sites |
| `timesheets` | 14 | A — as worked and as approved |
| **`charge_rate_quotes`** | **13** | **A by D-30** — evidence a host was quoted and accepted a figure, not a recomputable calculation |
| `user_tenants` | 13 | A — tenancy |
| `training_contracts` | 8 | A — registration details |
| `tenants` | 7 | A |
| `communications` | 5 | A — and their entity links |
| **`invoice_line_items`** | **5** | **A by D-30** — an issued invoice is an agreed figure |
| `org_members` | 5 | A |
| `signature_requests` | 5 | A — executed documents |
| **`invoices`** | **3** | **A by D-30** |
| `collaborative_documents` | 1 | the "Test Document" the batch renames — rows travel with a rename |
| `contracts` · `document_access_log` · `document_verification_events` · `documents` · `host_agreements` · `host_contracts` · `organisation_audit_events` · `r7_offers` | 0 | A, currently empty |

**Total Class A rows: 1,038**, across 25 non-empty tables.

`charge_rate_quote_lines` does not exist in this database. It is named in D-30
and should be treated as Class A if it is ever created.

## What I could not establish

**I cannot take a Supabase backup, and I cannot verify a restore.** The tooling
available to this lane exposes no backup or point-in-time-recovery operation,
and the only honest way to verify a restore is to perform one — which on a
production database with two live clients is not a check, it is the incident.

So D-31 is **not satisfied** and I am not going to claim it is. What would
satisfy it:

1. Confirm from the Supabase dashboard whether **point-in-time recovery** is
   enabled on `tuybltdrdefjblnplpqo`, or only the daily physical backup. The
   two have very different worst cases: PITR loses seconds, a daily backup can
   lose most of a working day.
2. Restore the most recent backup **into a separate project or a Supabase
   branch** — never over production — and run
   `verify-class-a-preservation.mjs --check` against the restored copy using
   the baseline in this directory. If the counts match, the restore is verified
   in the only sense that means anything: someone has actually done it.
3. Record the restore's timestamp and the verification output on bsuite#1845.

Step 2 is the whole of D-31. Until someone has done it, the backup is a belief.

## The one thing that reduces the need for it

No migration in the batch destroys, truncates or lossily alters a Class A row
at apply time — established by a 33-agent audit with 19 adversarial passes, and
recorded on bsuite#1845. The single largest risk in the set, a partial-failure
window in `20260809030000` that would have left `people` grant-eligible with no
enforcement, was closed in crm7#1529 before it ever ran.

That lowers the probability. It does not remove the need for a verified
restore, because the reason to hold a restore point is the failure you did not
predict.
