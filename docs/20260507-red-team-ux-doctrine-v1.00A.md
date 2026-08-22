# Red-Team + UX-DX Doctrine

**Version:** 2026-05-07
**Status:** AUTHORITATIVE for all BSuite crons and scheduled agents
**Supersedes:** Ad-hoc red-team mentions in individual cron task bodies (Universal Rulebook §6 still applies as parent)
**Operator directive:** "no task or issue or feature or anything can be done without a red team sweep AND that sweep should include a specific UX agent that advocates for simplest and most intuitive and powerful UX design choices."

This document is referenced by all 5 BSuite crons (`8c20448f`, `00a858f4`, `4dc23cee`, `800f0627`, `585a62cd`). Every agent that opens, reviews, merges, or closes work in any of the 7 BSuite repos MUST follow this doctrine.

---

## 1. Best-Practice Research Is Paramount

**No work begins without a research pass — including bug fixes, lint cleanups, and "obvious" tweaks.**

Every task must produce a `research_evidence` block before any code is written. The block lives in the PR description and the agent's run record.

### 1.1 Required research inputs

| Source | When to consult | Tool |
|---|---|---|
| Latest framework docs (React 19, Next.js 16, Tailwind v4, Zustand, dnd-kit, TanStack, RHF, Zod, Framer Motion, shadcn) | EVERY change touching that framework | `fetch_url`, `search_web`, Context7 if available |
| Loaded skill catalog | EVERY task | scan `<available_skills>` and `<scoped_skills>` for matches; load top 1–2 |
| AUTH_CANONICAL.md + Universal Rulebook | EVERY task touching auth, RLS, branding, or app boundaries | `read /home/user/workspace/bsuite-state/AUTH_CANONICAL.md` |
| Existing repo docs (`docs/plans/STATUS.md`, `docs/UNIFIED-ROADMAP.md`) | EVERY task | grep + read |
| Production bundle / Vercel deploy logs | When fixing a regression | `gh api deployments`, `curl <prod-url>/<chunk>.js` |
| Live BSuite Plan Dashboard https://garyocean428.github.io/bsuite/ | EVERY proactive scan | `fetch_url` |
| Supabase MCP advisors | Touching DB | `mcp__supabase__get_advisors` |
| OWASP / WCAG guidelines | Touching auth or accessibility | search_web with target year |

### 1.2 Research evidence block (template)

Paste this in the PR body BEFORE the implementation summary:

```markdown
## Research evidence

| Source | Citation | What it informed |
|---|---|---|
| @bsuite/page-builder@0.2.5 source (npm) | dist/PageGridLayout.js:42 | Confirmed [1,2,3,4,6,12] presets ship in latest |
| dnd-kit Sortable docs | https://docs.dndkit.com/presets/sortable | Used <SortableContext> wrapping pattern |
| Tailwind v4 @theme directive | https://tailwindcss.com/docs/v4-beta | Switched to OKLCH tokens |
| Loaded skills | dnd-kit, shadcn-ui, ui-ux-pro-max | Patterns + acceptance criteria |
| AUTH_CANONICAL.md | §3.2 OIDC silent re-auth | RLS policy includes client_id check |
```

### 1.3 Research-Critic agent

Every red-team sweep includes a Research-Critic agent that verifies:

- Did the research evidence cite primary sources (framework docs, library source) — not just blog posts?
- Are the cited versions the latest at PR time? (`gh search code` to confirm cited version === current main)
- Did the agent skip a relevant skill that should have been loaded?
- Are there competing best practices the research missed?

Research-Critic blocks merge if any of the above flag.

---

## 2. Six-Role Red-Team Sweep (MANDATORY)

**Every PR — feature, fix, chore, docs — gets a red-team table in the body before merge.** Crons that find a missing table BLOCK the merge with a templated comment.

### 2.1 Required roles

| # | Role | Owns |
|---|---|---|
| 1 | **UX-DX Agent** | UX simplicity + DnD + prebuilt component reuse + page wiring (see §3) |
| 2 | **Security Agent** | secrets, RLS, AUTH_CANONICAL.md, injection, dependency CVEs |
| 3 | **Performance Agent** | INP <200ms, Lighthouse ≥90, bundle size, geometric purity (QIG) |
| 4 | **Reliability Agent** | error handling, network jitter, undo/redo, autosave, idempotence |
| 5 | **Quality Agent** | conventional commits, no downgrades, DRY, no TODO-later, test coverage |
| 6 | **Research-Critic Agent** | verifies §1 research evidence is current + primary-source-cited |

