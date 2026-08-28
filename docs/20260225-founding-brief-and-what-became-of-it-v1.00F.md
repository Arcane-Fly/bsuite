---
kind: record
authority: none
owner: bsuite
---

# The founding brief, and what became of every ask in it

> ## Status: Superseded — a salvage record. Every ask below is implemented or overtaken
>
> Salvaged 2026-08-28 from `clinework.txt`, an untracked 341 KB **Cline session
> transcript** dated 2026-02-25 that had been sitting in the repository root for six
> months. 5,986 lines, of which roughly 5,900 were build logs, SQL and shell output.
> The operator's own words occupy five turns; they are reproduced in full below,
> because they are the founding brief for this estate and existed nowhere else.
>
> The transcript itself is deleted. This document is what was worth keeping.

## The brief, verbatim — 2026-02-25

> review the projects in this directory. they all should ashare a common database
> including common fields between apps and between linked pages. 1 is my website, so
> enquiries and cms data and emails are needed i.e. sending an email from the crm and
> to me when an enquiry is received.
>
> all best practice applied, security, ux, reflow, barrels, internal and app to app api
> routes, edge functions, anything I'm missing. first brainstorm all features a setup
> like this should have. redteam, and 3x pass before completing.

That second paragraph is the direct ancestor of the standing checklist still quoted in
the operator's `/loop` directive today — *"theme consistency, ux, oneshot policy,
cross-cutting, route checks, lints, types, barrels, indexes, security"*. It has been the
same list for six months.

## The four later asks in that session, verbatim

| # | ask |
|---|---|
| 1 | *"please add and commit all. everything even unrelated."* |
| 2 | *"different looking auth and no social logins."* + a logo table naming `crm7-logo.svg` for CRM7, R8 **and** BSU |
| 3 | *"make sure all of the apps are unified in their strict types, package managers pnpm or uv as appropriate and same most recent versions of all packages and deps."* |
| 4 | *"there is more work going on outside your work so dont build. but i do want you to think of the appropriate level of your pnpm installs since the bsuite parent directory isn't a project. iso any locks placed there are missplaced. further, make sure you clean up all your scripts."* |

## What became of each — measured 2026-08-28, not assumed

| ask | status | evidence |
|---|---|---|
| one shared database across the apps | **IMPLEMENTED** | `supabase/migration-scopes.json` declares **8 scopes** against the single project `tuybltdrdefjblnplpqo` |
| website enquiries → email | **IMPLEMENTED** | `braden/src/components/contact/ContactFormFields.tsx` → `braden/supabase/functions/send-confirmation/index.ts` (Resend; `ContactEmailRequest` carries name, email, phone, company, serviceType) |
| "all best practice applied … anything I'm missing" | **SUPERSEDED, and grown** | `AGENTS.md` is the rulebook; `scripts/guard-registry.mjs` now enumerates **77 guards** across the seven repos |
| **"no social logins"** | **SUPERSEDED** | Google, Azure **and** GitHub OAuth are live — `business-suite-unified/src/components/auth/OAuthProviderButtons.tsx`, and `signInWithOAuth` in both BSU's and crm7's `AuthContext.tsx`. The ship skill's account matrix now *requires* exercising a social path for any auth change |
| the logo table | **STALE** | BSU ships its own `bsu-logo-dark.svg` / `bsu-logo-light.svg` / `bsu-mark.svg`; R80.4 and braden have no `public/logos/` at all |
| unified strict types, pnpm, current versions | **IMPLEMENTED** | pnpm across all seven; package currency swept 2026-08-28 |
| **"the bsuite parent directory isn't a project … locks there are misplaced"** | **SUPERSEDED** | the parent now *is* a pnpm workspace — `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` are all present and tracked, because it hosts `packages/*`. In pnpm 10 the `overrides` block lives in `pnpm-workspace.yaml`, so that file at the parent is load-bearing for every consumer lockfile |

## Why this is a record and not a plan

Two of the asks are now **reversed** by later decisions — social logins exist, and the
parent deliberately carries the locks it was once told not to. A reader finding the raw
transcript would have read six-month-old instructions as current. That is the whole
reason to salvage the operator's words into a dated record and delete the transcript:
the words are worth keeping, the instructions are not live, and only a document can say
both at once.

**`clinework.txt` was gitignored**, so it was invisible to every gate and every audit in
the estate while remaining the only copy of the founding brief.

## What was already salvaged, and what was not

`docs/recovered/20260225-cascade-claude-upgrade-coordination-plan-v1.00F.md` §"CODEX —
2026-02-25" reviewed this same transcript on the day it was written, citing it as
*"Thread artifact reviewed: `/home/braden/Downloads/clinework.txt` (5986 lines)"*, and
recorded the QA findings from it — a schema/RLS mismatch between `public.memberships` and
`public.user_tenants`, the braden lead-capture path mismatch, a placeholder email
dispatcher, and incomplete cross-subdomain auth parity.

**It did not preserve a single word of the operator's own brief.** Checked phrase by
phrase: *"ashare a common database"*, *"no social logins"*, *"isn't a project"*,
*"redteam, and 3x pass"*, *"enquiries and cms data"*, *"unified in their strict types"* —
none appear in that document. The analysis survived; the instructions that prompted it
did not. This document is the other half, and the two together retire the transcript.

The path that document cites (`~/Downloads/clinework.txt`) no longer exists either; the
copy this was salvaged from sat at the repository root.
