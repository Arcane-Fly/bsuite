# Pre-apply capture — bsuite#1845 promotion

**Captured:** 2026-08-09, before the crm7 promotion applies
**Why:** operator ruling D-29 requires Class A contact to be visible. Two things in this
batch are irrecoverable once it runs — not because a migration deletes a row, but because
each overwrites the only surviving record of a prior state. This file is that record,
taken while it still exists.

**Nothing here is a reason to hold the merge.** Both items are fine to apply. They are
captured because after the apply, nobody can reconstruct them.

---

## 1. The 18 documents `20260808120300` will flag as sensitive

`20260808120300_reclassify_sensitive_document_categories.sql` runs
`UPDATE document_metadata SET is_sensitive = true` over identity-document categories. The
migration logs a *count*, not the ids. Without the list below, a later reversal would
wrongly un-flag rows that were already legitimately sensitive.

All 18 are currently `is_sensitive = false` **and** `is_encrypted = false`.

File names are deliberately omitted: they contain apprentices' real names, and this file is
in git. Re-run the query at the bottom of this section if you need them.

### `drivers_license` — 9

| id | tenant |
|---|---|
| `978489ed-217c-4ee3-8db0-cf5c865e8f22` | `0c514bfc` |
| `115de5d9-8203-41ff-9a1a-8e75b87ca9d1` | `fd7a450f` |
| `c0bc6b59-fead-40cf-9dee-cadda4e146ec` | `fd7a450f` |
| `4144378b-8183-4851-ae1b-3027ec40b6fd` | `b550d66c` |
| `0a66d5e4-3da1-4eb6-a5b0-50e87a3e0930` | `b550d66c` |
| `0ccb4b7d-1581-4fb9-bacb-d80cdb5500dc` | `b550d66c` |
| `8f1fa1dd-59fe-484b-8015-f9e094d4732c` | `b550d66c` |
| `0478b442-6d3d-459e-89b3-80855c8a8acb` | `b550d66c` |
| `b0f1dc51-f97a-4365-b300-034c457cc838` | `b550d66c` |

### `passport` — 2

| id | tenant |
|---|---|
| `656278ba-b8da-4a55-8ead-75727f45924e` | `fd7a450f` |
| `e2d2edaf-2c27-4d2d-a45d-7ac7090db865` | `b550d66c` |

### `superannuation_choice_form` — 7

These carry tax file numbers.

| id | tenant |
|---|---|
| `c1473527-d99b-45e7-b0ce-217136858b83` | `b550d66c` |
| `3e6a67ae-314a-45ae-ad0b-c0ab4fe87bd1` | `b550d66c` |
| `4186fc08-9c5e-446b-8956-dc29c3c3b0ce` | `b550d66c` |
| `013efda7-56cf-4a2b-92fc-3873875fc770` | `b550d66c` |
| `b37301fc-16e2-47b6-bbc4-02f2d99960be` | `b550d66c` |
| `38246abb-6bcf-4858-9c3e-13c0af8a1e88` | `b550d66c` |
| `06344b00-eee3-4325-ac8c-416532965d59` | `b550d66c` |

### To reproduce, or to reverse

```sql
-- the same set, with file names
SELECT id, tenant_id, document_category, file_name, is_sensitive, is_encrypted
FROM public.document_metadata
WHERE lower(document_category) ~ 'licence|license|passport|super|birth|working_with_children|wwcc|tfn|tax'
ORDER BY document_category, uploaded_at;

-- reversal, if it is ever needed: scoped to exactly these ids, so a row that was
-- already sensitive before the batch is untouched
UPDATE public.document_metadata SET is_sensitive = false WHERE id IN ( ...ids above... );
```

**These 18 are the same 18** behind the encryption question the operator ruled on in D-14.1:
whether a category is encrypted is a super-admin per-category decision, not a gate. Flagging
them sensitive is classification, not encryption, and does not pre-empt that ruling.

---

## 2. The policy note `20260808174500` overwrites

`timesheets_select` carries a comment that is the **only in-database record of a proven live
cross-tenant read**. `20260808174500_t1b_developer_reads_all.sql` rewrites that policy, and
the rewrite drops the comment. Verbatim, before it goes:

> SELECT gate. Narrowed 2026-08-07: the previous version ORed in a blanket
> `tenant_id IN (auth_tenant_id())` branch, which let any active member of a tenant —
> including role=guest apprentices and host contacts — read every timesheet in that tenant.
> Proven live with a real apprentice identity: 3 visible, 3 of them other people's. The
> blanket branch is now scoped to owner/admin; measured across all nine active users, no
> legitimate reader lost a row.

That is a record of a real exposure, how it was proven, and how it was closed. It should
survive the rewrite. The migration is not wrong to rewrite the policy — it just needs to
restate the comment, or this file becomes the only copy.

The dossier also expected a comparable note on the client-organisation table, dropped by
`20260809043000`. **I could not find one.** Querying `pg_policy` comments across
`timesheets`, `clients`, `document_metadata` and `placements` returned exactly one row —
the timesheets note above. Either it was never written or it is on a table I did not check.
Recorded as not-found rather than asserted either way.

---

## What is NOT captured here, and why

- **Row-level backups.** No migration in the batch deletes or truncates a Class A row, so
  there is nothing to snapshot. The one lossy alteration is item 1, captured above.
- **A restore point.** Separate, and worse: **PITR is disabled on this project**
  (`pitr_enabled: false`), so the nearest recovery point is a daily physical backup, most
  recently `2026-08-08 10:18 UTC`. See the D-31 comment on bsuite#1845. This file does not
  substitute for that and should not be read as if it does.
