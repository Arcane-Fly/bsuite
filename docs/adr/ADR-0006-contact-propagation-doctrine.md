# ADR-0006 — Contact Propagation Doctrine

> ## ⚠️ PARTIALLY SUPERSEDED — the ORGANISATION half of this ADR is stale
>
> **The contact half stands. The organisation half does not.** Production
> canonicalised organisations the *other* way, and **the newer model is the better
> one** — it is this ADR's text that is out of date, not the database.
>
> **What this ADR mandates (§Decision ¶2, invariants 3 & 4):** a `clients.type`
> discriminator with values `'client' | 'host' | 'both'`, honoured by every selector;
> and explicitly *"There is no separate `host_employers` table"*.
>
> **What production actually has** (live catalog, project `tuybltdrdefjblnplpqo`,
> measured 2026-08-17):
>
> - `clients.type` — **does not exist.** The `clients` table has 31 columns; `type`
>   is not among them.
> - A canonical **`employers`** table exists, carrying **four boolean role flags**:
>   `is_client`, `is_host_employer`, `is_sta`, `is_training_provider`.
> - `clients.employer_id` (uuid) points at it, plus `clients.parent_employer_id`,
>   `clients.is_host_employer` and `clients.is_worksite`.
>
> **Why the newer model is better:** a single `type` enum cannot express an
> organisation that is simultaneously a host employer *and* a training provider *and*
> a State Training Authority. The `'both'` value was already an admission that the
> discriminator did not fit — it enumerates one pairing out of the eleven combinations
> four independent roles produce. Independent booleans model the actual domain: roles
> are *orthogonal*, not mutually exclusive. Adding a fifth role is a column, not a
> combinatorial enum rewrite.
>
> **Consequence for selectors:** invariant 4's `type IN ('client','both')` /
> `type IN ('host','both')` predicates are **not executable** against this schema.
> The equivalent is `employers.is_client` / `employers.is_host_employer`.
>
> **The superseding decision is recorded**, but was unreachable from either ADR index
> until this correction — `crm7/docs/adr/20260525-host-employer-table-canonicalization-v1.00W.md`
> ("ADR-002 · Canonicalize Host Employers to `public.employers`", Accepted 2026-05-25,
> [crm7#866](https://github.com/GaryOcean428/crm7/issues/866)). It states plainly that
> the `clients (type=host)` alignment is *"deferred to a future cross-app work stream
> if ever needed"*.
>
> `crm7` is a submodule, so that path is a gitlink from this repo — browse it at
> <https://github.com/GaryOcean428/crm7/blob/development/docs/adr/20260525-host-employer-table-canonicalization-v1.00W.md>.
>
> **That file is also missing from crm7's own ADR index**, where it additionally
> collides on the number "ADR-002" with `20260525-contacts-clients-leads-canonical-source-v1.00W.md`
> — the same defect as A-4, in a second repo. Fixing it needs a separate crm7 PR.
>
> Per estate convention, corrections stay visible: the original text below is
> **unaltered**. Read §Decision ¶2 and invariants 3–4 as historical only.

**Status:** Accepted — contact half current; **organisation half superseded** (see banner)
**Related:** `docs/20260227-dry-one-shot-architecture-v1.04A.md` §1 (`contacts`), §2 Flow E (Contact Reuse), §4 Auto-Population Rules; WS-E.1 Client↔Host Employer unification
**Superseded in part by:** `crm7/docs/adr/20260525-host-employer-table-canonicalization-v1.00W.md`

---

## Context

The user's one-shot clarification (Phase 0 round 2) surfaced two related but distinct propagation patterns:

1. **Role unification on same entity** — "Client becomes host employer" — the same organisation record plays multiple roles. A `clients` record with `type='host'` or `type='both'` is simultaneously a client and a host employer; its contacts appear in both contexts.
2. **Multi-role person membership** — A person entered once as a contact can be an apprentice, a supervisor, a client contact, a project member. Never re-entered; always referenced.

The one-shot spec §2 Flow E already documents pattern 2 at a high level. Pattern 1 is documented implicitly via the `clients.type` discriminator in §1 but the UI enforcement is ambiguous — our audit (WS-E.1) found multiple surfaces where a client-typed record does not appear in the host-employer picker and vice versa, despite living in the same table.

This ADR formalises both patterns as first-class doctrine so the WS-E.1 and WS-E.5 audits have a clear compliance standard.

## Decision

**`contacts` is the single canonical person entity across BSuite. Every person-reference in any form, list, detail page, selector, or query uses `contacts.id` as the FK. Multi-role membership is expressed via per-role junction tables linking to `contacts`.**

**`clients` is the single canonical organisation entity. The `clients.type` column is a discriminator (`'client'`, `'host'`, `'both'`) that every selector, list view, and query must honour. A record's role is a presentation-layer filter, not a separate table.**

The following invariants apply:

1. **Contact identity:** a person has exactly one `contacts` row per tenant. Merge-on-email is the canonical deduplication rule for imports and cross-app handoffs (per `20260423020000_phase4_v1_candidate_contact_merge.sql` already shipped).
2. **Role junctions:** `apprentices.contact_id`, `supervisors.contact_id`, `client_contacts.contact_id`, `project_members.user_id → users → contacts` all reference the same `contacts` record. Adding a new role means adding a junction table, not a new person table.
3. **Organisation identity:** `clients.id` is the single FK target for all organisation-level references (`placements.client_id`, `financial_records.client_id`, etc.). There is no separate `host_employers` table; rows with `type='host'` or `type='both'` in `clients` ARE the host employers.
4. **Role-aware selectors:** EntitySelectors for "client" show rows where `type IN ('client','both')`; EntitySelectors for "host employer" show rows where `type IN ('host','both')`. Never use a free-text field for an organisation reference when the `clients` row exists.
5. **Contact display:** a contact record's `linked_entities` presentation (see `ContactCard` in §3 Tier-3 of the one-shot spec) includes every role that contact plays — apprentice, supervisor, client contact, etc. Authoring any of those roles for an existing contact reuses the same `contacts.id` without creating a new row.

## Rationale

1. **Merge-on-email deduplication is already shipped** (Phase 4 V1 migration `20260423020000_phase4_v1_candidate_contact_merge.sql`, CRM7). The migration established the plumbing; this ADR formalises the expected downstream behaviour so a shipped SQL primitive has a matching doctrine.
2. **The canonical one-shot spec already documents the principle** (`docs/20260227-dry-one-shot-architecture-v1.04A.md` §2 Flow E, §3 Tier-3 `ContactCard` behaviour). This ADR makes it enforceable rather than aspirational by tying it to the WS-E.1 and WS-E.5 audits.
3. **Free-text person fields are the single most common one-shot violation** surfaced by the `dry-lint/no-free-text-where-fk` rule. Formalising the doctrine gives the lint rule a citable authority; citation enables mechanical enforcement.
4. **Role-as-discriminator scales** — new roles (e.g. "prospect", "alumnus") require a new discriminator value or a new junction table, never a new person or organisation table. This keeps the schema stable as the business model evolves.
5. **Schema surface area is minimised** — one `clients` table + one `contacts` table + role junctions is strictly simpler to reason about than parallel `clients`/`host_employers`/`prospects` tables. Fewer tables = fewer RLS policies = fewer cross-table sync bugs.
6. **User preference confirms the technical read.** The user explicitly specified this pattern during Phase 0 clarification round 2 ("contacts of client are contacts of host employer") — a confirming tiebreaker, not the primary justification.

### Option B (separate tables per role) — rejected

A `host_employers` table separate from `clients` (or a `host_employer_contacts` table separate from `contacts`) was considered and rejected:

- Merge-on-email plumbing would have to be replicated across every person table.
- Any report spanning "all organisations we engage with" would need a UNION across tables, which PostgREST cannot express ergonomically.
- RLS policies multiply (one per person table instead of one shared).
- The business model already treats a client that becomes a host employer as the *same* organisation with an expanded role, not a new entity — separate tables would require duplicate-and-relink churn every time the role changes.
- Field-level metadata that applies only when a role is active is better modelled as per-role junction columns than as a separate entity table.

## Consequences

### Atomic replace-and-remove

Executed in Phase 4 WS-E workstream; per-app PRs:

1. **WS-E.1 Client↔Host-Employer unification audit + fill** — every surface currently treating client and host_employer as separate records gets rewritten in one PR per app to query `clients` with type-discriminator filter. Any app-local `host_employers` view, hook, store, or type that diverges from `clients` is deleted in the same PR.
2. **WS-E.5 one-shot field audit** — every free-text person field found by the audit gets converted to a `ContactSelector` (new or existing) in the same PR that deletes the free-text field. No `@deprecated` markers on the old fields.
3. **Contact merge doctrine** — every cross-app handoff RPC (candidate→apprentice, apprentice→supervisor, etc.) merges on `lower(email)` per the existing `20260423020000` migration pattern. Any RPC that creates fresh `contacts` rows without merge gets rewritten.
4. **ContactCard presentation** — `crm7/src/components/ContactCard.tsx` (if extant; audit in Phase 0) reads `apprentices.contact_id`, `supervisors.contact_id`, `client_contacts.contact_id` via JOIN and renders a unified "linked entities" section. Each role-specific view links back to the same shared card component.
5. **RLS** — junction tables inherit the parent entity's RLS; no separate tenant-isolation policy needed on the junction itself. Verify in Phase 4 that this holds for `apprentices`, `supervisors`, `client_contacts`, and any new junction introduced by WS-E.2 / WS-E.3.

### Atomic removal disallows

- Adding a `host_employer_contacts` or `host_employers` table as a "clearer" separation.
- Free-text person fields in any new or existing form.
- `@deprecated` markers on old person-selector code — the code gets deleted when the field is rewritten.
- A "migration window" where contacts exist in both old and new form.

### Forward-looking: new roles

When a new role (e.g. "prospect", "alumnus") is introduced, the pattern is:

1. Add a junction table `<role>_contacts (contact_id uuid fk, <role-specific columns>, tenant_id uuid)`.
2. Add a `<Role>Selector` Tier-3 component that queries the junction + JOINs `contacts` for display.
3. Update `ContactCard` to render the new role in the "linked entities" section.
4. No new person table. No free-text fields. No schema migration on `contacts` itself.

## What this unblocks

Ratification of this ADR unblocks the following Phase 1+ items:

- **WS-E.1** (Client↔Host-Employer role unification audit + fill) — needs the doctrine formally stated before per-app audits begin
- **WS-E.5** (one-shot propagation audit across all forms) — lint rule `no-free-text-where-fk` extensions cite this ADR as authority
- **WS-E.2** (Qualification↔Host-Employer M:M junction) — pattern is an instance of this ADR's junction-not-table rule
- **WS-E.3** (Training-Provider-driven qualification constraint) — same pattern applied to apprentice↔qualification with provider-sourced constraint
- **Conduit candidate→CRM7 apprentice handoff** — already merged-on-email per 2026-04-23 migration; this ADR cites it as the canonical example
- **Braden website lead capture** — leads create a `clients` record with `type='prospect'` (new discriminator value to be added in Phase 2); contacts on that lead merge with existing `contacts` rows if email matches

## Rollback procedure

If an atomic per-app WS-E.1 / WS-E.5 PR fails partway (e.g. the EntitySelector wiring merges but a backfill script corrupts data), the single-commit revert removes:

1. The selector substitution + any new junction row additions,
2. The schema migration (if any was added in the same PR — `DROP TABLE` on the junction, or `ALTER TABLE` reverse on new columns),
3. Any RLS policy additions for the new junction.

Because the canonical `contacts` and `clients` tables are not schema-changed by this ADR (only their consumers change), the rollback leaves the source-of-truth data untouched. This is a key safety property of the junction-not-table pattern.

## Compliance Gate

Ratified on user sign-off. Execution begins in Phase 4 WS-E.1 / WS-E.5 of the consolidated plan. The `dry-lint/no-free-text-where-fk` CI rule gets extended with this ADR as citation in the same Phase 0 batch that updates the one-shot spec to v1.02A.
