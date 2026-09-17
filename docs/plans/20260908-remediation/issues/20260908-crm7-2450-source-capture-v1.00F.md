---
kind: record
authority: none
owner: bsuite
---

# No way to create a field from inside either form builder

https://github.com/GaryOcean428/crm7/issues/2450

Snapshot updatedAt: 2026-09-05T13:40:52Z. Open at capture; re-read live.

Reported by the copilot-customization-audit lane. I verified the absence.

## What a user cannot do

Open a form layout or a custom page for editing, and you can arrange fields that already exist. You cannot create one. There is no inline path from "this section needs a field that does not exist yet" to having it, so the work stops and the user goes looking elsewhere for wherever fields are defined.

## Verified

`FieldCreateDialog` exists at `packages/schema-builder/src/components/FieldCreateDialog.tsx` and is wired only into `SchemaCanvas`. Zero occurrences in all three of the relevant files: the builder itself, and both hosts, [form-layout-detail.tsx](crm7/src/pages/settings/form-layout-detail.tsx) and [custom-page-edit.tsx](crm7/src/pages/settings/custom-page-edit.tsx).

## What "done" means here

This is the round-trip test, and it is the whole point of the ticket. Finishing the task must not require leaving the page. The dialog opens over the builder, the new field is created, and it appears in the section the user was working in, already placed and selected.

The unsaved layout must survive it. A user who has spent five minutes arranging sections and then creates a field must not come back to an empty canvas, and must not be asked to save first as the price of creating a field. If the create genuinely cannot happen without a save, that is a design answer that needs stating, not an accident to discover after losing the arrangement.

## Acceptance

Open either host, add a field that does not yet exist, and have it land in the intended section without navigation. Then reload and confirm both the field and the surrounding layout persisted. Both hosts, because they are two mount sites and a fix to one is not a fix to the other.

## Sequencing

This queues behind #2447. That fix is in `FormLayoutBuilder.tsx` and this work touches the same file plus both hosts, and two lanes in one file is a collision this estate has already paid for once today.