### 2.2 Red-team table (template)

```markdown
## Red-team review (rulebook §6 + Red-Team-UX Doctrine 2026-05-07)

| Role | Verdict | Evidence |
|---|---|---|
| UX-DX | PASS | DnD via dnd-kit Sortable; prebuilt shadcn Card; <2 clicks to apply; entity-link picker visible at `src/components/PageLinker.tsx:34`; WCAG-AA in light+dark verified; INP measured at 142ms via Lighthouse |
| Security | PASS | No new secrets; RLS policy at `supabase/migrations/20260507_xxxx.sql:18` includes `client_id` check; AUTH_CANONICAL.md §3.2 cited |
| Performance | PASS | Bundle delta +1.2KB gzipped; Lighthouse 94; geometric purity n/a (BSuite) |
| Reliability | PASS | Network-jitter test at `tests/e2e/jitter.spec.ts:12`; undo/redo wired; autosave debounce 500ms |
| Quality | PASS | conventional commits; pnpm-lock.yaml regen'd; no downgrades; 0 TODO-later |
| Research-Critic | PASS | Latest dnd-kit v6.3.1 verified; React 19 patterns from official docs; relevant skills loaded |
```

A "FAIL" or "BLOCKED" verdict on ANY role blocks merge until resolved.

### 2.3 Iteration discipline

Per `multi-agent-red-team-implementation` skill:

1. Plan → Red-team → Research → Refine (×2)
2. Implement → Red-team → Fix → Verify (×2)
3. QA → Prove completion

Two iterations of red-team minimum. Don't ship after just one pass.

---

## 3. UX-DX Agent (the new mandatory voice)

**The UX-DX agent is the loudest seat at the table.** Operator directive: "simple to use but powerful for the user. DnD, prebuilt components, easy to apply to pages and connect to other pages and entities."

### 3.1 UX-DX charter

For every change touching a user-facing surface (page, component, form, dashboard, editor, modal, toast, error state, empty state, loading state):

> Does this make the most powerful capability accessible to the user with the simplest possible interaction? If a developer or admin user could do something with one drag instead of editing JSON, did we ship the drag?

### 3.2 UX-DX checklist (every PR)

