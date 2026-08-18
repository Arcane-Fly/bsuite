
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

Key Components of GTO Charge Rate Calculation
Group Training Organisations (GTOs) like Skill Hire calculate their charges based on several factors that cover wages, on-costs, and additional fees. The calculation process ensures that all costs associated with employing an apprentice or trainee are accounted for and that the GTO can sustainably manage its operations while providing necessary support services.

 Key Components of GTO Charge Rate Calculation

1. Wages and Working Hours:
   - Pay Rate: The hourly wage rate for the apprentice.
   - Hours per Day/Week: The standard working hours per day and week.
   - Weeks per Year: The total number of working weeks in a year, typically 52 weeks.

2. Leave and Training:
   - Annual Leave: Typically 20 days of paid leave.
   - Leave Loading: Additional pay (usually 17.5%) on top of the annual leave.
   - Public Holidays: Number of public holidays in a year (10 days in WA).
   - Sick Leave: Paid sick leave days (10 days per year).
   - Off-the-Job Training: Weeks spent in training off-site (e.g., 5 weeks per year).

3. Additional Costs:
   - Study Costs: Annual expenses for training or educational materials.
   - Protective Clothing: Costs for safety and protective gear.
   - Superannuation: Employer's superannuation contribution (e.g., 11.5%).
   - Workers Compensation: Insurance cost (e.g., 4.7%).
   - GPS Tracking: Costs for tracking systems if applicable.

4. Calculating Total On-Costs:
   - Annual Leave Cost: Calculated as a proportion of the pay rate.
   - Leave Loading Cost: Additional pay for annual leave.
   - Public Holidays Cost: Cost spread across the working weeks.
   - Sick Leave Cost: Proportionate cost of sick leave.
   - Off-the-Job Training Cost: Calculated as a weekly cost spread across the year.
   - Study Costs and Protective Clothing Costs: Divided by the total working hours.
   - Superannuation and Workers Compensation: Percentage of the total wage.

5. Total Cost per Hour:
   - Sum of the hourly pay rate and all the on-costs calculated above.

6. Markup Percentage:
   - A percentage added to cover administrative costs, overheads, and profit margin (e.g., 15%).

7. Final Charge Rate:
   - Total cost per hour plus the markup percentage results in the final charge rate billed to the host employer.

 Example Calculation
Using the details provided earlier:

1. Base Wage Calculation:
   - Hourly Pay Rate: $16.63

2. On-Costs:
   - Annual Leave: $1.7056 per hour
   - Leave Loading: $0.2986 per hour
   - Public Holidays: $0.3097 per hour
   - Sick Leave: $0.8528 per hour
   - Off-the-Job Training: $2.1321 per hour
   - Study Costs: $0.5753 per hour
   - Protective Clothing: $0.2024 per hour
   - Superannuation: $2.7138 per hour
   - Workers Compensation: $0.7816 per hour

3. Total Hourly Cost:
   - $16.63 + $1.7056 + $0.2986 + $0.3097 + $0.8528 + $2.1321 + $0.5753 + $0.2024 + $2.7138 + $0.7816 = $27.09

4. Markup:
   - 15% of $27.09 = $4.0635

5. Charge Rate:
   - $27.09 + $4.0635 = $31.15

This charge rate ensures that all costs are covered, and the GTO can provide comprehensive support to both the apprentice and the host employer.

 Conclusion
The charge rate calculation by GTOs is a detailed process that ensures all costs related to employment, training, and support services are covered. This comprehensive approach allows GTOs to sustainably manage their operations and provide valuable services to apprentices and host employers.

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

Modern Awards Pay Database — Data Dictionary

# Modern Awards Pay Database — Data Dictionary

## Awards

| Field Name | Data Type | Description |
|---|---|---|
| `award_fixed_id` | Integer | A unique code for this instance of the modern award resource that remains identical year on year. |
| `award_id` | Integer | Unique identification number of award. |
| `award_operative_from` | Date | The date when the award came into operation. |
| `award_operative_to` *(NULLABLE)* | Date | The date when the award ceased to be in effect (was revoked). |
| `code` | String | The code assigned to the modern award. Also known as the award number. |
| `name` | String | The human readable title of the award. |
| `last_modified_datetime` | DateTime | This is the date and time that the resource was last modified. |
| `published_year` | String | Year in which the minimum rates of pay were determined in the annual wage review. |
| `version_number` | Integer | This number indicates the version of the award resource. It is incremented by one each time the resource is updated. |

---

## Classification

