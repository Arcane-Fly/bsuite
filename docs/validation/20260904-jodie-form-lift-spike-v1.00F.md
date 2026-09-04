---
kind: record
authority: none
owner: bsuite
evidence:
  - .github/workflows/app-quality-checks.yml
  - crm7/src/components/apprentices/ApprenticePlacementForm.tsx
  - crm7/src/components/tasks/TaskForm.tsx
  - crm7/src/services/apprenticePlacementService.ts
---

# Task 0 spike — can crm7's forms be lifted out of their routes?

**Date:** 2026-09-04 | **Verdict: PARTIAL** (spikes 001, 002 and 003 all answered) | Gates every task in
[`20260904-jodie-proposes-and-you-save-v1.00W.md`](../plans/20260904-jodie-proposes-and-you-save-v1.00W.md)

The question: can a crm7 page form render outside its route, pre-filled from a payload, and
save through the app's own service — so Jodie can fill in the real form instead of writing
straight to PostgREST?

## What was run

A throwaway suite rendering two forms of different shapes with no router, no route params and
no page provider, with the placement service's mutation hooks stubbed so the wiring is
observable. Four cases, all passing. The spike itself is deleted; this file is its result.

## VALIDATED — the shape works, and it already exists in-tree

`ApprenticePlacementForm` mounts standalone, pre-fills from a `placement` prop, and owns its
submit through `useCreateApprenticePlacement` / `useUpdateApprenticePlacement` — the same
hooks the page uses, over `apprenticePlacementService`. It imports `react-hook-form` and
`useState` and nothing else: no route context to satisfy.

That is precisely the contract the write-intent registry needs, in a component built for its
own reasons before this plan existed. The design is not speculative.

**One constraint found by failing first.** Pre-fill carries only the fields `defaultsFor()`
maps — a whitelist, not the table's columns. The first attempt passed `position_title`, which
the form does not map, and the value never appeared. So a registered intent's payload must be
expressed in the FORM's vocabulary, not the table's. That is the right way round — the form
owns what it accepts — but the registry must carry a per-intent schema rather than reusing a
database row type.

## The reason the verdict is PARTIAL

Two of crm7's form surfaces have that shape. Counted across `src/components` and `src/pages`:

| Shape | Count | Can Jodie fill it and press the app's Save? |
|---|---|---|
| **Self-contained** — owns submit and service | **2** | Yes, today |
| **Controlled** — `onChange` + `onSubmit` injected by the page | **18** | No: the page owns the write |
| **Page-embedded `<form>`**, no component at all | **47 pages** | No: there is nothing to register |

`TaskForm` is the counter-example, and it is the majority shape: `{formData, onChange,
isSubmitting}`. It renders anywhere, shows its values, and cannot save — the page holds both
the state and the service call. Lifting it gives you fields and no Save.

## Recommendation for the real build

1. **Go — but the plan's sequence is wrong.** Task 4 was written as "convert crm7's 16 write
   modules", as if tool readiness were the constraint. It is not: **form readiness** is. An
   intent can only be registered where a self-contained form exists, so the order is
   form-by-form, and the first conversions are the two that already qualify.
2. **Converting a controlled form is the actual work**, and it is a bigger job than the tool
   change beside it: moving submit and its service call out of the page and into the form,
   without changing what the page does. Twenty of those, plus 47 pages with no component to
   convert at all.
3. **The registry mechanism can be shared; its entries cannot.** `registerWriteIntent` is
   app-agnostic and belongs where conduit can also use it (`packages/jodie`, currently
   unwired, is the natural home). The entries bind a form to a service, both app-local, so
   they stay in the app.
4. **Do not let the tool layer wait for this.** Task 2 (the dial reaching the registry, shipped
   as crm7#2396) needed none of it, and `off` / `suggest` are useful the moment they are
   enforced — Jodie declining to act is better than Jodie acting invisibly, even before she
   can propose.

## Spike 003 — inline create — VALIDATED, and already built

D8.5 makes inline create non-negotiable: finishing must not require leaving the page. The
same form that validated spike 001 already does it.

`host_employer_id` renders as a `ClientSelector` with `QuickCreateEmployerModal` beside it,
and the modal's `onCreated` calls
`form.setValue('host_employer_id', client.id, …)` — so the record is created without
navigating **and the new record is applied to the field**, which is the half of D8.5 that
usually fails. A departure that returns to an empty picker is a fail, not partial credit;
this returns with the detail already selected.

Its own comment records why it exists, and it is not a Jodie requirement:

> *"Operator complaint class ("can only select existing", crm7 platform-wide sweep
> 2026-08-05): host_employer_id is a REQUIRED field with no inline create path. Reuses
> QuickCreateEmployerModal (same modal wired on /people/new for the equivalent field) rather
> than building a second employer-create surface."*

So the hardest UX requirement in the plan is met by an existing pattern, built for an operator
complaint a month ago, reusing the modal from the sibling surface rather than inventing one.
The registry does not need to solve inline create — it needs to not lose it.

**What remains unproven:** whether the other 19 form components have an equivalent path, or
whether `ApprenticePlacementForm` is as exceptional here as it is in owning its submit. Given
2 of 20 own their submit, assume the same ratio until measured, and treat inline create as
part of the per-form conversion cost rather than as already-solved estate-wide.
