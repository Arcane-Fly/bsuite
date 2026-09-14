---
kind: record
authority: none
owner: bsuite
---

# [conduit] /auth/register is a live route with zero inbound links

https://github.com/GaryOcean428/bsuite/issues/2013

Snapshot updatedAt: 2026-08-24T03:28:05Z. Open at capture; re-read live.

## Finding

`conduit/src/app/auth/register/page.tsx` is a live, middleware-public route (`/auth` is in `publicPaths`) with **no inbound link anywhere in `src/`**.

The only reference is a test:
```
src/test/wcag-static.test.ts:194  '/auth/register has no credential inputs and initiates BSU OAuth'
```

`src/app/auth/login/page.tsx` offers no "Sign up" / "Create account" path either.

So the page can only be reached by typing the URL.

## How it was found

This is the **first** finding produced by the new `reachable_via` field (bsuite#2012, schema 1.1). The previous `nav.surface` metric reported **396 orphans** across the suite — so many false positives (detail routes, in-page tabs, auth flows) that a real one was indistinguishable from noise.

`reachable_via` classifies those 396 into `in_page_nav` (202), `dynamic_from_list` (112), `redirect` (50), `top_level` (31) — leaving exactly **1** genuinely unreachable live route. This one.

## What to decide

Either is fine; both are one small change:

1. **It should be reachable** — add a "Create an account" link on `/auth/login`.
2. **It should not exist** — registration goes through BSU OAuth, in which case delete the page (the test asserts it "initiates BSU OAuth", which suggests it may be a redundant entry point).

Worth checking against the intended onboarding flow before choosing — a registration page that exists but is unreachable is ambiguous evidence either way.

## Verification

```
grep -rn "auth/register" conduit/src --include=*.tsx --include=*.ts   # only the test
grep -niE "register|sign.?up|create account" conduit/src/app/auth/login/page.tsx  # no match
```
