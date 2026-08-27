---
kind: record
authority: none
owner: bsuite
---

# Backend Surface Asymmetries — what the database and the edge functions actually allow

**Version 1.00D (Draft) · 2026-08-26 · Backend Surface lane · measured against production project `tuybltdrdefjblnplpqo`**

---

## Before you read this

This document is about two things sitting behind every BSuite screen.

**RLS — row level security.** This is the rule Postgres (the database engine) applies to decide
*which rows* a signed-in person is allowed to see. It is not the login. Someone can be correctly
logged in, correctly refused a page by the app, and still be able to read the underlying rows by
asking the database directly — because the app's page gate and the database's row rule are two
different things. Everything under "Read access" below is about the database rule, not the page.

**Edge functions.** Small server-side programs that run outside the database — sending an email,
talking to Xero, generating a document. There are 74 of them deployed. Some are called by the apps,
some by a timer, some by an outside company's webhook (a webhook is a message another company's
system posts to us when something happens at their end), and — the point of this document — some by
nothing at all.

Three other terms, glossed once:

- **SECURITY DEFINER function** — a database routine that runs with the *author's* privileges
  rather than the caller's, so it can read things the caller cannot. Necessary, and dangerous
  in exactly one way: if it answers a question about whoever the caller *names*, rather than about
  the caller, then anyone can ask about anyone.
- **IDOR — insecure direct object reference.** The name for that defect. "Tell me about user X"
  where the code never checks that you *are* X.
- **`anon`** — the un-signed-in visitor. Every public page uses this identity.

**Nothing in this document was changed.** This lane ran read-only. Every live test was run inside a
database transaction that was rolled back, so no row was created, altered or deleted.

---

## The findings, ranked by consequence

| # | Finding | What could go wrong | Confidence |
|---|---|---|---|
| 0 | **`tenant_invitations` and `tester_licenses` cannot be read by anybody** — every signed-in user, developers included, gets a hard permission error | Three live admin screens are broken right now: the tenant invitation list and both tester-licence screens. Not "no rows" — an error | **Measured live, three ways, including as a developer** |
| 1 | `is_platform_admin()` answers "is this person an admin?" about **anyone**, to **anyone**, including visitors who are not logged in | An outsider can work out which accounts are your administrators, which is the first step of a targeted attack. It is also the one fact your own privacy rule was written to hide | **Measured live.** Function body read in full; zero callers proven three ways |
| 2 | The **document retention sweep has never once run** | The job that deletes records when their retention period expires has failed every time it has been scheduled. Records that should have been destroyed are still there | **Measured live.** 6 runs, 0 successes; cause identified |
| 3 | **Award rates have never been refreshed from source** | Every rate quoted comes from a bundled snapshot with no provenance. Same root cause as #2 | **Measured live.** 1 run, 0 successes |
| 4 | `r7_jobs` — one table lets any signed-in user read other tenants' job listings | A signed-in user of one organisation can see another organisation's open jobs. This is the *only* cross-tenant read in the whole database | **Measured live.** 6 rows across 3 tenants returned to a probe user who belongs to one |
| 5 | **Six tables are wide open but empty** — the rule says "any signed-in user", and there is nothing in them yet | Nothing leaks today. The day the first row lands, it is visible to every signed-in user in the estate | **Measured live.** Policy text confirmed; row counts confirmed 0 |
| 6 | **14 edge functions are deployed with nothing calling them**, two of them with no source code left in the repository | Attack surface that nobody owns, maintains or watches. Two are running code that was deliberately deleted months ago | **Measured live.** Two-sided search across seven source trees plus all timers and webhooks |
| 7 | **Two AI assistant tools in crm7 call a route that does not exist** | The assistant's "send an email" and its four calendar actions cannot reach their functions | **Measured live.** File and line for each |
| 8 | `financial_viability_snapshots` — any GTO administrator can read every tenant's financial position | Cash balance, net assets, solvency declaration — for organisations that are not theirs. Table is empty today | **Measured live.** Function body resolved; 0 rows |

