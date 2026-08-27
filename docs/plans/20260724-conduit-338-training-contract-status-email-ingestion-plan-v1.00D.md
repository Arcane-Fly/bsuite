# conduit#338 — Training-Contract Status Signal (Email Ingestion) — Build Scope

> **Naming:** `20260724-conduit-338-training-contract-status-email-ingestion-plan-v1.00D.md` · Status **D** (Draft — pending per-state portal map from research lane) · Operator-corrected model 2026-07-24.

## The correct model (operator ruling)

- **RAMS/ADMS** = the *federal funding-claims* channel (incentive payments), NOT the training-contract registrar. (crm7 already holds `VITE_RAM_CLIENT_ID` + `VITE_RAM_CREDENTIAL_ENVIRONMENT` for the claims path.)
- **Training contract lifecycle:** Apprentice Connect Provider (AASN/AASS) drafts → employer + apprentice sign → RTO nominated → **AASN lodges to the State/Territory Training Authority (STA)** → STA approves → **approval signal arrives via STA email to the GTO + status change in the state's apprenticeship-management portal** (WA = WAAMS).
- Each state/territory has its own STA + portal with a state-specific name (WA = DTWD + WAAMS; others mapped in § below — pending research).

## What conduit already has

- `r7_offers.lodgement_outcome` (`pending → accepted | rejected | needs_info`), `lodgement_reference`, `lodged_with_sta_at` (conduit#227, shipped).
- `offerStateMachine.ts`: convert-to-apprentice handoff gated on the STA lodgement outcome.
- The **gap:** nothing flips `lodgement_outcome` from `pending` — the inbound signal is unhandled.

## The build (email ingestion, NOT a RAMS webhook)

Rides the existing mail-connect surface (`crm7/src/services/emailService.ts` — Google/Microsoft/SMTP/IMAP integrations with sync status + scopes):

1. **Mail connect (reuse/extend):** user connects their Microsoft / Google / SMTP inbox (OAuth via the existing Azure/Google client creds, or SMTP) and grants read access for tracking. Tenant-scoped integration rows already exist.
2. **Inbound email watcher:** a scheduled edge function polls the connected inbox for messages from the STA / state-portal sender domains (per-state list — see § map).
3. **Status parser:** per-state parsers extract the training-contract outcome from the approval email (contract/reference number + new status). STA emails are structured (reference number, employer, apprentice, outcome) — parse to `accepted | rejected | needs_info`.
4. **Outcome flip:** match the parsed reference to `r7_offers.lodgement_reference` → transition `lodgement_outcome` per `offerStateMachine` → unblock convert-to-apprentice + notify the GTO.
5. **Audit:** log every ingested STA email + the resulting state transition (email_messages migration from crm7#480 is the persistence surface).

## Per-state STA + portal map (confirmed 2026-07-24, research lane deleg_2a47a187)

| State/Territory | STA (approves contract) | Portal / System (status tracked) | Approval channel |
|---|---|---|---|
| WA | Apprenticeship Office (Dept of Training & Workforce Development / DTWD) | WAAMS (WA Apprenticeship Management System) | STA email + WAAMS status |
| VIC | Victorian Registration & Qualifications Authority (VRQA) | Epsilon | STA email + Epsilon status |
| NSW | Training Services NSW (Dept of Education) | STS Online (Skills Training Services Online) | STA email + STS Online status |
| QLD | Department of Trade, Employment and Training (DTET) | Partner Portal (portal.desbt.qld.gov.au) | STA letter/email + Partner Portal status |
| SA | Department of Education (Skills SA) | mySkillsSA (replacing legacy ATLAS) | STA email + mySkillsSA status |
| TAS | Skills Tasmania | e-VET Portal | STA email + e-VET status |
| ACT | Skills Canberra | AVETARS (ACT VET Administration Records System) | STA email + AVETARS status |
| NT | Department of Education and Training | NT Apprenticeships & Traineeships Database (public search DB, NO contract-management portal) | **STA email/letter only** |

**Notes:** 7 of 8 states have a named contract-management portal. NT is the exception — email/letter only. SA is mid-transition (ATLAS → mySkillsSA). Sources: `australianapprenticeships.gov.au/state-and-territory-training-authorities` + per-state .gov.au pages (see research lane output).

## Open design questions (for operator when scoping the lane)

1. **MVP scope:** WA-only first (DTWD + WAAMS — the FutureBuild/home state), or all 8 states in one pass?
2. **Mail-connect ownership:** conduit#338 needs the inbox connection — does it reuse crm7's `emailService` integrations cross-app (shared Supabase), or does conduit get its own connect UI? (DRY one-shot: crm7 owns comms; conduit reads.)
3. **Parser confidence:** STA email formats vary — start with a structured-reference match + manual-confirm queue for low-confidence parses, or fully-auto?
