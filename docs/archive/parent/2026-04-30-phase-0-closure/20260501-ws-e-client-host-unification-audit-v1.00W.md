# BSuite — WS-E.1 Client ↔ Host-Employer Unification Audit (v1.00W)

**Status:** Working (framework, matrix fill in Phase 4)
**Scope:** Every form, list, detail page, selector, and PostgREST query across CRM7, BSU, R80.3, conduit, braden, throughput that references `client` or `host_employer` terminology.
**Authority:** ADR-0006 (Contact Propagation Doctrine); `docs/20260227-dry-one-shot-architecture-v1.01A.md` §1 (`clients` ownership).
**Purpose:** Matrix each surface's current behaviour and assign a required fix so every surface treats `clients` as the single canonical organisation entity with `type` as a presentation-layer discriminator.

---

## Doctrine recap (per ADR-0006)

1. `clients` is the single canonical organisation table. `clients.type IN ('client', 'host', 'both', 'prospect')` discriminates role.
2. EntitySelectors filter by `type` as a presentation concern, not as a data-model concern.
3. Any app-local `host_employers` table, view, hook, store, or type that diverges from `clients` is non-compliant and must be deleted atomically with the replacement.
4. Contacts on a `clients` row are shared between all roles — editing a contact for a client-typed record immediately updates the contact seen in host-employer context for the same record.

## Classification legend

- **✅ Compliant** — surface queries `clients` directly with correct `type` filter.
- **⚠️ Ambiguous** — surface may work but doesn't explicitly filter; tested ad hoc.
- **❌ Non-compliant** — surface queries a divergent table/view, uses free text, or mirrors entity locally.
- **🔲 Not audited** — Phase 4 agent pass pending.

## Audit matrix template (populated in Phase 4 WS-E.1 execution)

### CRM7

| Surface | File | Behaviour today | Classification | Required fix |
|---|---|---|---|---|
| Client list | `crm7/src/pages/clients/` | `.from('clients').select('*')` | 🔲 | — |
| Client detail | `crm7/src/pages/clients/[id]` | 🔲 | 🔲 | — |
| Host-employer picker in placement form | `crm7/src/pages/placements/...` | 🔲 | 🔲 | — |
| Host-employer list (if separate route) | `crm7/src/pages/host-employers/` or equivalent | 🔲 | 🔲 | — |
| EntitySelectors: ClientSelector | `crm7/src/components/selectors/ClientSelector.tsx` | 🔲 | 🔲 | — |
| EntitySelectors: HostEmployerSelector (if distinct) | 🔲 | 🔲 | 🔲 | If distinct from ClientSelector, merge into `ClientSelector` with `typeFilter` prop |
| Host-employer invoice target | `crm7/src/pages/financial/...` | 🔲 | 🔲 | — |

### BSU

| Surface | File | Behaviour today | Classification | Required fix |
|---|---|---|---|---|
| Tenant client aggregates (BI dashboard) | `business-suite-unified/src/components/UnifiedDashboard.tsx` | 🔲 | 🔲 | — |
| Admin client management (if present) | `business-suite-unified/src/pages/Admin/*` | 🔲 | 🔲 | BSU should READ only — any write path deleted |

### R80.3

| Surface | File | Behaviour today | Classification | Required fix |
|---|---|---|---|---|
| Charge-to dropdown (client list) | `R80.3/src/pages/charges/...` | 🔲 | 🔲 | — |
| Apprentice→host-employer display | `R80.3/src/pages/apprentices/...` | 🔲 | 🔲 | — |

### conduit

| Surface | File | Behaviour today | Classification | Required fix |
|---|---|---|---|---|
| Placement-ref client lookup (if any) | `conduit/src/app/...` | 🔲 | 🔲 | — |

### braden

| Surface | File | Behaviour today | Classification | Required fix |
|---|---|---|---|---|
| Lead capture → `clients` write | `braden/src/...` | 🔲 | 🔲 | Per BL-002, new `type='prospect'` discriminator |

### throughput

| Surface | File | Behaviour today | Classification | Required fix |
|---|---|---|---|---|
| Client reference (if present) | `throughput/src/...` | 🔲 | 🔲 | — |

## Phase 4 WS-E.1 execution protocol

For each app, the Phase 4 PR does the following atomically:

1. **Discovery per-app** — file-picker + code-searcher enumerate every `.from('clients')`, `.from('host_employers')`, `ClientSelector`, `HostEmployerSelector`, `clientName`, `client_name`, `hostEmployer`, `host_employer_name` reference.
2. **Fill this matrix** — update the app's row block with classification + required fix.
3. **Implement fix atomically:**
   - Rewrite selector / list / detail to `.from('clients').select().in('type', ['client','both'])` or `['host','both']` as appropriate.
   - Merge `HostEmployerSelector` into `ClientSelector` with `typeFilter` prop if they were previously distinct.
   - Delete any app-local `host_employers` table/view/hook/store/type in the same PR.
   - Update Zod schemas to drop `host_employer_name` free-text fields in favour of `clients.id` FK.
   - Add or update test fixtures to cover the type-discriminator.
4. **Contact propagation check** — for any "client contacts" or "host employer contacts" UI, verify it queries `client_contacts` junction (not a separate `host_employer_contacts` table); fix in same PR if divergent.
5. **No `@deprecated` markers** — old code deleted, not marked.

## Acceptance criteria (WS-E.1 complete)

1. Every row in the audit matrix classified ✅.
2. Zero app-local `host_employers` tables / views / hooks / stores / types.
3. `dry-lint` CI rule passes with no free-text `client_name` / `host_employer_name` fields.
4. E2E test (Playwright) demonstrates: create a `clients` row with `type='both'`; it appears in both the client picker and the host-employer picker in all 5 apps; editing a contact in one context updates it in the other.

## What this unblocks

- **WS-E.2** (qualification-host-employer junctions) — depends on host-employer identity being unambiguous.
- **WS-A GTO billing** — billing reports reference `clients.id` exclusively; audit must complete before billing rewrites.
- **ADR-0006 compliance** — this is the primary WS-E.1 output.
- **BL-002** (braden prospect discriminator) — lands after matrix is filled for braden.

## Open tasks

- Phase 4 per-app discovery passes (6 apps × 1-2 days each) — dispatches as subagent-driven-development workstream.
- Matrix fill during discovery — this doc becomes the single tracker for WS-E.1 completion.

---

## Revision log

- 2026-05-01 v1.00W — framework + empty matrix + Phase 4 protocol. Matrix filled during Phase 4 WS-E.1 execution.
