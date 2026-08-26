# GTO Persona Excellence Design

> **Naming:** `20260725-gto-persona-excellence-design-v1.00F.md` · Status **D**  
> Brainstorm output for BSuite excellence program. Grounded in manuals roles, portal routes, Jodie tool registry, National GTO Standards themes.

## Approaches considered

1. **Big-bang rebuild portals per persona** — high cost, high risk. Reject for now.  
2. **Persona matrix + gap ledger + ship top UX/Jodie fixes** — recommended.  
3. **Only manuals expansion** — insufficient; users need product changes.

**Recommendation:** (2) — measure journeys against code, ship P0/P1, ledger the rest.

---

## Personas (who uses what)

### 1. Platform developer (`platform_role` developer)
| Need | App surfaces | Jodie today |
|------|--------------|-------------|
| Tenant create, Feature Builder, schema, branding platform | BSU `/developer/*` | Partial UI builder tools |
| Cross-tenant support | crm7 switch + audit | Low |
| **Must not** lose Edit Page / schema gates | Header pencil, Feature Builder reserved names | docs_flag_gap |

### 2. Enterprise admin
| Need | Surfaces | Gaps |
|------|----------|------|
| Multi-org hierarchy, branding inheritance | BSU + crm7 tenants | Hierarchy errors must not look like “no org” |
| Enterprise-wide reports | crm7 reports | Platform-only reports reserved for developer |
| Assign features to orgs | Feature assignment | Must be portal-intuitive |

### 3. Org admin (GTO)
| Need | Surfaces | Gaps |
|------|----------|------|
| People, hosts, placements, training contracts | crm7 | STA email confirm queue discoverability |
| Payroll/charge rates link | R80 + crm7 | Funding offsets expected vs received UX |
| Org documents + ack | crm7 settings/org-documents | Manuals how-to exists |
| Roles & permissions | crm7 | Guardrails for quoting floors |
| BOOT on custom rates only | R80/crm7 | Manuals: EBA not re-tested |

### 4. Field officer
| Need | Surfaces | Gaps |
|------|----------|------|
| Visits, WHS, host capacity, apprentices on site | crm7 field flows | Mobile UX / offline |
| Host safety rating meaning | hosts | Domain ruling #1142 open |
| Jodie: log visit, flag risk | scheduling + crud tools | WHS workflow edge not fully wired |

### 5. Payroll / finance
| Need | Surfaces | Gaps |
|------|----------|------|
| Timesheets → invoices → Xero | crm7 + R80 | Xero multi-org P2 issues open |
| Funding offsets on charges | R80 funding_offsets | Jodie `apply_funding_offset` may need registry wire |
| Award rates / Fair Work | R80 | payday super, STP backlog issues |
| Reports empty-params | fixed #1161 | multi pickers shipped |

### 6. GTO internal employee (non-admin)
| Need | Surfaces | Gaps |
|------|----------|------|
| Assigned tasks, own timesheets, docs | crm7 employee | Email assignment how-to |
| Page editing if permitted | Edit page | Cards autoHeight |

### 7. Apprentice (portal)
| Need | Surfaces | Gaps |
|------|----------|------|
| See placement, host, RTO, training plan progress | portal apprentice | Must be simple, mobile-first |
| Timesheets submit | portal | Error messages plain language |
| Documents upload / acknowledge policies | portal + org docs | |
| Pay / leave questions | often off-platform | Jodie for FAQ + escalate |
| WHS incident report | portal if enabled | |

### 8. Host employer (portal)
| Need | Surfaces | Gaps |
|------|----------|------|
| See hosted apprentices, timesheet approve | host portal | Capacity assessment GTO Std 1.3 |
| Monthly pack / invoices | host pack report | email delivery |
| WHS obligations understanding | manuals host-client | Clear “what GTO vs host owns” |
| Cannot edit award rates | RLS | Correct |

### 9. AASN / external
| Need | Surfaces | Gaps |
|------|----------|------|
| Limited contact/placement view | if licensed | Scope carefully |

---

## Journey friction (product truths)

1. **Convert-to-apprentice** must always complete handover (docs+emails) — non-fatal warn if edge fails.  
2. **STA status** arrives by email — confirm queue must be first-class nav item.  
3. **Funding** is offset on charge rates for *registered* apprentices — quote-time expected + ops received.  
4. **BOOT** only for custom rates — not EBAs.  
5. **Incentives calendar** 2026→2027 federal changes must surface in funding schemes UI before 2027.  
6. **Jodie parity gap:** strong on CRUD/search/email/reports/timesheets/UI-builder/docs; weak on full WHS workflow execution, full Xero ops, every portal action, multi-step “file a claim end-to-end”.

---

## Design principles (UX)

- One primary action per screen; progressive disclosure.  
- Persona-default home: FO → visits; payroll → timesheets/invoices; host → my apprentices; apprentice → this week.  
- Every destructive action confirm + undo where possible.  
- Empty states teach next step + “Ask Jodie”.  
- No free-text entity IDs (one-shot).  
- Colourblind-safe status (no red/green only).

## Approval for this design

Operator asked to execute excellence program after prompt-enhance — treat as approved design for analysis + P0/P1 shipping; large epics stay ledger-only.
