---
kind: record
authority: none
owner: bsuite
---

# autoLinkExistingEvidence has zero callers — the GTO compliance evidence auto-linker has never run, and D8.2 fails outright

https://github.com/GaryOcean428/crm7/issues/2560

Snapshot updatedAt: 2026-09-07T18:41:48Z. Open at capture; re-read live.

## `autoLinkExistingEvidence` has no callers — the compliance evidence auto-linker has never run

Surfaced by the completion-enforcer gate on crm7#2559. Pre-existing; not introduced by that PR.

`src/lib/compliance/evidenceAutoLinker.ts` implements `autoLinkExistingEvidence()`, which scans
five source tables (`site_visits`, `host_agreements`, `training_plans`, `support_contacts`,
`workplace_inspections`) and builds `gto_compliance_evidence` records for GTO Standards 1.3 and
2.x.

**Nothing calls it.**

```
grep -rn "autoLinkExistingEvidence" src api supabase
  → src/lib/compliance/index.ts:7   export { autoLinkExistingEvidence, … }   ← a re-export
  → (no other reference anywhere)
```

No page, component, `api/` route, Supabase edge function or CI config invokes it. The checked-in
coverage report (`coverage/src/lib/compliance/evidenceAutoLinker.ts.html`) shows **71 lines, none
executed**. `src/pages/gto-compliance/evidence-dashboard.tsx` — the only UI that reads
`gto_compliance_evidence` — queries the table directly and never goes through this function.

So the file is a complete, maintained, exported implementation of a feature with no entry point.
D8.2 ("wired both ways") fails outright: there is no entry point to trace.

## Why it is worth a row rather than a delete

Two options and they are genuinely different:

1. **Wire it.** The evidence dashboard reads a table that, as far as I can tell, nothing populates
   automatically — so the auto-linker is the missing half of a feature someone built deliberately.
   If that is right, this is unfinished work, not dead code, and the fix is an entry point (a
   button on the evidence dashboard, a scheduled edge function, or a step in the pack build).
2. **Delete it.** If the intent was abandoned, the file should go — crm7 has a
   *"Nothing ships with zero consumers"* CI check, and `financialQueries.getAgingReport` was
   removed on 2026-08-13 on exactly that reasoning, with its callers.

**I am not choosing.** Which one is right depends on whether `gto_compliance_evidence` is meant to
be populated automatically, and that is a product question about how a GTO assembles a compliance
pack.

## Context that bounds it either way

All four of its non-`training_plans` sources are **empty on production** — `site_visits` 0,
`support_contacts` 0, `host_agreements` 0, `workplace_inspections` 0; only `training_plans` has 28
rows. So wiring it up today would produce evidence from one source of five. Whoever picks this up
should know that before judging whether it works.

crm7#2559 repairs three phantom-column queries inside this file. That fix is correct and worth
having — it means the code will not fail on three of five sources the moment it is wired — but it
does not make the feature run, and #2559's body says so.

Related: crm7#2559 (the column fix), crm7#2547 (the phantom-column class).
