---
kind: plan
authority: operator
owner: bsuite
evidence:
  - .github/workflows/app-quality-checks.yml
  - scripts/check-exported-not-mounted.mjs
  - crm7/api/ai/chat.ts
  - crm7/src/lib/ai/evaluateJodieTurn.ts
  - crm7/src/lib/ai/tools/index.ts
  - crm7/src/lib/ai/tools/pgrest.ts
  - crm7/src/lib/ai/tools/unfiltered-writes.test.ts
  - crm7/src/pages/settings/configuration.tsx
---

# Jodie proposes, you save — one write path for the assistant and the app

**Date:** 2026-09-04 | **Version:** 1.00W | **Status:** Working — scoped, not started
**Scope:** feature | **`ui_touched`: YES**

**Operator ruling, 2026-09-04 07:49 AWST:** *"I want the one that requires the design work.
per standing rules best long term solution."* — chosen over the cheaper option of rerouting
Jodie's existing writes through the service layer. The shape asked for, 07:28 AWST:
*"wouldn't she write to the UI and then save like normal?"*

**Extends, does not replace:**
[`20260903-jodie-automation-notifications-design-v1.00W.md`](./20260903-jodie-automation-notifications-design-v1.00W.md)
(operator-approved 2026-09-03, *"sounds good. go."*) and its
[implementation plan](./20260903-jodie-automation-notifications-implementation-v1.00W.md).
**Both were untracked in the parent working tree when this was scoped; they are committed
in this PR** so the approved design cannot die with the next `git submodule update`.

---

## Why this is not a new feature

The approved design already specifies it. Its automation dial defines `suggest` as
*"Propose; a person clicks"*, and its Surfaces table gives `api/ai/chat.ts` the job of
*"Entitlement, query quota, **tool ceiling**"*. What the operator asked for today is that
design's `suggest` level, which was specified and not built.

So this is not "add an approval mode". It is: **the tool layer has no notion of the dial,
and no notion of proposing, so three of the five approved levels cannot exist.**

## Three findings, measured 2026-09-04

**1 — The dial gates nothing.** `evaluateJodieTurn` resolves the level at
[`api/ai/chat.ts:535`](../../crm7/api/ai/chat.ts) and the value is never read again.
`ToolExecutionContext` (`userId`, `tenantId`, `permissions`, `apiUrl`, `token`) has no level
field, and `createToolRegistry(toolContext)` is handed every tool at every level. At `off` —
*"Answer. No state-changing tools"* — Jodie still receives all sixteen crm7 write modules and
can execute them. Task 6 of the implementation plan ("chat path honours quota + level")
shipped the quota half only.

**2 — Writes bypass the app's own save path.** Every write tool goes
`tool -> /api/db/<relation> -> PostgREST`, as the caller under RLS. The app's screens save
through the ~30 services in `crm7/src/services/`. Two roads to the same tables, and only one
of them carries validation, derived fields, side-effects and cache invalidation.

**3 — That road has already cost.** [`pgrest.ts`](../../crm7/src/lib/ai/tools/pgrest.ts)
documents four bug classes made by hand at those call sites.
[`unfiltered-writes.test.ts`](../../crm7/src/lib/ai/tools/unfiltered-writes.test.ts) records
**eleven tools** that issued `PATCH` with the row id in the body and no query string — in
PostgREST that is `UPDATE … SET id = …` across every row the caller's RLS admits. A
tenant-wide overwrite, avoided by luck, not by design.

**4 — And the dial's own default is maximum autonomy.** `ai_quotas` holds **zero rows for
all seven tenants**. The dial UI exists and is mounted
(`crm7/src/pages/settings/configuration.tsx:1379` renders `JodieOverageSettings`, which
upserts `automation_level` and the overage cap), and **nobody has ever saved it**. With no
row, `evaluateJodieTurn` falls back to `ceilingForLicence(...)` — so the four enterprise
tenants resolve to `auto_act`, the most permissive level there is, by omission rather than
by choice. Nothing is broken: the synthetic quota is the documented fallback and the code
path works. But "we never asked" currently reads as "do everything without asking".

**Sibling count: 20 write tool modules across 2 apps** — crm7 16 of 25, conduit 4 of 8.
Enumerated by grepping every non-test module under each app's `src/lib/ai/tools/` for a
mutating `fetch` or `.insert/.update/.upsert`. No proposal concept exists in code anywhere.

---

## The design

