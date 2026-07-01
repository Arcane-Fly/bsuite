# BSuite Docs + Plans Closure Audit

> **Naming:** `20260701-docs-plans-closure-audit-v1.00W.md` · Status **W** (Working) · Created 2026-07-01.
> **Scope:** Parent `bsuite` plus submodule docs/plans for `business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, and `throughput`.
> **Validation loop:** §9.1 output-equivalence/status-equivalence. Claims below are tied to Git state, package manifests, file presence, and current GitHub issue/PR state.

## Snapshot

| Check | Result |
|---|---|
| Branch state | Root + six submodules are on `development` with `0 0` ahead/behind `origin/development`. |
| Open PRs | Zero open PRs across `bsuite`, `business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, and `throughput`. |
| Remote branches | Each repo has only `origin/development` and `origin/main`. |
| Open issue counts | `bsuite` 42, `business-suite-unified` 5, `crm7` 65, `conduit` 5, `braden` 3, `R80.3` 3, `throughput` 0. |
| Throughput display-order backend | Operator/local-agent applied `20260630120000_add_idea_display_order_persistence.sql`; REST ordered query now returns 200 and bogus-column control returns 400. |

## Marked Complete / Archived This Sweep

| Area | Disposition | Evidence |
|---|---|---|
| Throughput stack modernization | Archived to `throughput/docs/plans/archive/2026-07/20260504-stack-modernization-plan-v1.00A.md` with evidence companion. | `throughput/package.json` resolves React 19.2.7, Vite 8.0.16, Zod 4.4.3, TanStack Query 5.101.0, Tailwind 4.3.0, Zustand 5.0.14, dnd-kit 6.3.1, and `@bsuite/ui` 0.4.0; `throughput/components.json` exists; open throughput issues = 0. |
| Parent TS 6 tracking | Marked done in `docs/plans/STATUS.md`. | `bsuite#211` is closed (`closedAt=2026-05-12T12:56:03Z`); parent `docs/plans/README.md` already lists the TS 6 evaluation as completed/Approved. |
| R80.3 ThemeToggle + React Query parity | Roadmap row corrected to shipped. | `R80.3/src/components/ThemeToggle.tsx`, `R80.3/src/components/layout/AppSidebar.tsx`, and `R80.3/src/App.tsx` show the toggle and `QueryClientProvider`; package resolves `@tanstack/react-query` `^5.101.0`. |
| Braden Zod 4 + React Query parity | Roadmap row corrected to shipped. | `braden/docs/plans/archive/2026-05/2026-05-04-zod-4-migration.evidence.md`; package resolves `zod` `^4.4.3` and `@tanstack/react-query` `^5.101.0`. |
| Throughput capture-order persistence | Marked shipped inside the canonical-pattern plan; not archived because other pattern tails remain. | `throughput/supabase/migrations/20260630120000_add_idea_display_order_persistence.sql`, `DashboardOperations.ts`, `CaptureStage.tsx`, and operator REST evidence. |

## Not Archive-Ready

| Area | Reason |
|---|---|
| BSU dashboard dnd-kit adoption plan | BSU has dnd-kit primitives and feature-builder sortable UI, but the plan’s actual acceptance target is dashboard widget drag with per-user Supabase persistence in `dashboard_layouts`; that table/flow is not present. Keep open. |
| BSU EntitySelector adoption | No BSU `EntitySelector`/selector-family evidence found in `src/`; plan remains open. |
| Conduit shadcn init | `src/components/ui/*` primitives exist, but `components.json` is absent; the explicit shadcn acceptance criteria are only partially met. Keep partial/open. |
| Conduit EntitySelector adoption | No conduit `EntitySelector`/selector-family implementation found; plan remains open. |
| Throughput canonical-pattern adoption | dnd-kit drag and capture-order persistence shipped; EntitySelector data-source wiring and Cmd+K remain. Keep partial/open. |
| Recruitment communications + RAMS plan | Core cluster is Approved/shipped, but it intentionally carries follow-ups (`conduit#338`, `crm7#1090`). Keep as a shipped reference until the follow-up rows are re-homed or closed. |
| World-class audit tracker + remaining-work roadmap | Still active: open issues remain across parent, CRM7, conduit, BSU, R80.3, and braden. |

## Remaining Work By Repo

| Repo | Remaining work |
|---|---|
| `bsuite` | 42 open issues. Highest-signal active umbrellas: `#1422` production-spec completion, `#1505` deferred hardening, `#1542` advisor performance findings, `#635` uplift design language, `#1322` Sydney Supabase migration, `#1315` auth-token isolation follow-up, `#475/#479/#483` shared UI/PageGrid/Web Vitals, and page-builder/Jodie features `#937-#940/#554-#557`. |
| `business-suite-unified` | 5 open issues: dev OAuth consent on `d.*`, developer nav rebuild, branding redesign cascade, self-serve org deletion, and ADR-0002 schema-authoring unification. |
| `crm7` | 65 open issues. Priority clusters: FO admin link/RLS (`#1090`), Fair Work inspector access (`#866`), dependency hygiene (`#836`), report/grid UX (`#744`), GTO compliance/reporting (`#528-#533`, `#728-#734`), Xero cluster (`#556-#565`, gated by `#479`), entity-entry wizards/DRY FKs (`#659-#664`, `#460-#463`), schema/page-builder (`#475/#477/#481/#485`), and long-tail AI/data-context work (`#471/#468`). |
| `conduit` | 5 open issues: candidate schema (`#219`), public apply form (`#218`), CRM7 handoff snapshot (`#231`), online assessment integration (`#223`), and lodgement/talent-match outcome lifecycle (`#338`). |
| `braden` | 3 open issues: visual layout editor drag-and-drop, permissions, and publish workflow (`#264-#266`). |
| `R80.3` | 3 open issues: shared `@bsuite/stp`, CRM7-hydrated payroll composer, and per-host invoice runs (`#320/#321/#233`). |
| `throughput` | 0 open GitHub issues. Local docs still track two low-priority UX-pattern tails: EntitySelector data-source wiring and Cmd+K command palette. |

## Next Closure Targets

1. Close or re-home the two remaining Throughput canonical-pattern tails so the final local Throughput plan can archive.
2. Finish the conduit intake chain in dependency order: `#219` → `#218` → `#231`.
3. Close CRM7 `#1090` because it is both security/RLS and UX surface area.
4. Reconcile the world-class audit tracker Batch E rows after the already-completed cross-app auth and role/RLS dev-deploy validation evidence.
5. Keep production promotion blocked until the current `d.*` visual verification checklist is complete and documented.
