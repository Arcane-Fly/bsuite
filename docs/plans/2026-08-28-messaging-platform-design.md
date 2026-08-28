# Messaging Platform — Design

**This file is a pointer. The design lives at
[`docs/20260828-messaging-platform-design-v1.00W.md`](../20260828-messaging-platform-design-v1.00W.md).**

---

## Why a pointer and not the document

Two conventions disagree about where this belongs, and both are right.

The `plan-brainstorming` skill writes designs to
`docs/plans/YYYY-MM-DD-<topic>-design.md`, and the operator asked for that path by
name.

The estate's `check-doc-naming` gate requires `YYYYMMDD-<name>-v<version><STATUS>.md`.
A `2026-08-28-` prefix reads as a date to a person and matches nothing to a scanner,
so a file named that way is **invisible to every gate that keys on `^\d{8}`** — the
classification check, the freshness check, the register reconciliation.

A byte-identical copy in both places satisfied neither. It was deleted once already,
correctly: two files with the same content drift the moment one is edited, and the
one nobody's tooling can see is the one that goes stale.

So this file exists at the path that was asked for, and holds a link rather than a
copy. Nothing to drift, and the canonical document stays where the gates can read it.

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