| Field Name | Data Type | Description |
|---|---|---|
| `award_fixed_id` | Integer | A unique code for this instance of the modern award resource that remains identical year on year. |
| `base_pay_rate_id` *(NULLABLE)* | String | A unique identification number of the base pay rate resource. Values have the prefix (BR). |
| `base_rate` *(NULLABLE)* | Decimal | The rate that the annual wage review increase is directly applied to. |
| `base_rate_type` *(NULLABLE)* | String | The rate frequency such as: weekly, hourly, annual, daily, piece rate, cents per km, engagement rate. |
| `calculate_pay_rate_id*` *(NULLABLE)* | String | A unique identification number of the calculated pay rate resource. Values have the prefix (CR). |
| `calculated_rate_type` *(NULLABLE)* | String | Calculated rate type (hourly, weekly, annual, daily, fortnightly, casual hourly, cents per km, piece rate, engagement rate). |
| `calculated_rate` *(NULLABLE)* | Decimal | Calculated rate of classification within clause — derived value from base rate. |
| `classification` | String | Used to describe a job title that is associated with a rate of pay in a modern award. Sub level classification of clause. |
| `classification_fixed_id` | Integer | Unique identification number of classification that remains identical year on year. |
| `classification_level*` *(NULLABLE)* | Integer | A numerical representation of the classification within the hierarchical structure of classifications in a clause. Starts at 1 for the lowest level classification. |
| `clause_description` *(NULLABLE)* | String | Used to describe the content of the clause. |
| `clause_fixed_id` | Integer | Unique identification number of clauses that remains identical year on year. |
| `clauses` | String | Clause number as it appears in the award. |
| `code` | String | The code assigned to the modern award. Also known as the award number. |
| `employee_rate_type_code` *(NULLABLE)* | String | An indicator if the rate is for an adult or otherwise: AD = Adult, JN = Junior, AP = Apprentice, AA = Adult apprentice, TN = Trainee rates, XT = Exited from traineeship but not an Adult, CA = Cadet. |
| `last_modified_datetime` | DateTime | This is the date and time that the resource was last modified. |
| `next_down_classification_fixed_id` *(NULLABLE)* | Integer | Refers to the `classification_fixed_id` for the next logical classification down the classification hierarchy. |
| `next_up_classification_fixed_id` *(NULLABLE)* | Integer | Refers to the `classification_fixed_id` for the next logical classification up the classification hierarchy. |
| `operative_from` | Date | The date when the record comes into operation. For a particular employee, this will only take effect from the beginning of that employee's first full pay period that starts on or after that date. |
| `operative_to` *(NULLABLE)* | Date | The date on which the classification ceased to be in effect. |
| `parent_classification_name` *(NULLABLE)* | String | Description of a parent classification. Used when there are classifications that belong to a group of classifications, e.g. "Technical stream" may be parent of a group containing Levels 1–6. |
| `published_year` | Integer | The year in which the minimum rates of pay were determined in the annual wage review. For example, for published year 2019 the rates were determined on 30 May 2019, covering data that came into operation between 1 July 2019 and 30 June 2020. |
| `version_number` | Integer | This number indicates the version of the classification resource. It is incremented by one each time the resource is updated. |

---

## Wage Allowance

| Field Name | Data Type | Description |
|---|---|---|
| `allowance` | String | Description of allowance, taken from the summary of monetary allowances table in the award if the award contains one. Otherwise taken from the allowance sheets. |
| `allowance_amount` *(NULLABLE)* | Decimal | Contains calculated allowance value ($) for the current year. |
| `award_fixed_id` | Integer | A unique code for this instance of the modern award resource that remains identical year on year. |
| `base_pay_rate_id` | Integer | A unique identification number of the base pay rate resource. Values have the prefix (BR). |
| `clause_fixed_id` | Integer | Unique identification number of clauses that remains identical year on year. |
| `clauses` | String | Clause number. |
| `code` | String | The code assigned to the modern award. Also known as the award number. |
| `is_all_purpose` | TinyInteger | Used to flag whether an allowance applies for all purposes (1 = True, 2 = False). An all-purpose allowance applies to all employees or a specific group of employees and forms part of their ordinary hourly rate. |
| `last_modified_date_time` | DateTime | This is the date and time that the resource was last modified. |
| `operative_from` | Date | The date when the record comes into operation. For a particular employee, this will only take effect from the beginning of that employee's first full pay period that starts on or after that date. |
| `operative_to` *(NULLABLE)* | Date | The date on which the allowance ceased to be in effect. |
| `parent_allowance` *(NULLABLE)* | String | Description of parent allowance (often used for a title of a group such as "meal allowances" for a group of breakfast, lunch and dinner allowances). |
| `payment_frequency` *(NULLABLE)* | String | Denotes when the payment of an allowance is made, e.g. per week, per hour, per meal etc. |
| `published_year` | Integer | The year in which the minimum rates of pay were determined in the annual wage review. For example, for published year 2019 the rates were determined on 30 May 2019, covering data that came into operation between 1 July 2019 and 30 June 2020. |
| `rate` *(NULLABLE)* | Decimal | Percentage of standard rate (base rate). |
| `rate_unit` *(NULLABLE)* | String | Rate unit (Percent). |
| `version_number` | Integer | This number indicates the version of the allowance resource. It is incremented by one each time the resource is updated. |
| `wage_allowance_fixed_id` | Integer | Unique identification number of the wage-related allowance that remains identical year on year. |

