# UX Implementation — Round 2 — 2026-07-28

Implements the remaining VERIFIED-OPEN items from
`docs/20260728-operator-ux-bug-register-v1.00W.md` after Round 1 merged Tasks 1–5.

Same verifier-gated loop contract as Round 1: binary success per task, verifier ≠ maker,
max 3 fix rounds, no-progress → escalate.

## Global Constraints (unchanged from Round 1)

- Branch off `development` in the owning repo, in an **isolated `git worktree`**. NEVER `main`.
- Commits **GPG-signed** (`%G?` = `G`). Conventional commits. pnpm only. TS strict, no untyped `any`.
- **Verify before fixing.** Much of the operator's register was already fixed by the time it was
  compiled. `VERIFIED-FIXED` is a valid and common outcome — report it and stop.
- **Search before escalating**: `docs/`, the `bsuite_` memory keys, and
  `/home/braden/Desktop/Dev/archived-repos-docs`. Only escalate if all three are silent.
- **One-shot doctrine binding** (`docs/20260227-dry-one-shot-architecture-v1.04A.md` §1):
  CRM7 owns Clients / Host Employers / Placements / Apprentices / Leads. Conduit owns recruitment.
  R8 owns Award Rates / Charge Calculations / Funding Offsets. Read across boundaries; never duplicate.
- **Ownership fences — hermes owns, do NOT touch:** `crm7/src/pages/charge-rates/`,
  `crm7/src/services/fundingService.ts`, `crm7/src/pages/claims/` (crm7#1265, crm7#1262);
  BSU `src/lib/enterpriseLicenceEvents.ts`, `src/pages/Admin/TeamMembers.tsx`.

---

## Task 6 — Communications: make emails readable (register #1)

Repo: `crm7`. **The one VERIFIED-OPEN item from the comms cluster.**

The Sent / SMS / Internal / All tabs on `/communications` have **no row-click and no detail view**.
Only the separate Inbox tab (a different data source) has a working read pane. The operator's report
was "emails, cant be opened and read".

Do NOT rebuild the Inbox read pane — it works. Build the missing detail view for the other tabs and
wire row activation to it. Follow the Inbox pane's existing pattern rather than inventing a second one.

Acceptance: clicking a row in Sent / SMS / Internal / All opens a readable detail view showing the
message body; a test asserts row activation renders the body and fails if the handler is removed.

## Task 7 — Dashboard edit-in-place (register #6)

Repo: `crm7`. Operator: *"Edit page, should be able to add elements, widgets, entities, and update the
form on the live page in edit mode. Currently it takes me to a new screen for page builder and only
provides for the creation of a completely new page. **We did recently have the ability to add new
elements on page but this is now missing again.**"*

That last sentence means this is a **regression** — the capability existed. Find when it worked
(`git log` the dashboard/page-builder area), determine what removed it, and restore it rather than
designing something new. If it was deliberately removed, say so with the commit and stop.

Relevant existing primitives — reuse, do not rebuild: `PageGridLayout`, `usePageGridLayout`,
`CanvasCard`, `DraggableCardPage`, and the `WidgetPalette` component (memory notes it exists but has
historically been mounted nowhere — verify current state).

Acceptance: in edit mode on `/dashboard`, a user can add a widget/element to the **current** page
without being redirected to a new-page flow; a test covers it.

## Task 8 — Portal delivery + pipeline source (register #7, #20, #22)

Repo: `crm7`.
- **#7** `/portal` just redirects to `/dashboard`. There is no way to send clients, host employers,
  workers, or apprentices their personal portal. Provide the delivery affordance.
- **#20** `/portal/worker` should produce a shareable link suitable for a job ad, taking a candidate
  through to application. (Posting to Seek is explicitly OUT of scope for this task — link generation only.)
- **#22** `/pipeline/kanban` should pull from **conduit**, which owns recruitment under one-shot.
  Determine whether crm7 currently duplicates recruitment data; if it does, that is the finding —
  report it before building.

Note a `feat/portal-share-links` branch exists in crm7 — check it before starting; the work may be
partly done.

Acceptance: a portal link can be generated and copied for at least one recipient type; `/portal` no
longer dead-ends to the dashboard; the pipeline's data source is documented and, if duplicating
conduit, reported.

## Out of scope this round

- **#21** client→host one-shot compliance and **#15** docs screenshots — queued for round 3.
- **#3/#3b/#3c** platform card invariant and **#11** advanced config — hermes owns (A6, A9).
