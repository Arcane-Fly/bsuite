> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.


/
Rates Calculator
Rates Calculator
ChargeCalc.com is designed as a comprehensive quotation and compliance software application tailored for businesses engaged in staffing services, including sectors like Recruitment, Group Training, Labour Hire, Traffic Control, Cleaning, Engineering Facilities, and Security. Its primary goal is to streamline and automate workflow processes to ensure compliance with legal wage requirements, accurate rate quoting, and enhance overall operational efficiency.

Here are the core capabilities of ChargeCalc:

Compliance and Governance Management: ChargeCalc excels in ensuring accurate compliance with awards and industrial agreements across various industry sectors. It is instrumental in managing rate updates and margin management while creating customized employment schedules for different work arrangements.

Risk Mitigation: The software plays a crucial role in reducing business risks and liabilities by ensuring real-time compliance with legislative requirements, managing commercial contracts effectively, processing payroll accurately, and facilitating seamless communication with employees and contractors with minimal human intervention.

Operational Integration: ChargeCalc acts as a conduit between operational systems and back-office functions, ensuring a seamless flow of data from client acquisition through to invoicing and payroll. It supports flexible hierarchies within the software to adapt to business needs.

System Integration: The platform offers integration capabilities with leading payroll and HR systems, ensuring a smooth transition and operational experience from the initial setup.

As a developer approaching the creation or integration with ChargeCalc, it's critical to grasp these core functionalities deeply. Understanding how to manage compliance, governance, rate quoting, margin management, and employment scheduling is essential. Moreover, developing a keen insight into how ChargeCalc interfaces with both operational and back-office systems, including its integration capabilities with other payroll and HR platforms, will be paramount. This comprehensive understanding will enable you to create software that aligns with ChargeCalc's objectives of streamlining workflow processes, ensuring compliance, and enhancing operational efficiency for staffing service providers.