- [ ] **DnD-first wherever ordering, layout, or hierarchy is involved.** Use `@dnd-kit/sortable` for lists, `react-grid-layout` (via @bsuite/page-builder) for canvas. NEVER ship a numeric index input where DnD applies.
- [ ] **Prebuilt component reuse.** Reach for shadcn/ui primitives, @bsuite/page-builder, @bsuite/auth, @bsuite/* shared packages BEFORE writing a one-off. If a primitive doesn't exist but the pattern recurs, propose adding it to the shared package and tag the issue `prebuilt-component-candidate`.
- [ ] **Application-to-pages is one click.** Adding a widget/form/section to a page should be drag-from-palette OR pick-from-modal — never code edit. PageEditorLauncher / canvas editor patterns are canonical.
- [ ] **Page-to-page connections are visual.** Linking a CTA, a follow-up route, a menu item, a tenant-scoped redirect → use a route picker UI, not a free-text path field. Route picker should autocomplete from the live route manifest.
- [ ] **Page-to-entity connections are visual.** Binding a widget to an entity (table, view, query, RPC) → use an entity picker that surfaces the live Supabase schema (`mcp__supabase__list_tables`) with type metadata. Never raw SQL strings in user-facing surfaces.
- [ ] **No raw JSON/code where a visual control exists.** OKLCH color → color picker. Layout JSON → canvas. Permission grants → permission matrix. Workflow → flow editor.
- [ ] **Two-click rule.** Common admin tasks (add user, invite member, create page, link entity) reachable in ≤2 clicks from the relevant landing page.
- [ ] **Inline edit beats navigation.** When the user is on a page, "Edit Page" should toggle inline edit mode, NOT navigate to /developer/pages. (See bsuite#545 precedent.)
- [ ] **Undo/redo on destructive actions.** Anything that changes persistent state allows undo within 30s.
- [ ] **WCAG-AA in light AND dark.** Both contrast ratios verified. Auto-dark-mode tested.
- [ ] **INP <200ms on every interaction.** Measured via Lighthouse or Web Vitals API.
- [ ] **Mobile reflow verified.** Single-breakpoint layouts must squash gracefully (see crm7#377).
- [ ] **Empty states are inviting, not punishing.** "No data yet — drag your first widget here" beats "0 results".
- [ ] **Error states give the user a path forward.** Never just "Error: 500". Always: what happened, why, what to do next, contact path if blocked.
- [ ] **Live data only.** No mock data shipped to production UI (Universal Rulebook §7).
- [ ] **DX matches UX.** Developer surfaces (developer portal, schema builder, plan editor, shadow tenant) get the same DnD/prebuilt/visual treatment as end-user surfaces.

### 3.3 UX-DX BLOCKED examples (red flags that auto-fail)

- "Edit the JSON in the textarea" for layouts, navigation, permissions, themes, routes
- "Type the table name" for an entity binding
- A slider that locks at 2 when the user clearly needs 1 (bsuite#538 precedent)
- A button labeled "Resize with the bottom-right handle" without a working handle (bsuite#539 precedent)
- A modal with 7+ form fields and no smart defaults
- An admin dashboard with no inline preview
- A connection between two pages requiring code-edit instead of a picker
- "Click Save then refresh" — autosave + live update is canonical
- A workflow editor that asks for "step 1 component name" as free text

### 3.4 UX-DX hand-off template (when proposing UX changes)

When the UX-DX agent flags a UX gap, it must propose a fix in the same comment, not just complain:

```markdown
## UX-DX FAIL — proposed fix

**What's wrong:** Users have to type the page slug into the link target field on the CTA editor.

**Why it fails the doctrine:** Violates §3.2 "page-to-page connections are visual". Route picker pattern not used.

**Proposed fix:**
- Replace `<Input name="target">` at `src/components/CTAEditor.tsx:87` with `<RoutePicker tenantId={tenantId} />`
- ~~RoutePicker exists at `packages/ui/RoutePicker.tsx` (currently used in nav builder)~~
  **Corrected 2026-08-22: it does not exist.** No file named `RoutePicker` is present
  anywhere in the estate, under any path. The proposed fix above therefore has a
  prerequisite this doc did not state — the component has to be BUILT, not swapped in —
  and the "≈30 min, single component swap" estimate on the next line is costed against a
  component that was never there. An `A` (Approved) marker on a doc makes a claim like
  this one read as verified.
- Effort: ≈30 min, scope = single component swap, no schema change
- Skills required: shadcn-ui, dnd-kit (for drag-from-palette variant)

**If approved, file as:** `feat(ui): use RoutePicker for CTA target field — visual page-to-page connection`
```

---

## 4. Cron Integration Points

### 4.1 8c20448f — Inter-Agent Worker (hourly)

Insert between current STEP 4 (pick work) and STEP 5 (ship):

> **STEP 4b — RESEARCH PASS (mandatory).** Before writing any code, produce a research_evidence block per Doctrine §1.2. Save to `/home/user/workspace/cron_tracking/$CRON_ID/research-<iso>.json` for the run record.

> **STEP 5b — RED-TEAM TABLE (mandatory).** PR description MUST contain the 6-role red-team table per Doctrine §2.2. PR body without the table = auto-WIP'd, not opened for review.

> **UX-DX advocacy (mandatory).** Every PR touching a user-facing surface MUST have UX-DX checklist (§3.2) ticked off in the PR body. Cron will challenge missing items as a PR review comment, blocking merge.

### 4.2 00a858f4 — Ship-Loop (every 6h)

Insert into STEP 4 (PR handling):

> **STEP 4d — DOCTRINE GATE.** Before squash-merging any open PR (including Copilot- and Claude-authored), verify the PR body contains the §2.2 red-team table AND the §3.2 UX-DX checklist (when user-facing). If missing, post the templated comment, label the PR `needs-redteam`, and SKIP merge this run. Re-check next run.

### 4.3 4dc23cee — Daily Digest

Add to the Outlook email body:

> **§ Doctrine compliance — last 24h**
>
> - PRs merged WITH red-team table: N
> - PRs merged WITHOUT red-team table (POLICY VIOLATION — auto-revert candidate): N
> - PRs labeled `needs-redteam` blocked: N
> - UX-DX FAILs flagged: list with PR links

### 4.4 800f0627 — Supabase Advisor Remediation

Insert before STEP 5 (apply fixes):

> **STEP 4D — UX-DX CONSULT.** For every auto-fix candidate touching RLS, function visibility, or schema in a way users will see (e.g., revoked function from anon → triggers a UI permission error), simulate the user-facing impact. If the fix would surface a new error state without a path forward, downgrade to MANUAL REVIEW and add to the bsuite_heavy_work_queue.

### 4.5 585a62cd — Cron D failover

Insert into STEP 2 (take-over):

> **DOCTRINE PRESERVATION.** When taking over a hung cron's work, preserve the doctrine: do not close issues, merge PRs, or apply fixes that would have failed the §2 red-team gate. If the original cron's work-in-progress includes a PR without the red-team table, mark the PR as `needs-redteam` and write a failover note — do NOT auto-merge to "rescue" it.

---

## 5. Enforcement Doctrine

### 5.1 Hard rules (no exceptions)

- A PR without a §2.2 red-team table CANNOT be merged. No "I'll add it later". No "this is too small". The 5-minute table is the cost of a merge.
- A user-facing PR without a §3.2 UX-DX checklist CANNOT be merged.
- A research_evidence block missing primary-source citations CANNOT be merged.
- Operator's "FF-OBVIOUS-FIX-AUTONOMY-20260506" still applies — but obvious fixes still need a 30-second research pass + 1-minute red-team table. The bar is "did you confirm with primary source" not "did you write a 5-page essay".

### 5.2 Soft rules (negotiable with operator approval)

- Iteration count: §2.3 says ×2; for trivial fixes operator may approve ×1 in PR thread.
- Skill loading: §1.1 mandates skill catalog scan; operator may explicitly waive ("just ship it") in conversation.

### 5.3 Auto-revert

If a PR was merged in violation of §5.1 hard rules (e.g., a Copilot PR that snuck through with no red-team table), the next ship-loop run (00a858f4) opens a follow-up issue `doctrine: backfill red-team for <PR>` and labels it `p1,doctrine-backfill`. The branch is NOT auto-reverted (that's destructive); the issue forces a follow-up audit PR within 24h.

### 5.4 Doctrine drift detection

Daily digest (4dc23cee) tracks compliance trend. If <90% of merges in any 7-day window have full red-team tables, the digest fires a P0 escalation to operator: "Doctrine adherence dropping — N/M PRs in last 7d missed the gate."

---

## 6. Reference Patterns

### 6.0 Authoritative companion document

**`/home/user/workspace/bsuite-state/20260507-bsuite-uplift-design-language-v1.0ACTIVE.md`** is the authoritative IA + component spec. Every PR touching an admin surface MUST cite which §6 mapping it implements + which of the 12 primitives it consumes. The design-language doc and this doctrine are co-equal — doctrine defines the gate, design-language defines what passes the gate.

### 6.1 Skills the UX-DX agent draws from

- `ui-ux-pro-max` — UX patterns + accessibility + 99 UX guidelines
- `dnd-kit` — drag handles, sortable, resize handles, keyboard support
- `shadcn-ui` — primitives, sidebar, mobile nav, theming, dark mode
- `forms-and-validation` — RHF + Zod patterns
- `framer-motion` — declarative animations + AnimatePresence
- `tanstack-query` — server-state + optimistic updates
- `bsuite-brand-system` — D2C Neon Electric (OKLCH) vs Corporate (braden) discipline

### 6.2 Past UX wins to cite as precedent

- bsuite#538 / 1-column slider → fixed by adding the missing 1
- bsuite#539 / corner resize handle → fixed by wiring `resizeHandles=['se']`
- bsuite#545 / Edit Page button → fixed by toggling inline edit, not navigating
- crm7#377 / mobile reflow → fixed by single-breakpoint reflow

### 6.3 Past UX failures to learn from

- "Type the slug" patterns where pickers should exist
- JSON textareas for navigation, permissions, layouts, themes
- "Save & refresh" workflows where autosave is the doctrine
- Error toasts with no recovery path

---

## 7. Operator Override

The operator (Braden) may explicitly waive any clause in conversation. Waivers are session-scoped and must be re-stated each session. Cron loops do NOT inherit chat-level waivers — they always enforce the full doctrine.

If a cron is unsure whether a waiver applies, it errs on the side of enforcement (block merge, ask in next inbox message).

---

## 8. Versioning

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-07 | Initial publication. Operator directive on red-team + UX-DX agent. |

Future revisions go here. Never delete prior versions; supersede.
