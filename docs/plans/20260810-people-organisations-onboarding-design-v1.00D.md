# People, organisations and onboarding — design

**Status:** design, awaiting one decision (§2). **Date:** 2026-08-10.
**Operator rulings so far:** C (§2, *provisionally — see the correction*), A (§1).
**Triggered by:** operator screenshot, `/people/new` — a contact has an employer, the field
is not on the card, and adding a Client or Employer element through the canvas produced a
*list of every organisation* instead of a picker.

---

## 0. The finding in one paragraph

Almost everything needed already exists and is not wired together. `/contacts/create` is
built, routed, and already links a contact to an organisation properly — it is simply absent
from the navigation, so the only visible way to add a human is the apprentice intake form.
The conduit→crm7 hire handoff is built end to end. The direct-onboard wizard was built on
8 August. What is genuinely missing is **one mechanism**: a way to invite someone to the
portal so they can onboard themselves. `people.user_id` — the column that links a worker to
their login — is populated for **0 of 50 people**, so the self-service upload shipped on
8 August sits behind a door nobody can open. Separately, the organisation model is split
across two load-bearing tables and six organisations exist twice.

---

## 1. The front door — APPROVED

### The problem

`/people/new` is 1,816 lines of apprentice intake: host employer, training contract, RTO,
education, parent/guardian, contract terms. Its Employment Type list is *apprentice, trainee,
labour hire ×3, ABN contractor, internal staff* — **every option is someone the GTO employs
or places.** There is no option for a person who works for another organisation, because
those people are not `people` rows at all.

They are `contacts` rows. And the model for that is already correct:

| Table | Holds | Rows |
|---|---|---|
| `contacts` | the human — name, email, `position`, and `client_id` (their organisation) | 79 |
| `people` | the *worker* record layered on top, via `people.contact_id` | 50 |

**All 50 people have a `contact_id`.** The bridge is 100% populated. 29 contacts have no
worker record — those are exactly the external people. The model was right; the doors were
wrong.

### The design

`/people/new` becomes a router, not a form:

> **Who are you adding?**
> - Someone we employ or place
> - Someone at another organisation
> - Someone who applied through Conduit

| Choice | Destination | State today |
|---|---|---|
| We employ them | `/people/onboard` → create → **invite to portal** | Page built 2026-08-08; **invite missing (§3)** |
| Another organisation | `/contacts/create` | **Built and routed; not in the nav** |
| Applied through Conduit | candidate search → existing handoff | Built; no door on the crm7 side |

The 1,816-line form is untouched and still reached by the first choice. This is a router in
front of it, not a rewrite.

### Named, not hidden

- **The apprentice form is not fixed by this.** It still mixes cases. This stops people being
  *sent* there wrongly. Decomposing it is separate work and is not in this plan.
- **`Onboarding` and `Onboard Someone` are both in the nav** and mean different things — one
  reports, one creates. Rename as part of this: *Onboarding status* and *Onboard someone*.

---

## 2. The organisation model — RULING C NEEDS CORRECTING BEFORE IT IS BUILT

### What was ruled

Option C: promote `clients` to be the single organisation table, add role flags for training
provider and STA, fold `employers` into it, retire `employers`.

### Why I now think the merge target is wrong

I recommended `clients` because it already carries `is_host_employer` and `is_worksite`
flags. That reasoning was incomplete. The foreign keys say the opposite:

| Table | Rows | Inbound foreign keys | What points at it |
|---|---:|---:|---|
| `clients` | 24 | **15** | leads, opportunities, financial_records, vacancies, placements, contacts, training_contracts |
| `employers` | 17 | **31** | timesheets, invoices, rcti_invoices, host_agreements, charge_rate_quotes, boot_assessments, incentive_claims, funding_claims, insurance_policies, whs_audits, induction_records, probation_records, disciplinary_cases, engagements, sites, org_members, contracts, and the whole r7_* recruitment set |

**`employers` carries twice the references, and it owns compliance and money** — every
timesheet, every invoice, every host agreement, every BOOT assessment, every insurance policy
and WHS audit. `clients` owns the sales-and-CRM view.

There is also a live pointer between them: **`clients.employer_id` → `employers`**, plus a
self-reference `clients.parent_employer_id` → `clients`. So the schema already says a client
*has* an employer. That is a coherent split — `employers` as the legal entity, `clients` as
the commercial relationship — that was half-implemented and then duplicated.

### The duplication, measured

Six organisations exist as a row in **both** tables, with different ids:

| Organisation | `clients.is_host_employer` | Also an `employers` row |
|---|---|---|
| Master Builders Association WA | true | yes |
| ADCO Constructions Pty Ltd | true | yes |
| Builden Construction Pty Ltd | true | yes |
| Sample Construction Pty Ltd | true | yes |
| Example Constructions Pty Ltd | true | yes |
| Built Management Services Pty Ltd | false | yes |

"Host employer" is therefore encoded **twice at once** — a flag on the client row *and* a
separate row in `employers`. This is what produced two lists in the canvas picker with the
same company in both.

Related open work: **crm7#660** — *host-employers: auto-populate ABN + remove dup field +
multi-site model*. Whoever owns that issue is standing on this same fault.

