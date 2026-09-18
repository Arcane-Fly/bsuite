---
kind: record
authority: none
owner: bsuite
---

# A picked contact is stored as a name and the foreign key beside it is left empty

https://github.com/GaryOcean428/crm7/issues/2469

Snapshot updatedAt: 2026-09-05T23:31:06Z. Open at capture; re-read live.

Found by an agent-performed visual pass during the promotion gate, and verified against production. Pre-existing, so it does not block that promotion — filed on its own.

## What happens

A user creating a host picks a contact from the contact selector. The handler takes the real `ContactRow` it is handed, copies `first_name + last_name` into a free-text field, and throws the identity away.

`employers.primary_contact_id` exists as a column. `hosts/create.tsx` never sets it — zero occurrences in the file. What persists is `contact_name`, a string.

## Why it matters beyond tidiness

The contact was *selected*, not typed. The system had the record in its hand and chose to keep the label instead of the link. So:

- Renaming the contact leaves every host still showing the old name.
- There is no path from a host back to the contact record a user deliberately chose.
- Two hosts sharing a contact have two unrelated strings, and nothing knows they are the same person.
- `primary_contact_id` stays empty on every row created this way, so anything downstream that relies on it sees a host with no primary contact.

This is the "enter once, use everywhere" rule, and the awkward part is that the entry already happens once — the picker is right there and working. Only the write discards it.

## Not the other findings from the same probe

The same class fired three more times and I am not filing those, because they are not the same thing:

- `externalAccountId` and `clientId` on the integrations page are identifiers in a **third-party** system — a provider's account or client reference. There is no canonical local entity for those to point at, and free text is correct.
- `name` on this same host form is the entity **being created**. It cannot reference something that does not exist yet.

The heuristic matched on the shape of the field name in all four cases. Only this one has a real foreign key sitting unused beside a picker that already resolved it.

## Fix

Set `primary_contact_id` from the selected contact's id, and keep `contact_name` only if a denormalised display copy is genuinely wanted — in which case it should be written from the linked record rather than typed, so the two cannot drift.

Decide explicitly what happens when someone types a name without using the picker. Either that is allowed and the link is simply absent, or the field should require a selection. Both are defensible; silently keeping a name with no link is what happens today.

## Acceptance

Creating a host via the contact picker stores a `primary_contact_id` that resolves to the chosen contact. Renaming that contact is reflected wherever the host's contact is shown, or the stored copy is deliberate and documented as a snapshot. A test must fail against the current handler.
