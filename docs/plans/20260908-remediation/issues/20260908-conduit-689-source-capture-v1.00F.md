---
kind: record
authority: none
owner: bsuite
---

# Typing 0 for interview duration silently schedules 60 minutes

https://github.com/GaryOcean428/conduit/issues/689

Snapshot updatedAt: 2026-09-05T17:38:56Z. Open at capture; re-read live.

Found while gating the equivalent fix in R80.4 (#313 there), by sweeping the estate for the class rather than the spelling. It is the same shape and much lower stakes, and it is worth its own ticket because the substitution is silent.

## The coercion

[`interviews/_view.tsx:882`](conduit/src/app/(dashboard)/interviews/_view.tsx#L882):

```
duration_minutes: Number(form.duration_minutes) || 60,
```

A typed `0` is falsy, so it becomes **60**. The user is not told, and the field shows what they typed until the form is submitted, at which point a one-hour interview is scheduled and the invitation goes out saying sixty minutes.

## Why it is the same class and not the same severity

The class is a coercion whose fallback is a value other than zero, so a genuine zero is silently replaced by something else. Where the fallback is `0` — and the estate has 56 of those — a falsy input returns the value it came in as and nothing is lost. Where it is not, a typed zero becomes a number nobody chose.

The estate has three such sites. This is one. R80.4's is a penalty multiplier and moves money on a signed quote, which is why it was fixed first. crm7's is already clamped at one and is benign. This one schedules a meeting.

## Whether zero is legitimate here

Probably not — a zero-minute interview is meaningless, and unlike the R80.4 case there is no separate "does not apply" action a zero would be reached for. So the right behaviour is likely to refuse or clamp rather than store zero.

That is still not what it does today. It substitutes without saying so, and the difference matters: a user who typed `0` by accident, or who cleared the field and typed nothing meaningful, gets a scheduled duration they did not choose and no signal that a default was applied.

## Fix

Discriminate on the raw string rather than falsiness, then decide deliberately: either refuse a sub-minimum value visibly, or apply the default and say that a default was applied. The field has no `min` attribute today, so the browser offers no help either.

R80.4 now has `src/lib/number-input.ts` doing exactly this discrimination, with a docstring explaining why the raw-string test is the correct one. Read it before writing a second spelling — though it lives in another submodule, so this may want its own small helper rather than a shared dependency.

## Acceptance

Typing `0` results in either a stored `0`, or a visible statement that the default was used. Blank and unparseable input still fall back to 60. A test must fail against the current expression; one using only ordinary durations passes today.
