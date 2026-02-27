# bsuite Pricing & Subscription Strategy

> **Date:** 2026-02-26 | **Status:** ACTIVE | **Model:** Per-User + AI Add-on | **Currency:** AUD

## Executive Summary

bsuite uses **per-seat pricing** with three feature tiers and an optional AI add-on available on every tier. Portal users (host employers, workers, RTOs) are always **free**. Volume discounts apply automatically at scale. All prices are in AUD inclusive of GST.

---

## 1. Pricing Model

### Per-User Seats

Only internal staff (admins, field officers, compliance officers, etc.) count as paid seats. Portal users are unlimited and free.

| Tier | Monthly/user | Annual/user | Min seats |
|------|-------------|-------------|-----------|
| **Essentials** | $29 | $25 | 2 |
| **Professional** ⭐ | $59 | $49 | 2 |
| **Enterprise** | $99 | $89 | 5 |

### AI Assistant Add-on (per tier)

| Tier | Monthly/user | Annual/user | Usage Cap |
|------|-------------|-------------|-----------|
| AI Essentials | $10 | $8 | 100 queries · 5 reports · 10 docs/mo |
| AI Professional | $15 | $12 | 500 queries · 25 reports · 50 docs/mo |
| AI Enterprise | $20 | $16 | Unlimited |

### Volume Discounts

| Users | Discount |
|-------|----------|
| 1–9 | — |
| 10–24 | 10% off |
| 25–49 | 15% off |
| 50+ | 20% off |

Discounts apply to both base seats and AI add-ons.

### R80 Calculator Pro (Standalone)

| | Monthly | Annual |
|---|---------|--------|
| Price | $49/mo | $39/mo (billed $468/yr) |

Included free in Professional & Enterprise. Land-and-expand entry product.

---

## 2. Feature Tiers

### Essentials — $29/user/mo
**Target:** Micro GTOs (1–100 apprentices, 2–5 staff)

- Apprentice management (100 cap)
- Host employer management (30 cap)
- R80 Calculator Pro included (Standard billing model)
- Basic compliance checklists
- Document storage (2 GB/user)
- Basic dashboard & reporting
- Email + help centre support

**Not included:** VET & training, funding claims, portals, integrations, custom fields

### Professional — $59/user/mo ⭐ Recommended
**Target:** Growing GTOs (100–500 apprentices, 5–20 staff)

- Everything in Essentials
- Unlimited apprentices & hosts
- All 3 billing models (Standard, ALEX48, W52)
- Full WHS & compliance suite
- VET & training management
- State funding claims
- Timesheets & payroll management
- Sales pipeline
- Host OR Worker portal (1 type)
- Xero integration + basic API
- Fair Work award auto-alerts
- GTO Standards assessment
- Phone + email support

### Enterprise — $99/user/mo
**Target:** Large GTOs & labour hire (500+ apprentices, 20+ staff)

- Everything in Professional
- Charge rate scenario planning
- Custom compliance frameworks
- Full TGA integration
- All funding sources
- All portals (Host + Worker + RTO)
- Full API + SSO/SAML + webhooks
- Custom reports + BI connector
- Email automation + bulk comms
- Fair Work award auto-apply
- Unlimited custom fields
- Audit preparation tools
- Dedicated account manager

---

## 3. Stripe Products & Prices

All products are **live AUD per-seat** prices.

### Products

| Product | Stripe Product ID |
|---------|------------------|
| bsuite Essentials | `prod_U38e8Z5pWPwIp7` |
| bsuite Professional | `prod_U38eDo8BxO5DOo` |
| bsuite Enterprise | `prod_U38emY06cLC49H` |
| AI Assistant Essentials | `prod_U38efwmyrOdFiB` |
| AI Assistant Professional | `prod_U38eJ3n9RAoHpS` |
| AI Assistant Enterprise | `prod_U38ersFMfSFZgD` |
| R80 Calculator Pro | `prod_U38eYkUnHumj7A` |

### Prices

