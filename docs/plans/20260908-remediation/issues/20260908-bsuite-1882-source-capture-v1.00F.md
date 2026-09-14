---
kind: record
authority: none
owner: bsuite
---

# [P1][reporting] No PowerBI-style dashboards or charts exist anywhere in the suite

https://github.com/GaryOcean428/bsuite/issues/1882

Snapshot updatedAt: 2026-08-24T03:27:49Z. Open at capture; re-read live.

Operator, 2026-08-10: *"all reports and data analytics capabilities must be the airtable/excel/sheets style UI and related capabilities. and ability to do powerbi style dashboards and charts etc."*

**Where the suite actually is, measured today:**

| Capability | State |
|---|---|
| Airtable-style grid over any entity | **exists** — catalogue engine, 88 entities, joins/GROUP BY/aggregates, `@bsuite/data-grid` |
| Per-report chart (bar/line/pie/number) | **exists** — `ReportChartView`, one chart per report |
| Kanban + calendar views | **exists** as of crm7#1548 |
| **Multi-visual dashboard canvas** | **DOES NOT EXIST** |
| **Cross-filtering between visuals** | **DOES NOT EXIST** |
| **Drill-down / drill-through** | **DOES NOT EXIST** |
| Saved dashboards per tenant/user | **DOES NOT EXIST** (`saved_views` 0 rows, no dashboard entity at all) |

The gap is not charting — it is that a chart is **trapped inside one report**. PowerBI-style means N visuals on one canvas over a shared filter context, which needs a `dashboards` entity, a layout, and a filter bus. None of the three exists.

**The good news on feasibility:** the hard part is already built. The catalogue engine can answer arbitrary grouped/aggregated questions, `@bsuite/page-builder` already does drag-resize canvases across 382 crm7 files, and `recharts` is installed. A dashboard is those three composed — not new infrastructure.

Needs scoping as a program, not a ticket. Blocking question for the operator: does a dashboard belong to a **tenant** (everyone sees the same one) or a **user** (each builds their own)? That decides the entity shape before anything is built.
