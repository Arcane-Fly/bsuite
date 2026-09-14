# External portals (host/worker/apprentice/trainee/field-officer) need a persona-based redesign — navigation and UX are badly broken

https://github.com/GaryOcean428/conduit/issues/577

Snapshot updatedAt: 2026-08-31T02:52:42Z. Open at capture; re-read live.

Two findings on conduit's external-facing portals.

## What's wrong

- **Navigation and UX across the external portals are badly broken.** Operator, unusually blunt: "Navigation f-cking sucks, UX sucks, the portals basically suck." (note.041) Tested at `d.conduit.crm7.app/portal/field-officer`.
- **The field officer portal's purpose is unclear** even to the operator. "I'm not sure what the field officer portal archives [sic, achieves]." (note.042)

## Why this needs a redesign, not a patch

bsuite#1967 (EPIC) already flags "§6 — portals (D-81, D-82): redesign, not repair. Brainstorm first, no code until the operator has read it." This finding is direct evidence that section of the directive is still outstanding — and it pairs with the new crm7 issue in this plan for the missing portal-invitation flow (note.012): once invitations work, the portals being invited into need to actually be usable per persona.

## Done means

- A persona-based redesign brief (host / worker / employee / apprentice / trainee / field officer) is reviewed with the operator before implementation, per D-81/D-82.
- The field officer portal's purpose and scope is explicitly defined and documented before its UX is rebuilt.
