---
kind: record
authority: none
owner: bsuite
---

# Record-display papercuts: raw database IDs shown instead of names/labels, unstyled nav links, missing member, and no placements/engagements list on the person record

https://github.com/GaryOcean428/crm7/issues/2061

Snapshot updatedAt: 2026-09-06T09:16:22Z. Open at capture; re-read live.

Five smaller display defects across crm7, grouped because they're all "a record shows the wrong or missing representation of itself or its relationships" — not one root cause in code, but one class of UX debt worth fixing together.

## What's wrong

- **Raw database ID shown as the record's ID** instead of a proper Employee ID / Training Contract ID / USI once those exist. Operator: "Why is database ID displaying in full as their ID? Once Placed an Employee ID created. Training Contract ID should also be available as a primary identifier once set. Same with USI." (note.072, at `/charge-rates/import-r8`)
- **Entity field picker can't select all entities** — picking "person" exposes `person_id` from Supabase but not the person's name, and there's no way to add the person's name as an available field. Operator: "selecting person shows the person_id from supabase but not the persons name and there is no way to select the persons name in the available fields when 'add field'" (note.086, at `/settings/data` and `/admin/data`)
- **"Back to placement" and other detail-page nav links** should be buttons everywhere, not styled inconsistently per instance. Operator: "This is specific example but this should be a button for all." (note.110)
- **Person record doesn't list associated placements/engagements.** Operator: "Person record should have a list of all placements and engagements we have records for." (note.113)
- **Known member `caris@mbawa.com` is missing from the member list** at `/admin/data`, and appears to only have a `.json` representation. (note.119)

## Done means

- Records display a human-meaningful identifier (name, Employee ID, Training Contract ID, USI) instead of a raw UUID, wherever one exists.
- The entity field picker exposes the display-name field for every entity, not just its foreign-key ID.
- Detail-page "back to X" links are consistently styled as buttons.
- The person record surfaces all associated placements and engagements.
- caris@mbawa.com appears correctly in the member list, and the underlying cause of the `.json`-only representation is understood and fixed, not just this one row patched.
