# Email + Funding Expansion — Scope

> **Naming:** `20260724-email-funding-expansion-scope-v1.00F.md` · Status **D** (Draft — brainstorm per `agents/brainstorming`, needs operator design approval before build) · Operator directives 2026-07-24.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Operator directives (this session)

1. **Email ingestion → recruitment activities**: confirmation emails for job applications, all emails + calendar events tied to recruitment. Needs a recruiter-requirements brainstorm (what recruiters actually require).
2. **Funding model**: funding is for **registered** apprentices/trainees (already employed + placed with a host employer). Funding expected/received **offsets charge rates** — settable upfront via **R8** (R80.3) or in the **operative section**. Not a standalone ledger — a charge-rate input.
3. **crm7 Communications**: users add Google/Microsoft/SMTP accounts, send+receive email in crm7, check inbox, and **assign emails to entities** (contact, people, client, host, AASN/AASS providers).

## Current state (verified 2026-07-24)

- **Mail connect: BUILT.** `crm7/src/pages/settings/email-accounts.tsx` supports Google, Microsoft, IMAP, SMTP — rides the existing Google/Azure OAuth client creds (no new provider setup). Edge fns `oauth-google-email`, `oauth-microsoft-email`, `encrypt-email-tokens` exist.
- **Inbox: EXISTS.** `email_messages` table (direction, from/to/cc/bcc, body_html/text, thread_id, is_read, integration_id, contact_id, lead_id) + `emailService` + Communications surface (compose, mail-merge, templates, `communications/index.tsx`).
- **Entity assignment: PARTIAL.** `email_messages` has `contact_id` + `lead_id` FKs only. No people/client/host/AASN links, and no assignment UI.
- **Funding-offset: NOT MODELLED** as a charge-rate input (GWS/EIS subsidy credits exist in R80.3 invoicingService but not as a configurable funding-offset on the charge rate).

## The three workstreams

### W1 — Email entity assignment (crm7)
- Extend `email_messages` (or a join table `email_message_links`) to link to **people, clients, employers (hosts), AASN/AASS providers** beyond contact/lead.
- Assignment UI on the inbox: assign an email (or thread) to an entity; show assigned entity chips on inbox rows; filter by entity.
- Auto-suggest assignment by sender/recipient email match to known entities.
- Jodie: "assign this email to X" (AI-licence-gated).

### W2 — Recruiter email/calendar requirements (crm7 + conduit)
Brainstorm what recruiters require (per `agents/brainstorming`):
- Confirmation/acknowledgement emails auto-sent on job application receipt (template + trigger).
- Track all emails + calendar events against a candidate/application (recruitment timeline).
- Interview scheduling from the inbox (calendar event → link to application).
- Status-change notifications to the candidate (offer, rejection, next-step).
- This is the conduit#223 (online assessment) + recruitment-comms cluster — fold into a unified recruiter-comms design.

### W3 — Funding-offset on charge rates (R80.3 + crm7)
- Funding is for **registered** apprentices/trainees (employed + host-placed). Model `funding_offset` as a charge-rate input:
  - **Upfront (R8)**: set expected funding at quote time → reduces the charge rate presented to the host.
  - **Operative section**: record funding received → reconciles the offset against actual.
- Offset the charge rate in @bsuite/charge-calc (a `fundingOffset` term that reduces the computed hourly/annual charge).
- Reconciliation view: expected vs received funding per placement, with the offset applied to invoicing (R80.3 invoicingService already has GWS/EIS subsidy credits — unify).
- Jodie: "apply the WA GWS subsidy to this placement's charge rate" (AI-licence-gated).

## Open design questions (for operator — brainstorm)

1. **Entity-assignment model**: single nullable FK per entity type on `email_messages` (people_id, client_id, employer_id, aasn_id) vs a polymorphic `email_message_links` join table (one row per email↔entity, supports multi-link)? I lean to the join table (an email can relate to a person AND their host).
2. **Funding-offset source of truth**: does the offset live on the `charge_rates` row (a funding_offset column) or as a separate `funding_offsets` table keyed by placement (expected vs received, audit trail)? I lean to a separate table (audit + expected/received split).
3. **Recruitment scope**: does W2 stay in crm7, or does conduit own the candidate-facing comms (DRY one-shot: conduit owns recruitment, crm7 reads)? Recommend conduit owns candidate comms, crm7 surfaces the apprentice-side timeline.

## Doctrine reminders
- Mail connect is DONE — do NOT rebuild it. The work is inbox/assignment (W1), recruiter-comms (W2), funding-offset (W3).
- Google/Azure OAuth creds exist — mail-connect rides them; no new provider registration.
- DRY one-shot: conduit owns recruitment; crm7 owns apprentice management + comms; R80.3 owns charge-calc/payroll.
