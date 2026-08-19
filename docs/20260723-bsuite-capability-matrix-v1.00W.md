# BSuite vs Competitors — Capability Matrix & Completion Ledger

> **Naming:** `20260723-bsuite-capability-matrix-v1.00W.md` · Status **W** (Working) · Feeds the completion program (`docs/plans/20260723-completion-program-refined-v1.00D.md`).
> **Sources (evidence-linked, no unsourced claims):** Code House AnyTime/Workforce One Admin Guide (local `docs/20260723-Anytime-WorkforceOne-Admin-Guide.md`, 70+ capabilities), Code House knowledgebase (205 articles, 17 S3 PDFs — `codehouse-knowledgebase-crawl.md`), ReadyTech public site (Ready Recruit/Apprentice/Workforce/Pay), aXcelerate public site, roadmap sweep (125 open items).
> **Legend:** ✅ full · 🟡 partial/parallel · ❌ absent · ❓ unverified publicly

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Product positioning (who actually competes with BSuite)

| Product | Segment | GTO-purpose-built? | Verdict |
|---|---|---|---|
| **Code House Workforce One + AnyTime** | Recruitment/labour-hire + GTO payroll/timesheets | 🟡 (WfO is recruitment-first; AnyTime adds GTO timesheet/award engine) | **Direct competitor** — deepest award/timesheet surface |
| **ReadyTech Ready Recruit** | GTOs (TPES-accredited) | ✅ | **Direct competitor** — purpose-built GTO, field-officer mobile, case mgmt |
| ReadyTech Ready Apprentice | AASNs | ❌ (AASN, not GTO) | Adjacent (claims/incentive mgmt) |
| ReadyTech Ready Workforce/Pay | Workforce/payroll (AU/NZ) | ❌ | Adjacent (award interpretation, payroll) |
| aXcelerate | RTO/University/Gov/Enterprise | ❌ (Work-Based Learning is RTO-centric) | **Not a GTO competitor** — confirmed |
| **BSuite** | GTOs (crm7 apprentices/placements, R80.3 award calc, conduit ATS, BSU portal) | ✅ | — |

**Takeaway:** BSuite's true competitive set is **Code House WfO+AnyTime** (award/timesheet depth) and **ReadyTech Ready Recruit** (GTO purpose + field-officer mobile). aXcelerate competes only on the RTO/training-delivery edge (competency, LMS, logbook) — a surface BSuite covers via VET & Training, not its core.

---

## 2. Capability matrix (GTO-relevant domains)

### Timesheets & approval workflow
| Capability | Code House AnyTime | Ready Recruit | BSuite | Gap |
|---|---|---|---|---|
| Two-tier approval (employee→supervisor→admin) | ✅ | 🟡 (workflow automation) | 🟡 (timesheets exist; approval chain depth ❓) | **Verify crm7 approval tiers** |
| Bulk approve / bulk ready-to-upload | ✅ | ✅ (bulk actions) | ❓ | — |
| Admin unsubmit/reject with mandatory reason + email/SMS | ✅ | ✅ | ❓ | — |
| Missing-timesheet list + CSV + notify | ✅ | ✅ | ✅ (crm7 payroll/missing-timesheets) | — |
| Admin timesheet entry (auto-coded, copy-down) | ✅ | ❓ | ❓ | — |
| Timesheet attachments (up to 3) | ✅ | ❓ | ❓ | — |
| Pay period streams (isolate by week-ending day) | ✅ | ❓ | 🟡 (pay_periods + streams tables exist) | Verify stream isolation UX |

### Award interpretation / payroll (deepest competitor surface)
| Capability | Code House (Pay Item Rules) | Ready Workforce/Pay | BSuite (R80.3 charge-calc) | Gap |
|---|---|---|---|---|
| Daily shift rules (start/end, day-of-week) | ✅ | ✅ | 🟡 (@bsuite/charge-calc engine) | **Parity audit needed** |
| Penalty rules + multiplication factors | ✅ | ✅ | 🟡 | — |
| Max-hours-without-break reclassification | ✅ | ❓ | ❓ | — |
| Daily/Weekly/Fortnightly award rules (overtime reclass) | ✅ | ✅ | 🟡 | — |
| Allowance rules (threshold-hours + MF + cap) | ✅ | ✅ | 🟡 | — |
| Auto-coding on submit + admin override | ✅ | ✅ | ❓ | — |
| STP Phase 2 / Payday Super (OZEDI, QuickSuper) | ✅ | ✅ (ATO compliant) | ❓ | **Integration surface** |
| RCTI (recipient-created tax invoice) | ✅ | ❓ | ❓ | — |

