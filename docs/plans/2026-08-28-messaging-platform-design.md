# Messaging Platform — Design

**This file is a pointer.** The design lives at
[`docs/20260828-messaging-platform-design-v1.00W.md`](../20260828-messaging-platform-design-v1.00W.md).

---

## Why a pointer and not the document

Two conventions disagree about where this belongs, and both are right.

The `plan-brainstorming` skill writes designs to `docs/plans/YYYY-MM-DD-<topic>-design.md`,
and that path was asked for by name.

The estate's `check-doc-naming` gate wants `YYYYMMDD-<name>-v<version><STATUS>.md`. A
`2026-08-28-` prefix reads as a date to a person and matches nothing to a scanner, so a
file named that way is invisible to every gate keying on `^\d{8}` — classification,
freshness, register reconciliation.

A byte-identical **copy** in both places satisfied neither, and was correctly deleted
twice: two files with the same content drift the moment one is edited, and the one
nobody's tooling can see is the one that goes stale.

A **pointer** is neither. It carries no content to drift, and `#2673` taught the three
doc gates to tell the difference — one predicate, `isPointerFile`, content-detected
rather than name- or path-detected. So this file is now the supported way to have the
path that was asked for without a second copy of the design.

## What the design covers

| § | |
|---|---|
| 1 | The decision, and the four options withdrawn |
| 2 | Number taxonomy — segregation lives on the number, not a per-message flag |
| 3 | Right to disconnect — defer, never block |
| 4 | Author, from-number and reply-to as three separate fields |
| 5 | Data model |
| 6 | Billing — 7c prepaid, 6c recurring |
| 7 | Reach — 46 surfaces, method stated |
| 8 | Costs |
| 9 | Deferred, including ACMA registration |
| 10 | Build order |
| 11 | Verification and branch discipline |
| 12 | Merge fields, and the defect they replace |
| 13 | Tagging |
| 14 | Customisation and setup fees |

## What shipped against it

Live on `tuybltdrdefjblnplpqo` as at 2026-08-28: `message_numbers`, `message_quotas`,
`message_usage`, `message_consent`, `message_categories`, with `20261001000000` and
`20261002000000` both recorded in `schema_migrations`. Edge functions `sms-inbound` and
`sms-numbers` are deployed and ACTIVE, and `email-dispatcher` routes `channel: 'sms'`.
