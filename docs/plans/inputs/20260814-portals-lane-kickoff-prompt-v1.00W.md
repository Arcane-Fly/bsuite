# Kickoff prompt — `claude-code-bsuite-portals`

Run `~/.agents/sync-skills.sh` first if `bsuite-gto-portals` and
`bsuite-fix-the-class-not-the-page` do not show up in `/skills` — they are new
directories, so the symlink tree may need a rebuild.

Then start Claude Code in `~/Desktop/Dev/bsuite` and paste everything below the line.

---

You are the `claude-code-bsuite-portals` lane. A second lane is already running in this estate on `docs/plans/20260814-nav-route-remediation-v1.00D.md` — do not touch its scope without reading the boundaries below.

**Your plan:** `docs/plans/20260814-portals-and-surface-class-remediation-v1.00D.md`. Execute it with `plan-executing`, task by task, gate by gate.

**Before Phase 0, in this order:**

1. Load these skills and actually read them — they exist because agents kept re-deriving what is in them: `bsuite-fix-the-class-not-the-page`, `bsuite-gto-portals`, `bsuite-rls-authz-red-team`, `bsuite-page-grid-layout`, `agent-mem-comms`, `plan-executing`.
2. Register presence: `memory_put qig_presence_claude-code-bsuite-portals` (category `presence`, content `{handle, role, repo, host, notify}`).
3. `inbox_list` namespace `bsuite` with `include_broadcast: true`. Read the DIRECTIVE from `operator-proxy-claude` dated 2026-08-14 titled "D-93..D-98 ruled + new lane + 4 boundaries". `inbox_ack` it once acted on, not merely read.
4. `memory_get bsuite_ruling_20260814_portals_d93_d95` and `bsuite_ruling_20260814_portals_d96_d98_match_anytime`. These are operator rulings. Cite them by D-number; never re-derive them; never ask them again.
5. Read `docs/20260814-notes-backlog-verification-register-v1.00F.md` — the measured state of every defect, with evidence. It is the baseline your work is judged against.

**Four facts that are wrong in `AGENTS.md` and will cost you a CI round each:**

- The card grid is **`react-grid-layout` v2** wrapped by `@bsuite/page-builder`. It is **not `@dnd-kit`**. Searching `useSortable`/`SortableContext`/`DndContext` finds none of these surfaces, and that is the mechanical reason every previous fix only touched the one page named in the ticket.
- `--role-destructive` is **RED** `oklch(0.580 0.230 25)`, not purple. Contract 0.7.0, 2026-08-02 — purple measured ΔE 0.006 against primary blue under protanopia. `theme-conformance.yml` enforces red as a hard zero.
- `@bsuite/page-builder` is at **0.8.0**, not 0.2.2. conduit is pinned `^0.6.3` and is minor-locked out of the fix.
- `Closes #N` in a PR merged to `development` is **inert** — GitHub auto-closes only on merge to `main`. Close by hand, with evidence rows.

**Boundaries with the nav-route lane. The first is a live collision — message them before they reach it:**

- **Nav Task 1.2 says "resolve `/portal/field-officer` duplication (conduit + crm7)". Do not let them pick a winner.** D-93 retires the walled portal entirely: both go, the page becomes a staff landing dashboard inside the main app, and the caseload becomes an RLS rule.
- Nav owns theme tokens **inside nav shell components**; you own the five app-local `oklch(0.994)` surface tokens, `--border-shell`, `--shadow-shell`, the audit lightness rule and the baseline.
- Nav owns public **routes** (guards, tokens, rate limits); you own **RLS policies** on tables. Hand findings across; don't fix in the other lane.
- Nav builds the Developer Portal Route Inspector; you codemod the raw `<button>`s and add the `no-raw-button` rule. Tell them to use shadcn `Button` from their first commit.

**Start with Phase 0 and do not reorder it.** Two of its four items are live cross-tenant reads on real data — `report_templates_select` exposes 23 platform-scope templates to every authenticated user in every tenant, and `contacts` still enumerates every host's staff over PostgREST because crm7#1675 was fixed in the query and not in the policy. All four items in Phase 0 are the same defect wearing different clothes. Design the row-scoping rule once; that is the entire point of the phase.

**How you report, per D-85:** every item is *closed with evidence*, *open with an owner and a date*, or *not started with a reason*. Never report a filed issue as an addressed defect. If something in the plan is already fixed and I missed it, say so and link the evidence — I would rather be corrected than have work repeated.

**Every PR carries a `## Class sweep` block with a stated surface count** (D-62). A PR that fixes only the URL named in the issue is a failed PR. If the fix has to be applied N times, you have not found the class.

**And every prohibition ships as something that fails.** A negative requirement written as a comment survives until the next agent who sees an opportunity to be helpful. The test is the requirement; everything else is a wish.

Report at each gate. Write `bsuite_session_<date>` and update `bsuite_session_latest` before you compact — not after.
