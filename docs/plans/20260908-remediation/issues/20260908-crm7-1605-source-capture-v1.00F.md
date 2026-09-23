---
kind: record
authority: none
owner: bsuite
---

# [NEEDS OPERATOR] The TFN and super forms are not duplicates of the captured fields — do not make them optional

https://github.com/GaryOcean428/crm7/issues/1605

Snapshot updatedAt: 2026-08-24T03:26:19Z. Open at capture; re-read live.

## Do not flip these to optional — I nearly did, and it would have been a compliance gap

The document-provenance work (crm7#1590) classified bank details, superannuation choice and the TFN declaration as **captured** — structured fields, not documents — and its report recommended a follow-up flipping the two document-kind requirements to `is_required = false` as duplicates.

**Checked the data before implementing it. The recommendation is wrong, and here is why.**

### What is actually there

| Requirement | Kind | Required | Twin? |
|---|---|---|---|
| `tax_declaration` | structured_record | yes | ↔ `signed_tfn_declaration_form` |
| `signed_tfn_declaration_form` | **document** | yes | ↔ `tax_declaration` |
| `super_choice` | structured_record | yes | ↔ `super_choice_form` |
| `super_choice_form` | **document** | yes | ↔ `super_choice` |
| `bank_account` | structured_record | yes | **none — no duplication here** |

So two pairs, both required. On the face of it the worker is asked for the same fact twice.

### Why they are not duplicates

**They are different things with different obligations.**

- The **structured record** is the data payroll needs to pay someone: the TFN, the residency status, the threshold claim, the fund and member number. It is what the engine reads.
- The **document** is the *executed instrument*. An employer must retain the signed TFN declaration, and the superannuation standard choice form is likewise a form the employee signs and the employer keeps.

Flipping the documents to optional would remove the prompt for the very artefact that has to be retained. The data would be captured and the signed form would quietly stop being collected — and nobody would notice until someone asked for it.

**`bank_account` genuinely has no document twin**, which is the right shape: an uploaded bank statement is *evidence for* an account number, not the account number, and nothing obliges its retention.

### What should happen instead

**Keep both required. Fix the explanation, not the requirement.**

The onboarding checklist currently presents them as two unrelated line items, which is what makes it read as a duplicate ask. It should say plainly that the fields are what gets used to pay you, and the signed form is what we are obliged to keep — so the worker understands why they are doing both, and staff do not "helpfully" mark one complete.

### What needs an operator ruling

1. **Confirm the retention reading.** I am confident the signed TFN declaration must be retained; I am less certain the superannuation standard choice form carries the same obligation rather than being good practice. That is a question for Braden, not an assumption for me.
2. **Retention periods.** bsuite#1885 §5 already flags that nothing in the platform models retention at all. These two forms are a concrete case: they have a statutory clock and no field to record it.

**No change made.** Recording the reasoning so the next person does not implement the original follow-up on its face.

Refs crm7#1590, bsuite#1885, bsuite#1886
