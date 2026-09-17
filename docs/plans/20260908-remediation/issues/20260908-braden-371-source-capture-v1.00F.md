---
kind: record
authority: none
owner: bsuite
---

# Wire the remaining Braden marketing surfaces to the CMS so they are editable from the BSU Developer Portal (services, SEO, aria-labels)

https://github.com/GaryOcean428/braden/issues/371

Snapshot updatedAt: 2026-08-31T02:45:27Z. Open at capture; re-read live.

Implements **operator RULING 0.5 (2026-08-08)**, §16.10 audit.

> *"Audit product copy, empty states, tooltips and marketing for any phrasing that reads as* ensures compliance *rather than* records and applies your determinations*, and file what you find."*
> RULING 0.3 — *"~150 modern awards, an annual wage review, EBA variations… Anything encoded as authoritative begins drifting the day it ships."*

The marketing site carries **8 compliance-guarantee claims** — the highest concentration in the estate. These are outward-facing promises to prospects.

| # | file:line | Verbatim | Proposed replacement |
|---|---|---|---|
| 1 | `src/pages/Service.tsx:13` | "Our compliance management service **ensures that your business meets all regulatory requirements** in the apprenticeship and traineeship space." | "Our compliance management service applies your organisation's determinations consistently and evidences them against current apprenticeship and traineeship requirements." |
| 2 | `src/pages/Service.tsx:9-10` | "**Ensuring all placements adhere** to industry regulations and standards…" | "Recording and applying your placement determinations against training and workplace-safety requirements as they're set." |
| 3 | `src/pages/Service.tsx:64` *(SEO description — shown in search results)* | "**Ensure all placements adhere** to industry regulations. Braden Group manages compliance with training requirements, workplace safety, and government standards." | "Braden Group applies and evidences your placement determinations against training, workplace-safety, and government standards." |
| 4 | `src/pages/Service.tsx:15` | "Regular audits and checks to **ensure ongoing compliance** with changing regulations." | "Regular reviews and checks to track your position against changing regulations." |
| 5 | `src/components/Services.tsx:31` | "**Audit readiness**, process reviews, and compliance strategies to **ensure your organization meets all regulatory requirements**." | "Evidence organisation, process review, and documentation support for your state training authority and Fair Work Ombudsman engagements." |
| 6 | `src/components/Services.tsx:86` | "…to help organizations scale, **remain compliant**, and optimize their operations." | "…to help organizations scale, apply their determinations consistently, and optimize their operations." |
| 7 | `src/components/About.tsx:14` | "Our unique perspective **ensures your applications** are not only technically excellent but also **compliant** and secure." | "Our unique perspective is built to deliver technically excellent, secure applications that apply your compliance determinations correctly." |
| 8 | `src/components/About.tsx:19` | "…innovative technology solutions that drive growth, **ensure compliance**, and deliver measurable impact." | "…that drive growth, apply your compliance determinations consistently, and deliver measurable impact." |

## Also: a stale product description that is wrong twice

`src/components/About.tsx:56` — "**and R80.3 (compliance management)**, showcasing our expertise in React, TypeScript…"

Two faults:
1. **R80.3 is superseded by R80.4** (operator §2.1).
2. It labels the **wage/charge-rate calculation engine** as "compliance management" — directly contrary to RULING 0.1.

Replacement: *"and R80.4 (award-rate calculation for GTOs), showcasing our expertise in React, TypeScript, cloud architecture, and security."*

## RULING 0.2 — name the audit
#5's "audit readiness" invokes an audit without naming it or who is audited. Per RULING 0.2 the real audits are: the **state training authority** against the GTO National Standards, the **Fair Work Ombudsman**, the relevant **state IR body**, **ASQA/TAC** where an RTO is attached, and **hosts at contract renewal**. Name one, or drop the framing.

## Borderline — flagged, not filed as violations
`src/pages/Index.tsx:82,93,106`, `src/components/SEOHead.tsx:30,50`, `src/pages/Contact.tsx:12` all market "compliance management" as a service line. Braden Group **is** a GTO managing its own obligations — which is RULING 0.1's correct actor — so this is not automatically wrong. The tension is that it reads as *"we'll manage yours."* **Operator call**, not an engineering one: is compliance management sold as a service to other organisations, or is it describing Braden Group's own GTO function?

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.2 visual-equivalence
- **Equivalence target**: before/after screenshots of Service, Services, About; and `grep -rniE "ensure[s]? .{0,40}complian|remain compliant|meets all regulatory"` over `braden/src` returning **zero**
- **Cross red-team**: a peer re-reads the replacements against RULING 0.5's own test — does each *record a fact with a source*, or *state a determination*?
- **Skills to load**: `design-brand-voice`, `check-docs-vs-code`
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

Implements: RULING 0.5 (with 0.1, 0.2, 0.3, and §2.1 for the R80.3 reference).
