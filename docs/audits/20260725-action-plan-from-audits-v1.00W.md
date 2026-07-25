# Action plan from docs↔code + dead-code audits (2026-07-25)

> Status **W**. Generated with qwen3.8-max-preview from four audit files. Substantive-match = done.

## Archive

Moved ~6MB `docs/archive` (+ plans/archive) trees to:
`/home/braden/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/`
In-repo pointer READMEs only.

## SAFE_DELETE executed (this session)

- root `charge-calculator-mapd.jsx`
- `tenantRoutes.ts` ×5 apps (+ BSU test)
- throughput: TestComponent, BlobDemo, SupabaseSetup, Todo examples, unused hooks/agents/utils
- crm7: EnvironmentValidator, OneShotEntryDemo, fair-work-api-test, theme-toggle duplicate, UsiInput, AccessibilityControls, route validators, unused funding/eligibility libs, etc.
- braden: demo components, dead admin CMS remnants
- R80: ImportCalculations, CalculatorContext
- BSU: dbSchemaToZod.ts

**Kept (NOT_DEAD_IMPLEMENT):** AVETMISS formatters, WHS stubs, fundingOffsetTool, invoicingService (tested/docs).

## STALE-DOC fixes (priority)

1. PARENT-DOCS.md ×6 — dead links to archived roadmaps
2. parent docs/README + adr/README
3. dry-one-shot v1.01A → v1.02A refs
4. crm7 xero flag/scopes docs
5. schema-registry 0.4.0 blocker docs → 1.0.0

## NOT_DEAD_IMPLEMENT next

1. WHS tables+edge fns (crm7)
2. AVETMISS wire formatters → export UI
3. VET qualification_unit_structure table
4. Financial summary edge aggregation
5. Conduit STA parsers (6 states) when email samples exist