---

## Expense Allowance

| Field Name | Data Type | Description |
|---|---|---|
| `allowance` | String | Description of allowance, taken from the summary of monetary allowances table in the award if the award contains one. Otherwise taken from the allowance sheets. |
| `allowance_amount` *(NULLABLE)* | Decimal | Contains calculated allowance value ($) for the current year. |
| `award_fixed_id` | Integer | A unique code for this instance of the modern award resource that remains identical year on year. |
| `clauses` | String | Clause number as it appears in the award. |
| `clause_fixed_id` | Integer | Unique identification number of clauses that remains identical year on year. |
| `code` | String | The code assigned to the modern award. Also known as the award number. |
| `cpi_quarter_last_adjusted` *(NULLABLE)* | String | The quarter in which the CPI of the last adjusted year relates to. It will be populated in 2021 for those expense allowances that were adjusted in 2020. |
| `expense_allowance_fixed_id` | Integer | Unique identification number of the expense allowance that remains identical year on year. |
| `is_all_purpose` | TinyInteger | Used to flag whether an allowance applies for all purposes (1 = True, 0 = False). An all-purpose allowance applies to all employees or a specific group of employees and forms part of their ordinary hourly rate. |
| `last_adjusted_year` *(NULLABLE)* | Integer | The year in which the expense allowance was last adjusted. |
| `last_modified_date_time` | DateTime | This is the date and time that the resource was last modified. |
| `operative_from` | Date | The date when the record comes into operation. For a particular employee, this will only take effect from the beginning of that employee's first full pay period that starts on or after that date. |
| `operative_to` *(NULLABLE)* | Date | The date on which the allowance ceased to be in effect. |
| `parent_allowance` *(NULLABLE)* | String | Description of parent allowance, often used for a title of a group such as "meal allowances" for a group of breakfast, lunch and dinner allowances. |
| `payment_frequency` *(NULLABLE)* | String | Denotes when the payment of an allowance is made, e.g. per week, per hour, per meal etc. |
| `published_year` | Integer | The year in which the minimum rates of pay were determined in the annual wage review. For example, for published year 2019 the rates were determined on 30 May 2019, covering data that came into operation between 1 July 2019 and 30 June 2020. |
| `version_number` | Integer | This number indicates the version of the allowance resource. It is incremented by one each time the resource is updated. |

---

## Penalty

| Field Name | Data Type | Description |
|---|---|---|
| `award_fixed_id` | Integer | A unique code for this instance of the modern award resource that remains identical year on year. |
| `base_pay_rate_id` *(NULLABLE)* | String | A unique identification number of the base pay rate resource. Values have the prefix (BR). |
| `classification_level` *(NULLABLE)* | Integer | A numerical representation of the classification within the hierarchical structure of classifications in a clause. Starts at 1 for the lowest level classification. |
| `clause_description` | String | Adds context to the penalties of a clause. Description is taken from the clause heading from the corresponding Summary table in the Award (e.g. "Full-time and part-time adult employees — ordinary and penalty rates"). |
| `clause_fixed_id` | Integer | Unique identification number of clause that is fixed over each year. |
| `code` | String | The code assigned to the modern award. Also known as the award number. |
| `employee_rate_type_code` *(NULLABLE)* | String | An indicator if the rate is for an adult or otherwise: AD = Adult, JN = Junior, AP = Apprentice, AA = Adult apprentice, TN = Trainee rates, XT = Exited from traineeship but not an Adult, CA = Cadet. |
| `last_modified_date_time` | DateTime | This is the date and time that the resource was last modified. |
| `operative_from` | Date | The date when the record comes into operation. For a particular employee, this will only take effect from the beginning of that employee's first full pay period that starts on or after that date. |
| `operative_to` *(NULLABLE)* | Date | The date on which the penalty rate ceased to be in effect. |
| `penalty_calculated_value` *(NULLABLE)* | Decimal | Calculated value of penalty. |
| `penalty_description` | String | Penalty description from the relevant clause in the award. |
| `penalty_fixed_id` | Integer | Unique identification number of the penalty that remains identical year on year. |
| `published_year` | Integer | The year in which the minimum rates of pay were determined in the annual wage review. For example, for published year 2019 the rates were determined on 30 May 2019, covering data that came into operation between 1 July 2019 and 30 June 2020. |
| `rate` | Decimal | The value of penalty that is applied as a percentage to the minimum/ordinary hourly rate. |
| `version_number` | Integer | This number indicates the version of the penalty resource. It is incremented by one each time the resource is updated. |

