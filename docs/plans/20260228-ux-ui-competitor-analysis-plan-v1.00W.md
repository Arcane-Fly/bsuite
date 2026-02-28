# UX/UI Competitor Analysis and Enhancement Plan

**Date:** 2026-02-28
**Version:** 1.00W
**Status:** Working
**Scope:** CRM7, Conduit, R80.3

---

## 1. Feature Matrix

Comparison of BSuite (CRM7 + Conduit) against competitors across key UX/UI capabilities.

| Feature | BSuite | WorkforceOne | ReadyTech | JobAdder | Bullhorn | monday.com | Zoho Recruit | Lever | Greenhouse | HubSpot CRM |
|---------|--------|-------------|-----------|----------|----------|------------|-------------|-------|------------|-------------|
| Dashboard customisation | Partial | No | No | No | Limited | Yes | Yes | No | No | Yes |
| View switching (table/kanban/card/calendar/timeline) | Calendar only | No | No | Limited | Limited | Yes | Yes | Limited | Limited | Yes |
| Drag-and-drop (pipeline/dashboard/tasks) | Conduit pipeline only | No | No | Yes | Yes | Yes | Limited | Yes | Yes | Yes |
| Saved views/filters | No | No | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Custom fields | No | No | Limited | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Bulk actions | No | No | No | Limited | Yes | Yes | Yes | Yes | Yes | Yes |
| Inline editing | No | No | No | Limited | Limited | Yes | Yes | No | No | Yes |
| Keyboard shortcuts | Cmd+K palette | No | No | No | No | Yes | Limited | Yes | Limited | Yes |
| Dark mode | Yes (CRM7 + R80.3) | No | No | No | No | No | No | No | No | No |
| AI assistants | Yes (Jodie + Scout) | No | No | No | No | Limited | Limited (Zia) | No | No | Limited (ChatSpot) |
| Command palette (Cmd+K) | Yes | No | No | No | No | No | No | No | No | No |

---

## 2. Where BSuite Leads

BSuite has a meaningful advantage in four areas no GTO-focused competitor matches:

- **Dark mode** -- CRM7 and R80.3 ship with full dark mode; no GTO platform (WorkforceOne, ReadyTech) offers this, and even generalist ATS/CRM platforms largely lack it
- **AI assistants (Jodie + Scout)** -- purpose-built AI assistants with tool execution, natural-language CRUD, and report generation; no competitor in the GTO space has anything comparable; generalist platforms offer only basic chatbot or copilot features
- **Command palette (Cmd+K)** -- power-user keyboard navigation across the entire application; only monday.com and Lever offer similar functionality among competitors
- **Calendar views (CRM7)** -- integrated calendar view for pipeline and scheduling; most GTO platforms rely on external calendar tools

---

## 3. Quick Wins (1--2 days each)

| ID | Feature | Description | Target App |
|----|---------|-------------|------------|
| QW-1 | View Toggle Component | Segmented button to switch between table, kanban, and card views on any entity list page | CRM7, Conduit |
| QW-2 | Card View Component | Responsive grid of entity summary cards as an alternative to table view; reusable across contacts, companies, apprentices | CRM7 |
| QW-3 | Keyboard Shortcut Help Modal | Press `?` anywhere to show a modal listing all available keyboard shortcuts; auto-populated from a central shortcut registry | CRM7, Conduit |
| QW-4 | Upgrade Conduit Pipeline to @dnd-kit | Replace raw HTML5 drag-and-drop in the Conduit recruitment pipeline with `@dnd-kit` for better accessibility, mobile support, and animation | Conduit |
| QW-5 | Inline Quick Filters Bar | Horizontal bar of filter chips above entity lists for one-click filtering by status, owner, date range, and tags | CRM7, Conduit |

---

## 4. Medium Effort (1--2 weeks each)

