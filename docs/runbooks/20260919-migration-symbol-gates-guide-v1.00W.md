---
kind: standard
authority: engineering
owner: bsuite
status: W
related_issues: [3136, 3143, 3147, 3119]
---

# Migration symbol gates — catching an unreplayable reference at authoring time

**bsuite#3136.** A migration can reference an object created by an ancestor
that no replay path runs. It applies cleanly on production — the object
already exists there — and fails only when the tree is rebuilt from scratch,
which in this estate is the **parent pointer-bump PR**, days after the
app-repo PR that authored it went green. The class was found on bsuite#3119:

```
psql:.../crm7/supabase/migrations/20260906120000_host_supervisor_employers_clients_scope.sql:151:
ERROR:  function public.is_host_supervisor_of_tenant(uuid) does not exist
```

whose only creator, `archive/20260820130000_contacts_select_host_employer_limb.sql`,
was invisible to the replay of the day. bsuite#3143 closed that specific hole
(`archive/` is now replayed). What this runbook documents is the **class**
gate: `scripts/check-migration-symbol-gaps.mjs`, wired by
`.github/workflows/migration-symbol-gates.yml`, fails a PR at authoring time
— no database, seconds not 45 minutes — when a changed migration references a
symbol nothing in the rebuildable tree creates.

## Relationship to the rehearsal (bsuite#3147)

Two different instruments answer two different questions:

| | `supabase-migration-rehearsal.yml` | `migration-symbol-gates.yml` |
|---|---|---|
| Question | Does the SQL actually execute and change the catalog? | Does every symbol it references resolve against what a rebuild can produce? |
| Substrate | A real disposable Postgres, ~45 min | Static files only, seconds |
| Catches | Syntax errors, silent no-ops, ACL/enum blind spots | An object referenced but never built by any replay path |
| In-baseline rule | **Membership** in the applied-versions artefact (bsuite#3147, PR #3295) — NOT magnitude against a hand-maintained `BASELINE_MAX` | Same membership rule, read from the same artefact — the two instruments must agree on what "already applied" means, or one of them is lying about what the tree can rebuild |

They share the same universe-construction rule on purpose. If a future
change alters what counts as "in baseline" in one, it must change in both —
see `scripts/supabase/rehearse-migrations.mjs`'s membership loader and this
checker's `loadAppliedVersions()` side by side before touching either.

## Why a separate workflow file

`supabase-migration-rehearsal.yml` was mid-flight in bsuite#3147 (PR #3295)
the same day this gate was built. Two lanes editing one CI file is a
collision hotspot; `migration-symbol-gates.yml` is self-contained. A future
pass can fold its steps into the rehearsal workflow's existing "Determine
changed migrations" step once both land — the selector output (`--changed`)
is already shared verbatim.

## What the gate does

1. **Self-test first** (`--self-test`, no database). Plants twelve cases in a
   synthetic estate — a clean reference, an ordering defect, a quarantined
   creator, a fully-absent symbol, a table alias, a guarded `to_regprocedure`
   probe, a `'…'::regprocedure` cast, and the membership-vs-magnitude control
   — and asserts every verdict **by name**, not just pass/fail. If the
   instrument cannot fail on a planted defect, nothing below it is trusted.
2. **Gate mode** (`--changed <paths>`) evaluates only the PR's changed
   migrations against the universe a rebuild could produce:
   - the newest baseline dump under `crm7/supabase/migrations/baseline/`
     (`*_prod_baseline_schema_dump.sql`, exactly one required);
   - every migration classified `selected` by the SAME membership rule
     bsuite#3147 wires into the rehearsal engine (version ≥ floor, NOT
     recorded in the applied-versions artefact, not quarantined), applied in
     global version order;
   - schemas the disposable Supabase image provides out of the box (`auth`,
     `storage`, `cron`, `net`, `vault`, `extensions`, …) — trusted at the
     object level too, because this checker has no static inventory of the
     image's built-ins and policing them would fail on `auth.uid()`.
   A miss reports the missing symbol **and** the file that (used to) create
   it, with its status spelled out: below-floor, quarantined, recorded-applied
   -but-not-in-the-dump, or replays-later (an ordering defect) — never a bare
   count. Exit 1 on any finding.
3. **Audit mode** (`--audit`) walks the whole tree as if every replayable
   migration were changed. It is the estate's rebuildability census — always
   exits 0 (findings are `::warning::` in CI) so pre-existing debt never
   blocks a PR that did not introduce it, but the count is visible in every
   run's summary and must trend to zero, not silently rot into a permanent
   exemption.

## What it deliberately does not do

Documented in full in the script's own header (`scripts/check-migration-symbol-gaps.mjs`):
only schema-qualified references are extracted (the estate's own convention
qualifies every call — see the bsuite#3119 incident file); function
references resolve at name level, not arity; a symbol created earlier in the
SAME file is available to the whole file; `to_reg*(...)` and `'...'::reg*`
are treated as existence probes, never uses; string literals ARE scanned
(dynamic `EXECUTE 'CREATE …'` is a real reference), which the audit's
real-tree run is how you would notice a false-positive rate worth tuning.

**No regular expressions.** Standing estate rule — parsers, not patterns.
The extractor is a character scanner with a token lookback; there is no
`RegExp` anywhere in the file (`crm7/scripts/lint-sql-migrations.mjs` style).

## Measured on the live tree, 2026-09-19

`node scripts/check-migration-symbol-gaps.mjs --audit` on this estate's
17 currently-replayable migrations found **2 pre-existing findings**, both
real: `business-suite-unified/supabase/migrations/20261123010000_org_roster_walks_descendant_user_tenants.sql`
and its sibling `20261123020000_…composite.sql` call `public.descendants_of`,
whose only creator
(`business-suite-unified/supabase/migrations/20260408000002_phase5_tenant_hierarchy_functions.sql`)
is **below the rehearsal floor** and therefore never replays; the baseline
dump does not carry the function either (verified: zero matches). This is
exactly the bsuite#3136 shape, caught statically, for the first time, without
a database. It is filed as estate debt (see the issue for tracking) rather
than fixed in this PR, which is scoped to the gate itself — see "Fixing the
census findings" below for the two remediation shapes available.

## Fixing a finding

Three shapes, depending on the creator's status named in the gate's output:

- **Below-floor creator**: the function must ship again, above the floor
  (a new migration that recreates it, or the floor needs to move — see the
  rehearsal's own floor-change warning before touching `MIGRATION_FLOOR`).
- **Quarantined creator**: fix the quarantined migration so it un-quarantines
  (the rehearsal's ratchet then requires removing it from
  `KNOWN-BROKEN-IN-CI.txt`), or recreate the symbol in a migration that does
  replay.
- **Ordering defect** (creator "replays LATER"): reorder — rename the
  creating file to an earlier version, or move the reference to a migration
  dated after its creator.

## Running it locally

```bash
node scripts/check-migration-symbol-gaps.mjs --self-test
node scripts/check-migration-symbol-gaps.mjs --changed "crm7/supabase/migrations/<file>.sql"
node scripts/check-migration-symbol-gaps.mjs --audit
```

No database, no Supabase CLI, no credentials — it reads the checked-out tree
and the two crm7 baseline artefacts.