There is one important **negative** result, and it is the most reassuring line in this document:

> **Not a single table in the database has row level security switched off.** All 423 have it on.
> 154 tables hold data. 152 of them were successfully read as a low-privilege signed-in user, and in
> **exactly one** did that user reach rows belonging to another organisation (finding 4). The
> multi-tenant boundary is, with that one exception, holding.
>
> The two tables that could not be read are not a gap in this measurement — they are finding 0. They
> refuse *everybody*.

---

## 0. Two tables that nobody can read at all

**What it is.** `tenant_invitations` (who has been invited to an organisation) and `tester_licenses`
(who holds a tester licence). Their read rules each contain a clause that looks up the caller's own
email address by reading Supabase's internal `auth.users` table directly. Signed-in users have **no
permission to read `auth.users`** — nor does any of the other 20 tables in that internal schema. So
the rule cannot be evaluated, and Postgres refuses the whole query.

**What could go wrong, in plain words.** It already has. This is not a leak; it is a break. Any
attempt to list invitations or tester licences fails outright with
`ERROR: permission denied for table users`. Not an empty list — an error. Three screens depend on it:

| Screen / code | Table |
|---|---|
| `business-suite-unified/src/lib/adminService.ts:224` | `tenant_invitations` |
| `business-suite-unified/src/pages/Admin/LicenseManager.tsx:121` | `tester_licenses` |
| `crm7/src/services/platformService.ts:68` | `tester_licenses` |

**The evidence.** The offending clause, from `tester_licenses_select`:

```sql
(  is_platform_developer()
OR (user_id = (SELECT auth.uid()))
OR (email = ((SELECT users.email FROM auth.users WHERE users.id = (SELECT auth.uid()) LIMIT 1))::text) )
                              -- ^^^^^^^^^^ authenticated has no SELECT on auth.users
```

`tenant_invitations."Users can view invitations"` has the same shape.

**Three tests, because the first result was suspicious.** An "or" chain like this looks as though it
should stop early — a developer matches the first clause, so why evaluate the third?

1. As a low-privilege user, unfiltered: **error**.
2. As the same user, filtered to their own organisation so the first clause matches every candidate
   row: **still an error**. Postgres does not guarantee it will stop early, and here it does not.
3. As a **platform developer**, whose very first clause is `is_platform_developer()` and is true:
   **still an error**. That is the decisive one. Nobody at all can read these tables.

And the permission is genuinely absent, not merely unusual:
`has_table_privilege('authenticated','auth.users','SELECT')` is `false`, as it is for `anon` and for
every one of the 20 other tables in that schema.

**How widespread it is.** I swept every one of the 1,154 rules in the database for any expression
reading from that internal schema. **Exactly two** — these two. The class is closed.

**The smallest fix.** The estate already contains the correct pattern. `r7_candidate_id_for_auth_user()`
does the same `auth.users` join and works, because it is a SECURITY DEFINER function with
`SET search_path = public, auth` — so it runs with the privileges needed and the rule merely calls it.
Either wrap the email lookup in a small function of that shape, or drop the table read altogether and
use `auth.jwt() ->> 'email'`, which reads the caller's own token and touches no table at all. Both are
one-line changes to each of the two rules.

**Timing note.** `tenant_invitations` holds 1 row and `tester_licenses` holds 2, and both are the
subject of very recent work in this repository. This reads as a fresh regression rather than a
long-standing one — worth confirming against the migration that last touched each rule before fixing.

---

## 1. `is_platform_admin()` — an admin-detector open to the public

**What it is.** A database routine with the signature
`is_platform_admin(uid uuid DEFAULT auth.uid())`. You hand it a user's identifier; it tells you
`true` or `false` for whether that person is a platform administrator, a developer, or a
super-admin. It is a SECURITY DEFINER function, so it can read the `profiles` table even though the
caller cannot. And `anon` — the un-signed-in visitor — holds permission to run it.

