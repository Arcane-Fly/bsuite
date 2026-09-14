---
kind: record
authority: none
owner: bsuite
---

# The schema builder shows users a database, not their records

https://github.com/GaryOcean428/crm7/issues/2460

Snapshot updatedAt: 2026-09-06T09:34:05Z. Open at capture; re-read live.

Found by looking at the deployed page, after the operator pointed out schema vocabulary on a sibling screen (#2459). This one is worse, and it is worth stating why before the list: the page's own opening sentence is written exactly right, and everything beneath it contradicts that sentence.

The intro reads:

> Add a field here and it becomes a real field on that kind of record everywhere it appears — Incidents, Contacts, Training Plans and VET Qualifications read your changes immediately.

That is the product, in the user's nouns, promising something valuable. Below it is a database diagram.

## What is actually on screen

**SQL types and constraints as labels.** Every row carries `TEXT`, `DATETIME`, `TEXTAREA`, `BOOLEAN`, `NUMBER` or `MULTISELECT`, and `NOT NULL` in red. A person deciding whether a field should be required is not helped by `NOT NULL`, and the red suggests an error rather than a rule.

**Raw column names, including plumbing that must never be touched.** On the Contact card alone: `tenant_id NOT NULL`, `created_at`, `updated_at`, `custom_fields`, `company_resolution_status`. On Client: `primary_contact_name_snapshot`, `primary_contact_email_snapshot`, `primary_contact_snapshot_updated_at`, `anzsic_code`, `asri_id`, `stars_org_id`, `parent_employer_id`, `is_worksite`.

These sit at identical visual weight to `phone`, `email` and `first_name`. Someone invited to "add a field to that kind of record" is shown thirty rows, most of which are our bookkeeping, with nothing marking which ones are theirs. That is worse than jargon — it is an invitation to break something.

**Table names as card subtitles**: `contact`, `lead`, `client`, `apprentice`, in lowercase monospace under the friendly card title. The friendly name is already there. The table name adds nothing a user can act on.

**"45 entities"** as the count under the search box.

**An unexplained `SYS` badge** on every card.

**"React Flow" printed in the bottom-right corner** — the diagramming library's own branding, rendered in the product. That is a third party's watermark on a page a customer sees.

## Why this matters more than wording

The screen presents itself as a place to shape records, and what it actually shows is our storage. A user cannot tell which fields are theirs to change, which exist for the system, and which are denormalised copies that will be overwritten. There is no safe first move.

The fix is not a copy pass. It is deciding what belongs on this screen at all: the fields a tenant can meaningfully add or rename, separated clearly from system columns, with types named the way the person choosing them would say it — text, date, yes/no, list — and required shown as a property rather than a constraint keyword.

## Sibling screens, same class

- **#2459** — form layout builder: `Entity: people`, `Context: default`, a `people / default` badge, and an empty state claiming "All fields placed" when there are none.
- **Form Layouts index** — subtitle reads "Drag-and-drop form layouts for entity create/edit views". `entity create/edit views` is our vocabulary, and the same `people / default` badge appears on the row.

## Acceptance

A tenant administrator who has never seen this page can identify which fields they may change, add one, and predict where it will appear, without knowing what a column, an entity, or a null is. No SQL keyword, no table name, and no third-party watermark on the page.

Evidence: screenshots captured on `d.crm.crm7.app` while signed in, at the development head.
