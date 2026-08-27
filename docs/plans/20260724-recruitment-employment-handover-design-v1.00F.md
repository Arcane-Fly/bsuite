# Recruitment → Employment Handover + Email/Funding — Design

> **Naming:** `20260724-recruitment-employment-handover-design-v1.00F.md` · Status **D** (Draft — for operator approval) · Brainstorm output per `agents/brainstorming`. Operator directives 2026-07-24.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Operator requirement (this session)

When an apprentice/trainee/worker is recruited: **all correspondence** (resume, qualifications, cover letter, onboarding docs, tax details, bank details — everything employers need to evidence) captured in the application portal must **pass over to the crm7 equivalent record on offer acceptance + employment**, along with **associated emails**. Design all, include trade-offs, triple-check existing infrastructure.

## Existing infrastructure (TRIPLE-CHECKED — do not rebuild)

| Piece | State | Evidence |
|---|---|---|
| Mail connect (Google/Microsoft/SMTP/IMAP) | ✅ BUILT | `crm7/src/pages/settings/email-accounts.tsx` + `oauth-google-email`/`oauth-microsoft-email` edge fns; rides existing Google/Azure creds |
| Inbox persistence | ✅ BUILT | `email_messages` table (direction, thread_id, is_read, contact_id, lead_id, integration_id) |
| Communications surface | ✅ BUILT | compose, mail-merge, templates, `communications/index.tsx` |
| Conduit→crm7 handoff | ✅ PARTIAL | `createApprenticeHandoffToken` (conduit candidate → `apprentice_handoff_tokens` snapshot, consent-gated) + crm7 `/apprentices/from-candidate?handoff_token=` landing |
| Handoff payload | ⚠️ **RECORD ONLY** | Transfers candidate record + `resume_url`. **NO document set, NO emails.** ← the gap |
| Conduit candidate documents | ✅ BUILT | `r7_documents` (resume, cover letter, qualifications, etc. via DocumentsSection) |
| crm7 person documents | ✅ BUILT | DocumentHub (`crm7/src/components/documents/`) + document categories |
| Funding (GWS/EIS subsidy credits) | ⚠️ PARTIAL | R80.3 `invoicingService` has subsidy credits; NOT a configurable charge-rate offset |

## The three workstreams

### W1 — Email entity assignment (crm7 inbox ↔ entities)
Link inbox emails to contact/people/client/host/AASN.

**Trade-off — data model:**

| Option | Pros | Cons |
|---|---|---|
| **A. Join table `email_message_links`** (email_id, entity_type, entity_id) | Multi-link (one email ↔ person AND their host AND the application); polymorphic; no email_messages schema churn beyond the table | Extra join on every inbox query; slightly more code |
| **B. Nullable FK columns on `email_messages`** (people_id, client_id, employer_id, aasn_id) | Simple single-query reads; direct FK referential integrity | Single entity per email per type; 4 more nullable cols; doesn't model "email relates to both person and host" cleanly |

**Recommendation: A (join table).** An email about an apprentice genuinely relates to the person, their host employer, and the AASN — multi-link is the real shape. The join cost is trivial at this scale and keeps `email_messages` clean.

**Scope:** join table + assignment UI (assign email/thread to entity, chips on inbox rows, filter by entity, auto-suggest by sender/recipient match) + Jodie "assign this email to X".

### W2 — Recruitment → Employment handover (documents + correspondence)
**Ownership (DRY one-shot):** conduit owns the *candidate* record + recruitment; crm7 owns the *employee/apprentice* record. The handover is a **one-way projection on offer acceptance**, not a live sync.