**What could go wrong, in plain words.** Your privacy rule on the `profiles` table says a person may
read their own profile row and nobody else's. This function goes around that rule. Anyone at all,
without logging in, can walk a list of user identifiers and be told which of them are your
administrators. That does not by itself let them *in* — but it tells an attacker exactly which
accounts are worth attacking, and it discloses the one field the privacy rule exists to protect.

**The evidence.**

```sql
CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE((
      SELECT p.is_super_admin = true
             OR p.platform_role IN ('platform_admin', 'developer')
        FROM public.profiles p
       WHERE p.user_id = uid          -- <- the caller's parameter. Never compared to auth.uid().
       LIMIT 1), false);
$function$
```

The estate already knows how to write this correctly. Its sibling `get_visible_tenant_ids(p_user_id)`
has the *same* shape and carries the guard that this one is missing:

```
IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'get_visible_tenant_ids may only be called for the calling user'
    USING ERRCODE = '42501';
END IF;
```

Its comment even explains why: *"A DEFINER function must never evaluate a principal the caller merely
names."* `is_platform_admin` names the rule and does not follow it.

**The check I ran that could have cleared it, and did not.** The estate's capability-permissions
routine was recently fixed by moving its authorisation check into a *separate* function called from
inside. That means searching the body for `auth.uid()` returns nothing on code that is perfectly
safe. So I did not search — I read the whole body, and then looked specifically for a call out to a
separate checking function. There is no guard inside it and no guard delegated out of it.

**How much of the system depends on it.** None. Zero, proven three ways: no row-level rule in the
database references it; no other database routine calls it (the one apparent hit is a *local
variable* named `v_is_platform_admin` inside `get_visible_tenant_ids`, not a call); and no
application code calls it in any of the seven source trees. The only appearances in the codebase are
auto-generated type definitions and a comment in `crm7/src/components/reports/reportScopeAccess.ts:50`
that specifically warns *"the name is historical and is NOT `is_platform_admin()`."*

**The smallest fix — and a correction to my own first answer.**

My first instinct was `REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon,
authenticated;`. **That would have done nothing at all.** The Silo B lane caught it, and I have since
confirmed it directly. Here is the actual permission list on the function:

```
proacl = { =X/postgres , postgres=X/postgres , service_role=X/postgres }
           ^^^ an entry with an EMPTY grantee is PUBLIC
```

`anon` and `authenticated` hold **no direct grant**. They can run it because they inherit PUBLIC's.
Revoking from a role that was never granted directly succeeds, changes nothing, and leaves the
function exactly as open as before — while the migration reads like a fix and the reviewer moves on.
The correct change revokes **PUBLIC** and grants `authenticated` back explicitly, leaving
`service_role`'s own grant alone.

**This is already written and already merged.** The migration
`crm7/supabase/migrations/20260913000000_revoke_public_execute_on_is_platform_admin.sql` is on crm7's
`main` at `93a8a18f` and does exactly that — its own comments say
*"IT WAS NOT AN `anon` GRANT, WHICH IS WHY A NAIVE FIX MISSES IT."* It has not reached production
because the parent repository still points at an older crm7 commit, so the applier checks out a tree
that does not contain the file. The Silo B lane has claimed advancing that pointer. **Nothing further
is needed from you on this item beyond that pointer moving and the migration actually applying** —
and merged is not applied; the ledger has to show it.

**Note on the other seven.** Eight database routines in total are both SECURITY DEFINER and runnable
by an un-signed-in visitor. The other seven are all deliberate, and all correctly built: they take a
**64-character single-use token**, not a person's identifier — the signing links for host agreements
and charge-rate quotes, the portal invitation, the public job application, and the talent-pool
consent link. In each, the token is hashed, looked up, and the *token's own row* supplies the scope,
so the caller never names a principal. Each also rate-limits *before* the lookup, so the endpoint
cannot be used to guess at tokens. Verdict on those seven: **safe, guarded**. And separately:
**zero** SECURITY DEFINER functions in the whole database are missing a `search_path` setting, which
is the other classic way this kind of function goes wrong.