Recents
Fixing JSX Syntax Errors in React Component
Jul 8, 2024
Apprentice Wage Calculation Software for Australia
Jul 8, 2024
Instructions
Custom Instructions: 1. Role Definition: You are an expert in apprentice wage calculations and charge rate determinations across multiple industries in Australia, covering both direct employment and Group Training Organisation (GTO) models. 2. Primary Function: Your primary function is to assist users in calculating wage costs, oncosts, and charge rates for apprentices in any industry, considering factors such as ordinary hours, overtime, and public holidays. 3. Employment Structures: You understand different employment structures in apprenticeships, including: - Direct employment by businesses in various industries. - Employment through Group Training Organisations (GTOs). - The relationship between GTOs, host employers, and apprentices. 4. Oncost Application: You are knowledgeable about how oncosts are applied for different types of hours: - All oncosts for ordinary hours and public holidays worked. - Limited oncosts (typically only workers' compensation) for overtime hours. 5. Common Oncosts: You can explain and calculate common oncosts, including but not limited to: - Annual Leave. - Leave Loading. - Public Holidays. - Sick Leave. - Off-the-job Training. - Study Costs. - Protective Clothing/Equipment Costs. - Superannuation. - Workers' Compensation. 6. Industry Variations: You understand how these oncosts might differ between industries, direct employment, and GTO models. 7. Profit Metrics: You can explain and calculate three different profit metrics interchangeably: - Margin. - Markup. - Gross Profit. 8. Profit Calculations: You can adapt profit calculations to account for both GTO margins and host employer margins where applicable. 9. Guiding Users: You guide users through inputting necessary information, including wage rates, oncost amounts, and desired profit metrics, for both direct employment and GTO scenarios across various industries. 10. Detailed Breakdown: You provide detailed breakdowns of calculations, explaining how each component contributes to the final charge rate, and how these may differ between industries and employment models. 11. Labor Laws & Standards: You are familiar with Australian labor laws, industry standards, and modern awards relevant to apprentice wages across multiple industries. 12. Billable Hours: You can explain the concept of billable hours and its impact on oncost calculations, recognizing that billable hours may vary by industry. 13. Impact of Changes: You provide advice on how changes in inputs affect final charge rates, considering both direct employment and GTO contexts across different industries. 14. Interpreting Results: You assist in interpreting calculation results, helping users understand implications for their business, whether they are direct employers, GTOs, or host employers in any industry. 15. Apprentice Levels: You explain differences between apprentice levels (e.g., 1st year, 2nd year) and their impact on wage rates and calculations across industries. 16. Charge Rate Guidance: You provide guidance on setting charge rates and managing apprentice employment costs, including considerations specific to GTOs and host employers in various sectors. 17. Broader Context: You discuss the broader context of apprentice employment across industries, including training requirements, career progression, and the role of GTOs. 18. GTO vs Direct Employment: You explain the benefits and considerations of using a GTO versus direct employment for apprentices in different industries. 19. Tailored Advice: When presented with specific scenarios, you provide accurate, tailored advice and calculations, considering the industry and whether it involves direct employment or a GTO arrangement. 20. Financial Implications: You can advise on the financial implications of industry-specific practices, such as rotating apprentices between host employers in GTO arrangements. 21. Industry-Specific Factors: You are capable of discussing and accounting for industry-specific factors that might affect apprentice wages and charge rates, such as tools of trade, industry-specific allowances, or unique training requirements. 22. Navigating Differences: You can help users navigate differences in apprenticeship structures and durations across various trades and industries. 23. Code Development: - you are an expert coder of financial management products, you re an expert in all code styles including python, java, react, tailwind etc... - Your task is to develop software packages for sale in the same vein as 2cloudNine, RatesCalc, WorkforceOne etc. 24. Code Quality: - Use descriptive variable names: "When you write code, always use very descriptive variable names." - Include extensive comments: "Extensive comments to explain code blocks." - Ensure clean and efficient code: "Write clean and efficient code." - Code in Full: if code requires correction, always produce the full code. Never provide partial code. If the code is too long, the user will say "continue", and you will begin where you left off. Avoid restarting the same code. Debugging and Testing: - Step-by-step instructions for debugging: "Create step-by-step instructions for moving code to VS Code and testing." - Fix and improve features iteratively:

Memory
Only you
Purpose & context Braden is building a SaaS product for GTOs (Group Training Organisations) that handles apprentice and trainee host employer charge rate calculations. The domain involves Australian award-based wage compliance (specifically the Electrical, Electronic and Communications Contracting Award 2020 / MA000020), Fair Work Commission data, and the real-world operational complexity of GTO billing models. Key domain knowledge established: GTOs pass funding/incentives to host employers either as credits or as reductions to hourly charge rates Funding discounts apply to ordinary hours (including penalty hours) but not overtime — and funding amounts are not multiplied by penalty rates since the funding received remains constant Billing models in use: Standard (39-week), ALEX (48-week), 52-week, and Custom Business config values intentionally outside MAPD scope: superannuation SG rate, workers compensation, overheads, margin Current state Two major calculator builds have been completed: MAPD-integrated calculator (charge-calculator-mapd.jsx, ~1,527 lines) — rewrites the original hardcoded JSX component to pull live award data from the Fair Work Commission Modern Awards Pay Database (MAPD) API. Features include: Retry ladder with exponential backoff and in-memory caching (24-hour TTL) Optional server-side proxy support (pointed to existing Supabase edge function auth-fairwork) to handle CORS and protect the API key Wage resolution in three modes: direct API apprentice classification rows, percentage-of-reference-classification (mirroring award clause structures), and manual custom entry Four clearly annotated data source types throughout the code: API-sourced, API-derived, user input, and intentional business config Junior apprentice percentage table included but flagged as placeholder — requires verification against the actual award API key configured at line 68 in FWC_CONFIG block (subscriptionKey field); production use should leave this as a placeholder with proxyUrl set to the Supabase edge function Comprehensive v2 calculator — rebuilt from Excel spreadsheet analysis, featuring: Fully variable wage inputs (no fixed classifications) Dynamic allowances system with multiple rate types (per hour, per day, per week, percentage of wage, per kilometre) and configurable superannuation applicability per allowance Milestone-based funding system with three application methods Configurable penalty rates categorised as overtime or penalty-on-ordinary Visual 52-week allocation (billable, training, leave breakdown) Correct funding discount logic: flat applied after charge calculations on ordinary and penalty rates, excluded from overtime A latent bug where the cost breakdown tab referenced engine output fields never returned was also fixed. Colour scheme changed from red/green to purple/amber for accessibility. On the horizon Junior apprentice percentage table values need verification against the actual award before production use CORS handling in production depends on the auth-fairwork Supabase edge function being correctly wired to the proxyUrl config Key learnings & principles Funding logic is nuanced and easy to implement incorrectly: the flat funding amount does not scale with penalty multipliers — this is a real-world GTO operational requirement, not a simplification Annotating data sources inline (API-sourced vs. API-derived vs. user input vs. business config) is valued for maintainability and auditability in this codebase Both annualised-cost-divided-by-billable-hours and per-hour-oncost methods converge to similar charge rates — validating the model logic Tools & resources Fair Work Commission MAPD API — live award rate source Supabase edge function (auth-fairwork) — server-side proxy for API key protection and CORS resolution React/JSX — frontend component framework Operating within an R80.3 development lane

Last updated Jul 4

Context
3% of project capacity used
Search mode

rdo-flexibility-guide.md
339 lines

md

Modern Awards Pay Database — Data Dictionary
125 lines

text

Modern Awards Pay Database API
416 lines

text

Key Components of GTO Charge Rate Calculation
71 lines

text

mapdapiintegrationbestpracticesguide.pdf
pdf

Scheduled
Set up recurring tasks for this project.

rdo-flexibility-guide.md

# RDO Flexibility Guide - Award & Agreement Variations

## Overview

Rostered Days Off (RDOs) are **NOT universal** across all awards and enterprise agreements. The calculation system must accommodate both scenarios:

1. **WITH RDOs**: Worker works more hours than paid (e.g., work 40h, paid 38h, bank 2h)
2. **WITHOUT RDOs**: Worker works and is paid the same hours (e.g., work 38h, paid 38h)

---

## Legal Basis for RDO Variations

### Building and Construction General On-site Award (MA000020)

**Standard RDO Arrangement** (Clause 16.2):
> "Ordinary working hours will be 8 hours in duration each day, of which **0.4 of one hour** of each day worked will accrue towards an RDO and **7.6 hours** will be paid."

This means:

- Work: 8 hours/day × 5 days = **40 hours/week**
- Paid: 7.6 hours/day × 5 days = **38 hours/week**
- RDO accrual: 0.4 hours/day × 5 days = **2 hours/week**
**Alternative Arrangement** (Clause 16.8):

> "Where an employer and the majority of employees employed at a particular enterprise **agree that due to the nature of an employer's operations it is not practicable** for an employee to be provided with an RDO in each 4 week cycle, they may agree to an **alternate method of arranging working hours**."

**Requirements for Alternative Arrangement**:

- Agreement between employer and majority of employees
- Ordinary hours worked Monday to Friday within spread of hours (7am-6pm)
- No more than 8 ordinary hours in any one day
- Agreement recorded in writing

---

## When RDOs DO Apply

### Scenarios

1. **Building & Construction (MA000020)** - Default arrangement
2. **Civil Construction projects** - Standard rostering
3. **Metal & Engineering Construction** - Shift-based RDOs
4. **Enterprise Agreements** that specifically include RDO provisions
5. **Large infrastructure projects** with standard working patterns

### Typical RDO Patterns

| Pattern | Hours Worked/Day | Hours Paid/Day | RDO Accrual/Day | RDO Cycle |
|---------|------------------|----------------|-----------------|-----------|
| **Standard** | 8.0 | 7.6 | 0.4 | 19 days (1 RDO) |
| **10-hour shift** | 10.0 | 9.5 | 0.5 | 19 days (1 RDO) |
| **12-hour shift** | 12.0 | 11.4 | 0.6 | 19 days (1 RDO) |

### Calculation Example WITH RDOs

```
Annual Breakdown:
- Work: 40 hours/week × 52 weeks = 2,080 hours worked
- Paid: 38 hours/week × 52 weeks = 1,976 hours paid
- RDO: 2 hours/week × 52 weeks = 104 hours banked

RDO Usage:
- 104 hours ÷ 7.6 hours/day = 13.68 days
- Approximately 1 RDO every 4 weeks

Billable to Host Employer:
- RDOs ARE billable when taken
- Worker works 40h/week, host employer billed for 40h/week
```

---

## When RDOs DO NOT Apply

### Scenarios

1. **Alternative arrangements** agreed under Clause 16.8
2. **Some retail, hospitality, or service awards** (never had RDOs)
3. **Professional/white collar awards** (typically 38h = 38h)
4. **Part-time employees** who opt not to accrue RDOs
5. **Small businesses** where RDOs are impractical
6. **Short-term projects** where RDO cycles can't complete
7. **Enterprise agreements** that trade off RDOs for other benefits

### Why RDOs May Be Impractical

Per Clause 16.8, RDOs may not be practicable due to:

- **Project duration** too short for RDO cycles to complete
- **Variable workforce** with irregular attendance patterns
- **Client requirements** for continuous coverage
- **Remote locations** where workers prefer longer blocks of work followed by extended leave
- **Specialized work** requiring continuous presence of specific personnel
- **Emergency/maintenance work** with unpredictable scheduling

### Alternative Arrangements Can Include

- Straight 38-hour week (work 38h, paid 38h, no RDOs)
- Longer shifts with TOIL (Time Off In Lieu) instead of RDOs
- Compressed work weeks (e.g., 9-day fortnight, different from RDOs)
- Extended leave arrangements (work 4 weeks, off 1 week)

### Calculation Example WITHOUT RDOs

```
Annual Breakdown:
- Work: 38 hours/week × 52 weeks = 1,976 hours worked
- Paid: 38 hours/week × 52 weeks = 1,976 hours paid
- RDO: 0 hours (no RDO arrangement)

Billable to Host Employer:
- Worker works 38h/week, host employer billed for 38h/week
- No RDO accrual, no RDO days taken
```

---

## Impact on Calculations

### Scenario Comparison: Same Worker, Different Arrangements

**Input Parameters:**

- Base wage: $18.53/hour
- Total annual cost: $49,369.85 (same for both)
- Training, leave, etc.: Same for both
**WITH RDOs (Standard Award):**

```
Hours worked annually:        2,080 hours
Hours paid annually:          1,976 hours
RDO hours (billable):        104 hours
Total billable hours:        1,586 hours (39 weeks × 38h + 104h RDO)

Cost per billable hour:      $31.13
Charge rate (15% margin):    $35.80/hour
Annual revenue:              $56,775
```

**WITHOUT RDOs (Alternative Arrangement):**

```
Hours worked annually:        1,976 hours
Hours paid annually:          1,976 hours
RDO hours (billable):        0 hours
Total billable hours:        1,482 hours (39 weeks × 38h, no RDOs)

Cost per billable hour:      $33.31
Charge rate (15% margin):    $38.31/hour
Annual revenue:              $56,775
```

### Key Insights

1. **Total Annual Cost**: IDENTICAL ($49,369.85)
   - Worker receives same total annual pay
   - GTO/labour hire has same total costs
2. **Billable Hours**: DIFFERENT
   - WITH RDOs: 1,586 hours (includes 104 RDO hours)
   - WITHOUT RDOs: 1,482 hours (no RDO hours)
   - Difference: 104 hours (7%)
3. **Hourly Rate**: DIFFERENT but proportional
   - WITH RDOs: $35.80/hour (lower rate, more hours)
   - WITHOUT RDOs: $38.31/hour (higher rate, fewer hours)
   - Difference: $2.51/hour (7%)
4. **Annual Revenue**: IDENTICAL ($56,775)
   - Different rate × different hours = same total
   - **Critical validation**: Cost recovery is consistent

---

## Implementation in R80.3 Calculator

### Configuration Options

```typescript
interface WorkConfig {
  hoursPerWeek: number;           // Hours PAID per week (e.g., 38)
  rdoAccrualPerWeek?: number;     // Hours banked for RDO (0, 2, or other)
                                   // Optional - if omitted or 0, no RDOs
  weeksPerYear: number;            // 52
  // ... other fields
}
```

### Usage Examples

**Example 1: Standard Building & Construction (WITH RDOs)**

```typescript
const workConfig = {
  hoursPerWeek: 38,
  rdoAccrualPerWeek: 2,  // 0.4h/day × 5 days
  weeksPerYear: 52,
  // ...
};

Result:
- Hours worked: 2,080 (40h/week × 52)
- Hours paid: 1,976 (38h/week × 52)
- RDO hours: 104 (2h/week × 52)
- Billable hours: 1,586 (39 weeks worked + RDOs)
```

**Example 2: Alternative Arrangement (NO RDOs)**

```typescript
const workConfig = {
  hoursPerWeek: 38,
  rdoAccrualPerWeek: 0,  // Or omit this field entirely
  weeksPerYear: 52,
  // ...
};

Result:
- Hours worked: 1,976 (38h/week × 52)
- Hours paid: 1,976 (38h/week × 52)
- RDO hours: 0
- Billable hours: 1,482 (39 weeks worked, no RDOs)
```

**Example 3: 10-Hour Shift Pattern (WITH RDOs)**

```typescript
const workConfig = {
  hoursPerWeek: 38,
  rdoAccrualPerWeek: 2,  // Could be different accrual rate
  weeksPerYear: 52,
  // Note: 10-hour days means 4 days/week instead of 5
};
```

---

## User Interface Considerations

### Award/Agreement Selection

**Option 1: Pre-configured Templates**

```
Building & Construction Award (Standard):
  ☑ RDOs apply (2 hours/week accrual)
  Work: 40h/week, Paid: 38h/week

Building & Construction Award (Alternative - Clause 16.8):
  ☐ No RDOs (alternative arrangement)
  Work: 38h/week, Paid: 38h/week
```

**Option 2: Custom Configuration**

```
Work Pattern:
  Hours paid per week: [38]

RDO Arrangement:
  ○ Standard RDOs (0.4h/day accrual)
  ○ Custom RDO accrual: [___] hours/week
  ● No RDOs (alternative arrangement)
```

### Validation & Warnings

**Warning when changing from RDOs to No RDOs:**
> "Removing RDO accrual will reduce billable hours by approximately 104 hours/year (7%). The hourly charge rate will increase to maintain the same annual cost recovery. Proceed?"

**Warning when adding RDOs:**
> "Adding RDO accrual means workers will work 40 hours/week but be paid for 38 hours/week, banking 2 hours for RDOs. Billable hours will increase by approximately 104 hours/year. Proceed?"

---

## Documentation Requirements

When RDO arrangement differs from award standard, document:

1. **What agreement was reached**:
   - "Employer and majority of employees agreed on [date] to operate without RDOs"
2. **Why RDOs are impractical**:
   - "Project duration of 8 weeks makes 4-week RDO cycles impractical"
   - "Remote location with FIFO roster makes weekly RDOs impractical"
3. **Alternative arrangement**:
   - "Straight 38-hour week, no RDO accrual"
   - "9-day fortnight arrangement (different from RDOs)"
4. **Written record**:
   - Keep signed agreement per Clause 16.8
   - Store with employment records

---

## Frequently Asked Questions

### Q: Can we have partial RDO accrual (e.g., 1 hour/week)?

**A:** Yes, if agreed. Some arrangements may accrue RDOs at different rates than the standard 0.4h/day.

### Q: Do part-time employees get RDOs?

**A:** Award allows part-time employees to either:

- Accrue pro-rata RDOs (Clause 16.9(c))
- Be paid for actual hours worked with no RDO accrual (Clause 16.9(b))

### Q: Can RDOs be traded for higher pay?

**A:** Generally no, unless specifically allowed by the award or enterprise agreement. The award sets minimum standards.

### Q: If we don't have RDOs, do we still work 38-hour weeks?

**A:** Yes. The alternative arrangement under Clause 16.8 requires ordinary hours to remain within award limits (no more than 8 hours/day).

### Q: Does this affect overtime calculations?

**A:** No. Overtime is calculated as work beyond ordinary hours, whether or not RDOs apply.

### Q: Can we change from RDOs to no RDOs mid-project?

**A:** Only with agreement from majority of employees and proper written documentation. Not recommended mid-project due to accrued entitlements.

---

## Summary for Calculator Implementation

**Key Configuration:**

```typescript
rdoAccrualPerWeek: number | undefined

// If 0 or undefined:
//   - Hours worked = hours paid
//   - No RDO banked hours
//   - Lower billable hours, higher $/hour rate

// If > 0 (e.g., 2):
//   - Hours worked > hours paid
//   - RDO hours banked and billable
//   - Higher billable hours, lower $/hour rate

// In both cases:
//   - Total annual cost is identical
//   - Worker total compensation is identical
//   - GTO/labour hire revenue is identical
```

**Critical Validation:**
Regardless of RDO configuration, the calculation must ensure:

```
Annual Revenue (Model A) ≈ Annual Revenue (Model B)
Difference < 2% (rounding tolerance)
```

This ensures fair cost recovery whether RDOs apply or not.
