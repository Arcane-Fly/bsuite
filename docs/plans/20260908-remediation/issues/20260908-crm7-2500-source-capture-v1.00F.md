---
kind: record
authority: none
owner: bsuite
---

# Host scoping is compiler-enforced on 2 selectors and convention-only on the 2 with 37 of 40 call sites

https://github.com/GaryOcean428/crm7/issues/2500

Snapshot updatedAt: 2026-09-06T10:02:06Z. Open at capture; re-read live.

## What

Host scoping is **type-enforced** on two selectors and **convention-only** on the two that
are used most. The convention-only ones will regress, and nothing will catch it.

## Measured

Independent verification of the crm7#2496 audit reproduced its denominator exactly — **145
selector elements across 27 components**, with a positive control confirming the predicate
matches real call sites (`AwardRateSelector` 13, `ClientSelector` 11, `OccupationSelector`
8), so a "0 leaking" result is not an artefact of a search matching nothing.

But the *mechanism* of that safety splits in two:

| Selector | Call sites | How scoping is enforced |
|---|---|---|
| `HostSiteSelector` | 0 production | `hostScope` is a **required** discriminated union; fails closed to `query.is('id', null)` when the id is unresolved |
| `HostAgreementSelector` | 1 production | same — **required** prop, compiler-checked |
| **`ContactSelector`** | **19** | **no scoping prop at all** — each caller must remember `filterFn={useHostContactNarrowing(hostId).filterFn}` |
| **`EmployerSelector`** | **18** | **no scoping prop at all** — same |

`HostSiteSelector.tsx:62-71` and `HostAgreementSelector.tsx:53-63` make leakage a **compile
error**. `ContactSelector.tsx:29-33` and `EmployerSelector.tsx:32-37` make it a **code review**.

## Why this is a defect and not a style preference

The current "0 leaking" verdict for those 37 call sites rests on a **per-site manual read**
of whether a host employer is resolvable in each context. That read was careful and I believe
it. It is also:

- **not re-verifiable cheaply** — confirming it means opening 37 call sites again;
- **not durable** — the 38th call site added next week inherits no protection;
- **silent when wrong** — a forgotten `filterFn` produces a working picker showing rows from
  other hosts, which looks correct to the person who wrote it.

That is exactly how crm7#1675 happened in the first place. The fix scoped the reported page,
then its sibling, and the class went on being convention.

## The precedent is in the same directory

`HostSiteSelector` and `HostAgreementSelector` already demonstrate the shape: a required
`hostScope` discriminated union that cannot be omitted and fails closed when unresolved. It
was introduced by crm7#1731 for exactly this reason. Two of the four selectors were converted
and two were not — and the two that were not are the two with 37 of the 40 call sites.

## What this needs

Give `ContactSelector` and `EmployerSelector` the same required, fail-closed scoping
contract. Where a call site is legitimately tenant-wide — a lead contact, a funding-body
contact, a treating doctor, a mentor, a reminder recipient — it says so **explicitly**
(`hostScope={{ kind: 'tenant' }}` or equivalent), so the audit becomes a compiler question
and the deliberate cases are self-documenting.

The point is not to narrow those 37 sites. Most are correctly tenant-wide. The point is that
"correctly tenant-wide" and "forgot to scope" are currently **indistinguishable in the
source**, and only one of them is safe.

## Acceptance

- `ContactSelector` and `EmployerSelector` cannot be rendered without stating their scope.
- Omitting the scope is a **compile error**, not a review finding.
- An unresolved host id fails closed, matching `HostSiteSelector`'s existing behaviour.
- The existing 37 call sites are annotated with their actual intent, and the count of
  tenant-wide vs host-scoped is reported — with the method, so the next audit does not start
  from zero.

Related: crm7#1675 (the original leak), crm7#2496 (the RLS layer), crm7#1731 (the precedent).