---

## 2 & 3. Two scheduled jobs that have never once succeeded

**What it is.** Twenty-three timed jobs run inside the database. Six of them wake up an edge
function by posting to a URL held in the database's secret store. Two of those secrets **were never
created**, so those two jobs fail every single time they run.

| Job | Runs | Successes | Last outcome |
|---|---|---|---|
| `document-retention-sweep-daily` | 6 | **0** | FAILED, 2026-08-25 04:30 UTC |
| `sync-award-rates-weekly` | 1 | **0** | FAILED, 2026-08-23 02:20 UTC |

**What could go wrong, in plain words.**

*Retention.* The document retention sweep is the automated job that destroys records once their
retention period has expired. It is a compliance obligation, and it has never executed. Records that
should have been destroyed on schedule are still in the system. Nothing has gone wrong that anyone
would notice from a screen — which is precisely the problem with a job like this failing silently.

*Award rates.* The weekly award-rate sync is what pulls current rates from the source. It has never
run either, so every rate the system quotes comes from a bundled snapshot with no stamp saying where
it came from or when. For rate calculation work, that is a provenance gap, not just a staleness one.

**The evidence.** The secret store holds `jodie_error_scan_url`, `r7_automation_processor_url`,
`r7_talent_pool_matcher_url`, `sta_email_watch_url`, `tga_org_sync_url`, `tga_sync_url` and
`xero_cron_refresh_url`. It does **not** hold `document_retention_sweep_url`,
`document_retention_sweep_secret`, `sync_award_rates_url` or `sync_award_rates_token`. Both jobs
refuse to post to an empty address rather than report a false success — which is the right
behaviour, and is why they show as failures rather than as quiet no-ops.

**This is already known.** Both are recorded in `.github/cron-never-succeeded-baseline.json` with
the same diagnosis. I am confirming it independently, not discovering it. It remains open because
the fix is an operator action, not a code change: someone has to put the real endpoint URL and token
into the database's secret store.

**The smallest fix.** Seed the four missing secrets with `vault.create_secret()`. No migration, no
deploy. Until then, treat the retention obligation as manual.

---

## 4. `r7_jobs` — the one real cross-tenant read

**What it is.** The job-listings table. A signed-in user of one organisation can read open,
published job rows belonging to *other* organisations.

**What could go wrong, in plain words.** Your open vacancies are visible to signed-in users of other
tenants on the platform. Whether that matters commercially is your call, not mine — but it
contradicts the ruling recorded on 2026-08-25 that job activity is tenant-gated, so at minimum the
code and the ruling disagree.

**The evidence.** The rule for signed-in users has four alternatives joined by "or", and the third
has no tenant condition at all:

```sql
r7_jobs_select_authenticated  [SELECT TO authenticated]
  (  tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid() AND status='active')
  OR id IN (SELECT job_id FROM r7_applications WHERE candidate_id = r7_candidate_id_for_auth_user())
  OR (status = 'open' AND published_at IS NOT NULL)      -- <- no tenant condition
  OR is_platform_developer() )
```

Measured live: signed in as a user who belongs to exactly one organisation and is not a developer,
the table returns **6 rows spanning 3 organisations**, two of which that user is not a member of.

**Important distinction.** There is a *separate* rule for un-signed-in visitors,
`r7_jobs_select_anon`, with the same "open and published" condition. **That one is correct** — it is
the public job board and it is meant to be public. The defect is that the same unconditioned clause
was *copied onto the signed-in rule*, where the first clause was already doing the tenant scoping.

**The smallest fix.** Delete the third clause from `r7_jobs_select_authenticated` only. Leave
`r7_jobs_select_anon` alone. A signed-in user who wants to browse the public board reads it through
the anon path like everyone else.

---

## 5. Six tables that are wide open and empty

**What it is.** Six tables carry a rule that amounts to "any signed-in person may read (and in four
cases, write) every row", on tables that have an organisation column and therefore *should* be
scoped.

