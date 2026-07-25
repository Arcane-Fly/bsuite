# GTO / Fair Work / Incentive research for BSuite UX

> **Naming:** `20260725-gto-compliance-ux-research-v1.00W.md` · Status **W** · 2026-07-25  
> Citations via web search; amounts/dates must be re-verified before customer-facing legal copy.

## Research questions

1. What must a GTO product prove operationally (standards themes)?  
2. What Fair Work rules affect apprentices/trainees in-product?  
3. What federal/state money flows must funding_offsets + claims track?

---

## 1. Group Training Organisation model

**Finding:** GTO employs the apprentice/trainee and places them with host employers; GTO retains employer responsibilities (employment continuity, quality of training experience, payroll/admin); host provides day-to-day supervision and on-job training; fees charged to host.

**Sources:** QLD DTET GTO overview; Apprenticeship Support Australia GTO explainer; ACT Skills GTO page; DEWR GTO reimbursement pilot FAQs.

**Product implications:**
- Placement rotation history is first-class (not a single host forever).  
- Host capacity / supervision ratio assessment before place (GTO Standards theme 1.3 — already typed in `hostCapacityAssessment.ts`).  
- Clear split of obligations in host + apprentice portals.  
- Payroll always GTO-side; host sees charge/invoice not award engine.

**Recommendation:** Adopt — strengthen host capacity UX + obligation explainer cards.

---

## 2. Fair Work — apprentices & trainees

**Finding:** Apprenticeships/traineeships must be registered with the state/territory training authority; training contract defines rights/obligations; special pay rates under awards; cannot pay apprentice/trainee rates without a formal training contract; adult apprentice rules when starting over 21; PACT tool is authoritative for rates.

**Sources:** fairwork.gov.au apprentices-and-trainees; young workers pay page; FWC BOOT pages.

**BOOT:** Better Off Overall Test compares agreement to award overall; BSuite doctrine: EBAs arrive FWC-ratified (not re-tested); engine tests **custom rates** only with award fallback.

**Product implications:**
- Hard gate: employment_type apprentice/trainee requires training contract / STA status path.  
- Surface award + year + adult apprentice flags in R80 (exists).  
- Custom rate flow must force BOOT check (exists doctrine).  
- Link to Fair Work PACT in payroll help (how-to, not legal advice disclaimer).

**Recommendation:** Adopt — add plain-language “training contract required” empty states; BOOT checklist UX for custom rates.

---

## 3. Federal Australian Apprenticeships Incentive System

**Finding (2026 settings, changing):**
- Incentive System targets priority occupations (Priority List).  
- **Key Apprenticeship Program Employer Incentive:** up to **$5,000** first year in two instalments (e.g. $2k @ 6 months, $3k @ 12 months full-time) for eligible KAP/new energy/housing construction occupations — through 2026 calendar settings.  
- From **1 Jan 2027**: KAP employer incentive up to **$4,000** (two instalments first year); large employers (200+) generally ineligible **except GTOs**; program extended windows published on apprenticeships.gov.au.  
- Guidelines maintained by DEWR (Incentive System Guidelines; modified dates into 2026).  
- Disability Australian Apprentice Wage Support and LAFHA increases noted in strategic review materials (2025+).

**Sources:** dewr.gov.au Incentive System Guidelines; apprenticeships.gov.au financial support + 2027 changes; Apprenticeship Support news on 2026 incentives.

**Product implications:**
- `funding_offsets.scheme` registry must include federal KAP/PHI-style keys with **effective-from/to dates**.  
- Expected funding at quote time should warn when commencement crosses 2027 rule change.  
- GTO exception for large-employer ineligibility is a product flag (`is_gto_tenant`).  
- Claims evidence vault (open issue #734 class) remains backlog but high compliance value.

**Recommendation:** Adapt — update funding scheme registry + quote warning for 2027; do not hardcode dollar amounts without date versioning.

---

## 4. WA state — GTO Wage Subsidy (GWS)

**Finding:** WA GTO Wage Subsidy supports SMEs in building/construction (gov + residential) hosting via GTOs; covers average estimated **award wage** component (not super/leave/OT/over-award); participating GTOs may receive up to ~**$134,625** over a 4-year apprenticeship (group-dependent figures published by Jobs and Skills WA); training contract lodging timeframes matter (e.g. DTWD lodge within 21 days appears in terms materials).

**Sources:** jobsandskills.wa.gov.au employer incentives / GTO wage subsidy; wa.gov.au incentives page; business.gov.au GWS program page.

**Product implications:**
- WA GWS scheme already in funding schemes direction — ensure milestone schedule + expected vs received reconciliation.  
- Contract lodge SLA timer from employment start.  
- Construction occupation filter for eligibility hints (not hard block without rules engine).

**Recommendation:** Adopt — GWS milestones in funding_offsets + STA lodge deadline reminder.

---

## 5. Cross-cutting UX requirements from compliance

| Compliance theme | UX / product control |
|------------------|----------------------|
| Registered training contract | STA email ingestion + manual confirm (built); status badge on person/placement |
| Host suitability | Host capacity assessment before place |
| Safety | WHS incidents/risk/inspections (tables live) |
| Pay correctness | Award path + BOOT custom + timesheet → pay |
| Incentives | Expected/received offsets; scheme effective dates |
| Evidence retention | org documents + handover doc copy + claims vault backlog |
| Transparent advice to hosts | Host portal obligations + manuals |

---

## References (primary)

1. National Standards for GTOs (PDF) — apprenticeships.gov.au content  
2. https://www.fairwork.gov.au/find-help-for/apprentices-and-trainees  
3. https://www.fwc.gov.au/better-off-overall-test  
4. https://www.dewr.gov.au/skills-support-individuals/resources/australian-apprenticeships-incentive-system-guidelines  
5. https://www.apprenticeships.gov.au/support-and-resources/financial-support-employers  
6. https://www.apprenticeships.gov.au/home/changes-australian-apprenticeships-incentive-system-1-january-2027  
7. https://www.jobsandskills.wa.gov.au/employer-incentives (GTO Wage Subsidy)  
8. https://www.business.qld.gov.au/.../group-training-organisations  

**Disclaimer for product copy:** Figures change; always version scheme rules and show “as at {date} — verify with AASN/STA”.