| Item | Billing | AUD | Stripe Price ID |
|------|---------|-----|-----------------|
| Essentials | Monthly | $29/seat | `price_1T52MsAYIAu3GrrMcQU3GcPO` |
| Essentials | Annual | $300/seat/yr | `price_1T52MtAYIAu3GrrMPQMdT3oT` |
| Professional | Monthly | $59/seat | `price_1T52MuAYIAu3GrrMUxpfS6Es` |
| Professional | Annual | $588/seat/yr | `price_1T52MuAYIAu3GrrMw2GhDnUr` |
| Enterprise | Monthly | $99/seat | `price_1T52MwAYIAu3GrrMCnFcv0zR` |
| Enterprise | Annual | $1,068/seat/yr | `price_1T52MwAYIAu3GrrMVMp9dxb7` |
| AI Essentials | Monthly | $10/seat | `price_1T52MxAYIAu3GrrM69cW5LQ6` |
| AI Essentials | Annual | $96/seat/yr | `price_1T52MyAYIAu3GrrMSH82sdAC` |
| AI Professional | Monthly | $15/seat | `price_1T52MzAYIAu3GrrMvPMv4dIA` |
| AI Professional | Annual | $144/seat/yr | `price_1T52MzAYIAu3GrrM1IgEbrjc` |
| AI Enterprise | Monthly | $20/seat | `price_1T52N0AYIAu3GrrMjlk9ndjj` |
| AI Enterprise | Annual | $192/seat/yr | `price_1T52N1AYIAu3GrrM2BOXQn5z` |
| R80 Calculator | Monthly | $49 flat | `price_1T52N2AYIAu3GrrMO3Z4rhmu` |
| R80 Calculator | Annual | $468/yr flat | `price_1T52N2AYIAu3GrrMvWDjG4ho` |

> All legacy products have been **archived** in Stripe.

---

## 4. Market Context

### 4.1 TAM
- ~150 registered GTOs nationally
- ~4,000 RTOs (ASQA register)
- ~50,000+ host employers using GTO services
- ~100,000+ active apprentices/trainees under GTO management

### 4.2 Key Insight
GTO-employed apprentices are **18% more likely to complete** than direct-employed. In priority industries, completion rates are **40%+ higher**.

---

## 5. Competitor Pricing

| Competitor | Model | AUD/mo | Notes |
|-----------|-------|--------|-------|
| **aXcelerate** | Per-learner, POA | $500–$2,000+ | No charge rate calc |
| **VETtrak Cloud** | Per-student annual | $5k–$30k/yr | Legacy, no GTO tools |
| **Wisenet** | Per-active-learner tiers | $290–$770 | No charge rates |
| **CloudAssess** | Annual | ~$5k+/yr | Assessment only |
| **RTOSafe** | Per-user tiers | $295–$995 | RTO compliance only |
| **Arlo** | Per-admin + per-reg | $125–$285/admin | No apprenticeships |
| **Workit** | Per-employee | $5/employee | Generic HR |

bsuite is the **only GTO-first** platform combining charge rates + CRM + WHS + VET + portals.

---

## 6. Org Size Segmentation & Example Pricing

| Segment | Staff | Plan | Base/mo (annual) | + AI/mo | Total/mo |
|---------|-------|------|-----------------|---------|----------|
| Micro GTO | 3 | Essentials | $75 | +$24 | $75–$99 |
| Small GTO | 8 | Professional | $392 | +$96 | $392–$488 |
| Medium GTO | 20 | Professional | $882¹ | +$216¹ | $882–$1,098 |
| Large GTO | 50 | Enterprise | $3,560² | +$640² | $3,560–$4,200 |

¹ 10% volume discount applied · ² 20% volume discount applied

---

## 7. Revenue Projections (Per-User Model)

### Year 1 — 15 orgs, ~80 total seats

| | Orgs | Avg seats | Plan | MRR |
|---|------|-----------|------|-----|
| Essentials | 5 | 3 | $25/seat | $375 |
| Professional | 7 | 8 | $49/seat | $2,744 |
| Enterprise | 3 | 15 | $89/seat | $4,005 |
| AI add-on (~40%) | — | ~32 seats | ~$12 avg | $384 |
| R80 standalone | 10 | — | $39/mo | $390 |
| **Total** | **25** | | | **$7,898 MRR · $94,776 ARR** |

