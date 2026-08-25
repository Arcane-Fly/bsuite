---
kind: decision
authority: engineering
owner: datum-lane
supersedes:
  - docs/20260821-atmosphere-evaluation-v1.00D.md
  - docs/20260821-airtable-class-data-surface-plan-v1.00D.md
evidence:
  - scripts/check-shared-package-reach.mjs
---

# `atmosphere` is a rebranded NocoDB, and the licence ruling already answered this

**Date:** 2026-08-25 · **Status:** A (Active — the answer, not a proposal)

> **Both 2026-08-21 documents evaluated the wrong repository**, reached "nothing to
> borrow" for technical reasons, and missed the actual answer, which is legal and was
> already on record **thirteen days before either was written**.

---

## 1. Which repository each document read

| Document | Read | Should have read |
|---|---|---|
| `20260821-atmosphere-evaluation-v1.00D.md` | `Atmosphere/atmosphere` — a JVM async/WebSocket framework | `GaryOcean428/atmosphere` |
| `20260821-airtable-class-data-surface-plan-v1.00D.md` | the same JVM project | the same |

The second one is the more expensive mistake, because it **explicitly reassures the
reader that the premise was checked**:

> "Atmosphere has no Airtable-like setup. I looked specifically, because the premise
> matters."

It then describes a Java admin console and a Vue chat SPA, and lists zero hits for
`resultset`, `column metadata`, `TabularResult`, `DataGrid`, `spreadsheet`. All true of
the JVM project. All irrelevant.

`GaryOcean428/atmosphere` describes itself as **"A Free & Self-hostable Airtable
Alternative"**, is TypeScript, and was pushed 2026-08-19 — two days before both
documents. It is not a GitHub fork (`fork: false`, no parent), so nothing in the API
would have flagged the lineage; it had to be read.

## 2. What it actually is

A **rebranded NocoDB**. Nine packages, nine matches, no exceptions:

| NocoDB | atmosphere |
|---|---|
| `nocodb` | `atmosphere` |
| `nc-gui` | `atmosphere-gui` |
| `nc-lib-gui` | `atmosphere-lib-gui` |
| `nocodb-sdk` | `atmosphere-sdk` |
| `nocodb-sdk-v2` | `atmosphere-sdk-v2` |
| `noco-integrations` | `atmosphere-integrations` |
| `nc-integration-scaffolder` | `atmosphere-integration-scaffolder` |
| `nc-secret-mgr` | `atmosphere-secret-mgr` |
| `nc-mail-assets` | `atmosphere-mail-assets` |

The README carries NocoDB's tagline verbatim — *"the fastest and easiest way to build
databases online"*. A code search for the string `nocodb` across the repository returns
**zero hits**: the rename is thorough.

**The one thing the rename did not remove is the licence.** Root `package.json`:

```json
"license": "Sustainable Use License"
```

## 3. The ruling that already covered it

Recorded **2026-08-08**, checked against the LICENSE files rather than the GitHub badge:

> **NocoDB — CANNOT BE USED IN BSUITE.** Sustainable Use License v1.0. *"You may use or
> modify the software only for your own internal business purposes… You may distribute
> the software or provide it to others only if you do so free of charge for
> non-commercial purposes."*
>
> BSuite is a paid multi-tenant SaaS with real clients. Exposing that functionality to
> tenants is providing it to others, commercially, for a fee. That is outside the grant.

A rebrand does not change the grant. **The answer is no, and it was no on 8 August.**

## 4. So the recommendation is unchanged, and the reason is different

Both documents said *do not adopt*, and both were right by accident. The distinction
matters for the next person who asks:

- **On the technical reading they made**, the door stays open — "wrong runtime" invites
  "then what about the TypeScript one?", which is exactly the repository they skipped.
- **On the licence**, the door is shut for the whole class. Of the well-known Airtable
  clones only **Baserow's core (MIT Expat)** is usable in a paid SaaS; Teable, APITable
  and undb are AGPL-3.0 and would require open-sourcing the combined work or buying a
  commercial licence.

If an Airtable-class surface is wanted, the licence-clean options are Baserow's core or
building on `@bsuite/data-grid`, which is what
`20260822-data-surface-consolidation-decision-v1.00D.md` proposes.

## 5. What survives from the superseded pair

Their **§3-class findings about our own report engine remain accurate and are not
withdrawn**: the queued path processes inline and blocks the caller, nothing drains the
queue with `pg_net` disabled, and `/reports/deliveries` is persisted but never read live.
Those were measured against our code, not the wrong repository, and the consolidation
decision already carries them.

## 6. The lesson, since it cost two documents and 531 lines

**A repository name is not a repository.** `Atmosphere/atmosphere` and
`GaryOcean428/atmosphere` share a name and nothing else, and the operator's own account
is the likelier referent when he raises a project by bare name. Resolve the owner before
reading the code — and note that the document which *stated* it had verified the premise
is the one that was most confidently wrong.