| Table | The rule | Rows today |
|---|---|---|
| `award_rate_cache` | `true` | 0 |
| `award_rates` | `auth.uid() IS NOT NULL` — for **all** operations, not just read | 0 |
| `charge_calculations` | `auth.uid() IS NOT NULL` | 0 |
| `host_contracts` | `auth.uid() IS NOT NULL` — **all** operations | 0 |
| `inspection_reminders` | `auth.uid() IS NOT NULL` — **all** operations | 0 |
| `whs_records` | `auth.uid() IS NOT NULL` — **all** operations | 0 |

`auth.uid() IS NOT NULL` reads as a security check but is not one. It means "somebody is logged in".
It does not say *who*, and it does not say *which organisation*.

**What could go wrong, in plain words.** Nothing today — all six are empty. On the day the first row
is written, every signed-in user across every organisation can read it, and on four of these tables
can also change or delete it. `host_contracts` and `whs_records` in particular are exactly the sort
of thing one client should never see from another: host employer contracts, and workplace health and
safety records.

**Why they are in this document even though they leak nothing.** A table with no rows is the
cheapest possible moment to fix a rule like this, and the hardest moment to notice it. The estate has
been caught by this shape before.

**The checks I ran that could have cleared them, and did not.** Three, and I name them because a rule
that *looks* unscoped often is not:

1. **The rule might call a helper that does the scoping.** Many rules here scope by calling a
   function such as `auth_tenant_id()` — the word "tenant" never appears in the rule text. So before
   classifying anything, I fetched and read the bodies of all 36 helper functions used anywhere in
   the 1,154 rules. None of these six rules calls any of them.
2. **A restrictive rule might narrow it.** Postgres has a second kind of rule that *subtracts* from
   what the first kind allows. There are 27 of these in the database — they enforce the field
   officer caseload boundary, the demo-tenant write block and others. None of the 27 applies to any
   of these six tables.
3. **The live test.** Signed in as a low-privilege user, each of the six returns 0 rows — because
   each holds 0 rows, not because anything stopped it.

**The smallest fix.** Replace `auth.uid() IS NOT NULL` with the pattern the other 259 tenant-scoped
tables already use:

```sql
USING (tenant_id IN (SELECT public.auth_tenant_id()))
WITH CHECK (tenant_id IN (SELECT public.auth_tenant_id()))
```

(`inspection_reminders` uses `org_id` rather than `tenant_id`; scope it on that column.) And split
the four `FOR ALL` rules into separate read and write rules — a single "all operations" rule
guarantees the write path can never be tightened without loosening the read path.

---

## 6. Fourteen edge functions nobody calls

Of the 74 deployed edge functions, 47 have a genuine caller in the applications. Of the remaining 27,
**eleven are fine** — they are woken by a timer or by an outside company's webhook, and a function on
a schedule is not a dead function. Two more have a timer that has never worked (findings 2 and 3).

That leaves **fourteen with no caller of any kind**: no application call, no timer, no webhook
registration, and no other edge function calling them.

| Function | Why it is here |
|---|---|
| `timesheet-reminders` | **Its source code no longer exists in any repository.** Deleted in crm7#688 for having zero callers — but the deployment was never removed. Still live at version 42 |
| `mapd-sync` | **Source code also deleted** (recorded at `crm7/eslint.config.js:552`, removed 2026-08-19). Still live at version 35 |
| `r8-charge-rate-push` | Zero callers. The tree says so itself: *"a DIFFERENT, unrelated, unwired edge function already in this tree — `supabase/functions/r8-charge-rate-push/`, zero…"* |
| `compliance-scanner` | Built to be run by a timer whose address comes from a database setting called `app.settings.supabase_url`. **That setting is not set**, and there are zero timers in this database mentioning this function |
| `tga-organisation-sync` | The secret holding its address (`tga_org_sync_url`) **exists**, but no timer references it. The secret outlived the job |
| `refresh-award-rates` | Only forwards to `sync-award-rates`. Nothing forwards to it |
| `update-wage-rates` | A deprecated proxy that only forwards to `sync-award-rates`. Nothing forwards to it |
| `xero-token-exchange-cc` | Zero callers. The daily Xero refresh timer resolves to the non-`-cc` function, so this variant is not the scheduled one |
| `process-webhook-queue` | Zero callers. A migration comment records that its fallback *"could never have worked anyway"* |
| `email-token-refresh` | Zero callers. Its own header says it has the *"same shape as `process-webhook-queue`"* — a shape that was already dead |
| `charge-calc` | Zero callers. (Careful: every apparent match in the code is the npm package `@bsuite/charge-calc`, not this function) |
| `classify-issue` | Serves an external tooling runtime per its own header. No in-estate caller |
| `send-confirmation` | braden.com.au. Zero callers |
| `encrypt-email-tokens` | A one-off migration utility by design. Uncalled is expected — it should now be retired |

