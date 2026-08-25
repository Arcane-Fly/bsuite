---
kind: decision
authority: operator
owner: bsuite
evidence:
  - crm7/src/features/
  - crm7/src/hooks/useRoleCapabilities.ts
  - crm7/supabase/functions/r8-charge-rate-push/index.ts
  - docs/20260825-overnight-autonomous-run-v1.00A.md
---

# FOUR DECISIONS — one batch, for Braden, morning of 2026-08-26

Everything here was **ruled overnight under the pre-authorised rulings in
`docs/20260825-overnight-autonomous-run-v1.00A.md` §7**, because there was no path to you.
**Every one is reversible on your word.** This document exists so you see all four together
rather than one at a time across a week.

Two of the four were **measured to be smaller than the register said.** That is written up first,
because it changes what you are deciding.

**Glossary.** *Tenant* = one client organisation inside the system. *Capability* = one thing a role
is allowed to do (there are 54 of them). *RLS* = the database rule deciding which rows a signed-in
person may see. *Edge function* = a small program running on Supabase's servers rather than in the
browser.

---

## DECISION 1 — Permissions defaults. **The register overstated this. Measured, it is not customer-facing.**

### What the register said
*"4 of 7 tenants have zero `role_capabilities` rows and the defaults cannot be derived."*

### What is actually true, measured on production 2026-08-25

| tenant | capability rows | roles configured |
|---|---:|---:|
| Braden Group | 540 | 10 |
| **FutureBuild Academy** | **486** | **9** |
| Lookn | 378 | 7 |
| Demo Organisation — CRM7 | 0 | 0 |
| bsuite Platform | 0 | 0 |
| E2E Fixture Tenant (do-not-delete) | 0 | 0 |
| E2E Fixture Tenant B (do-not-delete) | 0 | 0 |

**Every organisation with real people in it has a full permissions matrix.** The four with none are a
demo org, the platform's own org, and two automated-test fixtures. *"4 of 7 tenants"* is arithmetically
true and reads as a live gap in your customers' systems. It is not one.

### The real question, which remains
**What happens the day you onboard a new client?** They start with zero rows, and the three existing
matrices disagree with each other, so there is no majority to copy. Defaults genuinely cannot be
derived from the data.

### RULING APPLIED (§7 ruling 1) — the safe path
When a tenant has no permissions configured, pre-apply the **`read_only`** preset **without saving
it**, and show:

> *"No permissions are configured for this organisation yet. This is a suggested starting point —
> nothing is granted until you press Save."*

Nothing is granted until a human presses Save. **No `role_capabilities` rows were seeded on any real
tenant, and none will be.**

### What you actually need to decide
Only this: **should a brand-new client start at read-only, or should they inherit Braden Group's
matrix as the house default?** Read-only is the safe answer and is what shipped. Inheriting is the
convenient answer and is a one-line change if you want it.

---

## DECISION 2 — `crm7/src/features/` — 601 lines of code nothing uses

### Measured, with three independent probes

| directory | files | lines | importers |
|---|---:|---:|---:|
| `features/financial` | 7 | 334 | **0** |
| `features/clients` | 5 | 265 | **0** |
| `features/reports` | 1 | 1 | **0** |
| `features/settings` | 1 | 1 | **0** |
| `features/contacts` | 5 | 377 | **4 — genuinely used** |

The first probe searched for the import path. The second searched for every exported symbol name
estate-wide and appeared to find matches — `Invoice` in 39 files, `FinancialRecord` in 3. **The
second probe was wrong**, and it is the kind of wrong that gets working code deleted. Those are
*independent definitions of common names*: `financialStore.ts` gets `FinancialRecord` from
`@/types/entities`, not from the dead directory. The third probe looked for an actual import edge
and found **none**.

The live equivalents already exist and are the ones in use — `useFinancialStore`, and the contacts
feature that is genuinely wired.

### RULING APPLIED (§7 ruling 2)
**Delete `features/{clients,financial,reports,settings}`. Keep `features/contacts`.** Git history is
the recovery path and the commit records the SHA. Leaving two parallel architectures is the only
answer that is definitely wrong — it is how the next person picks the dead one.

### What you actually need to decide
Nothing, unless you disagree. Say the word and it comes back in one command.

---

## DECISION 3 — R8's charge-rate push has no back end. **DO NOT BUILD tonight.**

`r8-charge-rate-push` is deployed on production, secured with a shared secret, and **R8 never calls
it — because R8 has no server side at all.** It is one of 35 deployed functions with no caller
(see `docs/20260826-route-surface-map-v1.00W.md` §3.1).

This is D-90 and D-62, which are **the same item recorded twice**.

### RULING APPLIED (§7 ruling 3)
**Not built overnight.** Architecture with money implications is not an unattended call. Three
options, with a recommendation:

| option | what it means | cost | risk |
|---|---|---|---|
| **A. Give R8 a server side** | one serverless route in R8 that calls the function | small | a new deployment surface to maintain |
| **B. Invert it — crm7 pulls** | crm7 asks R8 for rates instead of R8 pushing | medium | crm7 must know when to ask |
| **C. Keep the manual paste** | what happens today | none | a human retypes money between two systems |

**Recommended: B.** It removes the shared secret entirely, and crm7 already owns the schedule that
would trigger it. A is faster but leaves R8 owning a secret it has nowhere safe to store.

### What you actually need to decide
A, B or C. Until then it stays as C, which is what happens today.

---

## DECISION 4 — What "trade" means for MA000036 (Joinery). **PARKED — this is yours alone.**

### RULING APPLIED (§7 ruling 4)
**Parked, not guessed.** This is domain knowledge only you hold, and an award fact invented by an
agent becomes a wrong pay rate that looks authoritative. The rule in this estate is that a rate comes
from the award unless it is a tenant custom rate — so the definition has to be right at the source.

### The question, recorded precisely so it is not re-asked in vaguer form
For the Joinery and Building Trades Award **MA000036**, the classification structure turns on
whether a role is a "trade" role. **Which of the award's classification levels do you treat as trade
for the purposes of the apprentice wage progression, and does that answer change between a
four-year and a three-year training contract?**

### What you actually need to decide
That question, in one sentence. It then goes straight into the award model.

---

## WHAT CHANGED OVERNIGHT AS A RESULT

| decision | ruling applied | code changed | reversible by |
|---|---|---|---|
| 1 — permissions defaults | safe read-only preset, unsaved, with a banner | yes | one line |
| 2 — dead `features/` dirs | delete four, keep contacts | yes, deletion | `git revert` |
| 3 — R8 back end | do not build; options recorded | **no** | n/a |
| 4 — MA000036 "trade" | park; question recorded | **no** | n/a |

**No `role_capabilities` rows were seeded on any tenant. No FutureBuild data was written, read into
any report, or printed anywhere.**