**What transfers on offer acceptance (conduit `hired` → crm7 apprentice):**
1. **Candidate record** — already transfers (handoff token). ✅
2. **Document set** — resume, cover letter, qualifications, onboarding docs, tax details, bank details. **Copy from `r7_documents` (conduit) → the crm7 person's DocumentHub.** The application portal captures them; the handover re-links them to the crm7 person record (preserving file bytes in Storage or re-referencing the same object, with RLS respecting the new tenant context).
3. **Associated emails** — recruitment correspondence (application confirmation, interview threads, offer chain). **Re-link the relevant `email_messages` to the new crm7 person record** (via W1's join table) so the apprentice's timeline shows the full history.

**Trade-off — document transfer mechanism:**

| Option | Pros | Cons |
|---|---|---|
| **A. Copy Storage objects** to the crm7 person's bucket path | Clean tenant isolation; crm7 owns its copy; deletion in conduit doesn't break crm7 | Duplicates bytes (~190 MB bucket already); two copies to keep in sync if either side updates |
| **B. Re-reference the same Storage object** (crm7 DocumentHub points at the conduit object's path) | No duplication; single source | Cross-tenant RLS on the object gets hairy; conduit deletion breaks crm7's evidence trail (compliance risk) |
| **C. Copy metadata + re-reference bytes** (crm7 doc row points at the same object, but marked as "inherited from application") | No duplication + clear provenance | Same RLS/deletion coupling as B |

**Recommendation: A (copy) for compliance evidence** — employment documents are legal evidence (tax, bank, qualifications); crm7 must own an immutable copy independent of the recruitment record. The ~small per-person doc set (resume + a few PDFs) makes duplication cheap. Mark each copied doc with provenance (`source: 'application', application_id`).

**Trade-off — email handover:**

| Option | Pros | Cons |
|---|---|---|
| **A. Re-link existing email_messages** to the new person record (W1 join) | No duplication; full timeline in one place | Emails stay tenant-scoped to the recruitment context — need the join to bridge |
| **B. Copy emails** to a new person-linked set | Clean isolation | Duplicates correspondence; breaks thread continuity |

**Recommendation: A (re-link via the W1 join table)** — the apprentice's record should show the recruitment correspondence as history, not a copy.

**Build:** a `handover_to_employment(offerId)` edge function triggered on the offer-acceptance transition: (1) create the crm7 person from the handoff snapshot (existing), (2) copy the document set with provenance, (3) re-link the candidate's emails to the new person via the join table. Idempotent (re-running doesn't duplicate).

### W3 — Funding-offset on charge rates
Funding is for **registered** apprentices/trainees (employed + host-placed). Offsets charge rates.

**Trade-off — storage:**

| Option | Pros | Cons |
|---|---|---|
| **A. `funding_offsets` table** (placement_id, scheme [GWS/EIS/etc], expected_amount, received_amount, applied_at, audit) | Expected vs received split (your "upfront via R8 / received operative"); audit trail; per-placement multi-scheme | More tables/queries |
| **B. `funding_offset` column on `charge_rates`** | Simplest; directly reduces the rate | No expected/received split, no audit, single offset per rate |

**Recommendation: A (funding_offsets table)** — the expected-vs-received reconciliation + audit is the real requirement (compliance + charge-rate accuracy). The charge rate consumes the *current applied offset* (expected upfront → received on reconciliation).

**Build:** `funding_offsets` table (RLS tenant-scoped) + charge-calc `fundingOffset` term reducing the computed charge + R8 quote-time input (expected) + operative reconciliation view (expected vs received, applied to invoicing via the existing subsidy-credit path) + Jodie "apply the WA GWS subsidy to this placement's rate".

**Custom fields (operator 2026-07-24):** the funding/handover models must support **org-defined custom fields** via the existing `useCustomFieldDefinitions` + `DynamicFieldRenderer` system — orgs add their own funding schemes (beyond the built-in GWS/EIS/per-state set), document types, and correspondence fields WITHOUT code changes, per the roles/permissions-per-org doctrine and the Feature Builder vision (an org can define a custom funding scheme or a custom onboarding-document requirement and have it appear in the handover + offset flows). The `funding_offsets.scheme` field accepts custom scheme keys (not a hardcoded enum), and the handover document set respects org-defined required-document custom fields.

## Lane plan (per subagent-orchestration doctrine)

| Lane | Repo | Scope |
|---|---|---|
| L1 | crm7 | W1 email entity assignment (join table + UI + Jodie) |
| L2 | conduit + crm7 (serial — conduit first) | W2 handover edge fn (doc copy + email re-link on offer acceptance) |
| L3 | R80.3 + crm7 (serial) | W3 funding_offsets table + charge-calc offset + R8 input + reconciliation |

**Migrations:** W1 join table, W2 handover provenance columns, W3 funding_offsets — all idempotent, `auth_tenant_id()` SETOF RLS, applied via db query --linked (shared DB).

## Open questions for operator
1. **Document copy (W2):** confirm Option A (copy for immutable compliance evidence) over B/C (re-reference). Any storage-cost concern at ~190 MB current bucket?
2. **Email handover (W2):** confirm re-link (A) over copy — the apprentice timeline shows recruitment correspondence as history, not a duplicate set.
3. **Trigger point:** does the handover fire on conduit `hired` status (current convert-to-apprentice button), or on a later "employment confirmed" step (e.g. training contract signed)?
4. **Funding schemes (W3):** which schemes to model first — WA GWS + federal EIS only, or the full per-state set (links to the #667 state-incentive children)?
