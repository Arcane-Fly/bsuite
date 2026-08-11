# Data-platform completion — refined prompt

**Date:** 2026-08-11 · **Tier:** Heavy (5 workstreams, migrations, production + security stakes)
**Lane:** `claude-code-bsuite-dataplatform` · **Produced by:** `plan-prompt-enhancer`

## Intent

Five capabilities were discussed, planned or ruled on and are not delivered. One of them
(`dashboards`) is worse than absent: it is **merged and connected to nothing**, which reads as
progress on every dashboard and in every PR list. The operator asked directly whether his
reporting and data-manipulation capability was complete; the answer was no. This closes it,
staged through red-teaming, wiring verification, persona advocacy and a definition-of-done.

## Decomposition

| # | Workstream | Depends on | Repo |
|---|---|---|---|
| **W1** | Wire `dashboards` to a real UI — multi-visual canvas, cross-filtering | — | crm7 |
| **W2** | `/financial/reports/new` onto the catalogue builder | — | crm7 |
| **W3** | Developer console write paths (Extensions / Publications / Settings) | — | BSU |
| **W4** | User-log archive-recovery tier | retention (shipped) | crm7 |
| **W5** | Security-log analysis — investigate, then design | — | both |

W1–W4 are independent and parallelisable. W5 is investigation-first and must not be designed
before it is measured.

## What already exists — reuse, do not reinvent

This is the operator's stated recurring frustration: work half-done because existing
implementations were not checked. Each workstream has a mature thing to build on.

- **W1** — `DraggableCardPage` + `CanvasCard` are used in **379 files**. The dashboard canvas
  is a *reuse*, not new infrastructure. ⚠️ `LAYOUT_EPOCH = 101` and per-page `layoutVersion`
  govern saved-layout invalidation; read `bsuite-page-grid-layout` before touching either.
  Visuals already exist too: `ReportChartView` (bar/line/pie/number) is wired into
  `ReportTable`, and `ReportBoardViews` provides kanban/calendar.
- **W2** — `ReportBuilder({ onDefinitionChange, name })` is a small, clean interface. The
  financial page currently hand-rolls `Input`/`Textarea`/`Select` + `createFinancialReport`
  and never touches the catalogue. This is an embed, not a rewrite.
- **W3** — `platform-kit-proxy` already brokers privileged operations; the introspection RPCs
  (`list_public_tables`, `pk_list_columns`, `pk_fk_graph`) landed on 2026-08-10. Extensions
  and Publications panels have **zero** write references today.
- **W4** — `retention_archive`, `retention_run_log` and
  `run_audit_and_error_log_retention()` shipped 2026-08-10. Missing: a **restore** path, the
  2-year tier boundary, the prompt, and the role gate.

## Blindspots to counter — every one drawn from THIS session's own failures

1. **Building without wiring.** I merged `dashboards` and nothing consumed it. *Counter:* no
   workstream is done until a route renders it and a test proves the route renders it. Run
   `~/.agents/scripts/wiring-check.sh`.
2. **Trusting live DB state as reproducible.** Three protections on one table existed only in
   production, in no committed file. *Counter:* grep the baseline dump and migrations, never
   `pg_policy` alone.
3. **Migration version collisions.** Happened twice today; one reached `development` and
   would have silently shadowed another lane's migration. *Counter:* versions are **assigned
   below**, and must be re-verified against `origin/development` **and every open PR**
   immediately before opening a PR.
4. **Claiming verification without running it.** CI caught three rounds of my own mistakes.
   *Counter:* run the tests locally before pushing; state what was run.
5. **A test that cannot see its subject.** My drift guard failed under Deno's
   `--allow-read=.` sandbox for a permissions reason unrelated to its assertion. *Counter:*
   put each test where it can read what it asserts on.
6. **Duplicated policy that drifts.** Two instances found today, one already diverged.
   *Counter:* single-source any list two surfaces share.
7. **A guard never seen failing.** *Counter:* positive-control every new guard — break it,
   watch it fail, restore it.