**What could go wrong, in plain words.** Each of these is a live, publicly-addressable endpoint on
your production project. Nobody exercises them, so nobody would notice if one broke or was abused,
and two of them are running code that no longer exists anywhere you could read it. This is not an
active vulnerability — it is unmaintained surface.

**The smallest fix.** Undeploy `timesheet-reminders` and `mapd-sync` first: their source is gone, so
there is nothing to review and nothing to lose. Then take a decision on the other twelve — retire, or
wire up and prove. `encrypt-email-tokens` and `compliance-scanner` are the two where "retire" is
almost certainly right.

**A note on how this was measured**, because the obvious method gets this wrong. Searching for
`functions.invoke('name')` alone would have missed the ones held in a constant, the ones built as
`` `${url}/functions/v1/name` ``, and the ones reached through a proxy path. It would also have
*over*-counted badly: 27 slugs appear in the codebase only inside comments and test allow-lists. So
the search strips comments first, excludes test files from counting as callers, resolves constants to
their assigned value, and then runs the same question backwards — every slug any caller mentions,
diffed against the deployed list. That second direction is what found finding 7, and a one-sided
search would have reported this estate as clean.

---

## 7. Callers pointing at nothing — two live, one already neutralised

| Where | What it calls | Why it fails | Reachable by a user? |
|---|---|---|---|
| `crm7/src/lib/ai/tools/email-tools.ts:63` | `apiCall('/api/functions/email-dispatcher', …)` | The function is deployed and healthy — but crm7 has **no `/api/functions` route**. `crm7/api/` contains `config.ts`, `error-report.ts`, `ai/`, `db/` and `rpc/` only | **Yes** |
| `crm7/src/lib/ai/tools/scheduling-tools.ts:92, 155, 208, 307` | `apiCall('/api/functions/calendar-integration', …)` | Same missing route. Four call sites | **Yes** |
| `throughput/src/pages/Export.tsx:106` | `supabase.functions.invoke('export', …)` | There is no deployed function called `export`, and there never was one — it was never written | **No.** See below |

**What could go wrong, in plain words.** The AI assistant's "send an email" and its four calendar
actions in crm7 cannot reach their functions. Those are live.

**The `export` one is NOT a live bug, and I had it wrong.** My first draft said the throughput export
button fails. The Silo B lane corrected it and I have confirmed the correction: throughput PR #333
already marked the three affected formats unavailable and disabled their buttons —
`throughput/src/pages/Export.tsx:192` reads `disabled={loading !== null || Boolean(option.unavailable)}`
and three format options carry `unavailable: 'Not available yet — no document generator is deployed
for this format.'` Silo B verified it on production itself, in the built bundle at
`https://ideas.crm7.app/assets/Export-DcXrb9vo.js`. **No user can reach that call.** What remains is
dead code behind a disabled control — worth deleting so that nobody later removes an `unavailable`
marker and re-opens a path to a function that does not exist, but not a defect anyone is hitting.