### GTO / apprentice management
| Capability | Code House WfO | Ready Recruit | BSuite (crm7) | Gap |
|---|---|---|---|---|
| Purpose-built GTO platform | 🟡 | ✅ (TPES-accredited) | ✅ | — |
| Recruitment pipeline (sign-up→approval) | ✅ | ✅ | ✅ (conduit ATS) | — |
| Case management (apprentices) | ✅ | ✅ | ✅ (crm7) | — |
| Field-officer mobile tools (offline visits, incidents, reviews) | ❓ | ✅ (explicit mobile) | 🟡 (crm7 field-officers pages; mobile/offline ❓) | **Mobile/offline parity** |
| Host employer management | ✅ | ✅ | ✅ (crm7 hosts) | — |
| Placements (pay-cycle, supervisor, award link) | ✅ | ✅ | ✅ (crm7 placements) | — |
| AVETMISS / STA reporting | ❓ | ❓ (in AASN product) | 🟡 (crm7 compliance/avetmiss, #476 open) | **WS-6 completion** |
| Self-service portal (employer/RTO/apprentice) | ✅ (AnyTime roles) | ✅ | 🟡 (crm7 portal subroutes, WS-9 open) | — |
| Claims/incentive management (AASN) | ❌ (GTO product) | ✅ (Ready Apprentice) | 🟡 (crm7 funding/claims) | — |

### Platform / modern surface
| Capability | Code House | ReadyTech | BSuite | Gap |
|---|---|---|---|---|
| API surface | ❌ (sync script + manual export only) | ✅ (open ecosystem) | ✅ (Supabase + edge fns) | **BSuite advantage** |
| MFA | ❌ (none mentioned) | ❓ | ✅ (Supabase MFA-capable) | **BSuite advantage** |
| Mobile-native | ❌ (responsive web) | ✅ (mobile app) | 🟡 (PWA) | — |
| Realtime collab | ❌ | ❓ | ✅ (RealtimeCursors in conduit) | **BSuite advantage** |
| SSO (Microsoft) | ✅ | ✅ | ✅ (BS OAuth 2.1 + Azure) | Parity |
| No-code page/feature builder | ❌ | ❌ | 🟡 (Feature Builder — see note below table) | **BSuite advantage (north-star), not yet delivered end-to-end** |
| AI assistant | ❌ | ❓ | ✅ (Jodie, all apps) | **BSuite advantage** |

> **Feature Builder score correction (2026-08-11).** This row previously read "✅ Feature Builder 8/8 live" — live end-to-end testing the same day found 2 of 6 developer-journey steps actually working: **create ✅, connect ✅, page 🟡 (partial), form ❌ (absent), nav 🟡 (partial), permission 🟡 (partial — required raw SQL for the security policy)**. Root cause for most of the page/form/nav gaps: `apply_feature_migration` created real DDL and never inserted into `tenant_entities`, the one table the page-builder widget palette, the nav-assignment screen, and Feature Builder's own "browse existing" all read — the entity existed in the database and was invisible everywhere a developer would next look for it. `docs/plans/20260811-feature-builder-world-class-refined.md` tracks the fix; `business-suite-unified` PR #691 (2026-08-11) closes the SQL-permission gap (removed the `custom_sql` textarea, added a `tenant_subtree` no-code rule, added a typed-handle relationship canvas with cycle prevention) and the three defects behind the registration/page/nav failures (entity registration, idempotent RLS re-apply, a rollback path) — pending merge and a live re-verification pass before this row can move back to a full ✅. Page (widget-driven page composition), form (a dedicated form-builder surface), and nav (full assignment flow) remain **not yet delivered end-to-end** and are out of scope for PR #691; they are the next slice of this north-star item.

---

## 3. Competitive gaps → completion ledger (prioritised)

Sourced from matrix ❌/🟡/❓ cells + roadmap sweep's 125 open items. **P0** = competitive-critical or operator-blocked; **P1** = parity; **P2** = modern-surface/incremental.

### P0 (operator-blocked / critical) — RESOLVED 2026-07-24
1. ~~crm7#1129 cross-tenant FK leakage~~ — **NOT A BUG (verified + operator ruling).** Both the placements AND employer `7ff22cf9` carry `tenant_id = b550d66c` (FutureBuild Academy). The employer is a host-employer record within FutureBuild's own tenant. Operator ruling: MBAWA = parent of FutureBuild, acts only as FutureBuild — no separate org, no leak. **Closed.**
2. ~~crm7#479 Xero~~ — **DONE.** Registration complete; multi-tenant connect flow built (auth-code vs single app, per-tenant tokens, SEC-001); flag defaults true. **Closed.**
3. ~~bsuite#607 env vars~~ — **FALSE POSITIVE.** `VITE_APP_URL` set; `VITE_STRIPE_PUBLISHABLE_KEY` only in the env checklist, never consumed by checkout. Commented.
4. ~~conduit#338 RAMS webhook~~ — **REFRAMED (operator 2026-07-24).** RAMS/ADMS is the *federal funding-claims* channel, NOT the training-contract registrar. Training-contract status arrives via **STA email (e.g. DTWD in WA) + WAAMS portal state** — the AASN/AASS (Apprentice Connect Provider) drafts + lodges to the state authority, approval comes back by email. So the real mechanism is **email ingestion** (user connects Microsoft/Google/SMTP; system tracks STA/WAAMS emails, parses status → flips `lodgement_outcome`). Ties into the email-integration surface (crm7#480). → P1 build item (email ingestion + status parser), not an external-contract block.
5. ~~bsuite#1322 Supabase Sydney migration~~ — operator decision (unverified this pass).

**Remaining P0: NONE verified.** The last unverified item is bsuite#1322 (operator decision on region migration).

### P1 (competitive parity — award/timesheet/GTO depth)
7. **Award-interpretation parity — ARCHITECTURAL (audited 2026-07-23, corrected same-day):** @bsuite/charge-calc BOOT engine (`boot/compare.ts`, `EATerms` vs `AwardSchedule`, per-scenario weeklyBreakdown with Sat/Sun/PH/OT/shift loadings, non-monetary comparison, F17 export) IS the award-interpretation CORE. The genuine gap vs AnyTime is a **per-shift conditional interpreter** (start/end-time, day-of-week, break-detection, auto-coding on timesheet submit) — a layer that *feeds* the BOOT engine, not a rebuild of it. **BOOT scope (operator-corrected):** EBAs arrive pre-BOOT-approved (FWC-ratified) — the engine does NOT re-test them. It BOOT-tests **custom rates**: informal host-employer/worker arrangements trading award provisions for compensation elsewhere (e.g. +$X/hour flat in exchange for foregoing certain allowances) — legal only if better off overall, with the underlying award as fallback for uncovered scenarios or on challenge. Global assessment (not item-by-item), real-world work patterns, reconsideration on change — per Secure Jobs, Better Pay reforms. EBAs may point sections to the award or fully replace it; custom rates likewise sit on top of the award fallback. Candidate home for the interpreter: R80.3 payroll composer (#320/#321 chain) or a new @bsuite/award-interpreter package. Jodie: BOOT checks, custom-rate creation, and interpretation all exposed as Jodie tools (AI-licence-gated).
8. **Timesheet approval-chain depth (audited 2026-07-23):** crm7 has a solid 7-state two-tier machine (`timesheetWorkflow.ts:44-52`, audit events, in-app notifications) — BETTER than expected. Gaps to close: (a) email/SMS notification layer on transitions (currently in-app only); (b) bulk ops beyond the host-approval tier; (c) pay_period_streams frontend usage (DB exists — 20260707000021 — zero UI); (d) per-period status dashboard (expected/approved/awaiting/not-submitted counts); (e) missing-timesheet print/CSV/notify export; (f) admin timesheet entry auto-coding + auto-approve.
9. **Payroll/invoicing chain** R80.3 #320→#321→#233 (extract @bsuite/stp, payroll composer, GTO per-host weekly invoicing).
10. **CRM7 GTO compliance reports** #528/#530/#531/#532/#533 (Portable LSL, host monthly pack, NSGTO Std 2, STP2 allowances, s.535 retention).
11. **Conduit recruitment intake chain** #219→#218→#231 (candidate schema, public apply, CRM7 cross-read).
12. **AVETMISS WS-6** crm7#476 (v_avetmiss_client_data, export edge fn, NAT files, STA variants).
13. **Field-officer mobile/offline parity** (new): Ready Recruit's explicit mobile FO tools vs crm7 field-officers pages — verify offline capability.
14. **bsuite#1617 / #1615** crm7 + all submodules development behind main (d.* stale) — infra.
15. **crm7#1123** multi-tenant users land in arbitrary tenant on login (auth/UX).
16. **crm7#1125** hosts/create discards Safety Rating + Compliance Status (DB/compliance).
17. **bsuite#1610** LocalisedDateInput copy-paste across 4 apps, R80.3 DOB wipes.
18. **crm7#1124** person-detail cold load ~7s (perf).

### P1 (blocked-on-Braden-review — domain decisions)
- **B1** crm7 entity-entry wizards (#659–#662) — domain review of wizard specs.
- **B2** crm7 forward-year charge schedule + annual-review gate (#678) — compliance-critical billing.
- **B3** crm7 54 new doc categories sensitive/expiry flags (#1128) — compliance review.
- **B4** crm7 host safety rating 7/10 → red threshold (#1142) — domain decision.
- **B5** = P0 #1129 (operator sign-off).

### P2 (modern surface / incremental — BSuite already leads)
- **suite.crm7.app landing-page dot-grid pattern missing** (operator-reported 2026-07-23, not urgent): the marketing landing (MarketingHome) doesn't render the D2C dot-grid pattern — the DotPattern layer lives in the authenticated app shell (AppContent), not the public landing. Add the pattern to the landing for brand consistency (dot-pattern.tsx exists in @bsuite/ui).
- STP Phase 2 / Payday Super integrations (OZEDI/QuickSuper) — integration surface.
- RCTI support.
- Xero cluster crm7 #556–#565 (gated on #479).
- Portals WS-9 (apprentice/host/FO subroutes).
- braden visual layout editor (#264–#266).
- Cross-app notifications (#480), unified settings, usage analytics.
- Test coverage 70% targets; WCAG AA contrast fixes (#1182/#1179/#1150); CI WebKit target (#1173).

---

## 4. User-manual program (seeded from matrix)

BSuite's manual set should mirror the competitor's proven doc architecture (AnyTime's role-based guides) while covering BSuite's larger surface. **Dual hosting (operator-approved):** docs site for platform/developer + in-app (CustomPageRenderer) for tenant-facing.

| Manual | Audience | Content seed (matrix rows) | Competitor parallel |
|---|---|---|---|
| **Developer / Platform Admin Guide** | developer | Feature Builder, Page Builder, nav editor, tenant assignment, branding cascade, publish/deploy, OAuth 2.1 ops | — (competitors lack this) |
| **Enterprise Admin Guide** | enterprise super admin | Sub-orgs, tenant provisioning (Option B), platform reports, feature assignment | WfO Admin Guide |
| **Org Admin Guide** | org admin | Timesheets approval workflow, pay periods/streams, placements, hosts, award setup (charge-calc), leave, reports, doc management | **AnyTime Admin Guide** (direct parallel) |
| **Field Officer Guide** | field officers | Mobile visits, case notes, incidents, monitoring, competency | Ready Recruit FO tools |
| **Employee / Apprentice Guide** | end users | Timesheet entry, leave apply, portal, documents | AnyTime Employee/OTS Employee Guide |
| **Host / Client Guide** | host employers, line managers | Approve timesheets, placements, portal | AnyTime Client/OTS Client Guide |
| **Payroll / Finance Guide** | payroll officers | charge-calc, pay item setup, STP, invoicing, RCTI (when built) | WfO Payroll guides (MVR, Payday Super, RCTI) |

**OAuth 2.1 compliance** is a standing gate (2026-07-23 audit: COMPLIANT, no drift) — every auth-touching manual section must reference `agents/supabase-auth-comprehensive` doctrine (JWKS, PKCE localStorage, idempotent callbacks, exact-match redirects).

---

## 5. Next actions
1. **Operator:** clear the 5 P0 blocks (Xero rego, Supabase Sydney migration decision, BSU env vars, RAMS contract, #1129 sign-off) + 4 domain reviews (B1–B4).
2. **Lane dispatch (parity):** award-interpretation parity audit + timesheet approval-chain depth audit → R80.3/crm7 gap fixes.
3. **Manual program:** brainstorming → design approval → writing-plans (this is the next creative work; HARD-GATE on implementation until design approved).
4. **OAuth CI gate:** wire the 7-probe audit as a merge-blocking check (operator-chosen cadence).