8. **The grant trap.** The baseline grants `anon` ALL PRIVILEGES on every new table at CREATE
   time, before your GRANT runs. *Counter:* literal top-level `REVOKE ALL … FROM anon`; a
   file-reading lint cannot see one inside `DO`/`EXECUTE format()`.

## Assigned resources — do not choose your own

| Workstream | Migration | pgTAP suite |
|---|---|---|
| W1 dashboards UI | `20260812183000` | 74 |
| W3 console writes | `20260812184500` (BSU) | — |
| W4 archive recovery | `20260812190000` | 75 |

## Personas — the acceptance lens

- **End user (tenant member).** Can they find a dashboard, read it, and understand whose data
  they are seeing? Does a report reaching past 2 years *offer recovery* rather than fail or
  silently return nothing?
- **Tenant admin / compliance officer.** Can they answer *"who put this in the system four
  years ago?"* self-service, without a support ticket? Is the role gate real?
- **Developer-user.** ⭐ The operator's explicit question: **can a developer visually, in the
  UI, build a new feature, connect an existing one, and create entities?** Not "is there an
  API" — can they *do it on screen*. W3 is the core of this and it is currently read-only.
- **Platform developer.** Can they set a dashboard as default for everyone, for one tenant, or
  for nobody — per the 2026-08-10 ruling?

## Constraints

- **Browser automation is available again** — `chrome-devtools` MCP reconnected mid-session
  (29 tools). Playwright and Context7 remain disconnected. Visual verification is therefore
  possible and **is expected**; code-tracing alone is insufficient for UI claims.
- **Signed-in verification is blocked** by crm7#1601 (dev login broken). E2E credentials exist
  in `.env.local` (`CRM7_E2E_*`) and a session can be injected, as done earlier today.
- **Migration-dependent behaviour cannot be validated on dev** — the shared database sits at
  `main`, dev serves `development` code (bsuite#1892). Say so rather than claiming a pass.
- Never print a secret value. `.env.local` is gitignored; keep it that way.

## Skills & MCPs to use

| Use | For |
|---|---|
| `bsuite-page-grid-layout` | W1 — canvas, `layoutVersion`, `LAYOUT_EPOCH` hazards |
| `bsuite-brand-system` | all UI — pure white/black banned, error is red, OKLCH tokens |
| `bsuite-rls-authz-red-team` | W3, W4 — RC1–RC4, page-gate vs proxy parity |
| `bsuite-reliability-red-team` | W3, W5 |
| `general-dry-one-shot-architecture` | W2 — one owning surface, no parallel reporting UI |
| `machine-db-postgres-best-practices` · `db-supabase` | W4 migrations |
| `web-tanstack-query` · `web-dnd-kit` · `web-shadcn` | W1, W2 |
| `test-driven-development` · `test-verify-before-completion` | all |
| `agent-definition-of-done` (D1–D7) | the gate |
| **Agents:** `bsuite-user-advocate` | the three personas + live checks |
| **MCP:** `supabase` (read-only SELECT for measurement) | all — never `apply_migration` |
| **MCP:** `chrome-devtools` | visual + a11y verification |
| **MCP:** `qig-memory` | broadcast findings to the bsuite channel |

## The refined prompt

> Deliver W1–W5 above. For each: **measure the current state first** and state the numbers;
> **reuse the named existing implementation** rather than building a parallel one; **wire it to
> a route** and prove the route renders it; **positive-control every guard** you add; and
> **run the tests locally before pushing**, saying which you ran.
>
> Use the assigned migration versions and suite numbers verbatim, re-verifying they are free
> against `origin/development` and every open PR immediately before opening a PR. Never apply a
> migration — not via CLI, not via Supabase MCP.
>
> Branch from `origin/development`, GPG-sign, commit with an explicit pathspec (other agents
> stage secrets in this tree), and open one PR per submodule targeting `development`.
>
> Judge each workstream against the four personas, and answer the developer-advocate question
> explicitly: **can a developer do it visually, on screen?** Where the answer is no, say so
> rather than describing the API that exists instead.
>
> W5 is **investigation before design**: measure what security signals exist today and whether
> anything reads them, then recommend. Do not assume the answer is the error-filing mechanism
> pointed at a new source — that should be a conclusion, not a premise.