---

**Notes:**

- *(NULLABLE)* fields may contain null values.
- `published_year` in the Awards table uses type `String`; in all other tables it uses `Integer`.
- `is_all_purpose` uses value `2 = False` in the Wage Allowance table, but `0 = False` in the Expense Allowance table (as defined in the source).

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

Modern Awards Pay Database API

# Modern Awards Pay Database API

> **Document version:** v1.01W
> **Last updated:** 2026-04-13
>
> **Change log**
>
> - **v1.01W (2026-04-13)** — Added the **Cache & Fallback Architecture** section
>   documenting the in-memory → `award_rate_cache` → empty fallback ladder used
>   by `src/services/fairworkApi.ts`, the per-function fallback table, and the
>   `award_rate_cache` row schema. Cross-references the focused behaviour suite
>   in `src/tests/fairworkCacheFallback.test.ts` (introduced in PR #48).
> - **v1.00W (2026-03-04)** — Initial upstream FWC API endpoint reference.

## Overview

This document is split into two parts:

1. **Upstream FWC API reference** (sections 1–5 below) — the raw endpoint shapes
   and field tables for the Fair Work Commission Modern Awards Pay Database API.
   This is the contract our edge functions speak to.
2. **Cache & Fallback Architecture** (final section) — how `fairworkApi.ts` layers
   an in-memory cache and a Supabase `award_rate_cache` table on top of the
   upstream API, and the exact fallback path each public function takes when the
   live API is down or returns an unexpected shape.

All upstream endpoints require the header:

```
Ocp-Apim-Subscription-Key: <your_api_key>
```

## Configuration & Troubleshooting

### API Key Setup

The application uses the Fair Work Commission's Modern Awards Pay Database API to fetch current apprentice wage rates. You need to:

1. Ensure the API key is properly set in environment variables (`FAIRWORK_API_KEY`) or the `api_keys` table in Supabase
2. Verify that the edge functions are properly deployed to your Supabase project:
   - `auth-fairwork` - Proxies requests to the Fair Work API with proper authentication
   - `get-fairwork-api-key` - Retrieves the API key securely
   - `sync-award-rates` - Performs the data synchronization

### Common Error Messages

- **"API key not available from any source"** - The API key isn't available in either the environment variables or the `api_keys` table
- **"Failed to fetch data from Fair Work API"** - The edge function couldn't connect to the Fair Work API
- **"Not authenticated, cannot sync to database"** - User must be logged in to sync data
- **"Some awards failed to sync"** - Some data was successfully synced but errors occurred with certain awards

### Edge Function Deployment

If you're seeing a 404 error when calling edge functions, they may not be deployed. Execute these steps:

1. Make sure Supabase CLI is installed: `npm install -g supabase`
2. Link your project: `supabase link --project-ref <your-project-ref>`
3. Deploy the functions: `supabase functions deploy auth-fairwork`

If you don't have access to the CLI, use the Supabase Dashboard to deploy the functions.

---

## 1. Awards

**Endpoint**: `GET /api/v1/awards`
Retrieve all modern awards.

| Field                    | Type             | Description                                                 |
|--------------------------|------------------|-------------------------------------------------------------|
| `award_fixed_id`         | integer          | Unique fixed code for this award instance.                  |
| `award_id`               | integer          | Internal identifier of the award.                           |
| `award_operative_from`   | date             | Date the award came into operation.                         |
| `award_operative_to`     | date | null | Date the award was revoked (if any).                        |
| `code`                   | string           | Award code or number.                                       |
| `name`                   | string           | Human-readable award title.                                 |
| `last_modified_datetime` | datetime         | Timestamp of last modification.                             |
| `published_year`         | string           | Year of the annual wage review.                             |
| `version_number`         | integer          | Resource version (increments on update).                    |

---

## 2. Classifications

**Endpoint**: `GET /api/v1/classifications`
Retrieve all classification pay rates.

| Field                       | Type             | Description                                                                                      |
|-----------------------------|------------------|--------------------------------------------------------------------------------------------------|
| `award_fixed_id`            | integer          | Award reference.                                                                                 |
| `base_pay_rate_id`          | string | null | Base rate resource ID (prefixed).                                                                 |
| `base_rate`                 | decimal | null | Base pay rate value.                                                                             |
| `base_rate_type`            | string | null | Unit of base rate (Weekly, Hourly, etc.).                                                        |
| `calculate_pay_rate_id`     | string | null | Calculated rate resource ID.                                                                      |
| `calculated_rate_type`      | string | null | Unit of calculated rate (Hourly, Weekly, etc.).                                                  |
| `calculated_rate`           | decimal | null | Derived rate value for this classification.                                                      |
| `classification`            | string           | Sub‑level classification label.                                                                  |
| `classification_fixed_id`   | integer          | Unique fixed code for this classification instance.                                              |
| `classification_level`      | integer          | Hierarchy level (1 = lowest).                                                                    |
| `clause_description`        | string | null | Text description of the clause.                                                                  |
| `clause_fixed_id`           | integer          | Fixed code for the clause.                                                                       |
| `clauses`                   | string           | Clause number.                                                                                   |
| `employee_rate_type_code`   | string | null | Rate indicator (e.g., `AP` = Apprentice, `CA` = Cadet).                                          |
| `next_down_classification_fixed_id` | integer | null | Next lower classification code.                                                          |
| `next_up_classification_fixed_id`   | integer | null | Next higher classification code.                                                         |
| `operative_from`            | date             | Effective date of this classification.                                                           |
| `operative_to`              | date | null | End date of this classification.                                                                  |
| `parent_classification_name`| string | null | Parent classification label.                                                                    |
| `published_year`            | integer          | Year of the annual wage review.                                                                  |
| `version_number`            | integer          | Resource version.                                                                                |

---

## 3. Wage Allowances

**Endpoint**: `GET /api/v1/wage-allowances`
Retrieve all monetary allowances added to ordinary pay.

| Field                   | Type             | Description                                                       |
|-------------------------|------------------|-------------------------------------------------------------------|
| `allowance`             | string           | Allowance label.                                                  |
| `allowance_amount`      | decimal | null | Calculated allowance value for current year.                        |
| `award_fixed_id`        | integer          | Award reference.                                                  |
| `base_pay_rate_id`      | integer          | Base rate ID used for calculation.                                |
| `clause_fixed_id`       | integer          | Clause reference.                                                 |
| `clauses`               | string           | Clause number.                                                   |
| `code`                  | string           | Award code.                                                      |
| `is_all_purpose`        | boolean          | `1` = Applies to all; `2` = Specific group.                       |
| `last_modified_date_time`| datetime        | Last modified timestamp.                                          |
| `operative_from`        | date             | Effective date.                                                  |
| `operative_to`          | date | null | End date.                                                        |
| `parent_allowance`      | string | null | Parent allowance label.                                         |
| `payment_frequency`     | string | null | Frequency (per week, per hour, etc.).                           |
| `published_year`        | integer          | Year of the annual wage review.                                  |
| `rate`                  | decimal | null | Percentage of standard rate.                                     |
| `rate_unit`             | string | null | Unit of `rate` (e.g., Percent).                                  |
| `version_number`        | integer          | Resource version.                                                |
| `wage_allowance_fixed_id`| integer         | Fixed code for this allowance.                                   |

---

## 4. Expense Allowances

**Endpoint**: `GET /api/v1/expense-allowances`
Retrieve all expense-related allowances.

| Field                      | Type             | Description                                                       |
|----------------------------|------------------|-------------------------------------------------------------------|
| `allowance`                | string           | Allowance label.                                                  |
| `allowance_amount`         | decimal | null | Calculated allowance value for current year.                        |
| `award_fixed_id`           | integer          | Award reference.                                                  |
| `clauses`                  | string           | Clause number.                                                   |
| `clause_fixed_id`          | integer          | Clause reference.                                                 |
| `code`                     | string           | Award code.                                                      |
| `cpi_quarter_last_adjusted`| string | null | Last CPI quarter adjusted (populated from 2021).                  |
| `expense_allowance_fixed_id`| integer         | Fixed code for this expense allowance.                           |
| `is_all_purpose`           | boolean          | `1` = Applies to all; `2` = Specific group.                       |
| `last_adjusted_year`       | integer | null | Year when allowance was last adjusted.                              |
| `last_modified_date_time`  | datetime         | Last modified timestamp.                                          |
| `operative_from`           | date             | Effective date.                                                  |
| `operative_to`             | date | null | End date.                                                        |
| `parent_allowance`         | string | null | Parent allowance label.                                         |
| `payment_frequency`        | string | null | Frequency (per meal, per km, etc.).                              |
| `published_year`           | integer          | Year of the annual wage review.                                  |
| `version_number`           | integer          | Resource version.                                                |

---

## 5. Penalties

**Endpoint**: `GET /api/v1/penalties`
Retrieve all penalty rate adjustments.

| Field                   | Type             | Description                                                       |
|-------------------------|------------------|-------------------------------------------------------------------|
| `award_fixed_id`        | integer          | Award reference.                                                  |
| `base_pay_rate_id`      | string | null | Base rate ID used for calculation.                                |
| `classification_level`  | integer | null | Hierarchy level for this penalty.                                  |
| `clause_description`    | string           | Description from the award summary.                               |
| `clause_fixed_id`       | integer          | Clause reference.                                                 |
| `code`                  | string           | Award code.                                                      |
| `employee_rate_type_code`| string | null | Rate indicator (e.g., `AP`, `CA`).                                 |
| `last_modified_date_time`| datetime        | Last modified timestamp.                                          |
| `operative_from`        | date             | Effective date.                                                  |
| `operative_to`          | date | null | End date.                                                        |
| `penalty_calculated_value`| decimal | null | Calculated penalty rate.                                          |
| `penalty_description`   | string           | Textual description of the penalty.                               |
| `penalty_fixed_id`      | integer          | Fixed code for this penalty.                                      |
| `published_year`        | integer          | Year of the annual wage review.                                  |
| `rate`                  | decimal | null | Penalty as percentage of ordinary hourly rate.                   |
| `version_number`        | integer          | Resource version.                                                |

---

*For complete details and additional endpoints (e.g., Webhooks), please refer to the official API guide.*

---

# Cache & Fallback Architecture

Source: `src/services/fairworkApi.ts`
Tests: `src/tests/fairworkIntegration.test.ts` (happy path) and
`src/tests/fairworkCacheFallback.test.ts` (cache + fallback behaviour, added in
[PR #48](https://github.com/GaryOcean428/R80.3/pull/48)).

## Why this layer exists

R80.3 calculates legally compliance-critical wage rates. The Fair Work
Commission Modern Awards Pay Database (FWC MAPD) API is the single source of
truth, but it has three predictable failure modes that the application must
absorb without surfacing stale or empty rates as if they were correct:

1. **Annual rollover blackout.** Every year on 1 July, the FWC publishes the
   new financial-year rates. During the rollover window the upstream API can
   briefly return 5xx, return the previous year's data, or return a
   schema-shifted payload with zero apprentice rows.
2. **Edge-function timeouts.** Our Supabase edge function `auth-fairwork` proxies
   every call to the FWC API and is subject to the standard 15 s edge timeout.
3. **Replication lag.** New `award_rate_cache` rows written by a recent
   `sync-award-rates` run may not yet be visible on the read replica.

The cache & fallback ladder converts each of these into either a successful
response from a slightly older but still valid cache, or an empty array that
the rules engine and UI handle deterministically. **Silent fallback bugs would
ship stale or empty rates without surfacing the error**, so each fallback layer
has explicit behaviour tests in `fairworkCacheFallback.test.ts`.

## The three layers

```
┌──────────────────────────────────────────┐
│ Layer 1: In-memory cache (per process)   │
│ TTL: 24 h · scope: single tab/session    │
│ Key: `${verb}_${args}` — see table below │
└─────────────────┬────────────────────────┘
                  │ miss
                  ▼
┌──────────────────────────────────────────┐
│ Layer 2: Live FWC API (via edge fn)      │
│ Path: auth-fairwork → FWC MAPD           │
│ Retries: 3 attempts, exponential backoff │
│   1 s → 2 s → 4 s (BASE_RETRY_DELAY_MS)  │
│ Timeout: 15 s per attempt (AbortSignal)  │
└─────────────────┬────────────────────────┘
                  │ all retries exhausted OR returned empty
                  ▼
┌──────────────────────────────────────────┐
│ Layer 3: Supabase `award_rate_cache`     │
│ Persistent, populated by sync-award-rates│
│ Read funcs: readFromDbCache,             │
│             readAllFromDbCache           │
└─────────────────┬────────────────────────┘
                  │ no cached row OR DB error
                  ▼
              [] / null
```

When Layer 3 succeeds, the result is **also written back into Layer 1** so
subsequent calls in the same session do not re-query Supabase. This is verified
by the *"DB-fallback result is itself memoised"* test case.

## In-memory cache key reference

| Public function                  | Key template                                                                                       |
|----------------------------------|----------------------------------------------------------------------------------------------------|
| `fetchAwards(year)`              | `awards_${year}`                                                                                   |
| `fetchClassifications(id, year)` | `classifications_${id}_${year}`                                                                    |
| `fetchApprenticeRates(...)`      | `apprentice_rates_${id}_${fy}_${isAdult ? 'adult' : 'junior'}_${hasYr12 ? 'yr12' : 'std'}`         |
| `getAward(id, year)`             | `award_${id}_${year}`                                                                              |
| `fetchNTWClassifications(year)`  | `ntw_classifications_${year}`                                                                      |
| `fetchJuniorRates(id, year)`     | `junior_rates_${id}_${year}`                                                                       |

`clearMemoryCache()` is exported for testing and is also called automatically
by `syncFairWorkData()` on every successful sync so the next read picks up the
freshly written cache rows.

## `award_rate_cache` table schema

The Supabase fallback table holds one row per `(award_code, year)` pair.

| Column           | Type      | Notes                                                                |
|------------------|-----------|----------------------------------------------------------------------|
| `id`             | uuid PK   | Stable identifier — referenced by `clearAllAwardCache()` audit logs. |
| `award_code`     | text      | FWC MAPD award code, e.g. `MA000003`.                                |
| `year`           | integer   | Calendar year (FY = year − 1).                                       |
| `effective_date` | date      | The `operative_from` of the snapshot (typically `YYYY-07-01`).       |
| `rates`          | jsonb     | Payload — see "JSON shape" below.                                    |
| `fetched_at`     | timestamptz | When `sync-award-rates` last refreshed this row.                   |

Indexed on `(award_code, year)` for the `.eq().eq().single()` lookup pattern in
`readFromDbCache`, and on `(year)` for `readAllFromDbCache`.

### `rates` JSONB shape

The blob preserves the relevant subset of the upstream FWC payload that the
app actually consumes. Two keys are read by `transformCacheRowToAward` and
`transformCacheRowToRates`:

```jsonc
{
  "award_name":      "Building and Construction General On-site Award",
  "award_fixed_id":  1,
  "classifications": [
    {
      "classification_fixed_id": 101,
      "award_fixed_id":          1,
      "classification":          "1st year apprentice",
      "classification_level":    1,
      "base_rate":               null,
      "base_rate_type":          null,
      "calculated_rate":         24.5,
      "calculated_rate_type":    "Hourly",
      "employee_rate_type_code": "AP",
      "operative_from":          "2024-07-01",
      "operative_to":            null
    }
    /* ... more classification rows ... */
  ]
}
```

If `classifications` is absent or not an array, `transformCacheRowToRates`
returns `[]` rather than throwing — the same code path as a real DB miss.

## Per-function fallback ladders

The table summarises what each public function does at each layer. Every row
is exercised by at least one test in
[`src/tests/fairworkCacheFallback.test.ts`](../src/tests/fairworkCacheFallback.test.ts).

| Function                            | Layer 2 (live API)                                                                                              | Layer 3 (DB cache)                                                                                                                              | Final empty result    |
|-------------------------------------|-----------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| `fetchAwards(year)`                 | `GET /awards?year=…` with 3 retries.                                                                            | `readAllFromDbCache(year)`. Each row mapped via `transformCacheRowToAward`. Result memoised to Layer 1.                                          | `[]`                  |
| `fetchClassifications(id, year)`    | `GET /awards/{id}/classifications?year=…` with 3 retries.                                                       | **None** — there is no DB-cache layer for raw classifications.                                                                                  | `[]`                  |
| `fetchApprenticeRates(id, year, …)` | `GET /awards/{id}/classifications?year=…` with 3 retries → `transformClassificationsToRates`. Skipped if rates length is 0 (handles "API 200 with 0 rows"). | Resolves award code via `fetchAwards(year)`, then `readFromDbCache(award.code, year)` → `transformCacheRowToRates`. Result memoised to Layer 1. | `[]`                  |
| `getAward(id, year)`                | `GET /awards/{id}?year=…` with 3 retries.                                                                       | `fetchAwards(year)` (which itself walks the full ladder), then `find` by `award_fixed_id`.                                                      | `null`                |
| `fetchNTWClassifications(year)`     | Resolve `MA000016` via `fetchAwards`, then `GET /awards/{ma16.id}/classifications?year=…` with 3 retries. Filter `employee_rate_type_code === 'TN'`. | **None**.                                                                                                                                       | `[]` (also when MA000016 missing) |
| `fetchJuniorRates(id, year)`        | `GET /awards/{id}/classifications?year=…` with 3 retries. Filter `employee_rate_type_code === 'JN'`.            | **None** — the rules engine's `JUNIOR_RATE_BANDS` fraction fallback applies downstream when this returns `[]`.                                  | `[]`                  |
| `getAvailableYears()`               | N/A — direct Supabase query of `award_rate_cache.year`.                                                         | If the query errors **or** returns empty, falls back to a synthetic descending range from current year down to 2023.                            | Synthetic year list   |

### Specific edge cases worth knowing

- **`fetchApprenticeRates` "API 200 with 0 rows" sub-path.** Historically the
  most common FWC failure isn't a 5xx — it's a 200 with a schema shift that
  filters down to zero apprentice rows. `fairworkApi.ts` treats `rates.length
  === 0` after transformation as an API failure and falls through to the DB
  cache. This is its own test in `fairworkCacheFallback.test.ts`.
- **`fetchAwards` content-asserting test.** The pre-existing
  `fairworkIntegration.test.ts` only asserted `Array.isArray(awards)` on the
  fallback path, which would have passed silently for `[]`. The new test asserts
  `award_fixed_id`, `code`, `name`, and `published_year` are all populated from
  `transformCacheRowToAward` so any future regression in the transformer is
  caught.
- **`getAward` "not in cached list" sub-path.** When the per-award endpoint is
  down AND the requested `award_fixed_id` does not exist in the cached list
  walked by `fetchAwards`, the function returns `null` rather than fabricating a
  row. The rules engine treats `null` as "no award" and emits an empty rate
  package.
- **`getAvailableYears` synthetic range.** The fallback descends from the
  current calendar year to 2023, which matches the earliest year that has ever
  been published into the cache. Years before 2023 must never be selectable —
  the calculator has no rates for them.

## Retry semantics

`withRetry` lives in `fairworkApi.ts` and is used by every Layer 2 call. Three
points to remember when extending it:

1. **It runs the function exactly `MAX_RETRIES` times** (currently 3) — not
   `MAX_RETRIES + 1`. The first attempt counts.
2. **Backoff is between attempts, not before the first.** The total wall-clock
   delay across two failed attempts is 1 s + 2 s = 3 s.
3. **Tests must stub `setTimeout` to keep retry-exhaustion suites fast.** The
   pattern used by `fairworkCacheFallback.test.ts` is:

   ```ts
   const realSetTimeout = globalThis.setTimeout;
   vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) =>
     realSetTimeout(fn, 0)
   );
   ```

   This drops a 21 s test file to ~62 ms while preserving microtask ordering.

## When to write to which layer

| Action                                    | Where                                                                  |
|-------------------------------------------|------------------------------------------------------------------------|
| Live API success                          | Layer 1 only (`setCache`).                                             |
| DB fallback success                       | Layer 1 (`setCache`) — Layer 3 was already populated by sync.          |
| Manual sync via `syncFairWorkData()`      | Layer 3 (the `sync-award-rates` edge function writes the rows).        |
| End of test using the in-memory cache     | `clearMemoryCache()` in `afterEach` — this is called for every test in `fairworkCacheFallback.test.ts`. |

The application code never writes to Layer 3 directly. Only the
`sync-award-rates` edge function (triggered by `syncFairWorkData()` or the
scheduled cron) populates it.

## Operational checklist (annual rollover)

Around 1 July each year:

1. Trigger `syncFairWorkData()` for the new calendar year as soon as the FWC
   publishes the rates. This populates Layer 3 with the new financial-year
   data.
2. Verify the new year appears in `getAvailableYears()` (queries
   `award_rate_cache` directly, no in-memory cache to flush).
3. Spot-check that `fetchAwards(<new year>)` and
   `fetchApprenticeRates(<id>, <new year>)` return non-empty arrays for at
   least MA000003 (Building and Construction) and MA000020 (Building General).
4. If the FWC API is still returning the previous year's data on 2 July, the
   **DB cache hold** prevents the calculator from regressing to last year's
   rates — `fetchAwards` will return whatever the cache last had until the live
   API catches up.

## Related references

- [`src/services/fairworkApi.ts`](../src/services/fairworkApi.ts) — implementation
- [`src/tests/fairworkCacheFallback.test.ts`](../src/tests/fairworkCacheFallback.test.ts) — fallback behaviour suite (PR #48)
- [`src/tests/fairworkIntegration.test.ts`](../src/tests/fairworkIntegration.test.ts) — happy-path integration suite
- [`docs/20260304-r80-external-wage-sources-reference-v1.00W.md`](../archive/README.md) *(archived — was `20260304-r80-external-wage-sources-reference-v1.00W.md`)* — alternative wage sources when neither layer is available