### Year 3 — 60 orgs, ~400 total seats

| | Orgs | Avg seats | Plan | MRR |
|---|------|-----------|------|-----|
| Essentials | 15 | 3 | $25 | $1,125 |
| Professional | 30 | 10 | $49 | $14,700 |
| Enterprise | 15 | 25 | $89 | $33,375 |
| AI add-on (~60%) | — | ~240 seats | ~$14 avg | $3,360 |
| R80 standalone | 30 | — | $39 | $1,170 |
| **Total** | **90** | | | **$53,730 MRR · $644,760 ARR** |

---

## 8. Additional Revenue Streams

| Stream | Price | When |
|--------|-------|------|
| Implementation/onboarding | $500–$2,000 | At signup |
| Data migration | $500–$3,000 | At signup |
| Custom report development | $500–$2,000/report | On-demand |
| Training sessions | $200–$500/session | Ongoing |
| SMS/email credits (overage) | $0.05/SMS, $0.003/email | Metered |
| White-label (AEN) | POA | Partnership |

---

## 9. Access Levels & Role Gating

### Subscription-Based Roles

| Role | Essentials | Professional | Enterprise | Type |
|------|-----------|-------------|------------|------|
| Admin | ✅ | ✅ | ✅ | Full app |
| Field Officer | ❌ | ✅ | ✅ | Full (scoped) |
| Host Employer | ❌ | ✅ portal | ✅ portal | Free portal |
| Worker/Apprentice | ❌ | ✅ portal | ✅ portal | Free portal |
| RTO/Training Provider | ❌ | ❌ | ✅ portal | Free portal |
| Viewer (read-only) | ✅ | ✅ | ✅ | Full (read) |

### Platform-Level Roles (above subscription tiers)

These roles bypass subscription checks entirely and are managed via the Platform Developer Role System (`profiles.platform_role` column).

| Platform Role | Access | Billing | How Assigned | UI |
|--------------|--------|---------|-------------|-----|
| **Developer** | Universal — all features, all orgs, all permissions | Free — never charged | Hardcoded emails (`braden.lang77@gmail.com`, `braden@braden.com.au`), auto-set on profile creation | Purple "Developer" badge, floating DeveloperToolbar, org impersonation |
| **Tester** | Full — equivalent to Enterprise admin | Free — active tester license bypasses billing | Granted via Tester License system (`/settings/tester-licenses`), convertible to paid | Blue "Tester" badge, floating toolbar |
| **User** | Standard — subject to org subscription tier | Per-seat pricing applies | Default for all signups | No toolbar |

**Developer capabilities beyond standard admin:**
- Org impersonation with full audit transparency (org admins see all sessions)
- Tenant switching across all organizations
- Tester license management (grant, revoke, convert to paid)
- Audit log visibility across all tenants

**Tester license lifecycle:**
1. Developer grants license by email → status: `active`
2. Tester signs up with that email → auto-assigned `platform_role = 'tester'`
3. Tester evaluates product with full Enterprise-level access at no cost
4. Developer converts to paid → status: `converted`, user becomes standard `user`
5. Or developer revokes → status: `revoked`, access downgraded

---

## 10. Go-To-Market

1. **Land:** R80 Calculator free trial → $49/mo standalone → upsell to CRM
2. **Expand:** Micro GTOs on Essentials → grow into Professional
3. **Scale:** Enterprise deals, RTO cross-sell, labour hire, API ecosystem

---

## 11. Implementation Status

- [x] Stripe products & prices created (AUD, per-seat, live)
- [x] Legacy USD products archived
- [x] pricing-data.ts source of truth
- [x] Pricing page with per-user cards, team slider, AI toggle
- [x] Platform Developer Role System — `platform_role` column, tester licenses, org impersonation, DeveloperToolbar, subscription bypass (27 Feb 2026)
- [x] Permission integration — `use-permissions.ts` checks `isPrivileged` for billing/access bypass
- [ ] Stripe Checkout Edge Function
- [ ] Subscription management (Customer Portal)
- [ ] Feature flags by subscription tier
- [ ] Stripe webhooks for subscription events
- [ ] R80 standalone checkout flow