**One idea: Jodie fills in the app's own form, and Save is the app's own Save.**

Not a bespoke "Jodie proposal card" with its own fields and its own writer — that is a second
UI and a third road to the tables. The panel renders **the same React form component the page
renders**, pre-filled, and its Save calls **the same service the page's Save calls**.

### The write-intent registry

One module per writable entity, consumed by BOTH the page and Jodie:

```ts
registerWriteIntent({
  id: 'job.create',
  label: 'Create a job',                    // the user's noun, not the schema's
  schema: jobCreateSchema,                  // zod — the single validator
  Form: JobForm,                            // the component the page already renders
  save: (payload, ctx) => jobService.create(payload, ctx),
  permission: 'jobs.create',
})
```

- **Jodie's write tools become intent producers.** A write tool returns a validated draft
  payload for a registered intent. It performs no network write, at any level.
- **The panel renders `Form`**, pre-filled from the draft, inline — the person edits and
  presses Save.
- **Save calls `save()`** — byte-identical to the page's path, so validation, derived fields,
  audit rows and cache invalidation come free and cannot drift.
- **The dial decides the mode**, and only the mode:

| Level | What a write intent does |
|---|---|
| `off` | Intent producers are not in the registry at all. Read tools only. |
| `suggest` | Draft rendered in the panel; person edits and saves. |
| `draft` | Same, plus drafts may be persisted and picked up later. Nothing sends. |
| `raise_and_notify` | Non-sending intents call `save()` directly; sending intents propose. |
| `auto_act` | Intents call `save()` directly, inside the query and overage caps. |

**Even at `auto_act` the write goes through `save()`.** Raw PostgREST leaves the tool layer
entirely, so finding 3's class dies at every level rather than at the cautious ones.

### Why this shape and not the alternatives

| Alternative | Why it lost |
|---|---|
| Reroute tools through services, keep them writing | The cheaper option the operator explicitly declined. Fixes findings 2 and 3, leaves 1 — the person still never sees it coming. |
| A `jodie_proposals` table and a review queue page | Adds a surface, a state machine, and a round trip out of the conversation to approve. The queue becomes a second inbox nobody empties. |
| A bespoke proposal card rendering fields from JSON | A second form implementation per entity that silently drifts from the real one. More UI, and the drift is invisible until it is wrong. |
| Navigate the person to the real page, pre-filled | Faithful, and it fails the round-trip test: finishing the task means leaving the conversation, and coming back is manual. |

---

## Red-team — pass 1

| Attack | Verdict |
|---|---|
| **Load-bearing and unverified:** that crm7's page forms can render outside their route. | **Real risk. Gates the whole design.** Task 0 is a spike on three forms of different shapes; if two of three cannot be lifted, the design changes before any tool is touched. |
| **Siblings:** conduit has 4 write modules and its own tool layer. | Registry must be shared, not crm7-local. `packages/jodie` already exists and is **unwired** (index rows `pkg.jodie.*`) — candidate home, decided in Task 0. |
| **Duplication:** does this re-implement `packages/jodie`'s agent loop? | No — that is an autonomous loop with no consumer. This is the authority and presentation layer. Must not grow a second loop. |
| **Round trip:** the form needs a related record that does not exist (a company while creating a contact). | Inline create in the embedded form, or the design fails D8.5 exactly where it claims to win. Non-negotiable acceptance criterion. |
| **Rollback:** an abandoned proposal. | Nothing is written until Save, so abandonment is free — but the draft must not survive as orphan state. Drafts at `draft` level are explicitly owned and expiring. |
| **Happy path only:** bulk intents (update 200 rows). | One form cannot render 200 rows. Bulk needs its own preview shape — a count, a sample and the diff — or it is out of scope for v1. **Named as out of scope below.** |

## Red-team — pass 2

| Attack | Verdict |
|---|---|
| **Time-of-check/time-of-use:** permission checked when proposing, not when saving. | `save()` re-checks at save time. The proposal is a suggestion, never an authorisation. |
| **Replay:** can Jodie be talked into re-saving a proposal? | The draft is inert data; the only writer is the person pressing Save in the panel. No confirm token to forge, because there is no tool-side write to confirm. |
| **Concurrency:** the row changed between propose and save. | The embedded form loads current values and merges the draft over them, so the person saves against what is there now, not against what Jodie saw. |
| **Quota:** the turn's quota ran out mid-review. | Save is not a Jodie query. It is the app's own save and must not be metered or blocked by `NO_QUOTA` — otherwise a 402 eats work already typed. |
| **The dial is per tenant, the panel is per user.** | Ceiling is the tenant's; nothing here introduces a per-user dial (explicitly out of scope in the approved design). |