| ID | Feature | Description | Target App |
|----|---------|-------------|------------|
| ME-1 | Saved Views System | Allow users to save a combination of filters, sort order, and view type as a named view; views are per-user with an option to share with the team | CRM7, Conduit |
| ME-2 | Customisable Dashboard Widgets | Drag-and-drop widget grid on the main dashboard; widgets include KPI cards, charts, recent activity, pipeline summary, and calendar | CRM7 |
| ME-3 | CRM7 Full Kanban Pipeline | Promote the existing pipeline stub to a fully interactive kanban board with drag-to-move, column config, and deal value summaries | CRM7 |
| ME-4 | Bulk Actions Framework | Checkbox selection on any table view with a floating action bar supporting bulk assign, bulk status change, bulk tag, bulk delete, and bulk export | CRM7, Conduit |
| ME-5 | Custom Fields System | Tenant-defined custom fields on contacts, companies, deals, apprentices, and candidates; field types include text, number, date, dropdown, multi-select, and URL | CRM7, Conduit |

---

## 5. Strategic Features (1+ month)

| ID | Feature | Description | Target App |
|----|---------|-------------|------------|
| SF-1 | Inline Editing Across Tables | Click any cell in a table view to edit it in-place; changes save on blur with optimistic UI and undo support | CRM7, Conduit |
| SF-2 | AI-Powered Smart Views | Jodie and Scout suggest filtered views from natural language (e.g. "show me all apprentices expiring this quarter"); views are saveable once generated | CRM7 |
| SF-3 | Configurable Kanban Card Builder | Drag-and-drop card layout editor to choose which fields appear on kanban cards; per-pipeline configuration with role-based defaults | CRM7, Conduit |
| SF-4 | GTO-Specific Timeline View | Horizontal timeline visualisation for apprenticeship lifecycles: training plan milestones, placement start/end dates, probation, BOOT review dates, and contract renewals | CRM7 |
| SF-5 | Dashboard Template Marketplace | Pre-built dashboard layouts for common GTO roles (ops manager, compliance officer, sales, finance); one-click apply with customisation after install | CRM7 |

---

## 6. Priority Recommendations

### CRM7

| Priority | Item | Rationale |
|----------|------|-----------|
| 1 | QW-1: View Toggle Component | Unlocks kanban and card views with minimal effort; prerequisite for ME-3 |
| 2 | QW-5: Inline Quick Filters Bar | Immediate usability gain on every list page; low risk |
| 3 | ME-3: CRM7 Full Kanban Pipeline | High-visibility feature that directly competes with Bullhorn and HubSpot; builds on QW-1 |
| 4 | ME-1: Saved Views System | Differentiator vs GTO competitors; power users expect it |
| 5 | ME-2: Customisable Dashboard Widgets | Brings BSuite in line with monday.com and HubSpot on dashboard flexibility |
| 6 | SF-4: GTO-Specific Timeline View | Unique to the GTO domain; no competitor offers apprenticeship lifecycle visualisation |
| 7 | SF-2: AI-Powered Smart Views | Extends the Jodie/Scout advantage into everyday navigation |

### Conduit

| Priority | Item | Rationale |
|----------|------|-----------|
| 1 | QW-4: Upgrade Pipeline to @dnd-kit | Fixes accessibility and mobile issues in the core pipeline interaction |
| 2 | QW-5: Inline Quick Filters Bar | Recruiters filter candidates constantly; this is table-stakes UX |
| 3 | QW-3: Keyboard Shortcut Help Modal | Supports power recruiters who process high candidate volumes |
| 4 | ME-4: Bulk Actions Framework | Recruiters need to bulk-reject, bulk-advance, and bulk-tag candidates |
| 5 | ME-5: Custom Fields System | Every recruitment agency has unique data requirements per client |
| 6 | ME-1: Saved Views System | Recruiters maintain multiple pipeline views (per role, per client, per stage) |
| 7 | SF-3: Configurable Kanban Card Builder | Lets recruiters surface the fields that matter for each pipeline |