### The three ways forward

**C1 — merge into `employers` (the correction).** `employers` becomes the organisation of
record. `clients` keeps only the commercial relationship and points at it. Role flags
(`is_client`, `is_host_employer`, `is_training_provider`, `is_sta`) live on `employers`.
Contacts repoint from `client_id` to `organisation_id → employers`.
*31 FKs stay untouched; 15 move.* **Least data movement, and the money and compliance tables
never move.**

**C2 — merge into `clients` (as ruled).** `clients` becomes the organisation of record.
*15 FKs stay; 31 move — including every timesheet, invoice and host agreement.* Highest risk
in the estate's most sensitive tables.

**C3 — do not merge; deduplicate and link.** Keep both, enforce `clients.employer_id` as
mandatory, merge the six duplicate pairs so each organisation is one `employers` row with at
most one `clients` row, and give `contacts` an `organisation_id → employers`.
*No FK moves at all.* Fixes the contact problem and the duplication without a structural
merge.

### Recommendation

**C3 now, C1 later if still wanted.** C3 solves the operator's actual problem — a contact can
be attached to any organisation, including host employers, training providers and STAs — with
**zero movement of financial or compliance foreign keys**. C1 is the right end state and C3 is
a strict step toward it, because it makes `employers` the spine first. C2 should not be built:
it moves 31 references including every timesheet and invoice for a cosmetic gain.

**This is the one decision needed before implementation starts.**

### Training providers are a lookup, not organisations

`training_providers` holds **8,119** rows imported from the national register. Those are
reference data. Only the handful actually dealt with become organisation records; the rest
stay a list you pick from. Do not merge that table into anything.

---

## 3. The portal invite — the only genuinely missing mechanism

### Evidence

```
people total ................ 50
have a login linked ......... 0      <-- people.user_id
cannot use the portal ....... 50
```

`person_ids_for_current_user()` resolves the signed-in user to their person rows via
`contact_id = auth.uid() OR user_id = auth.uid()`. With `user_id` empty for everyone, the
portal cannot identify a single worker. The self-service document surface shipped on
2026-08-08 (`20260808120200_self_service_documents_all_worker_types`) therefore delivers
nothing — as yesterday's migration audit predicted in advance.

There is **no invite table, no invite token, and no "send portal link" action** anywhere in
the estate. Searched across all six repositories.

### The design

One mechanism, used by both onboarding paths:

1. **Mint an invite** against a `people` row — single-use token, expiry, audited.
2. **Send it** through the existing communications path.
3. **They set a password**, or sign in with an existing account.
4. **On acceptance, write `people.user_id`.** This is the whole point; everything downstream
   already keys off it.
5. **The portal reads the requirements registry** — the same
   `onboarding_requirements_preview` resolver `/people/onboard` already uses — and asks them
   for exactly what their employment type and state require.
6. **They upload; staff verify.** Self-verification is already forbidden at the database
   level (`prevent_document_self_verification`), which is correct and must stay.

### Constraints this must respect

- **A self-uploader may never mark their own document verified.** Already enforced; do not
  weaken it.
- **The invite token is anonymous-reachable by necessity.** It joins the four existing
  token endpoints (quote signing, quote signature redemption, talent-pool consent, public
  application). It needs the same treatment: expiry, single use, rate limiting. Track under
  bsuite#1869, which already asks for that review on the existing four.
- **Do not create an auth user on invite.** Create it on acceptance. An unaccepted invite
  that has already minted an account is an orphan that looks like a user.

---

## 4. The canvas element picker

### What actually happens

`PageGridLayout` listens for a `crm7-add-entity-widget` event carrying
`{ entityType, label }` and renders an **entity list widget** — a table of every row of that
entity. That is why choosing *Client* produced a grid of Tenant Id / Name / ABN.

It behaved exactly as built. There is **no relationship-picker widget type**, so the canvas
cannot express "attach this record to one of those".

Compounding it: the operator is a platform developer and, since the T1b change shipped
yesterday, reads every tenant — so the list included fixture-tenant organisations. Correct
for that account, useless as a picker, and a normal user would see a different list from the
same control.

### The design

Add a second widget kind: **relationship field**, distinct from **entity list**.

| Widget kind | Renders | Writes |
|---|---|---|
| Entity list *(exists)* | a grid of rows | nothing |
| Relationship field *(new)* | a typeahead selector over one entity, scoped to the caller's tenant | a foreign key on the record being edited |

The picker must reuse `ClientSelector` — the component `/contacts/create` already uses, which
refuses a typed name that does not resolve to a real row and offers inline create. That
validation is the thing that stopped 7 contacts becoming free-text orphans, and any new
picker that skips it will recreate the problem.

**Scope note:** the canvas can only offer a relationship field where the underlying record
*has* a foreign key to write to. That is a catalogue property, not a UI one — the field list
must come from the real schema, or the picker will offer relationships that cannot be saved.

---

## 5. Downstream — wiring, mapping, manuals

### 5.1 Wiring

Nothing in this plan is finished until it is reachable. Current dangling surfaces found:

| Surface | Built | Reachable | Action |
|---|---|---|---|
| `/contacts/create` | yes | **no** | route from the §1 front door + nav |
| `/apprentices/from-candidate` | yes | only from conduit | add a crm7-side entry |
| `/people/onboard` | yes | yes | add the invite step |
| self-service documents | yes | **no** — no linked login | §3 unblocks it |

### 5.2 Frontend ↔ backend mapping

Each new or changed surface must name the exact call it makes, and each call must exist:

| Surface | Reads | Writes |
|---|---|---|
| Front-door router | nothing | nothing (navigation only) |
| Add contact | `clients` (selector, tenant-scoped) | `contacts` — `client_id`/`organisation_id`, `position` |
| Onboard someone | `onboarding_requirements_preview` | `create_person_with_contact`, then invite |
| Portal onboarding | `onboarding_status_for_person`, `person_ids_for_current_user` | document upload; `people.user_id` on accept |
| Relationship widget | the entity, tenant-scoped | one FK on the host record |

Two rules learned the hard way and restated here: a grid that renders rows with every cell
empty is not working, and a green pipeline is not evidence that a migration reached the
database. Every claim in the implementation plan needs a live check, not a build log.

### 5.3 User manuals

The manuals are user-facing and role-specific, and this plan changes what three roles do:

- **GTO staff** — how to add a human, and which of the three doors to use. This is the
  vocabulary problem that caused the original report, so the manual must speak in *"do they
  work for you or for someone else"*, never in *contact vs person*.
- **The worker being onboarded** — what the portal will ask for, and that a document they
  upload still needs staff verification.
- **Client and host-employer administrators** — that they are recorded as a contact at their
  organisation, and what they can see.

Manual updates ship in the same change as the behaviour, not afterwards.

### 5.4 Reporting and the data workspace

`contacts` and `people` are catalogue entities. Adding `organisation_id` and role flags means
the catalogue must be refreshed or reports will not be able to group by organisation — which
is the first question anyone will ask of this data ("who are our contacts at Sparkline?").

---

## 6. Remaining tasks, in dependency order

Estimates are relative effort, not calendar.

### Blocking decision
- [ ] **D-1. Confirm the merge target: C1, C2 or C3.** Recommendation: **C3**. Nothing below
      that touches organisations can start until this is settled.

### Wave 1 — reachability (small, no data risk)
- [ ] W1-1. Front-door router at `/people/new`; existing form moves behind choice one.
- [ ] W1-2. `/contacts/create` into the navigation and into the router.
- [ ] W1-3. Rename `Onboarding` → *Onboarding status*, `Onboard Someone` → *Onboard someone*.
- [ ] W1-4. crm7-side entry point for the conduit handoff.
- [ ] W1-5. Manual updates for the three roles above.

### Wave 2 — organisations (data risk; needs D-1)
- [ ] W2-1. Merge the six duplicate pairs; keep the surviving id stable.
- [ ] W2-2. `contacts.organisation_id`, backfilled from `client_id`; keep `client_id` until
      every reader moves.
- [ ] W2-3. Role flags: `is_client`, `is_host_employer`, `is_training_provider`, `is_sta`.
- [ ] W2-4. Selector reads organisations, filtered by role, tenant-scoped.
- [ ] W2-5. Reconcile the 7 free-text-company contacts and the 55 with no organisation.
- [ ] W2-6. Refresh the report catalogue.
- [ ] W2-7. Close or re-scope crm7#660, which overlaps this.

### Wave 3 — the portal invite (the unblocking work)
- [ ] W3-1. Invite table + mint/accept RPCs, single-use, expiring, audited.
- [ ] W3-2. Accept flow writes `people.user_id`.
- [ ] W3-3. Send via the existing communications path.
- [ ] W3-4. Portal onboarding reads the requirements registry and collects against it.
- [ ] W3-5. Invite step added to `/people/onboard` and to the conduit handoff landing.
- [ ] W3-6. Rate limiting and expiry on the invite endpoint; fold into bsuite#1869.

### Wave 4 — the canvas
- [ ] W4-1. Relationship-field widget kind, using `ClientSelector` validation.
- [ ] W4-2. Catalogue exposes which relationships a record can actually write.
- [ ] W4-3. Entity-list widget scoped to the caller's tenant by default.

### Explicitly out of scope
- Decomposing the 1,816-line apprentice form.
- Merging `training_providers` (8,119 reference rows) into anything.
- Any change to `prevent_document_self_verification`.

---

## 7. What I have not verified

Stated so the next person does not assume it was checked.

- **Whether the six duplicate pairs are truly the same legal entity.** Matched on exact name.
  ABNs were not compared, and two organisations can share a trading name. Confirm against ABN
  before merging any pair.
- **Whether `clients` and `employers` carry conflicting data** for the six pairs — different
  addresses, different contacts, different statuses. A merge must decide which wins,
  field by field, and that has not been surveyed.
- **Whether anything outside crm7 writes `contacts.client_id`.** conduit and BSU were not
  audited for that.
- **What the 55 organisation-less contacts actually are.** They may be leads, imported rows,
  or genuine orphans. They need looking at before a rule is written for them.