Two passes, stopping here.

---

## Tasks

**Task 0 — Spike: can the forms be lifted?** **DONE 2026-09-04 — PARTIAL, go.**
[Verdict](../validation/20260904-jodie-form-lift-spike-v1.00F.md): the shape works and already exists
in-tree (`ApprenticePlacementForm` mounts with no route context, pre-fills from a prop, and
saves through its own service), but only 2 of crm7's form surfaces have it. The registry
mechanism belongs in `packages/jodie` where conduit can reach it; the entries stay per-app.
One constraint: a form pre-fills only the fields its own `defaultsFor()` maps, so an intent
carries a per-intent schema, not a database row type.
**Still open from the decomposition:** whether a related-record picker can create inline —
D8.5 makes that non-negotiable, and it should be spiked before any conversion work.

**Task 1 — The registry.** `registerWriteIntent` + the resolver, with the zod schema as the
one validator. No consumers yet.

**Task 2 — The dial reaches the tools.** The resolved level is passed to
`createToolRegistry`, which filters by it — an explicit parameter rather than a
`ToolExecutionContext` field, because no individual tool consults the level and putting it in
the context every tool receives would imply a per-tool decision that does not exist. Bite: at
`off`, assert the registry contains no write tool. **This alone closes finding 1 and can ship
ahead of the rest.** Shipped as crm7#2396.

**Task 3 — Panel renders an intent.** The Jodie panel renders a registered `Form` inline,
pre-filled, with the app's Save. Inline create for related records.

**Task 4 — Convert crm7's write modules to intent producers**, one entity at a time, each
with the sibling page's service as the single writer. Retire the raw `/api/db` write path per
module as it converts.

> **Re-sequenced by the Task 0 spike, 2026-09-04
> ([verdict](../validation/20260904-jodie-form-lift-spike-v1.00F.md)).** This task was written as
> though tool readiness were the constraint. It is not — **form readiness** is. An intent can
> only be registered where a self-contained form exists, and crm7 has **2** of those against
> **18** controlled forms (the page owns submit) and **47** pages with embedded `<form>` and no
> component at all. So the order is form-by-form, not module-by-module, and the larger half of
> this task is converting a controlled form into a self-contained one — moving submit and its
> service call out of the page without changing what the page does. Start with the two that
> already qualify: `ApprenticePlacementForm` and `new-risk-assessment-form`.

**Task 4b — The default becomes `suggest`, once proposing exists.** Change the no-row
fallback in `evaluateJodieTurn` from `ceilingForLicence(...)` to `suggest`, so a tenant that
has never chosen gets "Jodie proposes, you save" rather than "Jodie acts". **Sequenced
deliberately after Task 3:** dropping the default today removes capability with nothing to
replace it, which is why Task 2 kept the ceiling fallback and changed no behaviour.

**Do not seed `ai_quotas` from a migration.** The precedent is the calendar-permission work
of 2026-09-03, where writing `role_capabilities` rows for live customers from a deployment
was refused for the same reason: it changes seven real tenants' settings as a side effect of
a release, and it makes the stored row lie about whether anyone ever chose it. The fallback
constant is the thing to change; the row appears when a tenant saves.

**Task 5 — Conduit's 4 modules**, same pattern, once crm7's is proven.

**Task 6 — Workflows honour the ceiling.** The approved design's *"a send node cannot fire on
`draft`"*, still unbuilt.

## Out of scope

- Bulk intents over many rows (needs its own preview shape — separate plan)
- Per-user or per-mailbox dials (out of scope in the approved design, and stays so)
- A proposals table, a review queue, or any second inbox
- Read tools — they are unaffected and stay as they are
- Anything in the 2026-09-03 design that is already built

## Done-contract

`docs/plans/loop-contracts/20260904-jodie-proposes-and-you-save-loop-contract-v1.00W.md`

## Not done in this scoping pass

The feature-index row. `docs/00-roadmap/BSUITE-FEATURE-INDEX.md` currently carries another
lane's uncommitted edits alongside a regenerated component registry; adding a row would mean
committing their in-flight work with mine. The row is Task 0's first act, once that lane
lands.
