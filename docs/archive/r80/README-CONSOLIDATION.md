# R8 Consolidation (R80.1 + R80.3)

This app will be the canonical "R8". We will port:
- Calculation context and saved calculations (R80.1)
- Enterprise agreements manager (R80.1)
- Export calculations (R80.1)
- FairWork service (R80.1) unified with existing services
- Keep R80.3 UI/UX and expand settings and management

Next steps:
1. Add CalculatorContext provider and integrate R80.1 context into R80.3
2. Introduce EnterpriseAgreementManager and ExportCalculations pages/components
3. Wire services and supabase auth from env variables
4. Validate build and ship sweeping PR