---
kind: record
authority: none
---

> **This is a spent execution plan, kept as a record.** It was the brief for the QA backlog
> red-team loop of 2026-07-29 — its lane assignments, contention doctrine and ship path.
>
> **It is not the authority on whether the backlog is clear.** The live sources are the issue
> trackers and the estate's own gates; this file records how the loop was organised.
>
> The classification standard requires `kind: record` to carry `authority: none`: a dated
> record is history, not a live document. Frozen (`F`) because a record of what was planned
> must not drift; per the operator ruling of 2026-08-26, `F` governs the document's
> mutability, not the state of the work.

# QA Backlog Execution Plan — Full Red-Team Completion

**Status:** Frozen (v1.00F)  
**Date:** 2026-07-29  
**Source:** `docs/20260729-unified-authoring-qa-audit-v1.00W.md`  
**Method:** master-orchestration + subagent-driven-development  
**Mode:** IMPLEMENT (user directed complete everything)

---

## Project family

**BSuite** (cwd + remotes: crm7, conduit, business-suite-unified, throughput, parent packages)

---

## Skills + MCP inventory (this session)

### Complementary skills by lane

| Lane | Skills | MCPs / tools |
|------|--------|--------------|
| **Dashboard canvas** | `bsuite-page-grid-layout`, `bsuite-shared-ui-rollouts`, `web-ui-ux-patterns`, `test-driven-development`, Context7 (react-grid-layout) | playwright, browser, filesystem |
| **Invites + seats** | `auth-supabase`, `check-security`, `db-supabase`, `general-dry-one-shot-architecture`, `test-driven-development` | supabase CLI, filesystem |
| **Functions proxy** | `check-security`, `check-api-design`, Deno edge patterns | filesystem, supabase functions |
| **Jodie BSU/Throughput** | `bsuite-brand-system`, `web-ui-ux-patterns`, `vercel-ai-sdk` (patterns), dry-one-shot | filesystem |
| **Analytics** | `db-supabase`, instrumentation | supabase |
| **Authoring** | `bsuite-pnpm-monorepo` (publish), dry-one-shot, migrations | npm publish workflows, supabase |
| **Red-team / DoD** | `agent-red-team-planning`, `agent-definition-of-done`, `test-verify-before-completion`, `git-finish-branch`, `bsuite-ship-visual-promote` | gh, browser |
| **Orchestration** | `cli-subagent-orchestration`, `agent-project-truth`, `qig-agent-comms` | qig-memory |

### Personas on every lane brief

Security · Reliability · Performance · Code quality · **User advocate** · **Developer advocate** · Red-team (Heavy)

### Contention doctrine

**ONE mutation worktree per repo.** Parallel only across different repos.

| Repo | Owner lane |
|------|------------|
| crm7 | Dashboard + invite-member + resolve_authoring_scope migration fix |
| packages (parent) | page-builder build/version bump (publish path) |
| business-suite-unified | platform-kit-proxy multipart + seat UI + BSU Jodie shell stub |
| throughput | Jodie shell parity + analytics writers |
| conduit | Remove illegal custom_pages write |

### Ship path

feat/* → development only first; visual on d.*; then promote with `--merge` never squash.

---

## Tasks (execution order)

### Wave 1 — parallel (different repos)

**T1 — crm7 Dashboard canvas P0**  
- Restore KPI strip OR put KPI keys in LG_LAYOUT with correct x/w  
- Bump layoutVersion 7→8 (and/or apply LAYOUT_EPOCH when not using DraggableCardPage)  
- Ensure Reset + drag to x≥4 works  
- Tests for default layout multi-column  
- Skills: bsuite-page-grid-layout, TDD  

**T2 — BSU platform-kit-proxy multipart + body Accept + Logs ?function=**  
- req.arrayBuffer() for non-GET; preserve Content-Type boundary  
- Don't force Accept: application/json on /body  
- Developer Logs honor ?function=  
- Skills: check-security, TDD  

**T3 — conduit ADR-0003**  
- Remove direct custom_pages.update write; local-only or crm7 API  
- Skills: dry-one-shot  

### Wave 2 — after T1 base stable / parallel remaining

**T4 — crm7 invite developer bypass**  
- tenant-management invite-member: allow platform_role developer | platform_admin | is_super_admin  
- Tests  

**T5 — BSU enterprise seat_count UI + teams empty path**  
- Developer Tenants or Licences: set seat_count  
- Team invite path when teams=0 (create default team or tenant-level invite)  

**T6 — page-builder publish prep**  
- Build dist with PageEditorLauncher; bump 0.5.3; commit parent  
- Note: npm publish via main merge OIDC  

**T7 — resolve_authoring_scope**  
- Drop broken fn OR rewrite against real schema; do not fake app_scope as deploy scope  

### Wave 3 — AI + analytics

**T8 — BSU shell Jodie** (minimal: mount shared pattern FAB + panel stub wired to existing tools or clear “AI licence” gate)  
**T9 — Throughput Jodie parity** (replace or wrap LLMPanel with Jodie branding + shared package where possible)  
**T10 — idea_analytics writers** (view/edit hooks + backfill optional)

### Wave 4 — red-team + ship

**T11 — Spec + quality review all SHAs**  
**T12 — Visual verify d.crm dashboard multi-col + d.suite functions if possible**  
**T13 — PR feat→development per repo**

---

## Out of scope / hold

- Charge-calc / AVETMISS (PI hold)  
- Full Feature Builder north-star  
- Production promote without visual OK  

---

## Done looks like

- Dashboard: Reset/default shows multi-column; drag places card at x>0; evidence screenshot  
- Invite: developer can invite on crm7 without tenant-admin-only 403  
- seat_count editable for enterprise tenant  
- Functions deploy path does not use req.text() for multipart  
- conduit no custom_pages write  
- page-builder src+dist export PageEditorLauncher; version bump committed  
- resolve_authoring_scope does not 42703  
- Throughput/BSU have Jodie-facing shell or explicit tracked partial with wire plan  
- idea_analytics has write path  
- All tests green; conventional commits; development PRs  
