# BSuite vs Competitors — Capability Matrix & Completion Ledger

> **Naming:** `20260723-bsuite-capability-matrix-v1.00W.md` · Status **W** (Working) · Feeds the completion program (`docs/plans/20260723-completion-program-refined-v1.00D.md`).
> **Sources (evidence-linked, no unsourced claims):** Code House AnyTime/Workforce One Admin Guide (local `docs/20260723-Anytime-WorkforceOne-Admin-Guide.md`, 70+ capabilities), Code House knowledgebase (205 articles, 17 S3 PDFs — `codehouse-knowledgebase-crawl.md`), ReadyTech public site (Ready Recruit/Apprentice/Workforce/Pay), aXcelerate public site, roadmap sweep (125 open items).
> **Legend:** ✅ full · 🟡 partial/parallel · ❌ absent · ❓ unverified publicly

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
| No-code page/feature builder | ❌ | ❌ | ✅ (Feature Builder 8/8 live) | **BSuite advantage (north-star)** |
| AI assistant | ❌ | ❓ | ✅ (Jodie, all apps) | **BSuite advantage** |

---

## 3. Competitive gaps → completion ledger (prioritised)

Sourced from matrix ❌/🟡/❓ cells + roadmap sweep's 125 open items. **P0** = competitive-critical or operator-blocked; **P1** = parity; **P2** = modern-surface/incremental.

### P0 (operator-blocked / critical)
1. **crm7#1129** cross-tenant FK leakage (FutureBuild) — operator sign-off required (data repair).
2. **bsuite#1322** Supabase → ap-southeast-2 (Sydney) migration — operator-blocked (external).
3. **crm7#479** Xero app registration + feature-flag flip — operator-blocked.
4. **bsuite#607** BSU missing VITE_APP_URL + VITE_STRIPE_PUBLISHABLE_KEY — operator quick-add.
5. **conduit#338** RAMS lodgement status/callback contract — external contract needed.
6. **crm7#1177** signed-out crm.crm7.app has no public landing (P0 UX).

### P1 (competitive parity — award/timesheet/GTO depth)
7. **Award-interpretation parity audit** (new): map @bsuite/charge-calc vs AnyTime Pay Item Rules (daily/weekly/fortnightly award rules, penalty MF, max-hours-break, allowance rules). Close any rule-type gaps in R80.3.
8. **Timesheet approval-chain depth** (new): verify crm7 two-tier approval, bulk ops, unsubmit-with-reason + email/SMS notifications; close gaps.
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