**The smallest fix.** For the two crm7 cases the fix is already written elsewhere in the same
codebase: `crm7/src/services/calendarService.ts:85` reaches the *same* calendar function correctly
with ``supabase.functions.invoke(`calendar-integration/${route}`)``, and
`conduit/src/lib/communicationService.ts:57` reaches the *same* email function correctly with
`supabase.functions.invoke('email-dispatcher', …)`. Point the AI tools at the paths that already
work. For `export`, either deploy the function, repoint it, or delete the dead branch and the button
that leads to it.

**One precedent closed.** The brief flagged `crm7-generate-document` as a possible caller-with-no-
deployment. It **is** deployed (version 6, active) and it **does** have a real caller at
`crm7/src/components/documents/GenerateDocumentModal.tsx:98`. That one is fixed.

---

## 8. `financial_viability_snapshots`

**What it is.** A table holding each organisation's financial position — current ratio, working
capital, net assets, cash balance, total liabilities, year-to-date revenue and profit, debt service
ratio, and a declared solvency statement with the name of the declaring officer. Its rule is
`is_gto_admin()`, called with **no arguments**.

**What could go wrong, in plain words.** The no-argument form asks "is this person a GTO
administrator *anywhere*?" — not "in this organisation". So an administrator of any one organisation
on the platform can read every organisation's financial position and solvency declaration. The table
is empty today.

**The check I ran that could have cleared it, and did not.** The same function name also exists in a
one-argument form, `is_gto_admin(p_tenant_id)`, which *does* scope correctly to the organisation
being asked about. Reading the rule text alone, the two are indistinguishable — the name is the
same. I resolved both bodies before classifying, and confirmed the rule on this table calls the
unscoped no-argument form.

**The smallest fix.** Change the rule to `is_gto_admin(tenant_id)` — pass the row's own organisation
into the check. The correct function already exists.

---

## The full picture: how every table is scoped

423 tables, each classified once, with the classification confirmed against the live database.

| Category | Count | What it means |
|---|---|---|
| **Scoped to your organisation** | 259 | The normal, correct case |
| **Mixed** | 55 | More than one route in — usually "your organisation, or rows you own personally". Also correct |
| **Permissive** | 46 | Any signed-in user can read. **40 of these are shared reference data** — award classifications, public holidays, occupation lists, the report catalogue — and are permissive on purpose. The other 6 are finding 5 |
| **Scoped to you personally** | 41 | Your own preferences, your own audit trail |
| **Row security on, no rules at all** | 11 | Deny-everything. Confirmed intentional: all 11 *also* have no read permission granted to signed-in users or visitors, so both locks are closed |
| **No read permission granted** | 7 | Reachable only by trusted server code. Includes `email_integrations` and the Xero webhook tables |
| **Role-scoped only** | 4 | Includes finding 8 |
| **Row security switched OFF** | **0** | None. Every table has it on |

### The measurement I nearly got wrong, recorded so nobody repeats it

Halfway through, the live test showed **twenty-six** tables that carry an organisation column where a
user belonging to one organisation could see **100% of the rows** — `training_providers` at 8,119 of
8,119, `report_catalog_fields` at 1,573 of 1,573, `tenant_field_definitions` at 565, `wic_rate_lookup`
at 527, and twenty-two more. **11,677 rows in total.** Read on its own that is an eleven-thousand-row
cross-tenant leak, and every one of those tables had been classified as correctly scoped from its
rule text.

The second measurement settled it: *of the rows that user could see, how many belong to an
organisation other than their own?* The answer across all twenty-six was **zero** — 11,677 visible
rows, 0 of them foreign. They see everything because everything in those tables is shared platform
reference data with no organisation attached.

The rule worth keeping: **the share of rows a user can see tells you nothing. Only the organisation
of the rows they can see tells you anything.** A percentage cannot distinguish shared reference data
from a leak, and it will report the largest tables in the estate as the worst offenders every time.

### One correction to the record

