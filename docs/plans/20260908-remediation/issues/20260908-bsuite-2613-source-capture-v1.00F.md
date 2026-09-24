---
kind: record
authority: none
owner: bsuite
---

# audit-legibility.mjs is a path trigger, not a step — the visual legibility gate has never run in CI

https://github.com/GaryOcean428/bsuite/issues/2613

Snapshot updatedAt: 2026-08-31T02:49:40Z. Open at capture; re-read live.

## The gap

`scripts/audit-legibility.mjs` appears in `.github/workflows/theme-conformance.yml` **once**, at line 60, inside `on.pull_request.paths`. Changing the file re-runs the workflow; **no step invokes it.** So the estate's only WCAG-AA-on-a-real-page gate has never executed in CI.

Same shape as bsuite#2610 (`check-cross-tenant-references.mjs`, referenced only by the feature index) and the two `gh pr view` workflows — a capability that exists, is named, and is wired to nothing.

## Why it matters, measured

Run by hand on 2026-08-28 it found a live defect on production:

```
✗ suite.crm7.app /settings/organization [light]
    3.56:1 (need 4.5)  14px  "Nested sub-orgs aren't supported here. A…"
```

That was `text-warning-text/80` — an opacity modifier on an AA-tuned token. 21 sites carried the same shape across five repos; all are now fixed, and `scripts/check-dimmed-text-tokens.sh` guards the class statically.

## The second half of the gap: it must run AUTHENTICATED

Unauthenticated the same command reports **"0 findings, 41 skipped"** — every real page redirects to login, so it measures three cells out of forty-four and returns green. A zero from this gate means *blind* unless a storage state is supplied:

```
node scripts/audit-legibility.mjs --storage <state.json> --app bsu <urls...>
```

With a state it measured six BSU routes × two themes and found the defect above. So wiring it without credentials would produce a permanently-green gate that sees only login screens — worse than not wiring it, because it would look covered.

## What wiring it needs

- a step that actually runs it (schedule + workflow_dispatch; it needs a deployed target, so it cannot be a pure PR gate)
- a storage state generated in CI from the existing E2E credentials — `theme-conformance.yml` already references `CRM7_E2E_SUPABASE_URL` / `CRM7_E2E_SUPABASE_PUBLISHABLE_KEY` in its comments, so the plumbing exists
- a route list per app, and a **skip ceiling**: the run must FAIL if more than N cells are skipped, or the blind-green failure mode returns

Not attempted here because it is a real piece of work and doing it badly reproduces the exact problem it is meant to solve.