The internal red-team checklist records `report_templates` as having a rule of
`USING (scope = 'platform')` with no role check — 23 platform-scope templates readable by everyone.
**That has been fixed.** The live rule now reads
`((scope = 'platform' AND is_system) OR (scope = 'enterprise' AND …) OR (scope = 'tenant' AND …) OR
(scope = 'user' AND user_id = auth.uid() AND …) OR is_platform_developer())`. An `is_system` clause
was added. The checklist's text is stale and should be updated so the next reviewer does not chase a
closed finding.

---

## How this was measured

- **Read-only throughout.** Every live test ran inside `BEGIN … ROLLBACK`. No data was created,
  altered or deleted, and no migration was written.
- **The identity test.** Rather than reasoning about the rules, I *became* a real low-privilege user
  inside the database — a real account with `platform_role = 'user'`, membership of exactly one
  organisation, and no developer or super-admin flag — and counted what it could actually read
  across the 154 tables that hold data. 152 answered; the 2 that refused are finding 0.
- **A control that discriminates.** Before trusting a single result I checked that the test could
  tell right from wrong: as that user, `profiles` returned 1 row of 14, `tenants` 1 of 7,
  `user_tenants` 2 of 13, and `is_platform_developer()` returned false. Had row security not been
  applying, those numbers would have been 14, 7 and 13.
- **Helper functions resolved, never guessed.** All 36 functions called from any of the 1,154 rules
  were fetched in full and read before any rule was classified, because a rule that scopes by
  calling a helper does not contain the word "tenant" and a text search cannot see it.
- **The restrictive rules were checked separately.** All 27 of them, because that second kind of
  rule can make an apparently unsafe rule safe.
- **FutureBuild Academy.** Real client data, treated as read-only and never displayed. Only counts
  were taken, and no personal information of any kind — no names, no email addresses, no addresses,
  no student identifiers — appears in this document or in any file this lane produced.

## Machine-readable output

| File | Contents |
|---|---|
| `db/rls-posture.json` | All 423 tables: category, evidence, live row counts, foreign-organisation row counts, and for every flagged table the second check that was run and what it showed |
| `db/secdef-audit.json` | All 8 publicly-runnable SECURITY DEFINER functions with a verdict and the reasoning for each |
| `db/edge-fn-map.json` | All 74 deployed edge functions split into matched / deployed-with-no-caller / caller-with-no-function, with file and line evidence |

*(These live in this session's scratchpad directory; the paths are in the lane report.)*

---

## What to do first

1. **Fix the two `auth.users` rules** on `tenant_invitations` and `tester_licenses`. This is the only
   item on the list that is broken *right now* on three live admin screens, and it is a one-line
   change to each rule.
2. **Seed the four missing secrets** so the retention sweep and the award-rate sync can run. This is
   an operator action; no code change is involved, and the retention one is a compliance obligation
   that has never been met.
3. **Drop the third clause from `r7_jobs_select_authenticated`** — closes the only measured
   cross-tenant read in the database.
4. **Scope the six empty tables** before anything is written to them.
5. **Undeploy `timesheet-reminders` and `mapd-sync`** — their source code no longer exists.

Items 1, 3 and 4 are database rule changes and belong in one migration. Item 2 is yours. Item 5 is
two commands.

**Already in hand, no action needed from you:** the `is_platform_admin` revoke (finding 1) is written,
reviewed and merged to crm7's `main`; another lane is moving the repository pointer that will let it
apply. Watch for the confirmation that it *applied*, not that it merged — those are different events
in this estate.

Two cautions, both from mistakes made in producing this document:

- **On item 1** — the "or" chain in those two rules looks as though a developer would short-circuit
  past the broken clause. It does not. Prove the fix by *running the query as a real signed-in user*,
  not by reading the rule back.
- **On revokes generally** — my own first proposed fix for finding 1 was to revoke from `anon`. It
  would have changed nothing, because the permission is held by PUBLIC and `anon` merely inherits it.
  Whenever a fix is "take a permission away", read `proacl` first and confirm the role you are
  revoking from is the one that actually holds the grant. A revoke from a role that never held it
  succeeds silently.
